// Scenario Service
// Long-lived HTTP service. Scenarios are triggered via POST /run, NOT on startup.

const express = require('express');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');

const app = express();
app.use(express.json());

const MERCHANT_GENERATOR_URL = process.env.MERCHANT_GENERATOR_URL || 'http://merchant-generator:3001/generate-merchants-from-csv';
const SIMULATION_QUEUE_URL   = process.env.SIMULATION_QUEUE_URL   || 'http://simulation-queue:3005';
const ONBOARDING_URL         = process.env.ONBOARDING_URL         || 'http://mock-portal/index.html';
const PORT                   = parseInt(process.env.PORT || '3006');

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── Scenario loader ────────────────────────────────────────────────────────────
function loadScenarios() {
  const dir = process.env.NODE_ENV === 'production' ? '/scenarios' : path.join(__dirname, '..', 'scenarios');
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
}

function getScenario(scenarioId) {
  return loadScenarios().find(s => s.scenarioId === scenarioId) || null;
}

// ── Merchant fetcher ───────────────────────────────────────────────────────────
async function fetchMerchants(merchantCount, retries = 5) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(MERCHANT_GENERATOR_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      let merchants = await res.json();
      if (merchantCount > 0) merchants = merchants.slice(0, merchantCount);
      return merchants;
    } catch (err) {
      if (i < retries - 1) await sleep(2000);
      else throw new Error(`Merchant generator unreachable: ${err.message}`);
    }
  }
}

// ── Enqueue batch ──────────────────────────────────────────────────────────────
async function enqueueMerchants(merchants, scenarioId, runId, onboardingUrl) {
  const res = await fetch(`${SIMULATION_QUEUE_URL}/enqueue-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ merchants, scenarioId, runId, onboardingUrl })
  });
  if (!res.ok) throw new Error(`Queue error: HTTP ${res.status}`);
  return res.json();
}

// ── Routes ─────────────────────────────────────────────────────────────────────

// GET /scenarios — list available scenario configs
app.get('/scenarios', (req, res) => {
  try {
    res.json({ scenarios: loadScenarios() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /run — trigger a simulation run
// Body: { scenarioId, merchantCount, channel, onboardingUrl }
app.post('/run', async (req, res) => {
  const { scenarioId, merchantCount = 100, channel = 'web', onboardingUrl } = req.body;

  if (!scenarioId) return res.status(400).json({ error: 'scenarioId is required' });

  const scenario = getScenario(scenarioId);
  if (!scenario) return res.status(404).json({ error: `Scenario '${scenarioId}' not found` });

  const runId = randomUUID();
  const portalUrl = onboardingUrl || ONBOARDING_URL;

  // Respond immediately — enqueue happens in background
  res.json({ runId, scenarioId, merchantCount, channel, status: 'queued' });

  // Background enqueue
  try {
    const merchants = await fetchMerchants(merchantCount);
    const enriched = merchants.map(m => ({
      ...m,
      scenarioId: scenario.scenarioId,
      runId,
      onboardingUrl: portalUrl,
      channel,
      scenarioConfig: {
        latencyMultiplier: scenario.latencyMultiplier,
        retryBonus: scenario.retryBonus,
        successProbabilityBonus: scenario.successProbabilityBonus
      }
    }));

    const result = await enqueueMerchants(enriched, scenario.scenarioId, runId, portalUrl);
    console.log(`[run:${runId}] Enqueued ${result.enqueued} jobs for scenario ${scenarioId}`);
  } catch (err) {
    console.error(`[run:${runId}] Failed to enqueue: ${err.message}`);
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Scenario Service listening on port ${PORT}`);
  console.log('Waiting for frontend-triggered runs — no auto-start.');
});

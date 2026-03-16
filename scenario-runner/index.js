const fs = require('fs');
const path = require('path');

const MERCHANT_GENERATOR_URL = process.env.MERCHANT_GENERATOR_URL || 'http://merchant-generator:3001/generate-merchants-from-csv';
const INSIGHT_SERVICE_URL = process.env.INSIGHT_SERVICE_URL || 'http://insight-service:3000';
const SIMULATION_QUEUE_URL = process.env.SIMULATION_QUEUE_URL || 'http://simulation-queue:3005';
const ONBOARDING_URL = process.env.ONBOARDING_URL || 'http://mock-portal/index.html';

// Load all scenario configurations from /scenarios directory
function loadScenarios() {
  const scenariosDir = process.env.NODE_ENV === 'production' ? '/scenarios' : path.join(__dirname, '..', 'scenarios');
  const scenarioFiles = fs.readdirSync(scenariosDir).filter(f => f.endsWith('.json'));
  const scenarios = scenarioFiles.map(file =>
    JSON.parse(fs.readFileSync(path.join(scenariosDir, file), 'utf8'))
  );
  console.log(`📋 Loaded ${scenarios.length} scenario configurations:`);
  scenarios.forEach(s => console.log(`   - ${s.scenarioId}: ${s.description}`));
  return scenarios;
}

// Fetch merchants from merchant generator
async function fetchMerchants() {
  const response = await fetch(MERCHANT_GENERATOR_URL);
  if (!response.ok) throw new Error(`Merchant generator returned ${response.status}`);
  return response.json();
}

// Enrich merchant profile with scenario config
function enrichMerchant(merchant, scenario) {
  return {
    ...merchant,
    scenarioId: scenario.scenarioId,
    onboardingUrl: ONBOARDING_URL,
    scenarioConfig: {
      latencyMultiplier: scenario.latencyMultiplier,
      retryBonus: scenario.retryBonus,
      successProbabilityBonus: scenario.successProbabilityBonus
    }
  };
}

// Push a batch of merchants to the simulation queue
async function enqueueMerchants(merchants, scenarioId) {
  const response = await fetch(`${SIMULATION_QUEUE_URL}/enqueue-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ merchants, scenarioId, onboardingUrl: ONBOARDING_URL })
  });
  if (!response.ok) throw new Error(`Queue service returned ${response.status}`);
  return response.json();
}

// Poll queue stats until all jobs are done
async function waitForQueueDrain(totalJobs, timeoutMs = 600000) {
  const start = Date.now();
  console.log(`\n⏳ Waiting for ${totalJobs} jobs to complete...`);

  while (Date.now() - start < timeoutMs) {
    await new Promise(r => setTimeout(r, 3000));
    try {
      const res = await fetch(`${SIMULATION_QUEUE_URL}/stats`);
      const stats = await res.json();
      const done = stats.completed + stats.failed;
      console.log(`   Queue: waiting=${stats.waiting} active=${stats.active} completed=${stats.completed} failed=${stats.failed}`);
      if (stats.waiting === 0 && stats.active === 0) {
        console.log(`✅ All jobs processed (${stats.completed} completed, ${stats.failed} failed)`);
        return stats;
      }
    } catch {
      // queue service briefly unavailable
    }
  }
  console.warn('⚠️  Timed out waiting for queue drain');
}

async function runScenarioSimulations() {
  console.log('🎯 Digital Twin Scenario Experimentation Engine');
  console.log('📊 Queue-based Multi-Scenario Simulation Runner');
  console.log('═'.repeat(70));

  const scenarios = loadScenarios();
  if (scenarios.length === 0) { console.error('❌ No scenarios found'); process.exit(1); }

  console.log('\n📡 Fetching merchant profiles...');
  const merchants = await fetchMerchants();
  console.log(`✅ Loaded ${merchants.length} merchant profiles`);

  // Clear previous insights
  try {
    await fetch(`${INSIGHT_SERVICE_URL}/insights/clear`, { method: 'DELETE' });
    console.log('✅ Previous data cleared');
  } catch {
    console.warn('⚠️  Could not clear previous data');
  }

  const totalJobs = merchants.length * scenarios.length;
  console.log(`\n🚀 Enqueueing ${totalJobs} jobs (${merchants.length} merchants × ${scenarios.length} scenarios)...`);

  for (const scenario of scenarios) {
    const enriched = merchants.map(m => enrichMerchant(m, scenario));
    const result = await enqueueMerchants(enriched, scenario.scenarioId);
    console.log(`   ✓ Enqueued ${result.enqueued} jobs for scenario ${scenario.scenarioId}`);
  }

  await waitForQueueDrain(totalJobs);

  console.log('\n💡 View insights: curl http://localhost:3000/insights/summary');
}

runScenarioSimulations().catch(err => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});

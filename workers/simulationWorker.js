// Simulation Worker
// Pulls merchant jobs from Redis BullMQ queue.
// Maintains a single Playwright browser instance with a pool of browser contexts.
// Each context = one isolated merchant session.
// Target: 30-50 concurrent merchant contexts per worker container.

const { Worker } = require('bullmq');
const { chromium } = require('playwright');
const { Redis: IORedis } = require('ioredis');

// ── Config ────────────────────────────────────────────────────────────────────
const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const INSIGHT_SERVICE_URL = process.env.INSIGHT_SERVICE_URL || 'http://insight-service:3000';
const MAX_CONTEXTS = parseInt(process.env.MAX_CONTEXTS || '50');
const WORKER_ID = process.env.HOSTNAME || `worker-${process.pid}`;

// ── State ─────────────────────────────────────────────────────────────────────
let browser = null;
let activeContexts = 0;

// ── Utilities ─────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Network latency map (ms)
const NETWORK_LATENCY = {
  '4G_GOOD': 100,
  '4G_UNSTABLE': 300,
  '3G_POOR': 800,
  '2G_EDGE': 1500
};

// Device viewport map
const VIEWPORTS = {
  'ios': { width: 375, height: 812 },
  'android_mid': { width: 360, height: 740 },
  'android_low_end': { width: 320, height: 568 },
  'feature_phone': { width: 240, height: 320 }
};

// User-agent strings per device profile
const USER_AGENTS = {
  'ios': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
  'android_mid': 'Mozilla/5.0 (Linux; Android 11; SM-A325F) AppleWebKit/537.36',
  'android_low_end': 'Mozilla/5.0 (Linux; Android 8.1.0; Redmi 6A) AppleWebKit/537.36',
  'feature_phone': 'Mozilla/5.0 (Linux; Android 4.4.2; Nokia 1) AppleWebKit/537.36'
};

// ── Event Emitter ─────────────────────────────────────────────────────────────
async function emitEvent(eventData) {
  try {
    await fetch(`${INSIGHT_SERVICE_URL}/simulation-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...eventData, workerId: WORKER_ID, timestamp: Date.now() })
    });
  } catch {
    // Non-fatal - insight service may be briefly unavailable
  }
}

// ── Human-like Delays ─────────────────────────────────────────────────────────
async function networkDelay(networkProfile) {
  const base = NETWORK_LATENCY[networkProfile] || 500;
  await sleep(base + random(-base * 0.2, base * 0.2));
}

async function userDelay(digitalLiteracy, action) {
  const map = {
    reading:          { basic: 3000, intermediate: 2000, advanced: 1000 },
    form_interaction: { basic: 2000, intermediate: 1000, advanced: 500 },
    document_upload:  { basic: 5000, intermediate: 3000, advanced: 1500 },
    submission:       { basic: 2000, intermediate: 1000, advanced: 500 }
  };
  const base = (map[action] || map.form_interaction)[digitalLiteracy] || 1500;
  await sleep(base + random(0, 1000));
}

function typingDelay(digitalLiteracy) {
  return { basic: 3000, intermediate: 1500, advanced: 800 }[digitalLiteracy] || 1500;
}

// ── Success Probability ───────────────────────────────────────────────────────
function calcSuccessProbability(merchant) {
  let p = 0.7;
  if (merchant.digitalLiteracy === 'advanced') p += 0.2;
  else if (merchant.digitalLiteracy === 'intermediate') p += 0.1;
  if (merchant.networkProfile === '2G_EDGE') p -= 0.2;
  else if (merchant.networkProfile === '3G_POOR') p -= 0.1;
  if (merchant.deviceType === 'ios') p += 0.05;
  p += (merchant.patienceScore || 0.5) * 0.1;
  // Apply scenario bonus if present
  p += merchant.scenarioConfig?.successProbabilityBonus || 0;
  return Math.max(0.3, Math.min(0.95, p));
}

// ── Core Simulation (runs inside a browser context) ───────────────────────────
async function runMerchantSimulation(page, merchant) {
  const portalUrl = merchant.onboardingUrl ||
    merchant.portalUrl ||
    'http://mock-portal/index.html';

  const startTime = Date.now();
  const insights = [];
  let currentStep = 0;
  const maxSteps = 5;

  const emit = (data) => emitEvent({ merchantId: merchant.merchantId, scenarioId: merchant.scenarioId || 'UNKNOWN', ...data });

  try {
    // ── Step 1: Navigate ──────────────────────────────────────────────────────
    currentStep++;
    await networkDelay(merchant.networkProfile);
    const navStart = Date.now();
    const response = await page.goto(portalUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const loadTime = Date.now() - navStart;

    if (!response || !response.ok()) throw new Error(`Portal returned ${response?.status()}`);

    await emit({ event: 'PAGE_LOAD', step: 'portal_landing', loadTimeMs: loadTime, networkProfile: merchant.networkProfile });
    await userDelay(merchant.digitalLiteracy, 'reading');

    // ── Step 2: Business info ─────────────────────────────────────────────────
    currentStep++;
    await userDelay(merchant.digitalLiteracy, 'form_interaction');

    for (const field of ['businessName', 'businessType', 'location']) {
      await sleep(typingDelay(merchant.digitalLiteracy));
      // Simulate human reading pause between fields
      await sleep(random(500, 1500));

      if (Math.random() < 0.1) {
        await emit({ event: 'VALIDATION_ERROR', step: 'business_info', field, reason: 'invalid_format' });
        await sleep(random(800, 2000)); // retry delay
      }
      await emit({ event: 'FIELD_FILLED', step: 'business_info', field });
    }

    // ── Step 3: Contact info ──────────────────────────────────────────────────
    currentStep++;
    await userDelay(merchant.digitalLiteracy, 'form_interaction');

    for (const field of ['phone', 'email']) {
      await sleep(typingDelay(merchant.digitalLiteracy));
      await sleep(random(300, 1000));
      await emit({ event: 'FIELD_FILLED', step: 'contact_info', field });
    }

    // ── Step 4: Documentation ─────────────────────────────────────────────────
    currentStep++;
    await userDelay(merchant.digitalLiteracy, 'document_upload');

    if (merchant.digitalLiteracy === 'basic' && Math.random() < 0.3) {
      await emit({ event: 'DOCUMENT_UPLOAD_CONFUSION', step: 'documentation', reason: 'ui_complexity' });
      await sleep(random(2000, 4000));
    }

    // Simulate network retry behavior
    if (merchant.networkProfile === '2G_EDGE' && Math.random() < 0.4) {
      await emit({ event: 'retry', step: 'documentation', reason: 'network_latency' });
      await networkDelay(merchant.networkProfile);
    }

    // ── Step 5: Submit ────────────────────────────────────────────────────────
    currentStep++;
    await userDelay(merchant.digitalLiteracy, 'submission');
    await networkDelay(merchant.networkProfile);

    const success = Math.random() < calcSuccessProbability(merchant);
    if (!success) throw new Error('Submission failed - validation error');

    const completionTimeMs = Date.now() - startTime;
    const summary = {
      success: true,
      completionTimeMs,
      stepsCompleted: currentStep,
      totalSteps: maxSteps,
      digitalLiteracy: merchant.digitalLiteracy,
      networkProfile: merchant.networkProfile,
      deviceType: merchant.deviceType
    };

    await emit({ event: 'ONBOARDING_SUMMARY', summary });
    return summary;

  } catch (error) {
    const summary = {
      success: false,
      error: error.message,
      failedAtStep: currentStep,
      totalSteps: maxSteps,
      timeBeforeFailure: Date.now() - startTime,
      digitalLiteracy: merchant.digitalLiteracy,
      networkProfile: merchant.networkProfile,
      deviceType: merchant.deviceType
    };
    await emit({ event: 'ONBOARDING_SUMMARY', summary });
    return summary;
  }
}

// ── Browser Pool ──────────────────────────────────────────────────────────────
async function ensureBrowser() {
  if (!browser || !browser.isConnected()) {
    console.log(`[${WORKER_ID}] Launching Playwright browser...`);
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    console.log(`[${WORKER_ID}] Browser ready`);
  }
  return browser;
}

// Wait until a context slot is free (backpressure)
async function waitForSlot() {
  while (activeContexts >= MAX_CONTEXTS) {
    await sleep(200);
  }
}

// ── Job Processor ─────────────────────────────────────────────────────────────
async function processJob(job) {
  const merchant = job.data;
  await waitForSlot();

  const b = await ensureBrowser();
  const deviceType = merchant.deviceType || merchant.deviceProfile || 'android_mid';
  const viewport = VIEWPORTS[deviceType] || VIEWPORTS.android_mid;
  const userAgent = USER_AGENTS[deviceType] || USER_AGENTS.android_mid;

  const context = await b.newContext({ viewport, userAgent });
  const page = await context.newPage();
  activeContexts++;

  console.log(`[${WORKER_ID}] Starting ${merchant.merchantId} (active: ${activeContexts}/${MAX_CONTEXTS})`);

  try {
    const result = await runMerchantSimulation(page, merchant);
    console.log(`[${WORKER_ID}] Done ${merchant.merchantId} success=${result.success} (active: ${activeContexts - 1}/${MAX_CONTEXTS})`);
    return result;
  } finally {
    activeContexts--;
    await context.close().catch(() => {});
  }
}

// ── Worker Bootstrap ──────────────────────────────────────────────────────────
const connection = new IORedis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  maxRetriesPerRequest: null
});

const worker = new Worker('merchant-simulations', processJob, {
  connection,
  concurrency: MAX_CONTEXTS
});

worker.on('completed', (job) => {
  console.log(`[${WORKER_ID}] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[${WORKER_ID}] Job ${job?.id} failed: ${err.message}`);
});

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
async function shutdown() {
  console.log(`[${WORKER_ID}] Shutting down gracefully...`);
  await worker.close();
  if (browser) await browser.close().catch(() => {});
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log(`[${WORKER_ID}] Worker started | Redis: ${REDIS_HOST}:${REDIS_PORT} | Max contexts: ${MAX_CONTEXTS}`);

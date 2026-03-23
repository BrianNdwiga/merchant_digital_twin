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
const MAX_CONTEXTS = parseInt(process.env.MAX_CONTEXTS || '5'); // reduced: 5 contexts × 5 workers = 25 concurrent
const WORKER_ID = process.env.HOSTNAME || `worker-${process.pid}`;

// ── State ─────────────────────────────────────────────────────────────────────
let activeContexts = 0;

// ── Utilities ─────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Network latency map (ms) — simulates realistic but not punishing delays
const NETWORK_LATENCY = {
  '4G_GOOD':     80,
  '4G_UNSTABLE': 200,
  '3G_POOR':     500,
  '2G_EDGE':     900,
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
  let p = 0.75; // raised base
  if (merchant.digitalLiteracy === 'advanced')      p += 0.15;
  else if (merchant.digitalLiteracy === 'intermediate') p += 0.08;
  else if (merchant.digitalLiteracy === 'basic')    p -= 0.10;
  if (merchant.networkProfile === '2G_EDGE')        p -= 0.15;
  else if (merchant.networkProfile === '3G_POOR')   p -= 0.08;
  else if (merchant.networkProfile === '4G_GOOD')   p += 0.05;
  if (merchant.deviceType === 'ios')                p += 0.05;
  else if (merchant.deviceType === 'feature_phone') p -= 0.05;
  p += (merchant.patienceScore || 0.5) * 0.1;
  p += merchant.scenarioConfig?.successProbabilityBonus || 0;
  return Math.max(0.45, Math.min(0.97, p)); // floor raised to 0.45
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

  const emit = (data) => emitEvent({ merchantId: merchant.merchantId, scenarioId: merchant.scenarioId || 'UNKNOWN', runId: merchant.runId || null, ...data });

  try {
    // ── Step 1: Navigate ──────────────────────────────────────────────────────
    currentStep++;
    await networkDelay(merchant.networkProfile);
    const navStart = Date.now();
    // Timeout scales with network quality — slow networks get more time
    const navTimeout = {
      '4G_GOOD':     15000,
      '4G_UNSTABLE': 25000,
      '3G_POOR':     45000,
      '2G_EDGE':     60000,
    }[merchant.networkProfile] || 30000;

    const response = await page.goto(portalUrl, { waitUntil: 'domcontentloaded', timeout: navTimeout });
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
let browserInstance = null;
let browserLaunchPromise = null;

async function ensureBrowser() {
  // If already launching, wait for that promise
  if (browserLaunchPromise) return browserLaunchPromise;
  // If healthy instance exists, reuse it
  if (browserInstance && browserInstance.isConnected()) return browserInstance;

  browserLaunchPromise = chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  }).then(b => {
    browserInstance = b;
    browserLaunchPromise = null;
    console.log(`[${WORKER_ID}] Browser ready`);
    return b;
  });

  return browserLaunchPromise;
}

// Wait until a context slot is free (backpressure)
async function waitForSlot() {
  while (activeContexts >= MAX_CONTEXTS) {
    await sleep(200);
  }
}

// ── USSD Channel Simulation ───────────────────────────────────────────────────
const USSD_STEPS = ['main_menu', 'business_name', 'business_type', 'phone_confirm', 'pin_entry'];
const USSD_TIMEOUT_PROB = { '4G_GOOD': 0.02, '4G_UNSTABLE': 0.08, '3G_POOR': 0.15, '2G_EDGE': 0.25 };
const USSD_INPUT_DELAY = { basic: 4000, intermediate: 2000, advanced: 1000 };

async function runUSSDSimulation(merchant) {
  const startTime = Date.now();
  let currentStep = 0;
  const maxSteps = USSD_STEPS.length;
  const emit = (data) => emitEvent({ merchantId: merchant.merchantId, scenarioId: merchant.scenarioId || 'UNKNOWN', runId: merchant.runId || null, channel: 'USSD', ...data });

  try {
    for (const stepId of USSD_STEPS) {
      currentStep++;
      // USSD round-trip latency
      const rtLatency = { '4G_GOOD': 300, '4G_UNSTABLE': 600, '3G_POOR': 1200, '2G_EDGE': 2500 }[merchant.networkProfile] || 800;
      await sleep(rtLatency + random(0, rtLatency * 0.3));

      // Session timeout check
      if (Math.random() < (USSD_TIMEOUT_PROB[merchant.networkProfile] || 0.1)) {
        await emit({ event: 'USSD_SESSION_TIMEOUT', step: stepId });
        throw new Error(`USSD session timed out at step: ${stepId}`);
      }

      // User input delay
      const inputDelay = USSD_INPUT_DELAY[merchant.digitalLiteracy] || 2000;
      await sleep(inputDelay + random(0, 500));

      // Wrong input for basic users
      if (merchant.digitalLiteracy === 'basic' && Math.random() < 0.1) {
        await emit({ event: 'USSD_WRONG_INPUT', step: stepId });
        await sleep(rtLatency); // re-navigate
      }

      await emit({ event: 'USSD_STEP_COMPLETE', step: stepId });
    }

    const completionTimeMs = Date.now() - startTime;
    const summary = { success: true, completionTimeMs, stepsCompleted: currentStep, totalSteps: maxSteps, channel: 'USSD', digitalLiteracy: merchant.digitalLiteracy, networkProfile: merchant.networkProfile };
    await emit({ event: 'ONBOARDING_SUMMARY', summary });
    return summary;
  } catch (error) {
    const summary = { success: false, error: error.message, failedAtStep: currentStep, totalSteps: maxSteps, timeBeforeFailure: Date.now() - startTime, channel: 'USSD', digitalLiteracy: merchant.digitalLiteracy, networkProfile: merchant.networkProfile };
    await emit({ event: 'ONBOARDING_SUMMARY', summary });
    return summary;
  }
}

// ── App Channel Simulation ────────────────────────────────────────────────────
const APP_SCREENS = ['splash', 'permissions', 'business_details', 'id_scan', 'selfie_verify', 'review_submit'];
const APP_LOAD_TIME = { ios: 800, android_mid: 1200, android_low_end: 2500, feature_phone: 4000 };
const SCAN_FAILURE_PROB = { ios: 0.05, android_mid: 0.10, android_low_end: 0.20, feature_phone: 0.40 };
const APP_INTERACTION_DELAY = { basic: 3500, intermediate: 1800, advanced: 900 };

function calcAppSuccessProbability(merchant) {
  let p = 0.72;
  if (merchant.digitalLiteracy === 'advanced')          p += 0.15;
  else if (merchant.digitalLiteracy === 'intermediate') p += 0.08;
  else if (merchant.digitalLiteracy === 'basic')        p -= 0.05;
  if (merchant.networkProfile === '2G_EDGE')            p -= 0.18;
  else if (merchant.networkProfile === '3G_POOR')       p -= 0.10;
  else if (merchant.networkProfile === '4G_GOOD')       p += 0.05;
  if (merchant.deviceType === 'ios')                    p += 0.08;
  else if (merchant.deviceType === 'android_low_end')   p -= 0.08;
  else if (merchant.deviceType === 'feature_phone')     p -= 0.20;
  p += (merchant.patienceScore || 0.5) * 0.08;
  p += merchant.scenarioConfig?.successProbabilityBonus || 0;
  return Math.max(0.35, Math.min(0.97, p));
}

async function runAppSimulation(merchant) {
  const startTime = Date.now();
  let currentStep = 0;
  const maxSteps = APP_SCREENS.length;
  const deviceType = merchant.deviceType || 'android_mid';
  const emit = (data) => emitEvent({ merchantId: merchant.merchantId, scenarioId: merchant.scenarioId || 'UNKNOWN', runId: merchant.runId || null, channel: 'APP', ...data });

  try {
    for (const screenId of APP_SCREENS) {
      currentStep++;
      const loadTime = (APP_LOAD_TIME[deviceType] || 1500) + random(0, 500);
      await sleep(loadTime);

      if (['id_scan', 'selfie_verify', 'review_submit'].includes(screenId)) {
        const netLatency = { '4G_GOOD': 100, '4G_UNSTABLE': 350, '3G_POOR': 800, '2G_EDGE': 1800 }[merchant.networkProfile] || 500;
        await sleep(netLatency + random(0, netLatency * 0.25));
      }

      if (screenId === 'permissions') {
        if (merchant.digitalLiteracy === 'basic' && Math.random() < 0.25) {
          await emit({ event: 'APP_PERMISSION_DENIED', step: screenId, reason: 'user_confusion' });
          await sleep(random(2000, 5000));
        }
        await emit({ event: 'APP_SCREEN_COMPLETE', step: screenId });
        continue;
      }

      if (screenId === 'id_scan' || screenId === 'selfie_verify') {
        const failProb = SCAN_FAILURE_PROB[deviceType] || 0.1;
        if (Math.random() < failProb) {
          await emit({ event: 'APP_SCAN_FAILED', step: screenId, deviceType, reason: 'camera_quality' });
          await sleep(random(1500, 3000));
          if (Math.random() < failProb * 0.8) throw new Error(`Scan failed after retry at step: ${screenId}`);
        }
        await emit({ event: 'APP_SCREEN_COMPLETE', step: screenId });
        continue;
      }

      const interactionDelay = APP_INTERACTION_DELAY[merchant.digitalLiteracy] || 1800;
      await sleep(interactionDelay + random(0, 800));

      if (screenId === 'business_details' && Math.random() < 0.12) {
        await emit({ event: 'APP_VALIDATION_ERROR', step: screenId });
        await sleep(random(1000, 2500));
      }

      await emit({ event: 'APP_SCREEN_COMPLETE', step: screenId });
    }

    const success = Math.random() < calcAppSuccessProbability(merchant);
    if (!success) throw new Error('App submission failed - server validation error');

    const completionTimeMs = Date.now() - startTime;
    const summary = { success: true, completionTimeMs, stepsCompleted: currentStep, totalSteps: maxSteps, channel: 'APP', digitalLiteracy: merchant.digitalLiteracy, networkProfile: merchant.networkProfile, deviceType };
    await emit({ event: 'ONBOARDING_SUMMARY', summary });
    return summary;
  } catch (error) {
    const summary = { success: false, error: error.message, failedAtStep: currentStep, totalSteps: maxSteps, timeBeforeFailure: Date.now() - startTime, channel: 'APP', digitalLiteracy: merchant.digitalLiteracy, networkProfile: merchant.networkProfile, deviceType };
    await emit({ event: 'ONBOARDING_SUMMARY', summary });
    return summary;
  }
}

// ── Job Processor ─────────────────────────────────────────────────────────────
async function processJob(job) {
  const merchant = job.data;
  const channelId = (merchant.channel || 'WEB').toUpperCase();

  // USSD and APP channels don't need a browser
  if (channelId === 'USSD') {
    console.log(`[${WORKER_ID}] Starting USSD simulation for ${merchant.merchantId}`);
    return runUSSDSimulation(merchant);
  }
  if (channelId === 'APP') {
    console.log(`[${WORKER_ID}] Starting APP simulation for ${merchant.merchantId}`);
    return runAppSimulation(merchant);
  }

  // WEB channel — uses Playwright browser pool
  await waitForSlot();

  const b = await ensureBrowser();  const deviceType = merchant.deviceType || merchant.deviceProfile || 'android_mid';
  const viewport = VIEWPORTS[deviceType] || VIEWPORTS.android_mid;
  const userAgent = USER_AGENTS[deviceType] || USER_AGENTS.android_mid;

  const context = await b.newContext({ viewport, userAgent });
  const page = await context.newPage();
  activeContexts++;

  console.log(`[${WORKER_ID}] Starting ${merchant.merchantId} (active: ${activeContexts}/${MAX_CONTEXTS})`);

  try {
    const result = await runMerchantSimulation(page, merchant);
    if (!result.success) {
      console.warn(`[${WORKER_ID}] ${merchant.merchantId} failed at step ${result.failedAtStep}: ${result.error}`);
    }
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
  concurrency: MAX_CONTEXTS,
  lockDuration: 300000,   // 5 min — accommodates slow 2G_EDGE simulations
  lockRenewTime: 60000    // renew every 60s (must be < lockDuration/2)
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
  if (browserInstance) await browserInstance.close().catch(() => {});
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

console.log(`[${WORKER_ID}] Worker started | Redis: ${REDIS_HOST}:${REDIS_PORT} | Max contexts: ${MAX_CONTEXTS}`);

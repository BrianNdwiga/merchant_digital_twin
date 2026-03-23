// Insights Engine - Real-time aggregation and AI-powered analysis
const { events } = require('./metrics');
const { generateAIRecommendations: getAIRecommendations } = require('./groqAI');

// Aggregated insights cache
let cachedInsights = {
  frictionPoints: [],
  failureHotspots: [],
  personaStruggles: [],
  networkImpact: [],
  aiRecommendations: [],
  lastUpdated: null
};

// Compute live operational metrics
function computeOperationalMetrics() {
  if (events.length === 0) {
    return {
      activeAgents: 0,
      completionRate: 0,
      avgDuration: 0,
      dropoffs: 0,
      retryFrequency: 0,
      errorHotspots: []
    };
  }

  const uniqueMerchants = new Set(events.map(e => e.merchantId)).size;
  const summaries = events.filter(e => e.event === 'ONBOARDING_SUMMARY' || e.event === 'SUMMARY');
  const completedCount = summaries.filter(e => e.summary?.success).length;
  const failedCount = summaries.filter(e => !e.summary?.success).length;
  
  const totalDuration = summaries.reduce((sum, e) => 
    sum + (e.summary?.completionTimeMs || e.summary?.timeBeforeFailure || 0), 0
  );
  const avgDuration = summaries.length > 0 ? Math.round(totalDuration / summaries.length) : 0;

  // Count retries
  const retryEvents = events.filter(e => 
    e.event === 'VALIDATION_ERROR' || 
    e.event === 'RETRY_ATTEMPT' ||
    e.retryNeeded
  );
  const retryFrequency = summaries.length > 0 ? 
    parseFloat((retryEvents.length / summaries.length).toFixed(2)) : 0;

  // Error hotspots
  const errorEvents = events.filter(e => 
    e.event === 'VALIDATION_ERROR' || 
    e.event === 'PAGE_LOAD_FAILED' ||
    e.event === 'ONBOARDING_FAILED'
  );
  
  const errorsByStep = {};
  errorEvents.forEach(e => {
    const step = e.step || e.field || 'unknown';
    errorsByStep[step] = (errorsByStep[step] || 0) + 1;
  });

  const errorHotspots = Object.entries(errorsByStep)
    .map(([step, count]) => ({ step, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    activeAgents: uniqueMerchants,
    completionRate: summaries.length > 0 ? 
      parseFloat((completedCount / summaries.length * 100).toFixed(1)) : 0,
    avgDuration,
    dropoffs: failedCount,
    retryFrequency,
    errorHotspots
  };
}

// Detect friction points
function detectFrictionPoints() {
  const frictionPoints = [];

  // Analyze validation errors
  const validationErrors = events.filter(e => e.event === 'VALIDATION_ERROR');
  const errorsByField = {};
  
  validationErrors.forEach(e => {
    const field = e.field || 'unknown';
    errorsByField[field] = (errorsByField[field] || 0) + 1;
  });

  Object.entries(errorsByField).forEach(([field, count]) => {
    if (count >= 3) {
      frictionPoints.push({
        type: 'validation',
        location: field,
        severity: count >= 5 ? 'high' : 'medium',
        count,
        description: `${count} validation errors on field: ${field}`
      });
    }
  });

  // Analyze page load failures
  const pageLoadFailures = events.filter(e => e.event === 'PAGE_LOAD_FAILED');
  if (pageLoadFailures.length >= 2) {
    frictionPoints.push({
      type: 'technical',
      location: 'page_load',
      severity: 'high',
      count: pageLoadFailures.length,
      description: `${pageLoadFailures.length} page load failures detected`
    });
  }

  // Detect confusion patterns
  const confusionEvents = events.filter(e => e.event === 'DOCUMENT_UPLOAD_CONFUSION');
  if (confusionEvents.length >= 2) {
    frictionPoints.push({
      type: 'ux',
      location: 'document_upload',
      severity: 'medium',
      count: confusionEvents.length,
      description: `${confusionEvents.length} users confused by document upload`
    });
  }

  // Detect app-level errors (APP channel)
  const appErrors = events.filter(e => e.event === 'APP_STEP' && e.step === 'ERROR');
  if (appErrors.length >= 1) {
    frictionPoints.push({
      type: 'technical',
      location: 'app_flow',
      severity: appErrors.length >= 3 ? 'high' : 'medium',
      count: appErrors.length,
      description: `${appErrors.length} app automation error(s): ${appErrors[0]?.detail || 'unknown'}`
    });
  }

  // Detect PIN entry failures (APP channel)
  const pinErrors = events.filter(e => e.event === 'VALIDATION_ERROR' && e.field === 'PIN');
  if (pinErrors.length >= 1) {
    frictionPoints.push({
      type: 'ux',
      location: 'pin_entry',
      severity: 'medium',
      count: pinErrors.length,
      description: `${pinErrors.length} incorrect PIN attempt(s) — users struggling with PIN entry`
    });
  }

  return frictionPoints;
}

// Analyze persona struggles
function analyzePersonaStruggles() {
  const summaries = events.filter(e => e.event === 'ONBOARDING_SUMMARY' || e.event === 'SUMMARY');
  
  if (summaries.length === 0) return [];

  const byLiteracy = {};
  const byNetwork = {};
  const byDevice = {};

  summaries.forEach(e => {
    const literacy = e.summary?.digitalLiteracy || 'unknown';
    const network = e.summary?.networkProfile || 'unknown';
    const device = e.summary?.deviceType || 'unknown';
    const success = e.summary?.success || false;

    if (!byLiteracy[literacy]) byLiteracy[literacy] = { total: 0, failed: 0 };
    if (!byNetwork[network]) byNetwork[network] = { total: 0, failed: 0 };
    if (!byDevice[device]) byDevice[device] = { total: 0, failed: 0 };

    byLiteracy[literacy].total++;
    byNetwork[network].total++;
    byDevice[device].total++;

    if (!success) {
      byLiteracy[literacy].failed++;
      byNetwork[network].failed++;
      byDevice[device].failed++;
    }
  });

  const struggles = [];

  // Check literacy struggles
  Object.entries(byLiteracy).forEach(([level, stats]) => {
    const failureRate = stats.total > 0 ? (stats.failed / stats.total) : 0;
    if (failureRate >= 0.5 && stats.total >= 2) {
      struggles.push({
        persona: `${level} digital literacy`,
        failureRate: parseFloat((failureRate * 100).toFixed(1)),
        count: stats.failed,
        total: stats.total,
        category: 'literacy'
      });
    }
  });

  // Check network struggles
  Object.entries(byNetwork).forEach(([profile, stats]) => {
    const failureRate = stats.total > 0 ? (stats.failed / stats.total) : 0;
    if (failureRate >= 0.5 && stats.total >= 2) {
      struggles.push({
        persona: profile,
        failureRate: parseFloat((failureRate * 100).toFixed(1)),
        count: stats.failed,
        total: stats.total,
        category: 'network'
      });
    }
  });

  return struggles;
}

// Analyze network impact
function analyzeNetworkImpact() {
  // Include summary events so we get per-profile success/failure counts
  const networkEvents = events.filter(e =>
    e.event === 'PAGE_LOAD' ||
    e.event === 'PAGE_LOAD_FAILED' ||
    e.event === 'NETWORK_DELAY' ||
    e.event === 'TIMEOUT' ||
    e.event === 'ONBOARDING_SUMMARY' ||
    e.event === 'SUMMARY'
  );

  if (networkEvents.length === 0) return [];

  const byProfile = {};

  networkEvents.forEach(e => {
    const profile = e.networkProfile || e.summary?.networkProfile || 'unknown';
    if (!byProfile[profile]) {
      byProfile[profile] = {
        totalEvents: 0,
        failures: 0,
        successes: 0,
        latencies: []
      };
    }

    // Count page-level events
    if (e.event === 'PAGE_LOAD' || e.event === 'PAGE_LOAD_FAILED' ||
        e.event === 'NETWORK_DELAY' || e.event === 'TIMEOUT') {
      byProfile[profile].totalEvents++;
      if (e.event === 'PAGE_LOAD_FAILED' || e.event === 'TIMEOUT') {
        byProfile[profile].failures++;
      }
    }

    // Count summary outcomes
    if (e.event === 'ONBOARDING_SUMMARY' || e.event === 'SUMMARY') {
      byProfile[profile].totalEvents++;
      if (e.summary?.success) byProfile[profile].successes++;
      else byProfile[profile].failures++;
    }

    // Collect latency — workers emit loadTimeMs on PAGE_LOAD
    const lat = e.latency || e.loadTimeMs || e.loadTime;
    if (lat) byProfile[profile].latencies.push(lat);
  });

  return Object.entries(byProfile).map(([profile, stats]) => {
    const avgLatency = stats.latencies.length > 0
      ? Math.round(stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length)
      : 0;

    const failureRate = stats.totalEvents > 0
      ? parseFloat((stats.failures / stats.totalEvents * 100).toFixed(1))
      : 0;

    return {
      profile,
      avgLatency,
      failureRate,
      failures: stats.failures,
      successes: stats.successes,
      totalEvents: stats.totalEvents
    };
  }).filter(item => item.totalEvents >= 1)
    .sort((a, b) => b.failureRate - a.failureRate);
}

// Compute failure breakdown by step (from ONBOARDING_SUMMARY failedAtStep)
function computeByStep() {
  const summaries = events.filter(e => e.event === 'ONBOARDING_SUMMARY' || e.event === 'SUMMARY');
  const stepNames = ['portal_landing', 'business_info', 'contact_info', 'documentation', 'submission'];
  const byStep = {};

  summaries.forEach(e => {
    const s = e.summary || {};
    const failedAt = s.failedAtStep;
    const success = s.success;

    // Count all merchants against the step they reached
    const reachedStep = success ? stepNames[s.stepsCompleted - 1] : stepNames[(failedAt || 1) - 1];
    const key = reachedStep || 'unknown';
    if (!byStep[key]) byStep[key] = { total: 0, failed: 0 };
    byStep[key].total++;
    if (!success) byStep[key].failed++;
  });

  return byStep;
}

// Compute failure breakdown by literacy and network with avg duration
function computeBySegment() {
  const summaries = events.filter(e => e.event === 'ONBOARDING_SUMMARY' || e.event === 'SUMMARY');
  const byLiteracy = {};
  const byNetwork = {};

  summaries.forEach(e => {
    const s = e.summary || {};
    const literacy = s.digitalLiteracy || 'unknown';
    const network = s.networkProfile || 'unknown';
    const success = s.success || false;
    const duration = s.completionTimeMs || s.timeBeforeFailure || 0;

    if (!byLiteracy[literacy]) byLiteracy[literacy] = { total: 0, failed: 0, totalDuration: 0 };
    if (!byNetwork[network]) byNetwork[network] = { total: 0, failed: 0, totalDuration: 0 };

    byLiteracy[literacy].total++;
    byNetwork[network].total++;
    byLiteracy[literacy].totalDuration += duration;
    byNetwork[network].totalDuration += duration;

    if (!success) {
      byLiteracy[literacy].failed++;
      byNetwork[network].failed++;
    }
  });

  // Add avgDuration
  for (const v of Object.values(byLiteracy)) v.avgDuration = v.total > 0 ? Math.round(v.totalDuration / v.total) : 0;
  for (const v of Object.values(byNetwork)) v.avgDuration = v.total > 0 ? Math.round(v.totalDuration / v.total) : 0;

  return { byLiteracy, byNetwork };
}

// Generate AI recommendations — passes full breakdown to groqAI
async function generateAIRecommendations(insights) {
  return getAIRecommendations(insights);
}

// Main insights aggregation function
async function aggregateInsights() {
  const operational = computeOperationalMetrics();
  const frictionPoints = detectFrictionPoints();
  const personaStruggles = analyzePersonaStruggles();
  const networkImpact = analyzeNetworkImpact();
  const byStep = computeByStep();
  const { byLiteracy, byNetwork } = computeBySegment();

  const insights = {
    operational,
    frictionPoints,
    personaStruggles,
    networkImpact,
    byStep,
    byLiteracy,
    byNetwork
  };

  const aiRecommendations = await generateAIRecommendations(insights);

  cachedInsights = {
    ...insights,
    aiRecommendations,
    lastUpdated: Date.now()
  };

  return cachedInsights;
}

// Get cached insights (with auto-refresh if stale)
async function getInsights() {
  const now = Date.now();
  const staleThreshold = 5000; // 5 seconds

  if (!cachedInsights.lastUpdated || (now - cachedInsights.lastUpdated) > staleThreshold) {
    return await aggregateInsights();
  }

  return cachedInsights;
}

module.exports = {
  aggregateInsights,
  getInsights,
  computeOperationalMetrics,
  detectFrictionPoints,
  analyzePersonaStruggles,
  analyzeNetworkImpact,
  generateAIRecommendations
};

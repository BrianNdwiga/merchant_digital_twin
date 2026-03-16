// Channel Simulation - delegates to Redis queue for scalable execution

const SIMULATION_QUEUE_URL = process.env.SIMULATION_QUEUE_URL || 'http://simulation-queue:3005';
const ONBOARDING_URL = process.env.ONBOARDING_URL || 'http://mock-portal/index.html';

// Available channels
const CHANNELS = {
  WEB: { name: 'Web Portal', enabled: true },
  USSD: { name: 'USSD', enabled: false },
  APP: { name: 'Mobile App', enabled: false }
};

function getAvailableChannels() {
  return Object.entries(CHANNELS).map(([key, value]) => ({
    id: key,
    name: value.name,
    enabled: value.enabled
  }));
}

// Enqueue merchants to the simulation queue instead of spawning containers
async function runChannelSimulation(merchants, config, progressCallback) {
  const scenarioId = config.scenarioId || `channel-sim-${Date.now()}`;

  // Enrich merchants with portal URL
  const enriched = merchants.map(m => ({
    ...m,
    scenarioId,
    onboardingUrl: config.portalUrl || ONBOARDING_URL
  }));

  console.log(`\n🎯 Enqueueing ${enriched.length} merchants to simulation queue`);
  console.log(`🔗 Portal: ${config.portalUrl || ONBOARDING_URL}`);

  if (progressCallback) {
    progressCallback({ status: 'enqueueing', total: enriched.length });
  }

  try {
    const response = await fetch(`${SIMULATION_QUEUE_URL}/enqueue-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchants: enriched, scenarioId, onboardingUrl: config.portalUrl || ONBOARDING_URL })
    });

    if (!response.ok) throw new Error(`Queue service returned ${response.status}`);
    const result = await response.json();

    console.log(`✅ Enqueued ${result.enqueued} jobs for scenario ${scenarioId}`);

    if (progressCallback) {
      progressCallback({ status: 'queued', enqueued: result.enqueued, scenarioId });
    }

    return {
      success: true,
      totalMerchants: enriched.length,
      enqueued: result.enqueued,
      scenarioId
    };
  } catch (err) {
    console.error('❌ Failed to enqueue merchants:', err.message);
    if (progressCallback) {
      progressCallback({ status: 'error', error: err.message });
    }
    throw err;
  }
}

module.exports = {
  getAvailableChannels,
  runChannelSimulation
};

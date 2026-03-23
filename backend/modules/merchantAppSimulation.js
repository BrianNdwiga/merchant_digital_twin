// Merchant App Simulation — spawns merchant-app-agent Docker containers
// Each container runs an Appium-driven (or behavioral) payment simulation.

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const DOCKER_IMAGE = 'merchant-app-agent:latest';

// Spawn one merchant app agent container
async function spawnMerchantAppAgent(merchant, config, progressCallback) {
  const containerName = `merchant_app_${merchant.merchantId}_${Date.now()}`;

  const agentProfile = {
    ...merchant,
    scenarioId: config.scenarioId || `merchant-app-sim-${Date.now()}`
  };

  const merchantProfile   = JSON.stringify(agentProfile).replace(/"/g, '\\"');
  const insightServiceUrl = process.env.INSIGHT_SERVICE_URL || 'http://host.docker.internal:3000';

  const bsUser = process.env.BROWSERSTACK_USER || '';
  const bsKey  = process.env.BROWSERSTACK_KEY  || '';
  const appUrl = process.env.APP_URL            || '';

  const dockerCmd = [
    `docker run --rm --name ${containerName}`,
    `-e MERCHANT_APP_PROFILE="${merchantProfile}"`,
    `-e INSIGHT_SERVICE_URL="${insightServiceUrl}"`,
    `-e BROWSERSTACK_USER="${bsUser}"`,
    `-e BROWSERSTACK_KEY="${bsKey}"`,
    `-e APP_URL="${appUrl}"`,
    DOCKER_IMAGE
  ].join(' ');

  console.log(`🐳 Spawning merchant app container: ${containerName}`);
  console.log(`   Device: ${merchant.device_type} | Network: ${merchant.network_profile}`);

  progressCallback?.({
    merchantId: merchant.merchantId,
    status: 'starting',
    message: `Spawning agent for ${merchant.merchantId}`
  });

  try {
    const { stdout } = await execPromise(dockerCmd);
    console.log(`✅ Merchant app agent ${merchant.merchantId} completed`);
    progressCallback?.({ merchantId: merchant.merchantId, status: 'completed' });
    return { success: true, merchantId: merchant.merchantId, output: stdout };
  } catch (error) {
    console.error(`❌ Merchant app agent ${merchant.merchantId} failed: ${error.message}`);
    progressCallback?.({ merchantId: merchant.merchantId, status: 'failed', message: error.message });
    return { success: false, merchantId: merchant.merchantId, error: error.message };
  }
}

// Run simulation for a batch of merchants
async function runMerchantAppSimulation(merchants, config, progressCallback) {
  const results    = [];
  const startTime  = Date.now();
  const concurrent = config.simulationSpeed === 'accelerated' ? 3 : 1;

  console.log(`\n🎯 Starting merchant app simulation`);
  console.log(`👥 Merchants: ${merchants.length}`);
  console.log('═'.repeat(60));

  for (let i = 0; i < merchants.length; i += concurrent) {
    const batch = merchants.slice(i, i + concurrent);
    const batchResults = await Promise.all(
      batch.map(m => spawnMerchantAppAgent(m, config, progressCallback))
    );
    results.push(...batchResults);

    progressCallback?.({
      status:    'progress',
      completed: Math.min(i + concurrent, merchants.length),
      total:     merchants.length
    });
  }

  const completionTime = Date.now() - startTime;
  console.log('═'.repeat(60));
  console.log(`✅ Merchant app simulation done in ${completionTime}ms`);
  console.log(`   Success: ${results.filter(r => r.success).length}/${results.length}`);

  return {
    success:          true,
    totalMerchants:   merchants.length,
    successCount:     results.filter(r => r.success).length,
    failureCount:     results.filter(r => !r.success).length,
    completionTimeMs: completionTime,
    results
  };
}

module.exports = { runMerchantAppSimulation };

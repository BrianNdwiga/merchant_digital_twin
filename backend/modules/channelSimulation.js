const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const DOCKER_IMAGE = 'simulation-agent:latest';

// Available channels
const CHANNELS = {
  WEB: { name: 'Web Portal', enabled: true },
  USSD: { name: 'USSD', enabled: false },
  APP: { name: 'Mobile App', enabled: false }
};

// Get available channels
function getAvailableChannels() {
  return Object.entries(CHANNELS).map(([key, value]) => ({
    id: key,
    name: value.name,
    enabled: value.enabled
  }));
}

// Spawn agent container with channel configuration
async function spawnChannelAgent(merchant, channelConfig, progressCallback) {
  const containerName = `agent_${merchant.merchantId}_${Date.now()}`;
  
  // Convert localhost URLs to host.docker.internal for Docker container access
  let portalUrl = channelConfig.portalUrl || 'http://localhost:3000/mock-portal/index.html';
  if (portalUrl.includes('localhost')) {
    portalUrl = portalUrl.replace('localhost', 'host.docker.internal');
  }
  
  // Merge merchant profile with portal URL from config
  const agentProfile = {
    ...merchant,
    portalUrl: portalUrl,
    scenarioId: channelConfig.scenarioId || 'channel-simulation'
  };
  
  const merchantProfile = JSON.stringify(agentProfile).replace(/"/g, '\\"');
  const insightServiceUrl = process.env.INSIGHT_SERVICE_URL || 'http://host.docker.internal:3000';
  
  const dockerCmd = `docker run --rm --name ${containerName} -e MERCHANT_PROFILE="${merchantProfile}" -e INSIGHT_SERVICE_URL="${insightServiceUrl}" ${DOCKER_IMAGE}`;
  
  console.log(`🐳 Spawning container: ${containerName}`);
  console.log(`   Portal: ${agentProfile.portalUrl}`);
  console.log(`   Device: ${agentProfile.deviceType} | Network: ${agentProfile.networkProfile}`);
  console.log(`   Literacy: ${agentProfile.digitalLiteracy} | Income: ${agentProfile.incomeLevel}`);
  
  if (progressCallback) {
    progressCallback({
      merchantId: merchant.merchantId,
      status: 'starting',
      message: `Spawning agent for ${merchant.merchantId}`,
      portalUrl: agentProfile.portalUrl
    });
  }
  
  try {
    const { stdout, stderr } = await execPromise(dockerCmd);
    
    console.log(`✅ Agent ${merchant.merchantId} completed successfully`);
    
    if (progressCallback) {
      progressCallback({
        merchantId: merchant.merchantId,
        status: 'completed',
        message: `Agent ${merchant.merchantId} completed onboarding`,
        output: stdout
      });
    }
    
    return {
      success: true,
      merchantId: merchant.merchantId,
      output: stdout,
      stderr: stderr
    };
    
  } catch (error) {
    console.error(`❌ Agent ${merchant.merchantId} failed: ${error.message}`);
    
    if (progressCallback) {
      progressCallback({
        merchantId: merchant.merchantId,
        status: 'failed',
        message: `Agent ${merchant.merchantId} failed: ${error.message}`
      });
    }
    
    return {
      success: false,
      merchantId: merchant.merchantId,
      error: error.message
    };
  }
}

// Run channel-based simulation for multiple merchants
async function runChannelSimulation(merchants, config, progressCallback) {
  const results = [];
  const startTime = Date.now();
  
  console.log(`\n🎯 Starting web portal simulation`);
  console.log(`🔗 Portal: ${config.portalUrl}`);
  console.log(`👥 Merchants: ${merchants.length}`);
  console.log('═'.repeat(60));
  
  // Determine concurrency based on simulation speed
  const concurrent = config.simulationSpeed === 'accelerated' ? 3 : 1;
  
  // Process merchants in batches
  for (let i = 0; i < merchants.length; i += concurrent) {
    const batch = merchants.slice(i, i + concurrent);
    
    const batchPromises = batch.map(merchant => 
      spawnChannelAgent(merchant, config, progressCallback)
    );
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Progress update
    if (progressCallback) {
      progressCallback({
        status: 'progress',
        completed: Math.min(i + concurrent, merchants.length),
        total: merchants.length
      });
    }
  }
  
  const completionTime = Date.now() - startTime;
  
  console.log('═'.repeat(60));
  console.log(`✅ Simulation completed in ${completionTime}ms`);
  console.log(`   Success: ${results.filter(r => r.success).length}/${results.length}`);
  
  return {
    success: true,
    totalMerchants: merchants.length,
    successCount: results.filter(r => r.success).length,
    failureCount: results.filter(r => !r.success).length,
    completionTimeMs: completionTime,
    results: results
  };
}

module.exports = {
  getAvailableChannels,
  spawnChannelAgent,
  runChannelSimulation
};

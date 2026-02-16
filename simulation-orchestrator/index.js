const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const MERCHANT_GENERATOR_URL = 'http://localhost:3001/generate-merchants';
const DOCKER_IMAGE = 'simulation-agent:latest';

// Fetch merchants from generator service
async function fetchMerchants(count = 5) {
  try {
    const response = await fetch(`${MERCHANT_GENERATOR_URL}?count=${count}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch merchants:', error.message);
    console.error('Make sure merchant-generator is running on port 3001');
    process.exit(1);
  }
}

// Spawn Docker container for a merchant agent
async function spawnAgentContainer(merchant) {
  const containerName = `agent_${merchant.merchantId}`;
  const merchantProfile = JSON.stringify(merchant).replace(/"/g, '\\"');
  
  // Docker run command with merchant profile as environment variable
  const dockerCmd = `docker run --rm --name ${containerName} -e MERCHANT_PROFILE="${merchantProfile}" ${DOCKER_IMAGE}`;
  
  console.log(`\n🚀 Spawning agent for ${merchant.merchantId}...`);
  
  try {
    const { stdout, stderr } = await execPromise(dockerCmd);
    
    // Display agent output
    if (stdout) {
      console.log(`\n📊 Agent ${merchant.merchantId} output:`);
      console.log(stdout);
    }
    
    if (stderr) {
      console.error(`⚠️  Agent ${merchant.merchantId} stderr:`, stderr);
    }
    
  } catch (error) {
    console.error(`❌ Failed to run agent ${merchant.merchantId}:`, error.message);
  }
}

// Main orchestration function
async function runSimulation() {
  console.log('🎯 Digital Twin Simulation Orchestrator');
  console.log('=' .repeat(50));
  
  // Step 1: Fetch merchants
  console.log('\n📡 Fetching synthetic merchants...');
  const merchants = await fetchMerchants(5);
  console.log(`✅ Received ${merchants.length} merchant profiles\n`);
  
  // Step 2: Verify Docker image exists
  console.log('🐳 Checking Docker image...');
  try {
    await execPromise(`docker image inspect ${DOCKER_IMAGE}`);
    console.log('✅ Docker image found\n');
  } catch (error) {
    console.error(`❌ Docker image '${DOCKER_IMAGE}' not found!`);
    console.error('Please build the image first:');
    console.error('  cd simulation-agent && docker build -t simulation-agent:latest .');
    process.exit(1);
  }
  
  // Step 3: Spawn containers for each merchant
  console.log('🔄 Starting agent simulations...');
  console.log('=' .repeat(50));
  
  // Run agents sequentially to avoid overwhelming the system
  for (const merchant of merchants) {
    await spawnAgentContainer(merchant);
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('✅ All simulations completed!');
}

// Run the simulation
runSimulation().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

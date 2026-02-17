const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const MERCHANT_GENERATOR_URL = process.env.MERCHANT_GENERATOR_URL || 'http://localhost:3001/generate-merchants-from-csv';
const INSIGHT_SERVICE_URL = process.env.INSIGHT_SERVICE_URL || 'http://localhost:3000';
const DOCKER_IMAGE = 'simulation-agent:latest';

// Load all scenario configurations from /scenarios directory
function loadScenarios() {
  const scenariosDir = path.join(__dirname, '..', 'scenarios');
  const scenarioFiles = fs.readdirSync(scenariosDir).filter(f => f.endsWith('.json'));
  
  const scenarios = [];
  
  scenarioFiles.forEach(file => {
    const filePath = path.join(scenariosDir, file);
    const scenarioData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    scenarios.push(scenarioData);
  });
  
  console.log(`📋 Loaded ${scenarios.length} scenario configurations:`);
  scenarios.forEach(s => {
    console.log(`   - ${s.scenarioId}: ${s.description}`);
  });
  
  return scenarios;
}

// Fetch merchants from merchant generator
async function fetchMerchants() {
  try {
    const response = await fetch(MERCHANT_GENERATOR_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('❌ Failed to fetch merchants:', error.message);
    console.error('Make sure merchant-generator is running on port 3001');
    process.exit(1);
  }
}

// Enrich merchant profile with scenario configuration
function enrichMerchantWithScenario(merchant, scenario) {
  return {
    ...merchant,
    scenarioId: scenario.scenarioId,
    scenarioConfig: {
      latencyMultiplier: scenario.latencyMultiplier,
      retryBonus: scenario.retryBonus,
      successProbabilityBonus: scenario.successProbabilityBonus
    }
  };
}

// Spawn Docker container for a merchant agent with scenario
async function spawnAgentContainer(merchant, scenario) {
  const containerName = `agent_${scenario.scenarioId}_${merchant.merchantId}`;
  const merchantProfile = JSON.stringify(merchant).replace(/"/g, '\\"');
  
  // Docker run command with merchant profile, scenario config, and insight service URL
  const insightServiceUrl = process.env.INSIGHT_SERVICE_URL || 'http://host.docker.internal:3000';
  const dockerCmd = `docker run --rm --name ${containerName} -e MERCHANT_PROFILE="${merchantProfile}" -e INSIGHT_SERVICE_URL="${insightServiceUrl}" ${DOCKER_IMAGE}`;
  
  try {
    const { stdout, stderr } = await execPromise(dockerCmd);
    
    if (stdout) {
      console.log(`   ✓ ${merchant.merchantId} completed`);
    }
    
    if (stderr && stderr.includes('ERROR')) {
      console.error(`   ⚠️  ${merchant.merchantId} had warnings`);
    }
    
    return { success: true, merchantId: merchant.merchantId };
  } catch (error) {
    console.error(`   ❌ ${merchant.merchantId} failed:`, error.message);
    return { success: false, merchantId: merchant.merchantId, error: error.message };
  }
}

// Run simulations for a single scenario
async function runScenarioSimulation(scenario, merchants) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`🎬 Running Scenario: ${scenario.scenarioId}`);
  console.log(`   ${scenario.description}`);
  console.log(`   Latency Multiplier: ${scenario.latencyMultiplier}x`);
  console.log(`   Retry Bonus: +${scenario.retryBonus}`);
  console.log(`   Success Bonus: +${(scenario.successProbabilityBonus * 100).toFixed(0)}%`);
  console.log(`${'═'.repeat(70)}`);
  
  // Enrich merchants with scenario config
  const enrichedMerchants = merchants.map(m => enrichMerchantWithScenario(m, scenario));
  
  console.log(`\n🚀 Spawning ${enrichedMerchants.length} agents for ${scenario.scenarioId}...\n`);
  
  const results = [];
  
  // Run agents sequentially to avoid overwhelming the system
  for (const merchant of enrichedMerchants) {
    const result = await spawnAgentContainer(merchant, scenario);
    results.push(result);
  }
  
  const successCount = results.filter(r => r.success).length;
  const failureCount = results.filter(r => !r.success).length;
  
  console.log(`\n✅ Scenario ${scenario.scenarioId} completed:`);
  console.log(`   Agents spawned: ${results.length}`);
  console.log(`   Successful: ${successCount}`);
  console.log(`   Failed: ${failureCount}`);
  
  return {
    scenarioId: scenario.scenarioId,
    totalAgents: results.length,
    successful: successCount,
    failed: failureCount
  };
}

// Main function to run all scenario simulations
async function runScenarioSimulations() {
  console.log('🎯 Digital Twin Scenario Experimentation Engine');
  console.log('📊 Multi-Scenario Simulation Runner');
  console.log('═'.repeat(70));
  
  // Step 1: Load scenarios
  console.log('\n📋 Loading scenario configurations...');
  const scenarios = loadScenarios();
  
  if (scenarios.length === 0) {
    console.error('❌ No scenarios found in /scenarios directory');
    process.exit(1);
  }
  
  // Step 2: Fetch merchants
  console.log('\n📡 Fetching merchant profiles...');
  const merchants = await fetchMerchants();
  console.log(`✅ Loaded ${merchants.length} merchant profiles`);
  
  // Step 3: Verify Docker image
  console.log('\n🐳 Checking Docker image...');
  try {
    await execPromise(`docker image inspect ${DOCKER_IMAGE}`);
    console.log('✅ Docker image found');
  } catch (error) {
    console.error(`❌ Docker image '${DOCKER_IMAGE}' not found!`);
    console.error('Please build the image first:');
    console.error('  cd simulation-agent && docker build -t simulation-agent:latest .');
    process.exit(1);
  }
  
  // Step 4: Clear previous insights
  console.log('\n🗑️  Clearing previous simulation data...');
  try {
    await fetch(`${INSIGHT_SERVICE_URL}/insights/clear`, { method: 'DELETE' });
    console.log('✅ Previous data cleared');
  } catch (error) {
    console.warn('⚠️  Could not clear previous data (insight service may not be running)');
  }
  
  // Step 5: Run simulations for each scenario
  console.log('\n🔄 Starting multi-scenario simulations...');
  console.log(`   Total simulations: ${merchants.length} merchants × ${scenarios.length} scenarios = ${merchants.length * scenarios.length} agents`);
  
  const scenarioResults = [];
  
  for (const scenario of scenarios) {
    const result = await runScenarioSimulation(scenario, merchants);
    scenarioResults.push(result);
    
    // Brief pause between scenarios
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // Step 6: Summary
  console.log('\n' + '═'.repeat(70));
  console.log('✅ All scenario simulations completed!');
  console.log('═'.repeat(70));
  
  scenarioResults.forEach(result => {
    console.log(`\n${result.scenarioId}:`);
    console.log(`  Total: ${result.totalAgents} | Success: ${result.successful} | Failed: ${result.failed}`);
  });
  
  console.log('\n💡 Next steps:');
  console.log('   1. View insights: curl http://localhost:3000/insights/summary');
  console.log('   2. Compare scenarios: cd cli && npm run compare');
  console.log('');
}

// Run the scenario simulations
runScenarioSimulations().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

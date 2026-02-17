// AI Agent - Simulates merchant behavior inside Docker container

// Configuration
const INSIGHT_SERVICE_URL = process.env.INSIGHT_SERVICE_URL || 'http://localhost:3000';

// Network latency mapping (milliseconds)
const NETWORK_LATENCY = {
  '4G_GOOD': 100,
  '4G_UNSTABLE': 300,
  '3G_POOR': 800,
  '2G_EDGE': 1500
};

// Sleep utility
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Send event to Insight Service
async function sendEventToInsightService(eventData) {
  try {
    const response = await fetch(`${INSIGHT_SERVICE_URL}/simulation-event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventData)
    });
    
    if (!response.ok) {
      console.error(`⚠️  Failed to send event to Insight Service: ${response.status}`);
    }
  } catch (error) {
    // Fail silently - don't break simulation if insight service is down
    console.error(`⚠️  Could not reach Insight Service: ${error.message}`);
  }
}

// Parse merchant profile from environment variable
function getMerchantProfile() {
  const profileJson = process.env.MERCHANT_PROFILE;
  
  if (!profileJson) {
    console.error('ERROR: MERCHANT_PROFILE environment variable not set');
    process.exit(1);
  }
  
  try {
    const profile = JSON.parse(profileJson);
    
    // Extract scenario configuration if present
    if (profile.scenarioConfig) {
      console.log(`📋 Scenario: ${profile.scenarioId || 'UNKNOWN'}`);
      console.log(`   Latency: ${profile.scenarioConfig.latencyMultiplier}x | Retry Bonus: +${profile.scenarioConfig.retryBonus}`);
    }
    
    return profile;
  } catch (error) {
    console.error('ERROR: Failed to parse MERCHANT_PROFILE JSON:', error.message);
    process.exit(1);
  }
}

// Log structured insight
function logInsight(data) {
  console.log(JSON.stringify(data, null, 2));
}

// Simulate network delay based on profile and scenario config
async function simulateNetworkDelay(networkProfile, scenarioConfig) {
  const baseLatency = NETWORK_LATENCY[networkProfile] || 500;
  
  // Apply scenario latency multiplier if present
  const latencyMultiplier = scenarioConfig?.latencyMultiplier || 1.0;
  const adjustedLatency = baseLatency * latencyMultiplier;
  
  // Add some randomness (±20%)
  const actualLatency = adjustedLatency + (Math.random() * 0.4 - 0.2) * adjustedLatency;
  await sleep(Math.round(actualLatency));
  return Math.round(actualLatency);
}

// Calculate experience score based on multiple factors
function calculateExperienceScore(attempts, success, merchant, totalLatency) {
  if (!success) return 0;
  
  // Base score decreases with more attempts
  const attemptPenalty = Math.max(0, 1 - (attempts - 1) * 0.2);
  
  // Factor in patience score
  const patienceBonus = merchant.patienceScore;
  
  // Digital literacy affects experience (advanced users tolerate issues better)
  const literacyBonus = merchant.digitalLiteracy === 'advanced' ? 0.2 : 
                       merchant.digitalLiteracy === 'intermediate' ? 0.1 : 0;
  
  // Income level affects expectations (higher income = higher expectations)
  const incomeImpact = merchant.incomeLevel === 'high' ? -0.1 : 
                      merchant.incomeLevel === 'low' ? 0.1 : 0;
  
  // Network quality affects experience
  const networkPenalty = merchant.networkProfile === '2G_EDGE' ? -0.2 :
                        merchant.networkProfile === '3G_POOR' ? -0.1 : 0;
  
  // Calculate final score
  const score = Math.max(0, Math.min(1, 
    attemptPenalty * patienceBonus + literacyBonus + incomeImpact + networkPenalty
  ));
  
  return parseFloat(score.toFixed(2));
}

// Main agent simulation logic
async function runAgentSimulation() {
  const merchant = getMerchantProfile();
  
  console.log(`\n🤖 Agent started for merchant: ${merchant.merchantId}`);
  console.log(`📱 Device: ${merchant.deviceType} | 📡 Network: ${merchant.networkProfile}`);
  console.log(`🎯 Issue: ${merchant.issueType} | 🔄 Max retries: ${merchant.retryThreshold}`);
  
  // Apply scenario retry bonus if present
  const scenarioConfig = merchant.scenarioConfig || {};
  const retryBonus = scenarioConfig.retryBonus || 0;
  const maxAttempts = merchant.retryThreshold + retryBonus;
  
  if (retryBonus > 0) {
    console.log(`🎬 Scenario bonus: +${retryBonus} retries (total: ${maxAttempts})`);
  }
  console.log('');
  
  let attempts = 0;
  let success = false;
  let totalLatency = 0;
  const startTime = Date.now();
  
  // Simulate initial delay (agent thinking/loading)
  // Lower digital literacy = longer initial delay
  const initialDelay = merchant.digitalLiteracy === 'basic' ? 2000 :
                      merchant.digitalLiteracy === 'intermediate' ? 1500 : 1000;
  await sleep(initialDelay + Math.random() * 1000);
  
  // Attempt loop
  while (attempts < maxAttempts && !success) {
    attempts++;
    
    // Simulate network latency with scenario config
    const latency = await simulateNetworkDelay(merchant.networkProfile, scenarioConfig);
    totalLatency += latency;
    
    // Determine if this attempt succeeds
    // Success probability based on multiple factors
    const literacyBonus = merchant.digitalLiteracy === 'advanced' ? 0.3 : 
                         merchant.digitalLiteracy === 'intermediate' ? 0.15 : 0;
    
    // Income level affects success (higher income may have better support/resources)
    const incomeBonus = merchant.incomeLevel === 'high' ? 0.1 :
                       merchant.incomeLevel === 'medium' ? 0.05 : 0;
    
    // Device type affects success
    const deviceBonus = merchant.deviceType === 'ios' ? 0.1 :
                       merchant.deviceType === 'android_mid' ? 0.05 : 0;
    
    // Apply scenario success probability bonus if present
    const scenarioBonus = scenarioConfig.successProbabilityBonus || 0;
    
    const successProbability = 0.35 + literacyBonus + incomeBonus + deviceBonus + (merchant.patienceScore * 0.2) + scenarioBonus;
    
    success = Math.random() < successProbability;
    
    // Prepare event data with scenario ID
    const eventData = {
      merchantId: merchant.merchantId,
      scenarioId: merchant.scenarioId || 'UNKNOWN',
      scenario: merchant.issueType.toUpperCase(),
      networkProfile: merchant.networkProfile,
      digitalLiteracy: merchant.digitalLiteracy,
      incomeLevel: merchant.incomeLevel,
      deviceType: merchant.deviceType,
      event: 'ATTEMPT',
      attempt: attempts,
      latency: latency,
      result: success ? 'success' : 'retry',
      timestamp: Date.now()
    };
    
    // Log attempt insight (console)
    logInsight({
      merchantId: merchant.merchantId,
      event: `${merchant.issueType.toUpperCase()}_ATTEMPT`,
      attempt: attempts,
      latency: latency,
      result: success ? 'success' : 'retry',
      timestamp: new Date().toISOString()
    });
    
    // Send to Insight Service
    await sendEventToInsightService(eventData);
    
    // If failed and can retry, wait before next attempt
    if (!success && attempts < maxAttempts) {
      // Impatient users wait less between retries
      const retryDelay = 1000 * (1 - merchant.patienceScore * 0.5);
      await sleep(retryDelay);
    }
  }
  
  // Calculate final metrics
  const completionTimeMs = Date.now() - startTime;
  const experienceScore = calculateExperienceScore(attempts, success, merchant, totalLatency);
  const failures = attempts - (success ? 1 : 0);
  
  // Prepare summary data
  const summaryData = {
    totalAttempts: attempts,
    failures: failures,
    success: success,
    experienceScore: experienceScore,
    completionTimeMs: completionTimeMs,
    avgLatencyMs: Math.round(totalLatency / attempts),
    issueType: merchant.issueType,
    networkProfile: merchant.networkProfile,
    digitalLiteracy: merchant.digitalLiteracy,
    incomeLevel: merchant.incomeLevel,
    deviceType: merchant.deviceType,
    outcome: success ? '✅ RESOLVED' : '❌ ABANDONED'
  };
  
  // Log final summary with enhanced metrics (console)
  console.log('\n' + '─'.repeat(50));
  logInsight({
    merchantId: merchant.merchantId,
    summary: summaryData
  });
  console.log('─'.repeat(50) + '\n');
  
  // Send summary to Insight Service with scenario ID
  await sendEventToInsightService({
    merchantId: merchant.merchantId,
    scenarioId: merchant.scenarioId || 'UNKNOWN',
    event: 'SUMMARY',
    summary: summaryData,
    timestamp: Date.now()
  });
  
  // Exit with appropriate code
  process.exit(success ? 0 : 1);
}

// Run the simulation
runAgentSimulation().catch(error => {
  console.error('Agent error:', error);
  process.exit(1);
});

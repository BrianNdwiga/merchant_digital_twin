// AI Agent - Simulates merchant behavior inside Docker container

// Network latency mapping (milliseconds)
const NETWORK_LATENCY = {
  '4G_GOOD': 100,
  '4G_UNSTABLE': 300,
  '3G_POOR': 800,
  '2G_EDGE': 1500
};

// Sleep utility
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Parse merchant profile from environment variable
function getMerchantProfile() {
  const profileJson = process.env.MERCHANT_PROFILE;
  
  if (!profileJson) {
    console.error('ERROR: MERCHANT_PROFILE environment variable not set');
    process.exit(1);
  }
  
  try {
    return JSON.parse(profileJson);
  } catch (error) {
    console.error('ERROR: Failed to parse MERCHANT_PROFILE JSON:', error.message);
    process.exit(1);
  }
}

// Log structured insight
function logInsight(data) {
  console.log(JSON.stringify(data, null, 2));
}

// Simulate network delay based on profile
async function simulateNetworkDelay(networkProfile) {
  const latency = NETWORK_LATENCY[networkProfile] || 500;
  // Add some randomness (±20%)
  const actualLatency = latency + (Math.random() * 0.4 - 0.2) * latency;
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
  console.log(`🎯 Issue: ${merchant.issueType} | 🔄 Max retries: ${merchant.retryThreshold}\n`);
  
  let attempts = 0;
  let success = false;
  let totalLatency = 0;
  const maxAttempts = merchant.retryThreshold;
  const startTime = Date.now();
  
  // Simulate initial delay (agent thinking/loading)
  // Lower digital literacy = longer initial delay
  const initialDelay = merchant.digitalLiteracy === 'basic' ? 2000 :
                      merchant.digitalLiteracy === 'intermediate' ? 1500 : 1000;
  await sleep(initialDelay + Math.random() * 1000);
  
  // Attempt loop
  while (attempts < maxAttempts && !success) {
    attempts++;
    
    // Simulate network latency
    const latency = await simulateNetworkDelay(merchant.networkProfile);
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
    
    const successProbability = 0.35 + literacyBonus + incomeBonus + deviceBonus + (merchant.patienceScore * 0.2);
    
    success = Math.random() < successProbability;
    
    // Log attempt insight
    logInsight({
      merchantId: merchant.merchantId,
      event: `${merchant.issueType.toUpperCase()}_ATTEMPT`,
      attempt: attempts,
      latency: latency,
      result: success ? 'success' : 'retry',
      timestamp: new Date().toISOString()
    });
    
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
  
  // Log final summary with enhanced metrics
  console.log('\n' + '─'.repeat(50));
  logInsight({
    merchantId: merchant.merchantId,
    summary: {
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
    }
  });
  console.log('─'.repeat(50) + '\n');
  
  // Exit with appropriate code
  process.exit(success ? 0 : 1);
}

// Run the simulation
runAgentSimulation().catch(error => {
  console.error('Agent error:', error);
  process.exit(1);
});

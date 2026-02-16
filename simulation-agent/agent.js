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

// Calculate experience score based on attempts and success
function calculateExperienceScore(attempts, success, patienceScore) {
  if (!success) return 0;
  
  // Base score decreases with more attempts
  const attemptPenalty = Math.max(0, 1 - (attempts - 1) * 0.2);
  
  // Factor in patience score
  const score = attemptPenalty * patienceScore;
  
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
  const maxAttempts = merchant.retryThreshold;
  
  // Simulate initial delay (agent thinking/loading)
  await sleep(1000 + Math.random() * 2000);
  
  // Attempt loop
  while (attempts < maxAttempts && !success) {
    attempts++;
    
    // Simulate network latency
    const latency = await simulateNetworkDelay(merchant.networkProfile);
    
    // Determine if this attempt succeeds
    // Success probability increases with digital literacy and patience
    const literacyBonus = merchant.digitalLiteracy === 'advanced' ? 0.3 : 
                         merchant.digitalLiteracy === 'intermediate' ? 0.15 : 0;
    const successProbability = 0.4 + literacyBonus + (merchant.patienceScore * 0.3);
    
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
  
  // Calculate final experience score
  const experienceScore = calculateExperienceScore(attempts, success, merchant.patienceScore);
  
  // Log final summary
  console.log('\n' + '─'.repeat(50));
  logInsight({
    merchantId: merchant.merchantId,
    summary: {
      totalAttempts: attempts,
      success: success,
      experienceScore: experienceScore,
      issueType: merchant.issueType,
      networkProfile: merchant.networkProfile,
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

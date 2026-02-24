// AI Agent - Web Portal Onboarding Simulation
// Simulates merchant behavior interacting with Lipa Na M-Pesa onboarding portal

const { chromium } = require('playwright');

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
    return JSON.parse(profileJson);
  } catch (error) {
    console.error('ERROR: Failed to parse MERCHANT_PROFILE JSON:', error.message);
    process.exit(1);
  }
}

// Simulate network delay based on profile
async function simulateNetworkDelay(networkProfile) {
  const baseLatency = NETWORK_LATENCY[networkProfile] || 500;
  
  // Add some randomness (±20%)
  const actualLatency = baseLatency + (Math.random() * 0.4 - 0.2) * baseLatency;
  await sleep(Math.round(actualLatency));
  return Math.round(actualLatency);
}

// Simulate user delay based on digital literacy
async function simulateUserDelay(digitalLiteracy, action) {
  const delays = {
    'reading': { basic: 3000, intermediate: 2000, advanced: 1000 },
    'form_interaction': { basic: 2000, intermediate: 1000, advanced: 500 },
    'document_upload': { basic: 5000, intermediate: 3000, advanced: 1500 },
    'submission': { basic: 2000, intermediate: 1000, advanced: 500 }
  };
  
  const actionDelays = delays[action] || delays['form_interaction'];
  const baseDelay = actionDelays[digitalLiteracy] || actionDelays['intermediate'];
  const actualDelay = baseDelay + Math.random() * 1000;
  
  await sleep(Math.round(actualDelay));
}

// Get typing delay based on digital literacy
function getTypingDelay(digitalLiteracy) {
  const delays = {
    'basic': 3000,
    'intermediate': 1500,
    'advanced': 800
  };
  return delays[digitalLiteracy] || 1500;
}

// Calculate success probability
function calculateSuccessProbability(merchant) {
  let probability = 0.7; // Base 70% success rate
  
  // Digital literacy bonus
  if (merchant.digitalLiteracy === 'advanced') probability += 0.2;
  else if (merchant.digitalLiteracy === 'intermediate') probability += 0.1;
  
  // Network quality impact
  if (merchant.networkProfile === '2G_EDGE') probability -= 0.2;
  else if (merchant.networkProfile === '3G_POOR') probability -= 0.1;
  
  // Device type impact
  if (merchant.deviceType === 'ios') probability += 0.05;
  
  // Patience score impact
  probability += merchant.patienceScore * 0.1;
  
  return Math.max(0.3, Math.min(0.95, probability));
}

// Main agent simulation logic
async function runAgentSimulation() {
  const merchant = getMerchantProfile();
  const portalUrl = merchant.portalUrl || 'http://host.docker.internal:3000/mock-portal/index.html';
  
  console.log(`\n🤖 Agent started for merchant: ${merchant.merchantId}`);
  console.log(`📱 Device: ${merchant.deviceType} | 📡 Network: ${merchant.networkProfile}`);
  console.log(`� Portal URL: ${portalUrl}`);
  console.log(`💼 Digital Literacy: ${merchant.digitalLiteracy} | 💰 Income: ${merchant.incomeLevel}`);
  console.log(`� Patience Score: ${merchant.patienceScore} | 🔄 Max Retries: ${merchant.retryThreshold}`);
  console.log('');
  
  const startTime = Date.now();
  let browser = null;
  let page = null;
  let currentStep = 0;
  const maxSteps = 5;
  const insights = [];
  
  try {
    // Initialize browser
    console.log('🔧 Initializing browser...');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    page = await browser.newPage();
    
    // Set viewport based on device type
    const viewports = {
      'ios': { width: 375, height: 812 },
      'android_mid': { width: 360, height: 740 },
      'android_low_end': { width: 320, height: 568 },
      'feature_phone': { width: 240, height: 320 }
    };
    
    const viewport = viewports[merchant.deviceType] || viewports['android_mid'];
    await page.setViewportSize(viewport);
    
    console.log(`✅ Browser initialized (${merchant.deviceType} viewport: ${viewport.width}x${viewport.height})`);
    console.log('');
    
    // Step 1: Navigate to portal
    currentStep++;
    console.log(`📍 Step ${currentStep}/${maxSteps}: Navigating to portal`);
    console.log(`   URL: ${portalUrl}`);
    
    const navStart = Date.now();
    await simulateNetworkDelay(merchant.networkProfile);
    
    const response = await page.goto(portalUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    const loadTime = Date.now() - navStart;
    
    if (!response || !response.ok()) {
      throw new Error(`Portal returned status ${response?.status()}`);
    }
    
    insights.push({
      merchantId: merchant.merchantId,
      event: 'PAGE_LOAD',
      step: 'portal_landing',
      url: portalUrl,
      loadTimeMs: loadTime,
      networkProfile: merchant.networkProfile,
      statusCode: response.status(),
      success: true
    });
    
    await sendEventToInsightService({
      merchantId: merchant.merchantId,
      scenarioId: merchant.scenarioId || 'UNKNOWN',
      event: 'PAGE_LOAD',
      step: 'portal_landing',
      url: portalUrl,
      loadTimeMs: loadTime,
      networkProfile: merchant.networkProfile,
      timestamp: Date.now()
    });
    
    console.log(`   ✓ Portal loaded successfully (${loadTime}ms) - Status: ${response.status()}`);
    
    // Simulate user reading/thinking time
    await simulateUserDelay(merchant.digitalLiteracy, 'reading');
    
    // Step 2: Fill business information
    currentStep++;
    console.log(`\n📍 Step ${currentStep}/${maxSteps}: Filling business information`);
    console.log(`   Literacy level: ${merchant.digitalLiteracy} - adjusting interaction speed`);
    
    await simulateUserDelay(merchant.digitalLiteracy, 'form_interaction');
    
    const businessFields = [
      { name: 'businessName', value: merchant.businessName || 'Test Business' },
      { name: 'businessType', value: merchant.businessType || 'retail' },
      { name: 'location', value: merchant.location || 'Nairobi' }
    ];
    
    for (const field of businessFields) {
      const fillStart = Date.now();
      const typingDelay = getTypingDelay(merchant.digitalLiteracy);
      
      console.log(`   ✏️  Filling field: ${field.name} (${typingDelay}ms typing delay)`);
      await sleep(typingDelay);
      
      // Simulate validation error (10% chance)
      if (Math.random() < 0.1) {
        console.log(`   ⚠️  Validation error on ${field.name} - retrying`);
        
        insights.push({
          merchantId: merchant.merchantId,
          event: 'VALIDATION_ERROR',
          field: field.name,
          retryNeeded: true
        });
        
        await sendEventToInsightService({
          merchantId: merchant.merchantId,
          scenarioId: merchant.scenarioId || 'UNKNOWN',
          event: 'VALIDATION_ERROR',
          field: field.name,
          timestamp: Date.now()
        });
        
        await sleep(1000);
      }
      
      const fillTime = Date.now() - fillStart;
      
      insights.push({
        merchantId: merchant.merchantId,
        event: 'FIELD_FILLED',
        field: field.name,
        fillTimeMs: fillTime,
        digitalLiteracy: merchant.digitalLiteracy
      });
      
      console.log(`   ✓ Field ${field.name} completed (${fillTime}ms)`);
    }
    
    console.log(`   ✓ Business info filled successfully`);
    
    // Step 3: Fill contact information
    currentStep++;
    console.log(`\n📍 Step ${currentStep}/${maxSteps}: Filling contact information`);
    console.log(`   Network: ${merchant.networkProfile} - simulating network conditions`);
    
    await simulateUserDelay(merchant.digitalLiteracy, 'form_interaction');
    
    const contactFields = [
      { name: 'phone', value: merchant.phone || '+254700000000' },
      { name: 'email', value: merchant.email || 'test@example.com' }
    ];
    
    for (const field of contactFields) {
      const fillStart = Date.now();
      const typingDelay = getTypingDelay(merchant.digitalLiteracy);
      
      console.log(`   ✏️  Filling field: ${field.name} (${typingDelay}ms typing delay)`);
      await sleep(typingDelay);
      
      const fillTime = Date.now() - fillStart;
      
      insights.push({
        merchantId: merchant.merchantId,
        event: 'FIELD_FILLED',
        field: field.name,
        fillTimeMs: fillTime,
        digitalLiteracy: merchant.digitalLiteracy
      });
      
      console.log(`   ✓ Field ${field.name} completed (${fillTime}ms)`);
    }
    
    console.log(`   ✓ Contact info filled successfully`);
    
    // Step 4: Handle documentation
    currentStep++;
    console.log(`\n📍 Step ${currentStep}/${maxSteps}: Handling documentation`);
    console.log(`   User experience level: ${merchant.digitalLiteracy}`);
    
    await simulateUserDelay(merchant.digitalLiteracy, 'document_upload');
    
    // Simulate document upload challenges for basic users
    if (merchant.digitalLiteracy === 'basic') {
      if (Math.random() < 0.3) {
        console.log(`   😕 User experiencing confusion with document upload (basic literacy)`);
        
        insights.push({
          merchantId: merchant.merchantId,
          event: 'DOCUMENT_UPLOAD_CONFUSION',
          step: 'documentation',
          digitalLiteracy: merchant.digitalLiteracy,
          delayAdded: 2000
        });
        
        await sendEventToInsightService({
          merchantId: merchant.merchantId,
          scenarioId: merchant.scenarioId || 'UNKNOWN',
          event: 'DOCUMENT_UPLOAD_CONFUSION',
          digitalLiteracy: merchant.digitalLiteracy,
          timestamp: Date.now()
        });
        
        await sleep(2000);
      }
    }
    
    console.log(`   ✓ Documentation handled successfully`);
    
    // Step 5: Submit application
    currentStep++;
    console.log(`\n📍 Step ${currentStep}/${maxSteps}: Submitting application`);
    console.log(`   Final validation with network: ${merchant.networkProfile}`);
    
    await simulateUserDelay(merchant.digitalLiteracy, 'submission');
    await simulateNetworkDelay(merchant.networkProfile);
    
    const successProbability = calculateSuccessProbability(merchant);
    console.log(`   Success probability: ${(successProbability * 100).toFixed(1)}%`);
    
    const success = Math.random() < successProbability;
    
    if (!success) {
      console.error(`   ✗ Submission failed - validation error`);
      throw new Error('Submission failed - validation error');
    }
    
    console.log(`   ✓ Application submitted successfully`);
    
    // Calculate final metrics
    const completionTimeMs = Date.now() - startTime;
    
    const summary = {
      merchantId: merchant.merchantId,
      scenarioId: merchant.scenarioId || 'UNKNOWN',
      portalUrl: portalUrl,
      success: true,
      completionTimeMs: completionTimeMs,
      stepsCompleted: currentStep,
      totalSteps: maxSteps,
      totalInsights: insights.length,
      digitalLiteracy: merchant.digitalLiteracy,
      networkProfile: merchant.networkProfile,
      deviceType: merchant.deviceType,
      incomeLevel: merchant.incomeLevel,
      patienceScore: merchant.patienceScore,
      outcome: '✅ COMPLETED'
    };
    
    // Send all insights to Insight Service
    console.log(`\n📤 Sending ${insights.length} insights to Insight Service...`);
    for (const insight of insights) {
      await sendEventToInsightService({
        ...insight,
        scenarioId: merchant.scenarioId || 'UNKNOWN',
        merchantId: merchant.merchantId,
        timestamp: insight.timestamp || Date.now()
      });
    }
    
    // Log summary
    console.log('\n' + '─'.repeat(60));
    console.log(JSON.stringify({ summary }, null, 2));
    console.log('─'.repeat(60) + '\n');
    
    // Send summary to Insight Service
    await sendEventToInsightService({
      merchantId: merchant.merchantId,
      scenarioId: merchant.scenarioId || 'UNKNOWN',
      event: 'ONBOARDING_SUMMARY',
      summary: summary,
      timestamp: Date.now()
    });
    
    // Cleanup
    await browser.close();
    console.log('🧹 Browser closed');
    
    // Exit with success
    process.exit(0);
    
  } catch (error) {
    const failureTime = Date.now() - startTime;
    
    console.error(`\n❌ Onboarding failed at step ${currentStep}/${maxSteps}: ${error.message}`);
    
    const summary = {
      merchantId: merchant.merchantId,
      scenarioId: merchant.scenarioId || 'UNKNOWN',
      portalUrl: portalUrl,
      success: false,
      error: error.message,
      failedAtStep: currentStep,
      totalSteps: maxSteps,
      timeBeforeFailure: failureTime,
      totalInsights: insights.length,
      digitalLiteracy: merchant.digitalLiteracy,
      networkProfile: merchant.networkProfile,
      deviceType: merchant.deviceType,
      outcome: '❌ FAILED'
    };
    
    // Send failure insights
    insights.push({
      merchantId: merchant.merchantId,
      event: 'ONBOARDING_FAILED',
      success: false,
      error: error.message,
      failedAtStep: currentStep,
      totalSteps: maxSteps,
      timeBeforeFailure: failureTime
    });
    
    for (const insight of insights) {
      await sendEventToInsightService({
        ...insight,
        scenarioId: merchant.scenarioId || 'UNKNOWN',
        merchantId: merchant.merchantId,
        timestamp: insight.timestamp || Date.now()
      });
    }
    
    // Log failure summary
    console.log('\n' + '─'.repeat(60));
    console.log(JSON.stringify({ summary }, null, 2));
    console.log('─'.repeat(60) + '\n');
    
    // Send failure summary
    await sendEventToInsightService({
      merchantId: merchant.merchantId,
      scenarioId: merchant.scenarioId || 'UNKNOWN',
      event: 'ONBOARDING_SUMMARY',
      summary: summary,
      timestamp: Date.now()
    });
    
    // Cleanup
    if (browser) {
      await browser.close();
      console.log('🧹 Browser closed');
    }
    
    // Exit with failure
    process.exit(1);
  }
}

// Run the simulation
runAgentSimulation().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

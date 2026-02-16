const express = require('express');
const app = express();
const PORT = 3001;

// Predefined enums for merchant profile generation
const INCOME_LEVELS = ['low', 'medium', 'high'];
const DIGITAL_LITERACY = ['basic', 'intermediate', 'advanced'];
const DEVICE_TYPES = ['android_low_end', 'android_mid', 'ios', 'feature_phone'];
const NETWORK_PROFILES = ['4G_GOOD', '3G_POOR', '2G_EDGE', '4G_UNSTABLE'];
const ISSUE_TYPES = ['pin_reset', 'balance_check', 'transaction_failure', 'kyc_update'];

// Generate random value from array
const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Generate random float between min and max
const randomFloat = (min, max) => Math.random() * (max - min) + min;

// Generate random integer between min and max (inclusive)
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Generate a single synthetic merchant profile
function generateMerchant(index) {
  return {
    merchantId: `SYNTH_${String(index).padStart(3, '0')}`,
    incomeLevel: randomFrom(INCOME_LEVELS),
    digitalLiteracy: randomFrom(DIGITAL_LITERACY),
    deviceType: randomFrom(DEVICE_TYPES),
    networkProfile: randomFrom(NETWORK_PROFILES),
    patienceScore: parseFloat(randomFloat(0.1, 0.9).toFixed(2)),
    retryThreshold: randomInt(1, 4),
    issueType: randomFrom(ISSUE_TYPES)
  };
}

// Endpoint to generate synthetic merchants
app.get('/generate-merchants', (req, res) => {
  const count = parseInt(req.query.count) || 5;
  const merchants = [];
  
  for (let i = 1; i <= count; i++) {
    merchants.push(generateMerchant(i));
  }
  
  console.log(`Generated ${merchants.length} synthetic merchants`);
  res.json(merchants);
});

app.listen(PORT, () => {
  console.log(`Merchant Generator running on http://localhost:${PORT}`);
  console.log(`Try: http://localhost:${PORT}/generate-merchants`);
});

const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Valid enum values for validation
const VALID_VALUES = {
  incomeLevel: ['low', 'medium', 'high'],
  digitalLiteracy: ['basic', 'intermediate', 'advanced'],
  deviceType: ['android_low_end', 'android_mid', 'ios', 'feature_phone'],
  networkProfile: ['4G_GOOD', '4G_UNSTABLE', '3G_POOR', '2G_EDGE'],
  issueType: ['pin_reset', 'balance_check', 'transaction_failure', 'kyc_update', 'statement_request']
};

// Validate a single merchant profile
function validateMerchant(merchant, rowNumber) {
  const errors = [];
  
  // Required fields
  if (!merchant.merchant_id) {
    errors.push(`Row ${rowNumber}: Missing merchant_id`);
  }
  
  // Validate enum fields
  if (merchant.income_level && !VALID_VALUES.incomeLevel.includes(merchant.income_level)) {
    errors.push(`Row ${rowNumber}: Invalid income_level "${merchant.income_level}"`);
  }
  
  if (merchant.digital_literacy && !VALID_VALUES.digitalLiteracy.includes(merchant.digital_literacy)) {
    errors.push(`Row ${rowNumber}: Invalid digital_literacy "${merchant.digital_literacy}"`);
  }
  
  if (merchant.device_type && !VALID_VALUES.deviceType.includes(merchant.device_type)) {
    errors.push(`Row ${rowNumber}: Invalid device_type "${merchant.device_type}"`);
  }
  
  if (merchant.network_profile && !VALID_VALUES.networkProfile.includes(merchant.network_profile)) {
    errors.push(`Row ${rowNumber}: Invalid network_profile "${merchant.network_profile}"`);
  }
  
  if (merchant.issue_type && !VALID_VALUES.issueType.includes(merchant.issue_type)) {
    errors.push(`Row ${rowNumber}: Invalid issue_type "${merchant.issue_type}"`);
  }
  
  // Validate numeric fields
  const patienceScore = parseFloat(merchant.patience_score);
  if (isNaN(patienceScore) || patienceScore < 0 || patienceScore > 1) {
    errors.push(`Row ${rowNumber}: patience_score must be between 0 and 1`);
  }
  
  const retryThreshold = parseInt(merchant.retry_threshold);
  if (isNaN(retryThreshold) || retryThreshold < 1 || retryThreshold > 10) {
    errors.push(`Row ${rowNumber}: retry_threshold must be between 1 and 10`);
  }
  
  return errors;
}

// Transform CSV row to merchant profile object
function transformToMerchantProfile(row) {
  return {
    merchantId: row.merchant_id,
    incomeLevel: row.income_level,
    digitalLiteracy: row.digital_literacy,
    deviceType: row.device_type,
    networkProfile: row.network_profile,
    patienceScore: parseFloat(row.patience_score),
    retryThreshold: parseInt(row.retry_threshold),
    issueType: row.issue_type
  };
}

// Parse CSV file and return merchant profiles
async function parseCsvFile(filePath) {
  return new Promise((resolve, reject) => {
    const merchants = [];
    const errors = [];
    let rowNumber = 1; // Start at 1 (header is row 0)
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return reject(new Error(`CSV file not found: ${filePath}`));
    }
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        rowNumber++;
        
        // Validate the row
        const validationErrors = validateMerchant(row, rowNumber);
        if (validationErrors.length > 0) {
          errors.push(...validationErrors);
          return;
        }
        
        // Transform and add to merchants array
        const merchant = transformToMerchantProfile(row);
        merchants.push(merchant);
      })
      .on('end', () => {
        if (errors.length > 0) {
          console.error('Validation errors found:');
          errors.forEach(err => console.error(`  - ${err}`));
          return reject(new Error(`CSV validation failed with ${errors.length} error(s)`));
        }
        
        console.log(`✅ Successfully parsed ${merchants.length} merchants from CSV`);
        resolve(merchants);
      })
      .on('error', (error) => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      });
  });
}

// Get default CSV file path
function getDefaultCsvPath() {
  return path.join(__dirname, '..', 'data', 'merchants.csv');
}

module.exports = {
  parseCsvFile,
  getDefaultCsvPath,
  validateMerchant,
  transformToMerchantProfile
};

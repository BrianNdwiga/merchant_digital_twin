const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { parseCsvFile, getDefaultCsvPath } = require('./csvProcessor');

const app = express();
const PORT = 3001;

// Configure multer for CSV file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `uploaded_${Date.now()}_${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() !== '.csv') {
      return cb(new Error('Only CSV files are allowed'));
    }
    cb(null, true);
  }
});

// In-memory cache of merchants (loaded from CSV)
let cachedMerchants = null;

// Load merchants from default CSV file on startup
async function loadDefaultMerchants() {
  try {
    const csvPath = getDefaultCsvPath();
    console.log(`📂 Loading merchants from: ${csvPath}`);
    cachedMerchants = await parseCsvFile(csvPath);
    console.log(`✅ Loaded ${cachedMerchants.length} merchants into cache`);
  } catch (error) {
    console.error('⚠️  Failed to load default CSV:', error.message);
    console.log('💡 Server will start, but /generate-merchants-from-csv will require CSV upload');
  }
}

// Endpoint: Generate merchants from default CSV
app.get('/generate-merchants-from-csv', async (req, res) => {
  try {
    // If no cached merchants, try to load from default CSV
    if (!cachedMerchants) {
      const csvPath = getDefaultCsvPath();
      cachedMerchants = await parseCsvFile(csvPath);
    }
    
    console.log(`📤 Returning ${cachedMerchants.length} merchants from CSV`);
    res.json(cachedMerchants);
  } catch (error) {
    console.error('❌ Error generating merchants:', error.message);
    res.status(500).json({
      error: 'Failed to generate merchants from CSV',
      message: error.message,
      hint: 'Upload a CSV file using POST /generate-merchants-from-csv'
    });
  }
});

// Endpoint: Upload CSV and generate merchants
app.post('/generate-merchants-from-csv', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No CSV file uploaded',
        hint: 'Send a CSV file with field name "csvFile"'
      });
    }
    
    console.log(`📥 Processing uploaded CSV: ${req.file.originalname}`);
    
    // Parse the uploaded CSV
    const merchants = await parseCsvFile(req.file.path);
    
    // Update cache
    cachedMerchants = merchants;
    
    console.log(`✅ Successfully processed ${merchants.length} merchants`);
    
    res.json({
      success: true,
      merchantCount: merchants.length,
      merchants: merchants
    });
  } catch (error) {
    console.error('❌ Error processing CSV:', error.message);
    res.status(400).json({
      error: 'Failed to process CSV file',
      message: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    merchantsLoaded: cachedMerchants ? cachedMerchants.length : 0
  });
});

// Start server and load default merchants
app.listen(PORT, async () => {
  console.log('🚀 Merchant Generator V2 - CSV-Driven');
  console.log('=' .repeat(50));
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('\nAvailable endpoints:');
  console.log(`  GET  /generate-merchants-from-csv`);
  console.log(`  POST /generate-merchants-from-csv (upload CSV)`);
  console.log(`  GET  /health`);
  console.log('=' .repeat(50));
  
  // Load default merchants
  await loadDefaultMerchants();
});

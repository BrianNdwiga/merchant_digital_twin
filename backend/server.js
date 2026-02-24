const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Import modules
const { parseCsvFile, getDefaultCsvPath } = require('./modules/csvProcessor');
const { 
  storeEvent, 
  getSummaryInsights, 
  getInsightsByNetwork, 
  getInsightsByLiteracy, 
  getInsightsByScenario,
  clearEvents 
} = require('./modules/metrics');
const { compareScenarios, getAvailableScenarios } = require('./modules/comparison');
const { runAllScenarios } = require('./modules/scenarioRunner');
const { getAvailableChannels, runChannelSimulation } = require('./modules/channelSimulation');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve mock portal HTML files
const mockPortalDir = path.join(__dirname, '..', 'mock-portal');
app.use('/mock-portal', express.static(mockPortalDir));

// Configure multer for CSV uploads
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

// In-memory cache
let cachedMerchants = null;

// Load merchants on startup
async function loadDefaultMerchants() {
  try {
    const csvPath = getDefaultCsvPath();
    console.log(`📂 Loading merchants from: ${csvPath}`);
    cachedMerchants = await parseCsvFile(csvPath);
    console.log(`✅ Loaded ${cachedMerchants.length} merchants into cache`);
  } catch (error) {
    console.error('⚠️  Failed to load default CSV:', error.message);
  }
}

// ============================================================================
// HEALTH & STATUS ENDPOINTS
// ============================================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'unified-backend',
    merchants: cachedMerchants ? cachedMerchants.length : 0,
    eventsStored: require('./modules/metrics').getEventCount()
  });
});

// ============================================================================
// MERCHANT ENDPOINTS
// ============================================================================

app.get('/merchants/available-csvs', (req, res) => {
  try {
    const dataDir = path.join(__dirname, '..', 'data');
    
    if (!fs.existsSync(dataDir)) {
      return res.json({ csvFiles: {} });
    }
    
    const files = fs.readdirSync(dataDir);
    const csvFiles = {};
    
    // Check for specific CSV files
    const fileMapping = {
      merchants: ['merchant_onboarding_data.csv', 'merchants.csv'],
      network: ['network_metrics.csv'],
      bio: ['merchant_bio_profile.csv', 'merchant_profile.csv']
    };
    
    for (const [type, possibleNames] of Object.entries(fileMapping)) {
      for (const fileName of possibleNames) {
        if (files.includes(fileName)) {
          const filePath = path.join(dataDir, fileName);
          const stats = fs.statSync(filePath);
          csvFiles[type] = {
            fileName: fileName,
            size: stats.size,
            modified: stats.mtime
          };
          break;
        }
      }
    }
    
    res.json({ csvFiles });
  } catch (error) {
    console.error('Error checking available CSVs:', error);
    res.status(500).json({ error: 'Failed to check available CSV files' });
  }
});

app.post('/merchants/load-default', async (req, res) => {
  try {
    const { fileName } = req.body;
    
    if (!fileName) {
      return res.status(400).json({
        error: 'No file name provided',
        message: 'Please specify a fileName to load'
      });
    }
    
    const dataDir = path.join(__dirname, '..', 'data');
    const filePath = path.join(dataDir, fileName);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: 'File not found',
        message: `CSV file not found: ${fileName}`
      });
    }
    
    console.log(`📥 Loading default CSV: ${fileName}`);
    
    try {
      const merchants = await parseCsvFile(filePath);
      cachedMerchants = merchants;
      
      console.log(`✅ Successfully loaded ${merchants.length} merchants from ${fileName}`);
      
      res.json({
        success: true,
        merchantCount: merchants.length,
        fileName: fileName
      });
    } catch (parseError) {
      console.error('❌ Error parsing CSV:', parseError.message);
      res.status(400).json({
        error: 'CSV Processing Failed',
        message: parseError.message,
        fileName: fileName
      });
    }
  } catch (error) {
    console.error('❌ Error loading default CSV:', error.message);
    res.status(500).json({
      error: 'Server Error',
      message: error.message || 'An unexpected error occurred'
    });
  }
});

app.get('/merchants', async (req, res) => {
  try {
    if (!cachedMerchants) {
      const csvPath = getDefaultCsvPath();
      cachedMerchants = await parseCsvFile(csvPath);
    }
    
    console.log(`📤 Returning ${cachedMerchants.length} merchants`);
    res.json(cachedMerchants);
  } catch (error) {
    console.error('❌ Error fetching merchants:', error.message);
    res.status(500).json({
      error: 'Failed to fetch merchants',
      message: error.message
    });
  }
});

app.post('/merchants/upload', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please select a CSV file to upload',
        hint: 'File must be in CSV format with required columns'
      });
    }
    
    console.log(`📥 Processing uploaded CSV: ${req.file.originalname}`);
    
    try {
      const merchants = await parseCsvFile(req.file.path);
      cachedMerchants = merchants;
      
      console.log(`✅ Successfully processed ${merchants.length} merchants`);
      
      res.json({
        success: true,
        merchantCount: merchants.length,
        merchants: merchants
      });
    } catch (parseError) {
      // Enhanced error messages for CSV parsing errors
      let errorMessage = parseError.message;
      let hint = '';
      
      if (errorMessage.includes('CSV validation failed')) {
        hint = 'Check that all required columns are present and values are valid';
      } else if (errorMessage.includes('CSV file not found')) {
        hint = 'File upload may have failed. Please try again';
      } else if (errorMessage.includes('CSV parsing error')) {
        hint = 'Make sure the file is a valid CSV format';
      }
      
      return res.status(400).json({
        error: 'CSV Processing Failed',
        message: errorMessage,
        hint: hint,
        fileName: req.file.originalname
      });
    }
  } catch (error) {
    console.error('❌ Error processing upload:', error.message);
    res.status(500).json({
      error: 'Server Error',
      message: error.message || 'An unexpected error occurred',
      hint: 'Please try again or contact support if the issue persists'
    });
  }
});

// ============================================================================
// INSIGHT ENDPOINTS
// ============================================================================

app.post('/simulation-event', (req, res) => {
  try {
    const event = req.body;
    
    const requiredFields = ['merchantId', 'event', 'timestamp'];
    const missingFields = requiredFields.filter(field => !event[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        missing: missingFields
      });
    }
    
    storeEvent(event);
    console.log(`📊 Event received: ${event.merchantId} - ${event.event}`);
    
    res.status(201).json({
      success: true,
      message: 'Event stored successfully'
    });
  } catch (error) {
    console.error('Error storing event:', error);
    res.status(500).json({
      error: 'Failed to store event',
      message: error.message
    });
  }
});

// Alias for /simulation-event
app.post('/events', (req, res) => {
  try {
    const event = req.body;
    
    const requiredFields = ['merchantId', 'event', 'timestamp'];
    const missingFields = requiredFields.filter(field => !event[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        missing: missingFields
      });
    }
    
    storeEvent(event);
    console.log(`📊 Event received: ${event.merchantId} - ${event.event}`);
    
    res.status(201).json({
      success: true,
      message: 'Event stored successfully'
    });
  } catch (error) {
    console.error('Error storing event:', error);
    res.status(500).json({
      error: 'Failed to store event',
      message: error.message
    });
  }
});

app.get('/insights/summary', (req, res) => {
  try {
    const scenarioId = req.query.scenarioId || null;
    const summary = getSummaryInsights(scenarioId);
    res.json(summary);
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({
      error: 'Failed to generate summary',
      message: error.message
    });
  }
});

app.get('/insights/scenario/:scenarioId', (req, res) => {
  try {
    const { scenarioId } = req.params;
    const summary = getSummaryInsights(scenarioId);
    res.json(summary);
  } catch (error) {
    console.error('Error generating scenario insights:', error);
    res.status(500).json({
      error: 'Failed to generate scenario insights',
      message: error.message
    });
  }
});

app.get('/insights/compare', (req, res) => {
  try {
    const { scenarioA, scenarioB } = req.query;
    
    if (!scenarioA || !scenarioB) {
      return res.status(400).json({
        error: 'Missing parameters',
        message: 'Both scenarioA and scenarioB query parameters are required'
      });
    }
    
    const comparison = compareScenarios(scenarioA, scenarioB);
    res.json(comparison);
  } catch (error) {
    console.error('Error comparing scenarios:', error);
    res.status(500).json({
      error: 'Failed to compare scenarios',
      message: error.message
    });
  }
});

app.get('/insights/scenarios', (req, res) => {
  try {
    const scenarios = getAvailableScenarios();
    res.json({
      scenarios,
      count: scenarios.length
    });
  } catch (error) {
    console.error('Error getting scenarios:', error);
    res.status(500).json({
      error: 'Failed to get scenarios',
      message: error.message
    });
  }
});

app.get('/insights/by-network', (req, res) => {
  try {
    const insights = getInsightsByNetwork();
    res.json(insights);
  } catch (error) {
    console.error('Error generating network insights:', error);
    res.status(500).json({
      error: 'Failed to generate network insights',
      message: error.message
    });
  }
});

app.get('/insights/by-literacy', (req, res) => {
  try {
    const insights = getInsightsByLiteracy();
    res.json(insights);
  } catch (error) {
    console.error('Error generating literacy insights:', error);
    res.status(500).json({
      error: 'Failed to generate literacy insights',
      message: error.message
    });
  }
});

app.get('/insights/by-scenario', (req, res) => {
  try {
    const insights = getInsightsByScenario();
    res.json(insights);
  } catch (error) {
    console.error('Error generating scenario insights:', error);
    res.status(500).json({
      error: 'Failed to generate scenario insights',
      message: error.message
    });
  }
});

app.delete('/insights/clear', (req, res) => {
  try {
    clearEvents();
    console.log('🗑️  All events cleared');
    res.json({
      success: true,
      message: 'All events cleared'
    });
  } catch (error) {
    console.error('Error clearing events:', error);
    res.status(500).json({
      error: 'Failed to clear events',
      message: error.message
    });
  }
});

app.get('/events/recent', (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const { getRecentEvents } = require('./modules/metrics');
    const events = getRecentEvents(limit);
    
    res.json({
      events: events,
      count: events.length
    });
  } catch (error) {
    console.error('Error fetching recent events:', error);
    res.status(500).json({
      error: 'Failed to fetch recent events',
      message: error.message,
      events: []
    });
  }
});

// ============================================================================
// CHANNEL SIMULATION ENDPOINTS
// ============================================================================

app.get('/channels', (req, res) => {
  try {
    const channels = getAvailableChannels();
    res.json({ channels });
  } catch (error) {
    console.error('Error getting channels:', error);
    res.status(500).json({
      error: 'Failed to get channels',
      message: error.message
    });
  }
});

app.post('/simulate/channel', async (req, res) => {
  try {
    const { merchantCount, portalUrl, simulationSpeed, networkVariability } = req.body;
    
    if (!cachedMerchants || cachedMerchants.length === 0) {
      return res.status(400).json({
        error: 'No merchants loaded',
        message: 'Please upload CSV first'
      });
    }
    
    // Select merchants for simulation
    const count = Math.min(merchantCount || 5, cachedMerchants.length);
    const selectedMerchants = cachedMerchants.slice(0, count);
    
    const config = {
      portalUrl: portalUrl || 'http://localhost:3000/mock-portal/index.html',
      simulationSpeed: simulationSpeed || 'normal',
      networkVariability: networkVariability !== false,
      scenarioId: `portal-sim-${Date.now()}`
    };
    
    console.log(`🚀 Starting web portal simulation with ${count} merchants`);
    console.log(`🔗 Portal URL: ${config.portalUrl}`);
    
    // Run simulation in background
    runChannelSimulation(selectedMerchants, config, (progress) => {
      console.log('Progress:', progress);
    })
      .then(results => {
        console.log('✅ Channel simulation completed:', results);
      })
      .catch(error => {
        console.error('❌ Channel simulation error:', error);
      });
    
    // Return immediately
    res.json({
      success: true,
      message: 'Web portal simulation started',
      status: 'running',
      config: config,
      merchantCount: count
    });
    
  } catch (error) {
    console.error('Error starting web portal simulation:', error);
    res.status(500).json({
      error: 'Failed to start web portal simulation',
      message: error.message
    });
  }
});

// ============================================================================
// SCENARIO RUNNER ENDPOINT
// ============================================================================

app.post('/run-scenarios', async (req, res) => {
  try {
    console.log('🎬 Starting multi-scenario simulation...');
    
    if (!cachedMerchants || cachedMerchants.length === 0) {
      return res.status(400).json({
        error: 'No merchants loaded',
        message: 'Please load merchants first'
      });
    }
    
    // Run simulations in background
    runAllScenarios(cachedMerchants, (progress) => {
      console.log(`Progress: ${progress.scenarioId} - ${progress.current}/${progress.total}`);
    })
      .then(results => {
        console.log('✅ All scenarios completed:', results);
      })
      .catch(error => {
        console.error('❌ Scenario simulation error:', error);
      });
    
    // Return immediately
    res.json({
      success: true,
      message: 'Scenario simulations started',
      status: 'running'
    });
  } catch (error) {
    console.error('Error starting scenarios:', error);
    res.status(500).json({
      error: 'Failed to start scenarios',
      message: error.message
    });
  }
});

app.get('/scenarios', (req, res) => {
  try {
    const scenariosDir = path.join(__dirname, '..', 'scenarios');
    
    if (!fs.existsSync(scenariosDir)) {
      return res.json({ scenarios: [] });
    }
    
    const files = fs.readdirSync(scenariosDir).filter(f => f.endsWith('.json'));
    
    const scenarios = files.map(file => {
      const filePath = path.join(scenariosDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return data;
    });
    
    res.json(scenarios);
  } catch (error) {
    console.error('Error listing scenarios:', error);
    res.status(500).json({
      error: 'Failed to list scenarios',
      message: error.message
    });
  }
});

app.get('/scenarios/list', (req, res) => {
  try {
    const scenariosDir = path.join(__dirname, '..', 'scenarios');
    const files = fs.readdirSync(scenariosDir).filter(f => f.endsWith('.json'));
    
    const scenarios = files.map(file => {
      const filePath = path.join(scenariosDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return data;
    });
    
    res.json({ scenarios });
  } catch (error) {
    console.error('Error listing scenarios:', error);
    res.status(500).json({
      error: 'Failed to list scenarios',
      message: error.message
    });
  }
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, async () => {
  console.log('🚀 Digital Twin Unified Backend');
  console.log('═'.repeat(60));
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('\nAvailable endpoints:');
  console.log('  GET    /health                   - Health check');
  console.log('  GET    /merchants                - Get merchant profiles');
  console.log('  POST   /merchants/upload         - Upload CSV');
  console.log('  POST   /simulation-event         - Receive agent events');
  console.log('  GET    /insights/summary         - Overall metrics');
  console.log('  GET    /insights/scenario/:id    - Scenario metrics');
  console.log('  GET    /insights/compare         - Compare scenarios');
  console.log('  GET    /insights/scenarios       - List scenarios');
  console.log('  GET    /insights/by-network      - Network breakdown');
  console.log('  GET    /insights/by-literacy     - Literacy breakdown');
  console.log('  DELETE /insights/clear           - Clear events');
  console.log('  POST   /run-scenarios            - Run simulations');
  console.log('  GET    /scenarios/list           - List scenario configs');
  console.log('═'.repeat(60));
  
  await loadDefaultMerchants();
});

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const http = require('http');
const WebSocket = require('ws');

// Load environment variables
require('dotenv').config();

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
const { runMerchantAppSimulation } = require('./modules/merchantAppSimulation');
const { getInsights, aggregateInsights, computeOperationalMetrics, detectFrictionPoints, analyzePersonaStruggles } = require('./modules/insightsEngine');
const { predictScenarioImpact } = require('./modules/aiScenarioEngine');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = process.env.PORT || 3000;

// WebSocket clients
const wsClients = new Set();

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('🔌 WebSocket client connected');
  wsClients.add(ws);

  ws.on('close', () => {
    console.log('🔌 WebSocket client disconnected');
    wsClients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    wsClients.delete(ws);
  });

  // Send initial insights (async)
  getInsights().then(insights => {
    ws.send(JSON.stringify({ type: 'insights', data: insights }));
  }).catch(error => {
    console.error('Error sending initial insights:', error);
  });
});

// Broadcast to all WebSocket clients
function broadcastToClients(message) {
  const data = JSON.stringify(message);
  wsClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(data);
      } catch (error) {
        console.error('Error broadcasting to client:', error);
      }
    }
  });
}

// Middleware
app.use(cors());
app.use(express.json());

// Serve mock portal HTML files
const mockPortalDir = process.env.NODE_ENV === 'production'
  ? '/mock-portal'
  : path.join(__dirname, '..', 'mock-portal');
app.use('/mock-portal', express.static(mockPortalDir));

// Configure multer for CSV uploads
const dataDir = process.env.NODE_ENV === 'production' ? '/data' : path.join(__dirname, '..', 'data');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    cb(null, dataDir);
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
    if (!fs.existsSync(dataDir)) return res.json({ csvFiles: {} });
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
// ============================================================================
// INSIGHT ENDPOINTS
// ============================================================================

// Debounced insights aggregation — fires once event stream goes quiet
let insightsDebounceTimer = null;
let expectedMerchantCount = 0;   // set when a run starts
let summaryCount = 0;             // tracks ONBOARDING_SUMMARY events received

function scheduleInsightsUpdate(force = false) {
  clearTimeout(insightsDebounceTimer);
  const delay = force ? 0 : 3000; // 3s quiet window, or immediate on force
  insightsDebounceTimer = setTimeout(() => {
    aggregateInsights().then(insights => {
      broadcastToClients({ type: 'insights', data: insights });
      if (force) console.log('🧠 Final AI analysis complete');
    }).catch(err => console.error('Error aggregating insights:', err));
  }, delay);
}

app.post('/simulation-event', (req, res) => {
  try {
    const event = req.body;
    
    const requiredFields = ['merchantId', 'event', 'timestamp'];
    const missingFields = requiredFields.filter(field => !event[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ error: 'Missing required fields', missing: missingFields });
    }
    
    storeEvent(event);
    console.log(`📊 Event received: ${event.merchantId} - ${event.event}`);
    
    // Always broadcast the raw event immediately for live UI updates
    broadcastToClients({ type: 'event', data: event });

    // Track summary completions
    if (event.event === 'ONBOARDING_SUMMARY') {
      summaryCount++;
      const allDone = expectedMerchantCount > 0 && summaryCount >= expectedMerchantCount;

      // Broadcast a lightweight operational update immediately so the AI Assistant
      // panel populates during the simulation without waiting for the full AI call
      broadcastToClients({
        type: 'insights',
        data: {
          operational: computeOperationalMetrics(),
          frictionPoints: detectFrictionPoints(),
          personaStruggles: analyzePersonaStruggles(),
          aiRecommendations: []
        }
      });

      if (allDone) {
        console.log(`✅ All ${summaryCount} merchants complete — running final AI analysis`);
        scheduleInsightsUpdate(true);
      } else {
        scheduleInsightsUpdate();
      }
    }
    
    res.status(201).json({ success: true, message: 'Event stored successfully' });
  } catch (error) {
    console.error('Error storing event:', error);
    res.status(500).json({ error: 'Failed to store event', message: error.message });
  }
});

// Alias for /simulation-event
app.post('/events', (req, res) => {
  try {
    const event = req.body;
    
    const requiredFields = ['merchantId', 'event', 'timestamp'];
    const missingFields = requiredFields.filter(field => !event[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({ error: 'Missing required fields', missing: missingFields });
    }
    
    storeEvent(event);
    console.log(`📊 Event received: ${event.merchantId} - ${event.event}`);
    
    broadcastToClients({ type: 'event', data: event });

    if (event.event === 'ONBOARDING_SUMMARY') {
      summaryCount++;
      const allDone = expectedMerchantCount > 0 && summaryCount >= expectedMerchantCount;
      scheduleInsightsUpdate(allDone);
    }
    
    res.status(201).json({ success: true, message: 'Event stored successfully' });
  } catch (error) {
    console.error('Error storing event:', error);
    res.status(500).json({ error: 'Failed to store event', message: error.message });
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

app.get('/insights/live', async (req, res) => {
  try {
    const insights = await getInsights();
    res.json(insights);
  } catch (error) {
    console.error('Error generating live insights:', error);
    res.status(500).json({
      error: 'Failed to generate live insights',
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

// All events grouped by merchant — used by BPMN flow visualization
app.get('/events/by-merchant', (req, res) => {
  try {
    const { events } = require('./modules/metrics');
    const byMerchant = {};
    events.forEach(ev => {
      const id = ev.merchantId;
      if (!id) return;
      if (!byMerchant[id]) byMerchant[id] = [];
      byMerchant[id].push(ev);
    });
    res.json({ merchants: byMerchant, count: Object.keys(byMerchant).length });
  } catch (error) {
    console.error('Error fetching merchant events:', error);
    res.status(500).json({ error: 'Failed to fetch merchant events', merchants: {} });
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
    const { merchantCount, channel, portalUrl, simulationSpeed, networkVariability } = req.body;
    
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
      channel: channel || 'WEB',
      portalUrl: portalUrl || 'http://localhost:3000/mock-portal/index.html',
      simulationSpeed: simulationSpeed || 'normal',
      networkVariability: networkVariability !== false,
      scenarioId: `portal-sim-${Date.now()}`
    };
    
    console.log(`🚀 Starting ${config.channel} simulation with ${count} merchants`);
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
      message: `${config.channel} simulation started`,
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

app.post('/scenario/predict', async (req, res) => {
  try {
    const { scenarioChange } = req.body;

    if (!scenarioChange || !scenarioChange.type) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'scenarioChange object with type is required'
      });
    }

    console.log(`🔮 Predicting impact for scenario: ${scenarioChange.type}`);

    const currentInsights = getSummaryInsights();
    const prediction = await predictScenarioImpact(scenarioChange, currentInsights);

    res.json({
      success: true,
      prediction
    });
  } catch (error) {
    console.error('Error predicting scenario:', error);
    res.status(500).json({
      error: 'Failed to predict scenario impact',
      message: error.message
    });
  }
});

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
    const scenariosDir = process.env.NODE_ENV === 'production' ? '/scenarios' : path.join(__dirname, '..', 'scenarios');
    
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

// ============================================================================
// ============================================================================
// FRONTEND-TRIGGERED SIMULATION ENDPOINTS
// ============================================================================

app.get('/api/scenarios', (req, res) => {
  try {
    const scenariosDir = process.env.NODE_ENV === 'production' ? '/scenarios' : path.join(__dirname, '..', 'scenarios');
    const files = fs.readdirSync(scenariosDir).filter(f => f.endsWith('.json'));
    const scenarios = files.map(file => JSON.parse(fs.readFileSync(path.join(scenariosDir, file), 'utf8')));
    res.json({ scenarios });
  } catch (error) {
    res.status(500).json({ error: 'Failed to list scenarios', message: error.message });
  }
});

app.post('/api/run-scenario', async (req, res) => {
  try {
    const { scenarioId = 'BASELINE', merchantCount, onboardingUrl } = req.body;
    const queueUrl = process.env.SIMULATION_QUEUE_URL || 'http://simulation-queue:3005';

    // Load scenario config
    const scenariosDir = process.env.NODE_ENV === 'production' ? '/scenarios' : path.join(__dirname, '..', 'scenarios');
    const scenarioFiles = fs.readdirSync(scenariosDir).filter(f => f.endsWith('.json'));
    const scenarios = scenarioFiles.map(f => JSON.parse(fs.readFileSync(path.join(scenariosDir, f), 'utf8')));
    const scenario = scenarios.find(s => s.scenarioId === scenarioId) || scenarios[0];

    if (!scenario) return res.status(404).json({ error: 'Scenario not found' });

    // Use cached merchants
    if (!cachedMerchants || cachedMerchants.length === 0) {
      return res.status(400).json({ error: 'No merchants loaded', message: 'Upload a CSV first' });
    }

    const limit = merchantCount && merchantCount > 0 ? merchantCount : cachedMerchants.length;
    // Always use the internal Docker URL — ignore any URL sent from the frontend
    const internalPortalUrl = process.env.ONBOARDING_URL || 'http://mock-portal/index.html';
    const merchants = cachedMerchants.slice(0, limit).map(m => ({
      ...m,
      scenarioId: scenario.scenarioId,
      onboardingUrl: internalPortalUrl,
      scenarioConfig: {
        latencyMultiplier: scenario.latencyMultiplier,
        retryBonus: scenario.retryBonus,
        successProbabilityBonus: scenario.successProbabilityBonus
      }
    }));

    // Clear previous events and reset counters
    clearEvents();
    summaryCount = 0;
    expectedMerchantCount = merchants.length;

    // Enqueue batch
    const runId = `run-${Date.now()}`;
    const response = await fetch(`${queueUrl}/enqueue-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ merchants, scenarioId: scenario.scenarioId, onboardingUrl: internalPortalUrl })
    });

    if (!response.ok) throw new Error(`Queue returned ${response.status}`);
    const result = await response.json();

    console.log(`🚀 Run ${runId}: enqueued ${result.enqueued} jobs for scenario ${scenario.scenarioId}`);
    res.json({ runId, enqueued: result.enqueued, scenarioId: scenario.scenarioId });

  } catch (error) {
    console.error('Error starting simulation run:', error.message);
    res.status(500).json({ error: 'Failed to start simulation', message: error.message });
  }
});

// ============================================================================
// QUEUE STATS PROXY (for frontend polling)
// ============================================================================

app.get('/queue/stats', async (req, res) => {
  const queueUrl = process.env.SIMULATION_QUEUE_URL || 'http://simulation-queue:3005';
  try {
    const response = await fetch(`${queueUrl}/stats`);
    const stats = await response.json();
    res.json(stats);
  } catch (err) {
    res.status(503).json({ error: 'Queue service unavailable', waiting: 0, active: 0, completed: 0, failed: 0 });
  }
});

app.get('/scenarios/list', (req, res) => {
  try {
    const scenariosDir = process.env.NODE_ENV === 'production' ? '/scenarios' : path.join(__dirname, '..', 'scenarios');
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
// MERCHANT APP SIMULATION ENDPOINTS (Appium)
// ============================================================================

let cachedMerchantAppProfiles = null;

// ── Appium step runner — streams each step as a WS event ─────────────────────
async function runAppiumSteps(merchant, broadcastFn, scenario = 'normal') {
  const PKG   = 'ke.safaricom.mpesa.business.uat';
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const SCENARIO_DELAYS = {
    normal: 0, slow_network: 3000, network_timeout: 2000, slow_device: 2500, wrong_pin: 0, low_balance: 0
  };
  const extraDelay = SCENARIO_DELAYS[scenario] || 0;

  function step(name, detail = '') {
    const event = { merchantId: merchant.merchantId, event: 'APP_STEP', step: name, detail, channel: 'APP', userType: 'merchant', timestamp: Date.now() };
    broadcastFn({ type: 'event', data: event });
    console.log(`📱 [${merchant.merchantId}] ${name}${detail ? ': ' + detail : ''}`);
  }

  let driver;
  try {
    const { remote } = require('webdriverio');
    step('CONNECTING', 'Connecting to Appium...');
    driver = await remote({
      hostname: process.env.APPIUM_HOST || 'localhost',
      port:     parseInt(process.env.APPIUM_PORT || '4723'),
      protocol: 'http',
      path:     '/',
      connectionRetryTimeout: 60000,
      connectionRetryCount:   1,
      capabilities: {
        platformName:            'Android',
        'appium:automationName': 'UiAutomator2',
        'appium:deviceName':     process.env.APPIUM_DEVICE_NAME || '1208937448002025',
        'appium:appPackage':     PKG,
        'appium:appActivity':    'com.mpesa.splash.SplashActivity',
        'appium:noReset':        true
      }
    });

    step('APP_RESTART', 'Restarting app to home screen');
    try { await driver.terminateApp(PKG); } catch { /* ignore */ }
    await sleep(1500);
    await driver.activateApp(PKG);
    await sleep(3000);

    // Handle login PIN screen if present
    const loginPin = process.env.MPESA_PIN || merchant.pin || '';
    try {
      const pinPad = await driver.$(`id:${PKG}:id/pinNumPad`);
      if (await pinPad.isDisplayed()) {
        step('LOGIN_PIN', 'App locked — entering login PIN');
        if (loginPin) {
          for (const digit of loginPin) {
            try { const cell = await driver.$(`id:${PKG}:id/cell${digit}`); await cell.click(); await sleep(400); } catch { /* ignore */ }
          }
          step('LOGIN_PIN_ENTERED', 'Login PIN entered — waiting for home screen');
        } else {
          step('LOGIN_PIN_SKIPPED', 'Login PIN screen detected but MPESA_PIN not set in .env');
        }
      }
    } catch { /* no login PIN screen */ }

    // Wait up to 20s for home screen
    step('WAITING_FOR_HOME', 'Waiting for home screen to load...');
    let homeLoaded = false;
    for (let i = 0; i < 20; i++) {
      await sleep(1000);
      try { const nav = await driver.$(`id:${PKG}:id/bottomNavigationTransactions`); if (await nav.isDisplayed()) { homeLoaded = true; break; } } catch { /* not yet */ }
    }
    if (!homeLoaded) throw new Error('Home screen did not load within 20s — check if app is logged in');
    step('HOME_LOADED', 'Home screen ready');

    // Dismiss popup
    try { const closeBtn = await driver.$(`id:${PKG}:id/closeButton`); if (await closeBtn.isDisplayed()) { await closeBtn.click(); await sleep(800); step('POPUP_DISMISSED', 'Dismissed overlay popup'); } } catch { /* no popup */ }

    step('NAV_TRANSACT', 'Tapping Transact tab');
    const transact = await driver.$(`id:${PKG}:id/bottomNavigationTransactions`);
    await transact.click(); await sleep(2000);

    step('TAP_REQUEST_PAYMENT', 'Tapping REQUEST PAYMENT menu item');
    const reqPayment = await driver.$('//android.widget.FrameLayout[@clickable="true"][.//android.widget.TextView[@text="REQUEST PAYMENT"]]');
    await reqPayment.click(); await sleep(2000);

    step('TAP_REQUEST_ROW', 'Tapping REQUEST PAYMENT row');
    const reqRow = await driver.$(`id:${PKG}:id/transactionLayoutContainer`);
    await reqRow.click(); await sleep(2000);

    step('TAP_FROM_CUSTOMER', 'Tapping REQUEST PAYMENT FROM CUSTOMER');
    const fromCustomer = await driver.$('//android.view.ViewGroup[@clickable="true"][.//android.widget.TextView[@text="REQUEST PAYMENT FROM CUSTOMER"]]');
    await fromCustomer.click(); await sleep(2000);

    const phone = merchant.phone || '254712510792';
    step('ENTER_PHONE', `Entering phone number ${phone}`);
    const phoneField = await driver.$(`id:${PKG}:id/inputEditText`);
    await phoneField.click(); await sleep(500);
    await phoneField.setValue(phone); await sleep(800);

    step('SUBMIT_PHONE', 'Tapping CONTINUE on phone screen');
    const phoneSubmit = await driver.$(`id:${PKG}:id/submitButton`);
    await phoneSubmit.click(); await sleep(3000);

    if (scenario === 'slow_network') {
      step('NETWORK_DELAY', `2G network — adding ${extraDelay}ms delay`);
      broadcastFn({ type: 'event', data: { merchantId: merchant.merchantId, event: 'NETWORK_DELAY', networkProfile: '2G_EDGE', latency: extraDelay, channel: 'APP', timestamp: Date.now() } });
      await sleep(extraDelay);
    }
    if (scenario === 'network_timeout') {
      step('NETWORK_TIMEOUT', 'Simulating connection drop — retrying after 4s');
      broadcastFn({ type: 'event', data: { merchantId: merchant.merchantId, event: 'TIMEOUT', step: 'after_phone', networkProfile: '3G_POOR', channel: 'APP', timestamp: Date.now() } });
      await sleep(4000);
      step('SCENARIO_INJECT', 'Connection restored — continuing');
    }
    if (scenario === 'slow_device') {
      step('SCENARIO_INJECT', `Low-end device — extra ${extraDelay}ms render time`);
      await sleep(extraDelay);
    }

    const baseAmount = merchant.installment_amount || 50;
    const amount = scenario === 'low_balance' ? String(baseAmount * 1000) : String(baseAmount);
    step('ENTER_AMOUNT', `Entering amount KES ${amount}${scenario === 'low_balance' ? ' (testing insufficient balance)' : ''}`);
    for (const digit of amount) {
      const cell = await driver.$(`id:${PKG}:id/cell${digit}`);
      await cell.click(); await sleep(300);
    }

    if (scenario === 'slow_network') {
      step('NETWORK_DELAY', '2G delay before CONTINUE');
      broadcastFn({ type: 'event', data: { merchantId: merchant.merchantId, event: 'NETWORK_DELAY', networkProfile: '2G_EDGE', latency: extraDelay, channel: 'APP', timestamp: Date.now() } });
      await sleep(extraDelay);
    }
    step('SUBMIT_AMOUNT', 'Tapping CONTINUE on amount screen');
    const amountContinue = await driver.$(`id:${PKG}:id/continueButton`);
    await amountContinue.click(); await sleep(3000);

    const description = merchant.description || 'request payment';
    step('ENTER_DESCRIPTION', `Entering description: "${description}"`);
    const descField = await driver.$(`id:${PKG}:id/inputEditText`);
    await descField.click(); await sleep(500);
    await descField.setValue(description); await sleep(800);

    step('SUBMIT_DESCRIPTION', 'Tapping CONTINUE on description screen');
    const descSubmit = await driver.$(`id:${PKG}:id/submitButton`);
    await descSubmit.click(); await sleep(3000);

    step('CONFIRMATION_SCREEN', 'On confirmation screen — looking for confirm button');
    let confirmed = false;
    for (const btnId of ['submitButton', 'continueButton', 'confirmButton', 'btnConfirm', 'actionButton']) {
      try {
        const btn = await driver.$(`id:${PKG}:id/${btnId}`);
        if (await btn.isDisplayed()) {
          const txt = await btn.getAttribute('text');
          step('TAP_CONFIRM', `Tapping ${btnId} ("${txt}")`);
          await btn.click(); await sleep(3000);
          confirmed = true; break;
        }
      } catch { /* try next */ }
    }
    if (!confirmed) {
      try {
        const anyBtn = await driver.$('//*[@clickable="true"][contains(@text,"CONFIRM") or contains(@text,"CONTINUE") or contains(@text,"PROCEED")]');
        const txt = await anyBtn.getAttribute('text');
        step('TAP_CONFIRM', `Tapping "${txt}" via XPath`);
        await anyBtn.click(); await sleep(3000);
      } catch { /* ignore */ }
    }

    const pin = process.env.MPESA_PIN || merchant.pin || '';
    if (pin) {
      if (scenario === 'wrong_pin') {
        step('ENTER_PIN', 'Entering wrong PIN (scenario test)');
        const wrongPin = pin.split('').map(d => String((parseInt(d) + 1) % 10)).join('');
        await sleep(1000);
        const pinNumPadW = await driver.$(`id:${PKG}:id/pinNumPad`);
        for (const digit of wrongPin) {
          try { const cell = await pinNumPadW.$(`android=new UiSelector().resourceId("${PKG}:id/cell${digit}")`); await cell.click(); await sleep(500); } catch { /* ignore */ }
        }
        broadcastFn({ type: 'event', data: { merchantId: merchant.merchantId, event: 'VALIDATION_ERROR', field: 'PIN', step: 'pin_entry', channel: 'APP', timestamp: Date.now() } });
        step('SCENARIO_INJECT', 'Wrong PIN entered — waiting for error, then retrying with correct PIN');
        await sleep(4000);
      }

      step('ENTER_PIN', `Entering ${pin.length}-digit PIN`);
      await sleep(1000);
      const pinNumPad = await driver.$(`id:${PKG}:id/pinNumPad`);
      for (const digit of pin) {
        try {
          const cell = await pinNumPad.$(`android=new UiSelector().resourceId("${PKG}:id/cell${digit}")`);
          await cell.click(); await sleep(500);
        } catch {
          const cellBounds = { '1': [120,1010], '2': [360,1010], '3': [600,1010], '4': [120,1147], '5': [360,1147], '6': [600,1147], '7': [120,1285], '8': [360,1285], '9': [600,1285], '0': [360,1423] };
          if (cellBounds[digit]) {
            await driver.action('pointer', { parameters: { pointerType: 'touch' } }).move({ x: cellBounds[digit][0], y: cellBounds[digit][1] }).down().pause(100).up().perform();
            await sleep(500);
          }
        }
      }
      step('PIN_ENTERED', 'PIN entered — awaiting confirmation');
      await sleep(5000);
    } else {
      step('PIN_SKIPPED', 'No PIN configured — set MPESA_PIN in .env to complete');
    }

    step('PAYMENT_COMPLETE', `Payment of KES ${amount} to ${phone} submitted`);
    broadcastFn({ type: 'event', data: { merchantId: merchant.merchantId, event: 'PAYMENT_CONFIRMED', amount: merchant.installment_amount, channel: 'APP', userType: 'merchant', timestamp: Date.now() } });

  } catch (err) {
    step('ERROR', err.message);
    broadcastFn({ type: 'event', data: { merchantId: merchant.merchantId, event: 'PAYMENT_FAILED', error: err.message, channel: 'APP', userType: 'merchant', timestamp: Date.now() } });
  } finally {
    if (driver) { try { await driver.deleteSession(); } catch { /* ignore */ } }
  }
}

app.post('/merchants/app/upload', upload.single('csvFile'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const merchants = await parseCsvFile(req.file.path);
    cachedMerchantAppProfiles = merchants;
    res.json({ success: true, merchantCount: merchants.length, merchants });
  } catch (error) {
    res.status(400).json({ error: 'CSV Processing Failed', message: error.message });
  }
});

app.get('/merchants/app', async (req, res) => {
  try {
    if (!cachedMerchantAppProfiles) {
      const csvPath = path.join(dataDir, 'merchant_onboarding_data.csv');
      cachedMerchantAppProfiles = await parseCsvFile(csvPath);
    }
    res.json(cachedMerchantAppProfiles);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch merchant app profiles', message: error.message });
  }
});

app.post('/simulate/merchant/app', async (req, res) => {
  try {
    const { merchantCount, simulationSpeed } = req.body;
    if (!cachedMerchantAppProfiles || cachedMerchantAppProfiles.length === 0) {
      try {
        const csvPath = path.join(dataDir, 'merchant_onboarding_data.csv');
        cachedMerchantAppProfiles = await parseCsvFile(csvPath);
      } catch {
        return res.status(400).json({ error: 'No merchant app profiles loaded', message: 'Please upload merchant CSV first' });
      }
    }
    const count    = Math.min(merchantCount || 5, cachedMerchantAppProfiles.length);
    const selected = cachedMerchantAppProfiles.slice(0, count);
    const config   = { simulationSpeed: simulationSpeed || 'normal', scenarioId: `merchant-app-sim-${Date.now()}` };
    console.log(`🚀 Starting merchant app simulation with ${count} merchants`);
    runMerchantAppSimulation(selected, config, (p) => console.log('Merchant app sim progress:', p))
      .then(r => console.log('✅ Merchant app simulation completed:', r))
      .catch(e => console.error('❌ Merchant app simulation error:', e));
    res.json({ success: true, message: 'Merchant app simulation started', merchantCount: count, config });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start merchant app simulation', message: error.message });
  }
});

// Appium-driven app simulation — streams each step as a WebSocket event
app.post('/simulate/merchant/appium', async (req, res) => {
  try {
    const { merchantId, scenario = 'normal' } = req.body;
    if (!cachedMerchantAppProfiles) {
      try {
        const csvPath = path.join(dataDir, 'merchant_onboarding_data.csv');
        cachedMerchantAppProfiles = await parseCsvFile(csvPath);
      } catch { /* no CSV — will use default profile below */ }
    }
    const merchant = merchantId
      ? cachedMerchantAppProfiles?.find(m => m.merchantId === merchantId) || cachedMerchantAppProfiles?.[0]
      : cachedMerchantAppProfiles?.[0];
    const effectiveMerchant = merchant || {
      merchantId: 'M001', phone: '254712510792', installment_amount: 50,
      description: 'request payment', device_type: 'android_mid', network_profile: '4G_GOOD',
      digital_literacy: 'intermediate', payment_method: 'mpesa', loan_balance: 4500,
      days_until_due: 2, missed_payments: 0
    };
    res.json({ success: true, message: 'Appium simulation started', merchantId: effectiveMerchant.merchantId, scenario });
    runAppiumSteps(effectiveMerchant, broadcastToClients, scenario).catch(err => {
      console.error('Appium simulation error:', err);
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start Appium simulation', message: error.message });
  }
});

// ============================================================================
// START SERVER
// ============================================================================

server.listen(PORT, async () => {
  console.log('🚀 Digital Twin Unified Backend');
  console.log('═'.repeat(60));
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
  console.log('\nAvailable endpoints:');
  console.log('  GET    /health                   - Health check');
  console.log('  GET    /merchants                - Get merchant profiles');
  console.log('  POST   /merchants/upload         - Upload CSV');
  console.log('  POST   /simulation-event         - Receive agent events');
  console.log('  GET    /insights/summary         - Overall metrics');
  console.log('  GET    /insights/live            - Live AI insights');
  console.log('  GET    /insights/scenario/:id    - Scenario metrics');
  console.log('  GET    /insights/compare         - Compare scenarios');
  console.log('  GET    /insights/scenarios       - List scenarios');
  console.log('  GET    /insights/by-network      - Network breakdown');
  console.log('  GET    /insights/by-literacy     - Literacy breakdown');
  console.log('  DELETE /insights/clear           - Clear events');
  console.log('  POST   /run-scenarios            - Run simulations');
  console.log('  GET    /scenarios/list           - List scenario configs');
  console.log('  WS     /                         - WebSocket connection');
  console.log('═'.repeat(60));
  
  await loadDefaultMerchants();
});

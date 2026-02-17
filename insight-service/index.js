const express = require('express');
const { 
  storeEvent, 
  getSummaryInsights, 
  getInsightsByNetwork, 
  getInsightsByLiteracy, 
  getInsightsByScenario,
  clearEvents 
} = require('./metrics');
const { compareScenarios, getAvailableScenarios } = require('./comparison');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'insight-service',
    eventsStored: require('./metrics').getEventCount()
  });
});

// Endpoint 1: Receive simulation events from agents
app.post('/simulation-event', (req, res) => {
  try {
    const event = req.body;
    
    // Validate required fields
    const requiredFields = ['merchantId', 'event', 'timestamp'];
    const missingFields = requiredFields.filter(field => !event[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        missing: missingFields
      });
    }
    
    // Store the event
    storeEvent(event);
    
    // Log for debugging
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

// Endpoint 2: Get summary insights (optionally filtered by scenario)
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

// Endpoint: Get insights for specific scenario
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

// Endpoint: Compare two scenarios
app.get('/insights/compare', (req, res) => {
  try {
    const { scenarioA, scenarioB } = req.query;
    
    if (!scenarioA || !scenarioB) {
      return res.status(400).json({
        error: 'Missing parameters',
        message: 'Both scenarioA and scenarioB query parameters are required',
        example: '/insights/compare?scenarioA=BASELINE&scenarioB=SIMPLIFIED_FLOW'
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

// Endpoint: Get list of available scenarios
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

// Endpoint 3: Get insights by network profile
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

// Endpoint 4: Get insights by digital literacy
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

// Endpoint 5: Get insights by scenario/issue type
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

// Endpoint 6: Clear all events (for testing)
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

// Start server
app.listen(PORT, () => {
  console.log('🧠 Insight Service - Digital Twin Intelligence Layer');
  console.log('=' .repeat(60));
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('\nAvailable endpoints:');
  console.log('  POST   /simulation-event         - Receive agent events');
  console.log('  GET    /insights/summary         - Overall metrics');
  console.log('  GET    /insights/scenario/:id    - Scenario-specific metrics');
  console.log('  GET    /insights/compare         - Compare two scenarios');
  console.log('  GET    /insights/scenarios       - List available scenarios');
  console.log('  GET    /insights/by-network      - Network breakdown');
  console.log('  GET    /insights/by-literacy     - Literacy breakdown');
  console.log('  GET    /insights/by-scenario     - Scenario breakdown');
  console.log('  DELETE /insights/clear           - Clear all events');
  console.log('  GET    /health                   - Health check');
  console.log('=' .repeat(60));
});

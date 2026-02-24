# Digital Twin Simulation System

A data-driven simulation platform that spawns AI agents in Docker containers to simulate merchant behavior across multiple scenarios, enabling product teams to compare alternative flows before production rollout.

## Current Version: 6.0 - Channel-Based Onboarding Simulation

### What's New in V6

- 🌐 **Channel Abstraction Layer** - Support for Web, USSD, and Mobile App channels
- 🤖 **Portal-Based Simulation** - Agents interact with real onboarding portals via browser automation
- 🎭 **Playwright Integration** - Headless browser automation for realistic user journeys
- 📊 **Enhanced Insights** - Page load times, validation errors, abandonment detection
- 🧪 **Scenario Testing** - Experiment with hypothetical flow modifications
- 📈 **Real-Time Dashboard** - Live event streaming and metric updates
- 🔗 **CSV-Driven Simulation** - Upload merchant data and run portal-based tests

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture](#architecture)
3. [Installation](#installation)
4. [Usage Guide](#usage-guide)
5. [API Reference](#api-reference)
6. [Frontend Dashboard](#frontend-dashboard)
7. [CSV Data Format](#csv-data-format)
8. [Scenario Configuration](#scenario-configuration)
9. [Channel Simulation](#channel-simulation)
10. [Troubleshooting](#troubleshooting)
11. [Advanced Configuration](#advanced-configuration)

---

## Quick Start

### Prerequisites

- Docker installed
- Node.js 18+ installed
- 4GB RAM minimum
- Internet connection

### Installation

```bash
# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install

# Install agent dependencies
cd ../simulation-agent && npm install

# Build Docker image with Playwright
cd simulation-agent
docker build -t simulation-agent:latest .
```

### Start Services

```bash
# Terminal 1: Start backend
cd backend && npm start

# Terminal 2: Start frontend
cd frontend && npm start
```

### Access Application

- Frontend UI: http://localhost:3001
- Backend API: http://localhost:3000
- API Health: http://localhost:3000/health

### Run Your First Simulation

1. Open http://localhost:3001
2. Navigate to "Channel Simulation" tab
3. Upload merchant CSV (`data/merchants.csv`)
4. Select "Web Portal" channel
5. Enter portal URL (default: https://m-pesaforbusiness.co.ke/apply)
6. Set merchant count to 3
7. Click "RUN SIMULATION"
8. Watch live events and insights

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
├─────────────────────────────────────────────────────────────────┤
│  Dashboard  │  Channel Sim  │  Scenario Test  │  Merchants      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Unified Backend (Express)                     │
├─────────────────────────────────────────────────────────────────┤
│  • CSV Processing          • Channel Management                  │
│  • Merchant Management     • Simulation Orchestration            │
│  • Insight Collection      • Scenario Comparison                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  AI Agent Containers (Docker)                    │
├─────────────────────────────────────────────────────────────────┤
│  Channel Factory → Web/USSD/App → Portal → Insights             │
└─────────────────────────────────────────────────────────────────┘
```

### Components

1. **Unified Backend (Port 3000)** - Single Express server combining:
   - Merchant Generator (CSV processing, uploads)
   - Insight Service (event storage, metrics)
   - Scenario Runner (in-process simulations)
   - Channel Simulation Orchestration
   - Comparison Engine

2. **React Frontend (Port 3001)** - Web dashboard for visualization and control:
   - Real-time Dashboard
   - Channel Simulation Console
   - Scenario Testing UI
   - Merchant Viewer
   - Simulation Runner

3. **AI Agent Containers (Docker)** - Containerized agents with:
   - Channel abstraction layer
   - Playwright browser automation
   - Real portal interaction
   - Insight collection

### Channel Abstraction Layer

**Location:** `simulation-agent/channels/`

**Components:**

1. **Base Channel** (`base.js`) - Abstract interface all channels implement
2. **Web Channel** (`web.js`) - Playwright-based browser automation
3. **USSD Channel** (`ussd.js`) - Placeholder for future implementation
4. **App Channel** (`app.js`) - Placeholder for future implementation
5. **Channel Factory** (`index.js`) - Creates and manages channel instances

### Supported Channels

| Channel | Status | Technology | Description |
|---------|--------|------------|-------------|
| WEB | ✅ Implemented | Playwright | Headless browser automation |
| USSD | 🚧 Placeholder | TBD | USSD session simulation |
| APP | 🚧 Placeholder | Appium | Mobile app automation |

---

## Installation

### Step 1: Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install

# Agent
cd ../simulation-agent
npm install
```

### Step 2: Build Docker Image

```bash
cd simulation-agent
docker build -t simulation-agent:latest .
```

This will:
- Install Playwright
- Download Chromium browser
- Package agent code
- Create channel implementations

**Note:** First build takes 5-10 minutes due to browser download.

### Step 3: Verify Installation

```bash
# Check Docker image
docker images | grep simulation-agent

# Start backend
cd backend && npm start

# Start frontend (in new terminal)
cd frontend && npm start

# Check health
curl http://localhost:3000/health
```

---

## Usage Guide

### Channel-Based Simulation

#### Step 1: Prepare CSV Data

Create merchant CSV with required fields:

```csv
merchantId,businessType,incomeLevel,deviceType,networkProfile,digitalLiteracy
M001,retail,medium,android_mid,3G_POOR,intermediate
M002,services,high,ios,4G_GOOD,advanced
M003,agriculture,low,android_low,2G_EDGE,basic
```

#### Step 2: Upload CSV

1. Navigate to "Channel Simulation" tab
2. Click "Choose CSV file" under "Merchant Onboarding Data"
3. Select your CSV file
4. Wait for success message: `✅ Uploaded X merchants loaded`

#### Step 3: Configure Simulation

**Channel Selection:**
- Select "Web Portal" (currently only available)
- USSD and App channels coming soon

**Portal URL:**
- Default: `http://localhost:3000/mock-portal/index.html` (served by backend)
- Mock portal location: `mock-portal/index.html` in project root
- Edit the HTML file to customize portal behavior
- Or enter custom onboarding portal URL for testing

**Simulation Controls:**
- Number of merchants: 1-100
- Simulation speed: Normal or Accelerated
- Network variability: Enable/disable

#### Step 4: Run Simulation

1. Click "▶️ RUN SIMULATION"
2. Monitor live event log
3. View real-time insights dashboard
4. Check completion rates and metrics

#### Step 5: Analyze Results

**Real-Time Insights Panel:**
- Active Agents count
- Completion Rate percentage
- Average Duration
- Drop-offs count

**Dashboard Tab:**
- Completion rate trends
- Network impact analysis
- Digital literacy correlation
- Drop-off heatmaps

### Scenario Testing

**Navigate to "Scenario Testing" tab:**

1. **Select Baseline** - Choose existing scenario
2. **Add Modifications** - Click buttons to add changes:
   - ➖ Remove Step
   - ✅ Add Verification
   - 🔄 Reorder Steps
   - 📝 Add Required Field
   - ✨ Simplify Form
   - 💡 Add Help Text
3. **Run Comparison** - Click "RUN COMPARISON"
4. **Review Results** - Compare metrics:
   - Completion rate delta
   - Time change
   - Drop-off shift
   - Friction score change

### Legacy Scenario Runner

```bash
# Start services
cd backend && npm start  # Terminal 1
cd frontend && npm start  # Terminal 2

# Access frontend
# Navigate to "Run Simulation" tab
# Click "Run All Scenarios"
```

---

## API Reference

### Base URL
```
http://localhost:3000
```

### Channel Management

**Get Available Channels**
```http
GET /channels
```

Response:
```json
{
  "channels": [
    { "id": "WEB", "name": "Web Portal", "enabled": true },
    { "id": "USSD", "name": "USSD", "enabled": false },
    { "id": "APP", "name": "Mobile App", "enabled": false }
  ]
}
```

**Run Channel Simulation**
```http
POST /simulate/channel
Content-Type: application/json

{
  "merchantCount": 10,
  "channel": "WEB",
  "portalUrl": "https://m-pesaforbusiness.co.ke/apply",
  "simulationSpeed": "normal",
  "networkVariability": true
}
```

### Merchant Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/merchants` | Get all merchant profiles from CSV |
| POST | `/merchants/upload` | Upload new CSV file |
| GET | `/health` | Health check |

### Insights & Metrics

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/events` | Receive simulation events |
| POST | `/simulation-event` | Receive agent events (alias) |
| GET | `/insights/summary` | Overall aggregated metrics |
| GET | `/insights/scenario/:id` | Metrics for specific scenario |
| GET | `/insights/compare?scenarioA=X&scenarioB=Y` | Compare two scenarios |
| GET | `/insights/scenarios` | List all available scenarios |
| GET | `/insights/by-network` | Breakdown by network profile |
| GET | `/insights/by-literacy` | Breakdown by digital literacy |
| DELETE | `/insights/clear` | Clear all stored events |

### Scenario Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/scenarios` | List all scenario configurations |
| GET | `/scenarios/list` | List scenario configs (alias) |
| POST | `/run-scenarios` | Run multi-scenario simulation |

### Insight Event Structure

```json
{
  "merchantId": "M001",
  "scenarioId": "channel-sim-123",
  "event": "VALIDATION_ERROR",
  "field": "businessName",
  "retryNeeded": true,
  "timestamp": 1234567890,
  "channel": "WebChannel"
}
```

### Event Types

| Event | Description | When Collected |
|-------|-------------|----------------|
| PAGE_LOAD | Portal page loaded | On navigation |
| PAGE_LOAD_FAILED | Page failed to load | Load timeout/error |
| FIELD_FILLED | Form field completed | After field input |
| FIELD_FILL_FAILED | Field input failed | Validation error |
| VALIDATION_ERROR | Form validation failed | On submit attempt |
| DOCUMENT_UPLOAD_CONFUSION | User confused by upload | Low literacy + delay |
| ONBOARDING_COMPLETE | Journey completed | Successful submission |
| ONBOARDING_FAILED | Journey abandoned | Max retries exceeded |
| ONBOARDING_SUMMARY | Final metrics | End of journey |

---

## Frontend Dashboard

### Features

- 📊 **Real-time Dashboard** - Live metrics, network/literacy breakdowns, experience scores
- 🌐 **Channel Simulation** - CSV upload, channel selection, portal configuration, real-time insights
- 🧪 **Scenario Testing** - Experiment with hypothetical flow modifications
- 🎬 **Scenario Manager** - View, compare, and analyze scenario performance
- 🏪 **Merchant Viewer** - Browse CSV-driven merchant profiles
- ▶️ **Simulation Runner** - Execute multi-scenario tests from the UI

### Access

Frontend runs on Port 3001 and automatically connects to backend on Port 3000.

URL: http://localhost:3001

### Navigation

1. **Dashboard** - View real-time simulation metrics
2. **Channel Simulation** - Run portal-based simulations
3. **Scenario Testing** - Test hypothetical flow changes
4. **Scenarios** - Compare scenario performance
5. **Merchants** - Browse merchant profiles
6. **Run Simulation** - Execute multi-scenario tests

---

## CSV Data Format

### Required Columns

| Column | Type | Valid Values |
|--------|------|--------------|
| merchantId | string | Any unique ID |
| businessType | enum | retail, services, agriculture |
| incomeLevel | enum | low, medium, high |
| deviceType | enum | ios, android_high, android_mid, android_low |
| networkProfile | enum | 4G_GOOD, 4G_UNSTABLE, 3G_POOR, 2G_EDGE |
| digitalLiteracy | enum | basic, intermediate, advanced |
| patienceScore | float | 0.0 - 1.0 (optional) |
| retryThreshold | integer | 1 - 10 (optional) |
| issueType | enum | pin_reset, balance_check, etc. (optional) |

### Sample CSV

```csv
merchantId,businessType,incomeLevel,deviceType,networkProfile,digitalLiteracy
M001,retail,medium,android_mid,3G_POOR,intermediate
M002,services,high,ios,4G_GOOD,advanced
M003,agriculture,low,android_low,2G_EDGE,basic
```

### Sample Datasets

- `data/merchants.csv` - Default (8 merchants)
- `data/merchants_large.csv` - Large dataset (15 merchants)
- `data/merchants_high_income.csv` - High-income only (5 merchants)
- `data/merchants_low_income.csv` - Low-income only (5 merchants)

---

## Scenario Configuration

Scenarios are defined as JSON files in the `/scenarios` directory.

### Scenario Schema

```json
{
  "scenarioId": "SIMPLIFIED_FLOW",
  "description": "Reduced verification steps",
  "latencyMultiplier": 0.8,
  "retryBonus": 1,
  "successProbabilityBonus": 0.15,
  "metadata": {
    "version": "1.0",
    "author": "Product Team",
    "createdAt": "2026-02-18",
    "changes": [
      "Removed redundant verification step",
      "Optimized API calls"
    ]
  }
}
```

### Scenario Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| scenarioId | string | Unique identifier |
| description | string | Human-readable description |
| latencyMultiplier | float | Network latency multiplier (0.8 = 20% faster) |
| retryBonus | integer | Additional retry attempts allowed |
| successProbabilityBonus | float | Boost to success probability (0.15 = +15%) |

### Provided Scenarios

1. **BASELINE** - Current production flow (control group)
2. **SIMPLIFIED_FLOW** - Streamlined UX with fewer steps
3. **ENHANCED_SUPPORT** - Additional user guidance and help

---

## Channel Simulation

### Web Channel Features

- Headless browser automation using Playwright
- Device-specific viewport simulation
- Network latency simulation
- Digital literacy-based interaction delays
- Real-time insight collection
- Form validation error handling
- Abandonment detection

### Merchant Profile Requirements

```json
{
  "merchantId": "M001",
  "channel": "WEB",
  "portalUrl": "https://m-pesaforbusiness.co.ke/apply",
  "deviceType": "android_mid",
  "networkProfile": "3G_POOR",
  "digitalLiteracy": "intermediate",
  "businessType": "retail",
  "incomeLevel": "medium"
}
```

### Collected Insights

#### Operational Metrics
- Onboarding completion rate
- Time to completion
- Drop-off step index
- Retry count
- Validation error frequency

#### Experience Metrics
- Friction score (0-1)
- Cognitive load proxy
- Abandonment probability
- Step confusion index

#### Technical Metrics
- Network latency (ms)
- Page load time (ms)
- Field fill duration (ms)
- API response time (ms)

### Example Agent Output

```
🤖 Agent V2 started for merchant: M001
📱 Device: android_mid | 📡 Network: 3G_POOR
🎯 Channel: WEB | 🔗 Portal: https://m-pesaforbusiness.co.ke/apply

🌐 Initializing Web Channel...
✅ Browser initialized (android_mid)

🚀 Starting onboarding for M001
  ✓ Portal loaded (1234ms)
  📝 Filling business information...
  ✓ Business info filled
  📞 Filling contact information...
  ✓ Contact info filled
  📄 Handling documentation...
  ✓ Documentation handled
  📤 Submitting application...
  ✓ Application submitted

✅ Onboarding completed in 45678ms
🧹 Browser closed
```

---

## Troubleshooting

### Docker Issues

**Issue: Docker image not found**
```bash
cd simulation-agent
docker build -t simulation-agent:latest .
```

**Issue: Playwright browser not installed**
- Rebuild Docker image (Dockerfile includes browser installation)

**Issue: Container fails immediately**
```bash
docker ps -a  # List all containers
docker logs <container-id>  # Check logs
```

### Backend Issues

**Issue: Port 3000 already in use**
```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Issue: No merchants loaded**
1. Check `data/merchants.csv` exists
2. Verify CSV format
3. Re-upload via frontend

**Issue: Backend offline**
```bash
# Check health
curl http://localhost:3000/health

# Restart
cd backend && npm start
```

### Simulation Issues

**Issue: Simulation not starting**
1. Verify CSV uploaded
2. Check Docker is running: `docker ps`
3. Verify image exists: `docker images | grep simulation-agent`
4. Check backend logs

**Issue: No insights appearing**
1. Verify backend running on port 3000
2. Check INSIGHT_SERVICE_URL environment variable
3. Review agent logs: `docker logs <container-id>`

**Issue: Cannot reach portal URL**
- Check network connectivity
- Verify portal URL is accessible
- Check firewall settings

### Performance Issues

**Issue: Slow simulation**
- Use "Accelerated" mode for faster execution
- Reduce merchant count for testing
- Check system resources (CPU, RAM)

**Issue: High resource usage**
- Limit concurrent agents (max 3 in accelerated mode)
- Close unused applications
- Increase Docker resource limits

---

## Advanced Configuration

### Network Simulation

**Network Profiles:**

| Profile | Base Latency | Variability | Use Case |
|---------|--------------|-------------|----------|
| 4G_GOOD | 100ms | ±20% | Urban areas, good coverage |
| 4G_UNSTABLE | 300ms | ±20% | Congested networks |
| 3G_POOR | 800ms | ±20% | Rural areas, weak signal |
| 2G_EDGE | 1500ms | ±20% | Remote areas, fallback |

### Digital Literacy Impact

| Literacy Level | Typing Delay | Reading Delay | Form Interaction |
|----------------|--------------|---------------|------------------|
| Basic | 3000ms | 3000ms | 2000ms |
| Intermediate | 1500ms | 2000ms | 1000ms |
| Advanced | 800ms | 1000ms | 500ms |

### Docker Configuration

**Build Custom Image:**
```bash
cd simulation-agent
docker build -t simulation-agent:latest .
```

**Run Single Agent:**
```bash
docker run --rm \
  -e MERCHANT_PROFILE='{"merchantId":"M001","channel":"WEB",...}' \
  -e INSIGHT_SERVICE_URL="http://host.docker.internal:3000" \
  simulation-agent:latest
```

**Environment Variables:**
- `MERCHANT_PROFILE` - JSON merchant profile
- `INSIGHT_SERVICE_URL` - Backend URL for insights

### Performance Tuning

**Concurrent Simulations:**
- Normal speed: 1 agent at a time
- Accelerated: 3 agents concurrently
- Adjust based on system resources

**Resource Requirements:**
- CPU: 2+ cores recommended
- RAM: 4GB minimum, 8GB recommended
- Disk: 2GB for Docker images
- Network: Stable internet connection

### Experience Score Formula

```
experienceScore = 
  (successRate * 0.5) 
  - ((avgRetries - 1) * 0.1) 
  + (avgIndividualExperienceScore * 0.4)
```

**Interpretation:**
- **0.7 - 1.0** 🟢 Excellent - Ready for production
- **0.5 - 0.7** 🟡 Good - Minor improvements needed
- **0.3 - 0.5** 🟠 Fair - Significant issues to address
- **0.0 - 0.3** 🔴 Poor - Critical problems

---

## Project Structure

```
digital-twin-prototype/
│
├── simulation-agent/
│   ├── channels/
│   │   ├── base.js          # Base channel interface
│   │   ├── web.js           # Web portal channel (Playwright)
│   │   ├── ussd.js          # USSD placeholder
│   │   ├── app.js           # Mobile app placeholder
│   │   └── index.js         # Channel factory
│   ├── agent.js             # Original agent (legacy)
│   ├── agent-v2.js          # Channel-based agent
│   ├── package.json
│   └── Dockerfile
│
├── backend/
│   ├── modules/
│   │   ├── channelSimulation.js  # Channel simulation orchestration
│   │   ├── csvProcessor.js       # CSV parsing & validation
│   │   ├── metrics.js            # Event storage & metrics
│   │   ├── comparison.js         # Scenario comparison
│   │   └── scenarioRunner.js     # In-process simulations
│   ├── server.js
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Dashboard.js
│   │   │   ├── ChannelSimulation.js    # Channel simulation console
│   │   │   ├── ScenarioTesting.js      # Scenario testing UI
│   │   │   ├── ScenarioManager.js
│   │   │   ├── MerchantViewer.js
│   │   │   └── SimulationRunner.js
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
│
├── scenarios/
│   ├── baseline.json
│   ├── simplified-flow.json
│   └── enhanced-support.json
│
├── data/
│   ├── merchants.csv
│   ├── merchants_large.csv
│   ├── merchants_high_income.csv
│   └── merchants_low_income.csv
│
├── start-all.bat
├── start-all.sh
├── start-backend.bat
├── start-backend.sh
├── start-frontend.bat
├── start-frontend.sh
└── README.md
```

---

## Version History

### Version 6.0 - Channel-Based Onboarding Simulation (Current)
- Added channel abstraction layer (Web/USSD/App)
- Implemented Web channel with Playwright browser automation
- Created channel-based agent (agent-v2.js)
- Added Channel Simulation Console frontend
- Added Scenario Testing UI
- Enhanced insight collection (page loads, validation errors, abandonment)
- Real-time dashboard updates

### Version 5.0 - Unified 2-Port Architecture
- Consolidated all backend services into single Express server (Port 3000)
- In-process simulation (no Docker required for legacy scenarios)
- Simplified deployment and development
- React frontend on Port 3001
- Streamlined API endpoints

### Version 4.0 - Scenario-Based Experimentation Engine
- Added Scenario Runner for multi-scenario orchestration
- Scenario configuration system (JSON-based)
- Scenario comparison engine with automated recommendations
- CLI comparison tool for scenario analysis
- Scenario-aware agent behavior adjustments

### Version 3.0 - Insight & Decision Layer
- Added Insight Service for event collection
- Implemented CLI reporting tool
- Added experience scoring and recommendations
- Event-driven architecture

### Version 2.0 - CSV Data Pipeline
- CSV data ingestion with validation
- Multi-factor behavior modeling
- Enhanced metrics and insights
- File upload support

### Version 1.0 - Basic Simulation
- Mock merchant generation
- Docker-based agent simulation
- Console log outputs

---

## Future Enhancements

### Phase 2 (Next)
- 🚧 USSD channel implementation
- 🚧 Mobile app channel
- 🚧 Screenshot capture on errors
- 🚧 Video recording of sessions

### Phase 3 (Future)
- 📋 A/B testing automation
- 📋 Multi-language support
- 📋 Advanced analytics dashboard
- 📋 ML-based predictions
- 📋 Cloud deployment support
- 📋 Persistent storage (PostgreSQL/MongoDB)
- 📋 WebSocket streaming of live events
- 📋 Export reports as PDF/CSV

---

## License

MIT - Prototype/Educational Use

---

## Support

### Getting Help

**Check Logs:**
```bash
# Backend logs
cd backend && npm start  # Check terminal

# Agent logs
docker logs <container-id>

# Frontend logs
# Check browser console (F12)
```

**Verify Services:**
```bash
# Backend health
curl http://localhost:3000/health

# Available channels
curl http://localhost:3000/channels

# Current insights
curl http://localhost:3000/insights/summary
```

### Success Checklist

- ✅ Docker image built successfully
- ✅ Backend running on port 3000
- ✅ Frontend running on port 3001
- ✅ CSV uploaded successfully
- ✅ Simulation started
- ✅ Live events appearing
- ✅ Insights updating
- ✅ Dashboard showing metrics

---

**Need Help?** Check the troubleshooting section or review the API endpoints documentation above.

# Digital Twin Simulation System

A data-driven simulation platform that spawns AI agents in Docker containers to simulate merchant behavior, collect insights, and produce actionable intelligence for evaluating customer experience before production rollout.

## Current Version: 3.0 - Insight & Decision Layer

### What's New in V3

- 🧠 **Insight Service** - Intelligence layer that collects and aggregates simulation events
- 📊 **Real-time Analytics** - Metrics calculation and experience scoring
- 📋 **CLI Reporting** - Beautiful terminal reports with recommendations
- 🔄 **Event-Driven Architecture** - Agents send structured events to insight service
- 🐳 **Docker Networking** - Services communicate via Docker network
- 📈 **Breakdown Analytics** - Insights grouped by network, literacy, and scenario

## System Architecture

```
CSV Data → Merchant Generator (Port 3001)
                ↓
    Simulation Orchestrator
                ↓
    Docker Containers (AI Agents)
                ↓
    Insight Service (Port 3000) ← Events from all agents
                ↓
    Aggregated Metrics & Intelligence
                ↓
    CLI Report Tool (Terminal Output)
```

## Components

1. **Insight Service** - Collects events, calculates metrics, provides insights API
2. **Merchant Generator** - CSV-driven merchant profile generator with REST API
3. **Simulation Orchestrator** - Spawns Docker containers for each merchant
4. **AI Agent** - Simulates merchant behavior and sends events to insight service
5. **CLI Report Tool** - Fetches and displays formatted insights with recommendations

## Prerequisites

- Node.js 18+ (LTS)
- Docker Desktop installed and running
- npm or yarn

## Quick Start

### 1. Install Dependencies

```bash
# Install all services
cd insight-service && npm install && cd ..
cd merchant-generator && npm install && cd ..
cd simulation-orchestrator && npm install && cd ..
cd simulation-agent && npm install && cd ..
cd cli && npm install && cd ..
```

### 2. Build Docker Image

```bash
cd simulation-agent
docker build -t simulation-agent:latest .
```

Verify:
```bash
docker images | findstr simulation-agent
```

### 3. Start Services

**Terminal 1 - Insight Service:**
```bash
cd insight-service
npm start
```

Wait for:
```
🧠 Insight Service - Digital Twin Intelligence Layer
Server running on http://localhost:3000
```

**Terminal 2 - Merchant Generator:**
```bash
cd merchant-generator
npm start
```

Wait for:
```
🚀 Merchant Generator V2 - CSV-Driven
Server running on http://localhost:3001
✅ Loaded 8 merchants into cache
```

**Terminal 3 - Run Simulation:**
```bash
cd simulation-orchestrator
npm start
```

This will spawn 8 Docker containers, each simulating a merchant and sending events to the insight service.

**Terminal 4 - View Report:**
```bash
cd cli
npm run report
```

## Expected Output

### CLI Report Example

```
═══════════════════════════════════════════════════════════════════
  DIGITAL TWIN SIMULATION REPORT
═══════════════════════════════════════════════════════════════════
  Generated: 2/18/2026, 10:30:45 AM

───────────────────────────────────────────────────────────────────
  OVERALL METRICS
───────────────────────────────────────────────────────────────────

  Total Merchants Simulated:    8
  Success Rate:                 87.5% (7 succeeded)
  Average Completion Time:      4.2s (4200ms)
  Average Retry Attempts:       1.8
  Overall Experience Score:     0.68 / 1.0
  
  🟡 Experience Assessment: Good - Minor friction points exist

───────────────────────────────────────────────────────────────────
  FAILURES BY NETWORK PROFILE
───────────────────────────────────────────────────────────────────

  2G_EDGE          25.0% ████████████
                   Avg Time: 6.5s | Attempts: 2.5

  3G_POOR          16.7% ████████
                   Avg Time: 4.8s | Attempts: 2.0

  4G_GOOD           0.0% 
                   Avg Time: 2.1s | Attempts: 1.0

───────────────────────────────────────────────────────────────────
  RECOMMENDATIONS
───────────────────────────────────────────────────────────────────

  📡 Network: 2G_EDGE has 25.0% failure rate
     → Consider optimizing for low-bandwidth scenarios
     → Implement better retry mechanisms for poor networks

  📚 Digital Literacy: basic users struggle (33.3% failure)
     → Simplify UI/UX for less tech-savvy users
     → Add more guidance and help text
```

## API Endpoints

### Insight Service (Port 3000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/simulation-event` | Receive events from agents |
| GET | `/insights/summary` | Overall aggregated metrics |
| GET | `/insights/by-network` | Breakdown by network profile |
| GET | `/insights/by-literacy` | Breakdown by digital literacy |
| GET | `/insights/by-scenario` | Breakdown by issue type |
| DELETE | `/insights/clear` | Clear all stored events |
| GET | `/health` | Health check |

### Merchant Generator (Port 3001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/generate-merchants-from-csv` | Get merchants from default CSV |
| POST | `/generate-merchants-from-csv` | Upload custom CSV file |
| GET | `/health` | Health check |

## CSV Data Format

### Required Columns

| Column | Type | Valid Values |
|--------|------|--------------|
| merchant_id | string | Any unique ID |
| income_level | enum | low, medium, high |
| digital_literacy | enum | basic, intermediate, advanced |
| device_type | enum | android_low_end, android_mid, ios, feature_phone |
| network_profile | enum | 4G_GOOD, 4G_UNSTABLE, 3G_POOR, 2G_EDGE |
| patience_score | float | 0.0 - 1.0 |
| retry_threshold | integer | 1 - 10 |
| issue_type | enum | pin_reset, balance_check, transaction_failure, kyc_update, statement_request |

### Sample CSV

```csv
merchant_id,income_level,digital_literacy,device_type,network_profile,patience_score,retry_threshold,issue_type
M001,low,basic,android_low_end,3G_POOR,0.3,3,pin_reset
M002,medium,intermediate,android_mid,4G_GOOD,0.7,2,statement_request
M003,high,advanced,ios,4G_GOOD,0.8,1,balance_check
```

Sample datasets provided:
- `data/merchants.csv` - Default (8 merchants)
- `data/merchants_large.csv` - Large dataset (15 merchants)
- `data/merchants_high_income.csv` - High-income only (5 merchants)
- `data/merchants_low_income.csv` - Low-income only (5 merchants)

## Experience Score Formula

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

## Testing Workflow

### 1. Health Checks

```bash
curl http://localhost:3000/health  # Insight service
curl http://localhost:3001/health  # Merchant generator
```

### 2. View Insights via API

```bash
curl http://localhost:3000/insights/summary
curl http://localhost:3000/insights/by-network
curl http://localhost:3000/insights/by-literacy
curl http://localhost:3000/insights/by-scenario
```

### 3. Test with Different Datasets

```bash
# Upload custom CSV
curl -X POST -F "csvFile=@data/merchants_large.csv" http://localhost:3001/generate-merchants-from-csv

# Run simulation
cd simulation-orchestrator && npm start

# View report
cd cli && npm run report
```

### 4. Clear Data and Re-run

```bash
curl -X DELETE http://localhost:3000/insights/clear
cd simulation-orchestrator && npm start
cd cli && npm run report
```

## Development Mode

Use nodemon for auto-reload during development:

```bash
# Insight service
cd insight-service && npm run dev

# Merchant generator
cd merchant-generator && npm run dev

# Orchestrator
cd simulation-orchestrator && npm run dev
```

## Docker Compose (Alternative)

Run services with Docker Compose:

```bash
docker-compose up
```

Then run orchestrator manually:
```bash
cd simulation-orchestrator
set INSIGHT_SERVICE_URL=http://localhost:3000
npm start
```

## Project Structure

```
digital-twin-prototype/
│
├── insight-service/          # Intelligence layer
│   ├── index.js             # Express API server
│   ├── metrics.js           # Aggregation logic
│   ├── Dockerfile
│   └── package.json
│
├── cli/                      # Reporting tools
│   ├── report.js            # CLI report generator
│   └── package.json
│
├── data/                     # CSV datasets
│   ├── merchants.csv
│   ├── merchants_large.csv
│   ├── merchants_high_income.csv
│   └── merchants_low_income.csv
│
├── merchant-generator/       # CSV-driven profile generator
│   ├── index.js
│   ├── csvProcessor.js
│   ├── Dockerfile
│   └── package.json
│
├── simulation-orchestrator/  # Container orchestration
│   ├── index.js
│   └── package.json
│
├── simulation-agent/         # AI behavior agent
│   ├── agent.js
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

## Troubleshooting

### Docker not running

**Error:** "Cannot connect to Docker daemon"

**Solution:**
1. Open Docker Desktop
2. Wait for it to fully start
3. Verify: `docker ps`

### Port already in use

**Error:** "Port 3000 already in use"

**Solution:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Agents can't reach Insight Service

**Error:** "Could not reach Insight Service"

**Solution:**
```bash
# On Windows/Mac, use special hostname
cd simulation-orchestrator
set INSIGHT_SERVICE_URL=http://host.docker.internal:3000
npm start
```

### No data in report

**Error:** "No simulation data available yet"

**Solution:**
1. Ensure insight service is running
2. Run simulation orchestrator
3. Wait for agents to complete
4. Then run report

## Version History

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

## Future Enhancements

- Persistent storage (PostgreSQL/MongoDB)
- Real-time dashboard (React/Vue frontend)
- WebSocket streaming of live events
- Advanced ML-based experience prediction
- Multi-region simulation support
- Historical trend analysis
- A/B testing simulation comparison
- Real network throttling with tc/netem

## License

MIT - Prototype/Educational Use

---

**Need Help?** Check the troubleshooting section or review the API endpoints documentation above.

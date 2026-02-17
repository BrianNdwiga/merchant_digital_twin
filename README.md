# Digital Twin Simulation System

A data-driven simulation platform that spawns AI agents in Docker containers to simulate merchant behavior across multiple scenarios, enabling product teams to compare alternative flows before production rollout.

## Current Version: 4.0 - Scenario-Based Experimentation Engine

### What's New in V4

- 🎬 **Scenario Engine** - Run simulations across multiple product flow variations
- 📊 **Scenario Comparison** - Automatically compare BASELINE vs NEW FLOW outcomes
- 🔄 **Multi-Scenario Orchestration** - Clone merchants across scenarios for fair comparison
- 📈 **Comparative Analytics** - Success rate deltas, retry reduction, experience score improvements
- 🎯 **Automated Recommendations** - AI-driven scenario selection based on performance
- 📋 **CLI Comparison Reports** - Beautiful terminal reports comparing scenarios

## System Architecture

```
Scenario Configurations (JSON)
         ↓
CSV Data → Merchant Generator (Port 3001)
         ↓
Scenario Runner (clones merchants per scenario)
         ↓
Simulation Orchestrator
         ↓
Docker Containers (AI Agents) × Scenarios
         ↓
Insight Service (Port 3000) ← Events tagged by scenario
         ↓
Scenario Comparison Engine
         ↓
CLI Comparison Report
```

## Components

1. **Scenario Runner** (NEW) - Orchestrates multi-scenario simulations
2. **Scenario Configurations** (NEW) - JSON files defining flow variations
3. **Insight Service** - Collects events, calculates metrics per scenario, provides comparison API
4. **Merchant Generator** - CSV-driven merchant profile generator with REST API
5. **Simulation Orchestrator** - Spawns Docker containers for each merchant
6. **AI Agent** - Simulates merchant behavior with scenario-specific adjustments
7. **CLI Comparison Tool** (NEW) - Compares scenarios and provides recommendations

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
cd scenario-runner && npm install && cd ..
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

**Terminal 3 - Run Multi-Scenario Simulation:**
```bash
cd scenario-runner
npm start
```

This will:
- Load all scenario configurations from `/scenarios`
- Fetch merchants from generator
- Clone merchants for each scenario
- Spawn Docker containers for each merchant × scenario combination
- Send events tagged with scenario IDs to insight service

**Terminal 4 - Compare Scenarios:**
```bash
cd cli
npm run compare
```

Or compare specific scenarios:
```bash
npm run compare BASELINE SIMPLIFIED_FLOW
```

## Expected Output

### Scenario Runner Console

```
🎯 Digital Twin Scenario Experimentation Engine
📊 Multi-Scenario Simulation Runner
══════════════════════════════════════════════════════════════════

📋 Loading scenario configurations...
📋 Loaded 3 scenario configurations:
   - BASELINE: Current production flow
   - SIMPLIFIED_FLOW: Reduced verification steps
   - ENHANCED_SUPPORT: Enhanced user support

📡 Fetching merchant profiles...
✅ Loaded 8 merchant profiles

🔄 Starting multi-scenario simulations...
   Total simulations: 8 merchants × 3 scenarios = 24 agents

══════════════════════════════════════════════════════════════════
🎬 Running Scenario: BASELINE
   Current production flow - existing user journey
   Latency Multiplier: 1x
   Retry Bonus: +0
   Success Bonus: +0%
══════════════════════════════════════════════════════════════════

🚀 Spawning 8 agents for BASELINE...
   ✓ M001 completed
   ✓ M002 completed
   ...

✅ Scenario BASELINE completed:
   Agents spawned: 8
   Successful: 8
   Failed: 0
```

### CLI Comparison Report Example

```
═══════════════════════════════════════════════════════════════════
  SCENARIO COMPARISON REPORT
═══════════════════════════════════════════════════════════════════
  Generated: 2/18/2026, 10:30:45 AM

───────────────────────────────────────────────────────────────────
  SCENARIO OVERVIEW
───────────────────────────────────────────────────────────────────

  📋 Scenario A: BASELINE
     Merchants: 8
     Success Rate: 75.0%
     Avg Retries: 2.1
     Avg Time: 4.5s
     Experience Score: 0.58

  📋 Scenario B: SIMPLIFIED_FLOW
     Merchants: 8
     Success Rate: 87.5%
     Avg Retries: 1.6
     Avg Time: 3.6s
     Experience Score: 0.73

───────────────────────────────────────────────────────────────────
  PERFORMANCE COMPARISON
───────────────────────────────────────────────────────────────────

  Success Rate:
     📈 +12.5% (SIMPLIFIED_FLOW vs BASELINE)

  Retry Attempts:
     ✅ Reduced by 0.5 attempts (23.8%)

  Completion Time:
     ⚡ Faster by 0.9s

  Experience Score:
     🟢 +0.15 points

───────────────────────────────────────────────────────────────────
  RECOMMENDATION
───────────────────────────────────────────────────────────────────

  🎯 Recommended Scenario: SIMPLIFIED_FLOW
     Reason: Higher experience score (+0.15)
     Confidence: MEDIUM (sample size: 8)

───────────────────────────────────────────────────────────────────
  ACTIONABLE INSIGHTS
───────────────────────────────────────────────────────────────────

  ✅ SIMPLIFIED_FLOW shows better performance
     → Success rate improved significantly (+12.5%)
     → Consider rolling out SIMPLIFIED_FLOW to production

  💡 Next Steps:
     1. Review SIMPLIFIED_FLOW implementation details
     2. Run A/B test with real users (10-20% traffic)
     3. Monitor production metrics closely
     4. Gradual rollout if metrics hold

═══════════════════════════════════════════════════════════════════
```

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
| GET | `/insights/scenario/:id` | Metrics for specific scenario |
| GET | `/insights/compare?scenarioA=X&scenarioB=Y` | Compare two scenarios |
| GET | `/insights/scenarios` | List all available scenarios |
| GET | `/insights/by-network` | Breakdown by network profile |
| GET | `/insights/by-literacy` | Breakdown by digital literacy |
| GET | `/insights/by-scenario` | Breakdown by issue type |
| DELETE | `/insights/clear` | Clear all stored events |
| GET | `/health` | Health check |

### Example: Compare Scenarios

```bash
curl "http://localhost:3000/insights/compare?scenarioA=BASELINE&scenarioB=SIMPLIFIED_FLOW"
```

Response:
```json
{
  "scenarioA": {
    "id": "BASELINE",
    "successRate": 0.75,
    "experienceScore": 0.58
  },
  "scenarioB": {
    "id": "SIMPLIFIED_FLOW",
    "successRate": 0.88,
    "experienceScore": 0.73
  },
  "comparison": {
    "successRateImprovement": 0.13,
    "experienceScoreDelta": 0.15
  },
  "recommendation": {
    "recommendedScenario": "SIMPLIFIED_FLOW",
    "reason": "Higher experience score (+0.15)",
    "confidence": "MEDIUM"
  }
}
```

## CSV Data Format

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
| scenarioId | string | Unique identifier (e.g., "BASELINE", "SIMPLIFIED_FLOW") |
| description | string | Human-readable description |
| latencyMultiplier | float | Network latency multiplier (0.8 = 20% faster) |
| retryBonus | integer | Additional retry attempts allowed |
| successProbabilityBonus | float | Boost to success probability (0.15 = +15%) |

### Provided Scenarios

1. **BASELINE** - Current production flow (control group)
2. **SIMPLIFIED_FLOW** - Streamlined UX with fewer steps
3. **ENHANCED_SUPPORT** - Additional user guidance and help

### Creating Custom Scenarios

1. Create a new JSON file in `/scenarios`
2. Define scenario parameters
3. Run scenario-runner
4. Compare results with CLI tool

Example:
```bash
# Create new scenario
echo '{
  "scenarioId": "FAST_TRACK",
  "description": "Express checkout for verified users",
  "latencyMultiplier": 0.6,
  "retryBonus": 0,
  "successProbabilityBonus": 0.25
}' > scenarios/fast-track.json

# Run simulation
cd scenario-runner && npm start

# Compare
cd cli && npm run compare BASELINE FAST_TRACK
```

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

### 1. Run Multi-Scenario Simulation

```bash
# Start services
cd insight-service && npm start  # Terminal 1
cd merchant-generator && npm start  # Terminal 2

# Run all scenarios
cd scenario-runner && npm start  # Terminal 3
```

### 2. Compare Scenarios

```bash
# Compare default (BASELINE vs first alternative)
cd cli && npm run compare

# Compare specific scenarios
npm run compare BASELINE SIMPLIFIED_FLOW
npm run compare SIMPLIFIED_FLOW ENHANCED_SUPPORT
```

### 3. View Scenario-Specific Insights

```bash
# Get metrics for specific scenario
curl http://localhost:3000/insights/scenario/BASELINE
curl http://localhost:3000/insights/scenario/SIMPLIFIED_FLOW

# List all scenarios
curl http://localhost:3000/insights/scenarios
```

### 4. Test with Different Merchant Datasets

```bash
# Upload different CSV
curl -X POST -F "csvFile=@data/merchants_large.csv" http://localhost:3001/generate-merchants-from-csv

# Run scenarios with new data
cd scenario-runner && npm start

# Compare results
cd cli && npm run compare
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
├── scenarios/                    # NEW - Scenario configurations
│   ├── baseline.json
│   ├── simplified-flow.json
│   └── enhanced-support.json
│
├── scenario-runner/              # NEW - Multi-scenario orchestrator
│   ├── index.js
│   ├── Dockerfile
│   └── package.json
│
├── insight-service/              # UPDATED - Scenario comparison
│   ├── index.js
│   ├── metrics.js
│   ├── comparison.js            # NEW
│   ├── Dockerfile
│   └── package.json
│
├── cli/                          # UPDATED - Comparison tool
│   ├── report.js
│   ├── compare.js               # NEW
│   └── package.json
│
├── data/
│   ├── merchants.csv
│   ├── merchants_large.csv
│   ├── merchants_high_income.csv
│   └── merchants_low_income.csv
│
├── merchant-generator/
│   ├── index.js
│   ├── csvProcessor.js
│   ├── Dockerfile
│   └── package.json
│
├── simulation-orchestrator/
│   ├── index.js
│   └── package.json
│
├── simulation-agent/             # UPDATED - Scenario-aware
│   ├── agent.js
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml            # UPDATED
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

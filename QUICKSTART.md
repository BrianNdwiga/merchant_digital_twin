# Quick Start Guide - Version 4.0
## Scenario-Based Experimentation Engine

This guide will walk you through running the complete multi-scenario simulation system.

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] Node.js 18+ installed (`node --version`)
- [ ] Docker Desktop installed and running (`docker ps`)
- [ ] At least 4 terminal windows available
- [ ] Ports 3000 and 3001 available

## Step-by-Step Execution

### Step 1: Verify Docker is Running

```bash
docker --version
docker ps
```

Expected output:
```
Docker version 29.2.0, build 0b9d198
CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES
```

If Docker is not running, start Docker Desktop and wait for it to fully initialize.

---

### Step 2: Verify Docker Image Exists

```bash
docker images | findstr simulation-agent
```

Expected output:
```
simulation-agent   latest   939abd47d239   X minutes ago   181MB
```

If the image doesn't exist, build it:
```bash
cd simulation-agent
docker build -t simulation-agent:latest .
cd ..
```

---

### Step 3: Start Insight Service (Terminal 1)

Open your first terminal:

```bash
cd insight-service
npm start
```

**Wait for this output:**
```
🧠 Insight Service - Digital Twin Intelligence Layer
==================================================
Server running on http://localhost:3000

Available endpoints:
  POST   /simulation-event         - Receive agent events
  GET    /insights/summary         - Overall metrics
  GET    /insights/scenario/:id    - Scenario-specific metrics
  GET    /insights/compare         - Compare two scenarios
  GET    /insights/scenarios       - List available scenarios
  ...
==================================================
```

**✅ Checkpoint:** Service is ready when you see "Server running on http://localhost:3000"

**Keep this terminal open and running.**

---

### Step 4: Start Merchant Generator (Terminal 2)

Open your second terminal:

```bash
cd merchant-generator
npm start
```

**Wait for this output:**
```
🚀 Merchant Generator V2 - CSV-Driven
==================================================
Server running on http://localhost:3001

Available endpoints:
  GET  /generate-merchants-from-csv
  POST /generate-merchants-from-csv (upload CSV)
  GET  /health
==================================================
📂 Loading merchants from: ../data/merchants.csv
✅ Loaded 8 merchants into cache
```

**✅ Checkpoint:** Service is ready when you see "Loaded 8 merchants into cache"

**Keep this terminal open and running.**

---

### Step 5: Verify Services are Healthy (Optional)

Open a new terminal temporarily to test:

```bash
# Test insight service
curl http://localhost:3000/health

# Test merchant generator
curl http://localhost:3001/health
```

Expected responses:
```json
{"status":"healthy","service":"insight-service","eventsStored":0}
{"status":"healthy","merchantsLoaded":8}
```

---

### Step 6: Run Multi-Scenario Simulation (Terminal 3)

Open your third terminal:

```bash
cd scenario-runner
npm start
```

**What happens:**
1. Loads 3 scenario configurations (BASELINE, SIMPLIFIED_FLOW, ENHANCED_SUPPORT)
2. Fetches 8 merchants from generator
3. Clears previous simulation data
4. For each scenario:
   - Enriches merchants with scenario config
   - Spawns 8 Docker containers (one per merchant)
   - Each agent simulates behavior
   - Agents send events to insight service
5. Total: 24 simulations (8 merchants × 3 scenarios)

**Expected output:**
```
🎯 Digital Twin Scenario Experimentation Engine
📊 Multi-Scenario Simulation Runner
══════════════════════════════════════════════════════════════════

📋 Loading scenario configurations...
📋 Loaded 3 scenario configurations:
   - BASELINE: Current production flow - existing user journey
   - SIMPLIFIED_FLOW: Reduced verification steps - streamlined UX
   - ENHANCED_SUPPORT: Enhanced user support - contextual help

📡 Fetching merchant profiles...
✅ Loaded 8 merchant profiles

🐳 Checking Docker image...
✅ Docker image found

🗑️  Clearing previous simulation data...
✅ Previous data cleared

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
   ✓ M003 completed
   ✓ M004 completed
   ✓ M005 completed
   ✓ M006 completed
   ✓ M007 completed
   ✓ M008 completed

✅ Scenario BASELINE completed:
   Agents spawned: 8
   Successful: 8
   Failed: 0

══════════════════════════════════════════════════════════════════
🎬 Running Scenario: SIMPLIFIED_FLOW
   Reduced verification steps - streamlined UX
   Latency Multiplier: 0.8x
   Retry Bonus: +1
   Success Bonus: +15%
══════════════════════════════════════════════════════════════════

🚀 Spawning 8 agents for SIMPLIFIED_FLOW...

   ✓ M001 completed
   ✓ M002 completed
   ...

✅ Scenario SIMPLIFIED_FLOW completed:
   Agents spawned: 8
   Successful: 8
   Failed: 0

══════════════════════════════════════════════════════════════════
🎬 Running Scenario: ENHANCED_SUPPORT
   Enhanced user support - contextual help and guidance
   Latency Multiplier: 1.1x
   Retry Bonus: +2
   Success Bonus: +20%
══════════════════════════════════════════════════════════════════

🚀 Spawning 8 agents for ENHANCED_SUPPORT...

   ✓ M001 completed
   ...

✅ Scenario ENHANCED_SUPPORT completed:
   Agents spawned: 8
   Successful: 8
   Failed: 0

══════════════════════════════════════════════════════════════════
✅ All scenario simulations completed!
══════════════════════════════════════════════════════════════════

BASELINE:
  Total: 8 | Success: 8 | Failed: 0

SIMPLIFIED_FLOW:
  Total: 8 | Success: 8 | Failed: 0

ENHANCED_SUPPORT:
  Total: 8 | Success: 8 | Failed: 0

💡 Next steps:
   1. View insights: curl http://localhost:3000/insights/summary
   2. Compare scenarios: cd cli && npm run compare
```

**⏱️ Duration:** Approximately 2-3 minutes for all 24 simulations

**✅ Checkpoint:** All scenarios completed successfully

---

### Step 7: View Scenario Comparison Report (Terminal 4)

Open your fourth terminal:

```bash
cd cli
npm run compare
```

**What happens:**
1. Fetches available scenarios from insight service
2. Compares BASELINE vs SIMPLIFIED_FLOW (default)
3. Calculates performance deltas
4. Provides automated recommendation
5. Displays actionable insights

**Expected output:**
```
═══════════════════════════════════════════════════════════════════
  SCENARIO COMPARISON REPORT
═══════════════════════════════════════════════════════════════════
  Generated: 2/18/2026, 10:30:45 AM
  Insight Service: http://localhost:3000

📊 Fetching available scenarios...

✅ Found 3 scenarios: BASELINE, SIMPLIFIED_FLOW, ENHANCED_SUPPORT

🔍 Comparing: BASELINE vs SIMPLIFIED_FLOW

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

---

### Step 8: Compare Other Scenarios (Optional)

You can compare any two scenarios:

```bash
# Compare BASELINE vs ENHANCED_SUPPORT
npm run compare BASELINE ENHANCED_SUPPORT

# Compare SIMPLIFIED_FLOW vs ENHANCED_SUPPORT
npm run compare SIMPLIFIED_FLOW ENHANCED_SUPPORT
```

---

### Step 9: View Raw API Data (Optional)

Test the API endpoints directly:

```bash
# List all scenarios
curl http://localhost:3000/insights/scenarios

# Get metrics for specific scenario
curl http://localhost:3000/insights/scenario/BASELINE
curl http://localhost:3000/insights/scenario/SIMPLIFIED_FLOW

# Compare via API
curl "http://localhost:3000/insights/compare?scenarioA=BASELINE&scenarioB=SIMPLIFIED_FLOW"

# Overall summary
curl http://localhost:3000/insights/summary
```

---

## What You Just Accomplished

✅ Ran 24 containerized AI agent simulations
✅ Tested 3 different product flow scenarios
✅ Collected structured behavioral data
✅ Aggregated metrics per scenario
✅ Compared scenarios automatically
✅ Received data-driven recommendations

## Understanding the Results

### Success Rate Improvement
- Shows how many more users complete the flow successfully
- +12.5% means 1 additional successful user per 8 attempts

### Retry Reduction
- Fewer retries = less user frustration
- 23.8% reduction = significant UX improvement

### Completion Time
- Faster flows = better user experience
- 0.9s improvement may seem small but compounds at scale

### Experience Score
- Composite metric (0-1 scale)
- Factors in success, retries, latency, and user attributes
- +0.15 is a substantial improvement

## Next Steps

### 1. Test with More Merchants

```bash
# Upload larger dataset
curl -X POST -F "csvFile=@data/merchants_large.csv" http://localhost:3001/generate-merchants-from-csv

# Re-run scenarios
cd scenario-runner && npm start

# Compare again
cd cli && npm run compare
```

### 2. Create Custom Scenarios

Create `scenarios/my-scenario.json`:
```json
{
  "scenarioId": "MY_SCENARIO",
  "description": "My custom flow",
  "latencyMultiplier": 0.7,
  "retryBonus": 2,
  "successProbabilityBonus": 0.25
}
```

Then run:
```bash
cd scenario-runner && npm start
cd cli && npm run compare BASELINE MY_SCENARIO
```

### 3. Clear Data and Re-run

```bash
# Clear all simulation data
curl -X DELETE http://localhost:3000/insights/clear

# Run fresh simulation
cd scenario-runner && npm start
```

## Troubleshooting

### Issue: "Docker image not found"

**Solution:**
```bash
cd simulation-agent
docker build -t simulation-agent:latest .
```

### Issue: "Port 3000 already in use"

**Solution:**
```bash
# Find and kill the process
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Issue: "Could not reach Insight Service"

**Solution:**
- Ensure insight service is running in Terminal 1
- Check: `curl http://localhost:3000/health`
- Restart if needed: `cd insight-service && npm start`

### Issue: "No scenarios found"

**Solution:**
- Verify scenario files exist: `dir scenarios`
- Should see: baseline.json, simplified-flow.json, enhanced-support.json

### Issue: Agents fail to spawn

**Solution:**
- Check Docker Desktop is running
- Verify image: `docker images | findstr simulation-agent`
- Check Docker logs: `docker ps -a`

## Stopping the System

To cleanly shut down:

1. **Terminal 3** (scenario-runner): Already finished
2. **Terminal 2** (merchant-generator): Press `Ctrl + C`
3. **Terminal 1** (insight-service): Press `Ctrl + C`
4. **Terminal 4** (cli): Already finished

## Summary

You've successfully run a complete multi-scenario experimentation system that:
- Simulates real user behavior across different product flows
- Provides quantitative comparison between scenarios
- Offers data-driven recommendations for production rollout
- All without writing a single line of code or touching production!

This is the power of Digital Twin simulation for product development.

---

**Questions or Issues?** Check the main README.md or review the troubleshooting section above.

# Digital Twin Simulation System - Version 2

A data-driven prototype system that simulates merchants from CSV datasets by spawning AI agents inside Docker containers.

## What's New in Version 2

- **CSV Data Ingestion** - Load merchant profiles from CSV files
- **Data Validation** - Automatic validation and normalization of CSV data
- **Enhanced Agent Behavior** - Richer simulation logic based on income, literacy, device type
- **Improved Metrics** - Detailed insights including completion time, failures, and experience scores
- **File Upload Support** - Upload custom CSV files via API

## System Architecture

```
CSV Data File (data/merchants.csv)
         ↓
Merchant Generator V2 (Port 3001)
         ↓
Simulation Orchestrator V2
         ↓
Docker Containers (AI Agents)
         ↓
Enhanced Behavior Simulation
         ↓
Structured Insights & Metrics
```

## Components

1. **CSV Processor** - Parses, validates, and transforms CSV data into merchant profiles
2. **Merchant Generator V2** - REST API that serves CSV-driven merchant profiles
3. **Simulation Orchestrator V2** - Fetches CSV merchants and spawns Docker containers
4. **AI Agent V2** - Enhanced simulation with multi-factor behavior modeling

## Prerequisites

- Node.js 18+ (LTS)
- Docker Desktop installed and running
- npm or yarn
- nodemon (installed automatically as dev dependency)

## Setup Instructions

### 1. Install Dependencies

```bash
# Install merchant generator dependencies (includes CSV parsing)
cd merchant-generator
npm install

# Install orchestrator dependencies
cd ../simulation-orchestrator
npm install

# Install agent dependencies
cd ../simulation-agent
npm install
```

The merchant generator now includes:
- `csv-parser` - For parsing CSV files
- `multer` - For handling CSV file uploads

### 2. Build Docker Image

```bash
cd simulation-agent
docker build -t simulation-agent:latest .
```

Verify the image was built:
```bash
docker images | findstr simulation-agent
```

### 3. Prepare CSV Data

A sample CSV file is already provided at `data/merchants.csv` with 8 merchant profiles.

CSV format:
```csv
merchant_id,income_level,digital_literacy,device_type,network_profile,patience_score,retry_threshold,issue_type
M001,low,basic,android_low_end,3G_POOR,0.3,3,pin_reset
M002,medium,intermediate,android_mid,4G_GOOD,0.7,2,statement_request
```

### 4. Start Merchant Generator

Open a terminal and run:

**Development Mode (with auto-reload):**
```bash
cd merchant-generator
npm run dev
```

**Production Mode:**
```bash
cd merchant-generator
npm start
```

You should see:
```
[nodemon] starting `node index.js`
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
[nodemon] watching path(s): index.js csvProcessor.js ../data/*.csv
```

Keep this terminal open. With nodemon, any changes to code or CSV files will auto-reload!

### 5. Run Simulation Orchestrator

Open a NEW terminal and run:

**Development Mode (with auto-reload):**
```bash
cd simulation-orchestrator
npm run dev
```

**Production Mode:**
```bash
cd simulation-orchestrator
npm start
```

## Expected Output

### Merchant Generator Output
```
🚀 Merchant Generator V2 - CSV-Driven
==================================================
Server running on http://localhost:3001
📂 Loading merchants from: ../data/merchants.csv
✅ Loaded 8 merchants into cache
📤 Returning 8 merchants from CSV
```

### Orchestrator Output
```
🎯 Digital Twin Simulation Orchestrator V2
📊 CSV-Driven Data Pipeline
==================================================

📡 Fetching merchants from CSV data...
✅ Received 8 merchant profiles from CSV

🐳 Checking Docker image...
✅ Docker image found

🔄 Starting agent simulations...
==================================================

🚀 Spawning agent for M001...
```

### Agent Container Output (Enhanced)
Each agent logs structured JSON insights with richer data:

```json
{
  "merchantId": "M001",
  "event": "PIN_RESET_ATTEMPT",
  "attempt": 1,
  "latency": 820,
  "result": "retry",
  "timestamp": "2026-02-16T10:30:45.123Z"
}
```

Final summary with enhanced metrics:
```json
{
  "merchantId": "M001",
  "summary": {
    "totalAttempts": 2,
    "failures": 1,
    "success": true,
    "experienceScore": 0.58,
    "completionTimeMs": 4200,
    "avgLatencyMs": 810,
    "issueType": "pin_reset",
    "networkProfile": "3G_POOR",
    "digitalLiteracy": "basic",
    "incomeLevel": "low",
    "deviceType": "android_low_end",
    "outcome": "✅ RESOLVED"
  }
}
```

## CSV Data Schema

### Required Columns

| Column | Type | Valid Values | Description |
|--------|------|--------------|-------------|
| merchant_id | string | Any unique ID | Merchant identifier |
| income_level | enum | low, medium, high | Economic status |
| digital_literacy | enum | basic, intermediate, advanced | Tech proficiency |
| device_type | enum | android_low_end, android_mid, ios, feature_phone | Device category |
| network_profile | enum | 4G_GOOD, 4G_UNSTABLE, 3G_POOR, 2G_EDGE | Network quality |
| patience_score | float | 0.0 - 1.0 | User patience level |
| retry_threshold | integer | 1 - 10 | Max retry attempts |
| issue_type | enum | pin_reset, balance_check, transaction_failure, kyc_update, statement_request | Issue category |

### Merchant Profile JSON (Generated from CSV)

```json
{
  "merchantId": "M001",
  "incomeLevel": "low",
  "digitalLiteracy": "basic",
  "deviceType": "android_low_end",
  "networkProfile": "3G_POOR",
  "patienceScore": 0.3,
  "retryThreshold": 3,
  "issueType": "pin_reset"
}
```

## Network Latency Simulation

| Profile | Simulated Delay |
|---------|----------------|
| 4G_GOOD | 100ms |
| 4G_UNSTABLE | 300ms |
| 3G_POOR | 800ms |
| 2G_EDGE | 1500ms |

## Testing Individual Components

### Test Merchant Generator (CSV-based)
```bash
# Get merchants from default CSV
curl http://localhost:3001/generate-merchants-from-csv

# Check health
curl http://localhost:3001/health
```

### Upload Custom CSV
```bash
curl -X POST -F "csvFile=@path/to/your/merchants.csv" http://localhost:3001/generate-merchants-from-csv
```

### Test Single Agent Manually
```bash
docker run --rm -e MERCHANT_PROFILE="{\"merchantId\":\"M001\",\"incomeLevel\":\"low\",\"digitalLiteracy\":\"basic\",\"deviceType\":\"android_low_end\",\"networkProfile\":\"3G_POOR\",\"patienceScore\":0.3,\"retryThreshold\":3,\"issueType\":\"pin_reset\"}" simulation-agent:latest
```

## Troubleshooting

### Docker image not found
```bash
cd simulation-agent
docker build -t simulation-agent:latest .
```

### Merchant generator not responding
- Ensure it's running on port 3001
- Check if port is already in use
- Try: `netstat -ano | findstr :3001`

### Container fails to start
- Check Docker Desktop is running
- Verify image exists: `docker images`
- Check logs: `docker logs agent_SYNTH_001`

## Project Structure

```
digital-twin-prototype/
│
├── data/
│   └── merchants.csv     # CSV data source (8 sample merchants)
│
├── merchant-generator/
│   ├── index.js          # REST API with CSV support
│   ├── csvProcessor.js   # CSV parsing, validation, transformation
│   └── package.json
│
├── simulation-orchestrator/
│   ├── index.js          # Spawns Docker containers (V2)
│   └── package.json
│
├── simulation-agent/
│   ├── agent.js          # Enhanced AI agent with multi-factor behavior
│   ├── package.json
│   └── Dockerfile        # Container definition
│
└── README.md
```

## Version 2 Enhancements

✅ CSV data ingestion with validation
✅ Multi-factor behavior modeling (income, literacy, device)
✅ Enhanced metrics (completion time, failures, avg latency)
✅ File upload support for custom datasets
✅ Automatic data normalization and transformation

## Future Enhancements (Version 3)

- Add real network throttling with `tc` and `netem`
- Implement parallel container execution
- Add metrics collection and visualization
- Store insights in time-series database
- Add web dashboard for real-time monitoring
- Implement agent learning/adaptation over time
- Support for multiple CSV files and batch processing
- Real-time streaming of agent insights

## License

MIT - Prototype/Educational Use

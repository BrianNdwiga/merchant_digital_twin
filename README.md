# Digital Twin Simulation System

A prototype system that simulates synthetic merchants interacting with a digital service by spawning AI agents inside Docker containers.

## System Architecture

```
Merchant Generator (Port 3001)
         ↓
Simulation Orchestrator
         ↓
Docker Containers (AI Agents)
         ↓
Simulated Behavior & Insights
```

## Components

1. **Merchant Generator** - REST API that generates synthetic merchant profiles
2. **Simulation Orchestrator** - Fetches merchants and spawns Docker containers
3. **AI Agent** - Runs inside containers, simulates merchant behavior

## Prerequisites

- Node.js 18+ (LTS)
- Docker Desktop installed and running
- npm or yarn

## Setup Instructions

### 1. Install Dependencies

```bash
# Install merchant generator dependencies
cd merchant-generator
npm install

# Install orchestrator dependencies (none currently, but good practice)
cd ../simulation-orchestrator
npm install

# Install agent dependencies
cd ../simulation-agent
npm install
```

### 2. Build Docker Image

```bash
cd simulation-agent
docker build -t simulation-agent:latest .
```

Verify the image was built:
```bash
docker images | findstr simulation-agent
```

### 3. Start Merchant Generator

Open a terminal and run:
```bash
cd merchant-generator
node index.js
```

You should see:
```
Merchant Generator running on http://localhost:3001
Try: http://localhost:3001/generate-merchants
```

Keep this terminal open.

### 4. Run Simulation Orchestrator

Open a NEW terminal and run:
```bash
cd simulation-orchestrator
node index.js
```

## Expected Output

### Merchant Generator Output
```
Merchant Generator running on http://localhost:3001
Generated 5 synthetic merchants
```

### Orchestrator Output
```
🎯 Digital Twin Simulation Orchestrator
==================================================

📡 Fetching synthetic merchants...
✅ Received 5 merchant profiles

🐳 Checking Docker image...
✅ Docker image found

🔄 Starting agent simulations...
==================================================

🚀 Spawning agent for SYNTH_001...

📊 Agent SYNTH_001 output:
{
  "merchantId": "SYNTH_001",
  "event": "PIN_RESET_ATTEMPT",
  "attempt": 1,
  "latency": 820,
  "result": "retry"
}
...
```

### Agent Container Output
Each agent logs structured JSON insights:

```json
{
  "merchantId": "SYNTH_001",
  "event": "PIN_RESET_ATTEMPT",
  "attempt": 1,
  "latency": 820,
  "result": "retry",
  "timestamp": "2026-02-16T10:30:45.123Z"
}
```

Final summary:
```json
{
  "merchantId": "SYNTH_001",
  "summary": {
    "totalAttempts": 2,
    "success": true,
    "experienceScore": 0.62,
    "issueType": "pin_reset",
    "networkProfile": "3G_POOR",
    "outcome": "✅ RESOLVED"
  }
}
```

## Merchant Profile Schema

```json
{
  "merchantId": "SYNTH_001",
  "incomeLevel": "low|medium|high",
  "digitalLiteracy": "basic|intermediate|advanced",
  "deviceType": "android_low_end|android_mid|ios|feature_phone",
  "networkProfile": "4G_GOOD|3G_POOR|2G_EDGE|4G_UNSTABLE",
  "patienceScore": 0.3,
  "retryThreshold": 2,
  "issueType": "pin_reset|balance_check|transaction_failure|kyc_update"
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

### Test Merchant Generator
```bash
curl http://localhost:3001/generate-merchants?count=3
```

### Test Single Agent Manually
```bash
docker run --rm -e MERCHANT_PROFILE="{\"merchantId\":\"TEST_001\",\"incomeLevel\":\"low\",\"digitalLiteracy\":\"basic\",\"deviceType\":\"android_low_end\",\"networkProfile\":\"3G_POOR\",\"patienceScore\":0.3,\"retryThreshold\":2,\"issueType\":\"pin_reset\"}" simulation-agent:latest
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
├── merchant-generator/
│   ├── index.js          # REST API for merchant generation
│   └── package.json
│
├── simulation-orchestrator/
│   ├── index.js          # Spawns Docker containers
│   └── package.json
│
├── simulation-agent/
│   ├── agent.js          # AI agent simulation logic
│   ├── package.json
│   └── Dockerfile        # Container definition
│
└── README.md
```

## Future Enhancements

- Add real network throttling with `tc` and `netem`
- Implement parallel container execution
- Add metrics collection and visualization
- Store insights in time-series database
- Add web dashboard for real-time monitoring
- Implement agent learning/adaptation over time

## License

MIT - Prototype/Educational Use

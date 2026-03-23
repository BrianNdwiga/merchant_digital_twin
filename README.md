# Merchant Twin Simulation Platform

Simulates 1000+ concurrent merchant onboarding journeys using Playwright browser pools, Redis job queues, and real-time AI insights.

## Architecture

```
Frontend (React :3003)
    ↓ WebSocket + HTTP proxy
Backend API (:3000)
    ↓                    ↓
Insight Service (:3002)  Simulation Queue (:3005)
    ↑                         ↓
    └──── Workers (Playwright Browser Pools)
                              ↓
                    Mock Portal - nginx (:8888)
```

## Services

| Service | Port | Description |
|---|---|---|
| frontend | 3003 | React dashboard |
| backend | 3000 | API + WebSocket server |
| insight-service | 3002 | Event aggregation |
| merchant-generator | 3001 | CSV-driven merchant profiles |
| simulation-queue | 3005 | Redis BullMQ job queue |
| simulation-worker | — | Playwright browser pool (20 replicas) |
| mock-portal | 8888 | Fake onboarding portal (nginx) |
| redis | 6379 | Job queue backend |

## Quick Start

```bash
start-all.bat        # Windows
./start-all.sh       # Linux/Mac
```

This starts all Docker services and the React frontend.

## Scaling Config (`.env`)

```env
SIM_WORKER_COUNT=20        # number of worker containers
MAX_CONTEXTS_PER_WORKER=50 # browser contexts per worker
MAX_MERCHANTS=5            # 0 = all merchants, >0 = limit for testing
```

20 workers × 50 contexts = **1000 concurrent merchants**

## Data

Merchant profiles live in `data/`. Regenerate with:

```bash
node data/generate.js
```

Produces 1000 merchants across:
- `merchant_onboarding_data.csv` — device, network, literacy, income profiles
- `merchant_bio_profile.csv` — owner demographics
- `network_metrics.csv` — per-merchant latency and signal data

## Scenarios

Three simulation scenarios in `scenarios/`:
- `baseline.json` — current production flow
- `enhanced-support.json` — contextual help and guidance
- `simplified-flow.json` — reduced friction UX

## CLI Tools

```bash
cd cli
node report.js           # full simulation report
node compare.js          # compare two scenarios
```

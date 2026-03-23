#!/bin/bash

echo "========================================"
echo "Merchant Digital Twin Simulation Platform"
echo "1000+ Concurrent Merchant Architecture"
echo "========================================"
echo ""

# Check Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "ERROR: Docker is not running. Please start Docker and try again."
    exit 1
fi

# Load scaling config
export $(grep -v '^#' .env | xargs) 2>/dev/null || true
SIM_WORKER_COUNT=${SIM_WORKER_COUNT:-20}
MAX_CONTEXTS_PER_WORKER=${MAX_CONTEXTS_PER_WORKER:-50}

echo "Scaling config:"
echo "  Workers:          $SIM_WORKER_COUNT"
echo "  Contexts/worker:  $MAX_CONTEXTS_PER_WORKER"
echo "  Max concurrent:   $((SIM_WORKER_COUNT * MAX_CONTEXTS_PER_WORKER)) merchants"
echo ""

echo "Starting all services via Docker Compose..."
echo "(Redis, Queue Service, Workers, Insight Service, Merchant Generator, Mock Portal)"
echo ""

docker compose up --build --scale simulation-worker=$SIM_WORKER_COUNT


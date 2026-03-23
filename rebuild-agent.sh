#!/bin/bash
# Rebuilds all Docker images in the compose stack (workers, queue, etc.)
echo "========================================"
echo "Rebuilding all simulation Docker images"
echo "========================================"
echo ""

export $(grep -v '^#' .env | xargs) 2>/dev/null || true
SIM_WORKER_COUNT=${SIM_WORKER_COUNT:-20}

docker compose build --no-cache

if [ $? -ne 0 ]; then
    echo "ERROR: Docker build failed!"
    exit 1
fi

echo ""
echo "========================================"
echo "All images rebuilt. Run start-all.sh to launch."
echo "========================================"

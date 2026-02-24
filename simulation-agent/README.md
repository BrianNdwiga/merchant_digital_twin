# Simulation Agent

AI agent that simulates merchant onboarding behavior on the Lipa Na M-Pesa web portal.

## Overview

This agent uses Playwright to interact with the onboarding portal, simulating real merchant behavior based on their profile characteristics:

- **Digital Literacy**: Affects typing speed, form interaction time, and document upload capability
- **Network Profile**: Simulates network latency (4G_GOOD, 4G_UNSTABLE, 3G_POOR, 2G_EDGE)
- **Device Type**: Sets appropriate viewport size (iOS, Android, feature phone)
- **Income Level**: Influences success probability
- **Patience Score**: Affects retry behavior and success rates

## Features

- Direct web portal interaction using Playwright
- Realistic network delay simulation
- User behavior modeling based on digital literacy
- Comprehensive event logging to Insight Service
- Detailed step-by-step progress tracking
- Configurable portal URL via environment variable

## Environment Variables

- `MERCHANT_PROFILE` (required): JSON string containing merchant profile
- `INSIGHT_SERVICE_URL` (optional): URL of the insight service (default: http://localhost:3000)

## Merchant Profile Structure

```json
{
  "merchantId": "M001",
  "businessName": "Test Business",
  "businessType": "retail",
  "location": "Nairobi",
  "phone": "+254700000000",
  "email": "test@example.com",
  "digitalLiteracy": "intermediate",
  "networkProfile": "4G_GOOD",
  "deviceType": "android_mid",
  "incomeLevel": "medium",
  "patienceScore": 0.7,
  "retryThreshold": 3,
  "portalUrl": "http://host.docker.internal:3000/mock-portal/index.html",
  "scenarioId": "scenario-001"
}
```

## Building the Docker Image

```bash
cd simulation-agent
docker build -t simulation-agent:latest .
```

## Running Locally (for testing)

```bash
# Install dependencies
npm install

# Install Playwright browsers
npm run install:playwright

# Set environment variables and run
export MERCHANT_PROFILE='{"merchantId":"M001","digitalLiteracy":"intermediate","networkProfile":"4G_GOOD","deviceType":"android_mid","incomeLevel":"medium","patienceScore":0.7,"retryThreshold":3,"portalUrl":"file:///C:/Users/brian/Downloads/lipa-na-mpesa-portal.html"}'
export INSIGHT_SERVICE_URL="http://localhost:3000"

npm start
```

## Running in Docker

```bash
docker run --rm \
  -e MERCHANT_PROFILE='{"merchantId":"M001",...}' \
  -e INSIGHT_SERVICE_URL="http://host.docker.internal:3000" \
  simulation-agent:latest
```

## Simulation Steps

1. **Navigate to Portal**: Loads the portal URL with network delay simulation
2. **Fill Business Information**: Enters business name, type, and location
3. **Fill Contact Information**: Enters phone and email with validation
4. **Handle Documentation**: Simulates document upload (may show confusion for basic users)
5. **Submit Application**: Final submission with success probability calculation

## Events Sent to Insight Service

- `PAGE_LOAD`: Portal page loaded successfully
- `VALIDATION_ERROR`: Form validation error occurred
- `FIELD_FILLED`: Form field completed
- `DOCUMENT_UPLOAD_CONFUSION`: User struggling with document upload
- `ONBOARDING_SUMMARY`: Final summary with success/failure status

## Success Probability Factors

- Base rate: 70%
- Digital literacy: +20% (advanced), +10% (intermediate)
- Network quality: -20% (2G_EDGE), -10% (3G_POOR)
- Device type: +5% (iOS)
- Patience score: +10% per point

## Exit Codes

- `0`: Onboarding completed successfully
- `1`: Onboarding failed or error occurred

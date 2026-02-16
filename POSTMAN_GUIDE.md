# Postman Testing Guide - Digital Twin Simulation V2

## Base URL
```
http://localhost:3001
```

## Endpoints

### 1. Health Check
**GET** `/health`

**Description:** Check if the merchant generator is running and how many merchants are loaded.

**Postman Setup:**
- Method: `GET`
- URL: `http://localhost:3001/health`
- Headers: None required

**Expected Response:**
```json
{
  "status": "healthy",
  "merchantsLoaded": 8
}
```

---

### 2. Get Merchants from Default CSV
**GET** `/generate-merchants-from-csv`

**Description:** Returns merchant profiles loaded from the default CSV file (`data/merchants.csv`).

**Postman Setup:**
- Method: `GET`
- URL: `http://localhost:3001/generate-merchants-from-csv`
- Headers: None required

**Expected Response:**
```json
[
  {
    "merchantId": "M001",
    "incomeLevel": "low",
    "digitalLiteracy": "basic",
    "deviceType": "android_low_end",
    "networkProfile": "3G_POOR",
    "patienceScore": 0.3,
    "retryThreshold": 3,
    "issueType": "pin_reset"
  },
  {
    "merchantId": "M002",
    "incomeLevel": "medium",
    "digitalLiteracy": "intermediate",
    "deviceType": "android_mid",
    "networkProfile": "4G_GOOD",
    "patienceScore": 0.7,
    "retryThreshold": 2,
    "issueType": "statement_request"
  }
  // ... more merchants
]
```

---

### 3. Upload Custom CSV File
**POST** `/generate-merchants-from-csv`

**Description:** Upload a custom CSV file and generate merchant profiles from it.

**Postman Setup:**
1. Method: `POST`
2. URL: `http://localhost:3001/generate-merchants-from-csv`
3. Headers: None required (Postman auto-sets Content-Type for form-data)
4. Body:
   - Select `form-data`
   - Add a key named `csvFile`
   - Change type from "Text" to "File" (dropdown on the right)
   - Click "Select Files" and choose one of these CSV files:
     - `data/merchants.csv` (8 merchants - default)
     - `data/merchants_large.csv` (15 merchants)
     - `data/merchants_high_income.csv` (5 high-income merchants)
     - `data/merchants_low_income.csv` (5 low-income merchants)

**Expected Response:**
```json
{
  "success": true,
  "merchantCount": 8,
  "merchants": [
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
    // ... more merchants
  ]
}
```

---

## Step-by-Step: Running the Full System

### Step 1: Start Merchant Generator
Open Terminal 1:
```bash
cd merchant-generator
node index.js
```

Wait for:
```
🚀 Merchant Generator V2 - CSV-Driven
==================================================
Server running on http://localhost:3001
✅ Loaded 8 merchants into cache
```

### Step 2: Test with Postman
1. Open Postman
2. Test the health endpoint: `GET http://localhost:3001/health`
3. Get merchants: `GET http://localhost:3001/generate-merchants-from-csv`
4. (Optional) Upload a different CSV: `POST http://localhost:3001/generate-merchants-from-csv`

### Step 3: Run Simulation Orchestrator
Open Terminal 2:
```bash
cd simulation-orchestrator
node index.js
```

This will:
- Fetch merchants from the generator API
- Spawn Docker containers for each merchant
- Display simulation results in real-time

---

## Testing Different Scenarios

### Scenario 1: Default Merchants (Mixed Profiles)
1. Keep default CSV loaded
2. Run orchestrator
3. Observe varied behavior across different income/literacy levels

### Scenario 2: High-Income Merchants Only
1. In Postman: `POST http://localhost:3001/generate-merchants-from-csv`
2. Upload `data/merchants_high_income.csv`
3. Run orchestrator
4. Observe: Higher success rates, better experience scores

### Scenario 3: Low-Income Merchants Only
1. In Postman: `POST http://localhost:3001/generate-merchants-from-csv`
2. Upload `data/merchants_low_income.csv`
3. Run orchestrator
4. Observe: More retries, lower experience scores, longer completion times

### Scenario 4: Large Dataset
1. In Postman: `POST http://localhost:3001/generate-merchants-from-csv`
2. Upload `data/merchants_large.csv`
3. Run orchestrator
4. Observe: 15 containers spawned sequentially

---

## Postman Collection (Import This)

Create a new collection in Postman and add these requests:

```json
{
  "info": {
    "name": "Digital Twin Simulation V2",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "http://localhost:3001/health",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3001",
          "path": ["health"]
        }
      }
    },
    {
      "name": "Get Merchants from CSV",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "http://localhost:3001/generate-merchants-from-csv",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3001",
          "path": ["generate-merchants-from-csv"]
        }
      }
    },
    {
      "name": "Upload Custom CSV",
      "request": {
        "method": "POST",
        "header": [],
        "body": {
          "mode": "formdata",
          "formdata": [
            {
              "key": "csvFile",
              "type": "file",
              "src": "data/merchants.csv"
            }
          ]
        },
        "url": {
          "raw": "http://localhost:3001/generate-merchants-from-csv",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3001",
          "path": ["generate-merchants-from-csv"]
        }
      }
    }
  ]
}
```

---

## Troubleshooting

### Error: "CSV file not found"
- Make sure you're in the project root directory
- Check that `data/merchants.csv` exists
- Try uploading a CSV via POST endpoint

### Error: "Failed to fetch merchants"
- Ensure merchant generator is running on port 3001
- Check terminal for error messages
- Test health endpoint first

### Error: "Docker image not found"
- Run: `cd simulation-agent && docker build -t simulation-agent:latest .`
- Verify: `docker images | findstr simulation-agent`

---

## Quick Command Reference

```bash
# Start merchant generator
cd merchant-generator && node index.js

# Start orchestrator (in new terminal)
cd simulation-orchestrator && node index.js

# Test with curl (alternative to Postman)
curl http://localhost:3001/health
curl http://localhost:3001/generate-merchants-from-csv

# Upload CSV with curl
curl -X POST -F "csvFile=@data/merchants_large.csv" http://localhost:3001/generate-merchants-from-csv
```

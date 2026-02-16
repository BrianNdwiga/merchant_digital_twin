# Quick Start Guide - Running with Nodemon

## What is Nodemon?

Nodemon automatically restarts your Node.js application when file changes are detected. Perfect for development!

## Running the Project

### Option 1: Development Mode (with auto-reload)

**Terminal 1 - Merchant Generator:**
```bash
cd merchant-generator
npm run dev
```

You'll see:
```
[nodemon] starting `node index.js`
🚀 Merchant Generator V2 - CSV-Driven
==================================================
Server running on http://localhost:3001
✅ Loaded 8 merchants into cache
[nodemon] watching path(s): index.js csvProcessor.js ../data/*.csv
```

Now any changes to:
- `index.js`
- `csvProcessor.js`
- CSV files in `data/` folder

Will automatically restart the server!

**Terminal 2 - Simulation Orchestrator:**
```bash
cd simulation-orchestrator
npm run dev
```

Note: The orchestrator runs once and exits, so nodemon will restart it each time you save changes to `index.js`.

---

### Option 2: Production Mode (no auto-reload)

**Terminal 1:**
```bash
cd merchant-generator
npm start
```

**Terminal 2:**
```bash
cd simulation-orchestrator
npm start
```

---

## Testing the Auto-Reload

### Test 1: Modify CSV Data
1. Start merchant generator with `npm run dev`
2. Open `data/merchants.csv` in your editor
3. Change a value (e.g., change patience_score from 0.3 to 0.5)
4. Save the file
5. Watch the terminal - nodemon will restart automatically
6. Test in Postman: `GET http://localhost:3001/generate-merchants-from-csv`
7. You'll see the updated data!

### Test 2: Modify Code
1. Open `merchant-generator/index.js`
2. Change the console.log message on line 82
3. Save the file
4. Watch the terminal restart
5. See your new message!

---

## Nodemon Configuration

### Merchant Generator (`merchant-generator/nodemon.json`)
```json
{
  "watch": [
    "index.js",
    "csvProcessor.js",
    "../data/*.csv"
  ],
  "ext": "js,json,csv",
  "ignore": [
    "node_modules/**",
    "../data/uploaded_*.csv"
  ],
  "delay": "1000"
}
```

**What it does:**
- Watches JavaScript, JSON, and CSV files
- Ignores node_modules and uploaded CSV files
- Waits 1 second after changes before restarting (prevents multiple restarts)

### Simulation Orchestrator (`simulation-orchestrator/nodemon.json`)
```json
{
  "watch": [
    "index.js"
  ],
  "ext": "js,json",
  "ignore": [
    "node_modules/**"
  ],
  "delay": "1000"
}
```

---

## Complete Workflow

### Step 1: Start Services in Dev Mode

**Terminal 1:**
```bash
cd merchant-generator
npm run dev
```

**Terminal 2:**
```bash
cd simulation-orchestrator
npm run dev
```

### Step 2: Test with Postman

1. `GET http://localhost:3001/health` - Check status
2. `GET http://localhost:3001/generate-merchants-from-csv` - Get merchants
3. `POST http://localhost:3001/generate-merchants-from-csv` - Upload custom CSV

### Step 3: Watch the Magic

The orchestrator will:
1. Fetch merchants from the generator
2. Spawn Docker containers
3. Display simulation results
4. Exit (nodemon will wait for next change)

---

## Useful Nodemon Commands

### Manually Restart
While nodemon is running, type:
```
rs
```
Then press Enter to manually restart.

### Stop Nodemon
Press `Ctrl + C` in the terminal.

### View Nodemon Help
```bash
npx nodemon --help
```

---

## Troubleshooting

### Nodemon not found
```bash
cd merchant-generator
npm install
```

### Too many restarts
- Check your `nodemon.json` configuration
- Increase the `delay` value
- Make sure you're not editing files in a loop

### Changes not detected
- Verify the file is in the `watch` array
- Check the file extension is in the `ext` list
- Try manually restarting with `rs`

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with nodemon (auto-reload) |
| `npm start` | Start normally (no auto-reload) |
| `rs` + Enter | Manually restart nodemon |
| `Ctrl + C` | Stop nodemon |

---

## Development Tips

1. **Keep merchant generator running** - It's a server that should stay up
2. **Run orchestrator when needed** - It executes once and exits
3. **Edit CSV files freely** - Changes reload automatically
4. **Test incrementally** - Make small changes and test
5. **Watch the logs** - Nodemon shows what triggered the restart

---

## Next Steps

1. Start both services with `npm run dev`
2. Open Postman and test the endpoints
3. Try modifying `data/merchants.csv`
4. Watch the auto-reload happen
5. Run the orchestrator to see simulations
6. Experiment with different CSV files!

Happy coding! 🚀

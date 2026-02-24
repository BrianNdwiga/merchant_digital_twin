# Quick Start Guide

## Issue: Playwright Browsers Not Installed in Docker

The error you're seeing indicates that the Docker image needs to be rebuilt with Playwright browsers installed.

## Solution: Force Rebuild the Docker Image

The key is to use `--no-cache` to ensure a fresh build.

### Windows:
```bash
rebuild-agent.bat
```

### Linux/Mac:
```bash
chmod +x rebuild-agent.sh
./rebuild-agent.sh
```

### Manual Rebuild (if scripts don't work):
```bash
cd simulation-agent
docker rmi simulation-agent:latest
docker build --no-cache -t simulation-agent:latest .
cd ..
```

## Important Notes

1. **Use the Playwright base image**: The Dockerfile now uses `mcr.microsoft.com/playwright:v1.58.2-jammy` which has all browsers pre-installed
2. **Force clean build**: The `--no-cache` flag ensures Docker doesn't use cached layers
3. **This will take 2-5 minutes**: The first build downloads the base image and installs dependencies
4. **Mock Portal**: The portal HTML is served at `http://localhost:3000/mock-portal/index.html` - edit `mock-portal/index.html` to modify portal behavior

## After Rebuilding

1. The Docker image will have Playwright and Chromium properly installed
2. Run your simulation again from the UI
3. The dashboard should now show data (even for failed simulations)

## What Was Fixed

1. **Docker Base Image**: Changed from `node:20-bookworm` to `mcr.microsoft.com/playwright:v1.40.0-jammy`
2. **Playwright Installation**: Using the official Playwright Docker image that comes with browsers pre-installed
3. **Metrics Module**: Now accepts both `SUMMARY` and `ONBOARDING_SUMMARY` event types
4. **Dashboard**: Added null checks to prevent `.toFixed()` errors
5. **Failed Simulations**: Dashboard now shows data even when simulations fail

## Expected Behavior After Fix

- Agents will successfully launch Chromium browser
- Agents will navigate to your local portal file
- Events will be logged in real-time
- Dashboard will display metrics (success rate, completion time, etc.)
- Live Insights will show agent activity

## Troubleshooting

### If Docker build fails:
- Make sure Docker Desktop is running
- Check that you have internet connection (to download base images)
- Try: `docker system prune -a` to clean up old images (WARNING: removes all unused images)

### If you see "Executable doesn't exist" after rebuild:
- Make sure you ran `rebuild-agent.bat` (not just `docker build`)
- The script removes the old image first with `docker rmi simulation-agent:latest`
- Then builds fresh with `--no-cache` flag

### If simulations still fail after proper rebuild:
- Check that the portal file exists at: `C:/Users/brian/Downloads/lipa-na-mpesa-portal.html`
- Verify the file path in the Portal Configuration field
- Check Docker logs: `docker logs <container-name>`

### If dashboard shows no data:
- Check browser console for errors (F12)
- Verify backend is running on port 3000
- Check that events are being received in backend terminal
- Try clearing events: `curl -X DELETE http://localhost:3000/insights/clear`

## Verify the Build

After rebuilding, you can verify the image has Playwright installed:

```bash
docker run --rm simulation-agent:latest npx playwright --version
```

Should output: `Version 1.40.0`

## Next Steps

1. **IMPORTANT**: Run `rebuild-agent.bat` to force a clean rebuild
2. Wait for the build to complete (2-5 minutes)
3. Start the services: `start-all.bat` (or `start-all.sh`)
4. Run a simulation from the UI
5. View results in Dashboard and Live Insights tabs

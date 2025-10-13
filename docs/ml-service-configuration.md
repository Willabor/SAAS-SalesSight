# ML Service Configuration Guide

## Issue: ML Service Connection Problems

### Problem Description
The application has both a local ML service (running on port 8000) and a production ML service URL. When the `ML_SERVICE_URL` environment secret is set in Replit, it overrides the `.env` file configuration, causing the Node server to attempt connections to the wrong ML service endpoint.

### Symptoms
- Logs show: "Attempting to fetch from ML service: https://inventory-ml-service-production.up.railway.app/..."
- ML service returns 404 errors
- App falls back to database-only mode with message: "ML service unavailable"
- Local ML service is running and healthy on port 8000 but not being used

### Root Cause
**Environment variable precedence order:**
1. Replit Secrets (highest priority) ✓ Currently set to production URL
2. System environment variables
3. .env file (lowest priority) ✓ Set to `http://localhost:8000`

When `ML_SERVICE_URL` exists in Replit Secrets, it overrides the `.env` file setting.

### Solution

#### For Local Development

**Step 1: Remove the ML_SERVICE_URL secret**
1. Open the Replit workspace
2. Click on "Tools" in the left sidebar
3. Navigate to the "Secrets" section
4. Find "App Secrets" tab
5. Locate `ML_SERVICE_URL` secret
6. Click the three vertical dots (⋮) menu next to it
7. Select "Delete"
8. Confirm deletion

**Step 2: Verify .env file configuration**
The `.env` file should contain:
```bash
# For local development - explicitly set to localhost
ML_SERVICE_URL=http://localhost:8000
```

**Step 3: Restart the application**
After removing the secret, restart the workflow to apply changes.

**Step 4: Verify ML service connection**
Check the logs for:
- ✅ ML service running on port 8000
- ✅ Node server using `http://localhost:8000` for ML requests
- ✅ No 404 errors from ML service

#### For Production Deployment

When deploying to production, you should:
1. Set the `ML_SERVICE_URL` secret to: `https://inventory-ml-service-production.up.railway.app`
2. Or configure it in your production environment settings

### Environment Configuration Reference

#### Local Development Setup
```bash
# .env file
ML_SERVICE_URL=http://localhost:8000
```

**Replit Secrets:** None (or ML_SERVICE_URL deleted)

#### Production Setup
```bash
# .env file (can be commented out)
# ML_SERVICE_URL=http://localhost:8000
```

**Replit Secrets:**
- `ML_SERVICE_URL` = `https://inventory-ml-service-production.up.railway.app`

### How the Application Uses ML_SERVICE_URL

The Node server checks for the ML service URL in this order:
```javascript
// server/routes.ts (multiple locations)
const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
```

This means:
- If `ML_SERVICE_URL` is set (via Replit Secret or environment), it uses that value
- If `ML_SERVICE_URL` is not set, it defaults to `http://localhost:8000`

### Current Services

**Local ML Service:**
- URL: `http://localhost:8000`
- Health Check: `http://localhost:8000/health`
- Status: Running (when workflow is active)

**Production ML Service:**
- URL: `https://inventory-ml-service-production.up.railway.app`
- Hosted on: Railway
- Status: Returns 404 (endpoint may have changed or service down)

### Troubleshooting

**Issue: ML service still showing 404 after removing secret**
1. Verify the secret was actually deleted (check Secrets panel)
2. Restart the application workflow completely
3. Check logs for the URL being used: `grep "Attempting to fetch from ML service" /tmp/logs/*`

**Issue: Local ML service not starting**
1. Check if port 8000 is already in use: `ps aux | grep uvicorn`
2. Kill blocking processes: `pkill -9 -f "uvicorn main:app"`
3. Restart workflow

**Issue: Want to temporarily use production ML service**
1. Add Replit Secret: `ML_SERVICE_URL` = `https://inventory-ml-service-production.up.railway.app`
2. Restart application
3. Remember to remove it when returning to local development

### Quick Commands

**Check if ML service is running locally:**
```bash
curl http://localhost:8000/health
```

**Check what ML_SERVICE_URL is set to:**
```bash
echo $ML_SERVICE_URL
```

**View recent ML service requests in logs:**
```bash
grep "ML service" /tmp/logs/Start_application*.log | tail -20
```

### Related Files
- `.env` - Local environment configuration
- `server/routes.ts` - ML service endpoint usage
- `ml_service/main.py` - ML service application
- `package.json` - Script to run ML service (`npm run dev:ml`)

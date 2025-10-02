# Railway Settings Checklist for ML Service

## Issue: Service runs internally but returns 502 on public URL

### What We Know
- ✓ Service builds successfully (Docker)
- ✓ Service starts and runs (logs show "Uvicorn running on http://0.0.0.0:8080")
- ✓ Internal health checks pass (200 OK from Railway's internal network)
- ✗ Public URL returns 502 "connection refused"

**This indicates a Railway networking configuration issue.**

---

## Required Railway Settings

### 1. Environment Variables

Go to: **Railway Dashboard → Project → Variables Tab**

**Required:**
- `DATABASE_URL` = Your Neon PostgreSQL connection string
  ```
  postgresql://neondb_owner:npg_...@...neon.tech/neondb?sslmode=require
  ```

**Optional (Railway usually sets automatically):**
- `PORT` = Should be set by Railway automatically (don't manually set unless needed)

**To verify:**
```bash
# In Railway logs, you should see:
Port: 8080  # or whatever PORT Railway assigned
```

---

### 2. Networking Configuration

Go to: **Railway Dashboard → Project → Settings → Networking**

**Check these settings:**

1. **Public Networking:**
   - Must be **ENABLED** ✓
   - If disabled, enable it

2. **Public Port / Exposed Port:**
   - Look for a field called "Public Port", "Exposed Port", or "Internal Port"
   - Should be set to: **8080** (or match the PORT environment variable)
   - If blank or different, update it

3. **Public Domain:**
   - Should show: `inventory-ml-service-production.up.railway.app`
   - Status should be: **Active** or **Ready**
   - If shows error, try "Generate Domain" button

4. **Health Check Path:**
   - Should be set to: `/health`
   - Timeout: `300` seconds
   - This is configured in `railway.json` but verify in dashboard

---

### 3. Service/Deployment Settings

Go to: **Railway Dashboard → Project → Settings → Service**

**Check:**

1. **Builder:**
   - Should show: **Dockerfile**
   - Path: `Dockerfile`

2. **Root Directory:**
   - Should be: `/` (repository root)
   - Or blank (defaults to root)

3. **Watch Paths:**
   - Should be: `**` (watch all files)
   - Or blank (defaults to all)

---

### 4. Docker-Specific Settings

Since you're using Docker, Railway should detect:

1. **Dockerfile CMD:**
   ```bash
   uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080} --log-level info
   ```

2. **EXPOSE Statement:**
   ```dockerfile
   EXPOSE ${PORT:-8080}
   ```

**Important:** Railway ignores the EXPOSE statement and uses its own port detection. The service MUST bind to `0.0.0.0:$PORT` where `$PORT` is the environment variable Railway provides.

---

### 5. Common Issues & Fixes

#### Issue: "Connection Refused" Errors

**Symptom:** Internal health check passes, public URL fails

**Possible Causes:**

1. **Port Mismatch:**
   - Service listening on port 8080
   - Railway proxy trying to connect on different port
   - **Fix:** Set explicit port in Railway dashboard

2. **Public Networking Disabled:**
   - Service not exposed to internet
   - **Fix:** Enable Public Networking in dashboard

3. **Domain Not Configured:**
   - Railway domain not properly linked to service
   - **Fix:** Generate new domain or check domain status

4. **Firewall/Security Group:**
   - Railway's proxy blocked from accessing container
   - **Fix:** Check Railway's status page, contact support

#### Issue: Health Check Failing

**Symptom:** Deployment shows "Unhealthy" status

**Check:**
- Health check path is `/health` (not `/health/`)
- Health check timeout is sufficient (300s for slow startup)
- Service actually responds on `/health` endpoint

#### Issue: Build Succeeds But Deploy Fails

**Symptom:** Docker builds but container won't start

**Check Railway Deploy Logs for:**
- Import errors (missing dependencies)
- Database connection errors (DATABASE_URL not set)
- Port binding errors (port already in use)
- Permission errors (file access issues)

---

## Debugging Steps

### Step 1: Verify Service is Running

**In Railway Deploy Logs, look for:**
```
INFO:     Uvicorn running on http://0.0.0.0:8080
INFO:     100.64.0.2:XXXXX - "GET /health HTTP/1.1" 200 OK
```

If you see this, service IS running internally.

### Step 2: Check Public Port Configuration

**Railway needs to know which port to route to.**

Look for settings called:
- "Public Port"
- "Exposed Port"
- "Internal Port"
- "Service Port"

**Set to:** 8080 (or whatever your logs show)

### Step 3: Test Public URL

```bash
# Test root endpoint
curl https://inventory-ml-service-production.up.railway.app/

# Expected response:
{
  "service": "Inventory ML Service",
  "version": "1.0.0",
  "status": "running",
  ...
}
```

If still 502, proceed to Step 4.

### Step 4: Generate New Domain

Sometimes Railway domains get stuck in a bad state:

1. Go to Railway Dashboard → Settings → Networking
2. Find current domain: `inventory-ml-service-production.up.railway.app`
3. Click "Generate Domain" to create new one
4. Test new domain
5. If it works, update `ML_SERVICE_URL` in Replit

### Step 5: Check Railway Status

Visit: https://status.railway.app/

- Check for any ongoing incidents
- Check for maintenance in your region (us-east4)

### Step 6: Contact Railway Support

If all else fails:

**Railway Discord:** https://discord.gg/railway
**Railway Help:** https://help.railway.app/

**Message Template:**
```
Hi! My service is running and passing internal health checks (200 OK),
but the public domain returns 502 "connection refused" errors.

Service: inventory-ml-service-production.up.railway.app
Region: us-east4
Builder: Docker
Port: 8080

Deploy logs show:
- Uvicorn running on http://0.0.0.0:8080
- Internal health checks returning 200 OK
- No errors during startup

But public URL gives: "connection refused"

Error logs show: {"error":"connection refused"} on deploymentInstanceID

I've verified:
- Public Networking is enabled
- Health check path is /health
- Service binds to 0.0.0.0:$PORT
- Environment variables are set

Please help troubleshoot the proxy/routing issue.
```

---

## Expected Working Configuration

Once everything is configured correctly:

**Environment Variables:**
- `DATABASE_URL` = (your Neon connection string)
- `PORT` = (automatically set by Railway, usually 8080 or random)

**Networking:**
- Public Networking: ENABLED
- Public Port: 8080 (or matches $PORT)
- Domain: Active

**Deploy Logs:**
```
Starting Container
INFO:     Started server process [1]
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8080
```

**Public URL Test:**
```bash
$ curl https://inventory-ml-service-production.up.railway.app/health
{"status":"healthy","model_loaded":false,...}
```

---

## Next Steps After Fix

Once the public URL responds correctly:

1. **Train the Model:**
   ```bash
   curl -X POST https://inventory-ml-service-production.up.railway.app/api/ml/train \
     -H "Content-Type: application/json" \
     -d '{"days_back": 90}'
   ```

2. **Update Replit Secrets:**
   - Key: `ML_SERVICE_URL`
   - Value: `https://inventory-ml-service-production.up.railway.app`

3. **Test Frontend:**
   - Run Replit app
   - Go to Insights → Inventory Turnover
   - Toggle "Use AI" ON
   - Verify recommendations load with confidence scores

---

**Last Updated:** 2025-10-02 09:55 UTC

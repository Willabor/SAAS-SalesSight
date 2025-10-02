# 🚀 Deployment Guide - Excel Sales Data Processor with ML

This guide explains how to deploy your application with the integrated ML service.

## 📋 Table of Contents

1. [Local Development](#local-development)
2. [Production Deployment Options](#production-deployment-options)
3. [Environment Variables](#environment-variables)
4. [Troubleshooting](#troubleshooting)

---

## 🖥️ Local Development

### First Time Setup

**Step 1: Install Python Dependencies**
```bash
npm run ml:install
```

**Step 2: Train Initial ML Model** (Optional - can skip for testing)
```bash
npm run ml:train
```
This takes 30-60 seconds. You can skip this initially - the app will work with the toggle off.

**Step 3: Start Everything**
```bash
npm run dev
```

This single command now starts **BOTH**:
- ✅ Node.js backend (port 5000) - Cyan logs
- ✅ Python ML service (port 8000) - Magenta logs

**Alternative: Run Without ML**
```bash
npm run dev:no-ml
```
Only starts Node.js. The "Use AI" toggle will fallback to rule-based recommendations.

---

## 🌐 Production Deployment Options

### Option 1: Docker Compose (Recommended - Easiest)

**Perfect for:** VPS (DigitalOcean, Linode, AWS EC2), self-hosted

```bash
# 1. Create .env file with your production values
cp .env.example .env
# Edit .env with your DATABASE_URL, SESSION_SECRET, etc.

# 2. Build and start services
docker-compose up -d

# 3. Train ML model (first time only)
docker-compose exec ml-service python -c "from models.transfer_predictor import TransferPredictor; p = TransferPredictor(); p.train(); p.save_model()"
```

**Your app is now live:**
- Frontend/API: http://your-domain.com:5000
- ML Service: http://your-domain.com:8000 (internal only)

**To stop:**
```bash
docker-compose down
```

**To view logs:**
```bash
docker-compose logs -f
```

---

### Option 2: Railway (Simple, Free Tier Available)

Railway can run both Node.js and Python services together.

**Step 1: Install Railway CLI**
```bash
npm i -g @railway/cli
railway login
```

**Step 2: Create New Project**
```bash
railway init
```

**Step 3: Add Services**

You'll need to create **TWO services** in Railway:

**Service 1: Node Backend**
- Root Directory: `/`
- Build Command: `npm run build`
- Start Command: `npm start`
- Environment Variables: Add all from `.env.example`
- Port: 5000

**Service 2: ML Service**
- Root Directory: `/ml_service`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn main:app --host 0.0.0.0 --port 8000`
- Environment Variables: `DATABASE_URL` (same as Service 1)
- Port: 8000

**Step 4: Link Services**
In Railway dashboard:
- Go to Node Backend → Variables
- Add: `ML_SERVICE_URL=http://ml-service.railway.internal:8000`

**Step 5: Deploy**
```bash
railway up
```

---

### Option 3: Render (Free Tier, Good for Demos)

**Service 1: Web Service (Node.js)**
- Name: `inventory-backend`
- Environment: `Node`
- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Environment Variables: Add all from `.env.example`

**Service 2: Web Service (Python)**
- Name: `inventory-ml`
- Environment: `Python 3`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn main:app --host 0.0.0.0 --port 8000`
- Root Directory: `ml_service`
- Environment Variables: `DATABASE_URL`

**Connect Services:**
- In `inventory-backend` environment variables:
- Add: `ML_SERVICE_URL=https://inventory-ml.onrender.com`

---

### Option 4: Vercel + Railway (Hybrid)

**Vercel** (Frontend + API Routes)
- Deploy Node.js backend to Vercel
- Add environment variable: `ML_SERVICE_URL=<your-railway-ml-url>`

**Railway** (Just ML Service)
- Deploy only the `ml_service/` folder
- Get the public URL
- Use that URL in Vercel's `ML_SERVICE_URL`

---

## 🔐 Environment Variables

### Required for All Deployments

```bash
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:pass@host:5432/db

# Session Security
SESSION_SECRET=generate-random-64-char-string

# Replit Auth (if using Replit)
REPL_ID=your-repl-id
REPLIT_DOMAINS=your-domain.repl.co
ISSUER_URL=https://replit.com/oidc

# ML Service Connection
ML_SERVICE_URL=http://ml-service:8000  # Docker Compose
# OR
ML_SERVICE_URL=https://your-ml-service.railway.app  # Railway
# OR
ML_SERVICE_URL=http://localhost:8000  # Local dev
```

### How to Generate SESSION_SECRET
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🔧 Post-Deployment: Train ML Model

After first deployment, train the ML model:

**Docker Compose:**
```bash
docker-compose exec ml-service python -c "from models.transfer_predictor import TransferPredictor; p = TransferPredictor(); p.train(); p.save_model()"
```

**Railway/Render:**
Use the platform's shell/console:
```bash
cd ml_service
python -c "from models.transfer_predictor import TransferPredictor; p = TransferPredictor(); p.train(); p.save_model()"
```

**Or use the API:**
```bash
curl -X POST https://your-ml-service-url.com/api/ml/train \
  -H "Content-Type: application/json" \
  -d '{"days_back": 90}'
```

---

## 🐛 Troubleshooting

### "Use AI" Toggle Shows No Results

**Check 1: Is ML service running?**
```bash
curl http://localhost:8000/health
# Should return: {"status": "healthy", "model_loaded": true}
```

**Check 2: Is model trained?**
```bash
curl http://localhost:8000/api/ml/model-info
# Should return model details, not "No model loaded"
```

**Check 3: Check ML_SERVICE_URL**
- In your `.env` file, make sure `ML_SERVICE_URL` points to the correct ML service URL
- Local: `http://localhost:8000`
- Docker: `http://ml-service:8000`
- Production: `https://your-ml-domain.com`

### ML Service Crashes on Startup

**Missing dependencies:**
```bash
cd ml_service
pip install -r requirements.txt
```

**Database connection issues:**
- Verify `DATABASE_URL` is set correctly
- Check that database has data (run a sales query)

### "Model not loaded" Error

Train a model first:
```bash
npm run ml:train
```

Or the model will auto-fallback to rule-based recommendations (no ML).

---

## 📊 Monitoring ML Performance

### Check Model Info
```bash
curl http://localhost:8000/api/ml/model-info
```

Returns:
```json
{
  "loaded": true,
  "model_version": "v20250101_120000",
  "training_date": "2025-01-01T12:00:00",
  "metrics": {
    "accuracy": 0.82,
    "precision": 0.79,
    "recall": 0.75,
    "roc_auc": 0.87
  }
}
```

### Retrain Weekly (Recommended)

Add a cron job or scheduled task:
```bash
# Railway/Render: Add cron service
0 2 * * 0 curl -X POST https://your-ml-url.com/api/ml/train -H "Content-Type: application/json" -d '{"days_back": 90}'
```

---

## 🎯 Quick Start Checklist

- [ ] Install dependencies: `npm install && npm run ml:install`
- [ ] Set up `.env` file with `DATABASE_URL` and `ML_SERVICE_URL`
- [ ] Train model: `npm run ml:train` (optional for initial testing)
- [ ] Start dev server: `npm run dev`
- [ ] Test "Use AI" toggle in Inventory Turnover page
- [ ] For production: Choose deployment option and follow steps above

---

## 📞 Need Help?

- **ML Service not starting?** Check Python version (needs 3.8+): `python --version`
- **No predictions?** Model might not be trained yet - this is OK, it falls back to rules
- **Deployment issues?** Check platform-specific logs in your hosting dashboard

---

**You're all set! 🎉**

The "Use AI" toggle in the Transfer Recommendations card will now work once the ML service is running and a model is trained.

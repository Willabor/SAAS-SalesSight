# ⚡ GitHub Deployment - Quick Start

**Deploy your ML service to GitHub + Railway/Render in 5 minutes**

---

## 🎯 Option 1: Separate ML Service (Recommended for Production)

### Step 1: Push ML Service to GitHub

```bash
# From Replit Shell
cd ml_service

# Initialize git
git init
git add .
git commit -m "Initial ML service"

# Create GitHub repo and push
# Option A: GitHub CLI
gh repo create inventory-ml-service --public --source=. --push

# Option B: Manual (create repo on github.com first)
git remote add origin https://github.com/YOUR_USERNAME/inventory-ml-service.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy to Railway (Free $5 credit)

1. Go to [railway.app](https://railway.app)
2. **New Project** → **Deploy from GitHub**
3. Select `inventory-ml-service` repo
4. Add environment variable:
   - `DATABASE_URL`: Your PostgreSQL URL
5. **Deploy** (auto-detects Python)
6. Copy your service URL: `https://xxx.railway.app`

### Step 3: Connect to Replit App

In **Replit Secrets** (🔒 icon), add:
- Key: `ML_SERVICE_URL`
- Value: `https://xxx.railway.app`

### Step 4: Train Model & Test

```bash
# Train model
curl -X POST https://xxx.railway.app/api/ml/train

# Test predictions
curl -X POST https://xxx.railway.app/api/ml/predict-transfers?limit=5
```

### Step 5: Use "Use AI" Toggle

1. Open your Replit app
2. Go to **Insights → Inventory Turnover**
3. Toggle **"Use AI"** ON
4. See ML predictions! 🎉

---

## 🎯 Option 2: Keep ML on Replit (Easier for Development)

If you want everything on Replit (not recommended for production):

### Update `.replit` deployment:

```toml
[deployment]
deploymentTarget = "autoscale"
build = ["sh", "-c", "npm install && npm run build && cd ml_service && pip install -r requirements.txt"]
run = ["sh", "-c", "npm run dev"]  # Runs both Node.js + ML
```

Then just click **"Deploy"** in Replit.

**Pros:** Simple, one-click deploy
**Cons:** Replit charges for Python compute, may be slower

---

## 📊 Comparison

| Approach | Cost | Speed | Complexity | Recommended For |
|----------|------|-------|------------|----------------|
| **ML on Railway** | Free tier ($5 credit) | Fast | Medium | Production |
| **ML on Render** | Free forever | Slow (sleeps) | Medium | Development |
| **ML on Replit** | Replit cycles | Medium | Easy | Testing only |

---

## 🔗 Files Created for GitHub Deployment

In `ml_service/` folder:
- ✅ `.gitignore` - Don't commit secrets
- ✅ `README.md` - Full documentation
- ✅ `DEPLOY_FROM_GITHUB.md` - Deployment guide
- ✅ `Dockerfile` - For container deployment
- ✅ `.env.example` - Environment template

---

## 💡 Quick Tips

### When using Railway/Render:

**Pros:**
- Free tier available
- Auto-deploys on git push
- Better for Python workloads
- Separate scaling for ML service

**Cons:**
- Need to manage two deployments (Replit app + ML service)
- Extra environment variable setup

### When using Replit for everything:

**Pros:**
- One deployment
- Click "Deploy" and done
- Easier for beginners

**Cons:**
- May cost more Replit cycles
- Less control over ML service
- Harder to scale independently

---

## ✅ Recommended Workflow

**For Production:**
1. Deploy ML service to Railway (from GitHub)
2. Deploy main app to Replit
3. Connect via `ML_SERVICE_URL`

**For Development:**
1. Run `npm run dev` in Replit (starts both)
2. Test locally
3. When ready, follow production workflow

---

## 🚀 Commands Cheat Sheet

```bash
# Local development (Replit)
npm run ml:install    # Install Python deps
npm run ml:train      # Train model
npm run dev           # Start both services

# GitHub deployment
cd ml_service
git init
git add .
git commit -m "Initial commit"
git push

# Test deployed service
curl https://your-ml-service.railway.app/health
curl -X POST https://your-ml-service.railway.app/api/ml/train

# Connect to main app
# Add to Replit Secrets:
# ML_SERVICE_URL=https://your-ml-service.railway.app
```

---

**Choose your path and deploy! 🎉**

- **Want simplest?** → Use Replit for everything (Option 2)
- **Want production-ready?** → Deploy ML to Railway (Option 1)

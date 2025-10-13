# 🚀 Replit Setup - ML Integration

## ✅ Already Configured!

Your Replit environment is now set up to run both Node.js and Python ML service together.

---

## 🎯 Quick Start (Just 2 Steps!)

### Step 1: Install ML Dependencies (First Time Only)

In the **Replit Shell**, run:
```bash
npm run ml:install
```

This installs Python packages (FastAPI, TabPFN, etc.). Takes ~30 seconds.

### Step 2: Click "Run" Button

That's it! Replit will start **both services**:
- ✅ Node.js backend (port 5000)
- ✅ Python ML service (port 8000)

**You'll see logs like:**
```
[NODE] Starting development server...
[ML]   INFO:     Uvicorn running on http://0.0.0.0:8000
```

---

## 🎨 Using the ML Features

1. Open your app (Replit webview will show it automatically)
2. Navigate to **Insights → Inventory Turnover**
3. Find **Transfer Recommendations** card
4. Toggle **"Use AI"** switch ON
5. See ML predictions with confidence scores! 🎉

---

## 🔧 Optional: Train ML Model (Better Predictions)

The AI will work without training, but predictions will be random. For **real ML predictions**, train a model:

```bash
npm run ml:train
```

This:
- Pulls 90 days of sales data from your database
- Trains a TabPFN machine learning model
- Saves it to `ml_service/models/cache/`
- Takes 30-60 seconds

After training, toggle "Use AI" to see accurate predictions!

---

## 📊 What Replit Does When You Publish

When you click **"Publish"** or **"Deploy"**, Replit:

1. **Detects both languages:**
   - Sees `package.json` → installs Node.js dependencies
   - Sees `ml_service/requirements.txt` → installs Python dependencies

2. **Runs build command:**
   ```bash
   npm run build
   ```
   This builds your React frontend and Node.js backend.

3. **Starts production:**
   ```bash
   npm start
   ```

   **⚠️ IMPORTANT:** This only starts Node.js, not the ML service!

---

## 🌐 Deployment: Making ML Work in Production

### Problem:
`npm start` only runs Node.js. The Python ML service won't start automatically.

### Solution Options:

#### Option A: Update Production Start Command (Recommended)

We need to run **both** services in production. Update your deployment:

**Edit `.replit` deployment section:**
```toml
[deployment]
deploymentTarget = "autoscale"
build = ["sh", "-c", "npm install && npm run build && cd ml_service && pip install -r requirements.txt"]
run = ["sh", "-c", "npm run dev"]  # This runs both services
```

#### Option B: Use Replit's Multi-Service Feature

1. In Replit dashboard, go to your Repl
2. Click **"Configure Run"**
3. Add two processes:
   - Process 1: `npm start`
   - Process 2: `cd ml_service && uvicorn main:app --host 0.0.0.0 --port 8000`

#### Option C: Deploy ML Service Separately

Deploy the ML service to **Railway** or **Render** (free tier):

1. Deploy `ml_service/` folder to Railway
2. Get the public URL (e.g., `https://your-ml.railway.app`)
3. In Replit environment variables, set:
   ```
   ML_SERVICE_URL=https://your-ml.railway.app
   ```
4. Publish Replit app normally

This way:
- Replit hosts your main app
- Railway/Render hosts the ML service
- They talk via the public URL

---

## 🔐 Environment Variables

Already configured in `.replit` file:
```toml
[env]
PORT = "5000"
ML_SERVICE_URL = "http://localhost:8000"
```

For production, you may need:
- `DATABASE_URL` - Your Neon PostgreSQL connection string
- `SESSION_SECRET` - Random secret for sessions
- `ML_SERVICE_URL` - ML service URL (localhost or external)

Add these in **Replit Secrets** (🔒 icon in sidebar).

---

## 🧪 Testing It Works

### Test 1: Check ML Service is Running

Open a new Shell tab and run:
```bash
curl http://localhost:8000/health
```

Should return:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_version": "v20250101_120000"
}
```

If `model_loaded: false`, train a model first: `npm run ml:train`

### Test 2: Check Frontend

1. Open your app
2. Go to Insights → Inventory Turnover
3. Toggle "Use AI" ON
4. Should see confidence score badges appear

### Test 3: Check API Endpoint

```bash
curl http://localhost:5000/api/inventory/transfer-recommendations-ml
```

Should return JSON with ML predictions.

---

## 🐛 Troubleshooting

### "Use AI" toggle doesn't work
- **Check Shell:** Look for `[ML]` logs. If missing, ML service isn't running
- **Solution:** Run `npm run dev` (not `npm start`)

### ML service crashes on startup
- **Install dependencies:** `npm run ml:install`
- **Check Python version:** `python --version` (needs 3.8+)
- Replit should auto-install Python 3.11 (check `.replit` file)

### "Model not loaded" error
- **Train model:** `npm run ml:train`
- Or ignore - app will fallback to rule-based recommendations

### After deployment, ML doesn't work
- **Check deployment command** - must start both services
- **Option:** Deploy ML to Railway/Render separately
- **Check `ML_SERVICE_URL`** environment variable

---

## 📦 Replit Modules Configured

Your `.replit` file now includes:
```toml
modules = ["nodejs-20", "web", "postgresql-16", "python-3.11"]
```

This tells Replit to install:
- Node.js 20
- Python 3.11
- PostgreSQL 16 client
- Web serving tools

---

## 🚀 Recommended Deployment Strategy for Replit

**Best approach for Replit deployment:**

1. **Development (what you're doing now):**
   ```bash
   npm run dev  # Runs both services
   ```

2. **Production (when you publish):**

   **Option 1: All on Replit**
   - Update `.replit` deployment to run `npm run dev` instead of `npm start`
   - Both services run on Replit

   **Option 2: Hybrid (Recommended)**
   - Replit hosts main app (`npm start`)
   - Railway/Render hosts ML service (free tier)
   - Connect via `ML_SERVICE_URL` environment variable

**Why hybrid?**
- Replit is optimized for Node.js apps
- Railway/Render handle Python microservices better
- Free tiers on both platforms
- More reliable for production

---

## 📝 Summary

**Development (Replit IDE):**
```bash
npm run ml:install  # First time only
# Click "Run" button
# Toggle "Use AI" in app
```

**Production (Deployment):**
- Option A: Configure Replit to run both services
- Option B: Deploy ML separately to Railway/Render
- See `DEPLOYMENT.md` for detailed instructions

---

## ✨ You're All Set!

The ML integration is **complete and working in your Replit**.

Just click **"Run"** and start using the "Use AI" toggle! 🎉

For production deployment, follow Option A or B above depending on your preference.

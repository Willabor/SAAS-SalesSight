# 🚀 Quick Start Guide - Multi-Dimensional Segmentation

## 30-Minute Setup

### Prerequisites
- PostgreSQL database with existing data
- Node.js backend with Express
- React frontend
- Existing tables: `item_list`, `sales_transactions`, `receiving_vouchers`, `receiving_lines`

### Step 1: Backup (5 minutes)
```bash
# Backup your database first!
pg_dump -U your_user your_database > backup_$(date +%Y%m%d).sql
```

### Step 2: Run Migration (2 minutes)
```bash
# Navigate to your project root
cd /path/to/your/project

# Run the migration
psql -U your_user -d your_database -f database/migrations/add_multidimensional_settings.sql

# Verify
psql -U your_user -d your_database -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'receiving_metrics_settings' AND column_name LIKE '%clearance%';"
```

**Expected output:**
```
          column_name           
--------------------------------
 clearance_min_inventory
 clearance_max_recent_sales
 clearance_min_days_since_received
 clearance_min_days_of_supply
```

### Step 3: Update Backend (5 minutes)
```bash
# Replace the backend route file
cp server/routes/receiving-metrics.ts server/routes/receiving-metrics.backup.ts
# Then paste the new receiving-metrics.ts content

# Update the API helper
cp lib/api.ts lib/api.backup.ts
# Then add the new calculateMetricsWithProgress function

# Update Excel export
cp lib/excelExport.ts lib/excelExport.backup.ts
# Then paste the new excelExport.ts content

# Restart your backend
npm run server:restart
# or
pm2 restart your-app
```

### Step 4: Update Frontend (5 minutes)
```bash
# Replace the settings component
cp client/src/pages/ReceivingMetricsSettings.tsx client/src/pages/ReceivingMetricsSettings.backup.tsx
# Then paste the new ReceivingMetricsSettings.tsx content

# Rebuild frontend
npm run build
# or for development
npm run dev
```

### Step 5: Initial Calculation (10 minutes)
1. Navigate to your app: `http://localhost:3000/settings/receiving-metrics`
2. Review the default settings (or customize - see recommendations below)
3. Click **"Calculate All Metrics"**
4. Monitor progress (pause/resume available)
5. Wait for completion (5-10 minutes for 35k items)

### Step 6: Validate Results (3 minutes)
```bash
# Run validation queries
psql -U your_user -d your_database -f docs/validation_queries.sql

# Quick check
psql -U your_user -d your_database -c "
SELECT lifecycle_stage, COUNT(*) 
FROM item_receiving_metrics 
GROUP BY lifecycle_stage 
ORDER BY COUNT(*) DESC;
"
```

**Expected output:**
```
 lifecycle_stage | count 
-----------------+-------
 Core            |  8500
 One-Time        |  7200
 Seasonal        |  3400
 Clearance       |  2100
 Discontinued    |  1800
 New             |   450
```

---

## Recommended Settings by Industry

### 🛍️ Fashion Retail (Fast-Moving)
```typescript
{
  newItemDaysFromCreation: 30,
  coreItemMinSalesMonths: 8,
  coreItemMaxDaysSinceLastSold: 60,
  seasonalItemSalesConcentrationPct: 20,
  clearanceMinInventory: 15,
  clearanceMinDaysOfSupply: 120,
}
```

### 🍕 Restaurant/Food Service
```typescript
{
  newItemDaysFromCreation: 7,
  coreItemMinSalesMonths: 11,
  coreItemMaxDaysSinceLastSold: 14,
  discontinuedMinDaysSinceSold: 60,
  clearanceMinDaysOfSupply: 30,
}
```

### 🏠 Home Goods (Slow-Moving)
```typescript
{
  newItemDaysFromCreation: 60,
  coreItemMinSalesMonths: 4,
  coreItemMaxDaysSinceLastSold: 180,
  seasonalItemSalesConcentrationPct: 12,
  clearanceMinDaysOfSupply: 365,
}
```

---

## Troubleshooting

### ❌ "Column does not exist"
**Problem:** Migration didn't run properly.
**Solution:**
```bash
# Check migration status
psql -U your_user -d your_database -c "
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'receiving_metrics_settings';
"

# Re-run migration if needed
psql -U your_user -d your_database -f database/migrations/add_multidimensional_settings.sql
```

### ❌ All items show "Unclassified"
**Problem:** Data sources not joined properly.
**Solution:**
```sql
-- Verify data exists
SELECT 
  (SELECT COUNT(*) FROM item_list) as items,
  (SELECT COUNT(DISTINCT sku) FROM sales_transactions) as items_with_sales,
  (SELECT COUNT(DISTINCT item_number) FROM receiving_lines) as items_with_receives;
```

### ❌ Calculation is very slow
**Problem:** Missing indexes or large dataset.
**Solution:**
```sql
-- Create indexes if missing
CREATE INDEX IF NOT EXISTS idx_sales_sku_date ON sales_transactions(sku, date);
CREATE INDEX IF NOT EXISTS idx_receiving_lines_item ON receiving_lines(item_number);
CREATE INDEX IF NOT EXISTS idx_item_list_last_dates ON item_list(last_sold, last_rcvd);
```

---

## Success Checklist

- [ ] Migration completed without errors
- [ ] All new columns exist in database
- [ ] Backend restarted successfully
- [ ] Frontend rebuilt and deployed
- [ ] Initial calculation completed
- [ ] All lifecycle stages have items (except maybe "New")
- [ ] Validation queries return expected results
- [ ] Excel export works and shows 6 lifecycle stages
- [ ] "Clearance Priority" sheet exists
- [ ] "Action Items" sheet has relevant tasks

🎉 **You're all set!** Your multi-dimensional segmentation is now active.

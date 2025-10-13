# 🚀 MULTI-DIMENSIONAL SEGMENTATION - IMPLEMENTATION PLAN
## Version 2.0.0 - Complete Analysis & Roadmap

---

## 📊 EXECUTIVE SUMMARY

**Current System:** Single-dimensional (receiving-only) lifecycle classification
**Proposed System:** Multi-dimensional (sales + inventory + receiving) analysis
**Impact:** Adds CLEARANCE detection, prevents zombie items, validates activity with actual sales

---

## 🔍 CURRENT VS PROPOSED COMPARISON

### CURRENT SYSTEM (What You Have)

#### Data Sources
- ✅ **Receiving History ONLY** (`receiving_vouchers` + `receiving_lines`)

#### Classification Stages (5)
1. **NEW** - Received within 30 days of creation + ≤2 receives
2. **CORE** - ≥3 months receives + ≥5 total + avg ≤60 days between + received in last 90 days
3. **SEASONAL** - ≥2 years + 60%+ receives in same month + avg ≥300 days between
4. **ONE-TIME** - ≤2 receives + ≥90 days since last receive
5. **DISCONTINUED** - Not received in 180+ days

#### Database Schema

**`item_receiving_metrics` (Current Columns):**
```sql
id, style_number, item_number
first_receive_date, last_receive_date, creation_date
total_receive_count, unique_receive_months, unique_receive_years
avg_days_between_receives, days_since_first_receive, days_since_last_receive
is_new_item, is_restocked_item, is_seasonal_item, is_one_time_buy, is_core_item
lifecycle_stage
last_calculated_at, calculated_by
```

**`receiving_metrics_settings` (Current Columns):**
```sql
id
new_item_days_from_creation, new_item_max_receives
core_item_min_months, core_item_min_receives, core_item_max_days_between
core_item_max_days_since_last [Phase 1 addition]
seasonal_item_min_years, seasonal_item_concentration_pct, seasonal_item_min_days_between
seasonal_overrides_discontinued [Phase 1 addition]
seasonal_discontinued_threshold [Phase 1 addition]
one_time_buy_max_receives, one_time_buy_min_days_since_last
discontinued_min_days_since_last
is_active, created_at, updated_at, created_by
```

#### Current Calculation Logic
- **File:** `server/lib/receiving-metrics-calculator.ts` (383 lines)
- **Method:** `calculateMetricsForStyle()` - Analyzes receiving history only
- **Data Flow:** Receiving vouchers → Pattern detection → Lifecycle assignment

#### Problems
1. ❌ **Zombie Core Items** - Items marked Core but haven't sold recently (partial fix with `coreItemMaxDaysSinceLast`)
2. ❌ **No Clearance Detection** - Can't identify excess inventory
3. ❌ **No Sales Velocity** - Doesn't know if items actually sell
4. ❌ **Seasonal based on receiving only** - Doesn't validate actual sales patterns

---

### PROPOSED SYSTEM (Multi-Dimensional v2.0)

#### New Data Sources
1. ✅ Receiving History (existing)
2. 🆕 **Sales History** (`sales_transactions` - join by `sku` = `item_number`)
3. 🆕 **Inventory Levels** (`item_list.avail_qty` + store quantities)

#### Classification Stages (6)
1. **NEW** - Recently created OR first received + ≤2 receives + (optional) must have sold
2. **CORE** - ≥6 months sales + Regular restocking + Recent activity + Has inventory OR sold recently
3. **SEASONAL** - Multi-year pattern + 15%+ sales in specific months + Still active
4. 🆕 **CLEARANCE** - High inventory (≥10) + Low sales (≤3 in 90 days) + Not restocked recently (≥180 days) + High days of supply (≥180)
5. **DISCONTINUED** - Zero inventory + No sales (≥180 days) + No receives (≥180 days) + Not seasonal
6. **ONE-TIME** - Limited receives + Still active

#### New Database Columns

**`item_receiving_metrics` (ADDITIONS):**
```sql
-- New columns to add:
total_sales_count INTEGER DEFAULT 0
sales_months_last_year INTEGER DEFAULT 0
sales_last_90days INTEGER DEFAULT 0
days_of_supply NUMERIC(10, 2)
has_seasonal_sales_pattern BOOLEAN DEFAULT false
```

**`receiving_metrics_settings` (ADDITIONS):**
```sql
-- New columns to add:
new_item_must_have_sold BOOLEAN DEFAULT false

core_item_min_sales_months INTEGER DEFAULT 6
core_item_max_days_since_last_sold INTEGER DEFAULT 90
core_item_max_days_since_last_received INTEGER DEFAULT 90
core_item_min_inventory_or_recent_sales BOOLEAN DEFAULT true

seasonal_item_sales_concentration_pct INTEGER DEFAULT 15
seasonal_item_max_days_since_activity INTEGER DEFAULT 365

discontinued_min_days_since_sold INTEGER DEFAULT 180
discontinued_min_days_since_received INTEGER DEFAULT 180
discontinued_requires_zero_inventory BOOLEAN DEFAULT true

clearance_min_inventory INTEGER DEFAULT 10
clearance_max_recent_sales INTEGER DEFAULT 3
clearance_min_days_since_received INTEGER DEFAULT 180
clearance_min_days_of_supply INTEGER DEFAULT 180

one_time_buy_min_days_since_first INTEGER DEFAULT 90
one_time_buy_max_days_since_sold INTEGER DEFAULT 90
```

#### New Calculation Logic

**Classification Precedence:**
```typescript
1. IF NEW criteria → 'New'
2. ELSE IF CLEARANCE criteria → 'Clearance' (NEW!)
3. ELSE IF DISCONTINUED criteria → 'Discontinued'
4. ELSE IF CORE criteria → 'Core' (enhanced with sales)
5. ELSE IF SEASONAL criteria → 'Seasonal' (enhanced with sales)
6. ELSE IF ONE-TIME criteria → 'One-Time'
7. ELSE → 'Unclassified'
```

**Key New Rules:**

**CLEARANCE (NEW STAGE):**
```typescript
IF (
  avail_qty >= clearanceMinInventory (10)
  AND sales_last_90days <= clearanceMaxRecentSales (3)
  AND days_since_last_received >= clearanceMinDaysSinceReceived (180)
  AND days_of_supply >= clearanceMinDaysOfSupply (180)
) THEN 'Clearance'

WHERE days_of_supply = (avail_qty / (sales_last_90days / 90)) * 90
```

**CORE (Enhanced):**
```typescript
IF (
  sales_months_last_year >= coreItemMinSalesMonths (6)
  AND total_receive_count >= coreItemMinReceives (5)
  AND avg_days_between_receives <= coreItemMaxDaysBetween (60)
  AND days_since_last_sold <= coreItemMaxDaysSinceLastSold (90)
  AND days_since_last_received <= coreItemMaxDaysSinceLastReceived (90)
  AND (avail_qty > 0 OR days_since_last_sold <= 30)
) THEN 'Core'
```

**SEASONAL (Enhanced):**
```typescript
IF (
  unique_receive_years >= 2
  AND avg_days_between_receives >= 180
  AND (days_since_last_sold <= 365 OR days_since_last_received <= 180)
  AND (any_month_has_15%_of_total_sales)  // NEW: Validates with SALES data
) THEN 'Seasonal'
```

**DISCONTINUED (Enhanced):**
```typescript
IF (
  total_qty_all_locations = 0  // NEW: Zero inventory check
  AND days_since_last_sold >= 180  // NEW: Sales check
  AND days_since_last_received >= 180
  AND NOT is_seasonal_item
) THEN 'Discontinued'
```

---

## 🔧 BREAKING CHANGES & MIGRATION REQUIREMENTS

### Database Changes

**1. Migration SQL Required:**
```sql
-- File: database/migrations/add_multidimensional_settings.sql
-- Adds ~25 new columns across 2 tables
-- Creates 6 new indexes for performance
```

**2. New Indexes:**
```sql
idx_sales_transactions_sku_date
idx_item_list_last_sold
idx_item_list_last_rcvd
idx_item_receiving_metrics_lifecycle
idx_item_receiving_metrics_sales_months
idx_item_receiving_metrics_days_of_supply
```

### Code Changes

**1. Backend Changes:**
- **File to Replace:** `server/routes/receiving-metrics.ts` (PROPOSED FILE in docs)
- **Current:** Uses `calculateMetricsForStyle()` from calculator
- **New:** Directly queries sales/inventory data with complex SQL
- **Impact:** Calculation logic moves from TypeScript to SQL for performance

**2. Frontend Changes:**
- **File to Replace:** `client/src/pages/ReceivingMetricsSettings.tsx`
- **Current:** 817 lines, 4 lifecycle stages UI, receiving-only rules
- **New:** ~950 lines, 6 lifecycle stages UI, multi-dimensional rules
- **New UI Elements:**
  - Clearance settings section (4 new inputs)
  - Sales-based rules for Core (3 new inputs)
  - Activity validation rules for Seasonal/Discontinued

**3. API Helper Changes:**
- **File:** `client/src/lib/api.ts`
- **Addition:** `calculateMetricsWithProgress()` function
- **Purpose:** Progress tracking for batch calculations

**4. Excel Export Changes:**
- **File:** `client/src/lib/excelExport.ts`
- **Changes:** Add "Clearance" lifecycle to exports, new "Clearance Priority" sheet

---

## 📋 DATA FLOW COMPARISON

### CURRENT DATA FLOW
```
1. User clicks "Calculate Metrics"
2. Backend: getAllStyleNumbers() → Get all unique styles
3. For each style:
   a. getReceivingHistoryForStyle() → Query receiving_vouchers + receiving_lines
   b. getStyleMetadata() → Query item_list for creation_date
   c. applyBusinessRules() → Analyze RECEIVING patterns only
   d. Return classifications
4. Save to item_receiving_metrics table
5. UI refreshes with 5 lifecycle stages
```

### PROPOSED DATA FLOW
```
1. User clicks "Calculate Metrics"
2. Backend: Fetch active settings from receiving_metrics_settings
3. Execute SINGLE MASSIVE SQL QUERY with:
   - LEFT JOIN sales_transactions ON sku = item_number
   - Aggregate sales by month (COUNT, months with sales)
   - Calculate days_of_supply = inventory / (sales_last_90days / 90) * 90
   - Calculate seasonal_sales_pattern by month concentration
   - Apply multi-dimensional business rules IN SQL
4. Batch insert/update to item_receiving_metrics (with new columns)
5. UI refreshes with 6 lifecycle stages (including Clearance)
```

**Performance Difference:**
- **Current:** N queries (1 per style) - Slow for 35k items
- **Proposed:** 1 query with aggregations - Much faster but more complex SQL

---

## ⚠️ BREAKING CHANGES SUMMARY

| Component | Impact | Breaking? | Rollback Difficulty |
|-----------|--------|-----------|---------------------|
| Database Schema | 25+ new columns | ✅ YES | Medium (requires migration rollback) |
| API Response Format | New fields in metrics | ⚠️ PARTIAL | Easy (old clients still work) |
| Calculation Logic | Completely different | ✅ YES | Hard (requires code revert) |
| Settings UI | New form fields | ✅ YES | Easy (old UI won't save new fields) |
| Excel Export | New lifecycle stage | ⚠️ PARTIAL | Easy (old format still valid) |
| Lifecycle Stages Count | 5 → 6 stages | ✅ YES | Medium (UI components need update) |

---

## 🎯 IMPLEMENTATION PLAN

### Phase 1: Pre-Deployment Prep (30 minutes)
1. **Backup database** (critical!)
   ```bash
   pg_dump -U user -d db > backup_$(date +%Y%m%d).sql
   ```
2. **Test in staging** environment first
3. **Review migration SQL** line-by-line
4. **Backup current code files:**
   ```bash
   cp server/routes/receiving-metrics-calculator.ts server/routes/receiving-metrics-calculator.backup.ts
   cp client/src/pages/ReceivingMetricsSettings.tsx client/src/pages/ReceivingMetricsSettings.backup.tsx
   ```

### Phase 2: Database Migration (5 minutes)
1. Run migration: `add_multidimensional_settings.sql`
2. Verify columns created:
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'receiving_metrics_settings'
   AND column_name LIKE '%clearance%';
   ```
3. Verify indexes created

### Phase 3: Backend Deployment (15 minutes)
1. **Option A:** Create new calculator file alongside existing
   - Keep `receiving-metrics-calculator.ts` (current receiving-only logic)
   - Add `receiving-metrics-calculator-multidim.ts` (new multi-dim logic)
   - Update routes to use new calculator

2. **Option B:** Replace existing (proposed in docs)
   - Replace entire routes file
   - Update imports in `routes.ts`

3. Restart backend server
4. Test endpoints: `GET /api/receiving-metrics/settings`

### Phase 4: Frontend Deployment (15 minutes)
1. Replace `ReceivingMetricsSettings.tsx`
2. Update `api.ts` with progress tracking
3. Update `excelExport.ts` with Clearance support
4. Rebuild frontend: `npm run build`
5. Deploy

### Phase 5: Initial Calculation (10 minutes)
1. Navigate to `/receiving-metrics-settings`
2. Review default settings (adjust if needed)
3. Click "Calculate All Metrics"
4. Monitor progress (pause/resume available)
5. Wait for completion

### Phase 6: Validation (15 minutes)
1. Run validation queries (`docs/validation_queries.sql`)
2. Check lifecycle distribution:
   ```sql
   SELECT lifecycle_stage, COUNT(*)
   FROM item_receiving_metrics
   GROUP BY lifecycle_stage;
   ```
3. Verify Clearance items exist
4. Spot-check zombie Core items are gone
5. Test Excel export

---

## 🔍 KEY DECISION POINTS

### Decision 1: Calculation Strategy
**Option A:** Keep TypeScript calculator (like current system)
- ✅ Easier to debug
- ✅ Can reuse existing logic
- ❌ Slower (N+1 queries problem)
- ❌ More complex code

**Option B:** Use SQL aggregation (proposed in docs)
- ✅ Much faster (single query)
- ✅ Leverages database power
- ❌ Complex SQL
- ❌ Harder to debug

**RECOMMENDATION:** Use SQL aggregation (Option B) for performance

### Decision 2: Migration Approach
**Option A:** Add new calculator alongside existing (feature flag)
- ✅ Can A/B test results
- ✅ Easy rollback
- ✅ Compare old vs new
- ❌ More complex codebase
- ❌ Need to maintain both

**Option B:** Direct replacement (proposed in docs)
- ✅ Clean codebase
- ✅ Single source of truth
- ❌ All-or-nothing
- ❌ Harder rollback

**RECOMMENDATION:** Option A for safety, then remove old after validation

### Decision 3: Clearance Settings
**Fashion Retail (Fast-Moving):**
```typescript
clearanceMinInventory: 15
clearanceMinDaysOfSupply: 120
```

**Your Business (Appears to be retail apparel):**
```typescript
clearanceMinInventory: 10  // Default
clearanceMinDaysOfSupply: 180  // Default
```

**RECOMMENDATION:** Start with defaults, adjust after first calculation

---

## 🚨 RISK ASSESSMENT

### High Risks
1. **Data Loss if Migration Fails**
   - Mitigation: Full database backup before migration
   - Rollback: Restore from backup

2. **Performance Degradation**
   - Risk: Complex SQL query might be slow
   - Mitigation: Indexes created by migration
   - Test: Run validation queries first to check performance

3. **Incorrect Classifications**
   - Risk: Business rules might not fit your business model
   - Mitigation: Run validation queries, spot-check results
   - Fix: Adjust settings and recalculate

### Medium Risks
1. **Missing Sales Data**
   - Risk: Items in `item_list` but not in `sales_transactions`
   - Impact: Will show 0 sales, might be marked Clearance/Discontinued
   - Mitigation: Validation query #7 checks data coverage

2. **SKU Mismatch**
   - Risk: `item_list.item_number` ≠ `sales_transactions.sku`
   - Impact: Sales data won't join
   - Mitigation: Validation query checks join success rate

### Low Risks
1. **UI Rendering Issues**
   - Easy to fix, doesn't affect data
2. **Excel Export Formatting**
   - Non-critical, can fix later

---

## ✅ SUCCESS CRITERIA

After implementation, verify:
- [ ] All 6 lifecycle stages have items (Core, New, Clearance, Seasonal, One-Time, Discontinued)
- [ ] No "Zombie" Core items (Core with last_sold > 120 days ago)
- [ ] Clearance items have high inventory + low sales
- [ ] Seasonal items have actual sales concentration in specific months
- [ ] Discontinued items have zero inventory + no recent activity
- [ ] Excel export includes Clearance sheet
- [ ] Validation queries pass
- [ ] Performance: Calculation completes in <10 minutes for 35k items

---

## 🔄 ROLLBACK PLAN

### If Migration Fails
```bash
# Restore database
pg_restore -U user -d db backup_YYYYMMDD.sql
```

### If Calculation Fails
1. Revert backend code:
   ```bash
   git checkout HEAD~1 server/routes/receiving-metrics-calculator.ts
   npm run server:restart
   ```

### If Results are Wrong
1. Clear metrics: Click "Clear Metrics" button
2. Adjust settings
3. Recalculate
4. If still wrong, rollback code

---

## 📞 SUPPORT & VALIDATION

### Validation Queries Location
```
docs/multi-dimensional-segmentation/docs/validation_queries.sql
```

### Key Queries
1. **Overall Health Check** - Lifecycle distribution
2. **Validate Clearance** - Check clearance item criteria
3. **Find Zombie Core** - Should be zero
4. **Validate Seasonal** - Check sales concentration
5. **Data Quality** - Check join coverage

---

## 🎓 RECOMMENDATIONS

### For Your Business
Based on your data (fashion retail with 35k items):

1. **Start Conservative:**
   - Use default settings first
   - Run validation queries
   - Adjust based on results

2. **Monitor These Metrics:**
   - Clearance item count (expect 1,500-2,500)
   - Zombie Core count (should be 0)
   - Discontinued count (should increase from current)

3. **Key Settings to Tune:**
   ```typescript
   // If too many Clearance items:
   clearanceMinInventory: 15 (increase from 10)
   clearanceMinDaysOfSupply: 240 (increase from 180)

   // If too many Core items:
   coreItemMinSalesMonths: 8 (increase from 6)

   // If not enough Seasonal:
   seasonalItemSalesConcentrationPct: 12 (decrease from 15)
   ```

4. **Implementation Order:**
   1. Staging environment first
   2. Run validation queries
   3. Compare old vs new lifecycle assignments
   4. Adjust settings
   5. Deploy to production

---

## 🏁 NEXT STEPS

**If you want to proceed:**
1. I can run the migration SQL
2. I can implement the backend changes
3. I can update the frontend
4. I can run the initial calculation
5. I can validate the results

**If you want to wait:**
1. Review this plan
2. Test in staging first
3. Let me know when ready

**Questions to answer:**
1. Do you want me to implement this now?
2. Should I use Option A (side-by-side) or Option B (direct replacement)?
3. Any custom settings for your business type?

---

**This is a significant upgrade with substantial benefits, but requires careful execution. I'm ready to implement when you are.**

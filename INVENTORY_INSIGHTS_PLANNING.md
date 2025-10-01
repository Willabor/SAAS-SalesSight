# Inventory Insights & Operations Planning

**Purpose**: This file tracks our strategic thinking for building intelligent inventory management insights that guide real business decisions: what to put on sale, what to reorder, and how to redistribute stock across locations.

---

## Business Context & Constraints

### Store Locations & Fulfillment Model

**Active Physical Stores (4):**
- GM (Grande Market) - Active retail location
- HM (Harbor Market) - Active retail location
- NM (North Market) - Active retail location
- LM (Lake Market) - Active retail location

**Warehouse:**
- HQ - NOT a retail location
- Online sales register to HQ but fulfill from physical stores
- Used for seasonal storage (end-of-season transfer from stores → HQ, beginning-of-season transfer HQ → stores)

**Closed Stores (2):**
- MM - CLOSED, no longer selling (exclude from all calculations)
- PM - CLOSED, no longer selling (exclude from all calculations)

**Inventory Columns in `item_list` Table:**
- `availQty` - Total available quantity across ALL locations (sum of below)
- `gm` - Units at GM store
- `hm` - Units at HM store
- `nm` - Units at NM store
- `lm` - Units at LM store
- `hq` - Units at HQ warehouse
- `mm` - Units at MM (CLOSED - should transfer out or liquidate)
- `pm` - Units at PM (CLOSED - should transfer out or liquidate)

**Critical Insights**:
1. HQ sales velocity does NOT indicate need for stock movement (already fulfilled from stores). Only GM/HM/NM/LM inter-store velocity differences matter for redistribution decisions.
2. MM and PM inventory is DEAD - not selling anymore. Should be flagged for transfer to active stores or liquidation.
3. When calculating "active inventory", exclude MM and PM quantities.

### Business Scale & Ordering Patterns

**Small Business Characteristics:**
- 12-24 units per style per color (total, not per store)
- Assorted sizes within those 12-24 units
- Core items: Reordered yearly or every 6 months in small bulks
- Non-core items: One-time purchases, closeouts, seasonal specials

**Implication**: Traditional retail metrics (designed for large retailers with hundreds of units) won't work. Need to adjust thresholds and calculations for small-batch inventory.

---

## URGENT: Google Marketing Meeting - Thursday

**Date**: Thursday (2 days from now)
**Attendees**: Google Marketing Team
**Required Deliverable**: Product Segmentation Report

**Purpose**: Segment products for Google Ads to improve conversion rates

**Data Needed**:
1. **Performance Segments**:
   - Best Sellers (high conversion items)
   - Core Items (regular replenishment, proven demand)
   - Seasonal Items (time-based demand patterns)
   - Clearance/Markdown Items (price-sensitive campaigns)
   - New Arrivals (items received in last 30-60 days)

2. **Category Segments**:
   - By Style (which styles to push in ads)
   - By Price Range (budget vs. premium campaigns)
   - By Vendor (brand-specific campaigns)
   - By Color (trending colors)
   - By Size Availability (only promote what we have in stock)

3. **Location-Based Segments**:
   - Items available for local pickup (in-store inventory)
   - Online-only items (HQ stock)
   - Multi-location availability (higher fulfillment success)

4. **Metrics Needed**:
   - Conversion rate by segment (sales / impressions)
   - Revenue by segment
   - Inventory depth (can we fulfill demand if ad works?)
   - Profit margins by segment (prioritize high-margin items)

**Analysis Priority**: This takes precedence. Need to complete receiving history analysis TODAY to generate segmentation report by tomorrow (Wednesday) for review before Thursday meeting.

---

## Key Business Questions to Answer

### 1. **What to Put on Sale?**
- Items not selling despite adequate time in inventory
- Items with excess stock compared to sales velocity
- Items blocking capital that could be used for better performers
- Seasonal items past their peak season
- BUT: Don't flag items that just arrived or are still within normal sell-through period

### 2. **What to Reorder?**
- Core items approaching stockout
- Proven performers with consistent sales velocity
- Items selling across multiple locations (validated demand)
- Seasonal items approaching their season
- BUT: Don't reorder items we're overstocked on or that have slowed down

### 3. **How to Redistribute Stock?**
- Items selling fast in one store but sitting in another
- Move from slow store → fast store
- Move from HQ seasonal storage → fast-selling store
- BUT: Account for size distribution (don't move sizes that don't match the selling pattern)
- BUT: Don't move from HQ to stores for online sales (already fulfilled from stores)

### 4. **What to Discontinue?**
- Styles that consistently underperform across ALL locations
- Styles where ALL sizes/colors are dead stock
- One-time purchases that didn't work out
- BUT: Don't discontinue styles where only certain sizes are slow

---

## Data Sources Available

### Item List Table (`item_list`)
**Per SKU (Item #) data:**
- Current stock levels at each location (GM, HM, NM, LM, HQ)
- Style, Description, Color, Size
- Last sold date
- Last received date (single date, limited usefulness)
- Pricing (order cost, retail price, margins)

**Limitations:**
- Only current snapshot, no history
- `lastReceived` doesn't show receiving frequency/patterns
- No sales velocity data (just last sold date)

### Sales Transactions Table (`sales_transactions`)
**Per transaction data:**
- Date, Receipt #, SKU
- Quantity sold, Sale price
- Store location (GM/HM/NM/LM/HQ)

**Capabilities:**
- Calculate sales velocity by location
- Identify fast movers vs. slow movers per store
- Calculate revenue by style/color/size
- Trend analysis (selling faster/slower over time)

### Receiving History (`receiving_vouchers` + `receiving_lines`)
**Complete receiving history:**
- Every time an item was received
- Quantity received each time
- Date received
- Store location where received
- Vendor, cost

**Capabilities:**
- Identify core items (received regularly, e.g., 3+ times/year)
- Identify one-time purchases (received once)
- Calculate receiving frequency (yearly, biannual, quarterly)
- Detect seasonal patterns (received at specific times of year)
- Calculate total units ever received per item
- Age analysis (when was current stock received?)

---

## Critical Insights Needed

### 1. **Item Classification System**

**Core Items:**
- Received 3+ times in last 18 months
- OR received yearly for 2+ consecutive years
- Regular replenishment pattern
- **Action**: Monitor closely, reorder proactively, flag if sales slow

**Seasonal Core:**
- Received regularly but only in specific months (e.g., every October for winter)
- Pattern repeats yearly
- **Action**: Time-based reordering, seasonal redistribution

**Non-Core Items:**
- Received 1-2 times total
- No regular pattern
- **Action**: Let sell through, don't reorder, flag for clearance if not selling

**Closeout/Special:**
- Large quantity received once
- Never reordered
- **Action**: Track sell-through rate, markdown if stalling

### 2. **Smart Dead Stock Definition**

**Current definition is flawed**: `lastSold > 90 days AND availQty > 0`

**Better definition should consider:**

**For Core Items:**
- No sales in 60 days (shorter threshold because we expect regular turnover)
- AND received in last 90 days (we're still buying it but not selling it) 🚨
- OR stock level > 3x average monthly sales velocity

**For Non-Core Items:**
- No sales in 90 days
- AND first received > 180 days ago (had adequate time to sell)
- AND current stock > 50% of total ever received (not selling through)

**For ALL Items:**
- Exclude items received in last 30 days (too new to judge)
- Consider size distribution (don't flag entire style if only 1-2 sizes are slow)

### 3. **Sales Velocity by Location**

**Need to calculate:**
- Units sold per day/week/month per location (GM, HM, NM, LM)
- Exclude HQ from redistribution calculations (online fulfills from stores anyway)
- Compare velocity across locations for same style

**Example:**
```
Style: Blue Jeans XYZ
- GM: 2 units/week (FAST)
- HM: 0.5 units/week (SLOW)
- NM: 1 unit/week (MEDIUM)
- LM: 0.2 units/week (SLOW)
- HQ: 3 units/week (online, ignore for redistribution)

Current stock:
- GM: 2 units (1 week supply - needs stock!)
- HM: 8 units (16 weeks supply - overstock!)
- NM: 4 units (4 weeks supply - okay)
- LM: 6 units (30 weeks supply - overstock!)

Action: Move from HM + LM → GM
```

### 4. **Receiving vs. Sales Velocity**

**Over-ordering detection:**
- Receiving velocity (units received per month) > Sales velocity (units sold per month)
- Indicates inventory is accumulating
- **Action**: Stop reordering until stock normalizes

**Under-ordering detection:**
- Sales velocity > Receiving velocity
- Stock levels declining
- **Action**: Increase order frequency/quantity

**Example:**
```
Item: Red Dress ABC (Core item)
- Last 6 months received: 48 units (8/month)
- Last 6 months sold: 72 units (12/month)
- Current stock: 6 units (declining)
- Action: REORDER NOW, increase order size to 16-20 units
```

### 5. **Style-Level vs. SKU-Level Analysis**

**Problem**: Current metrics are SKU-level only (individual size/color combos)

**Need both views:**

**SKU-Level (Item #):**
- Specific size/color performance
- Identifies size distribution issues
- Guides markdown decisions

**Style-Level (aggregate by style):**
- Overall style health
- Guides reorder decisions (reorder style, adjust size mix)
- Guides discontinuation decisions

**Example:**
```
Style: "Summer Dress Floral" - SKU breakdown:

Size S (3 units received): Sold out in 2 weeks ✅
Size M (6 units received): Sold out in 3 weeks ✅
Size L (6 units received): 4 units left after 3 months ❌
Size XL (3 units received): 3 units left after 3 months ❌

SKU-level: Flag L and XL for markdown
Style-level: Style is HEALTHY, reorder but adjust mix (more S/M, fewer L/XL)
```

### 6. **Size Distribution Intelligence**

**Cross-style size analysis:**
- Which sizes consistently sell faster across all styles?
- Which sizes consistently become dead stock?
- Guides future ordering size mix

**Example findings:**
```
Across all dresses last 12 months:
- Size S: 95% sell-through
- Size M: 88% sell-through
- Size L: 65% sell-through
- Size XL: 45% sell-through

Action: Adjust future orders to have more S/M, fewer L/XL
```

### 7. **Seasonal Pattern Detection**

**From receiving history, detect:**
- Items received every year in same months (e.g., sweaters in August, swimwear in February)
- When to transfer from HQ to stores (beginning of season)
- When to transfer from stores to HQ (end of season)
- When to markdown seasonal items (didn't sell during peak season)

**Example:**
```
Item: Winter Coat Style ABC
Receiving pattern:
- 2023: August 15 (24 units)
- 2024: August 20 (24 units)
- 2025: August 18 (24 units)

Pattern: SEASONAL CORE - order every August

Sales pattern:
- August-October: 60% of annual sales
- November-January: 35% of annual sales
- February-July: 5% of annual sales (clearance)

Actions:
- June: Transfer remaining units from stores → HQ
- August: Receive new shipment to stores
- February: Markdown remaining winter stock
```

---

## Metrics to Build

### Dashboard Cards (revised with context)

**Total Inventory Value** ✅ (already have)
- Current: $530,050.08 across 34,750 units

**Dead Stock Value** ⚠️ (need to revise calculation)
- Current: $301,912.46 (57% of inventory)
- **Issue**: This seems very high for a healthy business
- **Likely problem**: Flagging items that are too new or using wrong threshold
- **Fix needed**: Apply smart dead stock logic (core vs. non-core, receiving patterns)

**Days Since Last Sale** ⚠️ (misleading)
- Current: Avg 335 days, Most recent 2 days
- **Issue**: Average across all items doesn't account for item type
- **Better metric**: Separate averages for Core vs. Non-Core

**New metrics needed:**
- **Reorder Alerts**: Count of core items below reorder point
- **Overstock Alerts**: Count of items with >6 months inventory on hand
- **Redistribution Opportunities**: Count of styles selling 2x+ faster in one store vs. another
- **Sell-Through Rate**: % of received inventory sold within 90 days
- **Core Item Health**: % of core items meeting sales velocity targets

### Operational Reports to Build

**1. Sale Recommendations**
- Items to markdown (50% off, 75% off, clearance)
- Projected revenue recovery
- Inventory freed up for new purchases

**2. Reorder Recommendations**
- Core items approaching stockout
- Suggested order quantities based on sales velocity
- Seasonal items approaching their season

**3. Stock Redistribution Report**
- Style/SKU, From Store, To Store, Quantity to move
- Expected sell-through improvement
- Prioritized by impact (move high-value fast movers first)

**4. Style Performance Report**
- Style-level sales velocity
- Size distribution analysis
- Reorder recommendations with adjusted size mix
- Discontinuation candidates

**5. Seasonal Planning**
- Items to transfer HQ → Stores (season starting)
- Items to transfer Stores → HQ (season ending)
- Timing based on historical receiving/sales patterns

**6. Vendor Performance**
- Which vendors' items sell fastest
- Which vendors' items become dead stock
- Guides future buying decisions

---

## Technical Implementation Considerations

### Database Queries Needed

**1. Item Classification Query**
```sql
-- Classify each item as Core, Seasonal Core, Non-Core based on receiving history
SELECT
  item_number,
  COUNT(DISTINCT receiving_date) as times_received,
  MIN(receiving_date) as first_received,
  MAX(receiving_date) as last_received,
  -- Pattern detection logic
  CASE
    WHEN count >= 3 AND date_range <= 18_months THEN 'Core'
    WHEN count >= 2 AND same_month_pattern THEN 'Seasonal Core'
    ELSE 'Non-Core'
  END as classification
FROM receiving_lines
GROUP BY item_number
```

**2. Sales Velocity by Location**
```sql
-- Calculate units/month sold per location for each style
SELECT
  style,
  store,
  COUNT(*) / months_active as units_per_month
FROM sales_transactions
WHERE store IN ('GM', 'HM', 'NM', 'LM') -- Exclude HQ
GROUP BY style, store
```

**3. Stock Redistribution Candidates**
```sql
-- Find styles with uneven velocity across stores
WITH velocity AS (
  SELECT style, store, units_per_month, current_stock
  FROM sales_velocity
  JOIN current_inventory USING (style, store)
)
SELECT
  style,
  store as from_store,
  current_stock as available_to_move,
  MAX(units_per_month) OVER (PARTITION BY style) as max_velocity_store
WHERE velocity < avg_velocity * 0.5 -- Store selling <50% of average
  AND current_stock > 0
```

### Performance Considerations

- Receiving history queries could be expensive (full table scan)
- Consider materialized views or caching for:
  - Item classification (updates weekly)
  - Sales velocity (updates nightly)
  - Stock redistribution candidates (updates daily)

### UI/UX Considerations

- Need drill-down capability: Dashboard → Style → SKU → Transaction history
- Filters by: Location, Vendor, Item Type, Price Range, Season
- Actionable buttons: "Create Sale Event", "Generate PO", "Create Transfer Order"

---

## Open Questions & Next Steps

### Questions to Resolve:

1. **What defines "fast" vs. "slow" for a small business?**
   - Large retailers might say 1 unit/day is slow
   - For us with 12-24 units total, 1 unit/week might be excellent
   - Need to calibrate thresholds based on our scale

2. **Reorder point formula for small batches?**
   - Traditional: Reorder when stock = (lead_time_days × daily_sales) + safety_stock
   - Our case: Lead time?, Minimum order quantity?, Vendor constraints?

3. **Size distribution targets?**
   - Should we aim for specific % breakdown (e.g., 20% S, 40% M, 30% L, 10% XL)?
   - Or let historical sales data guide each style individually?

4. **Seasonal calendar?**
   - When do seasons start/end for our business?
   - When should we markdown seasonal items?
   - When should we transfer to/from HQ?

5. **Transfer cost vs. markdown cost?**
   - Is it cheaper to transfer stock between stores or just markdown locally?
   - Minimum quantities worth transferring?

### Immediate Next Steps (PHASE 1 - Receiving Analysis):

**PRIORITY: Complete by end of day Tuesday for Google Marketing meeting Thursday**

1. ✅ **Update planning document** with closed stores (MM/PM) and Google meeting requirements
2. ✅ **Analyze receiving history patterns** (COMPLETED)
   - Focus on quantity received per style per color
   - Identify receiving frequencies (yearly, biannual, quarterly, one-time)
   - Classify items as: Core, Seasonal Core, Non-Core, Closeout
   - Detect seasonal patterns (which months items are typically received)
   - Calculate: Total times received, average quantity per receiving, date ranges
   - Output: Data-driven metrics for classification thresholds

3. ⏳ **Generate Product Segmentation Report for Google Marketing** (PHASE 1 OUTPUT)
   - Core Items list (for evergreen campaigns)
   - Best Sellers list (high-priority ad spend)
   - Seasonal Items with timing (scheduled campaigns)
   - New Arrivals (last 30-60 days)
   - Clearance candidates (price-discount campaigns)
   - By category: Style, Vendor, Price Range, Color
   - Include inventory depth and profit margins

### Future Steps (PHASE 2 - Sales Analysis):

**Execute after Google meeting (Friday onwards)**

4. ⏳ **Calculate accurate sales velocities**
   - Per location (GM, HM, NM, LM only - exclude MM/PM/HQ)
   - Per style and per SKU
   - Identify fast movers and slow movers
   - Compare sales velocity to receiving velocity

5. ⏳ **Revise dead stock calculation**
   - Apply smart logic based on item classification
   - Exclude MM/PM inventory from active calculations
   - Flag MM/PM inventory for transfer or liquidation
   - Recalculate current dead stock value
   - Compare to current $301K (should be much lower)

6. ⏳ **Build operational reports**
   - Sale Recommendations (markdown candidates)
   - Redistribution Report (inter-store transfers)
   - Reorder Recommendations (replenishment alerts)

---

## DETAILED IMPLEMENTATION PLAN - Inventory Turnover Dashboard Redesign

**Goal**: Transform from misleading SKU-level analysis to actionable STYLE-level insights

**Problem**: Current dashboard analyzes individual SKUs (sizes) instead of styles, includes closed store inventory, and doesn't account for item classification or seasonality.

### Phase 1: Backend Data Model Changes

#### 1.1 Create New Style-Level Aggregation Query

**Location**: `server/storage.ts`

**New Interface**:
```typescript
interface StyleInventoryMetrics {
  styleNumber: string;
  itemName: string;
  vendorName: string | null;
  category: string | null;

  // Aggregated quantities
  totalActiveQty: number;        // Sum of GM + HM + NM + LM + HQ
  totalClosedStoresQty: number;  // Sum of MM + PM (flag for transfer)
  totalQty: number;              // Total across all locations

  // Size breakdown
  sizeVariations: number;        // Count of distinct sizes
  sizesInStock: string[];        // List of sizes with stock

  // Financial
  avgOrderCost: number;
  avgSellingPrice: number;
  totalInventoryValue: number;   // totalActiveQty * avgOrderCost
  potentialMargin: number;       // (avgSellingPrice - avgOrderCost) * totalActiveQty

  // Sales activity
  mostRecentSale: string | null;
  daysSinceLastSale: number | null;
  totalUnitsSold30d: number;
  totalUnitsSold90d: number;

  // Receiving history
  timesReceived: number;
  firstReceived: string | null;
  lastReceived: string | null;
  daysSinceLastReceive: number | null;
  totalQtyEverReceived: number;

  // Classification
  classification: 'Core High' | 'Core Medium' | 'Core Low' | 'Non-Core Repeat' | 'One-Time';
  seasonalPattern: 'Summer' | 'Winter' | 'Spring/Fall' | 'Year-Round' | 'Unknown';

  // Health indicators
  stockStatus: 'Healthy' | 'Overstock' | 'Understock' | 'Dead Stock' | 'Seasonal Hold';
  daysOfSupply: number;
}
```

**Implementation Details**:

**Step 1**: Create CTE (Common Table Expression) to aggregate by style
```sql
WITH style_aggregation AS (
  SELECT
    style_number,
    item_name,
    vendor_name,
    category,
    -- Active inventory (exclude closed stores MM, PM)
    SUM(gm_qty + hm_qty + nm_qty + lm_qty + hq_qty) as total_active_qty,
    SUM(mm_qty + pm_qty) as total_closed_stores_qty,
    SUM(avail_qty) as total_qty,
    -- Size info
    COUNT(DISTINCT item_number) as size_variations,
    STRING_AGG(DISTINCT size, ', ' ORDER BY size) as sizes_in_stock,
    -- Financial
    AVG(order_cost) as avg_order_cost,
    AVG(selling_price) as avg_selling_price,
    -- Sales dates
    MAX(last_sold) as most_recent_sale,
    MIN(last_rcvd) as first_received,
    MAX(last_rcvd) as last_received
  FROM item_list
  WHERE style_number IS NOT NULL
    AND style_number != ''
    AND (gm_qty + hm_qty + nm_qty + lm_qty + hq_qty) > 0  -- Only active inventory
  GROUP BY style_number, item_name, vendor_name, category
)
```

**Step 2**: Join with receiving history for classification
```sql
WITH receiving_classification AS (
  SELECT
    il.style_number,
    COUNT(DISTINCT rv.id) as times_received,
    MIN(rv.date) as first_received_date,
    MAX(rv.date) as last_received_date,
    SUM(rl.qty) as total_qty_ever_received,
    CASE
      WHEN COUNT(DISTINCT rv.id) >= 40 THEN 'Core High'
      WHEN COUNT(DISTINCT rv.id) BETWEEN 10 AND 39 THEN 'Core Medium'
      WHEN COUNT(DISTINCT rv.id) BETWEEN 6 AND 9 THEN 'Core Low'
      WHEN COUNT(DISTINCT rv.id) BETWEEN 2 AND 5 THEN 'Non-Core Repeat'
      ELSE 'One-Time'
    END as classification
  FROM item_list il
  JOIN receiving_lines rl ON rl.item_number = il.item_number
  JOIN receiving_vouchers rv ON rv.id = rl.voucher_id
  WHERE il.style_number IS NOT NULL
  GROUP BY il.style_number
)
```

**Step 3**: Detect seasonal patterns
```sql
WITH seasonal_detection AS (
  SELECT
    il.style_number,
    -- Count receives by season
    COUNT(*) FILTER (WHERE EXTRACT(MONTH FROM rv.date) IN (6,7,8)) as summer_receives,
    COUNT(*) FILTER (WHERE EXTRACT(MONTH FROM rv.date) IN (12,1,2)) as winter_receives,
    COUNT(*) FILTER (WHERE EXTRACT(MONTH FROM rv.date) IN (3,4,5,9,10,11)) as spring_fall_receives,
    -- Determine pattern
    CASE
      WHEN COUNT(*) FILTER (WHERE EXTRACT(MONTH FROM rv.date) IN (6,7,8)) >
           COUNT(*) * 0.6 THEN 'Summer'
      WHEN COUNT(*) FILTER (WHERE EXTRACT(MONTH FROM rv.date) IN (12,1,2)) >
           COUNT(*) * 0.6 THEN 'Winter'
      WHEN COUNT(*) FILTER (WHERE EXTRACT(MONTH FROM rv.date) IN (3,4,5,9,10,11)) >
           COUNT(*) * 0.6 THEN 'Spring/Fall'
      WHEN COUNT(*) >= 6 THEN 'Year-Round'
      ELSE 'Unknown'
    END as seasonal_pattern
  FROM item_list il
  JOIN receiving_lines rl ON rl.item_number = il.item_number
  JOIN receiving_vouchers rv ON rv.id = rl.voucher_id
  WHERE il.style_number IS NOT NULL
  GROUP BY il.style_number
)
```

**Step 4**: Calculate sales velocity
```sql
WITH sales_velocity AS (
  SELECT
    il.style_number,
    COUNT(DISTINCT st.id) FILTER (
      WHERE st.date >= CURRENT_DATE - INTERVAL '30 days'
    ) as units_sold_30d,
    COUNT(DISTINCT st.id) FILTER (
      WHERE st.date >= CURRENT_DATE - INTERVAL '90 days'
    ) as units_sold_90d
  FROM item_list il
  LEFT JOIN sales_transactions st ON st.sku = il.item_number
  WHERE il.style_number IS NOT NULL
  GROUP BY il.style_number
)
```

**Step 5**: Smart stock status logic
```typescript
function determineStockStatus(item: StyleInventoryMetrics): string {
  const {
    classification,
    seasonalPattern,
    daysSinceLastSale,
    daysSinceLastReceive,
    daysOfSupply,
    mostRecentSale
  } = item;

  // Seasonal hold: Out of season, don't flag as dead
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const isSummerSeason = [6,7,8].includes(currentMonth);
  const isWinterSeason = [12,1,2].includes(currentMonth);

  if (seasonalPattern === 'Summer' && !isSummerSeason) {
    if (daysSinceLastSale > 180) return 'Seasonal Hold';
  }
  if (seasonalPattern === 'Winter' && !isWinterSeason) {
    if (daysSinceLastSale > 180) return 'Seasonal Hold';
  }

  // New arrivals: Too new to judge
  if (daysSinceLastReceive !== null && daysSinceLastReceive < 30) {
    return 'Healthy';
  }

  // Core items: Should turn over quickly
  if (classification.startsWith('Core')) {
    if (mostRecentSale === null && daysSinceLastReceive > 60) {
      return 'Dead Stock';
    }
    if (daysSinceLastSale > 90) {
      return 'Dead Stock';
    }
    if (daysOfSupply > 180) {
      return 'Overstock';
    }
    if (daysOfSupply < 14) {
      return 'Understock';
    }
  }

  // Non-core items: More lenient
  if (classification === 'Non-Core Repeat' || classification === 'One-Time') {
    if (mostRecentSale === null && daysSinceLastReceive > 180) {
      return 'Dead Stock';
    }
    if (daysSinceLastSale > 180) {
      return 'Dead Stock';
    }
    if (daysOfSupply > 365) {
      return 'Overstock';
    }
  }

  return 'Healthy';
}
```

#### 1.2 Update Storage Interface

**Location**: `server/storage.ts` - Update `IStorage` interface

**New Methods**:
```typescript
// Replace existing methods with style-level versions
getStyleInventoryMetrics(): Promise<{
  totalStyleCount: number;
  totalActiveInventoryValue: number;
  totalClosedStoresValue: number;
  coreItemsCount: number;
  coreItemsValue: number;
  deadStockValue: number;
  deadStockStyleCount: number;
  seasonalHoldValue: number;
  avgDaysSinceLastSale: number;
  avgDaysSinceLastSaleByCoreType: {
    coreHigh: number;
    coreMedium: number;
    coreLow: number;
    nonCore: number;
    oneTime: number;
  };
}>;

getStyleSlowMoving(daysThreshold: number, limit?: number): Promise<StyleInventoryMetrics[]>;

getStyleOverstockUnderstock(daysRange: number, limit?: number): Promise<StyleInventoryMetrics[]>;

getStyleCategoryAnalysis(daysRange?: number): Promise<Array<{
  category: string;
  styleCount: number;
  totalInventoryValue: number;
  totalActiveUnits: number;
  totalClosedStoresUnits: number;
  coreStylesCount: number;
  avgTurnoverDays: number;
  salesLast30d: number;
}>>;

getStyleClassificationBreakdown(): Promise<Array<{
  classification: string;
  styleCount: number;
  totalValue: number;
  avgTimesReceived: number;
  avgDaysSinceLastSale: number;
}>>;

getStyleSeasonalBreakdown(): Promise<Array<{
  seasonalPattern: string;
  styleCount: number;
  totalValue: number;
  inSeasonNow: boolean;
}>>;
```

#### 1.3 Create Database Views (Optional Performance Optimization)

**Location**: Create migration or use `db:push`

```sql
-- Materialized view for style aggregation (refresh nightly)
CREATE MATERIALIZED VIEW style_inventory_summary AS
SELECT
  style_number,
  item_name,
  vendor_name,
  category,
  SUM(gm_qty + hm_qty + nm_qty + lm_qty + hq_qty) as total_active_qty,
  SUM(mm_qty + pm_qty) as total_closed_stores_qty,
  COUNT(DISTINCT item_number) as size_variations,
  AVG(order_cost) as avg_order_cost,
  AVG(selling_price) as avg_selling_price,
  MAX(last_sold) as most_recent_sale,
  MAX(last_rcvd) as last_received
FROM item_list
WHERE style_number IS NOT NULL AND style_number != ''
GROUP BY style_number, item_name, vendor_name, category;

-- Index for fast lookups
CREATE INDEX idx_style_inventory_summary_style ON style_inventory_summary(style_number);
CREATE INDEX idx_style_inventory_summary_category ON style_inventory_summary(category);
```

### Phase 2: Frontend Dashboard Updates

#### 2.1 Update TypeScript Interfaces

**Location**: `client/src/components/inventory-turnover-dashboard.tsx`

**Replace existing interfaces**:
```typescript
interface StyleTurnoverMetrics {
  totalStyleCount: number;
  totalActiveInventoryValue: number;
  totalClosedStoresValue: number;
  coreItemsCount: number;
  coreItemsValue: number;
  deadStockValue: number;
  deadStockStyleCount: number;
  seasonalHoldValue: number;
  avgDaysSinceLastSale: number;
  avgDaysSinceLastSaleByCoreType: {
    coreHigh: number;
    coreMedium: number;
    coreLow: number;
    nonCore: number;
    oneTime: number;
  };
}

interface StyleInventoryItem {
  styleNumber: string;
  itemName: string;
  vendorName: string | null;
  category: string | null;

  totalActiveQty: number;
  totalClosedStoresQty: number;
  sizeVariations: number;
  sizesInStock: string;

  avgOrderCost: number;
  avgSellingPrice: number;
  totalInventoryValue: number;
  potentialMargin: number;

  mostRecentSale: string | null;
  daysSinceLastSale: number | null;
  totalUnitsSold30d: number;

  timesReceived: number;
  lastReceived: string | null;
  daysSinceLastReceive: number | null;

  classification: string;
  seasonalPattern: string;
  stockStatus: string;
  daysOfSupply: number;
}

interface CategoryStyleAnalysis {
  category: string;
  styleCount: number;
  totalInventoryValue: number;
  totalActiveUnits: number;
  coreStylesCount: number;
  avgTurnoverDays: number;
  salesLast30d: number;
}
```

#### 2.2 Update KPI Cards

**Location**: `client/src/components/inventory-turnover-dashboard.tsx`

**New Card Layout** (5 cards + 1 expandable section):

```
Row 1:
┌─────────────────────────┬─────────────────────────┬─────────────────────────┐
│ Total Active Inventory  │ Core Items Value        │ Dead Stock Value        │
│ $8.8M                   │ $7.7M (87%)            │ $XXX (recalculated)     │
│ 6,584 styles            │ 1,083 styles           │ XX styles               │
│ Excludes MM/PM          │ 16% of catalog         │ Excludes seasonal hold  │
└─────────────────────────┴─────────────────────────┴─────────────────────────┘

Row 2:
┌─────────────────────────┬─────────────────────────┬─────────────────────────┐
│ Avg Days Since Sale     │ Closed Stores Inventory │ Seasonal Hold           │
│ Core High: XX days      │ $XXX (MM + PM)         │ $XXX in 123 styles      │
│ Core Med: XX days       │ Needs transfer/clear    │ Out of season items     │
│ Non-Core: XX days       │ XX styles affected      │ Normal behavior         │
└─────────────────────────┴─────────────────────────┴─────────────────────────┘

Expandable: Classification Breakdown
┌─────────────────────────────────────────────────────────────────────────────┐
│ ► Show Classification Breakdown                                             │
│   Core High (40+): 62 styles, $2.6M | Avg XX days since sale              │
│   Core Medium (10-39): 461 styles, $4.2M | Avg XX days since sale         │
│   Core Low (6-9): 560 styles, $890K | Avg XX days since sale              │
│   Non-Core (2-5): 3,327 styles, $1.0M | Avg XX days since sale            │
│   One-Time (1): 2,305 styles, $70K | Avg XX days since sale               │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 2.3 Update Tables

**Slow Moving & Dead Stock Table** - Add columns:
- Style Number
- Sizes Available (e.g., "S, M, L, XL")
- Size Count
- Classification Badge
- Seasonal Pattern Badge
- Times Received
- Last Received Date
- Stock Status (with smart logic)

**New filter options**:
- Filter by Classification
- Filter by Seasonal Pattern
- Filter by Stock Status
- Exclude Seasonal Hold

**Overstock/Understock Table** - Add columns:
- Same as above plus:
- Days of Supply
- 30d Sales
- Recommended Action

**Category Analysis** - Group by Style:
- Show style count (not SKU count)
- Active inventory only (exclude MM/PM)
- Core styles breakdown
- Seasonal distribution

### Phase 3: API Route Updates

**Location**: `server/routes.ts`

**Update existing endpoints**:
```typescript
// Replace /api/inventory/turnover-metrics
app.get("/api/inventory/turnover-metrics", isAuthenticated, async (req, res) => {
  const metrics = await storage.getStyleInventoryMetrics();
  res.json(metrics);
});

// Replace /api/inventory/slow-moving
app.get("/api/inventory/slow-moving", isAuthenticated, async (req, res) => {
  const daysThreshold = parseInt(req.query.days as string) || 90;
  const limit = parseInt(req.query.limit as string) || 100;
  const slowMoving = await storage.getStyleSlowMoving(daysThreshold, limit);
  res.json(slowMoving);
});

// Similar updates for other endpoints...
```

### Phase 4: Seasonal Detection Logic

**Key Decision Points**:

**Question for User**: What items/categories are seasonal for your business?

**Proposed Auto-Detection Rules**:

1. **Summer Items** (sell June-August):
   - Keywords: "shorts", "tank", "swim", "sandal", "tee", "summer"
   - Receiving pattern: 60%+ of receives in Apr-Jun
   - Dead stock threshold: Only flag if no sales in 12+ months

2. **Winter Items** (sell Nov-Feb):
   - Keywords: "jacket", "coat", "hoodie", "beanie", "winter", "fleece"
   - Receiving pattern: 60%+ of receives in Aug-Oct
   - Dead stock threshold: Only flag if no sales in 12+ months

3. **Year-Round Items**:
   - Receiving spread evenly across months
   - Standard dead stock rules apply

4. **Spring/Fall Items**:
   - Receives primarily in Mar/Sep
   - Moderate dead stock thresholds

**Manual Override Table** (nice to have):
```sql
CREATE TABLE seasonal_overrides (
  id SERIAL PRIMARY KEY,
  style_number TEXT NOT NULL,
  seasonal_pattern TEXT NOT NULL, -- 'Summer', 'Winter', etc
  override_reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Phase 5: Migration & Testing Plan

**Step 1**: Create new methods alongside old ones (no breaking changes)
- Add `getStyleInventoryMetrics()` while keeping `getInventoryTurnoverMetrics()`
- Test in parallel

**Step 2**: Create feature flag in frontend
```typescript
const USE_STYLE_LEVEL_ANALYSIS = true; // Toggle for testing
```

**Step 3**: A/B comparison
- Show both old and new metrics side by side
- Validate numbers make sense
- User acceptance testing

**Step 4**: Cutover
- Remove old methods
- Update all references
- Deploy

**Step 5**: Post-deployment validation
- Check dead stock % dropped (should be <30% instead of 57%)
- Verify seasonal items not flagged incorrectly
- Confirm MM/PM inventory isolated

### Phase 6: Product Segmentation Report (Export for Google Marketing)

**Location**: New component + backend endpoint

**Purpose**: Generate exportable Excel report with product segments for Google Ads campaigns

#### 6.1 Backend: Segmentation Data Query

**New Storage Method**:
```typescript
getProductSegmentationReport(): Promise<{
  metadata: {
    generatedDate: string;
    totalStyles: number;
    totalActiveInventoryValue: number;
    analysisDateRange: string;
  };
  segments: {
    coreItems: StyleSegment[];
    bestSellers: StyleSegment[];
    newArrivals: StyleSegment[];
    seasonal: {
      summer: StyleSegment[];
      winter: StyleSegment[];
      springFall: StyleSegment[];
    };
    clearance: StyleSegment[];
  };
}>;

interface StyleSegment {
  styleNumber: string;
  itemName: string;
  vendorName: string;
  category: string;

  // Inventory
  totalActiveQty: number;
  sizesAvailable: string;
  inventoryValue: number;

  // Pricing & Margin
  avgOrderCost: number;
  avgSellingPrice: number;
  marginPerUnit: number;
  marginPercent: number;

  // Performance
  classification: string;
  timesReceived: number;
  unitsSold30d: number;
  unitsSold90d: number;
  salesVelocity: number; // units/day

  // Segmentation tags
  segment: string; // "Core High", "Best Seller", "New Arrival", etc.
  priority: number; // 1-5 (5 = highest priority for ads)
  recommendedBudget: string; // "High", "Medium", "Low"

  // Google Ads specific
  productTitle: string; // Auto-generated for Google Shopping
  googleCategory: string; // Mapped category
  keywords: string[]; // Auto-generated keywords
}
```

**Implementation**:
```sql
WITH style_segments AS (
  -- Base style aggregation
  SELECT
    il.style_number,
    il.item_name,
    il.vendor_name,
    il.category,
    SUM(il.gm_qty + il.hm_qty + il.nm_qty + il.lm_qty + il.hq_qty) as total_active_qty,
    STRING_AGG(DISTINCT il.size, ', ' ORDER BY il.size) as sizes_available,
    AVG(il.order_cost) as avg_order_cost,
    AVG(il.selling_price) as avg_selling_price,
    MAX(il.last_sold) as most_recent_sale,
    MAX(il.last_rcvd) as last_received
  FROM item_list il
  WHERE il.style_number IS NOT NULL
    AND (il.gm_qty + il.hm_qty + il.nm_qty + il.lm_qty + il.hq_qty) > 0
  GROUP BY il.style_number, il.item_name, il.vendor_name, il.category
),
receiving_class AS (
  -- Classification from receiving history
  SELECT
    il.style_number,
    COUNT(DISTINCT rv.id) as times_received,
    MIN(rv.date) as first_received,
    MAX(rv.date) as last_received,
    CASE
      WHEN COUNT(DISTINCT rv.id) >= 40 THEN 'Core High'
      WHEN COUNT(DISTINCT rv.id) BETWEEN 10 AND 39 THEN 'Core Medium'
      WHEN COUNT(DISTINCT rv.id) BETWEEN 6 AND 9 THEN 'Core Low'
      ELSE 'Non-Core'
    END as classification
  FROM item_list il
  JOIN receiving_lines rl ON rl.item_number = il.item_number
  JOIN receiving_vouchers rv ON rv.id = rl.voucher_id
  WHERE il.style_number IS NOT NULL
  GROUP BY il.style_number
),
sales_perf AS (
  -- Sales performance
  SELECT
    il.style_number,
    COUNT(DISTINCT st.id) FILTER (WHERE st.date >= CURRENT_DATE - 30) as units_sold_30d,
    COUNT(DISTINCT st.id) FILTER (WHERE st.date >= CURRENT_DATE - 90) as units_sold_90d
  FROM item_list il
  LEFT JOIN sales_transactions st ON st.sku = il.item_number
  WHERE il.style_number IS NOT NULL
  GROUP BY il.style_number
),
seasonal_class AS (
  -- Seasonal classification
  SELECT
    il.style_number,
    CASE
      WHEN COUNT(*) FILTER (WHERE EXTRACT(MONTH FROM rv.date) IN (6,7,8)) > COUNT(*) * 0.6
        OR LOWER(il.item_name) LIKE '%short%'
        OR LOWER(il.item_name) LIKE '%tank%'
        OR LOWER(il.item_name) LIKE '%summer%'
        THEN 'Summer'
      WHEN COUNT(*) FILTER (WHERE EXTRACT(MONTH FROM rv.date) IN (12,1,2)) > COUNT(*) * 0.6
        OR LOWER(il.item_name) LIKE '%jacket%'
        OR LOWER(il.item_name) LIKE '%coat%'
        OR LOWER(il.item_name) LIKE '%hoodie%'
        OR LOWER(il.item_name) LIKE '%beanie%'
        OR LOWER(il.item_name) LIKE '%winter%'
        OR LOWER(il.item_name) LIKE '%fleece%'
        THEN 'Winter'
      WHEN COUNT(*) >= 6 THEN 'Year-Round'
      ELSE 'Unknown'
    END as seasonal_pattern
  FROM item_list il
  JOIN receiving_lines rl ON rl.item_number = il.item_number
  JOIN receiving_vouchers rv ON rv.id = rl.voucher_id
  WHERE il.style_number IS NOT NULL
  GROUP BY il.style_number, il.item_name
)
SELECT
  ss.*,
  rc.classification,
  rc.times_received,
  rc.last_received as last_received_date,
  sp.units_sold_30d,
  sp.units_sold_90d,
  sc.seasonal_pattern,

  -- Calculate metrics
  (ss.total_active_qty * ss.avg_order_cost) as inventory_value,
  (ss.avg_selling_price - ss.avg_order_cost) as margin_per_unit,
  ((ss.avg_selling_price - ss.avg_order_cost) / NULLIF(ss.avg_selling_price, 0) * 100) as margin_percent,
  (sp.units_sold_30d / 30.0) as sales_velocity,

  -- Segmentation
  CASE
    -- Best Sellers: High sales velocity
    WHEN sp.units_sold_30d >= 10 THEN 'Best Seller'
    -- New Arrivals: Received in last 60 days
    WHEN rc.last_received >= CURRENT_DATE - 60 THEN 'New Arrival'
    -- Core Items
    WHEN rc.classification LIKE 'Core%' THEN rc.classification
    -- Clearance: Old stock, slow/no sales
    WHEN ss.most_recent_sale < CURRENT_DATE - 180
      AND rc.last_received < CURRENT_DATE - 90 THEN 'Clearance'
    ELSE 'Standard'
  END as segment,

  -- Priority (1-5, 5 = highest)
  CASE
    WHEN sp.units_sold_30d >= 10 THEN 5 -- Best sellers
    WHEN rc.classification = 'Core High' THEN 4
    WHEN rc.last_received >= CURRENT_DATE - 30 THEN 4 -- New arrivals
    WHEN rc.classification = 'Core Medium' THEN 3
    WHEN rc.classification = 'Core Low' THEN 2
    ELSE 1
  END as priority,

  -- Recommended budget
  CASE
    WHEN sp.units_sold_30d >= 10 THEN 'High'
    WHEN rc.classification IN ('Core High', 'Core Medium') THEN 'Medium'
    WHEN rc.last_received >= CURRENT_DATE - 30 THEN 'Medium'
    ELSE 'Low'
  END as recommended_budget

FROM style_segments ss
LEFT JOIN receiving_class rc ON rc.style_number = ss.style_number
LEFT JOIN sales_perf sp ON sp.style_number = ss.style_number
LEFT JOIN seasonal_class sc ON sc.style_number = ss.style_number
ORDER BY priority DESC, inventory_value DESC;
```

#### 6.2 Frontend: Export Button & Report Generation

**Location**: Add to inventory-turnover-dashboard.tsx

**New Button in Toolbar**:
```tsx
<Button
  onClick={handleExportSegmentationReport}
  variant="default"
  className="gap-2"
>
  <Download className="w-4 h-4" />
  Export Segmentation Report for Google Ads
</Button>
```

**Export Handler**:
```typescript
const handleExportSegmentationReport = async () => {
  try {
    // Fetch segmentation data
    const response = await fetch('/api/inventory/segmentation-report');
    if (!response.ok) throw new Error('Failed to fetch segmentation data');
    const data = await response.json();

    // Prepare Excel sheets
    const sheets = [];

    // Sheet 1: Executive Summary
    sheets.push({
      sheetName: 'Executive Summary',
      data: [
        { Metric: 'Report Generated', Value: data.metadata.generatedDate },
        { Metric: 'Total Styles Analyzed', Value: data.metadata.totalStyles },
        { Metric: 'Total Active Inventory Value', Value: formatCurrency(data.metadata.totalActiveInventoryValue) },
        { Metric: '', Value: '' },
        { Metric: 'Segment Breakdown', Value: '' },
        { Metric: 'Core Items (High)', Value: data.segments.coreItems.filter(s => s.classification === 'Core High').length },
        { Metric: 'Core Items (Medium)', Value: data.segments.coreItems.filter(s => s.classification === 'Core Medium').length },
        { Metric: 'Core Items (Low)', Value: data.segments.coreItems.filter(s => s.classification === 'Core Low').length },
        { Metric: 'Best Sellers', Value: data.segments.bestSellers.length },
        { Metric: 'New Arrivals', Value: data.segments.newArrivals.length },
        { Metric: 'Summer Seasonal', Value: data.segments.seasonal.summer.length },
        { Metric: 'Winter Seasonal', Value: data.segments.seasonal.winter.length },
        { Metric: 'Clearance Candidates', Value: data.segments.clearance.length },
      ]
    });

    // Sheet 2: Best Sellers (High Priority for Ads)
    sheets.push({
      sheetName: 'Best Sellers - Priority 5',
      data: formatDataForExport(data.segments.bestSellers, {
        styleNumber: 'Style #',
        itemName: 'Product Name',
        vendorName: 'Brand/Vendor',
        category: 'Category',
        totalActiveQty: 'Stock Available',
        sizesAvailable: 'Sizes',
        avgSellingPrice: 'Retail Price',
        marginPercent: 'Margin %',
        unitsSold30d: 'Sales (30d)',
        salesVelocity: 'Daily Sales Rate',
        inventoryValue: 'Inventory Value',
        recommendedBudget: 'Ad Budget',
        keywords: 'Suggested Keywords',
      })
    });

    // Sheet 3: Core Items (Evergreen Campaigns)
    sheets.push({
      sheetName: 'Core Items - Evergreen',
      data: formatDataForExport(data.segments.coreItems, {
        styleNumber: 'Style #',
        itemName: 'Product Name',
        vendorName: 'Brand/Vendor',
        category: 'Category',
        classification: 'Core Tier',
        timesReceived: 'Times Ordered',
        totalActiveQty: 'Stock Available',
        unitsSold30d: 'Sales (30d)',
        marginPercent: 'Margin %',
        inventoryValue: 'Inventory Value',
        recommendedBudget: 'Ad Budget',
        priority: 'Campaign Priority (1-5)',
      })
    });

    // Sheet 4: New Arrivals (New Product Campaigns)
    sheets.push({
      sheetName: 'New Arrivals',
      data: formatDataForExport(data.segments.newArrivals, {
        styleNumber: 'Style #',
        itemName: 'Product Name',
        vendorName: 'Brand/Vendor',
        category: 'Category',
        totalActiveQty: 'Stock Available',
        sizesAvailable: 'Sizes',
        avgSellingPrice: 'Retail Price',
        marginPerUnit: 'Margin per Unit',
        inventoryValue: 'Inventory Value',
        lastReceivedDate: 'Received Date',
        recommendedBudget: 'Ad Budget',
      })
    });

    // Sheet 5: Summer Seasonal
    sheets.push({
      sheetName: 'Seasonal - Summer',
      data: formatDataForExport(data.segments.seasonal.summer, {
        styleNumber: 'Style #',
        itemName: 'Product Name',
        vendorName: 'Brand/Vendor',
        totalActiveQty: 'Stock Available',
        avgSellingPrice: 'Retail Price',
        unitsSold30d: 'Sales (30d)',
        inventoryValue: 'Inventory Value',
        recommendedBudget: 'Ad Budget',
      })
    });

    // Sheet 6: Winter Seasonal
    sheets.push({
      sheetName: 'Seasonal - Winter',
      data: formatDataForExport(data.segments.seasonal.winter, {
        styleNumber: 'Style #',
        itemName: 'Product Name',
        vendorName: 'Brand/Vendor',
        totalActiveQty: 'Stock Available',
        avgSellingPrice: 'Retail Price',
        unitsSold30d: 'Sales (30d)',
        inventoryValue: 'Inventory Value',
        recommendedBudget: 'Ad Budget',
      })
    });

    // Sheet 7: Clearance (Deep Discount Campaigns)
    sheets.push({
      sheetName: 'Clearance - Discount Campaigns',
      data: formatDataForExport(data.segments.clearance, {
        styleNumber: 'Style #',
        itemName: 'Product Name',
        vendorName: 'Brand/Vendor',
        totalActiveQty: 'Stock to Clear',
        avgOrderCost: 'Our Cost',
        avgSellingPrice: 'Current Price',
        inventoryValue: 'Tied Up Capital',
        daysSinceLastSale: 'Days Stale',
        recommendedDiscount: 'Suggested Discount %',
      })
    });

    // Sheet 8: Google Shopping Feed Format
    sheets.push({
      sheetName: 'Google Shopping Feed',
      data: [
        ...data.segments.bestSellers,
        ...data.segments.coreItems.filter(s => s.priority >= 3),
        ...data.segments.newArrivals,
      ].map(item => ({
        'id': item.styleNumber,
        'title': item.productTitle || `${item.vendorName} ${item.itemName}`,
        'description': `${item.itemName} - Available in sizes ${item.sizesAvailable}`,
        'link': `https://yourstore.com/products/${item.styleNumber}`,
        'image_link': `https://yourstore.com/images/${item.styleNumber}.jpg`,
        'availability': item.totalActiveQty > 0 ? 'in stock' : 'out of stock',
        'price': `${item.avgSellingPrice} USD`,
        'brand': item.vendorName,
        'google_product_category': item.googleCategory || item.category,
        'product_type': item.category,
        'condition': 'new',
        'custom_label_0': item.segment, // Segment for campaign grouping
        'custom_label_1': item.classification, // Core tier
        'custom_label_2': item.seasonalPattern, // Seasonal pattern
        'custom_label_3': item.recommendedBudget, // Budget tier
        'custom_label_4': item.priority, // Priority score
      }))
    });

    // Export all sheets
    exportMultipleSheetsToExcel(sheets, `product-segmentation-report-${new Date().toISOString().split('T')[0]}`);

  } catch (error) {
    console.error('Error generating segmentation report:', error);
    alert('Failed to generate segmentation report');
  }
};
```

#### 6.3 Backend: API Endpoint

**Location**: `server/routes.ts`

```typescript
app.get("/api/inventory/segmentation-report", isAuthenticated, async (req, res) => {
  try {
    const report = await storage.getProductSegmentationReport();
    res.json(report);
  } catch (error) {
    console.error("Error generating segmentation report:", error);
    res.status(500).json({ error: "Failed to generate segmentation report" });
  }
});
```

#### 6.4 Enhanced Segmentation Logic

**Auto-Generate Product Titles for Google Shopping**:
```typescript
function generateProductTitle(item: StyleSegment): string {
  // Google Shopping title best practices: Brand + Product Type + Key Attributes
  const parts = [];

  if (item.vendorName) parts.push(item.vendorName);

  // Extract product type from item name
  const productType = item.itemName
    .replace(/\b(mens|womens|unisex)\b/gi, '')
    .trim();
  parts.push(productType);

  // Add sizes if limited
  if (item.sizesAvailable.split(',').length <= 3) {
    parts.push(`(${item.sizesAvailable})`);
  }

  return parts.join(' - ').substring(0, 150); // Google limit
}
```

**Auto-Generate Keywords**:
```typescript
function generateKeywords(item: StyleSegment): string[] {
  const keywords = [];

  // Brand keywords
  if (item.vendorName) {
    keywords.push(item.vendorName.toLowerCase());
    keywords.push(`${item.vendorName.toLowerCase()} ${item.category?.toLowerCase()}`);
  }

  // Product type keywords
  const words = item.itemName.toLowerCase().split(/\s+/);
  keywords.push(...words.filter(w => w.length > 3));

  // Category keywords
  if (item.category) {
    keywords.push(item.category.toLowerCase());
  }

  // Segment-specific keywords
  if (item.segment === 'Best Seller') {
    keywords.push('popular', 'best seller', 'trending');
  }
  if (item.segment === 'New Arrival') {
    keywords.push('new', 'latest', 'just arrived');
  }

  // Seasonal keywords
  if (item.seasonalPattern === 'Summer') {
    keywords.push('summer', 'warm weather');
  }
  if (item.seasonalPattern === 'Winter') {
    keywords.push('winter', 'cold weather');
  }

  return [...new Set(keywords)].slice(0, 20); // Dedupe and limit
}
```

**Map to Google Product Categories**:
```typescript
function mapToGoogleCategory(category: string | null): string {
  const categoryMap: Record<string, string> = {
    'Apparel & Accessories > Clothing > Activewear': 'Activewear',
    'Apparel & Accessories > Clothing > Pants': 'Pants',
    'Apparel & Accessories > Clothing Accessories > Hats': 'Hats',
    // Add more mappings based on your categories
  };

  // Find best match
  for (const [googleCat, keyword] of Object.entries(categoryMap)) {
    if (category?.toLowerCase().includes(keyword.toLowerCase())) {
      return googleCat;
    }
  }

  return 'Apparel & Accessories'; // Default
}
```

#### 6.5 Report Structure Summary

**8 Excel Sheets**:
1. **Executive Summary** - Overview metrics, segment counts
2. **Best Sellers** - Top priority for ad spend (Priority 5)
3. **Core Items** - Evergreen campaign targets
4. **New Arrivals** - "New In" campaigns (last 60 days)
5. **Summer Seasonal** - Jun-Aug campaign items
6. **Winter Seasonal** - Nov-Feb campaign items
7. **Clearance** - Deep discount campaigns
8. **Google Shopping Feed** - Ready-to-upload feed format

**Key Columns Across Sheets**:
- Style Number (unique ID)
- Product Name (Google-optimized title)
- Brand/Vendor
- Category
- Stock Available
- Pricing (retail, cost, margin %)
- Performance (sales 30d, velocity)
- Segmentation (classification, seasonal pattern, priority)
- Recommendations (budget tier, suggested keywords)

**Campaign Guidance Included**:
- **Priority Score (1-5)**: Indicates where to focus budget
- **Budget Tier (High/Medium/Low)**: Recommended daily budget allocation
- **Custom Labels**: Pre-configured for Google Ads campaign targeting
- **Keywords**: Auto-generated for ad copy and targeting

### Phase 7: Transfer Recommendations Page

**Location**: New page `/transfer-recommendations`

**Purpose**: Identify opportunities to move inventory between stores (GM, HM, NM, LM) based on differing sales velocities

#### 7.1 Backend: Transfer Analysis Query

**New Storage Method**:
```typescript
getTransferRecommendations(minVelocityDifference?: number): Promise<{
  summary: {
    totalRecommendations: number;
    totalUnitsToTransfer: number;
    totalValueToTransfer: number;
    potentialRevenue: number;
  };
  recommendations: TransferRecommendation[];
}>;

interface TransferRecommendation {
  styleNumber: string;
  itemName: string;
  vendorName: string;
  category: string;

  // From store (overstocked)
  fromStore: string;
  fromStoreQty: number;
  fromStoreSalesVelocity: number; // units/day
  fromStoreDaysOfSupply: number;

  // To store (understocked)
  toStore: string;
  toStoreQty: number;
  toStoreSalesVelocity: number; // units/day
  toStoreDaysOfSupply: number;

  // Transfer recommendation
  recommendedQty: number;
  sizesAvailable: string;
  sizeBreakdown: Array<{size: string; qty: number}>;

  // Business impact
  estimatedDaysToSell: number; // At destination
  estimatedRevenue: number;
  priority: number; // 1-5 (5 = urgent)
  reason: string;

  // Financial
  avgSellingPrice: number;
  inventoryValue: number;
}
```

**Implementation**:
```sql
WITH store_inventory AS (
  -- Break down inventory by store for each style
  SELECT
    il.style_number,
    il.item_name,
    il.vendor_name,
    il.category,
    il.size,
    il.avail_qty,
    il.gm_qty,
    il.hm_qty,
    il.nm_qty,
    il.lm_qty,
    il.order_cost,
    il.selling_price
  FROM item_list il
  WHERE il.style_number IS NOT NULL
    AND (il.gm_qty + il.hm_qty + il.nm_qty + il.lm_qty) > 0
),
style_store_sales AS (
  -- Calculate sales velocity per store per style
  SELECT
    si.style_number,
    'GM' as store,
    SUM(si.gm_qty) as current_qty,
    COUNT(st.id) FILTER (WHERE st.date >= CURRENT_DATE - 30 AND st.store = 'GM') as units_sold_30d,
    (COUNT(st.id) FILTER (WHERE st.date >= CURRENT_DATE - 30 AND st.store = 'GM') / 30.0) as velocity
  FROM store_inventory si
  LEFT JOIN sales_transactions st ON st.sku = si.item_number
  WHERE si.gm_qty > 0
  GROUP BY si.style_number

  UNION ALL

  SELECT
    si.style_number,
    'HM' as store,
    SUM(si.hm_qty) as current_qty,
    COUNT(st.id) FILTER (WHERE st.date >= CURRENT_DATE - 30 AND st.store = 'HM') as units_sold_30d,
    (COUNT(st.id) FILTER (WHERE st.date >= CURRENT_DATE - 30 AND st.store = 'HM') / 30.0) as velocity
  FROM store_inventory si
  LEFT JOIN sales_transactions st ON st.sku = si.item_number
  WHERE si.hm_qty > 0
  GROUP BY si.style_number

  UNION ALL

  SELECT
    si.style_number,
    'NM' as store,
    SUM(si.nm_qty) as current_qty,
    COUNT(st.id) FILTER (WHERE st.date >= CURRENT_DATE - 30 AND st.store = 'NM') as units_sold_30d,
    (COUNT(st.id) FILTER (WHERE st.date >= CURRENT_DATE - 30 AND st.store = 'NM') / 30.0) as velocity
  FROM store_inventory si
  LEFT JOIN sales_transactions st ON st.sku = si.item_number
  WHERE si.nm_qty > 0
  GROUP BY si.style_number

  UNION ALL

  SELECT
    si.style_number,
    'LM' as store,
    SUM(si.lm_qty) as current_qty,
    COUNT(st.id) FILTER (WHERE st.date >= CURRENT_DATE - 30 AND st.store = 'LM') as units_sold_30d,
    (COUNT(st.id) FILTER (WHERE st.date >= CURRENT_DATE - 30 AND st.store = 'LM') / 30.0) as velocity
  FROM store_inventory si
  LEFT JOIN sales_transactions st ON st.sku = si.item_number
  WHERE si.lm_qty > 0
  GROUP BY si.style_number
),
transfer_opportunities AS (
  -- Find pairs: high velocity store (needs stock) + low velocity store (has stock)
  SELECT
    fast.style_number,
    fast.store as to_store,
    fast.current_qty as to_store_qty,
    fast.velocity as to_store_velocity,
    CASE WHEN fast.velocity > 0 THEN fast.current_qty / fast.velocity ELSE 999 END as to_store_days_supply,

    slow.store as from_store,
    slow.current_qty as from_store_qty,
    slow.velocity as from_store_velocity,
    CASE WHEN slow.velocity > 0 THEN slow.current_qty / slow.velocity ELSE 999 END as from_store_days_supply,

    -- Calculate recommended transfer quantity
    LEAST(
      slow.current_qty, -- Don't transfer more than available
      GREATEST(
        FLOOR((fast.velocity * 30) - fast.current_qty), -- 30 days supply at fast store
        1
      )
    ) as recommended_qty,

    -- Velocity difference (how much faster is fast store)
    (fast.velocity - slow.velocity) as velocity_difference

  FROM style_store_sales fast
  JOIN style_store_sales slow ON slow.style_number = fast.style_number
    AND slow.store != fast.store
  WHERE
    -- Fast store has good velocity
    fast.velocity > 0.1 -- At least 3 units/month
    -- Fast store needs stock (less than 30 days supply)
    AND (fast.velocity > 0 AND fast.current_qty / fast.velocity < 30)
    -- Slow store has excess (more than 60 days supply OR no sales)
    AND (slow.velocity = 0 OR slow.current_qty / NULLIF(slow.velocity, 0) > 60)
    -- Slow store has stock available
    AND slow.current_qty > 0
    -- Significant velocity difference
    AND (fast.velocity - slow.velocity) > 0.2 -- At least 6 units/month difference
)
SELECT
  si.style_number,
  si.item_name,
  si.vendor_name,
  si.category,
  to.*,

  -- Size breakdown
  STRING_AGG(DISTINCT si.size, ', ' ORDER BY si.size) as sizes_available,

  -- Calculate priority
  CASE
    WHEN to.to_store_days_supply < 7 THEN 5 -- Urgent: less than 1 week supply
    WHEN to.to_store_days_supply < 14 THEN 4 -- High: less than 2 weeks
    WHEN to.to_store_days_supply < 21 THEN 3 -- Medium: less than 3 weeks
    WHEN to.velocity_difference > 1.0 THEN 3 -- Medium: high velocity difference
    ELSE 2
  END as priority,

  -- Reason
  CASE
    WHEN to.to_store_days_supply < 7 THEN 'URGENT: Fast store running out'
    WHEN to.from_store_velocity = 0 THEN 'Move dead stock to selling store'
    WHEN to.from_store_days_supply > 180 THEN 'Move overstock to fast seller'
    ELSE 'Optimize stock distribution'
  END as reason,

  -- Financial impact
  AVG(si.selling_price) as avg_selling_price,
  (to.recommended_qty * AVG(si.order_cost)) as inventory_value,
  (to.recommended_qty * AVG(si.selling_price)) as estimated_revenue,
  CASE
    WHEN to.to_store_velocity > 0
    THEN to.recommended_qty / to.to_store_velocity
    ELSE 999
  END as estimated_days_to_sell

FROM transfer_opportunities to
JOIN store_inventory si ON si.style_number = to.style_number
GROUP BY
  si.style_number, si.item_name, si.vendor_name, si.category,
  to.to_store, to.to_store_qty, to.to_store_velocity, to.to_store_days_supply,
  to.from_store, to.from_store_qty, to.from_store_velocity, to.from_store_days_supply,
  to.recommended_qty, to.velocity_difference
ORDER BY priority DESC, estimated_revenue DESC;
```

#### 7.2 Frontend: Transfer Recommendations Page

**New Route**: `/transfer-recommendations`

**Page Layout**:
```tsx
<div className="space-y-6">
  {/* Header */}
  <div className="flex justify-between items-center">
    <div>
      <h1>Store Transfer Recommendations</h1>
      <p>Optimize inventory distribution across GM, HM, NM, LM</p>
    </div>
    <Button onClick={handleExportTransfers}>
      <Download /> Export Transfer List
    </Button>
  </div>

  {/* Summary Cards */}
  <div className="grid grid-cols-4 gap-4">
    <Card>
      <CardTitle>Total Recommendations</CardTitle>
      <p className="text-3xl">{summary.totalRecommendations}</p>
      <p className="text-sm">transfers to optimize</p>
    </Card>

    <Card>
      <CardTitle>Units to Transfer</CardTitle>
      <p className="text-3xl">{summary.totalUnitsToTransfer}</p>
      <p className="text-sm">across all stores</p>
    </Card>

    <Card>
      <CardTitle>Value in Motion</CardTitle>
      <p className="text-3xl">${summary.totalValueToTransfer}</p>
      <p className="text-sm">inventory value</p>
    </Card>

    <Card>
      <CardTitle>Potential Revenue</CardTitle>
      <p className="text-3xl">${summary.potentialRevenue}</p>
      <p className="text-sm">if sold at destination</p>
    </Card>
  </div>

  {/* Filters */}
  <Card>
    <div className="flex gap-4">
      <Select>
        <option>All Priorities</option>
        <option value="5">Urgent (5)</option>
        <option value="4">High (4)</option>
      </Select>

      <Select>
        <option>All Stores (From)</option>
        <option value="GM">From GM</option>
        <option value="HM">From HM</option>
        <option value="NM">From NM</option>
        <option value="LM">From LM</option>
      </Select>

      <Select>
        <option>All Stores (To)</option>
        <option value="GM">To GM</option>
        <option value="HM">To HM</option>
        <option value="NM">To NM</option>
        <option value="LM">To LM</option>
      </Select>
    </div>
  </Card>

  {/* Recommendations Table */}
  <Card>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Priority</TableHead>
          <TableHead>Style</TableHead>
          <TableHead>Product</TableHead>
          <TableHead>From Store</TableHead>
          <TableHead>To Store</TableHead>
          <TableHead>Transfer Qty</TableHead>
          <TableHead>Sizes</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Est. Revenue</TableHead>
          <TableHead>Days to Sell</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {recommendations.map(rec => (
          <TableRow key={`${rec.styleNumber}-${rec.fromStore}-${rec.toStore}`}>
            <TableCell>
              <Badge variant={rec.priority >= 4 ? 'destructive' : 'secondary'}>
                {rec.priority}
              </Badge>
            </TableCell>
            <TableCell className="font-mono">{rec.styleNumber}</TableCell>
            <TableCell>{rec.itemName}</TableCell>
            <TableCell>
              <Badge variant="outline">{rec.fromStore}</Badge>
              <div className="text-xs text-muted-foreground">
                {rec.fromStoreQty} units
                {rec.fromStoreSalesVelocity > 0 &&
                  ` (${rec.fromStoreDaysOfSupply.toFixed(0)}d supply)`
                }
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{rec.toStore}</Badge>
              <div className="text-xs text-muted-foreground">
                {rec.toStoreQty} units
                ({rec.toStoreDaysOfSupply.toFixed(0)}d supply)
              </div>
            </TableCell>
            <TableCell className="font-semibold">
              {rec.recommendedQty} units
            </TableCell>
            <TableCell className="text-xs">{rec.sizesAvailable}</TableCell>
            <TableCell className="text-sm">{rec.reason}</TableCell>
            <TableCell>{formatCurrency(rec.estimatedRevenue)}</TableCell>
            <TableCell>{rec.estimatedDaysToSell.toFixed(0)} days</TableCell>
            <TableCell>
              <Button size="sm" onClick={() => handleCreateTransfer(rec)}>
                Create Transfer
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </Card>
</div>
```

**Export Format**:
- Excel file: "Transfer-List-YYYY-MM-DD.xlsx"
- Columns: Style #, Product, From, To, Qty, Sizes, Priority, Reason
- Ready to print for warehouse team

---

### Phase 8: Restocking (Buying) Recommendations Page

**Location**: New page `/restocking-recommendations`

**Purpose**: Identify which styles to reorder based on sales velocity, current stock, and receiving history

#### 8.1 Backend: Restocking Analysis Query

**New Storage Method**:
```typescript
getRestockingRecommendations(daysRange?: number): Promise<{
  summary: {
    totalRecommendations: number;
    urgentReorders: number;
    estimatedOrderValue: number;
    coreItemsToReorder: number;
  };
  recommendations: RestockingRecommendation[];
}>;

interface RestockingRecommendation {
  styleNumber: string;
  itemName: string;
  vendorName: string;
  category: string;

  // Current state
  totalActiveQty: number;
  storeBreakdown: {
    gm: number;
    hm: number;
    nm: number;
    lm: number;
    hq: number;
  };

  // Sales performance
  unitsSold30d: number;
  unitsSold90d: number;
  salesVelocity: number; // units/day
  currentDaysOfSupply: number;

  // Receiving history
  classification: string; // Core High, Core Medium, etc.
  timesReceived: number;
  lastReceivedDate: string;
  daysSinceLastReceive: number;
  avgQtyPerOrder: number;
  avgDaysBetweenOrders: number;

  // Recommendation
  recommendedOrderQty: number;
  suggestedSizeBreakdown: Array<{size: string; qty: number}>;
  priority: number; // 1-5 (5 = urgent reorder now)
  reason: string;
  reorderBy: string; // Target date

  // Financial
  avgOrderCost: number;
  avgSellingPrice: number;
  estimatedOrderCost: number;
  estimatedRevenue: number;
  marginPercent: number;
}
```

**Implementation**:
```sql
WITH style_current_stock AS (
  SELECT
    il.style_number,
    il.item_name,
    il.vendor_name,
    il.category,
    SUM(il.gm_qty + il.hm_qty + il.nm_qty + il.lm_qty + il.hq_qty) as total_active_qty,
    SUM(il.gm_qty) as gm_qty,
    SUM(il.hm_qty) as hm_qty,
    SUM(il.nm_qty) as nm_qty,
    SUM(il.lm_qty) as lm_qty,
    SUM(il.hq_qty) as hq_qty,
    AVG(il.order_cost) as avg_order_cost,
    AVG(il.selling_price) as avg_selling_price,
    MAX(il.last_rcvd) as last_received
  FROM item_list il
  WHERE il.style_number IS NOT NULL
  GROUP BY il.style_number, il.item_name, il.vendor_name, il.category
),
receiving_history AS (
  SELECT
    il.style_number,
    COUNT(DISTINCT rv.id) as times_received,
    MIN(rv.date) as first_received,
    MAX(rv.date) as last_received,
    AVG(rl.qty) as avg_qty_per_order,
    SUM(rl.qty) as total_ever_received,
    CASE
      WHEN COUNT(DISTINCT rv.id) >= 40 THEN 'Core High'
      WHEN COUNT(DISTINCT rv.id) BETWEEN 10 AND 39 THEN 'Core Medium'
      WHEN COUNT(DISTINCT rv.id) BETWEEN 6 AND 9 THEN 'Core Low'
      ELSE 'Non-Core'
    END as classification,
    -- Average days between orders
    CASE
      WHEN COUNT(DISTINCT rv.id) > 1
      THEN (MAX(rv.date) - MIN(rv.date)) / NULLIF(COUNT(DISTINCT rv.id) - 1, 0)
      ELSE NULL
    END as avg_days_between_orders
  FROM item_list il
  JOIN receiving_lines rl ON rl.item_number = il.item_number
  JOIN receiving_vouchers rv ON rv.id = rl.voucher_id
  WHERE il.style_number IS NOT NULL
  GROUP BY il.style_number
),
sales_velocity AS (
  SELECT
    il.style_number,
    COUNT(st.id) FILTER (WHERE st.date >= CURRENT_DATE - 30) as units_sold_30d,
    COUNT(st.id) FILTER (WHERE st.date >= CURRENT_DATE - 90) as units_sold_90d,
    (COUNT(st.id) FILTER (WHERE st.date >= CURRENT_DATE - 30) / 30.0) as velocity
  FROM item_list il
  LEFT JOIN sales_transactions st ON st.sku = il.item_number
  WHERE il.style_number IS NOT NULL
  GROUP BY il.style_number
),
reorder_candidates AS (
  SELECT
    scs.*,
    rh.classification,
    rh.times_received,
    rh.last_received as last_received_date,
    CURRENT_DATE - rh.last_received as days_since_last_receive,
    rh.avg_qty_per_order,
    rh.avg_days_between_orders,
    sv.units_sold_30d,
    sv.units_sold_90d,
    sv.velocity,

    -- Current days of supply
    CASE
      WHEN sv.velocity > 0 THEN scs.total_active_qty / sv.velocity
      ELSE 999
    END as current_days_supply,

    -- Recommended order quantity
    CASE
      -- Core High: Order enough for 60 days at current velocity
      WHEN rh.classification = 'Core High' THEN
        GREATEST(
          CEIL(sv.velocity * 60) - scs.total_active_qty,
          rh.avg_qty_per_order -- At least historical average
        )
      -- Core Medium: 45 days supply
      WHEN rh.classification = 'Core Medium' THEN
        GREATEST(
          CEIL(sv.velocity * 45) - scs.total_active_qty,
          rh.avg_qty_per_order
        )
      -- Core Low: 30 days supply
      WHEN rh.classification = 'Core Low' THEN
        GREATEST(
          CEIL(sv.velocity * 30) - scs.total_active_qty,
          rh.avg_qty_per_order
        )
      ELSE 0
    END as recommended_order_qty,

    -- Priority
    CASE
      -- Urgent: Core item, less than 7 days supply
      WHEN rh.classification LIKE 'Core%'
        AND (scs.total_active_qty / NULLIF(sv.velocity, 0)) < 7 THEN 5
      -- High: Core item, less than 14 days supply
      WHEN rh.classification LIKE 'Core%'
        AND (scs.total_active_qty / NULLIF(sv.velocity, 0)) < 14 THEN 4
      -- Medium: Core item, less than 30 days supply
      WHEN rh.classification LIKE 'Core%'
        AND (scs.total_active_qty / NULLIF(sv.velocity, 0)) < 30 THEN 3
      -- Low: Core item, time to reorder based on pattern
      WHEN rh.classification LIKE 'Core%'
        AND rh.avg_days_between_orders IS NOT NULL
        AND (CURRENT_DATE - rh.last_received) > (rh.avg_days_between_orders * 0.8) THEN 2
      ELSE 1
    END as priority,

    -- Reason
    CASE
      WHEN (scs.total_active_qty / NULLIF(sv.velocity, 0)) < 7
        THEN 'URGENT: Less than 1 week supply remaining'
      WHEN (scs.total_active_qty / NULLIF(sv.velocity, 0)) < 14
        THEN 'LOW STOCK: Less than 2 weeks supply'
      WHEN (scs.total_active_qty / NULLIF(sv.velocity, 0)) < 30
        THEN 'Approaching reorder point'
      WHEN rh.avg_days_between_orders IS NOT NULL
        AND (CURRENT_DATE - rh.last_received) > (rh.avg_days_between_orders * 0.8)
        THEN CONCAT('Regular reorder cycle (typically every ', rh.avg_days_between_orders, ' days)')
      ELSE 'Maintain stock levels'
    END as reason,

    -- Reorder by date
    CASE
      WHEN (scs.total_active_qty / NULLIF(sv.velocity, 0)) < 7
        THEN CURRENT_DATE + 2 -- Order within 2 days
      WHEN (scs.total_active_qty / NULLIF(sv.velocity, 0)) < 14
        THEN CURRENT_DATE + 7 -- Order within 1 week
      WHEN (scs.total_active_qty / NULLIF(sv.velocity, 0)) < 30
        THEN CURRENT_DATE + 14 -- Order within 2 weeks
      ELSE CURRENT_DATE + 30
    END as reorder_by

  FROM style_current_stock scs
  LEFT JOIN receiving_history rh ON rh.style_number = scs.style_number
  LEFT JOIN sales_velocity sv ON sv.style_number = scs.style_number
  WHERE rh.classification LIKE 'Core%' -- Only core items
    AND sv.velocity > 0 -- Only items that are selling
)
SELECT
  rc.*,
  (rc.recommended_order_qty * rc.avg_order_cost) as estimated_order_cost,
  (rc.recommended_order_qty * rc.avg_selling_price) as estimated_revenue,
  ((rc.avg_selling_price - rc.avg_order_cost) / NULLIF(rc.avg_selling_price, 0) * 100) as margin_percent
FROM reorder_candidates rc
WHERE rc.recommended_order_qty > 0 -- Only items that need ordering
  AND rc.priority >= 2 -- Skip very low priority
ORDER BY rc.priority DESC, rc.estimated_revenue DESC;
```

#### 8.2 Frontend: Restocking Recommendations Page

**New Route**: `/restocking-recommendations`

**Page Layout**:
```tsx
<div className="space-y-6">
  {/* Header */}
  <div className="flex justify-between items-center">
    <div>
      <h1>Restocking Recommendations</h1>
      <p>Smart reorder suggestions based on sales velocity and receiving patterns</p>
    </div>
    <div className="flex gap-2">
      <Button onClick={handleExportPurchaseOrders}>
        <Download /> Export Purchase Orders
      </Button>
      <Button onClick={handleExportByVendor}>
        <Download /> Group by Vendor
      </Button>
    </div>
  </div>

  {/* Summary Cards */}
  <div className="grid grid-cols-4 gap-4">
    <Card>
      <CardTitle>Total Recommendations</CardTitle>
      <p className="text-3xl">{summary.totalRecommendations}</p>
      <p className="text-sm">items to reorder</p>
    </Card>

    <Card className="border-red-200">
      <CardTitle>Urgent Reorders</CardTitle>
      <p className="text-3xl text-red-600">{summary.urgentReorders}</p>
      <p className="text-sm">less than 7 days supply</p>
    </Card>

    <Card>
      <CardTitle>Est. Order Value</CardTitle>
      <p className="text-3xl">${summary.estimatedOrderValue}</p>
      <p className="text-sm">total order cost</p>
    </Card>

    <Card>
      <CardTitle>Core Items</CardTitle>
      <p className="text-3xl">{summary.coreItemsToReorder}</p>
      <p className="text-sm">proven sellers to restock</p>
    </Card>
  </div>

  {/* Filters */}
  <Card>
    <div className="flex gap-4">
      <Select>
        <option>All Priorities</option>
        <option value="5">Urgent - Order Now (5)</option>
        <option value="4">High - This Week (4)</option>
        <option value="3">Medium - This Month (3)</option>
      </Select>

      <Select>
        <option>All Classifications</option>
        <option value="Core High">Core High (40+)</option>
        <option value="Core Medium">Core Medium (10-39)</option>
        <option value="Core Low">Core Low (6-9)</option>
      </Select>

      <Select>
        <option>All Vendors</option>
        {/* Populated dynamically */}
      </Select>
    </div>
  </Card>

  {/* Recommendations Table */}
  <Card>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Priority</TableHead>
          <TableHead>Style</TableHead>
          <TableHead>Product</TableHead>
          <TableHead>Vendor</TableHead>
          <TableHead>Classification</TableHead>
          <TableHead>Current Stock</TableHead>
          <TableHead>Days Supply</TableHead>
          <TableHead>Sales (30d)</TableHead>
          <TableHead>Order Qty</TableHead>
          <TableHead>Order Cost</TableHead>
          <TableHead>Reorder By</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {recommendations.map(rec => (
          <TableRow
            key={rec.styleNumber}
            className={rec.priority === 5 ? 'bg-red-50' : ''}
          >
            <TableCell>
              <Badge variant={
                rec.priority === 5 ? 'destructive' :
                rec.priority === 4 ? 'secondary' : 'outline'
              }>
                {rec.priority} - {
                  rec.priority === 5 ? 'URGENT' :
                  rec.priority === 4 ? 'HIGH' :
                  rec.priority === 3 ? 'MEDIUM' : 'LOW'
                }
              </Badge>
            </TableCell>
            <TableCell className="font-mono">{rec.styleNumber}</TableCell>
            <TableCell>
              <div>{rec.itemName}</div>
              <div className="text-xs text-muted-foreground">
                Last ordered: {formatDate(rec.lastReceivedDate)}
                ({rec.daysSinceLastReceive} days ago)
              </div>
            </TableCell>
            <TableCell>{rec.vendorName}</TableCell>
            <TableCell>
              <Badge variant="outline">{rec.classification}</Badge>
              <div className="text-xs text-muted-foreground">
                {rec.timesReceived}x ordered
              </div>
            </TableCell>
            <TableCell>
              <div className="font-semibold">{rec.totalActiveQty} units</div>
              <div className="text-xs text-muted-foreground">
                GM:{rec.storeBreakdown.gm} HM:{rec.storeBreakdown.hm}
                NM:{rec.storeBreakdown.nm} LM:{rec.storeBreakdown.lm}
              </div>
            </TableCell>
            <TableCell>
              <span className={
                rec.currentDaysOfSupply < 7 ? 'text-red-600 font-bold' :
                rec.currentDaysOfSupply < 14 ? 'text-orange-600' :
                'text-green-600'
              }>
                {rec.currentDaysOfSupply.toFixed(0)} days
              </span>
            </TableCell>
            <TableCell>{rec.unitsSold30d} units</TableCell>
            <TableCell className="font-semibold text-blue-600">
              {rec.recommendedOrderQty} units
              <div className="text-xs text-muted-foreground">
                Avg: {rec.avgQtyPerOrder.toFixed(0)} units/order
              </div>
            </TableCell>
            <TableCell>
              {formatCurrency(rec.estimatedOrderCost)}
              <div className="text-xs text-muted-foreground">
                {rec.marginPercent.toFixed(1)}% margin
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={
                new Date(rec.reorderBy) < new Date(Date.now() + 7*24*60*60*1000)
                  ? 'destructive' : 'secondary'
              }>
                {formatDate(rec.reorderBy)}
              </Badge>
            </TableCell>
            <TableCell className="text-sm max-w-xs">
              {rec.reason}
            </TableCell>
            <TableCell>
              <Button size="sm" onClick={() => handleCreatePO(rec)}>
                Create PO
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </Card>
</div>
```

**Export Formats**:

1. **Purchase Orders by Vendor**:
   - Group recommendations by vendor
   - Separate sheet per vendor
   - Include: Style, Qty, Cost, Total per vendor
   - Ready to send to suppliers

2. **Reorder List**:
   - All recommendations sorted by priority
   - Include current stock, sales velocity, recommended qty
   - Print for buying team

#### 8.3 Smart Size Breakdown Recommendations

**Algorithm for suggesting size distribution**:
```typescript
function suggestSizeBreakdown(
  styleNumber: string,
  totalQty: number,
  historicalSales: SalesBySize[]
): Array<{size: string; qty: number}> {

  // Calculate historical sell-through rate per size
  const sizePerformance = historicalSales.reduce((acc, sale) => {
    if (!acc[sale.size]) {
      acc[sale.size] = {totalReceived: 0, totalSold: 0};
    }
    acc[sale.size].totalReceived += sale.qtyReceived;
    acc[sale.size].totalSold += sale.qtySold;
    return acc;
  }, {});

  // Calculate percentage for each size based on sell-through
  const totalSellThrough = Object.values(sizePerformance)
    .reduce((sum, s) => sum + s.totalSold, 0);

  const sizeDistribution = Object.entries(sizePerformance).map(([size, perf]) => ({
    size,
    percentage: perf.totalSold / totalSellThrough,
    sellThroughRate: perf.totalSold / perf.totalReceived
  }));

  // Allocate total qty proportionally
  return sizeDistribution.map(sd => ({
    size: sd.size,
    qty: Math.round(totalQty * sd.percentage)
  })).filter(s => s.qty > 0);
}
```

**Example Output**:
```
Recommended order: 24 units of Style "Rebel Minds Track Pants Black/White"

Suggested size breakdown:
- S: 3 units (12.5%)
- M: 8 units (33.3%)
- L: 8 units (33.3%)
- XL: 5 units (20.8%)

Based on historical sell-through:
- S: 95% sell-through rate
- M: 92% sell-through rate
- L: 88% sell-through rate
- XL: 75% sell-through rate
```

---

### Phase 9: Profit Margin Integration

**Critical Finding**: We have excellent profit margin data available!

**Data Available**:
- ✅ `order_cost` - What we paid for the item
- ✅ `selling_price` - What we sell it for
- ✅ 99.3% coverage (7,677 out of 7,734 items have pricing)
- ✅ Average margin: 62.34% across all inventory
- ✅ Range: -80% to 92.66% (some clearance items sold at loss, some high-margin accessories)

**Why Profit Margins Matter**:

1. **Transfer Decisions**:
   - Don't transfer low-margin items if shipping costs eat into profit
   - Prioritize transferring high-margin items (maximize profit per unit moved)

2. **Restocking Priorities**:
   - Reorder high-margin core items FIRST (same sales velocity = more profit)
   - Low-margin items should meet higher velocity thresholds to justify reordering

3. **Dead Stock Clearance**:
   - High-margin dead stock: Try transfers first, markdown later
   - Low-margin dead stock: Aggressive clearance immediately (tied capital not worth it)

4. **Google Ads Budget Allocation**:
   - Focus ad spend on high-margin items (better ROI)
   - Low-margin items need very high conversion to justify ad costs

#### 9.1 Margin-Adjusted Priorities

**Transfer Recommendations - Updated Priority Logic**:
```typescript
function calculateTransferPriority(rec: TransferRecommendation): number {
  const basePriority = rec.priority; // 1-5 based on urgency
  const marginPercent = rec.marginPercent;

  // Boost priority for high-margin items
  let adjustedPriority = basePriority;

  if (marginPercent > 80) {
    adjustedPriority += 1; // Very high margin (80%+): boost by 1
  } else if (marginPercent > 70) {
    adjustedPriority += 0.5; // High margin (70-80%): boost by 0.5
  } else if (marginPercent < 40) {
    adjustedPriority -= 0.5; // Low margin (<40%): reduce by 0.5
  }

  // Cap at 5
  return Math.min(5, adjustedPriority);
}
```

**Example**:
```
Transfer Option A:
- Style: NEXUS Nylon Tactical Bag
- Margin: 92.66% ($13.89 profit per unit)
- Urgency: Priority 3 (medium)
- ADJUSTED: Priority 4 (boosted for ultra-high margin)

Transfer Option B:
- Style: Generic T-shirt
- Margin: 35% ($5 profit per unit)
- Urgency: Priority 3 (medium)
- ADJUSTED: Priority 2.5 (reduced for low margin)

Decision: Transfer A first - nearly 3x profit per unit!
```

**Restocking Recommendations - Margin-Weighted Scoring**:
```typescript
function calculateRestockingScore(rec: RestockingRecommendation): number {
  const urgency = rec.priority; // 1-5
  const marginPercent = rec.marginPercent;
  const salesVelocity = rec.salesVelocity;

  // Score formula: Urgency × Margin Weight × Velocity
  const marginWeight = marginPercent / 100; // 0.0 to 1.0
  const velocityWeight = Math.min(salesVelocity / 2.0, 1.0); // Cap at 2 units/day

  return urgency * marginWeight * velocityWeight * 10;
}
```

**Example Comparison**:
```
Reorder Option A:
- Jordan Craig Shearling Coat
- Margin: 96.25% ($192.50/unit)
- Urgency: Priority 3 (30 days supply)
- Velocity: 0.5 units/day
- SCORE: 3 × 0.9625 × 0.25 × 10 = 7.22

Reorder Option B:
- Generic Hoodie
- Margin: 40% ($10/unit)
- Urgency: Priority 4 (14 days supply)
- Velocity: 1.0 units/day
- SCORE: 4 × 0.40 × 0.50 × 10 = 8.00

Decision: Close call! Option B slightly higher score due to urgency + velocity,
BUT Option A yields $192.50 profit vs. $10 profit per unit.

Better approach: Show BOTH scores:
- Urgency Score: 8.00 (Option B wins - needs ordering sooner)
- Profit Score: 96.25 (Option A wins - much higher profit per unit)
```

#### 9.2 New Metrics to Display

**Transfer Recommendations - Add Columns**:
```tsx
<TableHead>Profit/Unit</TableHead>
<TableHead>Total Profit Potential</TableHead>
<TableHead>Margin %</TableHead>

// In table body:
<TableCell>{formatCurrency(rec.marginPerUnit)}</TableCell>
<TableCell className="font-semibold text-green-600">
  {formatCurrency(rec.recommendedQty * rec.marginPerUnit)}
</TableCell>
<TableCell>
  <Badge variant={
    rec.marginPercent > 70 ? 'default' :
    rec.marginPercent > 50 ? 'secondary' : 'outline'
  }>
    {rec.marginPercent.toFixed(1)}%
  </Badge>
</TableCell>
```

**Restocking Recommendations - Add Columns**:
```tsx
<TableHead>Margin/Unit</TableHead>
<TableHead>Total Profit Potential</TableHead>
<TableHead>Profit Priority</TableHead>

// In table body:
<TableCell>{formatCurrency(rec.marginPerUnit)}</TableCell>
<TableCell className="font-semibold text-green-600">
  {formatCurrency(rec.recommendedOrderQty * rec.marginPerUnit)}
</TableCell>
<TableCell>
  <Badge variant={
    rec.marginPercent > 80 ? 'default' :
    rec.marginPercent > 60 ? 'secondary' : 'outline'
  }>
    {rec.profitPriority} - {rec.marginPercent.toFixed(1)}%
  </Badge>
</TableCell>
```

#### 9.3 Margin-Based Filters

**New Filter Options**:
```tsx
<Select name="marginTier">
  <option value="">All Margins</option>
  <option value="high">High Margin (70%+)</option>
  <option value="medium">Medium Margin (50-70%)</option>
  <option value="low">Low Margin (<50%)</option>
</Select>

<Select name="profitPotential">
  <option value="">All Profit Levels</option>
  <option value="1000">$1000+ Profit Potential</option>
  <option value="500">$500+ Profit Potential</option>
  <option value="100">$100+ Profit Potential</option>
</Select>
```

#### 9.4 Dashboard Summary Cards - Add Profit Focus

**Inventory Turnover Dashboard - New Cards**:
```tsx
<Card>
  <CardTitle>High-Margin Inventory</CardTitle>
  <CardContent>
    <p className="text-3xl">${metrics.highMarginInventoryValue}</p>
    <p className="text-sm">{metrics.highMarginStyleCount} styles (70%+ margin)</p>
    <p className="text-xs text-green-600">
      ${metrics.highMarginPotentialProfit} profit if sold
    </p>
  </CardContent>
</Card>

<Card>
  <CardTitle>Low-Margin Dead Stock</CardTitle>
  <CardContent>
    <p className="text-3xl text-red-600">${metrics.lowMarginDeadStockValue}</p>
    <p className="text-sm">{metrics.lowMarginDeadStockCount} styles</p>
    <p className="text-xs text-red-600">
      PRIORITY: Clear immediately (low profit potential)
    </p>
  </CardContent>
</Card>
```

**Transfer Recommendations - Summary**:
```tsx
<Card>
  <CardTitle>High-Margin Transfers</CardTitle>
  <p className="text-3xl">{summary.highMarginTransfers}</p>
  <p className="text-sm">70%+ margin items to move</p>
  <p className="text-xs text-green-600">
    ${summary.highMarginProfit} profit potential
  </p>
</Card>
```

**Restocking Recommendations - Summary**:
```tsx
<Card>
  <CardTitle>High-Margin Reorders</CardTitle>
  <p className="text-3xl">{summary.highMarginReorders}</p>
  <p className="text-sm">70%+ margin items to restock</p>
  <p className="text-xs text-green-600">
    ${summary.projectedProfit} profit on reorder
  </p>
</Card>
```

#### 9.5 Export Enhancements

**Add to all exports**:
- Column: "Margin %"
- Column: "Profit/Unit"
- Column: "Total Profit Potential"
- Sheet: "High-Margin Priorities" (filtered to 70%+ margin)

**Google Ads Segmentation Report**:
```
Add Custom Label:
- custom_label_5: margin_tier (High/Medium/Low)

Filter Sheet 8 (Google Shopping Feed):
- Only include items with 50%+ margin
- Reason: Ad costs will eat into profit, need healthy margins
```

#### 9.6 Business Rules Based on Margins

**Transfer Decisions**:
```
IF margin < 30% AND estimated_revenue < $100:
  → Don't transfer (shipping costs not worth it)
  → Recommend: Clearance at current location

IF margin > 70% AND velocity_difference > 0.5:
  → PRIORITY transfer (high profit per unit)

IF margin 30-70%:
  → Standard urgency rules apply
```

**Restocking Decisions**:
```
IF margin < 40%:
  → Only reorder if Priority 4+ (urgent need)
  → Reason: Low profit doesn't justify carrying costs

IF margin > 70%:
  → Reorder at Priority 3 (proactive)
  → Reason: High profit worth keeping in stock

IF margin > 85%:
  → Always maintain 60 days supply
  → Reason: Ultra-high profit items are goldmines
```

**Clearance Pricing Strategy**:
```
IF margin > 70% AND days_since_last_sale > 180:
  → Start at 25% off (still 50%+ margin)
  → Try transfers first

IF margin 40-70% AND days_since_last_sale > 180:
  → Start at 40% off
  → Mix of transfers + clearance

IF margin < 40% AND days_since_last_sale > 90:
  → Start at 50% off (aggressive clearance)
  → Free up capital quickly
```

#### 9.7 Real Examples from Your Data

**Ultra-High Margin Items** (Prioritize for everything):
```
1. Jordan Craig Shearling Coat
   - Cost: $7.50 → Price: $200 → Margin: 96.25%
   - Profit: $192.50/unit
   - Strategy: ALWAYS keep in stock, transfer aggressively, feature in ads

2. NEXUS Nylon Tactical Bag
   - Cost: $1.10 → Price: $14.99 → Margin: 92.66%
   - Profit: $13.89/unit
   - Strategy: Low cost + high margin = perfect for ads

3. DNA Premium Rhinestone Slippers
   - Cost: $8.60 → Price: $80 → Margin: 89.25%
   - Profit: $71.40/unit
   - Strategy: High-value transfers, premium positioning
```

**Moderate Margin Items** (Standard rules):
```
WaiMea Jeans
- Cost: $10 → Price: $65 → Margin: 84.62%
- Profit: $55/unit
- Strategy: Good margins, follow velocity-based reordering
```

**Low/Negative Margin Items** (Clear aggressively):
```
Clearance items with negative margins indicate:
- Already marked down below cost (liquidation mode)
- Don't spend ad budget or transfer costs
- Sell locally and move on
```

#### 9.8 SQL Query Updates

**Add margin calculations to all queries**:
```sql
-- In style aggregation:
AVG(il.selling_price - il.order_cost) as avg_margin_dollars,
(AVG(il.selling_price - il.order_cost) / NULLIF(AVG(il.selling_price), 0) * 100) as avg_margin_percent,

-- In transfer recommendations:
(to.recommended_qty * AVG(si.selling_price - si.order_cost)) as total_profit_potential,

-- In restocking recommendations:
(rc.recommended_order_qty * (rc.avg_selling_price - rc.avg_order_cost)) as total_profit_potential,

-- Priority boosting:
CASE
  WHEN avg_margin_percent > 80 THEN base_priority + 1
  WHEN avg_margin_percent > 70 THEN base_priority + 0.5
  WHEN avg_margin_percent < 40 THEN base_priority - 0.5
  ELSE base_priority
END as adjusted_priority
```

---

### Phase 10: Non-Product Item Exclusions

**Critical Issue**: Database contains non-sellable items that will skew all analytics

**Items Found**:
- **152 total non-product items** identified
- **91 items** in non-product categories (Supplies, Cleaning Supplies, System, etc.)
- **61 items** are system/service items (taxes, discounts, shipping insurance)
- **54 items** actually have stock (1,005 units total) - these are supplies, not apparel

**Categories to Exclude**:
1. `Supplies` (36 items, 696 units) - Banners, bags, cash register paper
2. `Cleaning Supplies` (32 items, 309 units) - Sponges, cleaning products (not apparel!)
3. `System` (1 item) - "Online Tax"
4. `Refund` (1 item) - "Online Refund"
5. `Shipping` (1 item) - Flat fee items
6. `GIFT CARD` (12 items) - Not physical inventory
7. `Certificate` (1 item)
8. `Printer` (6 items)
9. `Electronic` (1 item)

**Name Patterns to Exclude**:
- Items containing "tax", "discount", "shipping insurance", "route", "refund"
- Specific: "ONLINE DISCOUNT TAKEN", "Route Shipping Insurance/Protection"

#### 10.1 Global Exclusion Filter

**Create SQL Function for Reusability**:
```sql
-- Add to database schema
CREATE OR REPLACE FUNCTION is_sellable_product(
  p_category TEXT,
  p_item_name TEXT
) RETURNS BOOLEAN AS $$
BEGIN
  -- Exclude by category
  IF p_category IN (
    'Supplies', 'Cleaning Supplies', 'System', 'Refund',
    'Shipping', 'GIFT CARD', 'Certificate', 'Printer', 'Electronic'
  ) THEN
    RETURN FALSE;
  END IF;

  -- Exclude by item name patterns
  IF LOWER(p_item_name) LIKE '%tax%'
    OR LOWER(p_item_name) LIKE '%discount%'
    OR LOWER(p_item_name) LIKE '%shipping%insurance%'
    OR LOWER(p_item_name) LIKE '%shipping%protection%'
    OR LOWER(p_item_name) LIKE '%route%shipping%'
    OR LOWER(p_item_name) LIKE '%refund%'
    OR LOWER(p_item_name) LIKE '%adjustment%'
    OR p_item_name = 'ONLINE DISCOUNT TAKEN'
  THEN
    RETURN FALSE;
  END IF;

  -- Everything else is sellable
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

**Usage in All Queries**:
```sql
-- Instead of:
SELECT * FROM item_list WHERE avail_qty > 0

-- Use:
SELECT * FROM item_list
WHERE avail_qty > 0
  AND is_sellable_product(category, item_name) = TRUE
```

#### 10.2 Update All Storage Methods

**Pattern to Apply Everywhere**:
```typescript
// In TypeScript/Drizzle queries:
const EXCLUDED_CATEGORIES = [
  'Supplies',
  'Cleaning Supplies',
  'System',
  'Refund',
  'Shipping',
  'GIFT CARD',
  'Certificate',
  'Printer',
  'Electronic'
];

const EXCLUDED_NAME_PATTERNS = [
  '%tax%',
  '%discount%',
  '%shipping%insurance%',
  '%shipping%protection%',
  '%route%shipping%',
  '%refund%',
  'ONLINE DISCOUNT TAKEN'
];

// Base WHERE clause for all queries:
sql`
  WHERE (
    -- Must have stock
    ${itemList.availQty} > 0

    -- Exclude non-product categories
    AND (
      ${itemList.category} NOT IN ${EXCLUDED_CATEGORIES}
      OR ${itemList.category} IS NULL
    )

    -- Exclude system items by name
    AND NOT (
      LOWER(${itemList.itemName}) LIKE ANY(ARRAY[${EXCLUDED_NAME_PATTERNS}])
    )
  )
`
```

#### 10.3 Apply to Each Phase

**Phase 1 - Backend Queries**: Add exclusion to EVERY query
```sql
-- Style aggregation base:
FROM item_list il
WHERE il.style_number IS NOT NULL
  AND (il.gm_qty + il.hm_qty + il.nm_qty + il.lm_qty + il.hq_qty) > 0
  -- ADD THIS:
  AND is_sellable_product(il.category, il.item_name) = TRUE
```

**Phase 6 - Segmentation Report**: Exclude non-products
```sql
-- Don't include supplies in Google Ads feed!
WHERE is_sellable_product(il.category, il.item_name) = TRUE
```

**Phase 7 - Transfer Recommendations**: Only sellable products
```sql
-- Don't recommend transferring cleaning supplies
FROM store_inventory si
WHERE is_sellable_product(si.category, si.item_name) = TRUE
```

**Phase 8 - Restocking Recommendations**: Only sellable products
```sql
-- Don't recommend reordering gift cards or tax line items
WHERE rh.classification LIKE 'Core%'
  AND sv.velocity > 0
  AND is_sellable_product(scs.category, scs.item_name) = TRUE
```

#### 10.4 Impact on Current Metrics

**Before Exclusion** (misleading):
```
Total Inventory Value: $530,050.08
Total Units: 34,750
Unique Styles: 6,584
```

**After Exclusion** (accurate):
```
Total Inventory Value: ~$523,607 (-$6,443 in supplies)
Total Units: ~33,745 (-1,005 supply units)
Unique Styles: ~6,493 (-91 non-product items)
```

**Dead Stock Calculation Impact**:
```
OLD (including supplies):
- Cleaning sponges sitting 2 years = flagged as dead stock ✗ WRONG

NEW (excluding supplies):
- Cleaning sponges excluded from analysis ✓ CORRECT
- Only apparel/accessories analyzed for dead stock
```

#### 10.5 UI Indicators

**Add Visual Exclusion Info**:
```tsx
// On any page with filters:
<Alert variant="info">
  <InfoIcon className="w-4 h-4" />
  <AlertTitle>Filtered View</AlertTitle>
  <AlertDescription>
    Excluding 152 non-product items (supplies, system items, taxes, discounts).
    Showing only sellable apparel & accessories.
  </AlertDescription>
</Alert>

// Optional: Allow viewing excluded items
<Checkbox id="showExcluded" onChange={handleToggleExcluded}>
  <label htmlFor="showExcluded">
    Show excluded items (supplies, system items)
  </label>
</Checkbox>
```

#### 10.6 Admin Page for Exclusion Management

**Optional: Create exclusion management UI**:
```tsx
// New page: /admin/exclusions
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Item #</TableHead>
      <TableHead>Item Name</TableHead>
      <TableHead>Category</TableHead>
      <TableHead>Exclusion Reason</TableHead>
      <TableHead>Action</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {excludedItems.map(item => (
      <TableRow>
        <TableCell>{item.itemNumber}</TableCell>
        <TableCell>{item.itemName}</TableCell>
        <TableCell>{item.category}</TableCell>
        <TableCell>
          <Badge variant="outline">{item.exclusionReason}</Badge>
        </TableCell>
        <TableCell>
          <Button size="sm" variant="ghost">
            Mark as Sellable
          </Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

#### 10.7 Validation Query

**Run this to verify exclusions working**:
```sql
-- Check exclusions are applied correctly
SELECT
  'Total Items' as metric,
  COUNT(*) as count
FROM item_list
WHERE avail_qty > 0

UNION ALL

SELECT
  'Sellable Products Only' as metric,
  COUNT(*) as count
FROM item_list
WHERE avail_qty > 0
  AND is_sellable_product(category, item_name) = TRUE

UNION ALL

SELECT
  'Excluded Items' as metric,
  COUNT(*) as count
FROM item_list
WHERE avail_qty > 0
  AND is_sellable_product(category, item_name) = FALSE;
```

**Expected Result**:
```
metric                 | count
-----------------------+-------
Total Items            | 7,734
Sellable Products Only | 7,680  (54 items with stock excluded)
Excluded Items         |    54  (supplies in stock)
```

#### 10.8 Documentation Updates

**Add to every report/export**:
```
Note: This report excludes non-product items including:
- Office/cleaning supplies (91 items)
- System items (taxes, discounts, refunds) (61 items)
- Total excluded: 152 items

Analysis focuses on sellable apparel and accessories only.
```

**Data Dictionary Update**:
```markdown
## Excluded Item Categories

The following items are excluded from all inventory analysis:

**By Category**:
- Supplies (banners, bags, packaging)
- Cleaning Supplies (sponges, cleaning products)
- System (tax line items, system entries)
- Refund (refund processing items)
- Shipping (shipping fee items)
- GIFT CARD (not physical inventory)
- Certificate, Printer, Electronic

**By Name Pattern**:
- Items containing: "tax", "discount", "shipping insurance",
  "route", "refund", "adjustment"
- Specific items: "ONLINE DISCOUNT TAKEN"

**Reason**: These items are not sellable products and would
distort sales velocity, turnover, and profitability metrics.
```

---

### Phase 11: Documentation & Training

**Dashboard Help Text**:
```
ℹ️ About This Dashboard:
- Analysis is at STYLE level (e.g., "Rebel Minds Track Pants Black/White")
  not individual sizes (S, M, L, XL)
- "Active Inventory" excludes closed stores (MM, PM)
- "Core Items" = received 6+ times (your bread and butter)
- "Seasonal Hold" = out-of-season items (not dead stock)
- "Classification" based on receiving frequency over 6+ years
```

**Tooltips**:
- Total Active Inventory: "Sum of all active stores (GM, HM, NM, LM) + HQ. Excludes closed stores MM, PM."
- Core Items: "Styles received 6+ times. These are your proven sellers."
- Dead Stock: "Items not selling considering classification and seasonality"

**Segmentation Report Help**:
```
📊 About the Segmentation Report:

This report organizes your inventory into actionable segments for Google Ads:

• Best Sellers: Your top performers - allocate highest ad budget here
• Core Items: Proven steady sellers - evergreen campaigns
• New Arrivals: Recently received items - "New In" promotions
• Seasonal: Summer/Winter items - time-based campaigns
• Clearance: Slow movers - deep discount campaigns

Each segment includes:
- Priority score (1-5) for budget allocation
- Recommended budget tier (High/Medium/Low)
- Auto-generated keywords for ad targeting
- Google Shopping feed format (Sheet 8)

Use this report to:
1. Create targeted ad campaigns by segment
2. Allocate budget based on priority scores
3. Upload Google Shopping feed (Sheet 8)
4. Focus marketing on high-margin, high-velocity items
```

---

## Seasonal Pattern Detection - Detailed Rules

### Auto-Detection Algorithm

**Data Required**:
- All receiving dates for each style
- Item name/description keywords
- Category information

**Classification Logic**:

```python
def detect_seasonal_pattern(style_receives, item_name, category):
    # Count receives by month
    summer_months = [6, 7, 8]
    winter_months = [12, 1, 2]
    spring_fall_months = [3, 4, 5, 9, 10, 11]

    summer_count = count_receives_in_months(style_receives, summer_months)
    winter_count = count_receives_in_months(style_receives, winter_months)
    spring_fall_count = count_receives_in_months(style_receives, spring_fall_months)
    total_count = len(style_receives)

    # Keyword detection
    summer_keywords = ['short', 'tank', 'swim', 'sandal', 'tee', 'summer']
    winter_keywords = ['jacket', 'coat', 'hoodie', 'beanie', 'sweater', 'winter', 'fleece']

    has_summer_keyword = any(kw in item_name.lower() for kw in summer_keywords)
    has_winter_keyword = any(kw in item_name.lower() for kw in winter_keywords)

    # Pattern detection (60% threshold)
    if summer_count / total_count > 0.6 or has_summer_keyword:
        return 'Summer'
    elif winter_count / total_count > 0.6 or has_winter_keyword:
        return 'Winter'
    elif spring_fall_count / total_count > 0.6:
        return 'Spring/Fall'
    elif total_count >= 6:  # Received regularly across all seasons
        return 'Year-Round'
    else:
        return 'Unknown'
```

### Seasonal Dead Stock Logic

```python
def is_dead_stock_seasonal_aware(item, current_month):
    classification = item['classification']
    seasonal_pattern = item['seasonal_pattern']
    days_since_last_sale = item['days_since_last_sale']
    days_since_last_receive = item['days_since_last_receive']

    # Define seasons
    summer_season = [6, 7, 8]
    winter_season = [12, 1, 2]

    # Seasonal items outside their season
    if seasonal_pattern == 'Summer' and current_month not in summer_season:
        # Don't flag as dead until 12+ months no sale
        if days_since_last_sale > 365:
            return True, "Seasonal - Consider clearance if not selling next season"
        else:
            return False, "Seasonal Hold - Normal for off-season"

    if seasonal_pattern == 'Winter' and current_month not in winter_season:
        if days_since_last_sale > 365:
            return True, "Seasonal - Consider clearance if not selling next season"
        else:
            return False, "Seasonal Hold - Normal for off-season"

    # Core items (year-round or in-season)
    if classification.startswith('Core'):
        # New arrivals
        if days_since_last_receive < 30:
            return False, "New Arrival"

        # Core items should turn quickly
        if days_since_last_sale > 90:
            return True, "Dead Stock - Core item not moving"
        else:
            return False, "Healthy"

    # Non-core items
    if days_since_last_sale > 180:
        return True, "Dead Stock - Long stale period"

    return False, "Healthy"
```

---

## Expected Outcomes After Implementation

**Current State**:
- Dead Stock: $301,912 (57% of inventory) ❌ MISLEADING
- Analysis: SKU-level (individual sizes)
- Includes: Closed stores MM, PM
- No classification context

**After Implementation**:
- Dead Stock: ~$150K-200K (17-23% of inventory) ✅ REALISTIC
  - Excludes seasonal hold (~$50K)
  - Excludes new arrivals (<30 days)
  - Excludes closed stores
- Analysis: Style-level (business decision unit)
- Clear separation: Active vs Closed stores
- Classification badges: See at a glance if Core vs One-Time

**Actionable Insights Gained**:
1. "These 50 STYLES are dead stock (not 500 random SKUs)"
2. "Core items slowing down - investigate why"
3. "Seasonal items performing normally"
4. "Transfer these styles from MM/PM to active stores"
5. "Focus marketing budget on 1,083 core styles"

---

**Ready to begin implementation? Recommend starting with Phase 1 (Backend) to validate data before touching frontend.**

---

## PHASE 1 ANALYSIS RESULTS - Receiving History

**Analysis Date**: 2025-10-01 (Tuesday)
**Data Analyzed**: 6.6 years of receiving history (2019-01-04 to 2025-09-26)

### Key Findings:

**Dataset Overview:**
- Total receiving lines: 260,971
- Total vouchers: 22,388
- Total units received (all time): 317,019
- Unique item numbers: 50,456
- Unique style+color combinations: 6,584

**Receiving Patterns by Style+Color:**
- Average times received per style+color: 4.4
- Median times received: 2 (half received 2 or fewer times)
- Range: 1 to 200 times received
- Average quantity per receiving: 1.4 units (confirms small batch business model)
- Average total quantity ever received per style+color: 34.8 units

**Classification Breakdown:**

| Classification | Count | % of Total | Avg Receives | Avg Total Qty | Avg Current Stock | Total Inventory Value |
|---|---|---|---|---|---|---|
| **CORE - High Frequency** (40+ receives) | 62 | 0.9% | 71.8 | 758.2 | 4,442.8 | $2,634,459 |
| **CORE - Medium Frequency** (10-39 receives) | 461 | 7.0% | 17.5 | 153.5 | 746.3 | $4,205,493 |
| **CORE - Low Frequency** (6-9 receives) | 560 | 8.5% | 7.2 | 56.8 | 102.3 | $890,251 |
| **Non-Core Repeat** (2-5 receives) | 3,327 | 50.5% | 3.1 | 19.8 | 20.0 | $1,023,951 |
| **One-Time Purchase** (1 receive) | 2,305 | 35.0% | 1.0 | 5.9 | 1.6 | $69,602 |
| **TOTAL** | 6,715 | 100% | - | - | - | **$8,823,756** |

**Core Items Insight:**
- Only 16.4% of style+color combinations are "Core" items (1,083 out of 6,584)
- BUT they represent **86.8% of inventory value** ($7.7M out of $8.8M)
- Core items are actively managed and selling (most recent sales in Sept 2025)
- Top core item: Rebel Minds 100-401 Black/White track pants (received 200 times since 2019!)

**Seasonal Patterns:**
- Peak receiving months: March (25,700 units) and September (27,887 units)
- Slowest month: December (11,263 units)
- Pattern suggests Spring/Fall seasonal replenishment cycles

**New Arrivals (Last 60 Days):**
- Jordan Craig premium items (JS2310, 91590, 91667 series) - High margin ($100-250/unit)
- New Era hats (11591xxx, 70xxx series) - Core replenishment
- Roku Studio new styles (RK5481xxx series) - Testing new vendor
- WaiMea jackets (M8248TA) - Seasonal winter prep

**Clearance Candidates Identified:**
- Items not received since before 2024-01-01
- AND no sales since before 2024-01-01
- Still have current stock (dead inventory)
- Examples: Dallas Cowboys promo items, Old Lacoste styles, Discontinued G-Star denim
- Total identified: ~500 units worth minimal value (mostly null costs in query)

**Data Quality Notes:**
- MM and PM (closed stores) have ZERO inventory in receiving analysis (good - already transferred out)
- Some style_number values are empty/null - need to investigate
- HQ has negative inventory in some cases (likely fulfillment timing issues)

### Insights for Google Marketing Segmentation:

**Segment 1: Core Best Sellers** (62 high-frequency items)
- Proven demand, regular replenishment
- High inventory depth ($2.6M value)
- Target for evergreen ad campaigns
- Examples: Rebel Minds track pants, New Era Yankees hats, Argonaut Nations pants

**Segment 2: Core Steady Performers** (461 medium-frequency items)
- Regular but less frequent replenishment
- $4.2M inventory value (largest segment)
- Target for category-specific campaigns
- Mix of apparel and accessories

**Segment 3: New Arrivals** (last 60 days)
- Fresh inventory, high margins
- Jordan Craig premium line ($100-250 margin per unit!)
- Target for "New In" campaigns
- Roku Studio new vendor test

**Segment 4: Seasonal/Opportunistic** (3,327 non-core repeat)
- 2-5 time purchases
- Test items, seasonal specials
- Target for limited-time offers
- Many may be discontinued

**Segment 5: Clearance/Liquidation** (old stock, no recent activity)
- Not received or sold in 12+ months
- Target for deep discount campaigns
- Goal: Clear inventory for cash flow

---

## Notes & Observations

**Date**: 2025-10-01 (Tuesday)

- Current dead stock value of 57% seems extremely high and likely incorrect
- Need to validate receiving history data is complete and accurate
- Should cross-reference with actual business knowledge (are there really $301K in dead stock?)
- Small batch sizes (12-24 units) mean individual sales have big % impact on metrics
- HQ sales velocity is misleading for redistribution decisions (online fulfills from stores)
- MM and PM closed stores likely contributing to inflated dead stock numbers
- Google Marketing meeting Thursday requires segmentation analysis - URGENT PRIORITY

**Key Insight**: Need to focus on STYLE + COLOR combinations for receiving analysis, not just individual SKUs. Business orders 12-24 units per style per color across all sizes, so receiving patterns will be at that level.

**VALIDATED**: Receiving analysis confirms small-batch business model (avg 1.4 units per receiving line, 34.8 total units per style+color over 6 years). This is NOT a traditional retail operation - metrics must be adjusted accordingly.

---

**This is a living document. Update as we refine our thinking and validate assumptions with real data analysis.**

# Profit-Based Optimizer Formula - AGREED APPROACH

**Date:** October 12, 2025
**Status:** APPROVED FOR IMPLEMENTATION
**Participants:** User + Claude
**Based On:** 8501B Historical Analysis (5.5 years, 5,968 sales, $161,447 profit)

---

## 🎯 **Core Principle**

**The optimizer maximizes PROFIT, not coverage percentage.**

### Decision Question (NEW):
> "Which prepack combination generates the MOST PROFIT in dollars?"

### NOT This (OLD):
> "Which combination achieves 85% coverage with <35% waste?"

---

## 📊 **Required Data Per SKU**

### SKU Definition:
```
SKU = Style + Color + Size + Inseam

Example: 8501B + Black + 36W + 32L
```

### For EACH SKU, the optimizer needs:

#### 1. **Financial Data**
- **Selling Price:** Average from sales_transactions.price (e.g., $41.05 for 8501B)
- **Unit Cost:** From vendor (e.g., $14.00 for Argonaut Nations)
- **Profit Per Unit:** Selling Price - Unit Cost (e.g., $27.05)
- **Margin %:** (Selling Price - Unit Cost) / Selling Price (e.g., 65.90%)

#### 2. **Sales Velocity Over Time**
- **Last 30 days:** COUNT(sales) / 30 → daily velocity
- **Last 90 days:** COUNT(sales) / 90 → daily velocity
- **Last 365 days:** COUNT(sales) / 365 → daily velocity
- **All-time:** COUNT(sales) / days_since_first_sale → daily velocity
- **Trend:** Is velocity increasing, stable, or decreasing?

#### 3. **Current Inventory**
- **Units in Stock:** SUM(gm_qty + hm_qty + nm_qty + lm_qty)
- **Days of Supply:** current_inventory / daily_velocity (use 30-day velocity)
- **Stockout Risk:** Days until this SKU hits zero

#### 4. **Prepack Contents**
- **Which prepacks contain this size?** (Pack A, Pack B, etc.)
- **Quantity per box:** How many of this exact size in each prepack type
- **Cost per box:** Price of the prepack

---

## 💰 **The Profit Formula**

For each potential prepack combination:

```
Net Profit = Expected Revenue
           - Prepack Cost
           - Holding Cost (excess inventory)
           - Opportunity Cost (stockouts)
```

### Component Breakdown:

#### A. Expected Revenue
```python
expected_revenue = 0

for each SKU in prepack:
    units_we_will_sell = min(units_ordered, units_needed)
    revenue_from_sku = units_we_will_sell × selling_price × (profit_margin_pct)
    expected_revenue += revenue_from_sku
```

**Logic:**
- If we order exactly what's needed → capture full profit
- If we order MORE than needed → only count profit on what will sell
- If we order LESS than needed → only count profit on what we ordered

#### B. Prepack Cost
```python
prepack_cost = sum(boxes_of_pack_A × cost_per_box_A,
                   boxes_of_pack_B × cost_per_box_B,
                   ...)
```

**Example:** 4× Pack A @ $168 = $672

#### C. Holding Cost (for excess inventory)
```python
holding_cost = 0

for each SKU where units_ordered > units_needed:
    excess_units = units_ordered - units_needed
    days_to_sell_excess = excess_units / daily_velocity

    cost_of_holding = excess_units × unit_cost × holding_rate_daily × days_to_sell_excess
    holding_cost += cost_of_holding
```

**Where:**
- `holding_rate_daily = annual_rate / 365`
- `annual_rate = 15%` (cost of capital - configurable)

**Example:**
- 9 excess 30W X 32L Black
- Velocity: 0.10/day → 90 days to sell
- Holding cost: 9 × $14 × (0.15/365) × 90 = **$1.55**

#### D. Opportunity Cost (from missing sizes)
```python
opportunity_cost = 0

for each SKU where units_needed > units_ordered:
    shortage = units_needed - units_ordered
    profit_per_unit = selling_price - unit_cost

    lost_profit = shortage × profit_per_unit
    opportunity_cost += lost_profit
```

**Example:**
- Need 15 units of 38W X 32L Black
- Only get 4 units from prepack
- Shortage: 11 units
- Lost profit: 11 × $27.05 = **$297.55**

---

## 🧮 **Complete Example: 8501B Black**

### Current Situation:
```
36W X 32L Black: 2 units in stock, 0.50/day velocity → 4 days supply 🔴
38W X 32L Black: 6 units in stock, 0.53/day velocity → 11 days supply 🔴
30W X 32L Black: 3 units in stock, 0.10/day velocity → 30 days supply ⚠️
```

### Prepack Option: 4× Pack A
**Cost:** $672 (4 boxes × $168)
**Contents:** 48 pieces total
- 12× 30W X 32L
- 8× 34W X 32L
- 4× 36W X 32L
- 4× 38W X 32L
- (plus other sizes)

### Inventory Needs (90-day supply):
```
30W X 32L: Need 9 units   (0.10/day × 90)
34W X 32L: Need 8 units   (0.09/day × 90)
36W X 32L: Need 45 units  (0.50/day × 90) ← CRITICAL!
38W X 32L: Need 48 units  (0.53/day × 90) ← CRITICAL!
```

### Profit Calculation:

#### A. Expected Revenue
```
30W X 32L: min(12, 9) = 9 units × $27.05 = $243.45
34W X 32L: min(8, 8) = 8 units × $27.05 = $216.40
36W X 32L: min(4, 45) = 4 units × $27.05 = $108.20
38W X 32L: min(4, 48) = 4 units × $27.05 = $108.20
─────────────────────────────────────────────────────
Total Expected Revenue: $676.25
```

#### B. Prepack Cost
```
4 boxes × $168 = -$672.00
```

#### C. Holding Cost (excess)
```
30W X 32L: 12 ordered - 9 needed = 3 excess
           3 units × $14 × (0.15/365) × 30 days = $0.52

34W X 32L: 8 ordered - 8 needed = 0 excess = $0

36W X 32L: No excess (shortage)
38W X 32L: No excess (shortage)
─────────────────────────────────────────────────────
Total Holding Cost: -$0.52
```

#### D. Opportunity Cost (shortages)
```
36W X 32L: 45 needed - 4 ordered = 41 shortage
           41 × $27.05 = $1,109.05

38W X 32L: 48 needed - 4 ordered = 44 shortage
           44 × $27.05 = $1,190.20
─────────────────────────────────────────────────────
Total Opportunity Cost: -$2,299.25
```

#### Net Profit:
```
Expected Revenue:      $676.25
Prepack Cost:         -$672.00
Holding Cost:           -$0.52
Opportunity Cost:   -$2,299.25
═══════════════════════════════════
Net Profit:         -$2,295.52 ❌
ROI:                    -341%
```

### Decision Logic:

**Option 1:** Order 4× Pack A → Lose $2,295.52
**Option 2:** Order nothing → Stockout on 36W and 38W

**Opportunity cost of ordering nothing:**
```
36W X 32L will sell out in 4 days
38W X 32L will sell out in 11 days

Lost profit over 30 days:
- 36W: 0.50/day × 30 days × $27.05 = $406
- 38W: 0.53/day × 30 days × $27.05 = $430
Total: -$836
```

**Best Decision:** Order nothing (-$836 loss) is better than Pack A (-$2,295 loss)

**Recommendation to User:**
> "Pack A is unprofitable for 8501B Black. Primary issue: Pack A contains only 4 units each of 36W and 38W, but these are fastest-selling sizes needing 45 and 48 units respectively.
>
> **Recommendation:** Skip prepack and place direct order for 36W-38W sizes, or request custom pack with more 36W-38W."

---

## 🎯 **Optimizer Decision Rules**

### Rule 1: Calculate All Options
```python
options = []

# Try different combinations
for pack_a_boxes in range(0, max_boxes):
    for pack_b_boxes in range(0, max_boxes):
        for pack_c_boxes in range(0, max_boxes):
            solution = evaluate_combination(pack_a_boxes, pack_b_boxes, pack_c_boxes)
            profit = calculate_net_profit(solution)
            options.append({
                'combination': solution,
                'net_profit': profit,
                'roi': profit / solution.total_cost
            })
```

### Rule 2: Rank by Net Profit
```python
options.sort(key=lambda x: x['net_profit'], reverse=True)
best_option = options[0]
```

### Rule 3: Compare to "Do Nothing"
```python
do_nothing_cost = calculate_stockout_opportunity_cost(current_inventory, velocity)

if best_option['net_profit'] < -do_nothing_cost:
    recommendation = "Order nothing - all prepack options lose more than stockout cost"
elif best_option['net_profit'] > 0:
    recommendation = f"RECOMMENDED: {best_option['combination']} - Profit: ${best_option['net_profit']}"
else:
    recommendation = f"MARGINAL: {best_option['combination']} - Loss: ${best_option['net_profit']}, but better than doing nothing (loss: ${do_nothing_cost})"
```

### Rule 4: Flag Unprofitable Scenarios
```python
if best_option['net_profit'] < 0:
    warning = analyze_why_unprofitable(best_option)
    # Examples:
    # "Pack A missing key sizes (36W X 32L, 38W X 32L)"
    # "Consider direct ordering or custom pack"
    # "Fast-selling sizes not available in prepacks"
```

---

## 📋 **Data Requirements for Implementation**

### Database Tables Needed:

#### 1. SKU Financial Data
```sql
CREATE TABLE sku_financial_data (
    sku VARCHAR(50) PRIMARY KEY,
    style_number VARCHAR(50),
    color VARCHAR(50),
    size VARCHAR(20),
    inseam VARCHAR(10),

    -- Financial metrics
    avg_selling_price DECIMAL(10,2),    -- From sales_transactions.price AVG
    unit_cost DECIMAL(10,2),            -- From vendor pricing
    profit_per_unit DECIMAL(10,2),      -- Calculated: price - cost
    margin_pct DECIMAL(5,2),            -- Calculated: (price-cost)/price

    -- Velocity metrics
    velocity_30d DECIMAL(10,4),         -- Sales per day (last 30 days)
    velocity_90d DECIMAL(10,4),         -- Sales per day (last 90 days)
    velocity_365d DECIMAL(10,4),        -- Sales per day (last 365 days)
    velocity_alltime DECIMAL(10,4),     -- Sales per day (all time)

    -- Current state
    current_inventory INT,              -- Current units in stock
    days_of_supply DECIMAL(10,2),       -- inventory / velocity_30d

    -- Stats
    total_sales_alltime INT,            -- Lifetime sales
    first_sale_date DATE,
    last_sale_date DATE,
    last_updated TIMESTAMP DEFAULT NOW()
);
```

#### 2. Vendor Pricing Configuration
```sql
CREATE TABLE vendor_pricing (
    vendor_name VARCHAR(100),
    style_number VARCHAR(50),
    unit_cost DECIMAL(10,2),            -- What we pay vendor per unit
    effective_date DATE,
    PRIMARY KEY (vendor_name, style_number, effective_date)
);
```

#### 3. Holding Cost Configuration
```sql
ALTER TABLE vendor_configurations
ADD COLUMN holding_cost_annual_pct DECIMAL(5,4) DEFAULT 0.15;  -- 15% annual
```

---

## 🔄 **Data Population Strategy**

### Phase 1: Calculate Selling Prices (from sales history)
```sql
-- Calculate average selling price per SKU from actual sales
INSERT INTO sku_financial_data (
    sku, style_number, color, size, inseam, avg_selling_price,
    velocity_30d, velocity_90d, velocity_365d, total_sales_alltime
)
SELECT
    il.item_number as sku,
    il.style_number,
    il.attribute as color,
    il.size,
    CASE
        WHEN il.size LIKE '%X%' THEN SPLIT_PART(il.size, 'X', 2)
        ELSE ''
    END as inseam,
    AVG(st.price) as avg_selling_price,
    COUNT(CASE WHEN st.date >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END)::numeric / 30 as velocity_30d,
    COUNT(CASE WHEN st.date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 END)::numeric / 90 as velocity_90d,
    COUNT(CASE WHEN st.date >= CURRENT_DATE - INTERVAL '365 days' THEN 1 END)::numeric / 365 as velocity_365d,
    COUNT(*) as total_sales_alltime
FROM item_list il
LEFT JOIN sales_transactions st ON st.sku = il.item_number
WHERE il.style_number IS NOT NULL
GROUP BY il.item_number, il.style_number, il.attribute, il.size;
```

### Phase 2: Add Unit Costs (manual or from vendor data)
```sql
-- For 8501B example (Argonaut Nations)
INSERT INTO vendor_pricing (vendor_name, style_number, unit_cost, effective_date)
VALUES ('Argonaut Nations', '8501B', 14.00, CURRENT_DATE);

-- Update SKU financial data with costs
UPDATE sku_financial_data sfd
SET
    unit_cost = vp.unit_cost,
    profit_per_unit = sfd.avg_selling_price - vp.unit_cost,
    margin_pct = ((sfd.avg_selling_price - vp.unit_cost) / NULLIF(sfd.avg_selling_price, 0)) * 100
FROM vendor_pricing vp
WHERE sfd.style_number = vp.style_number
  AND vp.effective_date = (
      SELECT MAX(effective_date)
      FROM vendor_pricing vp2
      WHERE vp2.vendor_name = vp.vendor_name
        AND vp2.style_number = vp.style_number
        AND vp2.effective_date <= CURRENT_DATE
  );
```

### Phase 3: Calculate Current Inventory
```sql
UPDATE sku_financial_data sfd
SET
    current_inventory = (
        SELECT SUM(COALESCE(gm_qty,0) + COALESCE(hm_qty,0) +
                   COALESCE(nm_qty,0) + COALESCE(lm_qty,0))
        FROM item_list il
        WHERE il.item_number = sfd.sku
    ),
    days_of_supply = current_inventory / NULLIF(velocity_30d, 0);
```

---

## 🎨 **API Response Format**

### New Recommendation Response:
```json
{
  "style_number": "8501B",
  "color": "Black",
  "vendor_name": "Argonaut Nations",

  "recommendation": {
    "action": "DO_NOT_ORDER",
    "reason": "All prepack options are unprofitable. Pack A missing key fast-selling sizes (36W X 32L, 38W X 32L).",
    "alternative": "Consider direct ordering 36W-38W sizes or requesting custom pack configuration."
  },

  "best_prepack_option": {
    "description": "4 boxes Pack A",
    "total_boxes": 4,
    "total_cost": 672.00,
    "total_pieces": 48,

    "profit_analysis": {
      "net_profit": -2295.52,
      "expected_revenue": 676.25,
      "prepack_cost": 672.00,
      "holding_cost": 0.52,
      "opportunity_cost": 2299.25,
      "roi_pct": -341.0,
      "profitability_tier": "UNPROFITABLE"
    },

    "size_breakdown": [
      {
        "size": "30W X 32L",
        "units_ordered": 12,
        "units_needed": 9,
        "units_sold": 9,
        "excess": 3,
        "shortage": 0,
        "revenue": 243.45,
        "holding_cost": 0.52
      },
      {
        "size": "36W X 32L",
        "units_ordered": 4,
        "units_needed": 45,
        "units_sold": 4,
        "excess": 0,
        "shortage": 41,
        "revenue": 108.20,
        "opportunity_cost": 1109.05
      }
      // ... more sizes
    ]
  },

  "do_nothing_comparison": {
    "description": "Order nothing",
    "net_profit": -836.00,
    "reason": "Stockouts on 36W X 32L (4 days) and 38W X 32L (11 days) will lose $836 over 30 days",
    "is_better_than_prepack": true
  },

  "alternatives_evaluated": 15,
  "urgency": "Critical",
  "critical_sizes": [
    "36W X 32L: 2 units, 4 days supply",
    "38W X 32L: 6 units, 11 days supply"
  ]
}
```

---

## ✅ **Implementation Checklist**

### Phase 1: Data Infrastructure
- [ ] Create `sku_financial_data` table
- [ ] Create `vendor_pricing` table
- [ ] Add `holding_cost_annual_pct` to `vendor_configurations`
- [ ] Populate selling prices from sales history
- [ ] Add unit costs for test vendors (Argonaut Nations)
- [ ] Calculate velocity metrics (30d, 90d, 365d)
- [ ] Calculate current inventory and days of supply

### Phase 2: Core Algorithm
- [ ] Create `ProfitBasedPrepackOptimizer` class
- [ ] Implement `calculate_expected_revenue()` function
- [ ] Implement `calculate_holding_cost()` function
- [ ] Implement `calculate_opportunity_cost()` function
- [ ] Implement `calculate_net_profit()` function
- [ ] Implement prepack combination generator
- [ ] Implement comparison to "do nothing" option

### Phase 3: Integration
- [ ] Update `/api/ml/prepack-batch-recommendations` endpoint
- [ ] Fetch SKU financial data in optimization flow
- [ ] Update response format with profit analysis
- [ ] Add "do nothing" comparison to response
- [ ] Add alternative recommendations when unprofitable

### Phase 4: Testing
- [ ] Test with 8501B Black (known unprofitable case)
- [ ] Test with S8502 Bone (known profitable case)
- [ ] Test with P9504 (edge case)
- [ ] Validate profit calculations against historical data
- [ ] A/B test: profit-based vs coverage-based for 30 days

### Phase 5: UI/UX
- [ ] Update dashboard to show profit metrics
- [ ] Add profitability tier badges
- [ ] Show "do nothing" comparison in UI
- [ ] Add detailed profit breakdown modal
- [ ] Color-code by recommendation strength

---

## 🎯 **Success Metrics**

After implementation, track:

1. **Recommendation Accuracy**
   - % of recommendations followed by user
   - Actual profit vs predicted profit (90 days later)
   - Stockout rate on recommended sizes

2. **Business Impact**
   - Total profit from prepack orders
   - Reduction in stockouts on fast-selling sizes
   - Reduction in excess slow-moving inventory
   - Overall inventory turn rate improvement

3. **System Performance**
   - Profit-based recommendations vs coverage-based recommendations
   - Which approach generates more actual profit?
   - User satisfaction scores

---

## 📌 **Key Principles (DO NOT FORGET)**

1. **Profit is the ONLY metric that matters** - not coverage %, not waste %
2. **Analyze at SKU level** - never aggregate colors or sizes
3. **"Excess" inventory is future profit** - holding costs are minimal vs opportunity costs
4. **Fast sellers are worth more** - 36W X 32L stockout costs more than 44W X 34L stockout
5. **Compare to "do nothing"** - even negative profit can be better than stockout
6. **Flag unprofitable options** - tell user when prepacks don't work
7. **Use real data** - actual selling prices from sales history, not assumptions

---

**Document Status:** APPROVED - Ready for Implementation
**Next Step:** Phase 1 - Build data infrastructure

---

**End of Formula Documentation**

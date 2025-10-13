# Profit-Based Prepack Optimizer - Design Document

## Date: October 12, 2025
## Status: DESIGN PHASE (Not Yet Implemented)

---

## 🎯 **The Problem with Current Optimizer**

### Current Logic (Coverage-Based)
The existing optimizer uses arbitrary thresholds:
- **Minimum Coverage**: 85% of size needs must be met
- **Maximum Waste**: 35% excess inventory allowed
- **Binary Decision**: Solution either passes both thresholds or is rejected entirely

### Real-World Example: 8501B Black

**Inventory Needs (90 days supply):**
```
30W X 32L: Need 9 units   (velocity: 0.10/day)
34W X 32L: Need 8 units   (velocity: 0.09/day)
34W X 34L: Need 2 units   (velocity: 0.02/day)
36W X 32L: Need 10 units  (velocity: 0.11/day)
36W X 34L: Need 6 units   (velocity: 0.07/day)
38W X 32L: Need 15 units  (velocity: 0.17/day) ← FASTEST SELLER
───────────────────────────
Total: 50 units needed
```

**Best Available Solution: 4× Pack A (48 pieces, $672 cost)**
```
30W X 32L: Get 12, Need 9   → +3 excess (will sell in 30 days)
34W X 32L: Get 8,  Need 8   → Perfect match
36W X 32L: Get 4,  Need 10  → -6 shortage
38W X 32L: Get 4,  Need 15  → -11 shortage (FASTEST SELLER!)
───────────────────────────
Coverage: 35/50 = 70% ❌ REJECTED (below 85% threshold)
```

### Why This is Broken

**Current Decision:**
"70% coverage is bad, reject this order" → Order 0 boxes → Have NO inventory

**Business Reality:**
- The 3 "excess" 30W X 32L will sell in 30 days (minimal holding cost)
- The 11 missing 38W X 32L are the FASTEST-SELLING size (huge opportunity cost)
- Having 35 units is better than having 0 units!

**Your Insight:**
> "what if the selling price of those excess ways more than the waste cost??"

Exactly right! We need to compare:
- **Cost of holding 3 slow-sellers for 30 days** (maybe $5-10 in capital cost)
- **Revenue lost from 11 missing fast-sellers** (could be $500-1000 in lost sales)

The current optimizer treats these as equal. They're not.

---

## 💡 **Proposed Solution: Profit-Based Scoring**

### Core Principle

**Replace arbitrary thresholds with economic optimization:**

Instead of asking "Does this meet 85% coverage?"
Ask: **"What is the net profit of this prepack order?"**

### Profit Calculation Formula

For each potential prepack combination:

```
Net Profit = Expected Revenue - Total Costs - Opportunity Costs

Where:
  Expected Revenue = Σ (units covered × selling price × sell-through probability)
  Total Costs = prepack cost + holding costs
  Opportunity Costs = lost revenue from stockouts
```

### Detailed Components

#### 1. **Expected Revenue from Coverage**

For each size we order:
```
Revenue(size) = min(units_ordered, units_needed) × selling_price × margin
```

**Logic:**
- If we order exactly what's needed → capture full revenue
- If we order MORE than needed → revenue from "excess" discounted by time to sell
- If we order LESS than needed → revenue capped at what we ordered

#### 2. **Holding Costs (for excess inventory)**

```
Holding_Cost(size) = excess_units × unit_cost × holding_rate × time_to_sell

Where:
  excess_units = max(0, units_ordered - units_needed)
  holding_rate = annual_rate / 365  (e.g., 15% annual = 0.041% daily)
  time_to_sell = excess_units / daily_velocity
```

**Example:**
- 3 excess 30W X 32L
- Unit cost: $80
- Holding rate: 15% annual = 0.041% per day
- Velocity: 0.10/day → Time to sell = 3 / 0.10 = 30 days
- Holding cost = 3 × $80 × 0.00041 × 30 = **$2.95**

#### 3. **Opportunity Costs (from shortages)**

```
Opportunity_Cost(size) = shortage_units × selling_price × margin × stockout_days

Where:
  shortage_units = max(0, units_needed - units_ordered)
  stockout_days = shortage_units / daily_velocity
  margin = (selling_price - unit_cost) / selling_price
```

**Example:**
- 11 short on 38W X 32L
- Selling price: $160
- Unit cost: $80
- Margin: 50%
- Velocity: 0.17/day → Stockout time = 11 / 0.17 = 65 days
- Lost revenue per unit = $160 × 0.50 = $80
- Opportunity cost = 11 × $80 = **$880**

#### 4. **Prepack Purchase Cost**

```
Prepack_Cost = Σ (boxes_ordered × cost_per_box)
```

### Complete Net Profit Formula

```python
def calculate_net_profit(solution):
    """
    Calculate net profit for a prepack solution.

    Positive number = profitable
    Negative number = unprofitable
    Higher is better
    """
    revenue = 0
    holding_cost = 0
    opportunity_cost = 0
    prepack_cost = sum(box.cost * box.quantity for box in solution.boxes)

    for size, sku_data in solution.coverage.items():
        units_ordered = sku_data['units_ordered']
        units_needed = sku_data['units_needed']
        velocity = sku_data['velocity']
        selling_price = sku_data['selling_price']
        unit_cost = sku_data['unit_cost']

        # Revenue from units we actually sell
        units_sold = min(units_ordered, units_needed)
        margin = (selling_price - unit_cost) / selling_price
        revenue += units_sold * selling_price * margin

        # Holding cost for excess inventory
        if units_ordered > units_needed:
            excess = units_ordered - units_needed
            days_to_sell = excess / velocity if velocity > 0 else 365
            holding_cost += excess * unit_cost * HOLDING_RATE * days_to_sell

        # Opportunity cost for shortages
        if units_needed > units_ordered:
            shortage = units_needed - units_ordered
            stockout_days = shortage / velocity if velocity > 0 else 90
            opportunity_cost += shortage * selling_price * margin

    net_profit = revenue - prepack_cost - holding_cost - opportunity_cost

    return {
        'net_profit': net_profit,
        'revenue': revenue,
        'prepack_cost': prepack_cost,
        'holding_cost': holding_cost,
        'opportunity_cost': opportunity_cost,
        'roi': (net_profit / prepack_cost) if prepack_cost > 0 else 0
    }
```

---

## 📊 **Worked Example: 8501B Black**

### Scenario Data

**Available Prepacks:**
- Pack A: 12 pieces (30W, 34W, 36W, 38W × 32L/34L mix), $168/box
- Pack B: 12 pieces (32W, 40W, 42W, 44W × 32L/34L mix), $168/box

**Inventory Needs & Pricing:**
```
Size          Need  Velocity  Selling Price  Unit Cost  Margin
──────────────────────────────────────────────────────────────
30W X 32L      9    0.10/day    $160          $80       50%
34W X 32L      8    0.09/day    $160          $80       50%
34W X 34L      2    0.02/day    $160          $80       50%
36W X 32L     10    0.11/day    $160          $80       50%
36W X 34L      6    0.07/day    $160          $80       50%
38W X 32L     15    0.17/day    $160          $80       50%  ← Fastest
──────────────────────────────────────────────────────────────
Total:        50
```

**Constants:**
- Holding rate: 15% annual = 0.041% per day
- Target: 90 days supply

### Solution 1: Order 4× Pack A (Current Rejected Solution)

**Costs:**
- Prepack cost: 4 × $168 = **$672**

**Size-by-Size Analysis:**

#### 30W X 32L: +3 Excess
- Ordered: 12, Needed: 9, Excess: 3
- Revenue: 9 × $160 × 0.50 = **$720**
- Holding cost: 3 × $80 × 0.00041 × 30 days = **$2.95**
- Net for this size: $720 - $2.95 = **$717.05**

#### 34W X 32L: Perfect Match
- Ordered: 8, Needed: 8, Excess: 0
- Revenue: 8 × $160 × 0.50 = **$640**
- Holding cost: **$0**
- Net for this size: **$640**

#### 36W X 32L: -6 Shortage
- Ordered: 4, Needed: 10, Shortage: 6
- Revenue: 4 × $160 × 0.50 = **$320**
- Opportunity cost: 6 × $80 = **$480**
- Net for this size: $320 - $480 = **-$160**

#### 38W X 32L: -11 Shortage
- Ordered: 4, Needed: 15, Shortage: 11
- Revenue: 4 × $160 × 0.50 = **$320**
- Opportunity cost: 11 × $80 = **$880**
- Net for this size: $320 - $880 = **-$560**

#### Other sizes not in Pack A: -21 Shortage
- 34W X 34L: Need 2, Get 0 → Lost profit: 2 × $80 = $160
- 36W X 34L: Need 6, Get 0 → Lost profit: 6 × $80 = $480
- Opportunity cost: **$640**

**Total Calculation:**
```
Revenue:           $720 + $640 + $320 + $320 = $2,000
Prepack Cost:                                  -$672
Holding Cost:                                  -$2.95
Opportunity Cost:  $480 + $880 + $640 =     -$2,000
═══════════════════════════════════════════════════════
Net Profit:                                    -$674.95
ROI:                                           -100.4%
```

**Current Optimizer Decision:** ❌ REJECT (70% coverage)
**Profit-Based Decision:** ❌ REJECT (negative profit)

### Solution 2: Order 0 Boxes (Current Optimizer Choice)

**Calculation:**
```
Revenue:           $0
Prepack Cost:      $0
Holding Cost:      $0
Opportunity Cost:  All 50 units × $80 = -$4,000
═══════════════════════════════════════════════════
Net Profit:                          -$4,000
ROI:                                 undefined
```

**Current Optimizer Decision:** ✓ ACCEPT (by default - rejected everything else)
**Profit-Based Decision:** ❌ REJECT (worse profit than Solution 1!)

### Solution 3: Hybrid Approach (4× Pack A + 2× Pack B)

**Costs:**
- Prepack cost: (4 × $168) + (2 × $168) = **$1,008**

**Size-by-Size Analysis:**

*Let's assume Pack B contains different sizes (32W, 40W, 42W, 44W) that we don't need much of*

#### Sizes covered by Pack A (same as Solution 1):
- 30W X 32L: Net $717.05
- 34W X 32L: Net $640
- 36W X 32L: Net -$160
- 38W X 32L: Net -$560

#### Sizes from Pack B:
- If Pack B has 32W sizes we need some of → maybe $200 net
- But also includes 40W, 42W, 44W we don't need → holding cost

**Rough Estimate:**
```
Revenue:           ~$2,500
Prepack Cost:      -$1,008
Holding Cost:      -$50 (more excess from Pack B)
Opportunity Cost:  -$1,500 (still missing fast sellers)
═══════════════════════════════════════════════════
Net Profit:                                    -$58
ROI:                                           -5.8%
```

**Profit-Based Decision:** ❌ Still negative, but better than Solutions 1 & 2!

### Key Insight from This Example

**All three solutions are unprofitable!**

This reveals the real problem:
1. **Pack A doesn't have enough 38W X 32L** (the fastest seller)
2. **Need a Pack that's heavy on 36W-38W in 32L**
3. **Or need to order direct/custom instead of prepacks**

**Profit-based optimizer would:**
1. Calculate profit for all combinations
2. See all are negative
3. Return best option with WARNING: "All solutions unprofitable - consider direct ordering"

---

## 🎯 **Better Example: S8502 Bone**

Let's show a PROFITABLE scenario.

### Scenario Data

**Available Prepacks:**
- Pack C: 12 pieces (evenly distributed across 28W-38W), $156/box

**Inventory Needs:**
```
Size          Need  Velocity  Selling Price  Unit Cost  Margin
──────────────────────────────────────────────────────────────
28W X 30L      3    0.033/day   $150          $75       50%
30W X 30L      4    0.044/day   $150          $75       50%
32W X 30L      5    0.056/day   $150          $75       50%
34W X 30L      4    0.044/day   $150          $75       50%
36W X 30L      4    0.044/day   $150          $75       50%
38W X 30L      4    0.044/day   $150          $75       50%
──────────────────────────────────────────────────────────────
Total:        24
```

### Solution: Order 2× Pack C (24 pieces)

**Costs:**
- Prepack cost: 2 × $156 = **$312**

**Pack Contents (2 boxes):**
- 28W: 4 pieces
- 30W: 4 pieces
- 32W: 4 pieces
- 34W: 4 pieces
- 36W: 4 pieces
- 38W: 4 pieces

**Size-by-Size Analysis:**

#### 28W X 30L: +1 Excess
- Ordered: 4, Needed: 3, Excess: 1
- Revenue: 3 × $150 × 0.50 = **$225**
- Holding cost: 1 × $75 × 0.00041 × 30 days = **$0.92**
- Net: $225 - $0.92 = **$224.08**

#### 30W X 30L: Perfect Match
- Ordered: 4, Needed: 4
- Revenue: 4 × $150 × 0.50 = **$300**
- Net: **$300**

#### 32W X 30L: -1 Shortage
- Ordered: 4, Needed: 5, Shortage: 1
- Revenue: 4 × $150 × 0.50 = **$300**
- Opportunity cost: 1 × $75 = **$75**
- Net: $300 - $75 = **$225**

#### 34W X 30L: Perfect Match
- Ordered: 4, Needed: 4
- Revenue: **$300**
- Net: **$300**

#### 36W X 30L: Perfect Match
- Ordered: 4, Needed: 4
- Revenue: **$300**
- Net: **$300**

#### 38W X 30L: Perfect Match
- Ordered: 4, Needed: 4
- Revenue: **$300**
- Net: **$300**

**Total Calculation:**
```
Revenue:           $225 + $300 + $300 + $300 + $300 + $300 = $1,725
Prepack Cost:                                                  -$312
Holding Cost:                                                  -$0.92
Opportunity Cost:                                              -$75
════════════════════════════════════════════════════════════════════
Net Profit:                                                   $1,337.08
ROI:                                                           428.5%
```

**Current Optimizer Decision:** ✓ ACCEPT (96% coverage, 4% waste)
**Profit-Based Decision:** ✓✓ STRONGLY ACCEPT ($1,337 profit!)

**This is a GREAT order!**

---

## 🗄️ **Required Data & Schema Changes**

### New Fields Needed in Database

#### 1. Add to `item_list` table:
```sql
ALTER TABLE item_list ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10, 2);
ALTER TABLE item_list ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10, 2);
ALTER TABLE item_list ADD COLUMN IF NOT EXISTS margin_pct DECIMAL(5, 2);
```

**Rationale:**
- `selling_price`: Retail price for this SKU
- `unit_cost`: What we pay vendor for this unit (from prepack)
- `margin_pct`: Calculated field = (selling_price - unit_cost) / selling_price

#### 2. Add to `vendor_configurations` table:
```sql
ALTER TABLE vendor_configurations ADD COLUMN IF NOT EXISTS holding_cost_annual_pct DECIMAL(5, 4) DEFAULT 0.15;
ALTER TABLE vendor_configurations ADD COLUMN IF NOT EXISTS default_margin_pct DECIMAL(5, 2) DEFAULT 0.50;
```

**Rationale:**
- `holding_cost_annual_pct`: Cost of capital (typically 10-20% annual)
- `default_margin_pct`: Fallback if SKU-level margin not available

#### 3. New table: `sku_financial_data`
```sql
CREATE TABLE IF NOT EXISTS sku_financial_data (
    id SERIAL PRIMARY KEY,
    item_number VARCHAR(50) NOT NULL UNIQUE,
    selling_price DECIMAL(10, 2) NOT NULL,
    unit_cost DECIMAL(10, 2) NOT NULL,
    margin_pct DECIMAL(5, 2) GENERATED ALWAYS AS
        ((selling_price - unit_cost) / NULLIF(selling_price, 0)) STORED,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (item_number) REFERENCES item_list(item_number) ON DELETE CASCADE
);

CREATE INDEX idx_sku_financial_item_number ON sku_financial_data(item_number);
```

**Rationale:**
- Separate table keeps financial data cleanly isolated
- Allows easier updates without touching inventory data
- Can track price history if needed (add effective_date field later)

### Data Population Strategy

#### Option A: Manual Entry (Best for MVP)
Create admin UI to enter prices per style:
- User enters selling price range: "$150-180"
- User enters unit cost: "$75"
- System calculates margin automatically
- Apply to all SKUs of that style

#### Option B: Import from Excel
Add columns to existing Item List upload:
- Column: "Retail Price"
- Column: "Cost"
- Parse during upload, store in sku_financial_data table

#### Option C: Derive from Sales Transactions
```sql
-- Calculate average selling price from historical sales
UPDATE sku_financial_data sfd
SET selling_price = (
    SELECT AVG(st.item_cost)
    FROM sales_transactions st
    WHERE st.sku = sfd.item_number
      AND st.date >= CURRENT_DATE - INTERVAL '90 days'
)
WHERE EXISTS (
    SELECT 1 FROM sales_transactions st
    WHERE st.sku = sfd.item_number
);
```

**Recommended:** Start with Option A for MVP, add Option C for validation.

---

## 🔧 **Algorithm Changes**

### Current Optimizer (prepack_optimizer.py)

```python
class PrepackOptimizer:
    def __init__(self, max_waste_tolerance=0.35, min_coverage_target=0.85):
        self.max_waste = max_waste_tolerance
        self.min_coverage = min_coverage_target

    def score_solution(self, solution):
        """Score based on coverage and waste only"""
        if solution.coverage < self.min_coverage:
            return -999999  # Reject immediately

        score = solution.coverage - solution.waste
        return score
```

### New Profit-Based Optimizer

```python
class ProfitBasedPrepackOptimizer:
    def __init__(
        self,
        holding_cost_rate=0.15,  # 15% annual
        max_boxes_per_prepack=10,
        target_days_supply=90
    ):
        self.holding_cost_rate = holding_cost_rate / 365  # Convert to daily
        self.max_boxes_per_prepack = max_boxes_per_prepack
        self.target_days_supply = target_days_supply

    def calculate_profit(self, solution, sku_data):
        """
        Calculate net profit for a prepack solution.

        Args:
            solution: PrepackSolution object with box quantities
            sku_data: Dict mapping (size, inseam, color) -> SKUFinancialData

        Returns:
            Dict with profit breakdown
        """
        revenue = 0
        holding_cost = 0
        opportunity_cost = 0
        prepack_cost = solution.total_cost

        for (size, inseam, color), data in solution.coverage.items():
            units_ordered = data['units_ordered']
            units_needed = data['units_needed']
            velocity = data['velocity']

            # Get financial data for this SKU
            sku_key = (size, inseam, color)
            if sku_key not in sku_data:
                continue  # Skip if no pricing data

            financial = sku_data[sku_key]
            selling_price = financial['selling_price']
            unit_cost = financial['unit_cost']
            margin = financial['margin_pct']

            # 1. Revenue from units we'll sell
            units_sold = min(units_ordered, units_needed)
            revenue += units_sold * selling_price * margin

            # 2. Holding cost for excess inventory
            if units_ordered > units_needed:
                excess = units_ordered - units_needed
                if velocity > 0:
                    days_to_sell = excess / velocity
                    holding_cost += (
                        excess * unit_cost * self.holding_cost_rate * days_to_sell
                    )
                else:
                    # No sales velocity - assume 365 days to sell
                    holding_cost += excess * unit_cost * self.holding_cost_rate * 365

            # 3. Opportunity cost for shortages
            if units_needed > units_ordered:
                shortage = units_needed - units_ordered
                # Lost profit per unit
                lost_profit_per_unit = selling_price * margin
                opportunity_cost += shortage * lost_profit_per_unit

        net_profit = revenue - prepack_cost - holding_cost - opportunity_cost

        return {
            'net_profit': net_profit,
            'revenue': revenue,
            'prepack_cost': prepack_cost,
            'holding_cost': holding_cost,
            'opportunity_cost': opportunity_cost,
            'roi': (net_profit / prepack_cost) if prepack_cost > 0 else 0,
            'profit_per_unit': net_profit / solution.total_pieces if solution.total_pieces > 0 else 0
        }

    def optimize(self, needs_by_color, available_prepacks, sku_financial_data):
        """
        Find the most PROFITABLE prepack combination.

        No more arbitrary coverage thresholds!
        """
        best_solution = None
        best_profit = float('-inf')

        # Generate all possible combinations
        for combination in self._generate_combinations(available_prepacks):
            solution = self._evaluate_combination(combination, needs_by_color)
            profit_data = self.calculate_profit(solution, sku_financial_data)

            if profit_data['net_profit'] > best_profit:
                best_profit = profit_data['net_profit']
                best_solution = solution
                best_solution.profit_data = profit_data

        # Return best solution even if unprofitable
        # Let the user decide whether to order
        return best_solution
```

### Key Algorithm Differences

| Aspect | Current Optimizer | Profit-Based Optimizer |
|--------|------------------|------------------------|
| **Goal** | Maximize coverage, minimize waste | Maximize net profit |
| **Thresholds** | Hard 85% coverage requirement | No threshold - considers all options |
| **Decision Logic** | Binary (pass/fail thresholds) | Continuous (profit score) |
| **Size Weighting** | All sizes equal | Fast sellers weighted by revenue |
| **Excess Inventory** | Penalty (waste %) | Cost (holding cost in $) |
| **Shortages** | Penalty (coverage %) | Cost (opportunity cost in $) |
| **Output** | Solution or None | Always returns best option + warning if unprofitable |

---

## 📈 **API Response Changes**

### Current Response Format
```json
{
  "style_number": "8501B",
  "recommendation": "Order: 4 boxes Pack A (Black)",
  "total_boxes": 4,
  "total_cost": 672.00,
  "total_pieces": 48,
  "coverage_pct": 0.70,
  "waste_pct": 0.06,
  "color_breakdown": [...]
}
```

### New Profit-Based Response Format
```json
{
  "style_number": "8501B",
  "recommendation": "Order: 4 boxes Pack A (Black)",
  "total_boxes": 4,
  "total_cost": 672.00,
  "total_pieces": 48,

  // Legacy metrics (keep for compatibility)
  "coverage_pct": 0.70,
  "waste_pct": 0.06,

  // NEW: Profit analysis
  "profit_analysis": {
    "net_profit": -674.95,
    "expected_revenue": 2000.00,
    "prepack_cost": 672.00,
    "holding_cost": 2.95,
    "opportunity_cost": 2000.00,
    "roi": -1.004,
    "profit_per_unit": -14.06,
    "is_profitable": false,
    "profitability_tier": "UNPROFITABLE"
  },

  // NEW: Decision guidance
  "recommendation_strength": "NOT_RECOMMENDED",
  "recommendation_reason": "Expected loss of $674.95. Primary issue: Missing 11 units of fastest-selling size (38W X 32L). Consider direct ordering or custom pack.",

  // NEW: Alternative options
  "alternatives_considered": 15,
  "next_best_option": {
    "description": "Order 0 boxes",
    "net_profit": -4000.00,
    "reason": "No order means complete stockout - even worse"
  },

  "color_breakdown": [...]
}
```

### Profitability Tiers

```python
def get_profitability_tier(roi):
    """Classify recommendation strength by ROI"""
    if roi >= 3.0:
        return "EXCELLENT"      # 300%+ ROI
    elif roi >= 2.0:
        return "VERY_GOOD"      # 200-300% ROI
    elif roi >= 1.0:
        return "GOOD"           # 100-200% ROI
    elif roi >= 0.5:
        return "ACCEPTABLE"     # 50-100% ROI
    elif roi >= 0.0:
        return "MARGINAL"       # 0-50% ROI (break-even to small profit)
    else:
        return "UNPROFITABLE"   # Negative ROI
```

### Recommendation Strength

```python
def get_recommendation_strength(profit_data):
    """Determine whether to recommend ordering"""
    roi = profit_data['roi']
    net_profit = profit_data['net_profit']

    if roi >= 1.0:
        return "STRONGLY_RECOMMENDED", "Excellent profit opportunity"
    elif roi >= 0.5:
        return "RECOMMENDED", "Profitable order with good ROI"
    elif roi >= 0.0:
        return "CONSIDER", "Low profit but better than stockout"
    elif net_profit > -100:
        return "MARGINAL", "Small loss - evaluate vs. direct ordering"
    else:
        return "NOT_RECOMMENDED", "Significant loss expected - avoid prepacks"
```

---

## 🧪 **Testing Plan**

### Test Case 1: Perfect Match (S8502 Bone)
**Expected Result:**
- High profit ($1,000+)
- ROI > 300%
- Recommendation: STRONGLY_RECOMMENDED

### Test Case 2: Partial Coverage (8501B Black)
**Expected Result:**
- Negative profit (-$500 to -$700)
- ROI < 0%
- Recommendation: NOT_RECOMMENDED
- Reason: "Missing too many fast-selling sizes"

### Test Case 3: Slight Excess
**Setup:** Need 45 units, Pack A gives 48 units, all distributed well
**Expected Result:**
- Positive profit ($800+)
- ROI > 200%
- Holding cost should be minimal ($5-10)
- Recommendation: RECOMMENDED

### Test Case 4: Multiple Color Optimization
**Setup:** Black needs 50 units, Burgundy needs 20 units
**Expected Result:**
- Separate optimization per color
- Recommend Black if profitable
- Skip Burgundy if unprofitable
- Total profit = sum of profitable colors only

---

## 🚀 **Implementation Phases**

### Phase 1: Data Layer (Week 1)
1. ✅ Create `sku_financial_data` table schema
2. ✅ Add migration script
3. ✅ Build admin UI for price entry
4. ✅ Populate test data for 8501B, S8502, P9504

**Deliverables:**
- SQL migration file
- Data entry form in React
- Test data CSV

### Phase 2: Core Algorithm (Week 2)
1. ✅ Create `ProfitBasedPrepackOptimizer` class
2. ✅ Implement `calculate_profit()` function
3. ✅ Update `optimize_color_aware()` to use profit scoring
4. ✅ Unit tests for profit calculations

**Deliverables:**
- New optimizer class in `/ml_service/models/profit_based_optimizer.py`
- Test suite with 10+ test cases
- Performance benchmarks

### Phase 3: API Integration (Week 3)
1. ✅ Update `/api/ml/prepack-batch-recommendations` endpoint
2. ✅ Add profit analysis to response format
3. ✅ Fetch SKU financial data in optimization flow
4. ✅ Update data extraction functions in `prepack_data.py`

**Deliverables:**
- Updated API endpoint
- API documentation
- Postman/curl test examples

### Phase 4: Frontend (Week 4)
1. ✅ Update dashboard to show profit metrics
2. ✅ Add profitability tier badges (EXCELLENT, GOOD, etc.)
3. ✅ Show detailed profit breakdown in modal/tooltip
4. ✅ Color-code recommendations by strength

**Deliverables:**
- Updated React components
- New UI mockups
- User acceptance testing

---

## ⚠️ **Risks & Mitigation**

### Risk 1: Missing Price Data
**Problem:** Not all SKUs have pricing data
**Mitigation:**
- Use vendor-level default margins as fallback
- Show warning in recommendation: "Using estimated pricing"
- Allow manual price entry per style

### Risk 2: Inaccurate Cost Data
**Problem:** Unit costs may not reflect actual vendor pricing
**Mitigation:**
- Calculate average cost from recent purchase orders
- Allow manual override per vendor
- Track actual vs. estimated costs over time

### Risk 3: Holding Cost Calculation
**Problem:** Holding rate (15% annual) is assumption
**Mitigation:**
- Make configurable per vendor
- Research industry standards
- Validate with actual capital costs

### Risk 4: Algorithm Complexity
**Problem:** Profit calculation is more complex than coverage
**Mitigation:**
- Extensive unit testing
- Run parallel with old algorithm for validation
- A/B test recommendations with users

### Risk 5: User Trust
**Problem:** Users may not trust "profit-based" recommendations
**Mitigation:**
- Show detailed breakdown of all costs
- Allow toggling between coverage and profit modes
- Provide export of full calculation for audit

---

## 💭 **Open Questions**

### 1. What should default selling prices be?
**Options:**
- A) Use average from sales_transactions.item_cost
- B) Manual entry required before optimization
- C) Derive from vendor MSRP × markup factor

**Recommendation:** Start with A, allow override with B

### 2. Should we consider store-level optimization?
**Current:** System calculates network-wide needs
**Future:** Could optimize which stores get which sizes

**Example:**
- Gridiron Mall sells more 38W X 32L
- Hyannis Mall sells more 32W X 34L
- Order different prepacks per store?

**Recommendation:** Phase 2 feature (not MVP)

### 3. How to handle slow-moving "excess"?
**Scenario:** Order creates 10 units excess that will take 365 days to sell

**Options:**
- A) Full holding cost (365 days × rate) → may prevent order
- B) Cap at 90 days (assume we'll clearance sale after that)
- C) Apply decreasing discount rate (80% after 90 days, 50% after 180 days)

**Recommendation:** Option B for MVP (cap at 90 days)

### 4. What's the threshold for "NOT_RECOMMENDED"?
**Current design:** Show all recommendations, even if unprofitable

**Options:**
- A) Hide recommendations with ROI < -50%
- B) Show all but with strong warning
- C) User-configurable filter

**Recommendation:** Option B (show all, warn on negative)

---

## 📝 **Next Steps**

### For User Decision:

1. **Review this design document**
   - Does the profit formula make sense?
   - Are the examples realistic?
   - Any missing cost factors?

2. **Decide on pricing data source**
   - Manual entry per style?
   - Import from Excel?
   - Derive from sales history?

3. **Approve implementation plan**
   - 4-week timeline acceptable?
   - Phase 1 (data layer) first?
   - Run parallel with old system for validation?

### For Implementation:

Once approved:
1. Create `sku_financial_data` table
2. Build data entry UI (or import script)
3. Populate test data for existing styles
4. Implement `ProfitBasedPrepackOptimizer` class
5. Test with real scenarios
6. Deploy behind feature flag
7. Validate against old optimizer
8. Gradual rollout

---

## 🎯 **Success Metrics**

How we'll know this works:

1. **Recommendation Quality**
   - Profit-based recommendations have higher actual ROI than coverage-based
   - Track actual profit per recommendation over 90 days

2. **User Adoption**
   - % of recommendations followed
   - User feedback scores
   - Time to decision (should be faster with clear profit data)

3. **Business Impact**
   - Reduction in stockouts for fast sellers
   - Reduction in excess slow-moving inventory
   - Overall inventory turns improvement

---

**Document Status:** DRAFT - Awaiting User Approval
**Next Action:** User reviews and provides feedback on approach

---

**End of Design Document**

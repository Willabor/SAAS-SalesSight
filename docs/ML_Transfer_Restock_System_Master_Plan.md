# ML-Powered Transfer & Restock Optimization System
## Master Plan & Implementation Roadmap

**Document Version**: 1.0
**Date**: October 10, 2025
**Status**: Planning Phase
**Estimated Timeline**: 8 weeks (phased approach)

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Test Case: Style 8501B Analysis](#test-case-style-8501b-analysis)
3. [Problem Analysis](#problem-analysis)
4. [Current System State](#current-system-state)
5. [Business Requirements](#business-requirements)
6. [Proposed Solution Architecture](#proposed-solution-architecture)
7. [Business Logic & Rules Engine](#business-logic--rules-engine)
8. [Technical Specifications](#technical-specifications)
9. [Database Analysis & Findings](#database-analysis--findings)
10. [Implementation Plan (8 Phases)](#implementation-plan)
11. [UI/UX Design](#uiux-design)
12. [Configuration Parameters](#configuration-parameters)
13. [Open Questions & Decisions Needed](#open-questions--decisions-needed)
14. [Risk Assessment](#risk-assessment)
15. [Success Metrics](#success-metrics)
16. [Recommendations Summary](#recommendations-summary)

---

## 📊 Executive Summary

### The Vision
Transform the current style-level ML transfer recommendations into a comprehensive **Predictive Inventory Optimization System** that:

1. **Prevents stockouts** through intelligent transfer recommendations
2. **Predicts restock needs** using receiving history analysis
3. **Optimizes network inventory** across all stores
4. **Provides SKU-level granularity** (size/color specific recommendations)
5. **Combines ML intelligence with business rules** for practical, actionable decisions

### Key Innovation
Instead of just saying "transfer 8 units of style BKT934 from GM to NM", the system will say:
- **Transfer SKU 43724** (2 units, Medium, H. Grey) - 88% confidence
- **Transfer SKU 39908** (1 unit, Medium, White Denim) - 82% confidence
- **AND alert**: "This style is 47 days overdue for restock from vendor Rebel Minds"

### Business Impact
- **Reduce stockouts** by predicting and preventing before they happen
- **Optimize transfers** by knowing exactly which SKUs to move
- **Improve vendor management** through receiving pattern analysis
- **Increase sales** by having the right products in the right stores

---

## 🧪 Test Case: Style 8501B Analysis

### Why 8501B is the Perfect Test Case

**Style 8501B (Argonaut Nations Ripped Twill Pants)** is ideal for validating our entire system:

✅ **Core Staple Item** - Carried continuously for 6+ years
✅ **High SKU Count** - 168 different SKUs (12 sizes × 14 colors)
✅ **Active Sales** - Selling across all 4 stores daily
✅ **Regular Receiving** - 88 historical shipments from vendor
✅ **Real Transfer Opportunities** - Found 6 actionable recommendations
✅ **Mix of Scenarios** - Critical stockouts + low stock + overstocked stores

### Quick Stats Summary

| Metric | Value | Assessment |
|--------|-------|------------|
| Total SKUs | 168 | Large variety |
| Network Inventory | 432 units | ✅ Healthy (182 days supply) |
| Network Velocity | 2.37 units/day | Strong seller |
| Avg Margin | 68.9% | Excellent profitability |
| Last Received | 41 days ago | ⚠️ Slightly overdue (expected ~22 days) |
| Receiving Pattern | IRREGULAR | CoV = 1.48 (high variance) |
| Critical Stockouts Found | 3 SKUs | At NM store |
| Transfer Opportunities | 6 SKUs | Mix of critical + high priority |

### Real-World Test Results

**Found Issues**:
1. 🔴 **3 Critical Stockouts** at NM store (size 36W×34L, 34W×32L, 36W×32L)
2. 🟠 **LM Store Overstocked** (530 days supply vs 182 network avg)
3. ⚠️ **Data Quality Issues** (Some velocities showing 44.8 units/day - impossible!)
4. 📊 **Receiving Pattern Irregular** (1-154 day gaps between shipments)

**Successful Validations**:
1. ✅ **Business logic prevented unsafe transfers** (kept safety stock)
2. ✅ **Network analysis accurate** (correctly identified healthy overall inventory)
3. ✅ **Store imbalances detected** (LM overstock, NM stockouts)
4. ✅ **Receiving overdue flagged** (19 days past expected shipment)

### Example Recommendations Generated

**Transfer #1: SKU 42799 (36W×34L Black)**
```
Status: 🔴 CRITICAL - NM out of stock
Action: Transfer 1 unit from GM → NM
Confidence: 85% (High)
Reasoning:
  - NM: 0 units (STOCKOUT!)
  - GM: 2 units, not selling (0/day velocity)
  - After transfer: GM keeps 1 safety stock, NM gets 1 unit
Estimated Impact: Capture 1-2 lost sales/month ($45-90 revenue)
```

**Transfer #2: SKU 42800 (38W×32L Black)**
```
Status: 🟠 HIGH - NM low stock (4.3 days supply)
Action: Transfer 2 units from LM → NM
Confidence: 85% (High)
Reasoning:
  - NM: 1 unit (only 4.3 days left)
  - LM: 3 units, slower sales
  - After transfer: LM keeps 1, NM gets 3 (13 days supply)
Estimated Impact: Prevent stockout, maintain sales flow
```

**Network Decision: Monitor, Don't Restock**
```
Network Status: ✅ HEALTHY
Network Supply: 432 units (182 days)
Vendor Status: ⚠️ Slightly overdue (19 days)
Decision: Transfer to rebalance stores, but NO urgent restock needed
Action: Call vendor for next shipment ETA (proactive)
```

### Detailed Analysis Available

**📄 Full report**: `/docs/8501B_TEST_CASE_ANALYSIS.md` (30+ pages)

Includes:
- Complete SKU breakdown (all 168 items)
- Store-by-store inventory analysis
- Receiving history (all 88 shipments)
- Step-by-step business logic walkthrough
- Physical verification checklist
- Expected outcomes if transfers executed
- Data quality issues found
- Lessons learned

**🎯 Use this test case to**:
1. Validate our business logic before implementation
2. Train users on how system works
3. Identify data quality issues
4. Prove ROI ($135-180/month from just 2 transfers)
5. Build confidence in ML approach

---

## 🔍 Problem Analysis

### Current Limitations

#### 1. Style-Level Aggregation (Critical Issue)
**Problem**: Current ML works at `style_number` level, aggregating ALL SKUs together.

**Example**:
```
Style: BKT934 (Lucky Charm T-Shirt)
- Has 241 different SKUs (sizes: S/M/L/XL/XXL/XXXL, colors: 40+ variations)
- Current system says: "Transfer 8 units from GM to NM"
- Doesn't specify: Which sizes? Which colors?
```

**Impact**:
- User receives recommendation but doesn't know which specific items to transfer
- May transfer wrong sizes/colors
- Inefficient use of transfer resources

#### 2. No Receiving History Integration
**Problem**: System doesn't consider when items will be restocked.

**Example**:
```
SKU 44649 (Medium, Hunter G Black):
- Stock: 0 units (OUT OF STOCK!)
- Still selling: 2 sales in last 30 days
- Last received: 92 days ago
- Vendor pattern: Usually ships every 45 days (OVERDUE by 47 days!)

Current system: "Transfer from another store" (reactive)
Needed system: "Alert: Shipment overdue + transfer temporarily" (proactive)
```

#### 3. Lack of Network-Level Optimization
**Problem**: Each store analyzed in isolation, not as a network.

**Example**:
```
Style 100-401 total network:
- Total stock: 156 units
- Total velocity: 0.8 units/day
- Days supply: 195 days (HEALTHY at network level)

But:
- GM store: 0 units of SKU 44649 (CRITICAL)
- HM store: 4 units of same SKU (can transfer)

System should recognize: Transfer is temporary fix, restock is not urgent
```

#### 4. Fixed Business Rules
**Problem**: Currently using simple thresholds (keep 1 unit at source).

**Issue**:
```
Source store has 4 units, velocity = 1 unit/day
Transfer 3 units → leaves 1 unit
1 unit = only 1 day of supply (will stockout tomorrow!)
```

**Needed**: Velocity-based safety stock calculations.

---

## 🏗️ Current System State

### Technology Stack

#### Frontend
- React 18 + TypeScript
- Component: `inventory-turnover-dashboard.tsx` (1,436 lines)
- Toggle: `useMLPredictions` state switches between rule-based and ML

#### Backend (Node.js)
- Express.js proxy at `/api/inventory/transfer-recommendations-ml`
- Proxies to Python ML service
- Transforms response format

#### ML Service (Python)
- FastAPI service on port 8000
- Random Forest Classifier model
- Files:
  - `ml_service/main.py` - API endpoints
  - `ml_service/models/transfer_predictor.py` - ML model
  - `ml_service/utils/data_extraction.py` - SQL queries
  - `ml_service/utils/feature_engineering.py` - Feature calculations

### Database Tables Used

#### Current Usage
1. **`sales_transactions`** - Sales history
   - Fields: `sku`, `store`, `date`, `price`, `receipt_number`
   - Joined with `item_list` on `sku = item_number`

2. **`item_list`** - Inventory data
   - Fields: `item_number`, `style_number`, `size`, `attribute`, `gm_qty`, `hm_qty`, `nm_qty`, `lm_qty`
   - Currently aggregated by `style_number` (GROUP BY)

#### Not Currently Used
3. **`receiving_vouchers`** - Shipment headers (22,425 records, 2019-2025)
   - Fields: `id`, `voucher_number`, `date`, `store`, `vendor`, `total_qty`

4. **`receiving_lines`** - Shipment line items
   - Fields: `voucher_id`, `item_number`, `qty`, `cost`

### Current ML Query Logic

```sql
-- ml_service/utils/data_extraction.py
SELECT
    style_number,  -- ❌ Aggregated level
    SUM(COALESCE(gm_qty, 0)) as gm_qty,  -- ❌ Summing all SKUs
    SUM(COALESCE(hm_qty, 0)) as hm_qty,
    ...
FROM item_list
WHERE style_number IS NOT NULL
GROUP BY style_number  -- ❌ Loses size/color granularity
```

**Problem**: This query sums quantities across all sizes and colors, losing critical business context.

---

## 📋 Business Requirements

### User Story
> "As a inventory manager, when I see that Style BKT934 needs to be transferred from GM to NM, I need to know **exactly which sizes and colors** to transfer, **how many units**, and whether I should also **order more from the vendor** because the style is running low network-wide."

### Functional Requirements

#### FR1: SKU-Level Recommendations
- System MUST provide recommendations at `item_number` level (individual SKUs)
- MUST show: item_number, size, color/attribute for each recommendation
- MUST group by style_number for readability
- MUST allow expanding/collapsing to see SKU breakdown

#### FR2: Intelligent Quantity Calculation
- MUST prioritize out-of-stock items at destination (to_qty = 0)
- MUST calculate recommended quantity based on:
  - Destination velocity (how fast it sells)
  - Source available quantity
  - Velocity-based safety stock (not fixed 1 unit)
  - ML confidence score
- MUST NOT drain source store below safe levels

#### FR3: Source Velocity Checking
- MUST check if source store also sells the item
- MUST NOT transfer if source and destination velocities are similar
- Threshold: If velocities within 0.3 units/day, skip recommendation

#### FR4: ML Confidence Filtering
- MUST filter out low-confidence predictions
- Minimum confidence: 60% (to be confirmed)
- MUST show confidence level: High (>70%), Medium (60-70%), Low (<60%)

#### FR5: Receiving History Integration
- MUST analyze receiving patterns for each style/vendor
- MUST calculate:
  - Average days between shipments
  - Irregularity (standard deviation)
  - Days since last shipment
  - Overdue status
- MUST alert when shipment is overdue

#### FR6: Network-Level Analysis
- MUST calculate total network inventory and velocity
- MUST determine if issue is:
  - A) Store imbalance (transfer solution)
  - B) Network-wide shortage (restock solution)
  - C) Both (transfer + restock)

#### FR7: Export to Excel
- MUST export at SKU level (not just style level)
- MUST include multiple sheets:
  - Summary (style-level overview)
  - SKU Details (all recommendations with size/color)
  - Action List (prioritized to-dos)
  - Receiving Analysis (overdue shipments)

#### FR8: UI Enhancements
- MUST add eye icon (👁️) to expand SKU breakdown
- MUST show size and color in breakdown table
- MUST sort SKUs by confidence and quantity
- MUST use color coding for priority levels

### Non-Functional Requirements

#### NFR1: Performance
- SKU-level analysis acceptable up to 60 seconds load time
- User must see loading indicator
- Consider caching for frequently accessed data

#### NFR2: Accuracy
- ML predictions must be >70% accurate (measured on test set)
- Business rules must prevent invalid recommendations (e.g., transferring 0 units)

#### NFR3: Configurability
- All thresholds must be configurable (not hardcoded)
- Settings should be adjustable via UI or config file

#### NFR4: Maintainability
- Code must be well-documented
- Business rules should be separate from ML code
- Changes to rules should not require ML retraining

---

## 🎯 Proposed Solution Architecture

### Three-Layer System

```
┌─────────────────────────────────────────────────────────────┐
│                    LAYER 1: Data Foundation                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │Sales History │  │  Inventory   │  │  Receiving   │      │
│  │              │  │              │  │   History    │      │
│  │ Velocity by  │  │  Stock by    │  │  Patterns &  │      │
│  │  SKU/Store   │  │  SKU/Store   │  │  Overdue     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────┐
│                    LAYER 2: Intelligence Engine              │
│                            │                                 │
│  ┌─────────────────────────▼─────────────────────────────┐  │
│  │         Machine Learning Predictor (SKU-Level)        │  │
│  │  - Random Forest Classifier                           │  │
│  │  - Features: velocity, stock, margin, receiving freq │  │
│  │  - Output: Transfer success probability per SKU       │  │
│  └───────────────────────────┬───────────────────────────┘  │
│                              │                               │
│  ┌───────────────────────────▼───────────────────────────┐  │
│  │          Business Rules Optimizer                     │  │
│  │  - Stockout prevention (to_qty = 0 = CRITICAL)       │  │
│  │  - Velocity-based safety stock                       │  │
│  │  - Source velocity checking                          │  │
│  │  - ML confidence filtering (>60%)                    │  │
│  │  - Quantity calculation                              │  │
│  └───────────────────────────┬───────────────────────────┘  │
│                              │                               │
│  ┌───────────────────────────▼───────────────────────────┐  │
│  │         Receiving Pattern Analyzer                    │  │
│  │  - Calculate avg days between shipments              │  │
│  │  - Detect pattern type (regular/irregular)           │  │
│  │  - Predict next shipment date                        │  │
│  │  - Flag overdue shipments                            │  │
│  └───────────────────────────┬───────────────────────────┘  │
│                              │                               │
│  ┌───────────────────────────▼───────────────────────────┐  │
│  │          Network Optimizer (Master Decision)          │  │
│  │  - Combines all analyses                             │  │
│  │  - Decides: Transfer, Restock, or Both               │  │
│  │  - Priority scoring                                  │  │
│  │  - Groups by style for display                       │  │
│  └───────────────────────────┬───────────────────────────┘  │
└────────────────────────────┼─────────────────────────────────┘
                             │
┌────────────────────────────┼─────────────────────────────────┐
│                    LAYER 3: Presentation                     │
│                            │                                 │
│  ┌─────────────────────────▼─────────────────────────────┐  │
│  │                  Action Center Tab                    │  │
│  │  Unified priority list: Transfers + Restocks         │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Transfer Recommendations Tab             │  │
│  │  Grouped by style, expandable SKU breakdown (👁️)     │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                 Restock Alerts Tab                    │  │
│  │  Overdue shipments, receiving patterns, vendor info  │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Component Architecture

#### Python ML Service (`ml_service/`)

**New Files to Create:**
```
ml_service/
├── business_rules/
│   ├── __init__.py
│   ├── transfer_optimizer.py     # NEW: Business rules for transfers
│   ├── restock_analyzer.py       # NEW: Receiving history analysis
│   └── network_optimizer.py      # NEW: Master decision engine
├── models/
│   ├── transfer_predictor.py     # MODIFY: Add SKU-level logic
│   └── sku_predictor.py          # NEW: Dedicated SKU-level model
├── utils/
│   ├── data_extraction.py        # MODIFY: Remove GROUP BY style
│   ├── feature_engineering.py    # MODIFY: SKU-level features
│   └── receiving_queries.py      # NEW: Receiving history queries
├── config/
│   ├── optimization_rules.py     # NEW: All business rule configs
│   └── ml_config.py              # NEW: ML-specific configs
└── main.py                        # MODIFY: Add new endpoints
```

**New API Endpoints:**
```python
POST /api/ml/predict-transfers-sku-level  # SKU-level predictions
GET  /api/ml/receiving-patterns/:style    # Receiving history for style
POST /api/ml/optimize-network              # Full network optimization
GET  /api/ml/action-center                 # Unified action list
```

#### Node.js Backend (`server/`)

**Files to Modify:**
```
server/
├── routes.ts                     # MODIFY: Add new proxy endpoints
└── storage.ts                    # ADD: Receiving pattern queries
```

**New Routes:**
```typescript
GET  /api/inventory/transfer-recommendations-ml  # MODIFY: Handle SKU breakdown
GET  /api/inventory/restock-alerts               # NEW: Receiving analysis
GET  /api/inventory/action-center                # NEW: Unified view
GET  /api/inventory/receiving-pattern/:style     # NEW: Pattern details
```

#### Frontend (`client/src/`)

**Files to Modify:**
```
client/src/
├── components/
│   ├── inventory-turnover-dashboard.tsx  # MODIFY: Add tabs, expandable rows
│   ├── sku-breakdown-table.tsx           # NEW: SKU detail component
│   ├── restock-alerts-panel.tsx          # NEW: Receiving alerts
│   └── action-center.tsx                 # NEW: Unified action list
└── lib/
    └── api.ts                            # ADD: New API calls
```

---

## ⚙️ Business Logic & Rules Engine

### Rule 1: Stockout Prevention (CRITICAL Priority)

**Logic**:
```python
if destination_store_qty == 0 and destination_velocity > 0:
    priority = "CRITICAL"
    urgency_boost = 1000  # Highest priority
    reason = "Destination out of stock, still selling"
```

**Example**:
```
SKU 44649 (Medium, Hunter G Black):
- GM store: 0 units
- GM velocity: 0.07 units/day (2 sales/30 days)
- HM store: 4 units
→ CRITICAL: Transfer from HM to GM
```

### Rule 2: Velocity-Based Safety Stock

**Logic**:
```python
def calculate_safety_stock(velocity, safety_days=7):
    """
    Calculate minimum stock to keep at source.

    Args:
        velocity: Units sold per day
        safety_days: Buffer days (default 7)

    Returns:
        Minimum units to keep
    """
    min_safety = max(1, math.ceil(velocity * safety_days))
    return min_safety

# Example usage:
source_velocity = 0.5  # units/day
safety_stock = calculate_safety_stock(0.5, 7)
# Result: max(1, ceil(0.5 * 7)) = max(1, 4) = 4 units

max_transferable = source_qty - safety_stock
```

**Examples**:

| Source Qty | Source Velocity | Safety Days | Safety Stock | Max Transfer |
|-----------|----------------|-------------|--------------|--------------|
| 10        | 1.0/day        | 7           | 7 units      | 3 units      |
| 5         | 0.2/day        | 7           | 2 units      | 3 units      |
| 2         | 0.1/day        | 7           | 1 unit       | 1 unit       |
| 1         | 0.5/day        | 7           | 4 units      | 0 (can't!)   |

**User Question**: What safety_days value should we use?
- Option A: Fixed 7 days (1 week buffer)
- Option B: Variable: 7 for fast movers, 14 for slow movers
- **Recommendation**: Start with fixed 7, make configurable

### Rule 3: Source Velocity Check

**Logic**:
```python
def should_skip_transfer(from_velocity, to_velocity, threshold=0.3):
    """
    Don't transfer if source and destination sell at similar rates.

    Args:
        from_velocity: Source store daily sales
        to_velocity: Destination store daily sales
        threshold: Max difference to consider "similar"

    Returns:
        True if should skip (velocities too similar)
    """
    velocity_diff = abs(to_velocity - from_velocity)
    return velocity_diff < threshold
```

**Examples**:

| From Velocity | To Velocity | Difference | Threshold | Skip? | Reason |
|--------------|-------------|------------|-----------|-------|--------|
| 0.5/day      | 0.8/day     | 0.3        | 0.3       | No    | Just above threshold |
| 0.5/day      | 0.6/day     | 0.1        | 0.3       | Yes   | Too similar |
| 0.1/day      | 1.5/day     | 1.4        | 0.3       | No    | Big difference |
| 0.0/day      | 0.8/day     | 0.8        | 0.3       | No    | Source not selling |

**User Question**: What threshold value?
- **Recommendation**: 0.3 units/day difference minimum

### Rule 4: ML Confidence Filtering

**Logic**:
```python
def filter_by_confidence(predictions, min_confidence=0.60):
    """
    Filter out low-confidence ML predictions.

    Args:
        predictions: List of SKU predictions
        min_confidence: Minimum threshold (0.0 - 1.0)

    Returns:
        Filtered predictions
    """
    return [p for p in predictions if p['success_probability'] >= min_confidence]

def get_confidence_level(probability):
    """
    Classify confidence into High/Medium/Low.
    """
    if probability >= 0.70:
        return "High"
    elif probability >= 0.60:
        return "Medium"
    else:
        return "Low"  # Would be filtered out
```

**Examples**:

| ML Probability | Confidence Level | Action |
|---------------|------------------|--------|
| 0.88          | High             | ✅ Show normally |
| 0.72          | High             | ✅ Show normally |
| 0.65          | Medium           | ⚠️ Show with warning |
| 0.58          | Low              | ❌ Filter out |
| 0.45          | Low              | ❌ Filter out |

**User Question**: Confirm thresholds?
- Minimum: 60%
- Medium/High cutoff: 70%
- **Recommendation**: Make configurable in settings

### Rule 5: Recommended Quantity Calculation

**Complete Algorithm**:
```python
def calculate_recommended_quantity(
    sku_data,
    ml_probability,
    from_qty,
    to_qty,
    from_velocity,
    to_velocity,
    margin_percent
):
    """
    Master algorithm for calculating transfer quantity.

    Combines all rules:
    1. Stockout urgency
    2. Target days of supply
    3. Safety stock at source
    4. ML confidence scaling
    5. Maximum transfer limits
    """

    # Step 1: Determine urgency and target
    if to_qty == 0:
        priority = "CRITICAL"
        target_days = 14  # 2 weeks supply
    elif to_qty / to_velocity < 3:  # <3 days supply
        priority = "HIGH"
        target_days = 14
    elif to_qty / to_velocity < 7:  # <7 days supply
        priority = "MEDIUM"
        target_days = 10
    else:
        priority = "LOW"
        target_days = 7

    # Step 2: Calculate ideal quantity for destination
    ideal_qty = math.ceil(to_velocity * target_days) - to_qty

    # Step 3: Apply source constraints
    safety_stock = max(1, math.ceil(from_velocity * 7))
    max_from_source = from_qty - safety_stock

    # Step 4: Apply ML confidence scaling
    # Lower confidence = reduce quantity
    confidence_factor = (ml_probability - 0.5) / 0.5  # 0.6→0.2, 1.0→1.0
    scaled_qty = math.ceil(ideal_qty * (0.5 + 0.5 * confidence_factor))

    # Step 5: Apply limits
    final_qty = max(1, min(scaled_qty, max_from_source, ideal_qty, 20))

    # Step 6: Check if transfer is viable
    if max_from_source <= 0:
        final_qty = 0
        reason = "Source doesn't have enough safety stock to transfer"

    return {
        'recommended_qty': final_qty,
        'priority': priority,
        'ideal_qty': ideal_qty,
        'max_from_source': max_from_source,
        'target_days': target_days,
        'confidence_factor': confidence_factor,
        'reason': reason
    }
```

**Example Walkthrough**:

```
Input:
- SKU: 43724 (Medium, H. Grey)
- ML Probability: 0.85
- From (GM): 5 units, velocity 0.2/day
- To (NM): 0 units, velocity 0.8/day

Step 1: Urgency
  to_qty = 0 → CRITICAL
  target_days = 14

Step 2: Ideal quantity
  ideal_qty = ceil(0.8 × 14) - 0 = 12 units

Step 3: Source constraints
  safety_stock = max(1, ceil(0.2 × 7)) = max(1, 2) = 2 units
  max_from_source = 5 - 2 = 3 units

Step 4: ML scaling
  confidence_factor = (0.85 - 0.5) / 0.5 = 0.7
  scaled_qty = ceil(12 × (0.5 + 0.5 × 0.7)) = ceil(12 × 0.85) = 11

Step 5: Apply limits
  final_qty = max(1, min(11, 3, 12, 20))
            = max(1, 3)
            = 3 units  ← Limited by source availability!

Result:
  Transfer 3 units from GM to NM
  Priority: CRITICAL
  Note: "Limited by source safety stock (need to keep 2 units)"
```

### Rule 6: Receiving Pattern Analysis

**Algorithm**:
```python
def analyze_receiving_pattern(style_number):
    """
    Analyze receiving history for a style.

    Returns pattern metrics and predictions.
    """

    # Query: Get all shipments for this style
    shipments = query_receiving_history(style_number)

    if len(shipments) < 2:
        return {'status': 'INSUFFICIENT_DATA'}

    # Calculate days between consecutive shipments
    days_between = []
    for i in range(1, len(shipments)):
        days = (shipments[i]['date'] - shipments[i-1]['date']).days
        days_between.append(days)

    # Statistics
    avg_days = np.mean(days_between)
    stddev_days = np.std(days_between)
    min_days = np.min(days_between)
    max_days = np.max(days_between)

    # Classify pattern type
    coefficient_of_variation = stddev_days / avg_days if avg_days > 0 else 0

    if coefficient_of_variation < 0.3:
        pattern_type = "REGULAR"
    elif coefficient_of_variation < 0.7:
        pattern_type = "SEMI_REGULAR"
    else:
        pattern_type = "IRREGULAR"

    # Predict next shipment
    last_shipment_date = shipments[-1]['date']
    days_since_last = (datetime.now() - last_shipment_date).days
    expected_next_in = avg_days - days_since_last

    # Overdue check
    overdue = expected_next_in < 0
    overdue_by = abs(expected_next_in) if overdue else 0

    # Confidence in prediction (lower for irregular patterns)
    prediction_confidence = 1.0 - min(coefficient_of_variation, 1.0)

    return {
        'pattern_type': pattern_type,
        'avg_days_between': avg_days,
        'stddev_days': stddev_days,
        'coefficient_of_variation': coefficient_of_variation,
        'last_shipment_date': last_shipment_date,
        'days_since_last': days_since_last,
        'expected_next_in_days': expected_next_in,
        'overdue': overdue,
        'overdue_by_days': overdue_by,
        'prediction_confidence': prediction_confidence,
        'total_shipments': len(shipments),
        'avg_qty_per_shipment': np.mean([s['qty'] for s in shipments]),
        'vendor': shipments[0]['vendor']
    }
```

**Real Example** (from our database):

```
Style: 100-401 (Rebel Minds Track Pants)
Vendor: Rebel Minds

Shipment History:
  2023-08-30: 1 unit
  2023-11-15: 96 units   (77 days later)
  2024-03-06: 144 units  (112 days later)
  2024-03-07: 174 units  (1 day later)
  2024-03-08: 72 units   (1 day later)
  2024-03-13: 132 units  (5 days later)
  2024-03-21: 120 units  (8 days later)
  2024-10-17: -1 unit    (210 days later - return?)
  2025-07-09: 48 units   (265 days later!)
  2025-07-10: 144 units  (1 day later)

Analysis:
  avg_days_between: 68 days
  stddev_days: 88 days
  coefficient_of_variation: 1.29 (HIGH!)
  pattern_type: IRREGULAR

  last_shipment: 2025-07-10
  days_since_last: 92 days
  expected_next_in: 68 - 92 = -24 days

  Status: ⚠️ OVERDUE by 24 days
  Confidence: LOW (irregular pattern)

  Recommendation:
    "Contact vendor Rebel Minds - shipment expected ~24 days ago,
     but pattern is highly irregular (CoV=1.29).
     Actual next shipment could be anywhere from today to 100+ days."
```

### Rule 7: Network-Level Decision Logic

**Master Decision Tree**:
```python
def make_network_decision(sku_data):
    """
    Decide whether to transfer, restock, or both.
    """

    # Calculate network metrics
    total_stock = sum(sku_data['stock_by_store'].values())
    total_velocity = sum(sku_data['velocity_by_store'].values())
    network_days_supply = total_stock / total_velocity if total_velocity > 0 else 999

    # Get receiving analysis
    receiving = analyze_receiving_pattern(sku_data['style_number'])

    # Decision matrix
    decisions = []

    # Check 1: Network-level shortage?
    if network_days_supply < 14:
        # Yes - need to restock
        decisions.append({
            'action': 'RESTOCK',
            'priority': 'HIGH' if network_days_supply < 7 else 'MEDIUM',
            'reason': f'Network-wide low inventory ({network_days_supply:.1f} days)',
            'vendor': receiving['vendor'],
            'expected_shipment': receiving['expected_next_in_days'],
            'overdue': receiving['overdue']
        })

    # Check 2: Store-level imbalances?
    for store, velocity in sku_data['velocity_by_store'].items():
        stock = sku_data['stock_by_store'][store]
        days_supply = stock / velocity if velocity > 0 else 999

        if days_supply < 3:
            # Critical imbalance - need transfer

            # Find best source store
            best_source = find_best_source_for_transfer(
                target_store=store,
                sku_data=sku_data,
                required_qty=velocity * 14
            )

            if best_source:
                decisions.append({
                    'action': 'TRANSFER',
                    'priority': 'CRITICAL',
                    'from_store': best_source['store'],
                    'to_store': store,
                    'qty': best_source['qty'],
                    'ml_confidence': best_source['confidence'],
                    'reason': f'{store} stockout/near-stockout ({days_supply:.1f} days)'
                })

    # Sort by priority
    priority_order = {'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1}
    decisions.sort(key=lambda x: priority_order[x['priority']], reverse=True)

    return {
        'decisions': decisions,
        'network_days_supply': network_days_supply,
        'network_healthy': network_days_supply >= 14,
        'receiving_analysis': receiving
    }
```

**Decision Matrix**:

| Network Days Supply | Store Imbalance | Decision |
|--------------------|--------------------|----------|
| >14 days (healthy) | Yes (some stores low) | ✅ TRANSFER only |
| >14 days           | No (all balanced)     | ✅ OK - Monitor |
| <14 days (low)     | Yes (some stores low) | 🔴 TRANSFER + RESTOCK |
| <14 days           | No (all low equally)  | 🔴 RESTOCK only |
| <7 days (critical) | Any                   | 🚨 URGENT RESTOCK |

---

## 📊 Database Analysis & Findings

### Receiving Data Analysis

**Database**: PostgreSQL (Neon serverless)

**Timespan**: 2019-01-04 to 2025-10-06 (6.75 years)

**Volume**: 22,425 receiving vouchers

### Top Vendors by Shipment Frequency

| Vendor | Shipments | Avg Days Between | Pattern Type | Notes |
|--------|-----------|------------------|--------------|-------|
| Jordan Craig | 4,704 | 0.5 days | VERY REGULAR | Almost daily shipments |
| Rebel Minds | 2,071 | 1.2 days | REGULAR | Every ~1-2 days |
| New Era | 1,791 | 1.4 days | REGULAR | Consistent |
| WaiMea | 1,661 | 1.5 days | REGULAR | Reliable |
| Black Keys | 741 | 2.8 days | SEMI-REGULAR | Some variance |
| KDNK | 586 | 3.3 days | SEMI-REGULAR | More variation |
| Ethika | 531 | 4.3 days | IRREGULAR | High variance |

### Key Findings

#### Finding 1: High-Frequency Receiving
Some vendors ship almost daily, making receiving pattern analysis critical for inventory planning.

#### Finding 2: Irregular Patterns Exist
Some vendors have highly irregular patterns (e.g., Ethika: 4.3 ± days variance), making prediction difficult.

#### Finding 3: Active Stockouts Detected
```sql
-- Found SKUs currently out of stock but still selling:
SKU 44649 (Medium Hunter G Black):
  - Stock: 0 units
  - Sales last 30 days: 2 units
  - Last received: 92 days ago
  - Vendor: Rebel Minds (usually ships every 1.2 days)
  - Status: OVERDUE - likely discontinued or vendor issue
```

#### Finding 4: Multi-SKU Styles Common
- Style BKT934: 241 different SKUs
- Style 100-401: 182 different SKUs
- Style T934T: 171 different SKUs

This confirms the critical need for SKU-level analysis.

### Database Schema Additions Needed

**Option 1: Materialized Views** (Recommended for performance)

```sql
-- For fast velocity lookups
CREATE MATERIALIZED VIEW sku_velocity_by_store AS
SELECT
  il.item_number,
  il.style_number,
  il.size,
  il.attribute,
  store.name as store,
  il.gm_qty as stock_qty,  -- Repeat for each store
  COUNT(st.id) FILTER (WHERE st.date >= CURRENT_DATE - 30) as sales_30d,
  COUNT(st.id)::numeric FILTER (WHERE st.date >= CURRENT_DATE - 30) / 30.0 as velocity,
  MAX(st.date) as last_sale_date
FROM item_list il
CROSS JOIN (SELECT 'GM' as name UNION SELECT 'HM' UNION SELECT 'NM' UNION SELECT 'LM') store
LEFT JOIN sales_transactions st ON st.sku = il.item_number AND st.store = store.name
GROUP BY il.item_number, il.style_number, il.size, il.attribute, store.name, il.gm_qty;

-- For receiving patterns
CREATE MATERIALIZED VIEW style_receiving_patterns AS
WITH shipments AS (
  SELECT
    il.style_number,
    v.vendor,
    v.date::date,
    SUM(rl.qty) as qty,
    v.date::date - LAG(v.date::date) OVER (PARTITION BY il.style_number ORDER BY v.date) as days_between
  FROM receiving_lines rl
  JOIN receiving_vouchers v ON rl.voucher_id = v.id
  JOIN item_list il ON rl.item_number = il.item_number
  WHERE il.style_number IS NOT NULL
  GROUP BY il.style_number, v.vendor, v.date
)
SELECT
  style_number,
  vendor,
  COUNT(*) as total_shipments,
  AVG(days_between) as avg_days_between,
  STDDEV(days_between) as stddev_days_between,
  MAX(date) as last_shipment_date,
  CURRENT_DATE - MAX(date) as days_since_last,
  AVG(qty) as avg_qty_per_shipment,
  CASE
    WHEN STDDEV(days_between) / NULLIF(AVG(days_between), 0) < 0.3 THEN 'REGULAR'
    WHEN STDDEV(days_between) / NULLIF(AVG(days_between), 0) < 0.7 THEN 'SEMI_REGULAR'
    ELSE 'IRREGULAR'
  END as pattern_type
FROM shipments
WHERE days_between IS NOT NULL
GROUP BY style_number, vendor;

-- Refresh strategy: Daily at 2 AM
CREATE OR REPLACE FUNCTION refresh_ml_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY sku_velocity_by_store;
  REFRESH MATERIALIZED VIEW CONCURRENTLY style_receiving_patterns;
END;
$$ LANGUAGE plpgsql;
```

**Option 2: Indexes Only** (If materialized views too heavy)

```sql
CREATE INDEX idx_sales_sku_store_date ON sales_transactions(sku, store, date);
CREATE INDEX idx_item_list_style ON item_list(style_number) INCLUDE (item_number, size, attribute);
CREATE INDEX idx_receiving_lines_item ON receiving_lines(item_number);
CREATE INDEX idx_receiving_vouchers_date ON receiving_vouchers(date, vendor);
```

**Recommendation**: Start with materialized views, refresh nightly. If performance issues, switch to on-demand calculations with indexes.

---

## 📅 Implementation Plan

### Phase 1A: Enhanced Transfer Logic (Week 1)
**Goal**: Build business rules engine with velocity-based logic

**Tasks**:
1. ✅ Create `ml_service/business_rules/transfer_optimizer.py`
   - Implement velocity × safety_days calculation
   - Implement source velocity checking
   - Implement ML confidence filtering
   - Implement recommended quantity algorithm

2. ✅ Create `ml_service/config/optimization_rules.py`
   - All configurable thresholds
   - Safety days parameters
   - Confidence cutoffs

3. ✅ Modify `ml_service/utils/data_extraction.py`
   - Remove `GROUP BY style_number`
   - Query at `item_number` level
   - Add `size`, `attribute` to output
   - Calculate velocity per SKU per store

4. ✅ Modify `ml_service/models/transfer_predictor.py`
   - Apply business rules after ML predictions
   - Keep ML predictions separate from rule outputs
   - Return both for comparison

5. ✅ Add logging for debugging
   - Log each decision step
   - Show why SKUs were included/excluded

**Deliverable**: Working SKU-level predictions with business rules

**Success Criteria**:
- Can predict at item_number level
- Safety stock calculated by velocity
- Low-confidence predictions filtered
- Source velocity checked

---

### Phase 1B: UI - Expandable Rows (Week 2)
**Goal**: Allow users to see SKU breakdown

**Tasks**:
1. ✅ Update TypeScript interfaces
   ```typescript
   interface SKUBreakdown {
     itemNumber: string;
     size: string | null;
     attribute: string | null;
     fromStoreQty: number;
     toStoreQty: number;
     recommendedQty: number;
     successProbability: number;
     confidenceLevel: 'High' | 'Medium' | 'Low';
     reason?: string;
   }

   interface TransferRecommendation {
     styleNumber: string;
     // ... existing fields ...
     skuBreakdown?: SKUBreakdown[];
   }
   ```

2. ✅ Update backend transformation (`server/routes.ts`)
   - Parse SKU breakdown from ML response
   - Transform to camelCase
   - Group SKUs by (style, from, to)

3. ✅ Add expandable row state
   ```typescript
   const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
   ```

4. ✅ Add Eye icon column
   ```tsx
   <TableHead className="w-12">Details</TableHead>
   ```

5. ✅ Render SKU breakdown table on expand
   - Show item_number, size, color
   - Show from/to quantities
   - Show recommended qty
   - Show confidence badge

6. ✅ Update Excel export
   - Sheet 1: Summary (style-level)
   - Sheet 2: SKU Details (all SKUs)

**Deliverable**: Users can click eye icon to see SKU-level details

**Success Criteria**:
- Eye icon visible for multi-SKU styles
- Click expands to show breakdown
- SKU table shows size/color
- Export includes SKU sheet

---

### Phase 2: Receiving History Analysis (Week 3-4)
**Goal**: Analyze receiving patterns and flag overdue shipments

**Tasks**:

**Week 3: Data Layer**
1. ✅ Create materialized views
   - `style_receiving_patterns`
   - Test refresh performance

2. ✅ Create `ml_service/utils/receiving_queries.py`
   - Query receiving history for style
   - Calculate pattern metrics
   - Identify overdue shipments

3. ✅ Create `ml_service/business_rules/restock_analyzer.py`
   - Implement pattern analysis algorithm
   - Classify pattern types
   - Predict next shipment date
   - Calculate overdue status

4. ✅ Add endpoint `GET /api/ml/receiving-patterns/:style`

**Week 4: UI Integration**
5. ✅ Create `client/src/components/restock-alerts-panel.tsx`
   - Display receiving pattern summary
   - Show overdue shipments
   - Vendor contact info
   - Shipment history chart

6. ✅ Add "Restock Alerts" tab to dashboard
   - List of styles needing restock
   - Sort by urgency (days overdue)
   - Filter by vendor

**Deliverable**: Separate tab showing receiving analysis

**Success Criteria**:
- Can view receiving pattern for any style
- Overdue shipments flagged
- Pattern type classified (regular/irregular)
- Prediction confidence shown

---

### Phase 2B: Vendor Prepack Management (Week 4-5)
**Goal**: Optimize restock ordering for vendors who ship prepacked boxes

**Background**: 🚨 **CRITICAL DISCOVERY** - Approximately 70% of vendors ship products in **prepacked boxes** with fixed size assortments. Cannot order individual SKUs from these vendors - must order entire boxes.

**🏭 CRITICAL WORKFLOW CLARIFICATION**:
- ⚠️ **Prepacks are COLOR-SPECIFIC!** Each box contains ONE color in assorted sizes
- Prepacked boxes ship to **WAREHOUSE/HQ** (NOT individual stores)
- Boxes are **UNPACKED at warehouse**
- Individual SKUs (by color+size) are **manually distributed to stores** based on their specific needs
- This eliminates store-level waste - each store gets only what it needs!

**Impact**: Optimization is **COLOR-FIRST, then network-level** (not store-level):
- Must analyze needs BY COLOR first, then by size within each color
- Match prepack contents to network-wide aggregate needs FOR EACH COLOR
- Don't worry about matching one specific store's needs
- "Waste" only counts colors NO stores want + sizes within colors NO stores need
- Warehouse acts as buffer for future distribution

**Tasks**:

**Week 4: Data Model & Algorithm**
1. ✅ Create database schema for prepack system
   ```sql
   CREATE TABLE vendors (
     id SERIAL PRIMARY KEY,
     vendor_name VARCHAR(255) UNIQUE NOT NULL,
     ships_prepack BOOLEAN DEFAULT FALSE,
     ships_open_stock BOOLEAN DEFAULT FALSE,
     contact_email VARCHAR(255),
     notes TEXT
   );

   CREATE TABLE vendor_prepacks (
     id SERIAL PRIMARY KEY,
     vendor_id INTEGER REFERENCES vendors(id),
     style_number VARCHAR(100),
     prepack_name VARCHAR(50),   -- "Pack A", "Pack B", etc.
     total_pieces INTEGER,       -- 12 for Argonaut Nations
     cost_per_box DECIMAL(10,2)
   );

   CREATE TABLE vendor_prepack_contents (
     id SERIAL PRIMARY KEY,
     prepack_id INTEGER REFERENCES vendor_prepacks(id),
     size VARCHAR(50),
     inseam VARCHAR(50),
     color VARCHAR(100),
     quantity_per_box INTEGER
   );
   ```

2. ✅ Create `ml_service/models/prepack_optimizer.py`
   - Implement bin packing optimization algorithm
   - Evaluate all combinations of available prepacks
   - Score by coverage (% of needs met) vs waste (% excess inventory)
   - Find optimal pack combination within waste tolerance

3. ✅ Create `ml_service/utils/prepack_data.py`
   - Query vendor prepack configurations from database
   - Extract current inventory needs by size
   - Calculate network days of supply
   - Determine vendor type (prepack/open stock/hybrid)

**Week 5: Integration & Testing**
4. ✅ Add endpoint `POST /api/ml/prepack-recommendations`
   - Input: style_number, target_days_supply
   - Process:
     - Determine vendor for style
     - Check if vendor uses prepacks
     - Get available prepack configurations
     - Analyze current size distribution and needs
     - Run optimization algorithm
     - Return recommended box quantities
   - Output: Recommendation with coverage/waste metrics

5. ✅ Create prepack analysis visualization
   - Show current vs needed inventory by size
   - Display prepack contents (what you'd receive)
   - Calculate coverage and waste for each option
   - Highlight recommended combination

6. ✅ Update 8501B test case with prepack analysis
   - Analyze current size distribution
   - Show Pack A vs Pack B contents
   - Recommend optimal combination
   - Document transfer-first strategy (use prepacks only when network low)

**Deliverable**: Complete prepack optimization system

**Success Criteria**:
- Can identify which vendors use prepacks
- Correctly optimizes pack selection BY COLOR to minimize waste
- Recommends DO NOT ORDER when network is healthy
- Provides clear reasoning for [Color + Pack] recommendations
- ✅ **CONFIRMED**: Prepacks are color-specific (one color per box)

**Example Output**:
```
Style: 8501B (Argonaut Nations Ripped Twill Pants)
Vendor: Argonaut Nations (prepack only)

Current Status:
  Network: 432 units (182 days supply) ✅ HEALTHY
  Recommendation: DO NOT ORDER - Use transfers to rebalance stores

Future Scenario (when network drops to 140 units):

  🏭 WAREHOUSE DISTRIBUTION WORKFLOW (COLOR-AWARE):

  Analysis BY COLOR (CRITICAL!):
    Network needs (across all 4 stores):
      Black (80% of sales - PRIORITY):
        30W-38W: Need 48 units total (mid sizes selling fast)
        40W-44W: Have 120 units total (large sizes overstocked)

      Olive (10% of sales):
        30W-38W: Need 12 units total
        40W-44W: Have 20 units (adequate)

      Navy, Wheat, Others: 3-5 units each (low demand)

  Option 1: Order 5 boxes Pack A (Black) + 1 box Pack A (Olive) to WAREHOUSE
    Receive at warehouse:
      Black: 15× 30W, 10× 32W, 10× 34W, 5× 36W, 5× 38W (60 pieces)
      Olive: 3× 30W, 2× 32W, 2× 34W, 1× 36W, 1× 38W (12 pieces)
    Total: 72 pieces

    Distribution Plan (BY COLOR):
      → NM: 23 units
          Black: 8× 30W, 6× 34W, 4× 38W = 18 units
          Olive: 2× 34W, 1× 36W = 3 units
          Navy: 1× 30W, 1× 32W = 2 units

      → GM: 18 units
          Black: 5× 30W, 4× 32W, 3× 36W = 12 units
          Olive: 3× 30W, 2× 34W = 5 units
          Navy: 1× 30W = 1 unit

      → HM: 18 units
          Black: 2× 32W, 4× 34W, 3× 38W = 9 units
          Olive: 2× 32W, 2× 34W, 2× 38W = 6 units
          Navy: 1× 32W, 2× 34W = 3 units

      → LM: 5 units
          Black: 0× 30W, 4× 32W = 4 units
          Olive: 1× 30W = 1 unit

      → Warehouse reserve: 18 units (future distribution)
          Black: 15 units (various sizes)
          Olive: 3 units

    Network-level waste: <5% (only sizes within colors no stores need)
    Store-level fit: Perfect (each store gets only colors+sizes they need)
    Score: 95/100
    Cost: ~$1,008 (6 boxes × $168)

  Option 2: Order 3 boxes Pack A (Black) + 2 boxes Pack B (Black)
    Problem: Pack B contains 40W-44W which are overstocked
    Network-level waste: 40% (large sizes not needed)
    Score: 55/100

  ✅ RECOMMENDATION: Order 5 boxes Pack A (Black) + 1 box Pack A (Olive)
  Then distribute by color+size:
    - Black prioritized (5 boxes = 60 pieces)
    - Olive moderate (1 box = 12 pieces)
    - Wheat/Navy skipped (low demand, adequate stock)
    - Initial distribution: 41 units to stores (57%)
    - Warehouse reserve: 18 units (25%)
    - Each store receives only the colors+sizes they need
    - ZERO store-level waste!

  Rationale:
    - Pack A matches Black and Olive size needs perfectly
    - Black prioritized (80% of sales)
    - Colors matched to demand (skip slow colors)
    - Warehouse distribution eliminates store waste
    - Avoids Pack B (40W-44W all stores already overstocked)
```

**Integration Points**:
- Phase 2 (Receiving History): Use to predict restock timing
- Phase 3 (Network Optimization): Decide transfer vs prepack restock
- Phase 6 (Export): Include prepack recommendations in Excel

**Configuration Parameters**:
```python
PREPACK_CONFIG = {
    "max_waste_tolerance": 0.30,        # 30% waste acceptable
    "min_coverage_target": 0.90,        # Must cover 90% of needs
    "max_boxes_per_prepack": 20,        # Don't order >20 boxes
    "restock_trigger_days": 60,         # Order when < 60 days supply
}
```

**Key Files Created**:
- `/ml_service/models/prepack_optimizer.py` (370 lines) - Optimization algorithm
- `/ml_service/utils/prepack_data.py` (180 lines) - Database extraction
- `/docs/PREPACK_SYSTEM_ANALYSIS.md` (680 lines) - Complete documentation
- Updated `/docs/8501B_TEST_CASE_ANALYSIS.md` - Added prepack section (380 lines)

**Vendor Data Collection Needed**:
- [ ] Get prepack configurations from top 10 vendors
- [ ] Classify all vendors as Prepack/Open Stock/Hybrid
- [✅] ~~Confirm if prepacks are color-specific or mixed~~ **CONFIRMED: Color-specific!**
- [ ] Get Pack A/B/C size distributions for each vendor
- [ ] List all available colors per style (prioritize fast-selling colors)
- [ ] Get pricing per box for cost calculations
- [ ] Document any minimum order requirements

---

### Phase 3: Network Optimization (Week 5-6)
**Goal**: Combine transfer + restock decisions

**Tasks**:
1. ✅ Create `ml_service/business_rules/network_optimizer.py`
   - Calculate network-level metrics
   - Implement decision matrix
   - Combine transfer + restock recommendations
   - Priority scoring

2. ✅ Add endpoint `POST /api/ml/optimize-network`
   - Input: SKU or style number
   - Output: Unified decision list

3. ✅ Create `client/src/components/action-center.tsx`
   - Unified priority list
   - Combines transfers + restocks
   - Color-coded by urgency
   - Expandable details

4. ✅ Add "Action Center" tab
   - Shows all actions (transfer + restock)
   - Sorted by priority
   - "Mark Done" functionality
   - "Snooze" option

**Deliverable**: Single action list combining all recommendations

**Success Criteria**:
- Decision logic works correctly
- Transfer vs restock chosen appropriately
- Priority scoring makes sense
- UI shows unified list

---

### Phase 4: ML Retraining (Week 6-7)
**Goal**: Retrain ML model at SKU level with receiving features

**Tasks**:

**Week 6: Data Prep**
1. ✅ Create SKU-level training data extraction
   - Historical transfers at item_number level
   - Label: success if destination sold items after transfer

2. ✅ Add receiving features
   - Days since last receive
   - Receiving frequency
   - Pattern regularity (CoV)
   - Avg qty per shipment

3. ✅ Feature engineering for SKU-level
   - Size popularity (sales count by size)
   - Color popularity (sales count by color)
   - Size/color velocity differences

**Week 7: Training & Validation**
4. ✅ Train new Random Forest model
   - Use 90 days history
   - SKU-level training examples
   - Validate on holdout set

5. ✅ A/B test comparison
   - Old model (style-level) vs new (SKU-level)
   - Measure accuracy improvement
   - Compare recommendation quality

6. ✅ Deploy new model
   - Save versioned model file
   - Update ML service to load new model
   - Fallback to old model if needed

**Deliverable**: Improved ML model with higher accuracy

**Success Criteria**:
- New model accuracy >75% (vs current ~70%)
- Predictions make business sense
- No performance regression

---

### Phase 5: Configuration UI (Week 8)
**Goal**: Make all parameters adjustable via UI

**Tasks**:
1. ✅ Create settings page
   - Safety days multiplier
   - Velocity thresholds
   - Confidence cutoffs
   - Target days of supply
   - Stockout priority boost

2. ✅ Backend: Store settings in database
   - New table: `ml_optimization_settings`
   - Load on startup
   - API to update

3. ✅ Settings validation
   - Reasonable ranges
   - Help text explaining each parameter

4. ✅ "Reset to Defaults" button

5. ✅ Settings change log
   - Track who changed what and when
   - Show impact of changes

**Deliverable**: User-configurable system

**Success Criteria**:
- All key parameters adjustable
- Changes take effect immediately
- Settings persisted correctly

---

### Phase 6: Export Enhancements (Ongoing)
**Goal**: Comprehensive Excel export

**Tasks**:
1. ✅ Sheet 1: Summary
   - Style-level aggregations
   - Total recommended qty per style
   - Weighted avg confidence

2. ✅ Sheet 2: SKU Details
   - All SKUs with recommendations
   - Size, color, from/to stores
   - Quantities and confidence

3. ✅ Sheet 3: Action List
   - Prioritized to-do list
   - Transfer instructions
   - Restock alerts

4. ✅ Sheet 4: Receiving Analysis
   - Overdue shipments
   - Vendor contact info
   - Expected dates

5. ✅ Formatting
   - Color coding by priority
   - Bold critical items
   - Freeze header rows

**Deliverable**: Professional multi-sheet Excel export

---

### Phase 7: Performance Optimization (Week 8+)
**Goal**: Ensure system performs well at scale

**Tasks**:
1. ✅ Database query optimization
   - Add missing indexes
   - Test materialized view refresh times
   - Optimize JOIN queries

2. ✅ Caching strategy
   - Cache ML predictions for 1 hour
   - Cache receiving patterns for 24 hours
   - Invalidate on data changes

3. ✅ Pagination for large results
   - Limit to top 100 recommendations
   - "Load More" button

4. ✅ Background processing
   - Calculate all SKUs nightly
   - Store in cache table
   - UI shows pre-calculated results

5. ✅ Performance monitoring
   - Log query times
   - Track API response times
   - Alert if >5 seconds

**Deliverable**: Fast, responsive system

---

### Phase 8: Testing & Documentation (Final)
**Goal**: Production-ready system

**Tasks**:
1. ✅ Unit tests
   - Business rules logic
   - Quantity calculations
   - Receiving pattern analysis

2. ✅ Integration tests
   - End-to-end API tests
   - Database query tests

3. ✅ User acceptance testing
   - Test with real data
   - Validate recommendations
   - Confirm Excel exports

4. ✅ Documentation
   - User guide (how to use)
   - Admin guide (configuration)
   - Developer guide (architecture)
   - API documentation

5. ✅ Training materials
   - Video walkthrough
   - FAQ document
   - Troubleshooting guide

**Deliverable**: Production deployment

---

## 🎨 UI/UX Design

### Three-Tab Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Transfer Recommendations  🤖 AI-Powered                    │
│  [ Use AI ◉ On  ○ Off ]                      [Export ⬇️]    │
├─────────────────────────────────────────────────────────────┤
│  │ Action Center (28) │ Transfers (15) │ Restock Alerts (5)│
├─────────────────────────────────────────────────────────────┤
│  CURRENT TAB CONTENT HERE                                   │
└─────────────────────────────────────────────────────────────┘
```

### Tab 1: Action Center (Unified View)

**Purpose**: Single prioritized list of ALL actions

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│  Priority Filter: [🔴 Critical (3)] [🟠 High (12)] [All]   │
│  Action Type: [All] [Transfers Only] [Restocks Only]       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔴 CRITICAL #1                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ SKU 44649 - Medium Hunter G Black                  │   │
│  │ Style: 100-401 (Rebel Minds Track Pants)           │   │
│  │                                                     │   │
│  │ Actions Required:                                  │   │
│  │ 1. 🔄 TRANSFER: 3 units from HM → GM (85% conf)   │   │
│  │    └─ GM out of stock, still selling               │   │
│  │ 2. 📦 RESTOCK: Contact Rebel Minds vendor          │   │
│  │    └─ Shipment 92 days overdue (expected ~45 days)│   │
│  │                                                     │   │
│  │ Network Status: Low (12 days supply)               │   │
│  │                                                     │   │
│  │ [View Details 👁️] [Mark Done ✓] [Snooze 7d ⏰]   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  🟠 HIGH #2                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Style BKT934 - Lucky Charm T-Shirt                 │   │
│  │                                                     │   │
│  │ Action: 🔄 TRANSFER ONLY                           │   │
│  │ Transfer 8 units (3 SKUs) from GM → NM            │   │
│  │                                                     │   │
│  │ Network Status: Healthy (45 days supply)           │   │
│  │ No restock needed at this time                     │   │
│  │                                                     │   │
│  │ [View SKU Breakdown 👁️] [Execute Transfer ▶️]     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Tab 2: Transfer Recommendations (Enhanced)

**Current view + expandable rows**

**Layout**:
```
┌─────────────────────────────────────────────────────────────────────────┐
│  Filters: Store [All ▼] Priority [All ▼] Confidence [>70% ▼]          │
├─────────────────────────────────────────────────────────────────────────┤
│  Style │ Item Name    │ From│ To │ Qty│ Priority│ Conf │ Margin│ 👁️  │
├─────────────────────────────────────────────────────────────────────────┤
│ BKT934 │Lucky Charm T │ GM  │ NM │  8 │ HIGH    │ 85% ●│ 45%   │ 👁️▼ │
│                                                                         │
│  📦 SKU BREAKDOWN (8 units across 3 SKUs)                              │
│  ┌───────────────────────────────────────────────────────────────┐    │
│  │ SKU   │ Size   │ Color       │From Qty│To Qty│Rec│Conf│Reason│    │
│  ├───────────────────────────────────────────────────────────────┤    │
│  │ 43724 │ Medium │ H. Grey     │   2    │  0   │ 2 │88% │TO out│    │
│  │ 39908 │ Medium │ White Denim │   1    │  0   │ 1 │82% │TO out│    │
│  │ 52509 │ Small  │ Pastel Lime │   5    │  1   │ 5 │78% │TO low│    │
│  └───────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  Source Check: ✅ GM velocity (0.2/day) much lower than NM (0.8/day)  │
│  Safety Stock: ✅ Keeping 2 units at GM (7 days supply)               │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│ 100-401│Track Pants   │ HM  │ GM │  3 │ CRITICAL│ 85% ●│ 40%   │ 👁️  │
└─────────────────────────────────────────────────────────────────────────┘
```

**Features**:
- Eye icon in rightmost column
- Click to expand/collapse
- Nested table shows SKU details
- Validation checks displayed (source velocity, safety stock)
- Color coding:
  - 🔴 Red: Critical
  - 🟠 Orange: High
  - 🟡 Yellow: Medium
  - 🟢 Green: Low

### Tab 3: Restock Alerts

**Layout**:
```
┌─────────────────────────────────────────────────────────────────────┐
│  Filter: [Overdue Only ☑️] [Vendor ▼] [Pattern Type ▼]             │
│  Sort by: [Days Overdue ▼]                                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ⚠️  OVERDUE #1: Style 100-401                                     │
│  ┌───────────────────────────────────────────────────────────┐    │
│  │  Style: 100-401 (Rebel Minds Track Pants)                │    │
│  │  Vendor: Rebel Minds                                       │    │
│  │  📞 Contact: [vendor email/phone if available]            │    │
│  │                                                            │    │
│  │  ⏱️ OVERDUE by 47 days!                                   │    │
│  │  ├─ Last shipment: Jul 10, 2025 (92 days ago)            │    │
│  │  ├─ Average between: 45 days                              │    │
│  │  └─ Expected: Aug 24, 2025 (47 days ago)                 │    │
│  │                                                            │    │
│  │  📊 Receiving Pattern: IRREGULAR                          │    │
│  │  ├─ Total shipments: 184 times                            │    │
│  │  ├─ Avg qty/shipment: 120 units                           │    │
│  │  ├─ Variance: ±85 days (high uncertainty!)               │    │
│  │  └─ Confidence: LOW (pattern too irregular)              │    │
│  │                                                            │    │
│  │  📦 Network Status:                                        │    │
│  │  ├─ Total stock: 156 units                                │    │
│  │  ├─ Total velocity: 0.8 units/day                         │    │
│  │  ├─ Days supply: 195 days (OK)                            │    │
│  │  └─ Verdict: Not urgent, but 3 SKUs out of stock         │    │
│  │                                                            │    │
│  │  🔍 SKUs at Risk:                                          │    │
│  │  ├─ SKU 44649: Medium Hunter G Black (0 units, selling!) │    │
│  │  ├─ SKU 34817: Large Black White (0 at GM)               │    │
│  │  └─ SKU 38965: XL Grey Orange (4 total, low)             │    │
│  │                                                            │    │
│  │  💡 Recommendation:                                        │    │
│  │  1. Contact Rebel Minds immediately                       │    │
│  │  2. Expected order: ~120 units (based on history)         │    │
│  │  3. Meanwhile: Transfer from HM to GM for SKU 44649       │    │
│  │                                                            │    │
│  │  [Contact Vendor 📧] [View Shipment History 📊]          │    │
│  │  [Mark Ordered ✓] [Snooze 30d ⏰]                        │    │
│  └───────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
```

### Tooltips & "Why?" Explanations

**Hover on recommended quantity**:
```
┌─────────────────────────────────────────────────┐
│ Why 3 units?                                    │
│                                                 │
│ Calculation:                                    │
│ ✓ Destination: OUT OF STOCK (critical!)        │
│ ✓ Destination velocity: 0.8 units/day          │
│ ✓ Target: 14 days supply = 12 units            │
│ ✓ Source available: 5 units                    │
│ ✓ Source safety stock: 2 units (7 days supply) │
│ ✓ Maximum transferable: 5 - 2 = 3 units        │
│ ✓ ML confidence: 85% (high)                    │
│                                                 │
│ Limiting factor:                                │
│ ⚠️  Source only has 3 units to spare           │
│                                                 │
│ After transfer:                                 │
│ • Source: 2 units (2 days supply) ⚠️           │
│ • Destination: 3 units (3.75 days supply) ⚠️   │
│                                                 │
│ Note: Both stores will need restock soon!      │
└─────────────────────────────────────────────────┘
```

---

## ⚙️ Configuration Parameters

### All Tunable Settings

```python
# config/optimization_rules.py

OPTIMIZATION_CONFIG = {
    # ===== NETWORK THRESHOLDS =====
    "network_critical_days": 7,        # Network < 7 days = CRITICAL
    "network_low_days": 14,            # Network < 14 days = LOW
    "network_target_days": 30,         # Target network supply

    # ===== STORE THRESHOLDS =====
    "store_critical_days": 3,          # Store < 3 days = CRITICAL
    "store_low_days": 7,               # Store < 7 days = LOW
    "store_target_days": 14,           # Target store supply after transfer

    # ===== SAFETY STOCK =====
    "safety_days_multiplier": 1.0,     # Velocity × this = safety stock
    "safety_days_fast_movers": 7,      # For velocity > 1.0/day
    "safety_days_slow_movers": 14,     # For velocity < 0.1/day
    "min_safety_stock_units": 1,       # Absolute minimum (even if velocity=0)

    # ===== TRANSFER RULES =====
    "min_ml_confidence": 0.60,         # Reject if <60%
    "confidence_high_threshold": 0.70, # 70%+ = "High"
    "confidence_medium_threshold": 0.60, # 60-70% = "Medium"

    "min_velocity_difference": 0.3,    # Don't transfer if velocities within this
    "max_transfer_pct_source": 0.5,    # Max 50% of source stock
    "max_units_per_transfer": 20,      # Cap transfers at 20 units

    # ===== RESTOCK RULES =====
    "restock_trigger_days": 14,        # Order when network < 14 days
    "overdue_threshold_multiplier": 1.5, # Flag if >1.5× avg days since last

    # Pattern type thresholds (coefficient of variation)
    "pattern_regular_cv": 0.3,         # CV < 0.3 = REGULAR
    "pattern_semi_regular_cv": 0.7,    # CV < 0.7 = SEMI-REGULAR
    # CV >= 0.7 = IRREGULAR

    # ===== PRIORITY SCORING =====
    "weight_urgency": 0.4,             # Stockout urgency weight
    "weight_ml_confidence": 0.3,       # ML prediction weight
    "weight_margin": 0.2,              # Profit margin weight
    "weight_velocity": 0.1,            # Velocity gap weight

    # Priority boost scores
    "stockout_priority_boost": 1000,   # to_qty = 0
    "low_stock_priority_boost": 500,   # to_qty < 3 days supply
    "has_stock_at_source_boost": 200,  # from_qty > 0

    # ===== UI/UX =====
    "max_recommendations_display": 100, # Limit displayed results
    "max_skus_per_style": 20,          # Limit SKU breakdown
    "default_page_size": 50,           # Pagination

    # ===== PERFORMANCE =====
    "cache_ttl_seconds": 3600,         # 1 hour cache
    "materialized_view_refresh_hour": 2, # Refresh at 2 AM
    "max_query_timeout_seconds": 30,
}
```

**User Questions**:
1. Safety days: Start with 7 days? Adjustable?
2. Velocity difference threshold: 0.3 units/day OK?
3. ML confidence: 60% minimum, 70% for high?
4. Overdue multiplier: Flag if >1.5× average?

---

## ❓ Open Questions & Decisions Needed

### Critical Decisions

#### Q1: Safety Stock Configuration
**Question**: Should safety stock be:
- **Option A**: Fixed 7 days for all items
- **Option B**: Variable (7 days for fast, 14 days for slow)
- **Option C**: User-configurable per store/category

**Recommendation**: Option A (fixed 7) initially, make configurable in Phase 5

**User Input Needed**: Confirm 7 days is appropriate for your business

---

#### Q2: Velocity Difference Threshold
**Question**: How similar is "too similar" for source/destination velocities?

**Options**:
- 0.1 units/day (very strict)
- 0.3 units/day (moderate) ← Recommended
- 0.5 units/day (lenient)

**Example**:
- Source: 0.4/day, Dest: 0.6/day, Diff: 0.2
- With 0.1 threshold: Skip (too similar)
- With 0.3 threshold: Transfer (OK)
- With 0.5 threshold: Transfer (OK)

**User Input Needed**: Confirm 0.3 or provide alternative

---

#### Q3: ML Confidence Cutoffs
**Question**: What confidence levels to show/hide?

**Current proposal**:
- < 60%: Don't show (filtered out)
- 60-70%: Show with "Medium" badge (yellow)
- 70%+: Show with "High" badge (green)

**Alternative**: Lower minimum to 50% but show warnings

**User Input Needed**: Confirm thresholds

---

#### Q4: Receiving Data Quality
**Questions**:
1. Are receiving dates accurate in your database?
2. Do you have order dates (vs just receive dates)?
3. Are there returns/adjustments (negative quantities)?
4. Do you have vendor lead time data?

**Impact**: Affects accuracy of restock predictions

**User Input Needed**: Confirm data quality

---

#### Q5: Implementation Scope
**Question**: Full 8-phase plan or start smaller?

**Options**:
- **Option A**: Phase 1A+1B only (2 weeks)
  - Get working SKU-level transfers
  - Demo and gather feedback
  - Then decide on Phases 2-8

- **Option B**: Phases 1-3 (5 weeks)
  - Include receiving analysis
  - Network optimization
  - More complete system

- **Option C**: Full implementation (8 weeks)
  - Everything including ML retraining

**Recommendation**: Option A (start small, iterate)

**User Input Needed**: Confirm approach

---

#### Q6: Export Format Preferences
**Question**: For Excel export, which sheets do you need?

**Proposed sheets**:
1. Summary (style-level aggregations)
2. SKU Details (all SKUs with sizes/colors)
3. Action List (prioritized to-do list)
4. Receiving Analysis (overdue shipments)

**Alternative**: Single sheet with all data (harder to read)

**User Input Needed**: Confirm sheet structure

---

#### Q7: Performance vs Real-Time
**Question**: Acceptable to cache results for 1 hour?

**Trade-off**:
- **Real-time**: Always current, but 30-60 second load time
- **Cached**: Instant load, but up to 1 hour stale
- **Hybrid**: Cache for 1 hour, manual refresh button

**Recommendation**: Hybrid approach

**User Input Needed**: Confirm acceptable staleness

---

### Data Quality Questions

#### Q8: Receiving Patterns
From database analysis, we found:
- Some vendors ship daily (Jordan Craig: 0.5 days avg)
- Some highly irregular (Ethika: 4.3 days ± high variance)
- Some have returns (negative quantities)

**Questions**:
1. Is daily receiving normal for some vendors?
2. How should we handle negative quantities?
3. Should we exclude certain transaction types?

**User Input Needed**: Explain receiving workflow

---

#### Q9: SKU Out of Stock But Still Selling
Found: SKU 44649 has 0 stock but 2 sales in last 30 days

**Possible explanations**:
1. Data lag (sales recorded before inventory updated)
2. Manual transfers not recorded
3. Direct shipments (vendor to customer)
4. Data error

**Question**: How should we handle this scenario?

**User Input Needed**: Explain business process

---

### UI/UX Questions

#### Q10: Mobile Support
**Question**: Do users need mobile access or desktop only?

**Impact**: Affects UI design (expandable tables don't work well on mobile)

**User Input Needed**: Confirm device usage

---

#### Q11: Notifications
**Question**: Should system send alerts for critical stockouts?

**Options**:
- Email notifications
- In-app notifications
- Slack/Teams integration
- None (just display in UI)

**User Input Needed**: Preferred notification method

---

#### Q12: User Roles
**Question**: Do different users need different views/permissions?

**Examples**:
- Store managers: See only their store
- Buyers: See restock alerts only
- Admins: See everything + settings

**User Input Needed**: Confirm if role-based access needed

---

## 🚨 Risk Assessment

### Technical Risks

#### Risk 1: Performance at Scale
**Risk**: SKU-level analysis could be slow (40,000+ combinations)

**Likelihood**: High
**Impact**: Medium
**Mitigation**:
- Materialized views for common queries
- Caching strategy (1 hour TTL)
- Pagination and limits
- Background processing option

---

#### Risk 2: ML Model Accuracy
**Risk**: SKU-level predictions might be less accurate (less training data per SKU)

**Likelihood**: Medium
**Impact**: High
**Mitigation**:
- Use business rules as primary logic
- ML as enhancement/scoring
- A/B test before full deployment
- Fallback to rule-based if ML fails

---

#### Risk 3: Database Load
**Risk**: Receiving pattern calculations are query-intensive

**Likelihood**: Medium
**Impact**: Medium
**Mitigation**:
- Materialized views (pre-calculated)
- Nightly refresh at 2 AM
- Query timeout limits
- Read replicas if needed

---

### Business Risks

#### Risk 4: Change Management
**Risk**: Users accustomed to current system, may resist SKU-level complexity

**Likelihood**: Medium
**Impact**: Medium
**Mitigation**:
- Phased rollout
- Training materials
- Keep style-level view as default
- SKU breakdown as optional expansion

---

#### Risk 5: Data Quality Issues
**Risk**: Inaccurate receiving dates or inventory counts

**Likelihood**: Unknown (need user input)
**Impact**: High (garbage in, garbage out)
**Mitigation**:
- Data validation on import
- Anomaly detection (flag suspicious patterns)
- Manual review of critical recommendations
- User feedback loop

---

#### Risk 6: Vendor Irregularity
**Risk**: Some vendors have unpredictable shipping (high CoV)

**Likelihood**: High (already observed in data)
**Impact**: Medium
**Mitigation**:
- Show prediction confidence
- Flag irregular patterns clearly
- Don't rely solely on predictions
- Manual override option

---

### Mitigation Strategy Summary

1. **Start small** (Phase 1A+1B) to validate approach
2. **A/B test** new features before full rollout
3. **User feedback** at each phase
4. **Monitoring** for performance issues
5. **Fallbacks** for every ML/automated decision
6. **Training** for users
7. **Documentation** for maintenance

---

## 📈 Success Metrics

### How We'll Measure Success

#### Metric 1: Stockout Reduction
**Baseline**: Current stockout rate (need to measure)
**Target**: 30% reduction in out-of-stock SKUs
**Measurement**: Count of (qty=0 AND velocity>0) before/after

---

#### Metric 2: Transfer Accuracy
**Baseline**: N/A (new system)
**Target**: 75% of transfers result in sales at destination
**Measurement**: Track transferred SKUs, measure if they sold

---

#### Metric 3: User Adoption
**Baseline**: 0% (new feature)
**Target**: 80% of weekly active users use expanded SKU view
**Measurement**: Click tracking on eye icon

---

#### Metric 4: Restock Timeliness
**Baseline**: Average overdue days (need to measure)
**Target**: 50% reduction in overdue shipments
**Measurement**: Track days_overdue before/after alerts

---

#### Metric 5: System Performance
**Baseline**: Current page load time (~2 seconds)
**Target**: <5 seconds for SKU-level analysis
**Measurement**: Server-side timing logs

---

#### Metric 6: ML Model Accuracy
**Baseline**: Current model ~70% accuracy
**Target**: SKU-level model >75% accuracy
**Measurement**: Holdout test set evaluation

---

### KPIs to Track

**Weekly**:
- Critical stockouts detected
- Transfers executed
- Overdue shipments flagged

**Monthly**:
- Overall stockout rate
- Average days of supply (network)
- User engagement (clicks, exports)

**Quarterly**:
- Sales impact (did transfers increase sales?)
- Inventory carrying cost
- ML model performance

---

## 💡 Recommendations Summary

### Must-Have (Phase 1A+1B)
1. ✅ **SKU-level predictions** with size/color
2. ✅ **Velocity-based safety stock** (not fixed 1 unit)
3. ✅ **Source velocity checking** (don't transfer if similar)
4. ✅ **ML confidence filtering** (>60% minimum)
5. ✅ **Expandable UI** (eye icon for SKU breakdown)
6. ✅ **Excel export** with SKU-level details

### Should-Have (Phase 2-3)
7. ✅ **Receiving history analysis** (overdue alerts)
8. ✅ **Network-level optimization** (transfer vs restock decision)
9. ✅ **Unified action center** (single priority list)
10. ✅ **Configurable thresholds** (via settings page)

### Nice-to-Have (Phase 4-8)
11. ⚠️ **ML retraining at SKU level** (higher accuracy)
12. ⚠️ **Vendor contact integration** (email/phone links)
13. ⚠️ **Notifications system** (email alerts)
14. ⚠️ **Role-based access** (different views per user)
15. ⚠️ **Mobile optimization** (responsive design)

### Recommended Approach

**Step 1**: Build Phase 1A+1B (2 weeks)
- Prove SKU-level concept works
- Get user feedback
- Validate business rules

**Step 2**: Review with stakeholders
- Demo working prototype
- Gather requirements for Phase 2-3
- Adjust priorities

**Step 3**: Continue with Phase 2-3 if approved
- Add receiving history
- Network optimization
- More complete system

**Step 4**: Evaluate need for Phase 4-8
- ML retraining only if accuracy insufficient
- Additional features based on user requests

---

## 🎯 Next Steps

### Immediate Actions Required

1. **User Input Needed** (This Document)
   - [ ] Review entire plan
   - [ ] Answer all questions in "Open Questions" section
   - [ ] Confirm configuration values
   - [ ] Approve Phase 1A+1B to begin

2. **Setup Development Environment**
   - [ ] Create feature branch
   - [ ] Set up Python virtual environment
   - [ ] Install ML dependencies
   - [ ] Configure database access

3. **Begin Phase 1A** (Week 1)
   - [ ] Create business rules module
   - [ ] Implement velocity × safety_days
   - [ ] Update data extraction (remove GROUP BY)
   - [ ] Test with sample data

4. **Timeline Confirmation**
   - [ ] Confirm 2-week timeline for Phase 1A+1B
   - [ ] Schedule demo/review meeting
   - [ ] Plan for Phase 2+ (if approved)

---

## 📞 Contact & Questions

**For questions about this plan**:
- Technical architecture: [Claude/Developer]
- Business requirements: [User/Product Owner]
- Timeline/resources: [Project Manager]

**Document Updates**:
- Version: 1.0
- Last Updated: October 10, 2025
- Next Review: After Phase 1A+1B completion

---

## 📚 Appendix

### A. Example Scenarios

**Scenario 1: Simple Transfer**
```
SKU: 12345 (Medium Blue T-Shirt)
From: GM (10 units, 0.5/day velocity)
To: NM (0 units, 1.2/day velocity)
ML: 88% confidence

Calculation:
- Target: 14 days × 1.2/day = 17 units needed
- Safety at GM: 7 days × 0.5/day = 4 units
- Available: 10 - 4 = 6 units
- Recommend: 6 units (limited by source)

After transfer:
- GM: 4 units (8 days supply) ✅
- NM: 6 units (5 days supply) ⚠️ Still needs restock
```

**Scenario 2: Transfer + Restock**
```
Style: 100-401 (Track Pants - 182 SKUs)
Network: 156 units, 0.8/day = 195 days ✅
Problem: 3 SKUs out of stock at specific stores

Decision:
1. Transfer in-stock SKUs between stores (immediate)
2. Alert vendor Rebel Minds (long-term)

Rationale:
- Network healthy (195 days)
- Store imbalance issue
- Vendor overdue (contact anyway)
```

**Scenario 3: Restock Only**
```
Style: XYZ789
Network: 8 units, 2.0/day = 4 days ⚠️
All stores low equally

Decision:
- DON'T transfer (all stores need inventory)
- RESTOCK urgently from vendor

Rationale:
- Transferring won't help (all low)
- Network-wide shortage
- Priority restock
```

---

### B. SQL Queries Reference

**Get SKU velocity by store**:
```sql
SELECT
  il.item_number,
  il.style_number,
  il.size,
  il.attribute,
  st.store,
  il.gm_qty,  -- Adjust per store
  COUNT(st.id) FILTER (WHERE st.date >= CURRENT_DATE - 30) as sales_30d,
  COUNT(st.id)::numeric FILTER (WHERE st.date >= CURRENT_DATE - 30) / 30.0 as velocity
FROM item_list il
LEFT JOIN sales_transactions st ON st.sku = il.item_number
WHERE il.style_number IS NOT NULL
GROUP BY il.item_number, il.style_number, il.size, il.attribute, st.store, il.gm_qty
```

**Get receiving pattern for style**:
```sql
WITH shipments AS (
  SELECT
    v.date::date,
    SUM(rl.qty) as qty,
    v.date::date - LAG(v.date::date) OVER (ORDER BY v.date) as days_between
  FROM receiving_vouchers v
  JOIN receiving_lines rl ON rl.voucher_id = v.id
  JOIN item_list il ON rl.item_number = il.item_number
  WHERE il.style_number = '100-401'
  GROUP BY v.date
)
SELECT
  AVG(days_between) as avg_days,
  STDDEV(days_between) as stddev_days,
  MAX(date) as last_shipment,
  CURRENT_DATE - MAX(date) as days_since
FROM shipments
WHERE days_between IS NOT NULL;
```

---

### C. Glossary

**Terms Used in This Document**:

- **SKU**: Stock Keeping Unit (individual item with specific size/color)
- **Style Number**: Group of related SKUs (same design, different sizes/colors)
- **Velocity**: Daily sales rate (units sold per day)
- **Days of Supply**: Stock quantity ÷ velocity (how long until stockout)
- **Safety Stock**: Minimum inventory to keep as buffer
- **CoV**: Coefficient of Variation (stddev/mean, measures irregularity)
- **ML Confidence**: Probability that transfer will succeed (0-100%)
- **Network**: All stores combined
- **Imbalance**: Some stores have excess, others have shortage

---

### D. References

**Internal Documents**:
- Original CLAUDE.md project documentation
- Database schema: `/shared/schema.ts`
- Current ML code: `/ml_service/`

**External Resources**:
- Random Forest: scikit-learn documentation
- Pandas: Data manipulation library
- FastAPI: Python web framework
- React Query: TanStack documentation

---

**END OF MASTER PLAN**

---

*This document is a living plan. It will be updated as decisions are made and implementation progresses.*

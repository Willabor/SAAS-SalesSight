# Vendor Prepack System - Critical System Component
## 70% of Inventory Comes Prepacked - Complete Analysis

**Generated**: October 10, 2025
**Priority**: CRITICAL - Changes entire restock strategy
**Status**: Newly discovered requirement

---

## 🚨 CRITICAL DISCOVERY

**You cannot order individual SKUs from most vendors!**

- **70% of products** arrive in vendor-defined prepack boxes
- **Each vendor** has their own prepack configurations
- **Cannot customize** - must order full boxes as vendor specifies
- **This fundamentally changes** how we calculate restock recommendations

---

## 📦 Prepack System Explained

### What is a Prepack?

**Prepack** = Pre-assembled box with **fixed size assortment** from vendor

**🎨 CRITICAL: Prepacks Are COLOR-SPECIFIC!**

Each box contains **ONE COLOR** in assorted sizes:
- ✅ Pack A (Black) = 12 BLACK pieces in sizes 30W-38W
- ✅ Pack A (Olive) = 12 OLIVE pieces in sizes 30W-38W
- ❌ NOT: One box with mixed colors

**Example: Argonaut Nations Style 8501B**

Instead of ordering:
- ❌ "I need 5 units of Black 34W×32L and 3 units of Olive 38W×32L"

You must order:
- ✅ "I need 1 box of Pack A (Black) + 1 box of Pack A (Olive)"
- This gives you 12 Black pieces + 12 Olive pieces in vendor-defined size assortments

### Why Vendors Use Prepacks

1. **Efficiency** - Faster to pack standard assortments
2. **Inventory balance** - Vendors push all sizes, not just popular ones
3. **Minimum order** - Easier to enforce minimums (by box vs by piece)
4. **Reduces SKU complexity** - Pack inventory, not individual sizes

---

## 🏢 Vendor Types

### Type 1: Prepack Only (70% of vendors)
- **Example**: Argonaut Nations, Jordan Craig, Rebel Minds
- **Order by**: Box (Pack A, Pack B, etc.)
- **Cannot**: Order individual sizes
- **Receive**: Fixed assortment per box

### Type 2: Open Stock (30% of vendors)
- **Example**: (Need to identify)
- **Order by**: Individual SKU/size
- **Can**: Order exact quantities needed
- **Receive**: Exactly what you ordered

### Type 3: Hybrid (Some vendors)
- **Offer both**: Prepacks AND open stock
- **Prepack**: Usually cheaper per unit
- **Open stock**: Usually higher per-unit cost, minimum qty requirements
- **Strategy**: Order prepacks for bulk, open stock for fill-ins

---

## 📊 Argonaut Nations Prepack Configurations

**⚠️ IMPORTANT**: These size distributions apply **PER COLOR**. You order specific [Pack + Color] combinations!

### Pack A Configuration (Any Color)

**Total per box**: 12 pieces **of ONE color**

#### Inseam 32"
| Size | Quantity | % of Box |
|------|----------|----------|
| 30W | 3 pcs | 25% |
| 32W | 2 pcs | 17% |
| 34W | 2 pcs | 17% |
| 36W | 1 pc | 8% |
| 38W | 1 pc | 8% |
| **Subtotal** | **9 pcs** | **75%** |

#### Inseam 34"
| Size | Quantity | % of Box |
|------|----------|----------|
| 32W | 1 pc | 8% |
| 34W | 1 pc | 8% |
| 36W | 1 pc | 8% |
| **Subtotal** | **3 pcs** | **25%** |

**Characteristics**:
- Focus on smaller sizes (30W-38W)
- Heavy on 30W (3 pieces - 25% of box!)
- 75% inseam 32", 25% inseam 34"
- Good for: Colors where smaller sizes are selling well

**Example Orders**:
- 5 boxes of Pack A (Black)
- 2 boxes of Pack A (Olive)
- 1 box of Pack A (Navy)

---

### Pack B Configuration (Any Color)

**Total per box**: 12 pieces **of ONE color**

#### Inseam 32"
| Size | Quantity | % of Box |
|------|----------|----------|
| 32W | 1 pc | 8% |
| 34W | 1 pc | 8% |
| 36W | 1 pc | 8% |
| 38W | 1 pc | 8% |
| 40W | 2 pcs | 17% |
| 42W | 2 pcs | 17% |
| 44W | 1 pc | 8% |
| **Subtotal** | **9 pcs** | **75%** |

#### Inseam 34"
| Size | Quantity | % of Box |
|------|----------|----------|
| 34W | 1 pc | 8% |
| 36W | 1 pc | 8% |
| 38W | 1 pc | 8% |
| **Subtotal** | **3 pcs** | **25%** |

**Characteristics**:
- Focus on larger sizes (32W-44W)
- Heavy on 40W and 42W (2 pieces each)
- 75% inseam 32", 25% inseam 34"
- Good for: Colors where larger sizes are selling well (rare for 8501B)

---

## 🎯 Impact on System Design

### What Changes

#### 1. Restock Recommendations (MAJOR CHANGE)

**Before** (assumed open stock):
```
Style 8501B needs restock
Recommend: Order 120 units from Argonaut Nations
```

**After** (prepack-aware):
```
Style 8501B needs restock

Low Stock SKUs:
- 38W×32L: Need 8 units
- 34W×32L: Need 5 units
- 30W×32L: Need 3 units
- 40W×32L: Need 2 units

Prepack Analysis:
Option 1: Order 8 boxes Pack A
  ✓ Gets 24× 30W (covers need + 21 extra)
  ✓ Gets 16× 34W (covers need + 11 extra)
  ✓ Gets 8× 38W (exactly covers need!)
  ✗ Gets 0× 40W (doesn't cover need)
  Cost: 96 pieces total

Option 2: Order 5 boxes Pack B
  ✗ Gets 0× 30W (doesn't cover need)
  ✓ Gets 5× 34W (exactly covers need!)
  ✓ Gets 5× 38W (short by 3)
  ✓ Gets 10× 40W (covers need + 8 extra)
  Cost: 60 pieces total

Option 3: Mix - 3 boxes Pack A + 3 boxes Pack B
  ✓ Gets 9× 30W (covers + 6 extra)
  ✓ Gets 9× 34W (covers + 4 extra)
  ✓ Gets 6× 38W (short by 2, but close)
  ✓ Gets 6× 40W (covers + 4 extra)
  Cost: 72 pieces total

RECOMMENDATION: Option 3 (Mixed)
Reason: Best coverage with least waste
```

This is a **bin packing optimization problem**!

#### 2. Transfer Logic (NO CHANGE)

✅ **Transfers still work the same!**

Reason: Transfers are **between stores**, moving existing inventory
- Can still move individual SKUs (not buying from vendor)
- Store has 2 units of size 38W? Can transfer 1 to another store
- Prepack only affects **ordering from vendor**, not **internal transfers**

#### 3. Receiving History Analysis (ENHANCED)

Now we can understand WHY we saw irregular patterns:

**Previous confusion**:
```
Why did Argonaut Nations ship 288 units on Dec 9?
Then 24 units on Aug 7?
Pattern seems random!
```

**With prepack knowledge**:
```
Dec 9: 288 units = 24 boxes of 12 pieces (probably mixed Pack A/B)
Aug 7: 24 units = 2 boxes of 12 pieces
Pattern makes sense - ordering by the box!
```

We can now **reverse engineer** which packs were ordered historically:
- 288 units ÷ 12 = 24 boxes
- 96 units ÷ 12 = 8 boxes
- 24 units ÷ 12 = 2 boxes

---

## 🏭 CRITICAL: Warehouse Distribution Workflow

### 🚨 IMPORTANT CLARIFICATION - This Changes Everything!

**We DO NOT ship prepacked boxes directly to stores!**

### The Two-Step Process:

```
┌─────────────────────────────────────────────────────────────┐
│                    STEP 1: Vendor → Warehouse                │
│                                                              │
│  Order from Vendor: "5 boxes of Pack A"                     │
│  Ships to: WAREHOUSE/HQ (NOT individual stores)            │
│  Received: 5 boxes × 12 pieces = 60 units prepacked        │
│                                                              │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                   STEP 2: Unpack & Distribute               │
│                                                              │
│  At Warehouse:                                               │
│  1. UNPACK all 5 boxes                                      │
│  2. Sort by size/SKU                                        │
│  3. Manually distribute to stores based on their needs      │
│                                                              │
│  Distribution Example:                                       │
│    Pack A × 5 boxes received:                               │
│      15× 30W, 10× 32W, 10× 34W, 5× 36W, 5× 38W, ...       │
│                                                              │
│    Distribute to stores:                                     │
│      → NM: 8× 30W, 3× 34W, 2× 38W (only what they need)   │
│      → GM: 5× 30W, 4× 32W, 2× 36W (only what they need)   │
│      → LM: 2× 30W, 3× 32W, 5× 34W (only what they need)   │
│      → HM: Skip 30W, 3× 32W, 2× 34W, 3× 36W, 3× 38W       │
│                                                              │
│  Result: Each store gets EXACTLY what it needs!            │
│          ZERO waste from mismatched sizes!                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Why This Matters for Optimization

#### ❌ Previous (Wrong) Assumption:

"Box ships directly to one store, creating store-level waste"

**Problem**:
```
If we send Pack A to NM:
  NM gets: 3× 30W, 2× 32W, 2× 34W, 1× 36W, 1× 38W
  But NM only needs: 38W
  Result: 11 units of waste stuck at NM
  Waste %: 92% waste!
```

#### ✅ Actual Process (Correct):

"Box ships to warehouse, unpacked, distributed by need"

**Solution**:
```
Order Pack A to warehouse:
  Receive: 3× 30W, 2× 32W, 2× 34W, 1× 36W, 1× 38W

  Distribute:
    - 1× 38W → NM (they needed this)
    - 3× 30W → GM (they needed this)
    - 2× 32W → HM (they needed this)
    - 2× 34W → LM (they needed this)
    - 1× 36W → NM (they needed this)

  Result: 0 units waste!
  Waste %: 0% waste!
```

### Optimization Strategy Changes

#### Network-Level Thinking (Not Store-Level):

**Question**: Which pack covers our **network-wide** needs best?

**NOT**: Which pack matches one specific store's needs?

**Example with 8501B (COLOR-AWARE)**:

```
⚠️ CORRECTED: Must analyze BY COLOR first!

Network Needs (across all 4 stores):
  Black (80% of sales - PRIORITY):
    30W×32L: Need 12 units
    34W×32L: Need 16 units
    36W×32L: Need 10 units
    38W×32L: Need 10 units
    40W-44W: Don't need (overstocked)

  Olive (10% of sales):
    30W×32L: Need 2 units
    34W×32L: Need 3 units
    36W×32L: Need 1 unit

  Navy (2% of sales):
    30W×32L: Need 1 unit
    32W×32L: Need 1 unit

Pack A provides (per box of ONE color):
  3× 30W, 2× 32W, 2× 34W, 1× 36W, 1× 38W, ...

Order 5 boxes Pack A (Black) + 1 box Pack A (Olive):
  Receive Black: 15× 30W, 10× 32W, 10× 34W, 5× 36W, 5× 38W
  Receive Olive: 3× 30W, 2× 32W, 2× 34W, 1× 36W, 1× 38W

Coverage by Color:
  Black:
    ✅ 30W: Need 12, get 15 (25% excess for future)
    ✅ 34W: Need 16, get 10 (62% covered - need more)
    ✅ 36W: Need 10, get 5 (50% covered)
    ✅ 38W: Need 10, get 5 (50% covered)

  Olive:
    ✅ 30W: Need 2, get 3 (50% excess)
    ✅ 34W: Need 3, get 2 (67% covered)
    ✅ 36W: Need 1, get 1 (100% covered!)

Waste Analysis:
  Colors we don't need: 0 (only ordered Black + Olive)
  Sizes within colors we don't need: Minimal
  Network-level waste: <5%

Result: Excellent targeting by ordering right colors!

Avoid:
  - Pack B for any color (40W-44W are overstocked)
  - Wheat/White colors (very slow sellers - skip entirely)
```

### Distribution Decision Logic

After ordering prepacks to warehouse, system should recommend distribution:

```
Prepack received: 5 boxes Pack A (Black) + 1 box Pack A (Olive) = 72 pieces

Distribution Plan (BY COLOR):
┌────────────────────────────────────────────────────────┐
│ Store NM (highest velocity, had stockouts):           │
│   Black 30W×32L: 6 units                              │
│   Black 34W×32L: 5 units                              │
│   Black 38W×32L: 3 units                              │
│   Olive 30W×32L: 1 unit                               │
│   Olive 34W×32L: 1 unit                               │
│   Total to NM: 16 units                               │
├────────────────────────────────────────────────────────┤
│ Store GM (moderate velocity):                         │
│   Black 30W×32L: 4 units                              │
│   Black 32W×32L: 4 units                              │
│   Black 36W×32L: 2 units                              │
│   Olive 32W×32L: 1 unit                               │
│   Total to GM: 11 units                               │
├────────────────────────────────────────────────────────┤
│ Store HM (moderate velocity):                         │
│   Black 32W×32L: 4 units                              │
│   Black 34W×32L: 3 units                              │
│   Black 38W×32L: 2 units                              │
│   Olive 34W×32L: 1 unit                               │
│   Olive 36W×32L: 1 unit                               │
│   Total to HM: 11 units                               │
├────────────────────────────────────────────────────────┤
│ Store LM (low velocity, skip most sizes):             │
│   Black 34W×32L: 2 units                              │
│   Olive 30W×32L: 1 unit                               │
│   Total to LM: 3 units                                │
├────────────────────────────────────────────────────────┤
│ Warehouse Reserve (for future distribution):          │
│   Black: 15 units (various sizes for future needs)    │
│   Olive: 3 units (reserve for future)                 │
│   Total Reserve: 18 units                              │
│   Purpose: Future transfers as stores sell out        │
└────────────────────────────────────────────────────────┘

Total Distributed: 41 units (57%)
Warehouse Reserve: 18 units (25%)
Inseam 34" (separate distribution): 13 units (18%)
Total: 72 pieces

✅ Each store gets correct COLORS and SIZES
✅ No color mismatches (Black stores don't get Olive they don't need)
✅ Waste: 0% network-level
```

### Key Insights for System Design

1. **COLOR-FIRST Optimization** ⚠️ **CRITICAL**:
   - Prepacks are color-specific (one color per box)
   - Must analyze needs BY COLOR first, then by size
   - Order specific [Pack + Color] combinations
   - Example: "5 boxes Pack A (Black) + 2 boxes Pack A (Olive)"

2. **Network-Level Thinking (Per Color)**:
   - Match prepack contents to network-wide needs FOR EACH COLOR
   - Don't worry about matching one store perfectly
   - Prioritize colors that sell well (Black >> others for 8501B)

3. **Warehouse as Buffer**:
   - Excess from prepacks can be stored at warehouse
   - Distributed to stores over time as needed
   - Acts as a "prepack cache" for fast transfers
   - Can mix colors when distributing to stores

4. **Two-Phase Distribution**:
   - Phase 1: Initial distribution to stores (60-70% of box)
   - Phase 2: Warehouse reserves for future transfers (30-40%)

5. **Waste Redefined**:
   - Store-level "waste" = irrelevant (we unpack at warehouse)
   - Color-level "waste" = only waste is colors NO stores want
   - Size-level "waste" = only waste is sizes NO stores need within a color
   - Example: Avoid ordering Wheat color if it doesn't sell at all

6. **Algorithm Complexity**:
   - More complex than size-only (must loop through colors)
   - But still simpler than store-direct matching
   - For each color: determine Pack A vs B, calculate quantity

### Updated Algorithm Approach (COLOR-AWARE!)

```python
def optimize_prepack_order_color_aware(network_needs_by_color, available_packs):
    """
    Optimize prepack selection for warehouse distribution.

    ⚠️ CRITICAL: Must optimize PER COLOR!

    Key differences:
    - Prepacks are color-specific (one color per box)
    - We unpack at warehouse and distribute by color+size
    - "Waste" only counts colors NO store wants + sizes within colors

    Args:
        network_needs_by_color: Dict of {
            'Black': {size: qty_needed},
            'Olive': {size: qty_needed},
            ...
        }
        available_packs: List of pack configurations (Pack A, Pack B)

    Returns:
        Recommended order: {color: {pack: quantity}}
    """

    recommendations = {}

    # Step 1: For EACH COLOR, determine best pack and quantity
    for color, size_needs in network_needs_by_color.items():

        # Skip colors with very low demand
        total_need = sum(size_needs.values())
        if total_need < 5:
            recommendations[color] = {'pack': 'Skip', 'boxes': 0}
            continue

        # Step 2: Try Pack A vs Pack B for this color
        pack_a_score = evaluate_pack_for_color(size_needs, 'Pack A')
        pack_b_score = evaluate_pack_for_color(size_needs, 'Pack B')

        # Choose best pack
        best_pack = 'Pack A' if pack_a_score > pack_b_score else 'Pack B'

        # Step 3: Calculate how many boxes of this [color+pack]
        boxes_needed = calculate_boxes_for_color(size_needs, best_pack)

        recommendations[color] = {
            'pack': best_pack,
            'boxes': boxes_needed,
            'reason': f'Coverage: {pack_a_score:.0%}' if best_pack == 'Pack A' else f'Coverage: {pack_b_score:.0%}'
        }

    return recommendations

def evaluate_pack_for_color(size_needs, pack_config):
    """
    Score how well a pack configuration matches size needs for ONE color.

    Args:
        size_needs: {'30W×32L': 12, '34W×32L': 16, ...}
        pack_config: Pack A or Pack B contents

    Returns:
        Score (0-1): higher is better match
    """
    coverage = 0
    waste = 0

    for size, qty_per_box in pack_config.items():
        need = size_needs.get(size, 0)
        if need > 0:
            coverage += min(qty_per_box, need)  # Useful pieces
        else:
            waste += qty_per_box  # Unwanted sizes within this color

    total = sum(pack_config.values())
    return (coverage - waste * 0.5) / total  # Penalize waste
```

### Example: Store-Direct vs Warehouse Distribution

**Scenario**: Need 12× 38W total across network

**❌ Store-Direct Approach** (old thinking):
```
Pack A has 1× 38W per box
Order 12 boxes to get 12× 38W (meet need)
But also receive: 36× 30W, 24× 32W, 24× 34W, ... (168 total pieces)
If all goes to one store:
  Store gets: 12× 38W (needed) + 156 other pieces (excess)
  Store-level waste: 156/168 = 93% waste!
```

**✅ Warehouse Distribution** (correct):
```
Pack A has 1× 38W per box
Order 12 boxes to warehouse
Receive: 12× 38W + 36× 30W + 24× 32W + 24× 34W + ... (168 pieces)

Distribute:
  38W → Send 3 to NM, 4 to GM, 3 to HM, 2 to LM (all 12 used)
  30W → Send 10 to NM, 8 to GM, ... (all 36 distributed over time)
  32W → Send to stores that need it
  34W → Send to stores that need it
  ...

Network-level waste: Only sizes NO store needs = 0-5%!
```

### System Requirements Updated

**Data Model Changes**:
- Store location field: Add "WAREHOUSE" or "HQ" as a pseudo-store
- Receiving location: Track where prepack boxes are received
- Distribution tracking: Log which SKUs distributed from unpacked boxes

**UI Changes**:
- Show prepack recommendation: "Order to WAREHOUSE"
- Show distribution plan: Which stores get which SKUs
- Show warehouse reserves: SKUs held for future distribution

**Business Logic**:
- Match prepacks to NETWORK needs (not individual store)
- Calculate distribution plan based on each store's urgency
- Reserve 30-40% at warehouse for future flexibility

---

## 🗄️ Database Schema Additions

### New Tables Needed

#### 1. `vendors` table (if doesn't exist)
```sql
CREATE TABLE vendors (
  id SERIAL PRIMARY KEY,
  vendor_name VARCHAR(255) UNIQUE NOT NULL,
  ships_prepack BOOLEAN DEFAULT FALSE,
  ships_open_stock BOOLEAN DEFAULT FALSE,
  default_payment_terms VARCHAR(50),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. `vendor_prepacks` table
```sql
CREATE TABLE vendor_prepacks (
  id SERIAL PRIMARY KEY,
  vendor_id INTEGER REFERENCES vendors(id),
  style_number VARCHAR(100),  -- Which style this prepack is for
  prepack_name VARCHAR(50),   -- "Pack A", "Pack B", etc.
  total_pieces INTEGER,       -- 12 for Argonaut Nations
  cost_per_box DECIMAL(10,2), -- Optional: wholesale cost
  active BOOLEAN DEFAULT TRUE,
  effective_date DATE,        -- When this prepack started
  discontinued_date DATE,     -- When it was discontinued (if applicable)
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(vendor_id, style_number, prepack_name)
);
```

#### 3. `vendor_prepack_contents` table
```sql
CREATE TABLE vendor_prepack_contents (
  id SERIAL PRIMARY KEY,
  prepack_id INTEGER REFERENCES vendor_prepacks(id) ON DELETE CASCADE,
  size VARCHAR(50),           -- "30W", "32W", etc.
  inseam VARCHAR(50),         -- "32L", "34L", etc. (or use attribute)
  color VARCHAR(100),         -- If prepacks are color-specific
  quantity_per_box INTEGER,   -- How many of this size per box

  UNIQUE(prepack_id, size, inseam, color)
);
```

#### 4. `receiving_prepack_log` table (optional - for tracking)
```sql
CREATE TABLE receiving_prepack_log (
  id SERIAL PRIMARY KEY,
  voucher_id INTEGER REFERENCES receiving_vouchers(id),
  prepack_id INTEGER REFERENCES vendor_prepacks(id),
  boxes_received INTEGER,     -- How many boxes of this pack
  total_pieces INTEGER,       -- Calculated: boxes × pieces_per_box
  received_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Example Data

```sql
-- Insert vendor
INSERT INTO vendors (vendor_name, ships_prepack, ships_open_stock)
VALUES ('Argonaut Nations', TRUE, FALSE);

-- Insert Pack A
INSERT INTO vendor_prepacks (vendor_id, style_number, prepack_name, total_pieces)
VALUES (1, '8501B', 'Pack A', 12);

-- Insert Pack A contents (inseam 32")
INSERT INTO vendor_prepack_contents (prepack_id, size, inseam, quantity_per_box)
VALUES
  (1, '30W', '32L', 3),
  (1, '32W', '32L', 2),
  (1, '34W', '32L', 2),
  (1, '36W', '32L', 1),
  (1, '38W', '32L', 1),
  -- inseam 34"
  (1, '32W', '34L', 1),
  (1, '34W', '34L', 1),
  (1, '36W', '34L', 1);

-- Insert Pack B
INSERT INTO vendor_prepacks (vendor_id, style_number, prepack_name, total_pieces)
VALUES (1, '8501B', 'Pack B', 12);

-- Insert Pack B contents (inseam 32")
INSERT INTO vendor_prepack_contents (prepack_id, size, inseam, quantity_per_box)
VALUES
  (2, '32W', '32L', 1),
  (2, '34W', '32L', 1),
  (2, '36W', '32L', 1),
  (2, '38W', '32L', 1),
  (2, '40W', '32L', 2),
  (2, '42W', '32L', 2),
  (2, '44W', '32L', 1),
  -- inseam 34"
  (2, '34W', '34L', 1),
  (2, '36W', '34L', 1),
  (2, '38W', '34L', 1);
```

---

## 🧮 Prepack Optimization Algorithm

### The Problem

**Given**:
- List of SKUs needing restock (with quantities)
- Available prepacks (Pack A, Pack B, etc.)
- Cost per prepack box

**Find**:
- Optimal combination of prepack boxes to order
- Minimize: Waste (excess inventory)
- Maximize: Coverage (meeting needs)
- Constraint: Must order whole boxes

**This is a variant of the Bin Packing Problem** (NP-hard!)

### Algorithm Approach

```python
def optimize_prepack_order(needs, available_packs, max_waste_tolerance=0.3):
    """
    Find optimal prepack box quantities to order.

    Args:
        needs: Dict of {sku: quantity_needed}
        available_packs: List of prepack configurations
        max_waste_tolerance: Maximum acceptable waste (30% = 0.3)

    Returns:
        Recommended order with reasoning
    """

    best_solution = None
    best_score = float('-inf')

    # Try different combinations (brute force for small problems)
    # For larger problems, use integer linear programming

    for pack_a_boxes in range(0, 20):  # Try 0-20 boxes of Pack A
        for pack_b_boxes in range(0, 20):  # Try 0-20 boxes of Pack B

            # Calculate what we'd receive
            received = calculate_received(pack_a_boxes, pack_b_boxes, available_packs)

            # Score this combination
            coverage = calculate_coverage(received, needs)
            waste = calculate_waste(received, needs)
            cost = pack_a_boxes + pack_b_boxes  # Total boxes

            # Scoring function
            if coverage >= 0.9 and waste <= max_waste_tolerance:
                score = coverage * 100 - waste * 50 - cost * 1

                if score > best_score:
                    best_score = score
                    best_solution = {
                        'pack_a_boxes': pack_a_boxes,
                        'pack_b_boxes': pack_b_boxes,
                        'received': received,
                        'coverage': coverage,
                        'waste': waste,
                        'total_boxes': cost
                    }

    return best_solution

def calculate_coverage(received, needs):
    """Calculate what % of needs are met."""
    met_needs = sum(min(received.get(sku, 0), qty) for sku, qty in needs.items())
    total_needs = sum(needs.values())
    return met_needs / total_needs if total_needs > 0 else 0

def calculate_waste(received, needs):
    """Calculate excess inventory as % of total received."""
    excess = sum(max(0, received.get(sku, 0) - needs.get(sku, 0))
                 for sku in received.keys())
    total_received = sum(received.values())
    return excess / total_received if total_received > 0 else 0
```

### Example Calculation

**Input**:
```
Needs:
  30W×32L: 3 units
  34W×32L: 5 units
  38W×32L: 8 units
  40W×32L: 2 units

Available:
  Pack A: [3×30W, 2×34W, 1×38W, ...] × boxes ordered
  Pack B: [1×34W, 1×38W, 2×40W, ...] × boxes ordered
```

**Algorithm tries**:
```
Option 1: 3 boxes Pack A + 3 boxes Pack B
  Received:
    30W×32L: 9 (need 3, waste 6)
    34W×32L: 9 (need 5, waste 4)
    38W×32L: 6 (need 8, SHORT 2)
    40W×32L: 6 (need 2, waste 4)
  Coverage: 92% (missing 2 of 38W)
  Waste: 19% (14 excess / 72 total)
  Score: 92 - 9.5 - 6 = 76.5

Option 2: 2 boxes Pack A + 4 boxes Pack B
  [... similar analysis ...]
```

**Best option selected** based on score.

---

## 🔄 Updated System Flow

### Restock Decision Flow (New)

```
1. Detect Low Inventory
   ↓
2. Check Vendor Type
   ├─ Open Stock → Calculate exact quantities needed
   └─ Prepack → Find optimal pack combination
   ↓
3. Prepack Optimization (if prepack vendor)
   ├─ Get all low-stock SKUs for this style
   ├─ Get vendor's available prepacks
   ├─ Run optimization algorithm
   ├─ Find best pack combination
   └─ Calculate waste and coverage
   ↓
4. Generate Recommendation
   ├─ Prepack: "Order X boxes of Pack A + Y boxes of Pack B"
   └─ Open Stock: "Order these specific SKUs: ..."
   ↓
5. Show Impact Analysis
   ├─ What SKUs will be restocked
   ├─ What excess inventory created
   ├─ Total cost
   └─ Expected coverage
```

---

## 📋 Updated 8501B Test Case

### Original Recommendation (Incorrect)
```
❌ "Order from Argonaut Nations - shipment overdue"
(Didn't specify how much or which pack)
```

### Corrected Recommendation (Prepack-Aware)

**Scenario**: After executing transfers, network still healthy, but some sizes low

**Analysis**:
```
Current Network: 432 units (182 days supply) ✅ HEALTHY
Vendor: Argonaut Nations (prepack only - Pack A & Pack B)

Low Stock SKUs:
  30W×32L: 3 units total (below target)
  38W×32L: 6 units total (below target)
  40W×32L: 10 units total (OK)
  42W×32L: 22 units total (OK)

Prepack Analysis:
  Current status: NOT URGENT (182 days supply)

  When to reorder: Network drops below 60 days supply

  Recommended prepack: 5 boxes Pack A
  Rationale:
    - Pack A heavy on 30W (3 per box × 5 = 15 units)
    - Pack A has 38W (1 per box × 5 = 5 units)
    - Total: 60 pieces (5 boxes × 12)
    - Cost-effective for this size profile

  Avoid: Pack B (focuses on larger sizes not needed)
```

---

## 🚨 Critical Questions for User

### About Prepack System

1. **Which vendors use prepacks?**
   - Can you provide list of top 10 vendors and their type (prepack/open/hybrid)?

2. **Prepack configurations**
   - Do you have documentation for other vendor prepacks?
   - Are prepacks color-specific, or all colors in same size assortment?

3. **Ordering rules**
   - Can you mix Pack A and Pack B in one order?
   - Is there a minimum order (e.g., must order at least 3 boxes)?
   - Can you split boxes between stores, or ship whole boxes to specific stores?

4. **Historical data**
   - When you receive shipment, is prepack type recorded?
   - Can we reverse-engineer past orders to see Pack A vs Pack B usage?

5. **Cost differences**
   - Does Pack A cost same as Pack B?
   - Is there volume discount (e.g., 10+ boxes)?

### About 8501B Specifically

6. **Current prepack usage**
   - Which pack (A or B) do you typically order for 8501B?
   - Do you order both packs, or stick to one?
   - Which colors do you order most frequently?

7. **Store preferences**
   - Do certain stores sell different colors better?
   - Example: Does NM sell more Black while GM sells more Olive?

8. **✅ Color variations - ANSWERED!**
   - ✅ **CONFIRMED**: Prepacks are COLOR-SPECIFIC!
   - Each box = ONE color in assorted sizes
   - Pack A (Black) = 12 Black pieces in sizes 30W-38W
   - Pack A (Olive) = 12 Olive pieces in sizes 30W-38W
   - Must order by specifying BOTH pack type AND color

9. **Color performance data**
   - Can you provide sales breakdown by color for 8501B?
   - Which colors are fast sellers? (Black appears to be ~80%)
   - Which colors should we avoid ordering?

---

## 💡 Strategic Insights

### Why This Matters

1. **Restock recommendations were incomplete** without prepack knowledge
   - We were saying "order from vendor" but not HOW MUCH or WHICH PACK

2. **Explains receiving patterns**
   - Irregular shipment quantities now make sense (ordering by boxes)

3. **Optimization opportunity**
   - Can help you choose WHICH pack to order based on needs
   - Minimize waste from excess sizes

4. **Transfer strategy changes**
   - If stuck with excess from prepacks, transfers become MORE important
   - Use transfers to redistribute prepack "waste" to stores that need those sizes

### Example Strategy

```
Cycle:
1. Order Pack B (heavy on 40W-44W)
2. Receive 10 boxes (120 pieces)
3. Distribute to all stores
4. Monitor which sizes sell out first
5. Use TRANSFERS to move slow sizes to stores where they sell
6. Eventually, all sizes sold
7. When network low, order Pack B again
```

---

## 🎯 Immediate Actions Needed

### Priority 1: Data Collection (THIS WEEK)

1. **Vendor Classification**
   - [ ] List all active vendors
   - [ ] Mark each as: Prepack / Open Stock / Hybrid
   - [ ] Get percentage: How many vendors are prepack?

2. **Prepack Documentation**
   - [ ] Get prepack configurations for top 5 vendors
   - [ ] Document size assortments
   - [ ] Get pricing per box

3. **8501B Specifics**
   - [ ] Confirm Pack A and Pack B details
   - [ ] Check if there are Pack C, D, etc.
   - [ ] Get colors: Are prepacks color-specific?

### Priority 2: Database Setup (NEXT WEEK)

4. **Create Tables**
   - [ ] Create vendors table
   - [ ] Create vendor_prepacks table
   - [ ] Create vendor_prepack_contents table
   - [ ] Import Argonaut Nations data

5. **Historical Analysis**
   - [ ] Analyze past receiving_vouchers quantities
   - [ ] Try to identify which pack was ordered (divide by 12)
   - [ ] Create receiving_prepack_log retroactively if possible

### Priority 3: Algorithm Development (WEEK 3-4)

6. **Prepack Optimizer**
   - [ ] Implement optimization algorithm
   - [ ] Test with 8501B example
   - [ ] Validate with your procurement team

---

## 📊 ROI Impact of Prepack System

### Before (Without Prepack Knowledge)

**Problem**:
```
System: "Order from vendor, shipment overdue"
User: "OK, but how much? Which sizes?"
Result: User guesses, orders too much or too little
```

### After (With Prepack Optimization)

**Solution**:
```
System: "Order 5 boxes Pack A from Argonaut Nations"
Details: "This will give you 15× 30W, 10× 34W, 5× 38W..."
Reasoning: "Covers low stock with minimal waste (12% excess)"
User: Places exact order needed
Result: Optimal inventory, minimal waste
```

**Value**:
- **Reduce overstock**: Don't order wrong pack and get stuck with sizes you don't need
- **Prevent stockouts**: Order right pack for your size profile
- **Save time**: No manual calculation of which pack to order
- **Save money**: Minimize waste from excess prepack sizes

**Estimated Impact**:
- If ordering wrong pack creates 30% waste
- And you order $50,000/year from prepack vendors
- That's $15,000 tied up in slow-moving sizes
- System could reduce waste to 10% = **$10,000 savings/year**

---

## 🔄 Next Steps

1. **Update Master Plan** - Add prepack system as Phase 2B
2. **Update Test Case** - Revise 8501B recommendations with prepack logic
3. **Create Database Schema** - Set up prepack tables
4. **Gather Vendor Data** - Get prepack configs from all vendors
5. **Build Optimizer** - Implement prepack selection algorithm

---

**This is a critical system component that was missing!**
**Thank you for catching this - it would have made the restock system incomplete.**

---

**END OF PREPACK SYSTEM ANALYSIS**

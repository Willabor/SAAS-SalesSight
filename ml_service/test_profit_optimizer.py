"""
Direct test of profit-based optimizer for 8501B Black
"""
from models.profit_based_optimizer import ProfitBasedPrepackOptimizer
from utils.prepack_data import (
    get_style_inventory_needs_with_financials,
    get_vendor_prepacks_by_color
)
from models.prepack_optimizer import PrepackContents

print("=" * 80)
print("PROFIT-BASED OPTIMIZER TEST: 8501B Black")
print("=" * 80)

# Step 1: Get financial needs for 8501B
print("\nStep 1: Fetching inventory needs with financial data...")
needs_by_color = get_style_inventory_needs_with_financials('8501B', target_days_supply=90)

if 'Black' not in needs_by_color:
    print("❌ No Black color data found for 8501B")
    exit(1)

black_needs = needs_by_color['Black']
print(f"✅ Found {len(black_needs)} Black SKUs")
print(f"   Total current inventory: {sum(n.current_qty for n in black_needs)}")
print(f"   Total target qty (90 days): {sum(n.target_qty for n in black_needs)}")
print(f"   Total shortage: {sum(n.shortage for n in black_needs)}")

# Step 2: Get prepacks for 8501B Black
print("\nStep 2: Fetching prepacks for 8501B Black...")
prepacks = get_vendor_prepacks_by_color('Argonaut Nations', '8501B', 'Black')

if not prepacks:
    print("❌ No prepacks found for 8501B Black")
    exit(1)

print(f"✅ Found {len(prepacks)} prepack(s)")
for pack in prepacks:
    print(f"   - {pack['prepack_name']}: {pack['total_pieces']} pieces @ ${pack['cost_per_box']}/box")

# Step 3: Convert prepacks to PrepackContents format
print("\nStep 3: Converting prepacks...")
prepack_contents = []
for pack in prepacks:
    contents = {}
    for size_str, qty in pack['size_distribution'].items():
        size_parts = str(size_str).split('X')
        if len(size_parts) > 1:
            waist = size_parts[0].strip()
            inseam = size_parts[1].strip()
            contents[(waist, inseam)] = qty
        else:
            contents[(size_str, '')] = qty

    prepack_contents.append(PrepackContents(
        prepack_id=pack['prepack_id'],
        prepack_name=pack['prepack_name'],
        vendor_name=pack['vendor_name'],
        style_number=pack['style_number'],
        color=pack['color'],
        total_pieces=pack['total_pieces'],
        cost_per_box=pack['cost_per_box'],
        contents=contents
    ))

print(f"✅ Converted {len(prepack_contents)} prepack(s)")

# Step 4: Run profit-based optimization
print("\nStep 4: Running profit-based optimization...")
optimizer = ProfitBasedPrepackOptimizer()

solution = optimizer.optimize(
    needs=black_needs,
    available_prepacks=prepack_contents,
    current_network_days_supply=25.0  # From our query above
)

# Step 5: Display results
print("\n" + "=" * 80)
print("OPTIMIZATION RESULTS")
print("=" * 80)
print(f"Recommendation: {solution.recommendation_text}")
print(f"Total Boxes: {solution.total_boxes}")
print(f"Total Pieces: {solution.total_pieces}")
print(f"Total Cost: ${solution.total_cost:.2f}")
print()
print("PROFIT ANALYSIS:")
print(f"  Expected Revenue: ${solution.profit_analysis.expected_revenue:.2f}")
print(f"  Prepack Cost: ${solution.profit_analysis.prepack_cost:.2f}")
print(f"  Holding Cost: ${solution.profit_analysis.holding_cost:.2f}")
print(f"  Opportunity Cost: ${solution.profit_analysis.opportunity_cost:.2f}")
print(f"  ───────────────────────────────")
print(f"  NET PROFIT: ${solution.profit_analysis.net_profit:.2f}")
print(f"  ROI: {solution.profit_analysis.roi_pct:.2f}%")
print(f"  Profitability Tier: {solution.profit_analysis.profitability_tier.value}")
print()
print("OPERATIONAL METRICS:")
print(f"  Units to Sell: {solution.profit_analysis.units_to_sell}")
print(f"  Excess Units: {solution.profit_analysis.excess_units}")
print(f"  Shortage Units: {solution.profit_analysis.shortage_units}")
print(f"  Avg Holding Days: {solution.profit_analysis.holding_days:.1f}")
print("=" * 80)

# Expected result: UNPROFITABLE
if solution.profit_analysis.profitability_tier.value == 'UNPROFITABLE':
    print("\n✅ TEST PASSED: 8501B Black correctly identified as UNPROFITABLE")
else:
    print(f"\n❌ TEST FAILED: Expected UNPROFITABLE, got {solution.profit_analysis.profitability_tier.value}")

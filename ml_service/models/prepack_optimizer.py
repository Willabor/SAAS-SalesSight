"""
Prepack Optimization Module - PRODUCTION READY

This module handles vendor prepack optimization for restock recommendations.
Since ~70% of vendors ship prepacked boxes with fixed size assortments,
we cannot order individual SKUs - we must find the optimal combination of
prepack boxes to meet inventory needs while minimizing waste.

This is a bin packing optimization problem.

CRITICAL: Prepacks are COLOR-SPECIFIC (one color per box).
- The optimize_color_aware() method optimizes PER COLOR first, then aggregates
- Returns recommendations like: "5 boxes Pack A (Black) + 2 boxes Pack A (Olive)"

Status: PRODUCTION READY
Last Updated: October 2025
"""

from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
from enum import Enum
import math


class UrgencyLevel(Enum):
    """Restock urgency levels based on days of supply"""
    CRITICAL = "critical"  # < 14 days
    LOW = "low"            # 14-30 days
    MONITOR = "monitor"    # 30-60 days
    GOOD = "good"          # 60-120 days
    HEALTHY = "healthy"    # > 120 days


@dataclass
class SKUNeed:
    """Represents inventory need for a specific SKU"""
    sku: str
    size: str
    inseam: str
    color: str
    current_qty: int
    velocity: float  # units per day
    target_qty: int  # desired quantity
    days_supply: float

    @property
    def shortage(self) -> int:
        """How many units short of target"""
        return max(0, self.target_qty - self.current_qty)


@dataclass
class PrepackContents:
    """Contents of a single prepack box"""
    prepack_id: int
    prepack_name: str  # "Pack A", "Pack B", etc.
    vendor_name: str
    style_number: str
    color: str  # Color for this prepack (e.g., "Black", "Olive")
    total_pieces: int  # Total units per box (e.g., 12)
    cost_per_box: Optional[float]

    # Map of SKU attributes to quantity per box
    # Example: {('30W', '32L'): 3, ('32W', '32L'): 2, ...}
    contents: Dict[Tuple[str, str], int]  # (size, inseam) -> qty

    def get_quantity(self, size: str, inseam: str) -> int:
        """Get quantity of a specific size/inseam in this prepack"""
        return self.contents.get((size, inseam), 0)


@dataclass
class PrepackSolution:
    """Represents a prepack ordering solution"""
    prepack_combinations: Dict[str, int]  # prepack_name -> box count
    total_boxes: int
    total_pieces: int
    total_cost: float

    # What you'll receive
    received_quantities: Dict[Tuple[str, str], int]  # (size, inseam) -> total qty

    # Analysis
    coverage_pct: float  # % of needs met (0-1)
    waste_pct: float     # % of received that's excess (0-1)
    score: float         # Overall score

    # Detailed breakdown
    met_needs: Dict[str, int]      # SKU -> qty of need met
    unmet_needs: Dict[str, int]    # SKU -> qty of need NOT met
    excess_qty: Dict[str, int]     # SKU -> qty of excess

    @property
    def recommendation(self) -> str:
        """Human-readable recommendation"""
        if self.total_boxes == 0:
            return "DO NOT ORDER - Network is healthy"

        parts = []
        for prepack_name, box_count in sorted(self.prepack_combinations.items()):
            if box_count > 0:
                parts.append(f"{box_count} boxes of {prepack_name}")

        return "Order: " + " + ".join(parts)


class PrepackOptimizer:
    """
    Optimizes prepack box selection for vendor orders.

    Solves the bin packing problem: Given available prepacks and inventory needs,
    find the optimal combination of prepack boxes to order.
    """

    def __init__(
        self,
        max_waste_tolerance: float = 0.30,  # 30% waste is acceptable
        min_coverage_target: float = 0.90,  # Must cover 90% of needs
        max_boxes_per_prepack: int = 20     # Don't order more than 20 boxes of one type
    ):
        self.max_waste_tolerance = max_waste_tolerance
        self.min_coverage_target = min_coverage_target
        self.max_boxes_per_prepack = max_boxes_per_prepack

    def optimize(
        self,
        needs: List[SKUNeed],
        available_prepacks: List[PrepackContents],
        current_network_days_supply: float
    ) -> PrepackSolution:
        """
        Find optimal prepack combination to meet inventory needs.

        Args:
            needs: List of SKU inventory needs
            available_prepacks: List of available prepack configurations
            current_network_days_supply: Current network-wide days of supply

        Returns:
            Best solution found (may recommend 0 boxes if network is healthy)
        """

        # Check if restock is even needed
        urgency = self._assess_urgency(current_network_days_supply)

        if urgency in [UrgencyLevel.GOOD, UrgencyLevel.HEALTHY]:
            # Network is healthy - recommend NOT ordering
            return self._create_empty_solution(
                f"Network has {current_network_days_supply:.0f} days supply - no restock needed"
            )

        # Try different combinations and score them
        best_solution = None
        best_score = float('-inf')

        # For simplicity with 2 prepacks, try all combinations
        # For more prepacks, would need integer linear programming
        for combination in self._generate_combinations(available_prepacks):
            solution = self._evaluate_combination(combination, needs, available_prepacks)

            # Check if solution meets minimum requirements
            if solution.coverage_pct >= self.min_coverage_target:
                if solution.waste_pct <= self.max_waste_tolerance:
                    if solution.score > best_score:
                        best_score = solution.score
                        best_solution = solution

        if best_solution is None:
            # No solution met requirements - return best effort
            # This can happen if prepacks don't align well with needs
            return self._create_best_effort_solution(needs, available_prepacks)

        return best_solution

    def _assess_urgency(self, days_supply: float) -> UrgencyLevel:
        """Determine urgency level based on days of supply"""
        if days_supply < 14:
            return UrgencyLevel.CRITICAL
        elif days_supply < 30:
            return UrgencyLevel.LOW
        elif days_supply < 60:
            return UrgencyLevel.MONITOR
        elif days_supply < 120:
            return UrgencyLevel.GOOD
        else:
            return UrgencyLevel.HEALTHY

    def _generate_combinations(
        self,
        available_prepacks: List[PrepackContents]
    ) -> List[Dict[str, int]]:
        """
        Generate all possible combinations of prepack boxes to try.

        For 2 prepacks: Try 0-20 boxes of Pack A × 0-20 boxes of Pack B
        Returns list of {prepack_name: box_count} dicts
        """
        combinations = []

        if len(available_prepacks) == 1:
            # Only one prepack available
            pack = available_prepacks[0]
            for count in range(0, self.max_boxes_per_prepack + 1):
                combinations.append({pack.prepack_name: count})

        elif len(available_prepacks) == 2:
            # Two prepacks - try all combinations
            pack_a, pack_b = available_prepacks
            for count_a in range(0, self.max_boxes_per_prepack + 1):
                for count_b in range(0, self.max_boxes_per_prepack + 1):
                    if count_a > 0 or count_b > 0:  # Skip 0+0
                        combinations.append({
                            pack_a.prepack_name: count_a,
                            pack_b.prepack_name: count_b
                        })

        else:
            # More than 2 prepacks - would need more sophisticated approach
            # For now, try each prepack individually
            for pack in available_prepacks:
                for count in range(1, self.max_boxes_per_prepack + 1):
                    combinations.append({pack.prepack_name: count})

        return combinations

    def _evaluate_combination(
        self,
        combination: Dict[str, int],
        needs: List[SKUNeed],
        available_prepacks: List[PrepackContents]
    ) -> PrepackSolution:
        """
        Evaluate a specific combination of prepack boxes.

        Calculates what you'd receive, coverage, waste, and overall score.
        """

        # Calculate what would be received
        received = {}  # (size, inseam) -> qty
        total_boxes = 0
        total_cost = 0.0

        for pack in available_prepacks:
            box_count = combination.get(pack.prepack_name, 0)
            if box_count > 0:
                total_boxes += box_count
                total_cost += box_count * (pack.cost_per_box or 0)

                # Add contents
                for (size, inseam), qty_per_box in pack.contents.items():
                    key = (size, inseam)
                    received[key] = received.get(key, 0) + (qty_per_box * box_count)

        # Calculate coverage and waste
        total_need = 0
        met_need = 0
        met_needs_detail = {}
        unmet_needs_detail = {}
        excess_detail = {}

        for need in needs:
            key = (need.size, need.inseam)
            shortage = need.shortage
            received_qty = received.get(key, 0)

            total_need += shortage
            fulfilled = min(received_qty, shortage)
            met_need += fulfilled

            if fulfilled > 0:
                met_needs_detail[need.sku] = fulfilled
            if fulfilled < shortage:
                unmet_needs_detail[need.sku] = shortage - fulfilled
            if received_qty > shortage:
                excess_detail[need.sku] = received_qty - shortage

        coverage = met_need / total_need if total_need > 0 else 1.0

        # Calculate waste
        total_received = sum(received.values())
        excess = sum(excess_detail.values())
        waste = excess / total_received if total_received > 0 else 0.0

        # Calculate score
        # Prioritize coverage, penalize waste and cost
        score = (
            coverage * 100          # Coverage is most important (0-100 points)
            - waste * 50            # Waste is bad (-0 to -50 points)
            - total_boxes * 1       # Prefer fewer boxes (-0 to -20 points)
        )

        return PrepackSolution(
            prepack_combinations=combination,
            total_boxes=total_boxes,
            total_pieces=total_received,
            total_cost=total_cost,
            received_quantities=received,
            coverage_pct=coverage,
            waste_pct=waste,
            score=score,
            met_needs=met_needs_detail,
            unmet_needs=unmet_needs_detail,
            excess_qty=excess_detail
        )

    def _create_empty_solution(self, reason: str) -> PrepackSolution:
        """Create a solution that recommends NOT ordering"""
        return PrepackSolution(
            prepack_combinations={},
            total_boxes=0,
            total_pieces=0,
            total_cost=0.0,
            received_quantities={},
            coverage_pct=1.0,  # Already covered
            waste_pct=0.0,
            score=100.0,
            met_needs={},
            unmet_needs={},
            excess_qty={}
        )

    def _create_best_effort_solution(
        self,
        needs: List[SKUNeed],
        available_prepacks: List[PrepackContents]
    ) -> PrepackSolution:
        """
        When no solution meets requirements, find best available option.
        This might exceed waste tolerance or miss coverage target.
        """
        # Try each prepack type individually and pick best
        best_solution = None
        best_score = float('-inf')

        for pack in available_prepacks:
            # Try 1-10 boxes of this pack
            for box_count in range(1, 11):
                combination = {pack.prepack_name: box_count}
                solution = self._evaluate_combination(combination, needs, available_prepacks)

                if solution.score > best_score:
                    best_score = solution.score
                    best_solution = solution

        return best_solution or self._create_empty_solution("No viable solution found")

    def optimize_color_aware(
        self,
        needs_by_color: Dict[str, List[SKUNeed]],
        available_prepacks: List[PrepackContents],
        current_network_days_supply: float
    ) -> Dict:
        """
        Optimize prepack orders with COLOR-AWARENESS.

        CRITICAL: Prepacks are color-specific (one color per box).
        This method optimizes PER COLOR first, then aggregates results.

        Args:
            needs_by_color: Dict mapping color -> list of SKUNeed objects
            available_prepacks: List of all available prepacks (with color field)
            current_network_days_supply: Current network-wide days of supply

        Returns:
            Dict with aggregated results and per-color breakdown:
            {
                'total_boxes': int,
                'total_cost': float,
                'total_pieces': int,
                'overall_coverage_pct': float,
                'overall_waste_pct': float,
                'recommendation': str,  # "Order: 5 boxes Pack A (Black) + 2 boxes Pack A (Olive)"
                'by_color': {
                    'Black': PrepackSolution,
                    'Olive': PrepackSolution,
                    ...
                }
            }
        """

        # Check if restock is even needed
        urgency = self._assess_urgency(current_network_days_supply)
        if urgency in [UrgencyLevel.GOOD, UrgencyLevel.HEALTHY]:
            return {
                'total_boxes': 0,
                'total_cost': 0.0,
                'total_pieces': 0,
                'overall_coverage_pct': 1.0,
                'overall_waste_pct': 0.0,
                'recommendation': f"Network has {current_network_days_supply:.0f} days supply - no restock needed",
                'by_color': {}
            }

        # Optimize each color separately
        color_solutions = {}
        total_boxes = 0
        total_cost = 0.0
        total_pieces = 0
        total_need = 0
        total_met = 0
        total_excess = 0

        for color, needs in needs_by_color.items():
            if not needs:
                continue

            # Filter prepacks for this specific color
            color_prepacks = [p for p in available_prepacks if p.color == color]

            if not color_prepacks:
                print(f"WARNING: No prepacks available for color '{color}'")
                continue

            # Run optimization for this color
            solution = self.optimize(needs, color_prepacks, current_network_days_supply)

            if solution.total_boxes > 0:
                color_solutions[color] = solution
                total_boxes += solution.total_boxes
                total_cost += solution.total_cost
                total_pieces += solution.total_pieces

                # Aggregate needs/met/excess for overall metrics
                for need in needs:
                    total_need += need.shortage
                    if need.sku in solution.met_needs:
                        total_met += solution.met_needs[need.sku]
                    if need.sku in solution.excess_qty:
                        total_excess += solution.excess_qty[need.sku]

        # Calculate overall metrics
        overall_coverage = total_met / total_need if total_need > 0 else 1.0
        overall_waste = total_excess / total_pieces if total_pieces > 0 else 0.0

        # Build color-specific recommendation string
        if not color_solutions:
            recommendation = "No viable prepack combinations found"
        else:
            rec_parts = []
            for color, solution in sorted(color_solutions.items()):
                for prepack_name, box_count in sorted(solution.prepack_combinations.items()):
                    if box_count > 0:
                        rec_parts.append(f"{box_count} boxes {prepack_name} ({color})")
            recommendation = "Order: " + " + ".join(rec_parts)

        return {
            'total_boxes': total_boxes,
            'total_cost': total_cost,
            'total_pieces': total_pieces,
            'overall_coverage_pct': overall_coverage,
            'overall_waste_pct': overall_waste,
            'recommendation': recommendation,
            'by_color': color_solutions
        }


def calculate_target_quantity(
    current_qty: int,
    velocity: float,
    target_days_supply: int = 90
) -> int:
    """
    Calculate target inventory quantity for a SKU.

    Args:
        current_qty: Current on-hand quantity
        velocity: Sales velocity (units per day)
        target_days_supply: Desired days of supply (default 90 days)

    Returns:
        Target quantity to achieve desired days of supply
    """
    if velocity <= 0:
        # No sales - keep minimal stock
        return max(1, current_qty)

    ideal_qty = math.ceil(velocity * target_days_supply)
    return max(ideal_qty, 1)


# Example usage and test case
if __name__ == "__main__":
    # Example: Style 8501B from Argonaut Nations

    # Define prepacks
    pack_a = PrepackContents(
        prepack_id=1,
        prepack_name="Pack A",
        vendor_name="Argonaut Nations",
        style_number="8501B",
        color="Black",
        total_pieces=12,
        cost_per_box=168.0,  # 12 pieces × $14 each
        contents={
            ('30W', '32L'): 3,
            ('32W', '32L'): 2,
            ('34W', '32L'): 2,
            ('36W', '32L'): 1,
            ('38W', '32L'): 1,
            ('32W', '34L'): 1,
            ('34W', '34L'): 1,
            ('36W', '34L'): 1,
        }
    )

    pack_b = PrepackContents(
        prepack_id=2,
        prepack_name="Pack B",
        vendor_name="Argonaut Nations",
        style_number="8501B",
        color="Black",
        total_pieces=12,
        cost_per_box=168.0,
        contents={
            ('32W', '32L'): 1,
            ('34W', '32L'): 1,
            ('36W', '32L'): 1,
            ('38W', '32L'): 1,
            ('40W', '32L'): 2,
            ('42W', '32L'): 2,
            ('44W', '32L'): 1,
            ('34W', '34L'): 1,
            ('36W', '34L'): 1,
            ('38W', '34L'): 1,
        }
    )

    # Example needs (after network drops to restock threshold)
    needs = [
        SKUNeed('42800', '30W', '32L', 'Black', current_qty=5, velocity=0.13,
                target_qty=20, days_supply=38.5),
        SKUNeed('42803', '34W', '32L', 'Black', current_qty=15, velocity=0.27,
                target_qty=35, days_supply=55.6),
        SKUNeed('42798', '36W', '32L', 'Black', current_qty=10, velocity=0.26,
                target_qty=30, days_supply=38.5),
        SKUNeed('42806', '38W', '32L', 'Black', current_qty=8, velocity=0.23,
                target_qty=28, days_supply=34.8),
        SKUNeed('42802', '40W', '32L', 'Black', current_qty=25, velocity=0.08,
                target_qty=10, days_supply=312.5),  # Overstocked!
    ]

    # Run optimizer
    optimizer = PrepackOptimizer(
        max_waste_tolerance=0.30,
        min_coverage_target=0.85
    )

    # Scenario 1: Network healthy (182 days supply)
    print("=" * 80)
    print("SCENARIO 1: Network Healthy (182 days supply)")
    print("=" * 80)
    solution1 = optimizer.optimize(needs, [pack_a, pack_b], current_network_days_supply=182)
    print(f"\nRecommendation: {solution1.recommendation}")
    print(f"Coverage: {solution1.coverage_pct:.1%}")
    print(f"Waste: {solution1.waste_pct:.1%}")
    print(f"Score: {solution1.score:.1f}")

    # Scenario 2: Network at restock threshold (50 days supply)
    print("\n" + "=" * 80)
    print("SCENARIO 2: Network Low (50 days supply)")
    print("=" * 80)
    solution2 = optimizer.optimize(needs, [pack_a, pack_b], current_network_days_supply=50)
    print(f"\nRecommendation: {solution2.recommendation}")
    print(f"Total Boxes: {solution2.total_boxes}")
    print(f"Total Pieces: {solution2.total_pieces}")
    print(f"Total Cost: ${solution2.total_cost:,.2f}")
    print(f"Coverage: {solution2.coverage_pct:.1%}")
    print(f"Waste: {solution2.waste_pct:.1%}")
    print(f"Score: {solution2.score:.1f}")

    if solution2.total_boxes > 0:
        print("\nBreakdown:")
        for prepack_name, box_count in solution2.prepack_combinations.items():
            if box_count > 0:
                print(f"  {prepack_name}: {box_count} boxes")

        print("\nWhat you'll receive:")
        for (size, inseam), qty in sorted(solution2.received_quantities.items()):
            print(f"  {size}×{inseam}: {qty} units")

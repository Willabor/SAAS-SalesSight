"""
⚠️  DRAFT/PROTOTYPE - FOR PLANNING REFERENCE ONLY ⚠️

DO NOT USE IN PRODUCTION - This is a planning artifact created during
the requirements and design phase. This code has NOT been reviewed,
tested, or approved for production use.

Status: PLANNING PHASE
Created: October 10, 2025
Purpose: Demonstrate data extraction approach for planning docs

================================================================================

Prepack Data Extraction Module

Utilities for extracting prepack configurations and vendor data from the database.

⚠️  DRAFT/PROTOTYPE - FOR PLANNING REFERENCE ONLY ⚠️
"""

from typing import List, Dict, Tuple, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
from ml_service.models.prepack_optimizer import (
    PrepackContents,
    SKUNeed,
    calculate_target_quantity
)
from ml_service.utils.database import get_db_connection


def get_vendor_prepacks(
    vendor_name: str,
    style_number: str
) -> List[PrepackContents]:
    """
    Get all prepack configurations for a vendor and style.

    Args:
        vendor_name: Name of vendor (e.g., "Argonaut Nations")
        style_number: Style number (e.g., "8501B")

    Returns:
        List of PrepackContents objects
    """
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # Get prepack configurations
        query = """
        SELECT
            vp.id as prepack_id,
            vp.prepack_name,
            vp.total_pieces,
            vp.cost_per_box,
            v.vendor_name,
            vp.style_number
        FROM vendor_prepacks vp
        JOIN vendors v ON vp.vendor_id = v.id
        WHERE v.vendor_name = %s
          AND vp.style_number = %s
          AND vp.active = TRUE
        ORDER BY vp.prepack_name
        """

        cursor.execute(query, (vendor_name, style_number))
        prepacks = cursor.fetchall()

        if not prepacks:
            return []

        # For each prepack, get contents
        result = []
        for pack in prepacks:
            contents_query = """
            SELECT
                size,
                inseam,
                color,
                quantity_per_box
            FROM vendor_prepack_contents
            WHERE prepack_id = %s
            """

            cursor.execute(contents_query, (pack['prepack_id'],))
            contents_rows = cursor.fetchall()

            # Build contents dict: (size, inseam) -> qty
            # Note: Ignoring color for now, assuming color-specific prepacks
            contents = {}
            for row in contents_rows:
                key = (row['size'], row['inseam'])
                contents[key] = row['quantity_per_box']

            result.append(PrepackContents(
                prepack_id=pack['prepack_id'],
                prepack_name=pack['prepack_name'],
                vendor_name=pack['vendor_name'],
                style_number=pack['style_number'],
                total_pieces=pack['total_pieces'],
                cost_per_box=pack['cost_per_box'],
                contents=contents
            ))

        return result

    finally:
        cursor.close()
        conn.close()


def get_style_inventory_needs(
    style_number: str,
    target_days_supply: int = 90
) -> Tuple[List[SKUNeed], float]:
    """
    Get current inventory needs for a style number.

    Analyzes current inventory and sales velocity to determine what's needed.

    Args:
        style_number: Style number to analyze
        target_days_supply: Desired days of supply for restock (default 90)

    Returns:
        Tuple of (list of SKUNeed objects, current network days supply)
    """
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # Get current inventory and velocity by size/inseam
        query = """
        WITH inventory AS (
            SELECT
                item_number,
                size,
                inseam,
                color,
                SUM(COALESCE(gm_qty, 0) + COALESCE(hm_qty, 0) +
                    COALESCE(nm_qty, 0) + COALESCE(lm_qty, 0)) as total_qty
            FROM item_list
            WHERE style_number = %s
            GROUP BY item_number, size, inseam, color
        ),
        sales AS (
            SELECT
                il.item_number,
                COUNT(st.id)::numeric / 30.0 as velocity_per_day
            FROM item_list il
            LEFT JOIN sales_transactions st ON st.sku = il.item_number
                AND st.date >= CURRENT_DATE - 30
            WHERE il.style_number = %s
            GROUP BY il.item_number
        )
        SELECT
            i.item_number,
            i.size,
            i.inseam,
            i.color,
            i.total_qty,
            COALESCE(s.velocity_per_day, 0) as velocity
        FROM inventory i
        LEFT JOIN sales s ON i.item_number = s.item_number
        WHERE i.total_qty > 0 OR COALESCE(s.velocity_per_day, 0) > 0
        ORDER BY COALESCE(s.velocity_per_day, 0) DESC
        """

        cursor.execute(query, (style_number, style_number))
        rows = cursor.fetchall()

        needs = []
        total_qty = 0
        total_velocity = 0.0

        for row in rows:
            current_qty = row['total_qty']
            velocity = row['velocity']

            total_qty += current_qty
            total_velocity += velocity

            # Calculate target quantity
            target_qty = calculate_target_quantity(
                current_qty=current_qty,
                velocity=velocity,
                target_days_supply=target_days_supply
            )

            # Calculate days of supply
            if velocity > 0:
                days_supply = current_qty / velocity
            else:
                days_supply = 9999.0

            needs.append(SKUNeed(
                sku=row['item_number'],
                size=row['size'],
                inseam=row['inseam'],
                color=row['color'],
                current_qty=current_qty,
                velocity=velocity,
                target_qty=target_qty,
                days_supply=days_supply
            ))

        # Calculate network days supply
        if total_velocity > 0:
            network_days_supply = total_qty / total_velocity
        else:
            network_days_supply = 9999.0

        return needs, network_days_supply

    finally:
        cursor.close()
        conn.close()


def get_vendor_by_style(style_number: str) -> Optional[str]:
    """
    Get the vendor name for a given style number.

    Args:
        style_number: Style number to lookup

    Returns:
        Vendor name or None if not found
    """
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        # Try to get vendor from receiving vouchers
        query = """
        SELECT DISTINCT vendor
        FROM receiving_vouchers
        WHERE style_number = %s
        ORDER BY voucher_date DESC
        LIMIT 1
        """

        cursor.execute(query, (style_number,))
        row = cursor.fetchone()

        if row:
            return row['vendor']

        # Fallback: Try item_list vendor field if it exists
        # (depends on schema - may not exist)
        try:
            query2 = """
            SELECT DISTINCT vendor
            FROM item_list
            WHERE style_number = %s
            LIMIT 1
            """
            cursor.execute(query2, (style_number,))
            row = cursor.fetchone()
            if row and 'vendor' in row:
                return row['vendor']
        except:
            pass

        return None

    finally:
        cursor.close()
        conn.close()


def check_vendor_uses_prepacks(vendor_name: str) -> bool:
    """
    Check if a vendor uses prepack system.

    Args:
        vendor_name: Vendor name

    Returns:
        True if vendor ships prepacked boxes, False otherwise
    """
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        query = """
        SELECT ships_prepack
        FROM vendors
        WHERE vendor_name = %s
        """

        cursor.execute(query, (vendor_name,))
        row = cursor.fetchone()

        if row:
            return row['ships_prepack']

        # If vendor not in database, assume no prepacks
        return False

    finally:
        cursor.close()
        conn.close()


# Example usage
if __name__ == "__main__":
    # This would only work if the database tables exist
    # For testing, we can use mock data

    print("Prepack Data Extraction Module")
    print("=" * 80)
    print("\nNote: This module requires vendor_prepacks tables to be created first.")
    print("See PREPACK_SYSTEM_ANALYSIS.md for database schema.\n")

    # Example of what the API would return
    print("Example: If querying for Style 8501B from Argonaut Nations...")
    print("\nWould return:")
    print("  - Pack A configuration (12 pieces)")
    print("  - Pack B configuration (12 pieces)")
    print("  - Current inventory needs by size")
    print("  - Network days of supply")
    print("\nThen pass to PrepackOptimizer.optimize() for recommendations.")

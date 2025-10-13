"""
Prepack Data Extraction Module

Utilities for extracting prepack configurations and vendor data from the database.
Supports color-aware prepack optimization and profit-based analysis.
"""

from typing import List, Dict, Tuple, Optional
import psycopg2
from psycopg2.extras import RealDictCursor
from models.prepack_optimizer import SKUNeed
from models.profit_based_optimizer import SKUFinancials
from utils.database import db


def get_vendor_prepacks_by_color(
    vendor_name: str,
    style_number: str,
    color: str
) -> List[Dict]:
    """
    Get all prepack configurations for a vendor, style, and specific color.

    Args:
        vendor_name: Name of vendor (e.g., "Argonaut Nations")
        style_number: Style number (e.g., "8501B")
        color: Color name (e.g., "Black", "Olive")

    Returns:
        List of prepack configuration dicts with size distributions
    """
    query = """
    SELECT
        pc.id as prepack_id,
        pc.prepack_name,
        pc.pieces_per_box,
        pc.cost_per_box,
        pc.available_colors,
        sc.vendor_name,
        sc.style_number,
        sc.size_type
    FROM prepack_configurations pc
    JOIN style_configurations sc ON pc.style_config_id = sc.id
    WHERE sc.vendor_name = %s
      AND sc.style_number = %s
      AND pc.available_colors @> %s::jsonb
    ORDER BY pc.prepack_name
    """

    try:
        df = db.execute_query(query, (vendor_name, style_number, f'["{color}"]'))

        if df.empty:
            return []

        # For each prepack, get size distributions
        result = []
        for _, pack in df.iterrows():
            # Get size distribution for this prepack
            size_query = """
            SELECT size_value, quantity
            FROM prepack_size_distributions
            WHERE prepack_config_id = %s
            ORDER BY quantity DESC
            """

            size_df = db.execute_query(size_query, (pack['prepack_id'],))

            # Build size distribution dict
            size_distribution = {}
            for _, size_row in size_df.iterrows():
                size_distribution[size_row['size_value']] = size_row['quantity']

            result.append({
                'prepack_id': pack['prepack_id'],
                'prepack_name': pack['prepack_name'],
                'vendor_name': pack['vendor_name'],
                'style_number': pack['style_number'],
                'color': color,
                'total_pieces': pack['pieces_per_box'],
                'cost_per_box': float(pack['cost_per_box']) if pack['cost_per_box'] else 0.0,
                'size_distribution': size_distribution,
                'size_type': pack['size_type']
            })

        return result

    except Exception as e:
        print(f"Error fetching prepacks for {vendor_name} {style_number} ({color}): {e}")
        return []


def get_style_inventory_needs_by_color(
    style_number: str,
    target_days_supply: int = 90
) -> Dict[str, List[SKUNeed]]:
    """
    Get current inventory needs for a style, grouped by color.

    Analyzes current inventory and sales velocity to determine what's needed.

    Args:
        style_number: Style number to analyze
        target_days_supply: Desired days of supply for restock (default 90)

    Returns:
        Dict mapping color -> list of SKUNeed objects for that color
    """
    query = """
    WITH inventory AS (
        SELECT
            item_number,
            style_number,
            size,
            attribute as color_attribute,
            SUM(COALESCE(gm_qty, 0) + COALESCE(hm_qty, 0) +
                COALESCE(nm_qty, 0) + COALESCE(lm_qty, 0)) as total_qty,
            -- Parse color from attribute field
            CASE
                WHEN attribute IS NULL THEN 'Unknown'
                WHEN attribute ~ '^Color:' THEN TRIM(SUBSTRING(attribute FROM 'Color:\s*(.+)'))
                ELSE TRIM(attribute)
            END as color
        FROM item_list
        WHERE style_number = %s
        GROUP BY item_number, style_number, size, attribute
    ),
    sales AS (
        SELECT
            il.item_number,
            COUNT(st.id)::numeric / 30.0 as velocity_per_day
        FROM item_list il
        LEFT JOIN sales_transactions st ON st.sku = il.item_number
            AND st.date >= CURRENT_DATE - INTERVAL '30 days'
        WHERE il.style_number = %s
        GROUP BY il.item_number
    )
    SELECT
        i.item_number as sku,
        i.size,
        i.color,
        i.total_qty as current_qty,
        COALESCE(s.velocity_per_day, 0) as velocity
    FROM inventory i
    LEFT JOIN sales s ON i.item_number = s.item_number
    WHERE i.total_qty > 0 OR COALESCE(s.velocity_per_day, 0) > 0
    ORDER BY i.color, COALESCE(s.velocity_per_day, 0) DESC
    """

    try:
        df = db.execute_query(query, (style_number, style_number))

        # Group by color
        needs_by_color = {}

        for _, row in df.iterrows():
            color = row['color'] or 'Unknown'
            current_qty = int(row['current_qty'])
            velocity = float(row['velocity'])

            # Calculate target quantity and days of supply
            if velocity > 0:
                target_qty = max(int(velocity * target_days_supply), 1)
                days_supply = current_qty / velocity
            else:
                target_qty = max(1, current_qty)
                days_supply = 9999.0

            # Parse size (handle jeans format like "30W X 32L")
            size_parts = str(row['size']).split('X')
            size = size_parts[0].strip() if size_parts else str(row['size'])
            inseam = size_parts[1].strip() if len(size_parts) > 1 else ''

            need = SKUNeed(
                sku=row['sku'],
                size=size,
                inseam=inseam,
                color=color,
                current_qty=current_qty,
                velocity=velocity,
                target_qty=target_qty,
                days_supply=days_supply
            )

            if color not in needs_by_color:
                needs_by_color[color] = []

            needs_by_color[color].append(need)

        return needs_by_color

    except Exception as e:
        print(f"Error fetching inventory needs for {style_number}: {e}")
        return {}


def get_styles_needing_restock(limit: int = 20) -> List[Dict]:
    """
    Get list of styles that need restocking from prepack vendors.

    COLOR-AWARE: Checks each color individually. Returns styles where
    AT LEAST ONE COLOR has sales and low inventory (< 30 days supply).

    Args:
        limit: Maximum number of styles to return

    Returns:
        List of style dicts with restock information
    """
    query = """
    WITH color_inventory AS (
        SELECT
            il.style_number,
            il.item_name,
            il.vendor_name,
            il.attribute as color,
            SUM(COALESCE(il.gm_qty, 0) + COALESCE(il.hm_qty, 0) +
                COALESCE(il.nm_qty, 0) + COALESCE(il.lm_qty, 0)) as total_qty
        FROM item_list il
        WHERE il.style_number IS NOT NULL
          AND il.vendor_name IS NOT NULL
        GROUP BY il.style_number, il.item_name, il.vendor_name, il.attribute
    ),
    color_velocity AS (
        SELECT
            il.style_number,
            il.attribute as color,
            COUNT(st.id)::numeric / 30.0 as daily_velocity
        FROM item_list il
        LEFT JOIN sales_transactions st ON st.sku = il.item_number
            AND st.date >= CURRENT_DATE - INTERVAL '30 days'
        WHERE il.style_number IS NOT NULL
        GROUP BY il.style_number, il.attribute
    ),
    color_analysis AS (
        SELECT
            ci.style_number,
            ci.item_name,
            ci.vendor_name,
            ci.color,
            ci.total_qty,
            COALESCE(cv.daily_velocity, 0) as daily_velocity,
            CASE
                WHEN COALESCE(cv.daily_velocity, 0) > 0
                THEN ci.total_qty / cv.daily_velocity
                ELSE 999.0
            END as days_supply,
            -- Color needs restock if it has sales and low inventory
            -- Threshold: 120 days for early restock warning
            CASE
                WHEN COALESCE(cv.daily_velocity, 0) > 0
                     AND ci.total_qty / cv.daily_velocity < 120
                THEN true
                ELSE false
            END as color_needs_restock
        FROM color_inventory ci
        LEFT JOIN color_velocity cv ON ci.style_number = cv.style_number
            AND ci.color = cv.color
    ),
    vendor_configs AS (
        SELECT vendor_name, uses_prepacks
        FROM vendor_configurations
        WHERE uses_prepacks = true
    ),
    styles_with_low_colors AS (
        SELECT DISTINCT
            ca.style_number,
            ca.item_name,
            ca.vendor_name,
            SUM(ca.total_qty) as total_all_colors_qty,
            SUM(ca.daily_velocity) as total_all_colors_velocity,
            MIN(CASE WHEN ca.color_needs_restock THEN ca.days_supply ELSE 999 END) as min_days_supply,
            COUNT(CASE WHEN ca.color_needs_restock THEN 1 END) as colors_needing_restock
        FROM color_analysis ca
        WHERE ca.color_needs_restock = true
        GROUP BY ca.style_number, ca.item_name, ca.vendor_name
    )
    SELECT
        sw.style_number,
        sw.item_name,
        sw.vendor_name,
        sw.total_all_colors_qty as total_active_qty,
        sw.total_all_colors_velocity as avg_daily_sales,
        sw.min_days_supply as days_of_supply,
        sw.colors_needing_restock,
        vc.uses_prepacks
    FROM styles_with_low_colors sw
    INNER JOIN vendor_configs vc ON sw.vendor_name = vc.vendor_name
    ORDER BY sw.min_days_supply ASC
    LIMIT %s
    """

    try:
        df = db.execute_query(query, (limit,))

        results = []
        for _, row in df.iterrows():
            results.append({
                'style_number': row['style_number'],
                'item_name': row['item_name'],
                'vendor_name': row['vendor_name'],
                'total_active_qty': int(row['total_active_qty']),
                'avg_daily_sales': float(row['avg_daily_sales']),
                'days_of_supply': float(row['days_of_supply']),
                'colors_needing_restock': int(row['colors_needing_restock']),
                'uses_prepacks': row['uses_prepacks']
            })

        return results

    except Exception as e:
        print(f"Error fetching styles needing restock: {e}")
        return []


def get_vendor_by_style(style_number: str) -> Optional[str]:
    """
    Get the vendor name for a given style number.

    Args:
        style_number: Style number to lookup

    Returns:
        Vendor name or None if not found
    """
    query = """
    SELECT DISTINCT vendor_name
    FROM item_list
    WHERE style_number = %s
    LIMIT 1
    """

    try:
        df = db.execute_query(query, (style_number,))

        if not df.empty:
            return df.iloc[0]['vendor_name']

        return None

    except Exception as e:
        print(f"Error fetching vendor for style {style_number}: {e}")
        return None


def check_vendor_uses_prepacks(vendor_name: str) -> bool:
    """
    Check if a vendor uses prepack system.

    Args:
        vendor_name: Vendor name

    Returns:
        True if vendor ships prepacked boxes, False otherwise
    """
    query = """
    SELECT uses_prepacks
    FROM vendor_configurations
    WHERE vendor_name = %s
    """

    try:
        df = db.execute_query(query, (vendor_name,))

        if not df.empty:
            return bool(df.iloc[0]['uses_prepacks'])

        # If vendor not in database, assume no prepacks
        return False

    except Exception as e:
        print(f"Error checking vendor {vendor_name}: {e}")
        return False


def get_available_colors_for_style(style_number: str, vendor_name: str) -> List[str]:
    """
    Get list of available colors for a style from prepack configurations.

    Args:
        style_number: Style number
        vendor_name: Vendor name

    Returns:
        List of color names
    """
    query = """
    SELECT DISTINCT jsonb_array_elements_text(pc.available_colors) as color
    FROM prepack_configurations pc
    JOIN style_configurations sc ON pc.style_config_id = sc.id
    WHERE sc.style_number = %s
      AND sc.vendor_name = %s
    ORDER BY color
    """

    try:
        df = db.execute_query(query, (style_number, vendor_name))

        if not df.empty:
            return df['color'].tolist()

        return []

    except Exception as e:
        print(f"Error fetching colors for {style_number}: {e}")
        return []


def get_style_inventory_needs_with_financials(
    style_number: str,
    target_days_supply: int = 90
) -> Dict[str, List[SKUFinancials]]:
    """
    Get inventory needs WITH FINANCIAL DATA for profit-based optimization.

    Similar to get_style_inventory_needs_by_color but includes pricing/cost data.

    Args:
        style_number: Style number to analyze
        target_days_supply: Desired days of supply (default 90)

    Returns:
        Dict mapping color -> list of SKUFinancials objects
    """
    query = """
    WITH inventory AS (
        SELECT
            il.item_number,
            il.style_number,
            il.size,
            il.attribute as color_attribute,
            SUM(COALESCE(il.gm_qty, 0) + COALESCE(il.hm_qty, 0) +
                COALESCE(il.nm_qty, 0) + COALESCE(il.lm_qty, 0)) as total_qty,
            -- Parse color
            CASE
                WHEN il.attribute IS NULL THEN 'Unknown'
                WHEN il.attribute ~ '^Color:' THEN TRIM(SUBSTRING(il.attribute FROM 'Color:\\s*(.+)'))
                ELSE TRIM(il.attribute)
            END as color
        FROM item_list il
        WHERE il.style_number = %s
        GROUP BY il.item_number, il.style_number, il.size, il.attribute
    ),
    sales AS (
        SELECT
            il.item_number,
            COUNT(st.id)::numeric / 30.0 as velocity_per_day
        FROM item_list il
        LEFT JOIN sales_transactions st ON st.sku = il.item_number
            AND st.date >= CURRENT_DATE - INTERVAL '30 days'
        WHERE il.style_number = %s
        GROUP BY il.item_number
    )
    SELECT
        i.item_number as sku,
        i.size,
        i.color,
        i.total_qty as current_qty,
        COALESCE(s.velocity_per_day, 0) as velocity,
        -- Financial data from sku_financial_data table
        sfd.avg_selling_price,
        sfd.unit_cost,
        sfd.profit_per_unit,
        sfd.margin_pct
    FROM inventory i
    LEFT JOIN sales s ON i.item_number = s.item_number
    LEFT JOIN sku_financial_data sfd ON sfd.sku = i.item_number
    WHERE (i.total_qty > 0 OR COALESCE(s.velocity_per_day, 0) > 0)
      AND sfd.sku IS NOT NULL  -- Only include SKUs with financial data
    ORDER BY i.color, COALESCE(s.velocity_per_day, 0) DESC
    """

    try:
        df = db.execute_query(query, (style_number, style_number))

        # Group by color
        needs_by_color = {}

        for _, row in df.iterrows():
            color = row['color'] or 'Unknown'
            current_qty = int(row['current_qty'])
            velocity = float(row['velocity'])

            # Calculate target quantity and days of supply
            if velocity > 0:
                target_qty = max(int(velocity * target_days_supply), 1)
                days_supply = current_qty / velocity
            else:
                target_qty = max(1, current_qty)
                days_supply = 9999.0

            # Parse size
            size_parts = str(row['size']).split('X')
            size = size_parts[0].strip() if size_parts else str(row['size'])
            inseam = size_parts[1].strip() if len(size_parts) > 1 else ''

            # Financial metrics (with defaults if missing)
            selling_price = float(row['avg_selling_price'] or 0)
            unit_cost = float(row['unit_cost'] or 0)
            profit_per_unit = float(row['profit_per_unit'] or 0)
            margin_pct = float(row['margin_pct'] or 0)

            financial = SKUFinancials(
                sku=row['sku'],
                size=size,
                inseam=inseam,
                color=color,
                current_qty=current_qty,
                velocity=velocity,
                target_qty=target_qty,
                days_supply=days_supply,
                selling_price=selling_price,
                unit_cost=unit_cost,
                profit_per_unit=profit_per_unit,
                margin_pct=margin_pct
            )

            if color not in needs_by_color:
                needs_by_color[color] = []

            needs_by_color[color].append(financial)

        return needs_by_color

    except Exception as e:
        print(f"Error fetching financial needs for {style_number}: {e}")
        import traceback
        traceback.print_exc()
        return {}

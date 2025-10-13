"""Apply trained segmentation model classifications to ml_predictions table."""
import sys
sys.path.append('/home/runner/workspace/ml_service')

from models.segmentation_predictor import SegmentationPredictor
from utils.database import db
from datetime import datetime, timedelta

def apply_classifications():
    """Load trained model and store classifications in ml_predictions table."""
    
    print("Loading trained segmentation model...")
    try:
        model = SegmentationPredictor.load_latest()
        print(f"✓ Loaded model: {model.model_version}")
    except Exception as e:
        print(f"✗ Error loading model: {e}")
        return
    
    print("\nFetching product data from database...")
    
    sales_period_days = model.filters.get('sales_period_days', 90)
    
    query = f"""
        WITH style_metrics AS (
            SELECT
                i.style_number,
                MAX(i.item_name) as item_name,
                MAX(i.category) as category,
                MAX(i.vendor_name) as vendor_name,
                MAX(i.gender) as gender,
                SUM(COALESCE(i.gm_qty, 0) + COALESCE(i.hm_qty, 0) + COALESCE(i.nm_qty, 0) + COALESCE(i.lm_qty, 0) + COALESCE(i.hq_qty, 0)) as total_active_qty,
                AVG(i.order_cost::numeric) as avg_order_cost,
                AVG(i.selling_price::numeric) as avg_selling_price,
                AVG(CASE
                    WHEN i.selling_price::numeric > 0
                    THEN ((i.selling_price::numeric - i.order_cost::numeric) / i.selling_price::numeric * 100)
                    ELSE 0
                END) as avg_margin_percent,
                SUM((COALESCE(i.gm_qty, 0) + COALESCE(i.hm_qty, 0) + COALESCE(i.nm_qty, 0) + COALESCE(i.lm_qty, 0) + COALESCE(i.hq_qty, 0)) * i.order_cost::numeric) as inventory_value,
                MAX(i.last_rcvd) as last_received,
                COUNT(DISTINCT i.item_number) as receive_count,
                'All-Season' as seasonal_pattern,
                'Normal' as stock_status
            FROM item_list i
            WHERE i.style_number IS NOT NULL
            GROUP BY i.style_number
        ),
        style_sales AS (
            SELECT
                i.style_number,
                COUNT(*) FILTER (WHERE s.date >= CURRENT_DATE - INTERVAL '30 days') as units_sold_30d,
                COUNT(*) FILTER (WHERE s.date >= CURRENT_DATE - INTERVAL '{sales_period_days} days') as units_sold_90d,
                MAX(s.date) as last_sale_date
            FROM sales_transactions s
            JOIN item_list i ON s.sku = i.item_number
            WHERE i.style_number IS NOT NULL
            GROUP BY i.style_number
        )
        SELECT
            sm.*,
            COALESCE(ss.units_sold_30d, 0) as units_sold_30d,
            COALESCE(ss.units_sold_90d, 0) as units_sold_90d,
            COALESCE(ss.last_sale_date, NULL) as last_sale_date,
            CASE
                WHEN ss.last_sale_date IS NOT NULL
                THEN CURRENT_DATE - ss.last_sale_date
                ELSE NULL
            END as days_since_last_sale,
            CASE
                WHEN sm.last_received IS NOT NULL
                THEN CURRENT_DATE - sm.last_received
                ELSE NULL
            END as days_since_last_receive,
            CASE
                WHEN sm.total_active_qty > 0
                THEN COALESCE(ss.units_sold_30d, 0)::numeric / 30.0
                ELSE 0
            END as sales_velocity,
            CASE
                WHEN sm.avg_selling_price > 0
                THEN sm.avg_selling_price - sm.avg_order_cost
                ELSE 0
            END as margin_per_unit
        FROM style_metrics sm
        LEFT JOIN style_sales ss ON sm.style_number = ss.style_number
        WHERE sm.total_active_qty > 0
    """
    
    data = db.execute_query(query)
    print(f"✓ Fetched {len(data)} products")
    
    if data.empty:
        print("No products found to classify")
        return
    
    print("\nPredicting classifications...")
    results = model.predict(data)
    print(f"✓ Generated {len(results)} predictions")
    
    print("\nStoring predictions in ml_predictions table...")
    conn = db.get_connection()
    cursor = conn.cursor()
    
    # Clear old segmentation predictions for fresh start
    cursor.execute("DELETE FROM ml_predictions WHERE prediction_type = 'segmentation'")
    print(f"✓ Cleared old predictions")
    
    # Set valid_until to 30 days from now (re-classify monthly)
    valid_until = datetime.now() + timedelta(days=30)
    
    inserted_count = 0
    for _, row in results.iterrows():
        style_number = row['style_number']
        classification = row['ml_segment']
        confidence = float(row['ml_confidence']) if 'ml_confidence' in row else 0.95
        
        try:
            cursor.execute("""
                INSERT INTO ml_predictions 
                (prediction_type, style_number, prediction_text, confidence_score, model_version, valid_until)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, ('segmentation', style_number, classification, confidence, model.model_version, valid_until))
            inserted_count += 1
        except Exception as e:
            print(f"Error inserting {style_number}: {e}")
    
    conn.commit()
    cursor.close()
    conn.close()
    
    print(f"✓ Inserted {inserted_count} classification predictions")
    
    # Show sample of classifications
    print("\nClassification distribution:")
    classification_counts = results['ml_segment'].value_counts()
    for classification, count in classification_counts.items():
        print(f"  {classification}: {count} styles")

if __name__ == "__main__":
    apply_classifications()

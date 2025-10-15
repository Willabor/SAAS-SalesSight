"""FastAPI service for ML predictions."""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import uvicorn
from datetime import datetime

from config import settings
from models.transfer_predictor import TransferPredictor
from models.segmentation_predictor import SegmentationPredictor
from models.prepack_optimizer import PrepackOptimizer, PrepackContents, SKUNeed
from models.profit_based_optimizer import ProfitBasedPrepackOptimizer
from utils.prepack_data import (
    get_vendor_prepacks_by_color,
    get_style_inventory_needs_by_color,
    get_style_inventory_needs_with_financials,
    get_vendor_by_style,
    check_vendor_uses_prepacks,
    get_styles_needing_restock,
    get_available_colors_for_style
)

# Initialize FastAPI app
app = FastAPI(
    title="Inventory ML Service",
    description="Machine learning predictions for inventory management",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model instances (loaded on startup)
transfer_model: Optional[TransferPredictor] = None
segmentation_model: Optional[SegmentationPredictor] = None
prepack_optimizer: PrepackOptimizer = PrepackOptimizer()
profit_optimizer: ProfitBasedPrepackOptimizer = ProfitBasedPrepackOptimizer(max_boxes_per_prepack=3)  # 3 boxes max = 9 combinations per style (much faster)


# Pydantic models for API
class TransferPrediction(BaseModel):
    style_number: str
    item_name: str
    category: Optional[str]
    from_store: str
    to_store: str
    from_store_qty: float
    to_store_qty: float
    from_store_daily_sales: float
    to_store_daily_sales: float
    success_probability: float
    recommended_qty: int
    ml_priority: str
    ml_priority_score: float
    margin_percent: float
    model_version: str


class TransferPredictionResponse(BaseModel):
    success: bool
    count: int
    model_version: str
    generated_at: str
    predictions: List[TransferPrediction]


class MLDataFilters(BaseModel):
    sales_period_days: Optional[int] = None
    exclude_before: Optional[str] = None
    included_categories: Optional[List[str]] = []
    excluded_categories: Optional[List[str]] = []
    included_stores: Optional[List[str]] = []
    excluded_vendors: Optional[List[str]] = []
    included_genders: Optional[List[str]] = []
    min_price: Optional[float] = 0
    max_price: Optional[float] = 99999
    min_inventory: Optional[int] = 0
    max_inventory: Optional[int] = 99999
    exclude_zero_inventory: Optional[bool] = True
    include_receiving_history: Optional[bool] = False
    receiving_history_days: Optional[int] = 180
    selected_features: Optional[List[str]] = []

class TrainingRequest(BaseModel):
    days_back: int = 90
    new_arrivals_days: Optional[int] = 60
    best_seller_threshold: Optional[int] = 50
    core_high_threshold: Optional[int] = 40
    core_medium_threshold: Optional[int] = 20
    core_low_threshold: Optional[int] = 6
    clearance_days: Optional[int] = 180
    filters: Optional[Dict] = {}


class TrainingResponse(BaseModel):
    success: bool
    model_version: str
    metrics: Dict
    training_date: str


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_version: Optional[str]
    service_uptime: str


# Startup event
@app.on_event("startup")
async def startup_event():
    """Load the latest models on service startup."""
    global transfer_model, segmentation_model

    # Ensure model cache directory exists
    import os
    os.makedirs(settings.model_cache_dir, exist_ok=True)

    print("=" * 60)
    print("STARTING ML SERVICE")
    print("=" * 60)
    print(f"Port: {settings.port}")
    print(f"Host: {settings.ml_service_host}")
    print(f"Database URL: {settings.database_url[:30]}..." if settings.database_url else "Database URL: NOT SET")
    print(f"Model Cache Dir: {settings.model_cache_dir}")
    print("=" * 60)

    # Load transfer prediction model
    try:
        transfer_model = TransferPredictor.load_latest()
        print("✓ Transfer model loaded successfully")
        print(f"  Version: {transfer_model.model_version}")
    except FileNotFoundError:
        print("⚠ No trained transfer model found. Train using /api/ml/train endpoint")
        transfer_model = None
    except Exception as e:
        print(f"✗ Error loading transfer model: {e}")

    # Load segmentation model
    try:
        segmentation_model = SegmentationPredictor.load_latest()
        print("✓ Segmentation model loaded successfully")
        print(f"  Version: {segmentation_model.model_version}")
    except FileNotFoundError:
        print("⚠ No trained segmentation model found. Train using /api/ml/train-segmentation endpoint")
        segmentation_model = None
    except Exception as e:
        print(f"✗ Error loading segmentation model: {e}")
        import traceback
        traceback.print_exc()
        transfer_model = None

    print("=" * 60)
    print("ML SERVICE READY")
    print("=" * 60)


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint - service info."""
    return {
        "service": "Inventory ML Service",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "train": "/api/ml/train",
            "predict": "/api/ml/predict-transfers",
            "model_info": "/api/ml/model-info"
        }
    }


# Health check endpoint
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "model_loaded": transfer_model is not None,
        "model_version": transfer_model.model_version if transfer_model else None,
        "service_uptime": "running"
    }


# Training endpoint
@app.post("/api/ml/train", response_model=TrainingResponse)
async def train_model(request: TrainingRequest):
    """
    Train a new transfer prediction model.

    This endpoint trains a TabPFN model on historical data.
    It should be called periodically (e.g., weekly) to update the model.
    """
    global transfer_model

    try:
        print(f"Training request received: {request.days_back} days of data")

        # Create new predictor
        predictor = TransferPredictor()

        # Train
        metrics = predictor.train(days_back=request.days_back)

        # Save model
        predictor.save_model()

        # Update global model
        transfer_model = predictor

        return {
            "success": True,
            "model_version": predictor.model_version,
            "metrics": metrics,
            "training_date": predictor.training_date
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")


# Prediction endpoint
@app.post("/api/ml/predict-transfers", response_model=TransferPredictionResponse)
async def predict_transfers(limit: int = 20):
    """
    Generate ML-powered transfer recommendations.

    This endpoint uses the trained TabPFN model to predict which
    inventory transfers are most likely to result in sales.
    """

    if transfer_model is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Train a model first using /api/ml/train"
        )

    try:
        print(f"Prediction request received (limit={limit})")

        # Generate predictions
        results = transfer_model.predict_transfers(limit=limit)

        if len(results) == 0:
            return {
                "success": True,
                "count": 0,
                "model_version": transfer_model.model_version,
                "generated_at": datetime.now().isoformat(),
                "predictions": []
            }

        # Convert to response format
        predictions = []
        for _, row in results.iterrows():
            predictions.append(TransferPrediction(
                style_number=row['style_number'],
                item_name=row['item_name'],
                category=row.get('category'),
                from_store=row['from_store'],
                to_store=row['to_store'],
                from_store_qty=float(row['from_store_qty']),
                to_store_qty=float(row['to_store_qty']),
                from_store_daily_sales=float(row['from_store_daily_sales']),
                to_store_daily_sales=float(row['to_store_daily_sales']),
                success_probability=float(row['success_probability']),
                recommended_qty=int(row['recommended_qty']),
                ml_priority=row['ml_priority'],
                ml_priority_score=float(row['ml_priority_score']),
                margin_percent=float(row['margin_percent']),
                model_version=row['model_version']
            ))

        return {
            "success": True,
            "count": len(predictions),
            "model_version": transfer_model.model_version,
            "generated_at": datetime.now().isoformat(),
            "predictions": predictions
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


# Model info endpoint
@app.get("/api/ml/model-info")
async def get_model_info():
    """Get information about the currently loaded model."""

    if transfer_model is None:
        return {
            "loaded": False,
            "message": "No model loaded"
        }

    return {
        "loaded": True,
        "model_version": transfer_model.model_version,
        "training_date": transfer_model.training_date,
        "metrics": transfer_model.metrics,
        "feature_count": len(transfer_model.feature_columns) if transfer_model.feature_columns else 0
    }


# ==========================
# PRODUCT SEGMENTATION ENDPOINTS
# ==========================

@app.post("/api/ml/train-segmentation")
async def train_segmentation_model(request: TrainingRequest):
    """Train the product segmentation model with custom parameters."""
    global segmentation_model

    try:
        # Initialize new model with custom thresholds and filters
        segmentation_model = SegmentationPredictor(
            new_arrivals_days=request.new_arrivals_days,
            best_seller_threshold=request.best_seller_threshold,
            core_high_threshold=request.core_high_threshold,
            core_medium_threshold=request.core_medium_threshold,
            core_low_threshold=request.core_low_threshold,
            clearance_days=request.clearance_days,
            filters=request.filters
        )

        # Train the model
        metrics = segmentation_model.train(days_back=request.days_back)

        # Save model
        segmentation_model.save_model()

        return TrainingResponse(
            success=True,
            model_version=segmentation_model.model_version,
            metrics=metrics,
            training_date=segmentation_model.training_date.isoformat()
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")


@app.post("/api/ml/product-segmentation")
async def predict_product_segmentation():
    """Generate ML-powered product segmentation for Google Marketing."""
    from utils.database import db

    try:
        if segmentation_model is None:
            raise HTTPException(
                status_code=503,
                detail="Segmentation model not loaded. Train a model first using /api/ml/train-segmentation"
            )

        # Get model settings
        sales_period_days = segmentation_model.filters.get('sales_period_days', 90)

        # Fetch product data from database using model's trained settings
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
                    MAX(i.style_number_2) as classification,
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

        if data.empty:
            return {
                "metadata": {
                    "generatedDate": datetime.now().isoformat(),
                    "totalStyles": 0,
                    "totalActiveInventoryValue": 0,
                    "analysisDateRange": "No data",
                    "modelVersion": segmentation_model.model_version,
                    "mlPowered": True
                },
                "segments": {
                    "bestSellers": [],
                    "coreHighFrequency": [],
                    "coreMediumFrequency": [],
                    "coreLowFrequency": [],
                    "nonCoreRepeat": [],
                    "oneTimePurchase": [],
                    "newArrivals": [],
                    "summerItems": [],
                    "winterItems": [],
                    "clearanceCandidates": []
                }
            }

        # Predict segments using ML model
        results = segmentation_model.predict(data)

        # Enrich with marketing data
        def enrich_product(row):
            # Generate Google-optimized product title
            title_parts = []
            if row.get('vendor_name'):
                title_parts.append(row['vendor_name'])
            title_parts.append(row['item_name'])
            if row.get('category'):
                title_parts.append(f"- {row['category']}")
            product_title = " ".join(title_parts)[:150]  # Google limit

            # Generate keywords
            keywords = []
            if row.get('vendor_name'):
                keywords.append(row['vendor_name'].lower())
            if row.get('category'):
                keywords.append(row['category'].lower())
            if row.get('gender'):
                keywords.append(row['gender'].lower())
            keywords.extend(row['item_name'].lower().split()[:5])

            # Determine budget tier based on ML confidence + margin
            confidence = row.get('ml_confidence', 0)
            margin = row.get('avg_margin_percent', 0)
            score = (confidence * 60) + (margin * 0.4)

            if score >= 65:
                budget_tier = 'High'
                priority = 5
            elif score >= 45:
                budget_tier = 'Medium'
                priority = 3
            else:
                budget_tier = 'Low'
                priority = 1

            # Map segment to Google category
            category_map = {
                'Apparel & Accessories': row.get('category', 'Apparel & Accessories'),
                'default': 'Apparel & Accessories > Clothing'
            }
            google_category = category_map.get(row.get('category', ''), category_map['default'])

            import pandas as pd
            import numpy as np

            # Helper to safely convert to int, handling NaN
            def safe_int(value, default=0):
                if pd.isna(value) or value is None:
                    return None if default is None else default
                try:
                    return int(value)
                except (ValueError, TypeError):
                    return None if default is None else default

            # Helper to safely convert to float
            def safe_float(value, default=0.0):
                if pd.isna(value) or value is None:
                    return default
                try:
                    return float(value)
                except (ValueError, TypeError):
                    return default

            return {
                'styleNumber': row['style_number'],
                'itemName': row['item_name'],
                'category': row.get('category'),
                'vendorName': row.get('vendor_name'),
                'gender': row.get('gender'),
                'totalActiveQty': safe_int(row.get('total_active_qty'), 0),
                'avgOrderCost': safe_float(row.get('avg_order_cost'), 0),
                'avgSellingPrice': safe_float(row.get('avg_selling_price'), 0),
                'avgMarginPercent': safe_float(row.get('avg_margin_percent'), 0),
                'inventoryValue': safe_float(row.get('inventory_value'), 0),
                'classification': row.get('classification', 'Unknown'),
                'seasonalPattern': row.get('seasonal_pattern', 'All-Season'),
                'lastReceived': row.get('last_received').isoformat() if row.get('last_received') and not pd.isna(row.get('last_received')) else None,
                'daysSinceLastReceive': safe_int(row.get('days_since_last_receive'), None),
                'receiveCount': safe_int(row.get('receive_count'), 0),
                'stockStatus': row.get('stock_status', 'Normal'),
                'unitsSold30d': safe_int(row.get('units_sold_30d'), 0),
                'unitsSold90d': safe_int(row.get('units_sold_90d'), 0),
                'salesVelocity': safe_float(row.get('sales_velocity'), 0),
                'lastSaleDate': row.get('last_sale_date').isoformat() if row.get('last_sale_date') and not pd.isna(row.get('last_sale_date')) else None,
                'productTitle': product_title,
                'keywords': keywords,
                'googleCategory': google_category,
                'priority': priority,
                'budgetTier': budget_tier,
                'segment': row['ml_segment'],
                'marginPerUnit': safe_float(row.get('margin_per_unit'), 0),
            }

        # Organize by ML-predicted segments
        enriched_products = results.apply(enrich_product, axis=1).tolist()

        # Group by segments
        segments = {
            'bestSellers': [p for p in enriched_products if p['segment'] == 'Best Seller'],
            'coreHighFrequency': [p for p in enriched_products if p['segment'] == 'Core High'],
            'coreMediumFrequency': [p for p in enriched_products if p['segment'] == 'Core Medium'],
            'coreLowFrequency': [p for p in enriched_products if p['segment'] == 'Core Low'],
            'nonCoreRepeat': [p for p in enriched_products if p['segment'] == 'Non-Core Repeat'],
            'oneTimePurchase': [p for p in enriched_products if p['segment'] == 'One-Time'],
            'newArrivals': [p for p in enriched_products if p['segment'] == 'New Arrival'],
            'summerItems': [p for p in enriched_products if p['seasonalPattern'] == 'Summer'],
            'winterItems': [p for p in enriched_products if p['seasonalPattern'] == 'Winter'],
            'clearanceCandidates': [p for p in enriched_products if p['segment'] == 'Clearance'],
        }

        # Calculate metadata
        total_value = sum(p['inventoryValue'] for p in enriched_products)

        return {
            "metadata": {
                "generatedDate": datetime.now().isoformat(),
                "totalStyles": len(enriched_products),
                "totalActiveInventoryValue": total_value,
                "analysisDateRange": f"Last {sales_period_days} days",
                "modelVersion": segmentation_model.model_version,
                "mlPowered": True,
                "modelSettings": {
                    "salesPeriodDays": sales_period_days,
                    "newArrivalsDays": segmentation_model.new_arrivals_days,
                    "bestSellerThreshold": segmentation_model.best_seller_threshold,
                    "coreHighThreshold": segmentation_model.core_high_threshold,
                    "coreMediumThreshold": segmentation_model.core_medium_threshold,
                    "coreLowThreshold": segmentation_model.core_low_threshold,
                    "clearanceDays": segmentation_model.clearance_days
                }
            },
            "segments": segments,
            "mlInsights": {
                "segmentConfidence": {
                    seg: float(results[results['ml_segment'] == seg]['ml_confidence'].mean())
                    for seg in results['ml_segment'].unique()
                },
                "recommendedActions": [
                    f"Focus High budget tier on {len(segments['bestSellers'])} Best Sellers",
                    f"Launch campaigns for {len(segments['newArrivals'])} New Arrivals",
                    f"Clear {len(segments['clearanceCandidates'])} products with deep discounts"
                ]
            }
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Segmentation failed: {str(e)}")


# ==========================
# PREPACK OPTIMIZATION ENDPOINTS
# ⚠️  DRAFT/PROTOTYPE - FOR PLANNING REFERENCE ONLY ⚠️
# These endpoints were added during planning phase as proof-of-concept
# DO NOT USE IN PRODUCTION without review and approval
# ==========================

class PrepackRecommendationRequest(BaseModel):
    style_number: str
    target_days_supply: Optional[int] = 90
    max_waste_tolerance: Optional[float] = 0.30
    min_coverage_target: Optional[float] = 0.90


class PrepackRecommendationResponse(BaseModel):
    success: bool
    style_number: str
    vendor_name: Optional[str]
    uses_prepacks: bool
    current_network_days_supply: float
    urgency_level: str
    recommendation: str
    total_boxes: int
    total_pieces: int
    total_cost: float
    coverage_pct: float
    waste_pct: float
    score: float
    prepack_combinations: Dict[str, int]
    available_prepacks: List[str]
    message: Optional[str] = None


@app.post("/api/ml/prepack-recommendations", response_model=PrepackRecommendationResponse)
async def get_prepack_recommendations(request: PrepackRecommendationRequest):
    """
    Generate optimal prepack ordering recommendations for a style.

    Since ~70% of vendors ship prepacked boxes with fixed size assortments,
    this endpoint analyzes inventory needs and recommends which prepack boxes
    to order to minimize waste while meeting inventory targets.

    This solves a bin packing optimization problem.
    """

    try:
        style_number = request.style_number

        # Step 1: Determine vendor for this style
        vendor_name = get_vendor_by_style(style_number)

        if not vendor_name:
            return PrepackRecommendationResponse(
                success=False,
                style_number=style_number,
                vendor_name=None,
                uses_prepacks=False,
                current_network_days_supply=0,
                urgency_level="unknown",
                recommendation="Cannot determine vendor for this style",
                total_boxes=0,
                total_pieces=0,
                total_cost=0,
                coverage_pct=0,
                waste_pct=0,
                score=0,
                prepack_combinations={},
                available_prepacks=[],
                message="Style not found in receiving history"
            )

        # Step 2: Check if vendor uses prepacks
        uses_prepacks = check_vendor_uses_prepacks(vendor_name)

        if not uses_prepacks:
            return PrepackRecommendationResponse(
                success=True,
                style_number=style_number,
                vendor_name=vendor_name,
                uses_prepacks=False,
                current_network_days_supply=0,
                urgency_level="n/a",
                recommendation=f"{vendor_name} allows open stock ordering - no prepack optimization needed",
                total_boxes=0,
                total_pieces=0,
                total_cost=0,
                coverage_pct=1.0,
                waste_pct=0,
                score=100,
                prepack_combinations={},
                available_prepacks=[],
                message="This vendor ships open stock - order individual SKUs as needed"
            )

        # Step 3: Get available prepacks for this vendor/style
        available_prepacks = get_vendor_prepacks(vendor_name, style_number)

        if not available_prepacks:
            return PrepackRecommendationResponse(
                success=False,
                style_number=style_number,
                vendor_name=vendor_name,
                uses_prepacks=True,
                current_network_days_supply=0,
                urgency_level="unknown",
                recommendation="No prepack configurations found in database",
                total_boxes=0,
                total_pieces=0,
                total_cost=0,
                coverage_pct=0,
                waste_pct=0,
                score=0,
                prepack_combinations={},
                available_prepacks=[],
                message=f"Please add prepack configurations for {vendor_name} style {style_number}"
            )

        # Step 4: Get current inventory needs
        needs, network_days_supply = get_style_inventory_needs(
            style_number,
            target_days_supply=request.target_days_supply
        )

        # Step 5: Run optimization
        optimizer = PrepackOptimizer(
            max_waste_tolerance=request.max_waste_tolerance,
            min_coverage_target=request.min_coverage_target
        )

        solution = optimizer.optimize(
            needs=needs,
            available_prepacks=available_prepacks,
            current_network_days_supply=network_days_supply
        )

        # Step 6: Determine urgency level
        if network_days_supply < 14:
            urgency = "critical"
        elif network_days_supply < 30:
            urgency = "low"
        elif network_days_supply < 60:
            urgency = "monitor"
        elif network_days_supply < 120:
            urgency = "good"
        else:
            urgency = "healthy"

        return PrepackRecommendationResponse(
            success=True,
            style_number=style_number,
            vendor_name=vendor_name,
            uses_prepacks=True,
            current_network_days_supply=network_days_supply,
            urgency_level=urgency,
            recommendation=solution.recommendation,
            total_boxes=solution.total_boxes,
            total_pieces=solution.total_pieces,
            total_cost=solution.total_cost,
            coverage_pct=getattr(solution, 'coverage_pct', 0.0),  # May not exist for profit-based optimizer
            waste_pct=getattr(solution, 'waste_pct', 0.0),  # May not exist for profit-based optimizer
            score=solution.score,
            prepack_combinations=solution.prepack_combinations,
            available_prepacks=[p.prepack_name for p in available_prepacks],
            message=None
        )

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Prepack optimization failed: {str(e)}"
        )


@app.post("/api/ml/prepack-batch-recommendations")
async def get_prepack_batch_recommendations(limit: int = 20):
    """
    Generate color-aware prepack ordering recommendations for multiple styles.

    This is the production endpoint for Phase 2. It:
    1. Queries styles needing restock from prepack vendors
    2. For each style, analyzes inventory needs BY COLOR
    3. Generates color-specific prepack recommendations
    4. Returns recommendations in format: "5 boxes Pack A (Black) + 2 boxes Pack A (Olive)"

    CRITICAL: This endpoint is color-aware - each recommendation specifies both pack type AND color.
    """
    try:
        # Optimize performance: Minimal logging for production
        # print(f"Batch prepack recommendations requested (limit={limit})")

        # Step 1: Get styles needing restock from prepack vendors
        styles_needing_restock = get_styles_needing_restock(limit=limit)

        if not styles_needing_restock:
            return {
                "success": True,
                "count": 0,
                "generated_at": datetime.now().isoformat(),
                "recommendations": [],
                "message": "No styles currently need restocking"
            }

        # print(f"Found {len(styles_needing_restock)} styles needing restock")

        # Step 2: Process each style
        all_recommendations = []

        for style_info in styles_needing_restock:
            style_number = style_info['style_number']
            vendor_name = style_info['vendor_name']

            try:
                # print(f"Processing {style_number} ({vendor_name})...")

                # Get inventory needs WITH FINANCIAL DATA grouped by color
                needs_by_color = get_style_inventory_needs_with_financials(style_number, target_days_supply=90)

                if not needs_by_color:
                    # print(f"  → No financial needs data for {style_number}")
                    continue

                # print(f"  → Found needs for colors: {list(needs_by_color.keys())}")

                # Get available colors for this style
                available_colors = get_available_colors_for_style(style_number, vendor_name)

                if not available_colors:
                    # print(f"  → No colors configured for {style_number}")
                    continue

                # print(f"  → Available prepack colors: {available_colors}")

                # Get all prepacks for this style (all colors)
                all_prepacks = []
                for color in available_colors:
                    prepacks = get_vendor_prepacks_by_color(vendor_name, style_number, color)
                    if prepacks:
                        # Convert to PrepackContents format for optimizer
                        for pack in prepacks:
                            # Parse size and inseam from pack size distribution
                            contents = {}
                            for size_str, qty in pack['size_distribution'].items():
                                # Handle jeans format like "30W X 32L"
                                size_parts = str(size_str).split('X')
                                if len(size_parts) > 1:
                                    waist = size_parts[0].strip()
                                    inseam = size_parts[1].strip()
                                    contents[(waist, inseam)] = qty
                                else:
                                    # No inseam (e.g., shorts)
                                    contents[(size_str, '')] = qty

                            prepack_contents = PrepackContents(
                                prepack_id=pack['prepack_id'],
                                prepack_name=pack['prepack_name'],
                                vendor_name=pack['vendor_name'],
                                style_number=pack['style_number'],
                                color=pack['color'],
                                total_pieces=pack['total_pieces'],
                                cost_per_box=pack['cost_per_box'],
                                contents=contents
                            )
                            all_prepacks.append(prepack_contents)

                if not all_prepacks:
                    # print(f"  → No prepacks found for {style_number}")
                    continue

                # print(f"  → Found {len(all_prepacks)} prepack configurations")

                # Use intelligent optimizer to find best prepack combination
                # This considers size-level velocity and minimizes waste
                optimizer = PrepackOptimizer(
                    max_waste_tolerance=0.35,  # Allow up to 35% waste
                    min_coverage_target=0.85,  # Must cover at least 85% of needs
                    max_boxes_per_prepack=10   # Don't order more than 10 boxes of one type
                )

                # Run color-aware PROFIT-BASED optimization
                solution = profit_optimizer.optimize_color_aware(
                    needs_by_color=needs_by_color,
                    available_prepacks=all_prepacks,
                    current_network_days_supply=style_info['days_of_supply']
                )

                # print(f"  → Optimization result: {solution['total_boxes']} boxes, ${solution['total_cost']:.2f}, profit: ${solution.get('net_profit', 0):.2f}")

                if solution['total_boxes'] > 0:
                    # print(f"  ✓ Adding {style_number} to recommendations")
                    # Build color breakdown from optimizer solution
                    color_breakdown = []
                    for color, color_solution in solution.get('by_color', {}).items():
                        for prepack_name, box_count in color_solution.prepack_combinations.items():
                            if box_count > 0:
                                color_breakdown.append({
                                    'color': color,
                                    'pack_name': prepack_name,
                                    'boxes': box_count,
                                    'total_pieces': box_count * color_solution.total_pieces // color_solution.total_boxes,
                                    'cost_per_box': color_solution.total_cost / color_solution.total_boxes if color_solution.total_boxes > 0 else 0,
                                    'total_cost': color_solution.total_cost,
                                    'coverage_pct': getattr(color_solution, 'coverage_pct', 0.0),  # May not exist for profit-based optimizer
                                    'waste_pct': getattr(color_solution, 'waste_pct', 0.0)  # May not exist for profit-based optimizer
                                })

                    all_recommendations.append({
                        'style_number': style_number,
                        'item_name': style_info['item_name'],
                        'vendor_name': vendor_name,
                        'days_of_supply': style_info['days_of_supply'],
                        'avg_daily_sales': style_info['avg_daily_sales'],
                        'recommendation': solution['recommendation'],
                        'total_boxes': solution['total_boxes'],
                        'total_cost': solution['total_cost'],
                        'total_pieces': solution['total_pieces'],
                        'coverage_pct': solution.get('overall_coverage_pct', 0.0),  # Optional for profit-based
                        'waste_pct': solution.get('overall_waste_pct', 0.0),  # Optional for profit-based
                        'color_breakdown': color_breakdown,
                        'urgency': 'Critical' if style_info['days_of_supply'] < 7 else 'High' if style_info['days_of_supply'] < 14 else 'Medium',
                        # PROFIT-BASED METRICS
                        'net_profit': solution.get('net_profit', 0),
                        'roi_pct': solution.get('roi_pct', 0),
                        'profitability_tier': solution.get('profitability_tier', 'UNKNOWN'),
                        'profit_analysis': {
                            'expected_revenue': solution.get('expected_revenue', 0),
                            'prepack_cost': solution.get('total_cost', 0),
                            'holding_cost': solution.get('holding_cost', 0),
                            'opportunity_cost': solution.get('opportunity_cost', 0)
                        },
                        'optimization_details': {
                            'size_velocity_aware': True,
                            'colors_optimized': len(solution.get('by_color', {})),
                            'algorithm': 'profit_based_optimization',
                            'profit_maximizing': True
                        }
                    })

            except Exception as e:
                print(f"Error processing style {style_number}: {e}")
                continue

        return {
            "success": True,
            "count": len(all_recommendations),
            "generated_at": datetime.now().isoformat(),
            "recommendations": all_recommendations,
            "message": f"Processed {len(styles_needing_restock)} styles, generated {len(all_recommendations)} recommendations"
        }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Batch prepack recommendations failed: {str(e)}"
        )


# Main entry point (for local development only)
# In production, use: uvicorn main:app --host 0.0.0.0 --port $PORT
if __name__ == "__main__":
    import os
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        log_level="info"
    )


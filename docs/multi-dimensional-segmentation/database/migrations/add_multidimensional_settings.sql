-- Migration: Add Multi-Dimensional Segmentation Settings
-- Date: 2025-10-08
-- Description: Add new columns for sales-based and inventory-based classification

-- Add new columns to receiving_metrics_settings table
ALTER TABLE receiving_metrics_settings

-- NEW ITEMS
ADD COLUMN IF NOT EXISTS new_item_must_have_sold BOOLEAN DEFAULT false,

-- CORE ITEMS
ADD COLUMN IF NOT EXISTS core_item_min_sales_months INTEGER DEFAULT 6,
ADD COLUMN IF NOT EXISTS core_item_max_days_since_last_sold INTEGER DEFAULT 90,
ADD COLUMN IF NOT EXISTS core_item_max_days_since_last_received INTEGER DEFAULT 90,
ADD COLUMN IF NOT EXISTS core_item_min_inventory_or_recent_sales BOOLEAN DEFAULT true,

-- SEASONAL ITEMS
ADD COLUMN IF NOT EXISTS seasonal_item_sales_concentration_pct INTEGER DEFAULT 15,
ADD COLUMN IF NOT EXISTS seasonal_item_max_days_since_activity INTEGER DEFAULT 365,

-- DISCONTINUED ITEMS
ADD COLUMN IF NOT EXISTS discontinued_min_days_since_sold INTEGER DEFAULT 180,
ADD COLUMN IF NOT EXISTS discontinued_min_days_since_received INTEGER DEFAULT 180,
ADD COLUMN IF NOT EXISTS discontinued_requires_zero_inventory BOOLEAN DEFAULT true,

-- CLEARANCE ITEMS
ADD COLUMN IF NOT EXISTS clearance_min_inventory INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS clearance_max_recent_sales INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS clearance_min_days_since_received INTEGER DEFAULT 180,
ADD COLUMN IF NOT EXISTS clearance_min_days_of_supply INTEGER DEFAULT 180,

-- ONE-TIME BUY
ADD COLUMN IF NOT EXISTS one_time_buy_min_days_since_first INTEGER DEFAULT 90,
ADD COLUMN IF NOT EXISTS one_time_buy_max_days_since_sold INTEGER DEFAULT 90;

-- Update item_receiving_metrics table
ALTER TABLE item_receiving_metrics

ADD COLUMN IF NOT EXISTS total_sales_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sales_months_last_year INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS sales_last_90days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS days_of_supply NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS has_seasonal_sales_pattern BOOLEAN DEFAULT false;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_transactions_sku_date ON sales_transactions(sku, date);
CREATE INDEX IF NOT EXISTS idx_item_list_last_sold ON item_list(last_sold);
CREATE INDEX IF NOT EXISTS idx_item_list_last_rcvd ON item_list(last_rcvd);
CREATE INDEX IF NOT EXISTS idx_receiving_lines_item ON receiving_lines(item_number);
CREATE INDEX IF NOT EXISTS idx_item_receiving_metrics_lifecycle ON item_receiving_metrics(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_item_receiving_metrics_sales_months ON item_receiving_metrics(sales_months_last_year);
CREATE INDEX IF NOT EXISTS idx_item_receiving_metrics_days_of_supply ON item_receiving_metrics(days_of_supply);

-- Insert default settings if none exist
INSERT INTO receiving_metrics_settings (
  new_item_days_from_creation,
  new_item_max_receives,
  new_item_must_have_sold,
  core_item_min_sales_months,
  core_item_min_receives,
  core_item_max_days_between_receives,
  core_item_max_days_since_last_sold,
  core_item_max_days_since_last_received,
  core_item_min_inventory_or_recent_sales,
  seasonal_item_min_years,
  seasonal_item_sales_concentration_pct,
  seasonal_item_min_days_between_receives,
  seasonal_item_max_days_since_activity,
  seasonal_overrides_discontinued,
  discontinued_min_days_since_sold,
  discontinued_min_days_since_received,
  discontinued_requires_zero_inventory,
  clearance_min_inventory,
  clearance_max_recent_sales,
  clearance_min_days_since_received,
  clearance_min_days_of_supply,
  one_time_buy_max_receives,
  one_time_buy_min_days_since_first,
  one_time_buy_max_days_since_sold,
  is_active,
  created_by
)
SELECT 
  30, 2, false,
  6, 5, 60, 90, 90, true,
  2, 15, 180, 365, true,
  180, 180, true,
  10, 3, 180, 180,
  2, 90, 90,
  true, 'system'
WHERE NOT EXISTS (
  SELECT 1 FROM receiving_metrics_settings WHERE is_active = true
);

-- Verification
SELECT 
  'Migration completed successfully!' as status,
  COUNT(*) as total_settings
FROM receiving_metrics_settings;

SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'receiving_metrics_settings'
  AND column_name LIKE '%clearance%'
ORDER BY column_name;

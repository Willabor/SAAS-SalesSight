-- ============================================
-- VALIDATION & DEBUGGING SQL QUERIES
-- Multi-Dimensional Product Segmentation
-- ============================================

-- 1. OVERALL HEALTH CHECK
SELECT 
  lifecycle_stage,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM item_receiving_metrics
WHERE lifecycle_stage IS NOT NULL
GROUP BY lifecycle_stage
ORDER BY count DESC;

-- 2. VALIDATE CLEARANCE CLASSIFICATION
SELECT 
  i.item_number,
  i.item_name,
  i.avail_qty as inventory,
  m.sales_last_90days,
  m.days_of_supply,
  m.days_since_last_receive,
  m.lifecycle_stage,
  CASE 
    WHEN i.avail_qty < 10 THEN '❌ Inventory too low'
    WHEN m.sales_last_90days > 3 THEN '❌ Sales too high'
    WHEN m.days_since_last_receive < 180 THEN '❌ Recently received'
    WHEN m.days_of_supply < 180 THEN '❌ Supply days too low'
    ELSE '✓ Valid'
  END as validation
FROM item_list i
INNER JOIN item_receiving_metrics m ON i.item_number = m.item_number
WHERE m.lifecycle_stage = 'Clearance'
ORDER BY m.days_of_supply DESC
LIMIT 50;

-- 3. FIND ZOMBIE CORE ITEMS
SELECT 
  i.item_number,
  i.item_name,
  m.sales_months_last_year,
  EXTRACT(EPOCH FROM (CURRENT_DATE - i.last_sold)) / 86400 as days_since_last_sold,
  m.lifecycle_stage,
  '❌ ZOMBIE - Should not be Core' as issue
FROM item_list i
INNER JOIN item_receiving_metrics m ON i.item_number = m.item_number
WHERE m.lifecycle_stage = 'Core'
  AND EXTRACT(EPOCH FROM (CURRENT_DATE - i.last_sold)) / 86400 > 120;

-- 4. VALIDATE SEASONAL ITEMS
WITH sales_by_month AS (
  SELECT 
    sku as item_number,
    EXTRACT(MONTH FROM date) as sale_month,
    COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY sku) as sales_pct
  FROM sales_transactions
  WHERE sku IN (
    SELECT item_number 
    FROM item_receiving_metrics 
    WHERE lifecycle_stage = 'Seasonal'
  )
  GROUP BY sku, EXTRACT(MONTH FROM date)
)
SELECT 
  m.item_number,
  i.item_name,
  m.unique_receive_years,
  MAX(s.sales_pct) as max_month_concentration,
  m.lifecycle_stage,
  CASE 
    WHEN m.unique_receive_years < 2 THEN '❌ Not enough years'
    WHEN MAX(s.sales_pct) < 15 THEN '❌ Sales not concentrated'
    ELSE '✓ Valid'
  END as validation
FROM item_receiving_metrics m
INNER JOIN item_list i ON m.item_number = i.item_number
LEFT JOIN sales_by_month s ON m.item_number = s.item_number
WHERE m.lifecycle_stage = 'Seasonal'
GROUP BY m.item_number, i.item_name, m.unique_receive_years, m.lifecycle_stage
LIMIT 50;

-- 5. VALIDATE NEW ITEMS
SELECT 
  i.item_number,
  i.item_name,
  i.creation_date,
  EXTRACT(EPOCH FROM (CURRENT_DATE - i.creation_date)) / 86400 as days_since_creation,
  m.total_receive_count,
  m.lifecycle_stage,
  CASE 
    WHEN EXTRACT(EPOCH FROM (CURRENT_DATE - i.creation_date)) / 86400 > 60 THEN '⚠️ Old for "New"'
    WHEN m.total_receive_count > 2 THEN '❌ Too many receives'
    ELSE '✓ Valid'
  END as validation
FROM item_list i
INNER JOIN item_receiving_metrics m ON i.item_number = m.item_number
WHERE m.lifecycle_stage = 'New'
ORDER BY i.creation_date DESC
LIMIT 50;

-- 6. VALIDATE DISCONTINUED ITEMS
SELECT 
  i.item_number,
  i.item_name,
  i.avail_qty,
  EXTRACT(EPOCH FROM (CURRENT_DATE - i.last_sold)) / 86400 as days_since_last_sold,
  EXTRACT(EPOCH FROM (CURRENT_DATE - i.last_rcvd)) / 86400 as days_since_last_received,
  m.lifecycle_stage,
  CASE 
    WHEN i.avail_qty > 0 THEN '⚠️ Has inventory'
    WHEN EXTRACT(EPOCH FROM (CURRENT_DATE - i.last_sold)) / 86400 < 180 THEN '❌ Sold recently'
    ELSE '✓ Valid'
  END as validation
FROM item_list i
INNER JOIN item_receiving_metrics m ON i.item_number = m.item_number
WHERE m.lifecycle_stage = 'Discontinued'
LIMIT 50;

-- 7. DATA QUALITY CHECK
SELECT 
  'Total Items in Item List' as metric,
  COUNT(*) as count
FROM item_list
UNION ALL
SELECT 
  'Items with Sales Data',
  COUNT(DISTINCT sku)
FROM sales_transactions
UNION ALL
SELECT 
  'Items with Receiving Data',
  COUNT(DISTINCT item_number)
FROM receiving_lines
UNION ALL
SELECT 
  'Items with Calculated Metrics',
  COUNT(*)
FROM item_receiving_metrics;

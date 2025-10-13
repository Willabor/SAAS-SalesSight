-- ============================================================================
-- SALES DATA VERIFICATION QUERIES
-- Purpose: Validate the sales data in the database matches expected totals
-- Expected Total: $15,473,769.23 (net sales)
-- ============================================================================

-- Query 1: Overall Sales Summary
-- This should match your CSV file total
SELECT
  COUNT(*) as total_transactions,
  COUNT(DISTINCT receipt_number) as unique_receipts,
  COUNT(DISTINCT store) as unique_stores,
  SUM(CAST(price AS DECIMAL))::MONEY as total_revenue,
  MIN(date) as earliest_transaction,
  MAX(date) as latest_transaction
FROM sales_transactions;

-- Expected Results:
-- total_transactions: ~379,344
-- total_revenue: $15,473,769.23
-- ============================================================================

-- Query 2: Transaction Type Breakdown
-- Analyze sales by transaction type
SELECT
  transaction_store_type,
  COUNT(*) as transaction_count,
  SUM(CAST(price AS DECIMAL))::MONEY as total_amount,
  AVG(CAST(price AS DECIMAL))::MONEY as avg_amount,
  MIN(CAST(price AS DECIMAL))::MONEY as min_amount,
  MAX(CAST(price AS DECIMAL))::MONEY as max_amount
FROM sales_transactions
GROUP BY transaction_store_type
ORDER BY transaction_count DESC;

-- Expected Top Results:
-- Type 1: ~369,070 transactions (regular sales)
-- Type -1: ~7,458 transactions (returns) - total should be negative
-- ============================================================================

-- Query 3: Return Transaction Analysis
-- Verify all returns are properly negated
SELECT
  COUNT(*) as return_count,
  SUM(CAST(price AS DECIMAL))::MONEY as return_total,
  AVG(CAST(price AS DECIMAL))::MONEY as avg_return,
  MIN(CAST(price AS DECIMAL))::MONEY as largest_return,
  MAX(CAST(price AS DECIMAL))::MONEY as smallest_return
FROM sales_transactions
WHERE transaction_store_type = '-1';

-- Expected Results:
-- return_count: 7,458
-- return_total: -$359,144.54 (should be NEGATIVE)
-- All amounts should be negative

-- ⚠️ CRITICAL CHECK: Returns with POSITIVE prices (this should return 0 rows)
SELECT
  COUNT(*) as incorrect_return_count,
  SUM(CAST(price AS DECIMAL))::MONEY as incorrect_total
FROM sales_transactions
WHERE transaction_store_type = '-1'
  AND CAST(price AS DECIMAL) > 0;

-- Expected: 0 rows (if this returns data, you have a problem!)
-- ============================================================================

-- Query 4: Discount Analysis
-- Analyze promotional discounts (ONLINE DISCOUNT TAKEN, etc.)
SELECT
  COUNT(*) as discount_count,
  SUM(CAST(price AS DECIMAL))::MONEY as discount_total,
  AVG(CAST(price AS DECIMAL))::MONEY as avg_discount
FROM sales_transactions
WHERE item_name LIKE '%ONLINE DISCOUNT TAKEN%'
   OR item_name LIKE '%DISCOUNT%'
   OR (transaction_store_type = '1' AND CAST(price AS DECIMAL) < 0);

-- Expected Results:
-- discount_count: ~5,106
-- discount_total: -$98,919.69 (negative)
-- ============================================================================

-- Query 5: ONLINE DISCOUNT TAKEN Analysis
-- Specific analysis of online promotional discounts
SELECT
  'ONLINE DISCOUNT TAKEN' as discount_type,
  COUNT(*) as count,
  SUM(CAST(price AS DECIMAL))::MONEY as total,
  AVG(CAST(price AS DECIMAL))::MONEY as average,
  MIN(CAST(price AS DECIMAL))::MONEY as min_discount,
  MAX(CAST(price AS DECIMAL))::MONEY as max_discount
FROM sales_transactions
WHERE item_name LIKE '%ONLINE DISCOUNT TAKEN%';

-- Expected Results:
-- count: 4,829
-- total: -$74,116.19
-- average: ~-$15.35
-- ============================================================================

-- Query 6: Sales by Store
-- Compare revenue across different store locations
SELECT
  store,
  COUNT(*) as transaction_count,
  COUNT(DISTINCT receipt_number) as receipt_count,
  SUM(CAST(price AS DECIMAL))::MONEY as total_revenue,
  AVG(CAST(price AS DECIMAL))::MONEY as avg_transaction,
  SUM(CASE WHEN transaction_store_type = '-1' THEN 1 ELSE 0 END) as return_count,
  SUM(CASE WHEN transaction_store_type = '-1' THEN CAST(price AS DECIMAL) ELSE 0 END)::MONEY as return_total
FROM sales_transactions
GROUP BY store
ORDER BY total_revenue DESC;

-- This shows revenue breakdown by store location
-- ============================================================================

-- Query 7: Daily Sales Trend
-- Analyze sales patterns over time
SELECT
  date,
  COUNT(*) as transactions,
  COUNT(DISTINCT receipt_number) as receipts,
  SUM(CAST(price AS DECIMAL))::MONEY as daily_revenue,
  SUM(CASE WHEN transaction_store_type = '-1' THEN CAST(price AS DECIMAL) ELSE 0 END)::MONEY as daily_returns
FROM sales_transactions
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY date
ORDER BY date DESC
LIMIT 30;

-- Shows last 30 days of sales activity
-- ============================================================================

-- Query 8: Negative Price Items (Non-Returns)
-- Find all negative prices that are NOT returns
SELECT
  transaction_store_type,
  sku,
  item_name,
  COUNT(*) as count,
  SUM(CAST(price AS DECIMAL))::MONEY as total
FROM sales_transactions
WHERE CAST(price AS DECIMAL) < 0
  AND transaction_store_type != '-1'
GROUP BY transaction_store_type, sku, item_name
ORDER BY total;

-- This shows all discount/adjustment line items
-- Expected to see ONLINE DISCOUNT TAKEN at the top
-- ============================================================================

-- Query 9: Data Quality Check
-- Identify potential data issues
SELECT
  'Missing SKU' as issue_type,
  COUNT(*) as count
FROM sales_transactions
WHERE sku IS NULL OR sku = ''

UNION ALL

SELECT
  'Missing Item Name' as issue_type,
  COUNT(*) as count
FROM sales_transactions
WHERE item_name IS NULL OR item_name = ''

UNION ALL

SELECT
  'Missing Store' as issue_type,
  COUNT(*) as count
FROM sales_transactions
WHERE store IS NULL OR store = ''

UNION ALL

SELECT
  'Missing Receipt Number' as issue_type,
  COUNT(*) as count
FROM sales_transactions
WHERE receipt_number IS NULL OR receipt_number = ''

UNION ALL

SELECT
  'Zero Price' as issue_type,
  COUNT(*) as count
FROM sales_transactions
WHERE CAST(price AS DECIMAL) = 0

UNION ALL

SELECT
  'Missing Transaction Type' as issue_type,
  COUNT(*) as count
FROM sales_transactions
WHERE transaction_store_type IS NULL OR transaction_store_type = '';

-- Shows data quality metrics
-- ============================================================================

-- Query 10: QuickBooks Reconciliation
-- Calculate what QuickBooks would show vs. what we show
WITH sales_breakdown AS (
  SELECT
    SUM(CAST(price AS DECIMAL)) as total_all_transactions,
    SUM(CASE WHEN transaction_store_type = '-1' THEN CAST(price AS DECIMAL) ELSE 0 END) as total_returns,
    SUM(CASE WHEN transaction_store_type = '1' AND CAST(price AS DECIMAL) < 0 THEN CAST(price AS DECIMAL) ELSE 0 END) as total_discounts,
    SUM(CASE WHEN transaction_store_type = '1' AND CAST(price AS DECIMAL) > 0 THEN CAST(price AS DECIMAL) ELSE 0 END) as total_positive_sales
  FROM sales_transactions
)
SELECT
  total_all_transactions::MONEY as "Your System Total (Net Sales)",
  (total_positive_sales + total_returns)::MONEY as "Without Discount Lines",
  (total_positive_sales)::MONEY as "QuickBooks Estimate (Gross Sales)",
  total_returns::MONEY as "Total Returns",
  total_discounts::MONEY as "Total Discount Lines",
  (total_positive_sales - total_all_transactions)::MONEY as "Difference from QB"
FROM sales_breakdown;

-- This estimates what QuickBooks would show vs. your system
-- Expected:
-- Your System Total: ~$15,473,769.23
-- QuickBooks Estimate: ~$15,578,826.26
-- Difference: ~$105,057.03
-- ============================================================================

-- Query 11: Top 20 Most Returned Items
-- Identify items with high return rates
SELECT
  sku,
  item_name,
  COUNT(*) as return_count,
  SUM(CAST(price AS DECIMAL))::MONEY as return_total,
  AVG(CAST(price AS DECIMAL))::MONEY as avg_return_value
FROM sales_transactions
WHERE transaction_store_type = '-1'
GROUP BY sku, item_name
ORDER BY return_count DESC
LIMIT 20;

-- Shows which products are returned most frequently
-- ============================================================================

-- Query 12: Upload History Summary
-- Check when data was last uploaded
SELECT
  file_name,
  upload_type,
  upload_mode,
  total_records,
  successful_records,
  failed_records,
  skipped_records,
  uploaded_at,
  CASE
    WHEN failed_records = 0 THEN 'Clean Upload ✅'
    WHEN failed_records < total_records * 0.01 THEN 'Minor Issues ⚠️'
    ELSE 'Major Issues ❌'
  END as status
FROM upload_history
WHERE upload_type = 'sales_transactions'
ORDER BY uploaded_at DESC
LIMIT 10;

-- Shows recent sales data uploads and their success rates
-- ============================================================================

-- Query 13: Monthly Revenue Trend
-- Analyze sales trends by month
SELECT
  TO_CHAR(date, 'YYYY-MM') as month,
  COUNT(*) as transactions,
  COUNT(DISTINCT receipt_number) as receipts,
  SUM(CAST(price AS DECIMAL))::MONEY as revenue,
  SUM(CASE WHEN transaction_store_type = '-1' THEN CAST(price AS DECIMAL) ELSE 0 END)::MONEY as returns,
  SUM(CASE WHEN CAST(price AS DECIMAL) < 0 AND transaction_store_type != '-1' THEN CAST(price AS DECIMAL) ELSE 0 END)::MONEY as discounts
FROM sales_transactions
WHERE date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY TO_CHAR(date, 'YYYY-MM')
ORDER BY month DESC;

-- Shows monthly sales trends for the last year
-- ============================================================================

-- SUMMARY VERIFICATION QUERY
-- Run this single query to get all key metrics
SELECT
  'Total Transactions' as metric,
  COUNT(*)::TEXT as value
FROM sales_transactions

UNION ALL

SELECT
  'Total Revenue',
  SUM(CAST(price AS DECIMAL))::MONEY::TEXT
FROM sales_transactions

UNION ALL

SELECT
  'Return Count',
  COUNT(*)::TEXT
FROM sales_transactions
WHERE transaction_store_type = '-1'

UNION ALL

SELECT
  'Return Total',
  SUM(CAST(price AS DECIMAL))::MONEY::TEXT
FROM sales_transactions
WHERE transaction_store_type = '-1'

UNION ALL

SELECT
  'Discount Count',
  COUNT(*)::TEXT
FROM sales_transactions
WHERE CAST(price AS DECIMAL) < 0 AND transaction_store_type != '-1'

UNION ALL

SELECT
  'Discount Total',
  SUM(CAST(price AS DECIMAL))::MONEY::TEXT
FROM sales_transactions
WHERE CAST(price AS DECIMAL) < 0 AND transaction_store_type != '-1'

UNION ALL

SELECT
  'Online Discount Count',
  COUNT(*)::TEXT
FROM sales_transactions
WHERE item_name LIKE '%ONLINE DISCOUNT TAKEN%'

UNION ALL

SELECT
  'Online Discount Total',
  SUM(CAST(price AS DECIMAL))::MONEY::TEXT
FROM sales_transactions
WHERE item_name LIKE '%ONLINE DISCOUNT TAKEN%'

UNION ALL

SELECT
  'Incorrect Returns (should be 0)',
  COUNT(*)::TEXT
FROM sales_transactions
WHERE transaction_store_type = '-1' AND CAST(price AS DECIMAL) > 0;

-- ============================================================================
-- END OF VERIFICATION QUERIES
-- ============================================================================

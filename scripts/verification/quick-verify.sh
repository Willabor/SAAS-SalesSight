#!/bin/bash

# Quick verification script - run this to check your database
# Usage: ./quick-verify.sh

echo "╔════════════════════════════════════════════════════════════════════════╗"
echo "║                     SALES DATA QUICK VERIFICATION                      ║"
echo "╚════════════════════════════════════════════════════════════════════════╝"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not set. Run: export DATABASE_URL='your-connection-string'"
  exit 1
fi

echo "Running database verification queries..."
echo ""

# Run the quick verification query
psql "$DATABASE_URL" << 'EOF'
\timing off
\pset border 2
\pset format wrapped

-- Quick Summary Verification
SELECT
  '📊 TOTAL TRANSACTIONS' as "Metric",
  COUNT(*)::TEXT as "Value",
  '379,344 expected' as "Expected"
FROM sales_transactions

UNION ALL

SELECT
  '💰 TOTAL REVENUE',
  '$' || TO_CHAR(SUM(CAST(price AS DECIMAL)), 'FM999,999,999.00'),
  '$15,473,769.23 expected'
FROM sales_transactions

UNION ALL

SELECT
  '🔄 RETURN COUNT',
  COUNT(*)::TEXT,
  '7,458 expected'
FROM sales_transactions
WHERE transaction_store_type = '-1'

UNION ALL

SELECT
  '🔄 RETURN TOTAL',
  '$' || TO_CHAR(SUM(CAST(price AS DECIMAL)), 'FM999,999,999.00'),
  '$-359,144.54 expected'
FROM sales_transactions
WHERE transaction_store_type = '-1'

UNION ALL

SELECT
  '🎫 DISCOUNT COUNT',
  COUNT(*)::TEXT,
  '4,829 expected'
FROM sales_transactions
WHERE item_name LIKE '%ONLINE DISCOUNT TAKEN%'

UNION ALL

SELECT
  '🎫 DISCOUNT TOTAL',
  '$' || TO_CHAR(SUM(CAST(price AS DECIMAL)), 'FM999,999,999.00'),
  '$-74,116.19 expected'
FROM sales_transactions
WHERE item_name LIKE '%ONLINE DISCOUNT TAKEN%'

UNION ALL

SELECT
  '⚠️  INCORRECT RETURNS',
  COUNT(*)::TEXT,
  '0 expected (❌ if > 0)'
FROM sales_transactions
WHERE transaction_store_type = '-1' AND CAST(price AS DECIMAL) > 0;

EOF

echo ""
echo "╔════════════════════════════════════════════════════════════════════════╗"
echo "║                            INTERPRETATION                              ║"
echo "╚════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "✅ PASS if all values match expected"
echo "❌ FAIL if 'Incorrect Returns' > 0 (returns have positive prices)"
echo ""
echo "If all checks pass:"
echo "  - Your database is correct"
echo "  - Your system total is accurate"
echo "  - The QuickBooks discrepancy is explained by discount exclusions"
echo ""
echo "Full report: SALES_DISCREPANCY_INVESTIGATION_REPORT.md"
echo "Quick summary: QUICK_SUMMARY.md"
echo ""

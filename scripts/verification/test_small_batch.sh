#!/bin/bash
# Test multi-dimensional calculator with small batch

echo "🧪 Testing Multi-Dimensional Calculator with Small Batch"
echo "==========================================================="
echo ""

# Get 10 sample style numbers
echo "📋 Getting 10 sample style numbers..."
STYLES=$(psql $DATABASE_URL -t -c "SELECT style_number FROM item_list WHERE style_number IS NOT NULL LIMIT 10;" | tr '\n' ',' | sed 's/,$//' | jq -R 'split(",") | map(gsub("^[[:space:]]+|[[:space:]]+$";""))')

echo "Style numbers: $STYLES"
echo ""

# Call the API
echo "🚀 Calling multi-dimensional calculator..."
RESULT=$(curl -s -X POST 'http://localhost:5000/api/receiving-metrics/calculate-batch?mode=multidimensional' \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION_COOKIE" \
  -d "{\"styleNumbers\": $STYLES}")

echo "Result: $RESULT"
echo ""

# Check results
echo "📊 Checking calculated metrics..."
psql $DATABASE_URL -c "SELECT
  lifecycle_stage,
  COUNT(*) as count,
  COUNT(days_of_supply) as has_days_supply
FROM item_receiving_metrics
GROUP BY lifecycle_stage
ORDER BY count DESC;"

echo ""
echo "✅ Test complete!"

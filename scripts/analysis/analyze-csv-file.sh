#!/bin/bash

# ============================================================================
# CSV Sales Data Analysis Script
# Purpose: Verify the CSV file totals and return handling
# Usage: ./analyze-csv-file.sh [path-to-csv-file]
# ============================================================================

CSV_FILE="${1:-10-08-2025/Consolidated_Sales_Data (2).csv}"

if [ ! -f "$CSV_FILE" ]; then
  echo "❌ Error: File not found: $CSV_FILE"
  echo "Usage: $0 [path-to-csv-file]"
  exit 1
fi

echo "============================================================================"
echo "SALES DATA CSV ANALYSIS"
echo "============================================================================"
echo "File: $CSV_FILE"
echo "Date: $(date)"
echo ""

# Count total lines
echo "📊 FILE STATISTICS"
echo "────────────────────────────────────────────────────────────────────────────"
TOTAL_LINES=$(wc -l < "$CSV_FILE")
TOTAL_TRANSACTIONS=$((TOTAL_LINES - 1))
echo "Total lines (including header): $(printf "%'d" $TOTAL_LINES)"
echo "Total transactions: $(printf "%'d" $TOTAL_TRANSACTIONS)"
echo ""

# Calculate total sales
echo "💰 REVENUE CALCULATION"
echo "────────────────────────────────────────────────────────────────────────────"
awk -F, 'NR>1 {sum += $7; count++} END {
  printf "Total transactions processed: %'"'"'d\n", count;
  printf "Total revenue: $%'"'"'.2f\n", sum;
  printf "Average transaction: $%.2f\n", sum/count;
}' "$CSV_FILE"
echo ""

# Analyze returns (Transaction Type -1)
echo "🔄 RETURN ANALYSIS (Type -1)"
echo "────────────────────────────────────────────────────────────────────────────"
awk -F, 'NR>1 && $6=="-1" {
  count++;
  sum += $7;
  if ($7 > 0) positive++;
  if ($7 < 0) negative++;
  if ($7 == 0) zero++;
} END {
  printf "Return count: %'"'"'d\n", count;
  printf "Return total: $%'"'"'.2f\n", sum;
  printf "Average return: $%.2f\n", sum/count;
  printf "\n";
  printf "Price distribution:\n";
  printf "  Positive prices: %'"'"'d (❌ WRONG - should be 0)\n", positive;
  printf "  Negative prices: %'"'"'d (✅ CORRECT)\n", negative;
  printf "  Zero prices: %'"'"'d\n", zero;
  printf "\n";
  if (positive > 0) {
    printf "⚠️  WARNING: Returns have POSITIVE prices! This will inflate sales.\n";
    printf "   This indicates the return negation fix has NOT been applied.\n";
  } else {
    printf "✅ PASS: All returns have negative prices (correctly processed)\n";
  }
}' "$CSV_FILE"
echo ""

# Analyze discount line items
echo "🎫 DISCOUNT LINE ITEM ANALYSIS"
echo "────────────────────────────────────────────────────────────────────────────"

# Online discounts
awk -F, 'NR>1 && $5 ~ /ONLINE DISCOUNT TAKEN/ {
  count++;
  sum += $7;
} END {
  printf "ONLINE DISCOUNT TAKEN:\n";
  printf "  Count: %'"'"'d items\n", count;
  printf "  Total: $%'"'"'.2f\n", sum;
  printf "  Average: $%.2f\n", sum/count;
}' "$CSV_FILE"

echo ""

# All negative Type=1 items (discounts)
awk -F, 'NR>1 && $6=="1" && $7<0 {
  count++;
  sum += $7;
} END {
  printf "All negative prices with Type=1:\n";
  printf "  Count: %'"'"'d items\n", count;
  printf "  Total: $%'"'"'.2f\n", sum;
  printf "  Average: $%.2f\n", sum/count;
}' "$CSV_FILE"

echo ""

# All negative prices
echo "📉 ALL NEGATIVE PRICE ANALYSIS"
echo "────────────────────────────────────────────────────────────────────────────"
awk -F, 'NR>1 && $7<0 {
  types[$6]++;
  sums[$6] += $7;
  total_count++;
  total_sum += $7;
} END {
  printf "Total negative price transactions: %'"'"'d\n", total_count;
  printf "Total negative amount: $%'"'"'.2f\n", total_sum;
  printf "\n";
  printf "Breakdown by transaction type:\n";
  for (type in types) {
    printf "  Type %-5s: %'"'"'6d items, $%'"'"'12.2f\n", type, types[type], sums[type];
  }
}' "$CSV_FILE"

echo ""

# Transaction type distribution
echo "📊 TRANSACTION TYPE DISTRIBUTION"
echo "────────────────────────────────────────────────────────────────────────────"
awk -F, 'NR>1 {
  types[$6]++;
  sums[$6] += $7;
} END {
  # Sort by count (descending)
  n = asorti(types, sorted_types);

  printf "%-15s %12s %18s %15s\n", "Type", "Count", "Total", "Avg";
  printf "%-15s %12s %18s %15s\n", "────", "─────", "─────", "───";

  for (i in sorted_types) {
    type = sorted_types[i];
    count = types[type];
    sum = sums[type];
    avg = sum / count;
    printf "%-15s %'"'"'12d $%'"'"'15.2f $%13.2f\n", type, count, sum, avg;
  }
}' "$CSV_FILE" | sort -k2 -rn

echo ""

# QuickBooks reconciliation
echo "🔍 QUICKBOOKS RECONCILIATION"
echo "────────────────────────────────────────────────────────────────────────────"

# Calculate different totals
awk -F, 'NR>1 {
  all_total += $7;

  if ($6 == "1" && $7 > 0) {
    positive_sales += $7;
  }
  if ($6 == "-1") {
    returns += $7;
  }
  if ($6 == "1" && $7 < 0) {
    discounts += $7;
  }
} END {
  printf "Your CSV Total (Net Sales):              $%'"'"'.2f\n", all_total;
  printf "Positive Type=1 sales only:              $%'"'"'.2f\n", positive_sales;
  printf "Plus returns (already negative):         $%'"'"'.2f\n", returns;
  printf "Plus discount lines (negative):          $%'"'"'.2f\n", discounts;
  printf "\n";
  printf "Estimated QuickBooks Total:\n";
  printf "  (Positive sales only):                 $%'"'"'.2f\n", positive_sales;
  printf "\n";
  printf "Difference (QB - Your CSV):\n";
  printf "  = QB excludes discount lines:          $%'"'"'.2f\n", positive_sales - all_total;
  printf "\n";
  printf "Expected QuickBooks Total:               ~$15,578,826.26\n";
  printf "Expected Difference:                     ~$105,057.03\n";
}' "$CSV_FILE"

echo ""

# Data quality checks
echo "✅ DATA QUALITY CHECKS"
echo "────────────────────────────────────────────────────────────────────────────"

# Check for missing data
awk -F, 'NR>1 {
  total++;
  if ($1 == "") missing_date++;
  if ($2 == "") missing_store++;
  if ($3 == "") missing_receipt++;
  if ($4 == "") missing_sku++;
  if ($5 == "") missing_item++;
  if ($6 == "") missing_type++;
  if ($7 == "" || $7 == 0) missing_price++;
} END {
  printf "Missing/Zero Data:\n";
  printf "  Date: %d (%.2f%%)\n", missing_date, missing_date/total*100;
  printf "  Store: %d (%.2f%%)\n", missing_store, missing_store/total*100;
  printf "  Receipt #: %d (%.2f%%)\n", missing_receipt, missing_receipt/total*100;
  printf "  SKU: %d (%.2f%%)\n", missing_sku, missing_sku/total*100;
  printf "  Item Name: %d (%.2f%%)\n", missing_item, missing_item/total*100;
  printf "  Type: %d (%.2f%%)\n", missing_type, missing_type/total*100;
  printf "  Price: %d (%.2f%%)\n", missing_price, missing_price/total*100;
  printf "\n";

  issues = missing_date + missing_store + missing_receipt + missing_sku + missing_item + missing_type + missing_price;

  if (issues == 0) {
    printf "✅ PASS: No missing data found\n";
  } else {
    printf "⚠️  WARNING: %d data quality issues found\n", issues;
  }
}' "$CSV_FILE"

echo ""

# Sample transactions
echo "📋 SAMPLE TRANSACTIONS"
echo "────────────────────────────────────────────────────────────────────────────"
echo "First 5 transactions:"
head -6 "$CSV_FILE" | tail -5 | awk -F, '{printf "%s | %s | %s | %s | %.30s | %s | $%.2f\n", $1, $2, $3, $4, $5, $6, $7}'

echo ""
echo "Sample returns (Type -1):"
grep ",.*,.*,-1," "$CSV_FILE" | head -5 | awk -F, '{printf "%s | %s | %s | %s | %.30s | %s | $%.2f\n", $1, $2, $3, $4, $5, $6, $7}'

echo ""
echo "Sample discounts:"
grep "ONLINE DISCOUNT" "$CSV_FILE" | head -5 | awk -F, '{printf "%s | %s | %s | %s | %.30s | %s | $%.2f\n", $1, $2, $3, $4, $5, $6, $7}'

echo ""
echo "============================================================================"
echo "ANALYSIS COMPLETE"
echo "============================================================================"
echo ""
echo "Expected Results:"
echo "  Total Revenue: ~\$15,473,769.23"
echo "  Return Total: ~\$-359,144.54 (negative)"
echo "  Discount Total: ~\$-98,919.69 (negative)"
echo "  Online Discounts: ~\$-74,116.19 (negative)"
echo ""
echo "✅ If all checks pass, your CSV file is correct!"
echo ""

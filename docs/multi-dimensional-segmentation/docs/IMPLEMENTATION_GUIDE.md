# Multi-Dimensional Product Segmentation - Implementation Guide

## 🎯 Overview

This implementation transforms your single-dimensional receiving-based segmentation into a **multi-dimensional analysis** that considers:

1. **Sales velocity** - How fast items are selling
2. **Inventory levels** - Current stock across all locations
3. **Receiving patterns** - When and how often items are restocked
4. **Time-based activity** - Last sold, last received, creation dates

## 📊 Before vs. After

### ❌ OLD (Receiving-Only)
- New: Recently received
- Core: Frequently received
- Seasonal: Receives in specific months
- Discontinued: Not received recently

### ✅ NEW (Multi-Dimensional)
- New: Recently created + Limited receives + Has sold
- Core: Consistent sales + Regular restocking + Recent activity
- Seasonal: Multi-year pattern + Sales concentrated in specific months
- Discontinued: Zero inventory + No sales + No receives
- **CLEARANCE (NEW)**: High inventory + Low sales velocity
- One-Time: Limited receives + Still active

## 📋 Detailed Classification Logic

### 1️⃣ NEW ITEMS
**Data Sources:** Item List + Receiving + Sales

**Rules:**
```typescript
IF (
  (creation_date <= 30 days old OR first_receive <= 30 days old)
  AND total_receive_count <= 2
) THEN 'New'
```

### 2️⃣ CORE ITEMS
**Data Sources:** Sales + Receiving + Inventory

**Rules:**
```typescript
IF (
  sales_months_last_year >= 6
  AND total_receive_count >= 5
  AND avg_days_between_receives <= 60
  AND days_since_last_sold <= 90
  AND days_since_last_received <= 90
  AND (avail_qty > 0 OR days_since_last_sold <= 30)
) THEN 'Core'
```

### 3️⃣ SEASONAL ITEMS
**Data Sources:** Sales + Receiving

**Rules:**
```typescript
IF (
  unique_receive_years >= 2
  AND avg_days_between_receives >= 180
  AND (days_since_last_sold <= 365 OR days_since_last_received <= 180)
  AND (any_single_month_has_15%_or_more_of_total_sales)
) THEN 'Seasonal'
```

### 4️⃣ CLEARANCE ITEMS (NEW)
**Data Sources:** Inventory + Sales + Receiving

**Rules:**
```typescript
IF (
  avail_qty >= 10
  AND sales_last_90days <= 3
  AND days_since_last_received >= 180
  AND days_of_supply >= 180
) THEN 'Clearance'

WHERE days_of_supply = (inventory / sales_last_90days) * 90
```

### 5️⃣ DISCONTINUED ITEMS
**Data Sources:** Inventory + Sales + Receiving

**Rules:**
```typescript
IF (
  total_qty_all_locations = 0
  AND days_since_last_received >= 180
  AND days_since_last_sold >= 180
  AND NOT is_seasonal_item
) THEN 'Discontinued'
```

### 6️⃣ ONE-TIME BUY
**Data Sources:** Receiving + Sales

**Rules:**
```typescript
IF (
  total_receive_count <= 2
  AND days_since_first_receive >= 90
  AND days_since_last_sold <= 90
) THEN 'One-Time'
```

## 🎛️ Settings Configuration

### Default Settings
```typescript
{
  newItemDaysFromCreation: 30,
  coreItemMinSalesMonths: 6,
  seasonalItemSalesConcentrationPct: 15,
  clearanceMinInventory: 10,
  clearanceMinDaysOfSupply: 180,
  discontinuedRequiresZeroInventory: true,
}
```

### Recommended by Industry

**Fashion Retail:**
```typescript
{
  coreItemMinSalesMonths: 8,
  seasonalItemSalesConcentrationPct: 20,
  clearanceMinDaysOfSupply: 120,
}
```

**Grocery:**
```typescript
{
  newItemDaysFromCreation: 14,
  coreItemMaxDaysSinceLastSold: 30,
  clearanceMinDaysOfSupply: 60,
}
```

**Home Goods:**
```typescript
{
  newItemDaysFromCreation: 60,
  coreItemMaxDaysSinceLastSold: 180,
  clearanceMinDaysOfSupply: 365,
}
```

## 🧪 Testing & Validation

Run validation queries after deployment:
```bash
psql -U your_user -d your_database -f docs/validation_queries.sql
```

## 🔍 Troubleshooting

### Issue: All items "Unclassified"
**Solution:** Check data joins
```sql
SELECT COUNT(*) FROM item_list i
LEFT JOIN sales_transactions s ON i.item_number = s.sku;
```

### Issue: Too many Clearance items
**Solution:** Adjust settings
```typescript
{
  clearanceMinInventory: 20,
  clearanceMinDaysOfSupply: 365,
}
```

## 📈 Performance Optimization

- Create indexes on key columns
- Batch process in chunks of 100
- Run during off-hours
- Vacuum database after bulk updates

## 🚀 Deployment

See `DEPLOYMENT_CHECKLIST.md` for complete deployment process.

**Version:** 2.0.0  
**Breaking Changes:** Requires database migration

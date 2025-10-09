# Item List Excel File Formatting Rules

## Overview
Location: `client/src/lib/formatters.ts` - `formatItemList()` function (lines 414-517)

When you upload an Item List Excel file, the system applies these formatting rules:

---

## Required Sheet Name
✅ **Must be named**: `"Item Detail"` (exact match, case-sensitive)

If this sheet is not found, the upload will fail with error: `"Sheet 'Item Detail' not found in workbook"`

---

## Formatting Steps Applied

### Step 1: Delete Top 5 Rows
**Action**: Removes the first 5 rows from the sheet

**Why**: QuickBooks POS exports include:
- Row 1: Report metadata (date/time, store name)
- Row 2: Report title
- Rows 3-5: Empty spacing rows
- Row 6: Actual column headers

**Code location**: Lines 432-442

---

### Step 2: Delete Specific Columns
**Action**: Removes 24 columns (every other column starting from column A)

**Columns deleted** (zero-indexed):
```
[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46]
```

**In Excel terms (letter names)**:
```
A, C, E, G, I, K, M, O, Q, S, U, W, Y, AA, AC, AE, AG, AI, AK, AM, AO, AQ, AS, AU
```

**Why**: QuickBooks exports have empty spacing columns between data columns for visual formatting. These need to be removed to normalize the data.

**Code location**: Lines 444-462

---

### Step 3: Parse and Map Columns
After deletion, the system expects these **remaining columns** (in order):

| Expected Header | Database Field | Type | Example |
|----------------|----------------|------|---------|
| Item # | `item_number` | string | "413" |
| Vendor Name | `vendor_name` | string | "For Bare Feet" |
| Item Name | `item_name` | string | "Watt 99" |
| Category | `category` | string | "Socks" |
| Gender | `gender` | string | "Men" |
| Avail Qty | `avail_qty` | integer | 6 |
| HQ Qty | `hq_qty` | integer | 0 |
| GM Qty | `gm_qty` | integer | 6 |
| HM Qty | `hm_qty` | integer | 0 |
| MM Qty | `mm_qty` | integer | 0 |
| NM Qty | `nm_qty` | integer | 0 |
| PM Qty | `pm_qty` | integer | 0 |
| LM Qty | `lm_qty` | integer | 0 |
| Last Rcvd | `last_rcvd` | date | "2019-10-01" |
| Creation Date | `creation_date` | date | "2015-09-29" |
| Last Sold | `last_sold` | date | "2025-09-26" |
| Style Number | `style_number` | string | "TOMBRA" |
| Style Number 2 | `style_number_2` | string | null |
| Order Cost | `order_cost` | decimal | "9.00" |
| Selling Price | `selling_price` | decimal | "18.00" |
| Notes | `notes` | text | null |
| Size | `size` | string | "Large" |
| Attribute | `attribute` | string | "Watt" |

**Code location**: Lines 479-505

---

## 🚨 CRITICAL ISSUE FOUND

### Problem: TOTAL/SUMMARY Rows Are NOT Filtered

**Current behavior**:
- QuickBooks exports include a **summary row at the end** with totals
- This row has:
  - `Item #`: undefined/empty
  - `Item Name`: undefined/empty
  - `Avail Qty`: SUM of all items (e.g., 34,745)
  - All other qty fields: Also sums

**Impact**:
- The formatter **does NOT** filter out this total row
- It gets uploaded to the database as a regular item
- This causes data integrity issues

**Example from your file** (`Item List as of 09-29-2025.xlsx`):
```
Row 35,670 (LAST ROW - THIS IS A TOTAL):
  Item #: undefined
  Item Name: undefined
  Avail Qty: 34745  ← Total of all items!
  HQ Qty: 13255
  GM Qty: 5929
  ...
```

---

## Expected File Structure

### Before Formatting (Raw QuickBooks Export):

```
Row 1:  | 9/29/25          |          |          | NEXUS        |
Row 2:  | 12:30 PM         |          |          | Item Detail  |
Row 3:  |                  |          |          |              |
Row 4:  |                  |          |          |              |
Row 5:  |                  |          |          |              |
Row 6:  | Item #           |          | Vendor   |          | Item Name    |  ...
Row 7:  | 413              |          | For Bare |          | Watt 99      |  ...
Row 8:  | 417              |          | For Bare |          | Luck 12      |  ...
...
Row N:  | 110000           |          | Prinity  |          | Misc Prints  |  ...
Row N+1:|                  |          |          |          |              | [TOTAL ROW: 34745]
```

### After Formatting (What Gets Uploaded):

```
Row 1:  | Item # | Vendor Name  | Item Name       | Category | ... | Avail Qty |
Row 2:  | 413    | For Bare Feet| Watt 99         | Socks    | ... | 6         |
Row 3:  | 417    | For Bare Feet| Luck 12         | Socks    | ... | 5         |
...
Row N:  | 110000 | Prinity      | Misc Prints     | Misc     | ... | 0         |
Row N+1:|        |              |                 |          | ... | 34745     | ⚠️ TOTAL ROW!
```

---

## Validation Rules

After formatting, each record is validated with Zod schema (`shared/schema.ts`):

### Required Fields:
- `item_number` (string, cannot be empty)
- `item_name` (string)

### Optional Fields:
- All other fields can be null/undefined

### Type Coercion:
- Quantity fields: Converted to integers (default: 0)
- Dates: Kept as-is (can be null)
- Prices: Kept as strings (can be null)

**Code location**: `server/routes.ts` lines 203-228

---

## Current Issues

### 1. ❌ Total Row Not Filtered
**Problem**: Summary rows at the end are uploaded as items
**Impact**: Database contains invalid "item" with totals
**Solution Needed**: Add filter to skip rows where `Item #` is empty/undefined

### 2. ❌ No Duplicate Detection
**Problem**: Re-uploading same file creates duplicates (unless using "weekly_update" mode)
**Impact**: Database bloat
**Solution**: Default mode should be "upsert" not "insert"

### 3. ⚠️ Hardcoded Column Indices
**Problem**: Column deletion uses hardcoded indices [0, 2, 4, ...]
**Impact**: Breaks if QuickBooks changes export format
**Solution**: More flexible column detection

---

## Recommended Fixes

### Fix #1: Filter Out Total Rows

Add this to `formatItemList()` after line 479:

```typescript
// Filter out summary/total rows (no Item # or Item Name)
const filteredData = jsonData.filter((row: any) => {
  const hasItemNumber = row['Item #'] !== null &&
                        row['Item #'] !== undefined &&
                        String(row['Item #']).trim() !== '';
  const hasItemName = row['Item Name'] !== null &&
                      row['Item Name'] !== undefined;
  return hasItemNumber || hasItemName;
});
```

### Fix #2: Add Row Validation Warning

Log when suspicious rows are found:

```typescript
// Warn about potential total rows
const suspiciousRows = jsonData.filter((row: any, index: number) => {
  const availQty = Number(row['Avail Qty']) || 0;
  const hasNoItemNumber = !row['Item #'];
  return hasNoItemNumber && availQty > 10000;
});

if (suspiciousRows.length > 0) {
  console.warn(`Found ${suspiciousRows.length} suspicious rows (possibly totals) - these will be filtered out`);
}
```

---

## Testing Checklist

After any changes, test with:

1. ✅ **Standard QuickBooks export** - Should work as before
2. ✅ **File with total row** - Should filter it out
3. ✅ **File without top 5 rows** - Should fail gracefully
4. ✅ **File with different sheet name** - Should error clearly
5. ✅ **File with missing columns** - Should handle nulls
6. ✅ **Empty file** - Should return 0 records

---

*Generated: October 8, 2025*
*Based on: `client/src/lib/formatters.ts` (lines 414-517)*

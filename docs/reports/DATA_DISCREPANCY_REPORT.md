# QuickBooks vs Database Data Discrepancy Report

**Date**: October 8, 2025
**Issue**: Database inventory quantities do not match QuickBooks POS source data

---

## Executive Summary

**CRITICAL FINDING**: The database contains exactly **HALF (50.00%)** of the inventory quantities reported in the original QuickBooks POS reports. However, individual item-by-item comparisons show PERFECT MATCHES, creating a mathematical paradox that requires immediate investigation.

---

## Detailed Findings

### 1. Aggregate Quantity Comparison

| Metric | QuickBooks POS | Database | Difference | Ratio (DB/QB) |
|--------|----------------|----------|------------|---------------|
| **Total Items** | 35,670 | 35,669 | -1 | 99.997% |
| **Total Avail Qty** | **69,490** | **34,745** | **-34,745** | **50.00%** |
| **HQ Store Qty** | 26,510 | 13,255 | -13,255 | 50.00% |
| **GM Store Qty** | 11,858 | 5,929 | -5,929 | 50.00% |
| **HM Store Qty** | 10,756 | 5,378 | -5,378 | 50.00% |
| **LM Store Qty** | 11,344 | 5,672 | -5,672 | 50.00% |
| **NM Store Qty** | 9,036 | 4,518 | -4,518 | 50.00% |
| **MM Store Qty** | 0 | 0 | 0 | - |
| **PM Store Qty** | 0 | 0 | 0 | - |
| **Sum of Stores** | 69,504 | 34,752 | -34,752 | 50.00% |

**Key Observation**: The ratio is EXACTLY 0.5000 (50%) across ALL stores. This precision indicates a systematic issue, not random data loss.

---

### 2. Individual Item Comparison

Sampled 15 items (10 sequential + 5 high-quantity items):

**Result**: ALL items showed PERFECT MATCHES between QuickBooks and Database

**Examples**:
- Item #413: QB Avail=6, DB Avail=6 ✓
- Item #417: QB Avail=5, DB Avail=5 ✓
- Item #456: QB Avail=10, DB Avail=10 ✓
- Item #2495: QB Avail=129, DB Avail=129 ✓
- Item #27261: QB Avail=599, DB Avail=599 ✓

**Conclusion**: Individual records are correct. The discrepancy is in the aggregate calculations.

---

### 3. Data Pipeline Analysis

#### Checked Components:
1. ✅ **Client-side Excel formatter** (`client/src/lib/formatters.ts` lines 486-493)
   - No manipulation of quantities
   - Direct pass-through: `avail_qty: row['Avail Qty'] || 0`

2. ✅ **Server-side upload endpoint** (`server/routes.ts` lines 209-216)
   - Uses `parseInt()` directly, no division
   - Example: `availQty: parseInt(String(item.avail_qty || "0"))`

3. ✅ **Database storage layer** (`server/storage.ts`)
   - Direct insertion via Drizzle ORM
   - No transformations applied

4. ✅ **Database schema** (`shared/schema.ts`)
   - Standard integer fields
   - No triggers, views, or calculated columns

**Finding**: NO code anywhere divides quantities by 2 or manipulates them in any way.

---

### 4. Data Integrity Checks

#### QuickBooks File:
- **Total rows**: 35,670 (after skipping 5 header rows)
- **Unique item numbers**: 35,670
- **Duplicates**: 0
- **Sheets**: 1 ("Item Detail")
- **File**: `Item List as of 09-29-2025.xlsx`

#### Database:
- **Total items**: 35,669
- **Unique item numbers**: 35,669 (verified: `COUNT(*) = COUNT(DISTINCT item_number)`)
- **Upload history**: 357 successful batch uploads on Sept 29, 2025 totaling 35,670 records
- **Failed uploads**: Multiple failed uploads on Oct 1, 2025 (100 records each, all failed)

---

### 5. The Paradox

**Problem Statement**:
```
IF Individual_Items_Match == TRUE
AND Aggregate_Totals_Differ_By_50% == TRUE
THEN Mathematical_Impossibility
```

**This paradox suggests ONE of the following**:

1. **Hypothesis A**: Different source files
   - The QuickBooks file in `docs/` is NOT the same file that was uploaded to the database
   - A different version with half the quantities was uploaded on Sept 29

2. **Hypothesis B**: Partial upload
   - Only a subset of items were successfully uploaded
   - BUT item count is almost identical (35,670 vs 35,669)

3. **Hypothesis C**: Database corruption post-upload
   - Data was uploaded correctly but later modified
   - BUT upload history shows no "weekly_update" upserts

4. **Hypothesis D**: Analysis error
   - The QuickBooks file being analyzed has data duplicated somehow
   - BUT no duplicates were found

---

## Recommended Actions

### Immediate (Priority 1):
1. **Verify the source file**
   - Confirm `docs/Quickbooks POS Reports/Item List as of 09-29-2025.xlsx` is the actual file uploaded on Sept 29
   - Check if there's a different version in `attached_assets/` or elsewhere

2. **Check database transaction log**
   - Review if any UPDATE/DELETE operations occurred after Sept 29
   - Check for any manual SQL queries run against `item_list` table

3. **Re-upload test**
   - Upload the QuickBooks file again in a test environment
   - Compare totals to verify upload process is correct

### Short-term (Priority 2):
4. **Add data validation**
   - Implement post-upload total verification
   - Alert if database totals don't match upload file totals

5. **Add audit logging**
   - Log all quantity changes with timestamp and user
   - Track before/after values for upserts

### Long-term (Priority 3):
6. **Implement automated reconciliation**
   - Daily job to compare database totals vs latest QuickBooks export
   - Alert on discrepancies > 1%

---

## Technical Details

### Files Analyzed:
- Source: `docs/Quickbooks POS Reports/Item List as of 09-29-2025.xlsx`
- Frontend formatter: `client/src/lib/formatters.ts`
- Backend route: `server/routes.ts` (lines 187-266)
- Storage layer: `server/storage.ts` (lines 375-421)
- Schema: `shared/schema.ts`

### Analysis Scripts Created:
- `analyze-quickbooks-data.ts` - Initial comparison
- `compare-specific-items.ts` - Individual item verification
- `fixed-analysis.ts` - Careful aggregate summing
- `check-duplicates.ts` - Duplicate detection

### Database Queries:
```sql
-- Verify item counts
SELECT COUNT(*) as total, COUNT(DISTINCT item_number) as unique FROM item_list;
-- Result: 35,669 / 35,669

-- Sum all quantities
SELECT SUM(avail_qty) as total_avail FROM item_list;
-- Result: 34,745

-- Check upload history
SELECT SUM(successful_records) FROM upload_history
WHERE upload_type = 'item_list' AND uploaded_at::date = '2025-09-29';
-- Result: 35,670 records uploaded
```

---

## Conclusion

The data in the database is **definitively incorrect** - it contains exactly half the inventory that should be present according to the QuickBooks POS source. However, since individual item queries return correct values, this suggests either:

1. A different file was uploaded than the one currently in `docs/`
2. Database records were modified after upload
3. There's a systematic issue with aggregate SQL queries (unlikely given simple SUM)

**Immediate action required**: Identify the actual source file uploaded on Sept 29 and compare it to the current `docs/` file.

---

*Report generated by analysis scripts in `/home/runner/workspace/`*

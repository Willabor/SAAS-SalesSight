# Visual Example: Item List Formatting Process

## Original QuickBooks Export

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Row 1:  9/29/25  |      |      |      | NEXUS - HQ |      |                 │ ← Report Header
│ Row 2:  12:30 PM |      |      |      | Item Detail|      |                 │ ← Report Title
│ Row 3:           |      |      |      |            |      |                 │ ← Empty
│ Row 4:           |      |      |      |            |      |                 │ ← Empty
│ Row 5:           |      |      |      |            |      |                 │ ← Empty
├─────────────────────────────────────────────────────────────────────────────┤
│ Row 6:  Item #   | (blank) | Vendor | (blank) | Item Name | (blank) | ...  │ ← Headers
│ Row 7:  413      | (blank) | FBF    | (blank) | Watt 99   | (blank) | ...  │ ← Data starts
│ Row 8:  417      | (blank) | FBF    | (blank) | Luck 12   | (blank) | ...  │
│ Row 9:  441      | (blank) | M&N    | (blank) | Heat      | (blank) | ...  │
│ ...     ...      | ...     | ...    | ...     | ...       | ...     | ...  │
│ Row 35675: 110000| (blank) | Prinity| (blank) | Misc      | (blank) | 0    │ ← Last real item
│ Row 35676:       | (blank) |        | (blank) |           | (blank) | 34745│ ← ⚠️ TOTAL ROW
└─────────────────────────────────────────────────────────────────────────────┘
         ↑              ↑        ↑          ↑          ↑
      Col A          Col B    Col C      Col D     Col E
   (DELETE)        (KEEP)   (DELETE)   (KEEP)    (DELETE)
```

## Step 1: Delete Top 5 Rows

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Row 1:  Item #   | (blank) | Vendor | (blank) | Item Name | (blank) | ...  │ ← Now Row 1!
│ Row 2:  413      | (blank) | FBF    | (blank) | Watt 99   | (blank) | ...  │
│ Row 3:  417      | (blank) | FBF    | (blank) | Luck 12   | (blank) | ...  │
│ Row 4:  441      | (blank) | M&N    | (blank) | Heat      | (blank) | ...  │
│ ...     ...      | ...     | ...    | ...     | ...       | ...     | ...  │
│ Row 35670: 110000| (blank) | Prinity| (blank) | Misc      | (blank) | 0    │
│ Row 35671:       | (blank) |        | (blank) |           | (blank) | 34745│ ← Still here!
└─────────────────────────────────────────────────────────────────────────────┘
```

## Step 2: Delete Columns A, C, E, G, I, K, M, O, Q, S, U, W, Y, AA, AC, AE, AG, AI, AK, AM, AO, AQ, AS, AU

**Columns to DELETE (24 total)**: 0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Row 1:  Item # | Vendor  | Item Name | Category | Gender | Avail Qty | ... │
│ Row 2:  413    | FBF     | Watt 99   | Socks    | Men    | 6         | ... │
│ Row 3:  417    | FBF     | Luck 12   | Socks    | Men    | 5         | ... │
│ Row 4:  441    | M&N     | Heat      | Hats     | Unisex | 0         | ... │
│ ...     ...    | ...     | ...       | ...      | ...    | ...       | ... │
│ Row 35670: 110000 | Prinity | Misc   | Misc     | Unisex | 0         | ... │
│ Row 35671:     |         |           |          |        | 34745     | ... │ ← PROBLEM!
└─────────────────────────────────────────────────────────────────────────────┘
                                                                  ↑
                                           This is NOT a real item - it's a TOTAL!
```

## Step 3: Parse to JSON and Upload

```json
[
  {
    "item_number": "413",
    "vendor_name": "FBF",
    "item_name": "Watt 99",
    "category": "Socks",
    "gender": "Men",
    "avail_qty": 6,
    ...
  },
  ...
  {
    "item_number": "110000",
    "vendor_name": "Prinity",
    "item_name": "Misc",
    "category": "Misc",
    "gender": "Unisex",
    "avail_qty": 0,
    ...
  },
  {
    "item_number": null,          ← ⚠️ NO ITEM NUMBER
    "vendor_name": null,
    "item_name": null,            ← ⚠️ NO ITEM NAME
    "category": null,
    "gender": null,
    "avail_qty": 34745,           ← ⚠️ THIS IS THE TOTAL OF ALL ITEMS!
    "hq_qty": 13255,              ← ⚠️ THIS IS THE TOTAL HQ QTY!
    "gm_qty": 5929,               ← ⚠️ THIS IS THE TOTAL GM QTY!
    ...
  }
]
```

## 🔴 Current Problem

The last record (total row) **PASSES VALIDATION** because:
- `item_number` can be null ✓
- `avail_qty` defaults to 0, but 34745 is valid ✓
- No check for "is this a summary row?" ✗

## ✅ Proposed Solution

Add filter before parsing (line 479 in formatters.ts):

```typescript
// Filter out summary/total rows
const validData = jsonData.filter((row: any) => {
  // A valid item must have at least an Item # or Item Name
  const hasItemNumber = row['Item #'] &&
                        String(row['Item #']).trim() !== '';
  const hasItemName = row['Item Name'] &&
                      String(row['Item Name']).trim() !== '';
  
  // If neither exists, it's probably a total row
  return hasItemNumber || hasItemName;
});
```

## After Fix

```json
[
  {
    "item_number": "413",
    "vendor_name": "FBF",
    "item_name": "Watt 99",
    "avail_qty": 6,
    ...
  },
  ...
  {
    "item_number": "110000",
    "vendor_name": "Prinity",
    "item_name": "Misc",
    "avail_qty": 0,
    ...
  }
  // ✓ Total row filtered out!
]
```

---

## Column Mapping Reference

After deletion, columns map as follows:

| Original Excel Column | After Deletion | Expected Header | Database Field |
|----------------------|----------------|-----------------|----------------|
| B (index 1) | A (index 0) | Item # | item_number |
| D (index 3) | B (index 1) | Vendor Name | vendor_name |
| F (index 5) | C (index 2) | Item Name | item_name |
| H (index 7) | D (index 3) | Category | category |
| J (index 9) | E (index 4) | Gender | gender |
| L (index 11) | F (index 5) | Avail Qty | avail_qty |
| N (index 13) | G (index 6) | HQ Qty | hq_qty |
| P (index 15) | H (index 7) | GM Qty | gm_qty |
| R (index 17) | I (index 8) | HM Qty | hm_qty |
| T (index 19) | J (index 9) | MM Qty | mm_qty |
| V (index 21) | K (index 10) | NM Qty | nm_qty |
| X (index 23) | L (index 11) | PM Qty | pm_qty |
| Z (index 25) | M (index 12) | LM Qty | lm_qty |
| AB (index 27) | N (index 13) | Last Rcvd | last_rcvd |
| AD (index 29) | O (index 14) | Creation Date | creation_date |
| AF (index 31) | P (index 15) | Last Sold | last_sold |
| AH (index 33) | Q (index 16) | Style Number | style_number |
| AJ (index 35) | R (index 17) | Style Number 2 | style_number_2 |
| AL (index 37) | S (index 18) | Order Cost | order_cost |
| AN (index 39) | T (index 19) | Selling Price | selling_price |
| AP (index 41) | U (index 20) | Notes | notes |
| AR (index 43) | V (index 21) | Size | size |
| AT (index 45) | W (index 22) | Attribute | attribute |


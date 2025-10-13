# Phase 0: Vendor Configuration System - Quick Start

**Full Documentation**: `/docs/VENDOR_PREPACK_CONFIGURATION_SYSTEM.md`

---

## 🚨 CRITICAL: Must Complete FIRST

This is **PHASE 0** - a prerequisite for the Inventory Action Center UI. Without this, the system cannot function.

---

## What You're Building

A **Vendor & Prepack Configuration Management System** to store:
- ✅ Which vendors use prepacks vs open stock
- ✅ Prepack definitions (Pack A, Pack B, etc.)
- ✅ Size distributions within each prepack
- ✅ Size type detection (jeans, apparel, shoes)
- ✅ Minimum order quantities

---

## 3 New Database Tables

### 1. **vendor_configurations**
Stores vendor-level settings
- Vendor name
- Uses prepacks? (boolean)
- Minimum order quantity
- Default size type (auto-detected)

### 2. **prepack_configurations**
Defines prepack boxes
- Vendor + Pack name (e.g., "Argonaut Nations - Pack A")
- Style number (optional)
- Pieces per box
- Cost per box
- Available colors

### 3. **prepack_size_distributions**
Size assortment in each prepack
- Size value (e.g., "30W×32L", "Medium", "10")
- Quantity per box
- Percentage (auto-calculated)

---

## Size Type Auto-Detection

**Algorithm detects 5 types**:
1. **Jeans** - `30W×32L`, `34W×32L` pattern
2. **Apparel** - `S`, `M`, `L`, `XL` pattern
3. **Shoes** - `8`, `9.5`, `10` numeric
4. **Numeric** - `14`, `16`, `18` (shirt sizes)
5. **One Size** - `OS`, `OSFA` pattern

**Example**:
```typescript
detectSizeType('Argonaut Nations')
// Returns: { sizeType: 'jeans', confidence: 0.98 }

detectSizeType('Ethika')
// Returns: { sizeType: 'apparel', confidence: 1.0 }
```

---

## Admin UI Features

**New Page**: `/vendor-configuration`

**Three Tabs**:
1. **Vendor List** - View/edit all vendors, auto-detect size types
2. **Prepack Configurations** - Define Pack A/B/C with size distributions
3. **Bulk Import** - Upload CSV files for mass configuration

**Key Features**:
- ✅ Validation: Size quantities must sum to pieces_per_box
- ✅ Color management: Multi-select available colors
- ✅ Size distribution editor: Visual table with percentages
- ✅ CSV templates: Download, fill, upload

---

## Quick Setup (Test Data)

### Step 1: Argonaut Nations (Test Vendor)

```sql
-- Add vendor
INSERT INTO vendor_configurations (vendor_name, uses_prepacks, min_order_qty, default_size_type)
VALUES ('Argonaut Nations', TRUE, 12, 'jeans');

-- Add Pack A
INSERT INTO prepack_configurations
(vendor_name, prepack_name, style_number, size_type, pieces_per_box, cost_per_box, is_color_specific, available_colors)
VALUES
('Argonaut Nations', 'Pack A', '8501B', 'jeans', 12, 300.00, TRUE, ARRAY['Black', 'Olive', 'Navy', 'Khaki']);

-- Add Pack A size distribution (assuming prepack_config_id = 1)
INSERT INTO prepack_size_distributions (prepack_config_id, size_value, quantity, percentage, sort_order) VALUES
(1, '30W×32L', 4, 33.33, 1),
(1, '32W×32L', 2, 16.67, 2),
(1, '34W×32L', 2, 16.67, 3),
(1, '36W×32L', 1, 8.33, 4),
(1, '38W×32L', 1, 8.33, 5),
(1, '40W×32L', 1, 8.33, 6),
(1, '42W×32L', 1, 8.33, 7);
```

### Step 2: Verify Test Data

```sql
-- Check vendor
SELECT * FROM vendor_configurations WHERE vendor_name = 'Argonaut Nations';

-- Check prepack
SELECT * FROM prepack_configurations WHERE vendor_name = 'Argonaut Nations';

-- Check sizes
SELECT
  pc.prepack_name,
  psd.size_value,
  psd.quantity,
  psd.percentage
FROM prepack_configurations pc
JOIN prepack_size_distributions psd ON pc.id = psd.prepack_config_id
WHERE pc.vendor_name = 'Argonaut Nations'
ORDER BY pc.prepack_name, psd.sort_order;
```

---

## Implementation Checklist (6-7 days)

### **Phase 0A: Database** (1 day)
- [ ] Add 3 table schemas to `/shared/schema.ts`
- [ ] Run `npm run db:push` to create tables
- [ ] Insert test data (Argonaut Nations)

### **Phase 0B: Backend** (2 days)
- [ ] Create `/server/lib/size-type-detection.ts`
- [ ] Add 10 storage functions to `/server/storage.ts`
- [ ] Add 15 API endpoints to `/server/routes.ts`
- [ ] Create `/server/lib/vendor-import.ts` for CSV

### **Phase 0C: Frontend** (2-3 days)
- [ ] Create `/client/src/pages/vendor-configuration.tsx`
- [ ] Create `/client/src/components/vendor-config-dialog.tsx`
- [ ] Create `/client/src/components/prepack-config-dialog.tsx`
- [ ] Add route to `/client/src/App.tsx`

### **Phase 0D: ML Integration** (1 day)
- [ ] Update `/ml_service/utils/prepack_data.py`
- [ ] Test with Style 8501B

---

## CSV Template Examples

### vendors.csv
```csv
vendor_name,uses_prepacks,min_order_qty,default_size_type
Argonaut Nations,true,12,jeans
Jordan Craig,true,24,jeans
Ethika,false,6,apparel
```

### prepacks.csv
```csv
vendor_name,prepack_name,style_number,size_type,pieces_per_box,cost_per_box,available_colors
Argonaut Nations,Pack A,8501B,jeans,12,300.00,"Black,Olive,Navy,Khaki"
Argonaut Nations,Pack B,8501B,jeans,12,300.00,"Black,Olive,Navy,Khaki"
```

### prepack_sizes.csv
```csv
vendor_name,prepack_name,style_number,size_value,quantity
Argonaut Nations,Pack A,8501B,30W×32L,4
Argonaut Nations,Pack A,8501B,32W×32L,2
Argonaut Nations,Pack A,8501B,34W×32L,2
Argonaut Nations,Pack A,8501B,36W×32L,1
Argonaut Nations,Pack A,8501B,38W×32L,1
Argonaut Nations,Pack A,8501B,40W×32L,1
Argonaut Nations,Pack A,8501B,42W×32L,1
```

---

## Top 20 Vendors to Configure

Priority order based on inventory count:

| Vendor | Items | Type | Priority |
|--------|-------|------|----------|
| Jordan Craig | 5,980 | Prepack? | HIGH |
| New Era | 3,436 | Prepack? | HIGH |
| Ethika | 1,681 | Open Stock | MEDIUM |
| NEXUS | 1,192 | ? | MEDIUM |
| WaiMea | 1,185 | ? | MEDIUM |
| Black Keys | 1,146 | ? | MEDIUM |
| Million Dolla Motive | 944 | ? | LOW |
| George V | 943 | ? | LOW |
| Rebel Minds | 919 | ? | LOW |
| Cookies SF | 866 | ? | LOW |
| Kappa | 775 | ? | LOW |
| Levi's | 770 | Open Stock | MEDIUM |
| **Argonaut Nations** | **734** | **Prepack** | **TEST** |

**Action Plan**:
1. Start with Argonaut Nations (test data ready)
2. Contact top 5 vendors to ask about prepacks
3. Use auto-detect for size types
4. Mark rest as "Open Stock" initially

---

## Success Criteria

- [ ] Can add vendor configurations via UI
- [ ] Can define prepack with size distributions
- [ ] Size type auto-detection works
- [ ] CSV import/export works
- [ ] Argonaut Nations fully configured
- [ ] ML service reads from new tables
- [ ] Test case (8501B) passes

---

## Testing Commands

```bash
# Test size detection
curl http://localhost:5000/api/vendor-configurations/Argonaut%20Nations/detect-size-type

# Get vendor config
curl http://localhost:5000/api/vendor-configurations/Argonaut%20Nations

# Get prepack configs
curl http://localhost:5000/api/prepack-configurations?vendor=Argonaut%20Nations

# Get prepack with sizes
curl http://localhost:5000/api/prepack-configurations/1
```

---

## Next Steps After Phase 0

Once Phase 0 is complete:
1. ✅ Verify all top vendors configured
2. ✅ Test ML service integration
3. ✅ Proceed to Phase 1 of Inventory Action Center UI
4. ✅ Follow `/docs/INVENTORY_ACTION_CENTER_UI_IMPLEMENTATION.md`

---

**Document**: Phase 0 Quick Start
**Status**: ✅ Ready to implement
**Estimated Time**: 6-7 days
**Priority**: 🚨 CRITICAL - Must complete first

**Full Details**: See `/docs/VENDOR_PREPACK_CONFIGURATION_SYSTEM.md`

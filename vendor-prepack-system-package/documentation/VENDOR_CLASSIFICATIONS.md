# Vendor Classifications Reference

**Document Version**: 1.0
**Created**: January 2025
**Last Updated**: January 2025
**Status**: ✅ Active Reference

---

## Purpose

This document serves as the authoritative reference for vendor type classifications in the inventory management system. It ensures consistent configuration and prevents misclassification.

---

## Vendor Type Definitions

### Prepack Vendors

**Definition**: Vendors who ship inventory in pre-assembled boxes with fixed size distributions.

**Key Characteristics**:
- Orders come in pre-packed boxes (e.g., Pack A, Pack B, Pack C)
- Each box contains ONE COLOR only (color-specific)
- Fixed size distributions per pack (e.g., 4× Small, 6× Medium, 2× Large)
- Cannot customize box contents
- Order by the box/pack, not by individual pieces

**Minimum Order**:
- **1 prepack** (regardless of whether the physical shipment contains 1, 2, or 4 boxes)
- Example: If you order "1 prepack of Pack A", the vendor might ship it as 2 physical boxes, but it's still counted as 1 minimum order unit

**Configuration Requirements**:
1. Mark vendor as "Prepack"
2. Set minimum order quantity (typically 1)
3. Define each pack configuration (Pack A, Pack B, etc.)
4. For each pack:
   - Specify size type (jeans, apparel, etc.)
   - Define pieces per box
   - Set cost per box
   - List available colors
   - Define exact size distribution with quantities

---

### Open Stock Vendors

**Definition**: Vendors who allow ordering any quantity of any size/color combination.

**Key Characteristics**:
- Order individual pieces, not pre-packed boxes
- Can order any mix: 5 Small, 10 Medium, 3 Large
- Can order multiple colors in one order
- Full flexibility in order composition

**Minimum Order**:
- **6 units** (standard across most vendors)
- Can be any combination of sizes/colors

**Configuration Requirements**:
1. Mark vendor as "Open Stock"
2. Set minimum order quantity (typically 6 units)
3. Set size type (for reference only)
4. **NO pack configuration needed or allowed**

---

## Current Vendor Classifications

### Confirmed Prepack Vendors

| Vendor Name | Categories | Gender Options | Notes |
|-------------|-----------|----------------|-------|
| **Jordan Craig** | Jeans, Jackets, Hoodies, T-shirts, Sweat pants | Men, Kids, Boys | Multiple prepacks per category and style |
| **Jordan Craig Kids** | Same as Jordan Craig | Kids, Boys | Same structure as parent brand |
| **Waimea** | Jeans, Denim Jackets | Men, Kids, Boys | Multiple prepacks depending on style |
| **Black Keys** | Various Apparel | Men, Women, Kids, Boys | Multiple prepacks by category, gender, and style |

**Common Notes**:
- All have size attributes in database for easy detection
- Each vendor may have multiple prepack configurations per product category
- Style numbers differentiate between different prepack types

---

### Confirmed Open Stock Vendors

| Vendor Name | Categories | Gender Options | Notes |
|-------------|-----------|----------------|-------|
| **Nexus** | Various | Various | Standard open stock ordering |
| **New Era** | Caps/Headwear | Unisex | No prepacks, order by piece |
| **Ethika** | Underwear/Apparel | Men, Boys | Was incorrectly marked as prepack - now fixed |

---

### System Examples

These vendors are configured in the database for reference:

| Vendor Name | Type | Status | Database ID |
|-------------|------|--------|-------------|
| Argonaut Nations | Prepack | ✅ Active | 1 |
| Ethika | Open Stock | ✅ Active (Fixed) | 2 |

---

## How to Add New Vendors

### Adding a Prepack Vendor

1. **Navigate to**: `/vendor-configuration` page
2. **Click**: "Add Vendor" button
3. **Fill in basic info**:
   - Vendor name (required)
   - Select "Prepack Vendor" radio button
   - Minimum order: typically **1 prepack**
   - Default size type (optional - can auto-detect)
   - Notes (optional)
4. **Save vendor**
5. **Configure prepacks** (in Prepack Configurations section below):
   - Click "Add Prepack"
   - Select vendor from dropdown
   - Enter prepack name (e.g., "Pack A", "Men's Jeans Pack")
   - Optional: Style number (e.g., "8501B")
   - Select size type (jeans, apparel, etc.)
   - Enter pieces per box (e.g., 12)
   - Enter cost per box (optional)
   - Enable "Each box contains ONE color" (default)
   - Add available colors (e.g., Black, Navy, Olive)
   - Define size distribution (quantities must equal pieces per box)
6. **Repeat step 5** for each pack type (Pack A, Pack B, Pack C, etc.)

### Adding an Open Stock Vendor

1. **Navigate to**: `/vendor-configuration` page
2. **Click**: "Add Vendor" button
3. **Fill in basic info**:
   - Vendor name (required)
   - Select "Open Stock Vendor" radio button
   - Minimum order: typically **6 units**
   - Default size type (optional - can auto-detect)
   - Notes (optional)
4. **Save vendor**
5. **Done** - No prepack configuration needed

---

## Validation Rules

The system enforces these rules:

1. ✅ **Cannot create prepack configurations for open stock vendors**
   - Error: "Cannot create prepack configurations for open stock vendors"

2. ✅ **Prepack dropdown only shows prepack vendors**
   - Open stock vendors are filtered out of vendor selection

3. ✅ **"Add Prepack" button disabled when no prepack vendors exist**
   - Prevents invalid operations

4. ✅ **Size distributions must equal pieces per box**
   - Example: If pieces per box = 12, size quantities must total 12

5. ✅ **At least one size distribution required**
   - Cannot save prepack without defining sizes

---

## Visual Indicators

### In Vendor Table

**Prepack Vendors**:
```
📦 PREPACK (blue badge with package icon)
```

**Open Stock Vendors**:
```
📦 OPEN STOCK (outline badge with box icon)
```

### In Vendor Form

**Prepack Option**:
- Package icon (📦)
- Blue info alert: "After saving, configure packs in the Prepack Configurations section below"

**Open Stock Option**:
- Box icon (📦)
- Green success alert: "No pack configuration needed for this vendor type"

---

## Common Mistakes to Avoid

❌ **Marking open stock vendors as prepack**
- Result: Confusing prepack configurations that don't match reality
- Fix: Edit vendor and change type to "Open Stock"

❌ **Forgetting to configure packs after creating prepack vendor**
- Result: Vendor marked as prepack but no packs defined
- Fix: Use "Add Prepack" button in Prepack Configurations section

❌ **Creating too few or too many size distributions**
- Result: Size quantities don't match pieces per box
- Fix: Ensure total quantity equals pieces per box exactly

❌ **Not specifying colors for color-specific prepacks**
- Result: Missing color information for ordering
- Fix: Add all available colors in the prepack form

---

## Database Schema Reference

### vendor_configurations Table

| Column | Type | Description |
|--------|------|-------------|
| `vendor_name` | text | Unique vendor identifier |
| `uses_prepacks` | boolean | **true** = Prepack, **false** = Open Stock |
| `min_order_qty` | integer | Minimum order quantity (prepacks or units) |
| `default_size_type` | text | jeans, apparel, shoes, numeric, onesize |

### prepack_configurations Table

| Column | Type | Description |
|--------|------|-------------|
| `vendor_name` | text | Foreign key to vendor_configurations |
| `prepack_name` | text | Pack identifier (Pack A, Pack B, etc.) |
| `style_number` | text | Optional style/SKU identifier |
| `size_type` | text | Size type for this specific pack |
| `pieces_per_box` | integer | Total pieces in the prepack box |
| `cost_per_box` | numeric | Cost for one prepack box |
| `is_color_specific` | boolean | Whether each box is one color only |
| `available_colors` | jsonb | Array of color names |

### prepack_size_distributions Table

| Column | Type | Description |
|--------|------|-------------|
| `prepack_config_id` | integer | Foreign key to prepack_configurations |
| `size_value` | text | Size label (e.g., "30W×32L", "M", "10") |
| `quantity` | integer | Number of pieces of this size per box |
| `percentage` | numeric | Percentage of total (calculated) |

---

## Maintenance

### When to Update This Document

- ✅ New vendor added to system
- ✅ Vendor type changes (prepack ↔ open stock)
- ✅ Minimum order requirements change
- ✅ New validation rules added
- ✅ UI changes affect vendor configuration workflow

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | January 2025 | Initial document creation with vendor classifications |

---

## Related Documents

- `/docs/VENDOR_TYPE_DISTINCTION_UX_ISSUE.md` - Original UX issue analysis
- `/docs/MASTER_INDEX_AND_IMPLEMENTATION_PLAN.md` - Overall system plan
- `/docs/VENDOR_PREPACK_CONFIGURATION_SYSTEM.md` - Technical implementation details
- `/docs/PHASE_0_QUICK_START.md` - Quick start guide for Phase 0

---

**Document Status**: ✅ Complete and Ready for Use
**Maintained By**: Development Team
**Contact**: See project documentation for support

---

**END OF VENDOR CLASSIFICATIONS DOCUMENT**

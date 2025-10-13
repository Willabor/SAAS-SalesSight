# Vendor & Prepack Configuration Management System

**Document Version**: 1.0
**Created**: October 10, 2025
**Status**: CRITICAL FOUNDATION - Must Complete BEFORE UI Implementation
**Priority**: HIGHEST - Blocking Issue

---

## 🚨 CRITICAL GAP IDENTIFIED

The Inventory Action Center UI implementation plan assumed that vendor and prepack configuration data already exists. **IT DOES NOT.**

We need to build this foundational data management system FIRST before any of the UI features can work.

---

## 📊 Problem Statement

### **What's Missing**

Currently, we have **NO WAY** to:
1. ❌ Mark which vendors use prepacks vs open stock
2. ❌ Define prepack configurations (Pack A, Pack B, etc.)
3. ❌ Specify size distributions within each prepack
4. ❌ Identify size types (jeans, shirts, shoes, etc.)
5. ❌ Set minimum order quantities per vendor
6. ❌ Store cost per box for prepacks

### **Current Database State**

**Existing Tables** (from `/shared/schema.ts`):
- ✅ `item_list` - Has `vendorName`, `size`, `attribute` (color)
- ✅ `receiving_vouchers` - Has `vendor` field
- ❌ **NO vendor configuration table**
- ❌ **NO prepack configuration table**
- ❌ **NO prepack size distribution table**

**Real Vendor Data** (top 20 from database):
```
Jordan Craig          - 5,980 items
New Era              - 3,436 items
Ethika               - 1,681 items
NEXUS                - 1,192 items
Argonaut Nations     -   734 items (our test case vendor!)
Levi's               -   770 items
```

### **Impact**

Without this system:
- ❌ ML service cannot generate prepack recommendations
- ❌ UI has no data to display
- ❌ Cannot distinguish prepack vs open stock vendors
- ❌ Cannot calculate optimal box quantities
- ❌ System is completely non-functional

---

## 🎯 Solution Overview

### **Phase 0: Foundation** (NEW - Insert before existing Phase 1)

Build a **Vendor & Prepack Configuration Management System** with:

1. **Database Schema** - 3 new tables to store configurations
2. **Admin UI** - Simple page to manage vendor/prepack data
3. **Auto-Detection** - Intelligent size type detection from existing data
4. **Bulk Import** - CSV/Excel import for initial setup
5. **API Endpoints** - CRUD operations for configurations

---

## 📐 Database Schema Design

### **Table 1: vendor_configurations**

**Purpose**: Store vendor-level settings

```sql
CREATE TABLE vendor_configurations (
  id SERIAL PRIMARY KEY,
  vendor_name TEXT UNIQUE NOT NULL,

  -- Prepack vs Open Stock
  uses_prepacks BOOLEAN DEFAULT FALSE,

  -- Ordering Constraints
  min_order_qty INTEGER,              -- Minimum pieces to order
  min_order_value NUMERIC(10,2),      -- Minimum dollar amount

  -- Size Type (auto-detected or manual)
  default_size_type TEXT,             -- 'jeans', 'apparel', 'shoes', 'onesize', 'numeric'
  size_type_auto_detected BOOLEAN DEFAULT TRUE,

  -- Contact & Notes
  contact_email TEXT,
  contact_phone TEXT,
  notes TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by TEXT
);

-- Indexes
CREATE INDEX idx_vendor_name ON vendor_configurations(vendor_name);
CREATE INDEX idx_uses_prepacks ON vendor_configurations(uses_prepacks);
```

**Example Data**:
```sql
INSERT INTO vendor_configurations (vendor_name, uses_prepacks, min_order_qty, default_size_type) VALUES
('Argonaut Nations', TRUE, 12, 'jeans'),        -- Prepacked, min 12 pieces (1 box)
('Jordan Craig', TRUE, 24, 'jeans'),            -- Prepacked, min 24 pieces (2 boxes)
('Ethika', FALSE, 6, 'apparel'),                -- Open stock, min 6 pieces
('New Era', TRUE, 12, 'apparel'),               -- Prepacked caps
('Levi''s', FALSE, NULL, 'jeans');              -- Open stock, no minimum
```

**Drizzle Schema** (for `/shared/schema.ts`):
```typescript
export const vendorConfigurations = pgTable("vendor_configurations", {
  id: serial("id").primaryKey(),
  vendorName: text("vendor_name").notNull().unique(),
  usesPrepacks: boolean("uses_prepacks").default(false),
  minOrderQty: integer("min_order_qty"),
  minOrderValue: numeric("min_order_value", { precision: 10, scale: 2 }),
  defaultSizeType: text("default_size_type"),
  sizeTypeAutoDetected: boolean("size_type_auto_detected").default(true),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: text("created_by"),
});
```

---

### **Table 2: prepack_configurations**

**Purpose**: Define prepack boxes (Pack A, Pack B, etc.)

```sql
CREATE TABLE prepack_configurations (
  id SERIAL PRIMARY KEY,
  vendor_name TEXT NOT NULL REFERENCES vendor_configurations(vendor_name) ON DELETE CASCADE,

  -- Prepack Identity
  prepack_name TEXT NOT NULL,                   -- 'Pack A', 'Pack B', 'Standard', 'Slim', etc.
  style_number TEXT,                            -- If style-specific, otherwise NULL for vendor-wide

  -- Size Type
  size_type TEXT NOT NULL,                      -- 'jeans', 'apparel', 'shoes', 'onesize', 'numeric'

  -- Box Details
  pieces_per_box INTEGER NOT NULL,              -- Total pieces in box
  cost_per_box NUMERIC(10,2),                   -- Cost to order one box

  -- Color Handling (CRITICAL!)
  is_color_specific BOOLEAN DEFAULT TRUE,       -- Does each box contain ONE color?
  available_colors TEXT[],                      -- Array of colors available (e.g., ['Black', 'Olive', 'Navy'])

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  discontinued_date DATE,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by TEXT,

  -- Composite unique constraint
  UNIQUE(vendor_name, prepack_name, style_number)
);

-- Indexes
CREATE INDEX idx_prepack_vendor ON prepack_configurations(vendor_name);
CREATE INDEX idx_prepack_style ON prepack_configurations(style_number);
CREATE INDEX idx_prepack_active ON prepack_configurations(is_active);
```

**Example Data**:
```sql
-- Argonaut Nations Style 8501B - Pack A
INSERT INTO prepack_configurations
(vendor_name, prepack_name, style_number, size_type, pieces_per_box, cost_per_box, is_color_specific, available_colors)
VALUES
('Argonaut Nations', 'Pack A', '8501B', 'jeans', 12, 300.00, TRUE, ARRAY['Black', 'Olive', 'Navy', 'Khaki']),
('Argonaut Nations', 'Pack B', '8501B', 'jeans', 12, 300.00, TRUE, ARRAY['Black', 'Olive', 'Navy', 'Khaki']);

-- Jordan Craig - Vendor-wide packs (style_number = NULL)
INSERT INTO prepack_configurations
(vendor_name, prepack_name, style_number, size_type, pieces_per_box, cost_per_box, is_color_specific, available_colors)
VALUES
('Jordan Craig', 'Standard Pack', NULL, 'jeans', 12, 360.00, TRUE, ARRAY['Black', 'Blue', 'Grey', 'Khaki']);

-- New Era Caps - Single size type
INSERT INTO prepack_configurations
(vendor_name, prepack_name, style_number, size_type, pieces_per_box, cost_per_box, is_color_specific, available_colors)
VALUES
('New Era', 'Standard Box', NULL, 'apparel', 12, 240.00, TRUE, ARRAY['Black', 'Navy', 'Grey', 'Red']);
```

**Drizzle Schema**:
```typescript
export const prepackConfigurations = pgTable("prepack_configurations", {
  id: serial("id").primaryKey(),
  vendorName: text("vendor_name").notNull().references(() => vendorConfigurations.vendorName, { onDelete: 'cascade' }),
  prepackName: text("prepack_name").notNull(),
  styleNumber: text("style_number"),
  sizeType: text("size_type").notNull(),
  piecesPerBox: integer("pieces_per_box").notNull(),
  costPerBox: numeric("cost_per_box", { precision: 10, scale: 2 }),
  isColorSpecific: boolean("is_color_specific").default(true),
  availableColors: text("available_colors").array(),
  isActive: boolean("is_active").default(true),
  discontinuedDate: date("discontinued_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: text("created_by"),
}, (table) => ({
  uniquePrepack: unique().on(table.vendorName, table.prepackName, table.styleNumber),
}));
```

---

### **Table 3: prepack_size_distributions**

**Purpose**: Define the size assortment within each prepack

```sql
CREATE TABLE prepack_size_distributions (
  id SERIAL PRIMARY KEY,
  prepack_config_id INTEGER NOT NULL REFERENCES prepack_configurations(id) ON DELETE CASCADE,

  -- Size Details
  size_value TEXT NOT NULL,                     -- '30W×32L', 'M', '10', etc.
  quantity INTEGER NOT NULL,                    -- Number of pieces of this size in the box
  percentage NUMERIC(5,2),                      -- Calculated: (quantity / pieces_per_box) * 100

  -- Sort Order (for display)
  sort_order INTEGER,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),

  -- Ensure sum of quantities = pieces_per_box (enforced at app level)
  UNIQUE(prepack_config_id, size_value)
);

-- Indexes
CREATE INDEX idx_size_dist_config ON prepack_size_distributions(prepack_config_id);
```

**Example Data**:
```sql
-- Argonaut Nations 8501B Pack A (12 pieces)
-- Assuming prepack_config_id = 1
INSERT INTO prepack_size_distributions (prepack_config_id, size_value, quantity, percentage, sort_order) VALUES
(1, '30W×32L', 4, 33.33, 1),  -- 4 pieces = 33%
(1, '32W×32L', 2, 16.67, 2),  -- 2 pieces = 17%
(1, '34W×32L', 2, 16.67, 3),  -- 2 pieces = 17%
(1, '36W×32L', 1, 8.33, 4),   -- 1 piece = 8%
(1, '38W×32L', 1, 8.33, 5),   -- 1 piece = 8%
(1, '40W×32L', 1, 8.33, 6),   -- 1 piece = 8%
(1, '42W×32L', 1, 8.33, 7);   -- 1 piece = 8%
-- Total: 12 pieces = 100%

-- Argonaut Nations 8501B Pack B (12 pieces) - Different distribution
-- Assuming prepack_config_id = 2
INSERT INTO prepack_size_distributions (prepack_config_id, size_value, quantity, percentage, sort_order) VALUES
(2, '28W×32L', 1, 8.33, 1),
(2, '30W×32L', 2, 16.67, 2),
(2, '32W×32L', 4, 33.33, 3),  -- Pack B emphasizes 32W (slimmer)
(2, '34W×32L', 2, 16.67, 4),
(2, '36W×32L', 2, 16.67, 5),
(2, '38W×32L', 1, 8.33, 6);
-- Total: 12 pieces = 100%
```

**Drizzle Schema**:
```typescript
export const prepackSizeDistributions = pgTable("prepack_size_distributions", {
  id: serial("id").primaryKey(),
  prepackConfigId: integer("prepack_config_id").notNull().references(() => prepackConfigurations.id, { onDelete: 'cascade' }),
  sizeValue: text("size_value").notNull(),
  quantity: integer("quantity").notNull(),
  percentage: numeric("percentage", { precision: 5, scale: 2 }),
  sortOrder: integer("sort_order"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueSize: unique().on(table.prepackConfigId, table.sizeValue),
}));
```

---

## 🤖 Size Type Auto-Detection Algorithm

### **Purpose**
Automatically detect the size type for each vendor based on existing `item_list` data.

### **Size Type Categories**

1. **Jeans/Pants** - `jeans`
   - Pattern: `\d+W\s*[xX×]\s*\d+L`
   - Examples: `30W×32L`, `34W X 32L`, `32W x 30L`
   - Waist: 28W-50W
   - Length: 28L-36L

2. **Apparel (S/M/L)** - `apparel`
   - Pattern: `(XXS|XS|S|M|L|XL|XXL|XXXL|X-Small|Small|Medium|Large|X-Large|XX-Large|XXX-Large)`
   - Examples: `Small`, `Medium`, `Large`, `X-Large`, `XXL`

3. **Shoes** - `shoes`
   - Pattern: `^\d+(\.\d)?$`
   - Examples: `8`, `8.5`, `9`, `10.5`, `12`
   - Range: 6-15

4. **Numeric** - `numeric`
   - Pattern: `^\d+$`
   - Examples: `12`, `14`, `16`, `18` (shirt sizes)
   - Range: varies by product

5. **One Size** - `onesize`
   - Pattern: `(OS|ONE SIZE|ONE|OSFA|OSFM|ONE SIZE FITS ALL)`
   - Examples: `OS`, `ONE SIZE`, `OSFA`

### **Detection Algorithm**

```typescript
interface SizeTypeDetection {
  sizeType: 'jeans' | 'apparel' | 'shoes' | 'numeric' | 'onesize' | 'mixed';
  confidence: number; // 0-1
  sampleSizes: string[];
  totalSizesAnalyzed: number;
}

async function detectSizeType(vendorName: string): Promise<SizeTypeDetection> {
  // Step 1: Get sample sizes from item_list
  const sizes = await db.execute(sql`
    SELECT DISTINCT size
    FROM item_list
    WHERE vendor_name = ${vendorName}
      AND size IS NOT NULL
      AND TRIM(size) != ''
    LIMIT 100
  `);

  if (sizes.rows.length === 0) {
    return {
      sizeType: 'mixed',
      confidence: 0,
      sampleSizes: [],
      totalSizesAnalyzed: 0
    };
  }

  const sizeValues = sizes.rows.map((r: any) => r.size.trim());

  // Step 2: Count matches for each pattern
  const patterns = {
    jeans: /\d+W\s*[xX×]\s*\d+L/i,
    apparel: /^(XXS|XS|S|M|L|XL|XXL|XXXL|X-Small|Small|Medium|Large|X-Large|XX-Large|XXX-Large)$/i,
    shoes: /^\d+(\.\d)?$/,
    onesize: /^(OS|ONE SIZE|ONE|OSFA|OSFM|ONE SIZE FITS ALL)$/i,
    numeric: /^\d+$/
  };

  const matches: Record<string, number> = {
    jeans: 0,
    apparel: 0,
    shoes: 0,
    onesize: 0,
    numeric: 0
  };

  for (const size of sizeValues) {
    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(size)) {
        matches[type]++;
      }
    }
  }

  // Step 3: Determine winner
  const total = sizeValues.length;
  const maxMatches = Math.max(...Object.values(matches));
  const winner = Object.keys(matches).find(key => matches[key] === maxMatches) || 'mixed';
  const confidence = maxMatches / total;

  // Step 4: Return result
  return {
    sizeType: winner as any,
    confidence,
    sampleSizes: sizeValues.slice(0, 10),
    totalSizesAnalyzed: total
  };
}
```

### **Usage Example**

```typescript
const detection = await detectSizeType('Argonaut Nations');
console.log(detection);
// Output:
// {
//   sizeType: 'jeans',
//   confidence: 0.98,
//   sampleSizes: ['30W×32L', '32W×32L', '34W×32L', ...],
//   totalSizesAnalyzed: 87
// }
```

---

## 🎨 Admin UI Design

### **New Page: Vendor Configuration**

**Route**: `/vendor-configuration`

**Layout**: Three-tab interface

#### **Tab 1: Vendor List**

```
┌────────────────────────────────────────────────────────────────────┐
│ 🏢 Vendor Configuration Management                   [+ Add Vendor]│
├────────────────────────────────────────────────────────────────────┤
│ Search: [_______________]  Filter: [All / Prepacks / Open Stock]   │
├────────────────────────────────────────────────────────────────────┤
│ Vendor Name          │ Type      │ Size Type │ Min Order │ Actions│
├──────────────────────┼───────────┼───────────┼───────────┼────────┤
│ Argonaut Nations     │ 🎁 Prepack│ Jeans     │ 12 pcs    │ Edit   │
│ Jordan Craig         │ 🎁 Prepack│ Jeans     │ 24 pcs    │ Edit   │
│ Ethika               │ 📦 Open   │ Apparel   │ 6 pcs     │ Edit   │
│ Levi's               │ 📦 Open   │ Jeans     │ None      │ Edit   │
│ New Era              │ 🎁 Prepack│ Apparel   │ 12 pcs    │ Edit   │
└────────────────────────────────────────────────────────────────────┘
```

**Actions**:
- Click vendor row → Opens edit dialog
- "+ Add Vendor" button → Opens create dialog
- Auto-detect button → Runs size type detection

#### **Tab 2: Prepack Configurations**

```
┌────────────────────────────────────────────────────────────────────┐
│ 📦 Prepack Configurations                    [+ Add Configuration] │
├────────────────────────────────────────────────────────────────────┤
│ Filter Vendor: [Argonaut Nations ▼]  Status: [Active ▼]           │
├────────────────────────────────────────────────────────────────────┤
│ Pack Name    │ Style    │ Pieces/Box │ Cost/Box │ Colors │ Actions│
├──────────────┼──────────┼────────────┼──────────┼────────┼────────┤
│ Pack A       │ 8501B    │ 12         │ $300     │ 4      │ Edit   │
│ Pack B       │ 8501B    │ 12         │ $300     │ 4      │ Edit   │
│ Standard Pack│ All      │ 12         │ $360     │ 5      │ Edit   │
└────────────────────────────────────────────────────────────────────┘
```

**Edit Dialog** (for Pack A):
```
┌────────────────────────────────────────────────────────────┐
│ Edit Prepack Configuration: Pack A                   [✕]  │
├────────────────────────────────────────────────────────────┤
│ Vendor:        Argonaut Nations (readonly)                │
│ Pack Name:     [Pack A                    ]                │
│ Style Number:  [8501B                     ] (optional)     │
│ Size Type:     [Jeans ▼]                                  │
│ Pieces/Box:    [12]                                        │
│ Cost per Box:  [$300.00]                                   │
│ Color-Specific:☑ Each box contains ONE color              │
│ Available Colors:                                          │
│   [Black ✕] [Olive ✕] [Navy ✕] [Khaki ✕] [+ Add]         │
│                                                            │
│ Size Distribution:                        [+ Add Size]     │
│ ┌──────────────┬──────────┬────────────┬─────────┐        │
│ │ Size         │ Quantity │ Percentage │ Actions │        │
│ ├──────────────┼──────────┼────────────┼─────────┤        │
│ │ 30W×32L      │ [4]      │ 33.33%     │ [✕]     │        │
│ │ 32W×32L      │ [2]      │ 16.67%     │ [✕]     │        │
│ │ 34W×32L      │ [2]      │ 16.67%     │ [✕]     │        │
│ │ 36W×32L      │ [1]      │ 8.33%      │ [✕]     │        │
│ │ 38W×32L      │ [1]      │ 8.33%      │ [✕]     │        │
│ │ 40W×32L      │ [1]      │ 8.33%      │ [✕]     │        │
│ │ 42W×32L      │ [1]      │ 8.33%      │ [✕]     │        │
│ └──────────────┴──────────┴────────────┴─────────┘        │
│ Total: 12 pieces (100%) ✓                                 │
│                                                            │
│                    [Cancel]  [Save Configuration]          │
└────────────────────────────────────────────────────────────┘
```

**Validation**:
- ✅ Sum of quantities must equal pieces_per_box
- ✅ Percentages auto-calculated
- ✅ Size values must match size_type pattern
- ✅ At least one color if is_color_specific = true

#### **Tab 3: Bulk Import**

```
┌────────────────────────────────────────────────────────────────────┐
│ 📥 Bulk Import Configurations                                      │
├────────────────────────────────────────────────────────────────────┤
│ Import vendor and prepack configurations from CSV or Excel files. │
│                                                                    │
│ Step 1: Download Template                                         │
│   [Download Vendor Template.csv]                                  │
│   [Download Prepack Template.csv]                                 │
│                                                                    │
│ Step 2: Upload Filled Template                                    │
│   [📁 Choose File...]  vendors_config.csv                         │
│   [Upload Vendors]                                                 │
│                                                                    │
│   [📁 Choose File...]  prepacks_config.csv                        │
│   [Upload Prepacks]                                                │
│                                                                    │
│ Recent Imports:                                                    │
│   ✓ vendors_config.csv - 23 vendors imported (2 min ago)          │
│   ✓ prepacks_config.csv - 15 configs imported (5 min ago)         │
└────────────────────────────────────────────────────────────────────┘
```

**CSV Template Format**:

`vendor_template.csv`:
```csv
vendor_name,uses_prepacks,min_order_qty,min_order_value,default_size_type,contact_email,notes
Argonaut Nations,true,12,,jeans,orders@argonaut.com,Pack A and Pack B available
Jordan Craig,true,24,500.00,jeans,sales@jordancraig.com,Minimum $500 order
Ethika,false,6,,apparel,orders@ethika.com,Open stock available
```

`prepack_template.csv`:
```csv
vendor_name,prepack_name,style_number,size_type,pieces_per_box,cost_per_box,available_colors
Argonaut Nations,Pack A,8501B,jeans,12,300.00,"Black,Olive,Navy,Khaki"
Argonaut Nations,Pack B,8501B,jeans,12,300.00,"Black,Olive,Navy,Khaki"
```

`prepack_sizes_template.csv`:
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

## 🔌 API Endpoints

### **Vendor Configuration Endpoints**

```typescript
// Get all vendors with configurations
GET /api/vendor-configurations
Query params: ?search=<term>&filter=<prepack|openstock|all>
Response: VendorConfiguration[]

// Get single vendor
GET /api/vendor-configurations/:vendorName
Response: VendorConfiguration

// Create vendor configuration
POST /api/vendor-configurations
Body: InsertVendorConfiguration
Response: VendorConfiguration

// Update vendor configuration
PUT /api/vendor-configurations/:vendorName
Body: Partial<InsertVendorConfiguration>
Response: VendorConfiguration

// Delete vendor configuration
DELETE /api/vendor-configurations/:vendorName
Response: { success: true }

// Auto-detect size type for vendor
POST /api/vendor-configurations/:vendorName/detect-size-type
Response: SizeTypeDetection
```

### **Prepack Configuration Endpoints**

```typescript
// Get all prepack configs
GET /api/prepack-configurations
Query params: ?vendor=<name>&active=<true|false>
Response: PrepackConfiguration[]

// Get prepack config with size distributions
GET /api/prepack-configurations/:id
Response: PrepackConfiguration & { sizeDistributions: PrepackSizeDistribution[] }

// Create prepack configuration
POST /api/prepack-configurations
Body: {
  config: InsertPrepackConfiguration,
  sizeDistributions: InsertPrepackSizeDistribution[]
}
Response: PrepackConfiguration

// Update prepack configuration
PUT /api/prepack-configurations/:id
Body: {
  config: Partial<InsertPrepackConfiguration>,
  sizeDistributions: InsertPrepackSizeDistribution[]
}
Response: PrepackConfiguration

// Delete prepack configuration
DELETE /api/prepack-configurations/:id
Response: { success: true }
```

### **Bulk Import Endpoints**

```typescript
// Upload vendor configurations CSV
POST /api/vendor-configurations/bulk-import
Body: FormData with file
Response: {
  success: true,
  imported: number,
  failed: number,
  errors: string[]
}

// Upload prepack configurations CSV
POST /api/prepack-configurations/bulk-import
Body: FormData with file
Response: {
  success: true,
  imported: number,
  failed: number,
  errors: string[]
}

// Download templates
GET /api/vendor-configurations/template
Response: CSV file download

GET /api/prepack-configurations/template
Response: CSV file download
```

---

## ✅ Implementation Checklist

### **PHASE 0A: Database Schema** (1 day)

- [ ] **Task 0A.1**: Add Drizzle schema definitions to `/shared/schema.ts`
  - [ ] Add `vendorConfigurations` table schema
  - [ ] Add `prepackConfigurations` table schema
  - [ ] Add `prepackSizeDistributions` table schema
  - [ ] Add insert schemas for all tables
  - [ ] Add TypeScript types
  - [ ] **Estimated Lines**: ~200 lines

- [ ] **Task 0A.2**: Create database migration
  - [ ] Run `npm run db:push` to create tables
  - [ ] Verify tables created successfully
  - [ ] Test foreign key constraints
  - [ ] Add indexes for performance

- [ ] **Task 0A.3**: Seed initial data
  - [ ] Add Argonaut Nations configuration (test vendor)
  - [ ] Add Pack A and Pack B for Style 8501B
  - [ ] Add size distributions for both packs
  - [ ] Verify data integrity

**Acceptance Criteria**:
- [ ] All 3 tables created successfully
- [ ] Foreign keys work correctly
- [ ] Can insert and query test data
- [ ] No TypeScript compilation errors

---

### **PHASE 0B: Backend Logic** (2 days)

- [ ] **Task 0B.1**: Size type detection function
  - [ ] File: `/server/lib/size-type-detection.ts` (NEW)
  - [ ] Implement `detectSizeType(vendorName)` function
  - [ ] Add pattern matching for all 5 size types
  - [ ] Calculate confidence scores
  - [ ] **Estimated Lines**: ~150 lines

- [ ] **Task 0B.2**: Storage layer functions
  - [ ] File: `/server/storage.ts`
  - [ ] Add `getVendorConfigurations()`
  - [ ] Add `getVendorConfiguration(vendorName)`
  - [ ] Add `createVendorConfiguration()`
  - [ ] Add `updateVendorConfiguration()`
  - [ ] Add `deleteVendorConfiguration()`
  - [ ] Add `getPrepackConfigurations()`
  - [ ] Add `getPrepackConfigurationWithSizes(id)`
  - [ ] Add `createPrepackConfiguration()`
  - [ ] Add `updatePrepackConfiguration()`
  - [ ] Add `deletePrepackConfiguration()`
  - [ ] **Estimated Lines**: ~400 lines

- [ ] **Task 0B.3**: CSV import/export handlers
  - [ ] File: `/server/lib/vendor-import.ts` (NEW)
  - [ ] Implement CSV parsing for vendor configs
  - [ ] Implement CSV parsing for prepack configs
  - [ ] Add validation logic
  - [ ] Generate CSV templates
  - [ ] **Estimated Lines**: ~200 lines

- [ ] **Task 0B.4**: API routes
  - [ ] File: `/server/routes.ts`
  - [ ] Add 6 vendor configuration endpoints
  - [ ] Add 5 prepack configuration endpoints
  - [ ] Add 4 bulk import endpoints
  - [ ] Add error handling
  - [ ] **Estimated Lines**: ~300 lines

**Acceptance Criteria**:
- [ ] All endpoints return HTTP 200 on success
- [ ] Size type detection works with 90%+ accuracy
- [ ] CSV import handles errors gracefully
- [ ] CRUD operations work correctly

---

### **PHASE 0C: Frontend Admin UI** (2-3 days)

- [ ] **Task 0C.1**: Create vendor configuration page
  - [ ] File: `/client/src/pages/vendor-configuration.tsx` (NEW)
  - [ ] Implement three-tab layout
  - [ ] Add search and filter functionality
  - [ ] Add vendor list table
  - [ ] **Estimated Lines**: ~300 lines

- [ ] **Task 0C.2**: Vendor edit dialog
  - [ ] File: `/client/src/components/vendor-config-dialog.tsx` (NEW)
  - [ ] Implement form with validation
  - [ ] Add auto-detect size type button
  - [ ] Handle create and update
  - [ ] **Estimated Lines**: ~250 lines

- [ ] **Task 0C.3**: Prepack configurations tab
  - [ ] Add prepack list table
  - [ ] Add filter by vendor dropdown
  - [ ] Show pack details in table
  - [ ] **Estimated Lines**: ~200 lines (in vendor-configuration.tsx)

- [ ] **Task 0C.4**: Prepack edit dialog
  - [ ] File: `/client/src/components/prepack-config-dialog.tsx` (NEW)
  - [ ] Implement pack configuration form
  - [ ] Add size distribution editor
  - [ ] Add color picker/manager
  - [ ] Validate total pieces = 100%
  - [ ] **Estimated Lines**: ~400 lines

- [ ] **Task 0C.5**: Bulk import tab
  - [ ] Add file upload component
  - [ ] Add template download buttons
  - [ ] Show import progress
  - [ ] Display import results
  - [ ] **Estimated Lines**: ~150 lines (in vendor-configuration.tsx)

- [ ] **Task 0C.6**: Update App.tsx routing
  - [ ] Add route: `/vendor-configuration`
  - [ ] Add to navigation menu
  - [ ] Require authentication
  - [ ] **Estimated Lines**: ~10 lines

**Acceptance Criteria**:
- [ ] Page loads without errors
- [ ] Can create/edit/delete vendors
- [ ] Can create/edit/delete prepacks
- [ ] Size distribution validation works
- [ ] CSV import/export works
- [ ] Auto-detect size type works

---

### **PHASE 0D: ML Service Integration** (1 day)

- [ ] **Task 0D.1**: Update prepack data utilities
  - [ ] File: `/ml_service/utils/prepack_data.py`
  - [ ] Update `get_vendor_prepacks()` to query new tables
  - [ ] Update `check_vendor_uses_prepacks()` to use vendor_configurations
  - [ ] Add `get_prepack_size_distribution()` function
  - [ ] **Estimated Lines**: ~100 lines

- [ ] **Task 0D.2**: Test ML service integration
  - [ ] Verify prepack recommendations use new data
  - [ ] Test with Argonaut Nations Style 8501B
  - [ ] Verify color-aware optimization works
  - [ ] **Estimated Lines**: ~50 lines (tests)

**Acceptance Criteria**:
- [ ] ML service reads from database correctly
- [ ] Prepack recommendations work with new schema
- [ ] Test case passes (Style 8501B)

---

## 📊 Data Migration Strategy

### **Initial Setup: Top 20 Vendors**

Based on our database query, here's the recommended initial setup:

#### **Priority 1: Prepack Vendors** (Known to use prepacks)
1. **Argonaut Nations** (734 items) - ✅ Test case vendor
   - Size type: Jeans
   - Prepacks: Pack A, Pack B
   - Already documented in test case

2. **Jordan Craig** (5,980 items)
   - Size type: Auto-detect (likely jeans)
   - Prepacks: TBD (ask vendor)

3. **New Era** (3,436 items)
   - Size type: Auto-detect (likely apparel - caps)
   - Prepacks: TBD (ask vendor)

#### **Priority 2: High-Volume Vendors** (May use prepacks)
4. Ethika (1,681 items) - Likely apparel (underwear)
5. NEXUS (1,192 items)
6. WaiMea (1,185 items)
7. Black Keys (1,146 items)

#### **Priority 3: All Others** (Mark as open stock initially)
- Can be updated later as vendor information becomes available

### **Data Collection Plan**

1. **Week 1**: Set up infrastructure
   - [ ] Create database tables
   - [ ] Build admin UI
   - [ ] Auto-detect size types

2. **Week 2**: Configure top 5 vendors
   - [ ] Argonaut Nations (complete from test case)
   - [ ] Contact 4 other high-priority vendors
   - [ ] Request prepack information

3. **Week 3**: Bulk configuration
   - [ ] Configure remaining vendors
   - [ ] Import via CSV
   - [ ] Validate all data

4. **Ongoing**: Maintain configurations
   - [ ] Update as vendors change prepacks
   - [ ] Add new vendors as they're added to inventory

---

## 🎯 Success Criteria

### **Functional Requirements**
- [ ] Can add/edit/delete vendor configurations
- [ ] Can add/edit/delete prepack configurations
- [ ] Can define size distributions for each prepack
- [ ] Auto-detect size types with 90%+ accuracy
- [ ] Import configurations via CSV
- [ ] Export configurations to CSV

### **Data Quality**
- [ ] Top 5 vendors fully configured
- [ ] All prepack vendors marked correctly
- [ ] Size distributions sum to 100%
- [ ] All active vendors have size type

### **Integration**
- [ ] ML service reads from new tables
- [ ] Prepack recommendations use configuration data
- [ ] Color-aware optimization works
- [ ] Test case (8501B) passes

---

## 📚 Documentation Updates Required

After implementing this system, update these documents:

- [ ] `/docs/INVENTORY_ACTION_CENTER_UI_IMPLEMENTATION.md`
  - Add note: "Prerequisites: Complete PHASE 0 first"
  - Update Phase 1 to reference vendor configurations

- [ ] `/docs/ML_Transfer_Restock_System_Master_Plan.md`
  - Add Phase 0 section
  - Update vendor data gathering section

- [ ] Create `/docs/USER_GUIDE_VENDOR_CONFIGURATION.md`
  - How to add a new vendor
  - How to configure prepacks
  - How to use bulk import

---

## 🚨 Risks and Mitigations

### **Risk 1: Vendor Data Not Available**
- **Impact**: Cannot configure prepacks
- **Probability**: High
- **Mitigation**:
  - Start with Argonaut Nations (we have this data)
  - Contact top vendors systematically
  - Allow manual configuration for unknowns

### **Risk 2: Size Type Detection Fails**
- **Impact**: Incorrect prepack matching
- **Probability**: Medium
- **Mitigation**:
  - Allow manual override
  - Show confidence scores
  - Provide sample sizes for verification

### **Risk 3: Complex Size Distributions**
- **Impact**: Hard to configure in UI
- **Probability**: Low
- **Mitigation**:
  - Provide CSV import for complex cases
  - Add templates for common distributions
  - Allow copy from existing packs

---

## 🔄 Relationship to Main Implementation

### **THIS IS PHASE 0** - Foundation
This system must be completed BEFORE the Inventory Action Center UI can work.

### **Updated Implementation Order**:

**PHASE 0**: Vendor & Prepack Configuration System (THIS DOCUMENT)
- 0A: Database Schema (1 day)
- 0B: Backend Logic (2 days)
- 0C: Frontend Admin UI (2-3 days)
- 0D: ML Service Integration (1 day)
- **Total**: 6-7 days

**PHASE 1-5**: Inventory Action Center UI (ORIGINAL PLAN)
- As documented in `/docs/INVENTORY_ACTION_CENTER_UI_IMPLEMENTATION.md`
- **Total**: 5-7 days

**Grand Total**: 11-14 days for complete system

---

## 📝 Next Steps

1. **Review this document** with team and stakeholders
2. **Get approval** to proceed with Phase 0
3. **Assign tasks** from checklist
4. **Begin with Task 0A.1** (database schema)
5. **Test with Argonaut Nations** throughout development
6. **Complete Phase 0** before starting original Phase 1

---

**Document Status**: ✅ READY FOR REVIEW AND APPROVAL

**Priority**: 🚨 CRITICAL - BLOCKING ALL OTHER WORK

**Estimated Effort**: 6-7 days

---

**END OF VENDOR & PREPACK CONFIGURATION SYSTEM PLAN**

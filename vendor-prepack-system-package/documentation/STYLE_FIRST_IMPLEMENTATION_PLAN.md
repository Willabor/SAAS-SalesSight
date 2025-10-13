# Style-First Architecture - Implementation Plan

**Status**: 🚧 IN PROGRESS
**Approach**: Option B - Style-First Database Architecture
**Estimated Time**: 10-12 hours
**Started**: January 2025

---

## 🎯 DESIGN DECISIONS (USER CONFIRMED)

1. ✅ **Option B** - Proper style-first database architecture
2. ✅ **Colors are SUGGESTED, not enforced** - Each pack can override
   - Example: Pack A/B/C have 14 colors (Black, Bone, Burgundy, etc.)
   - Pack E only has 3 colors (Black, Grey, White) for big sizes
3. ✅ **Style numbers are REQUIRED** - Cannot create pack without style

---

## 📊 REVISED DATABASE SCHEMA

### Key Design: Flexible Color Inheritance

**Style Level:**
- Stores `default_colors` - suggested colors for new packs
- When you add Pack A, B, C → they get these 14 colors by default

**Pack Level:**
- Stores `available_colors` - actual colors for this specific pack
- Can be modified (Pack E only needs 3 colors)
- Pre-filled from style's default_colors when created

### SQL Schema

```sql
-- ============================================================
-- STYLE CONFIGURATIONS TABLE (NEW)
-- ============================================================
CREATE TABLE style_configurations (
  id SERIAL PRIMARY KEY,
  vendor_name TEXT NOT NULL REFERENCES vendor_configurations(vendor_name) ON DELETE CASCADE,
  style_number TEXT NOT NULL,
  size_type TEXT NOT NULL CHECK (size_type IN ('jeans', 'apparel', 'shoes', 'numeric', 'onesize')),
  default_colors JSONB,  -- Suggested colors for new packs (e.g., 14 colors)
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_vendor_style UNIQUE(vendor_name, style_number)
);

CREATE INDEX idx_style_vendor ON style_configurations(vendor_name);
CREATE INDEX idx_style_number ON style_configurations(style_number);

-- ============================================================
-- PREPACK CONFIGURATIONS TABLE (MODIFIED)
-- ============================================================
CREATE TABLE prepack_configurations_new (
  id SERIAL PRIMARY KEY,
  style_config_id INTEGER NOT NULL REFERENCES style_configurations(id) ON DELETE CASCADE,
  prepack_name TEXT NOT NULL,  -- "Pack A", "Pack B", "Pack E"
  pieces_per_box INTEGER NOT NULL CHECK (pieces_per_box > 0),
  cost_per_box DECIMAL(10, 2),
  available_colors JSONB,  -- Actual colors for THIS pack (can differ from style defaults)
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT unique_style_pack UNIQUE(style_config_id, prepack_name)
);

CREATE INDEX idx_prepack_style ON prepack_configurations_new(style_config_id);

-- ============================================================
-- SIZE DISTRIBUTIONS TABLE (UNCHANGED)
-- ============================================================
CREATE TABLE prepack_size_distributions (
  id SERIAL PRIMARY KEY,
  prepack_config_id INTEGER NOT NULL REFERENCES prepack_configurations(id) ON DELETE CASCADE,
  size_value TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  percentage DECIMAL(5, 2),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_size_dist_prepack ON prepack_size_distributions(prepack_config_id);
```

### Removed Fields from Prepack Configurations

- ❌ `vendor_name` - Now on style
- ❌ `style_number` - Now on style
- ❌ `size_type` - Now on style
- ❌ `is_color_specific` - Removed (always true for prepacks)

### Field Behavior Changes

| Field | Old Location | New Location | Notes |
|-------|-------------|--------------|-------|
| `vendor_name` | prepack | style | Defined once per style |
| `style_number` | prepack | style | **REQUIRED** (NOT NULL) |
| `size_type` | prepack | style | Shared across all packs in style |
| `default_colors` | N/A | style | **NEW** - Default colors for style |
| `available_colors` | prepack | prepack | Still here - actual colors for pack |
| `is_color_specific` | prepack | REMOVED | Always true for prepacks |

---

## 🔄 DATA MIGRATION SCRIPT

### Migration Strategy

1. **Create new tables** (style_configurations, prepack_configurations_new)
2. **Extract unique styles** from existing prepacks
3. **Create style records** with default colors from first pack
4. **Migrate packs** to new table with style_config_id
5. **Migrate size distributions** (IDs stay the same)
6. **Drop old table** and rename new one

### Migration SQL

```sql
-- ============================================================
-- STEP 1: Create new tables
-- ============================================================
CREATE TABLE style_configurations ( ... );  -- See schema above
CREATE TABLE prepack_configurations_new ( ... );

-- ============================================================
-- STEP 2: Migrate existing data
-- ============================================================

-- 2a. Create style configurations from existing prepacks
-- Group by (vendor_name, style_number) and take first pack's metadata
INSERT INTO style_configurations (vendor_name, style_number, size_type, default_colors, description)
SELECT DISTINCT ON (vendor_name, style_number)
  vendor_name,
  COALESCE(style_number, 'UNKNOWN-' || id::TEXT) as style_number,  -- Generate style number if missing
  size_type,
  available_colors as default_colors,  -- Use first pack's colors as default
  'Migrated from prepack configuration' as description
FROM prepack_configurations
WHERE style_number IS NOT NULL  -- Only migrate packs with style numbers
ORDER BY vendor_name, style_number, id ASC;

-- 2b. Migrate prepack configurations to new structure
INSERT INTO prepack_configurations_new (
  style_config_id,
  prepack_name,
  pieces_per_box,
  cost_per_box,
  available_colors,
  description,
  created_at,
  updated_at
)
SELECT
  sc.id as style_config_id,
  pc.prepack_name,
  pc.pieces_per_box,
  pc.cost_per_box,
  pc.available_colors,
  pc.description,
  pc.created_at,
  pc.updated_at
FROM prepack_configurations pc
JOIN style_configurations sc ON
  pc.vendor_name = sc.vendor_name AND
  pc.style_number = sc.style_number
WHERE pc.style_number IS NOT NULL;

-- 2c. Update size distributions to point to new prepack IDs
-- This is tricky - we need to preserve the relationships
-- Create temporary mapping table
CREATE TEMP TABLE id_mapping AS
SELECT
  pc_old.id as old_id,
  pc_new.id as new_id
FROM prepack_configurations pc_old
JOIN style_configurations sc ON
  pc_old.vendor_name = sc.vendor_name AND
  pc_old.style_number = sc.style_number
JOIN prepack_configurations_new pc_new ON
  pc_new.style_config_id = sc.id AND
  pc_new.prepack_name = pc_old.prepack_name;

-- Update size distributions with new IDs
UPDATE prepack_size_distributions psd
SET prepack_config_id = im.new_id
FROM id_mapping im
WHERE psd.prepack_config_id = im.old_id;

-- ============================================================
-- STEP 3: Verify migration
-- ============================================================

-- Check all styles were created
SELECT
  COUNT(DISTINCT vendor_name || '::' || style_number) as old_style_count
FROM prepack_configurations
WHERE style_number IS NOT NULL;

SELECT COUNT(*) as new_style_count FROM style_configurations;

-- Check all packs were migrated
SELECT COUNT(*) as old_pack_count
FROM prepack_configurations
WHERE style_number IS NOT NULL;

SELECT COUNT(*) as new_pack_count FROM prepack_configurations_new;

-- Check all size distributions are still connected
SELECT COUNT(*) as orphaned_distributions
FROM prepack_size_distributions psd
LEFT JOIN prepack_configurations_new pc ON psd.prepack_config_id = pc.id
WHERE pc.id IS NULL;

-- Should be 0 orphaned distributions

-- ============================================================
-- STEP 4: Handle packs without style numbers (OPTIONAL)
-- ============================================================

-- Option A: Create dummy styles for packs without style numbers
INSERT INTO style_configurations (vendor_name, style_number, size_type, default_colors, description)
SELECT DISTINCT
  vendor_name,
  'LEGACY-' || id::TEXT as style_number,
  size_type,
  available_colors,
  'Legacy pack without style number - requires manual classification'
FROM prepack_configurations
WHERE style_number IS NULL;

-- Then migrate these packs
INSERT INTO prepack_configurations_new (...)
SELECT ...
FROM prepack_configurations pc
JOIN style_configurations sc ON
  sc.style_number = 'LEGACY-' || pc.id::TEXT
WHERE pc.style_number IS NULL;

-- Option B: Delete packs without style numbers (if acceptable)
-- DELETE FROM prepack_configurations WHERE style_number IS NULL;

-- ============================================================
-- STEP 5: Swap tables
-- ============================================================

-- Drop old table
DROP TABLE prepack_configurations CASCADE;

-- Rename new table
ALTER TABLE prepack_configurations_new RENAME TO prepack_configurations;

-- Recreate foreign key constraints for size distributions
ALTER TABLE prepack_size_distributions
  DROP CONSTRAINT IF EXISTS prepack_size_distributions_prepack_config_id_fkey,
  ADD CONSTRAINT prepack_size_distributions_prepack_config_id_fkey
    FOREIGN KEY (prepack_config_id)
    REFERENCES prepack_configurations(id)
    ON DELETE CASCADE;

-- ============================================================
-- STEP 6: Verify final state
-- ============================================================

-- All styles should have at least one pack
SELECT
  sc.id,
  sc.vendor_name,
  sc.style_number,
  COUNT(pc.id) as pack_count
FROM style_configurations sc
LEFT JOIN prepack_configurations pc ON sc.id = pc.style_config_id
GROUP BY sc.id, sc.vendor_name, sc.style_number
HAVING COUNT(pc.id) = 0;

-- Should return no rows

-- All packs should have at least one size distribution
SELECT
  pc.id,
  pc.prepack_name,
  COUNT(psd.id) as size_count
FROM prepack_configurations pc
LEFT JOIN prepack_size_distributions psd ON pc.id = psd.prepack_config_id
GROUP BY pc.id, pc.prepack_name
HAVING COUNT(psd.id) = 0;

-- Should return no rows
```

---

## 📝 DRIZZLE SCHEMA UPDATES

### File: `shared/schema.ts`

```typescript
import { pgTable, serial, text, integer, decimal, jsonb, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ============================================================
// STYLE CONFIGURATIONS (NEW)
// ============================================================
export const styleConfigurations = pgTable("style_configurations", {
  id: serial("id").primaryKey(),
  vendorName: text("vendor_name").notNull().references(() => vendorConfigurations.vendorName, { onDelete: "cascade" }),
  styleNumber: text("style_number").notNull(),
  sizeType: text("size_type").notNull(),  // 'jeans' | 'apparel' | 'shoes' | 'numeric' | 'onesize'
  defaultColors: jsonb("default_colors").$type<string[]>(),  // Default colors for new packs
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueVendorStyle: unique().on(table.vendorName, table.styleNumber),
}));

export const insertStyleConfigurationSchema = createInsertSchema(styleConfigurations, {
  vendorName: z.string().min(1, "Vendor name is required"),
  styleNumber: z.string().min(1, "Style number is required"),
  sizeType: z.enum(["jeans", "apparel", "shoes", "numeric", "onesize"]),
  defaultColors: z.array(z.string()).nullable().optional(),
  description: z.string().nullable().optional(),
});

export const selectStyleConfigurationSchema = createSelectSchema(styleConfigurations);

export type StyleConfiguration = z.infer<typeof selectStyleConfigurationSchema>;
export type InsertStyleConfiguration = z.infer<typeof insertStyleConfigurationSchema>;

// ============================================================
// PREPACK CONFIGURATIONS (MODIFIED)
// ============================================================
export const prepackConfigurations = pgTable("prepack_configurations", {
  id: serial("id").primaryKey(),
  styleConfigId: integer("style_config_id").notNull().references(() => styleConfigurations.id, { onDelete: "cascade" }),
  prepackName: text("prepack_name").notNull(),
  piecesPerBox: integer("pieces_per_box").notNull(),
  costPerBox: decimal("cost_per_box", { precision: 10, scale: 2 }),
  availableColors: jsonb("available_colors").$type<string[]>(),  // Actual colors for this pack
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqueStylePack: unique().on(table.styleConfigId, table.prepackName),
}));

export const insertPrepackConfigurationSchema = createInsertSchema(prepackConfigurations, {
  styleConfigId: z.number().int().positive(),
  prepackName: z.string().min(1, "Pack name is required"),
  piecesPerBox: z.number().int().positive(),
  costPerBox: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
  availableColors: z.array(z.string()).nullable().optional(),
  description: z.string().nullable().optional(),
});

export const selectPrepackConfigurationSchema = createSelectSchema(prepackConfigurations);

export type PrepackConfiguration = z.infer<typeof selectPrepackConfigurationSchema>;
export type InsertPrepackConfiguration = z.infer<typeof insertPrepackConfigurationSchema>;

// ============================================================
// SIZE DISTRIBUTIONS (UNCHANGED)
// ============================================================
export const prepackSizeDistributions = pgTable("prepack_size_distributions", {
  id: serial("id").primaryKey(),
  prepackConfigId: integer("prepack_config_id").notNull().references(() => prepackConfigurations.id, { onDelete: "cascade" }),
  sizeValue: text("size_value").notNull(),
  quantity: integer("quantity").notNull(),
  percentage: decimal("percentage", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPrepackSizeDistributionSchema = createInsertSchema(prepackSizeDistributions, {
  prepackConfigId: z.number().int().positive(),
  sizeValue: z.string().min(1),
  quantity: z.number().int().positive(),
  percentage: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
});

export const selectPrepackSizeDistributionSchema = createSelectSchema(prepackSizeDistributions);

export type PrepackSizeDistribution = z.infer<typeof selectPrepackSizeDistributionSchema>;
export type InsertPrepackSizeDistribution = z.infer<typeof insertPrepackSizeDistributionSchema>;

// ============================================================
// COMBINED TYPES FOR API RESPONSES
// ============================================================

export type StyleWithPacks = StyleConfiguration & {
  packs: (PrepackConfiguration & {
    distributions: PrepackSizeDistribution[];
  })[];
};

export type PrepackWithDistributions = PrepackConfiguration & {
  distributions: PrepackSizeDistribution[];
};
```

---

## 🔧 BACKEND STORAGE LAYER

### File: `server/storage.ts`

Add new methods to the storage interface:

```typescript
interface IStorage {
  // ... existing methods ...

  // Style Configuration methods
  listStyleConfigurations(vendorName?: string): Promise<StyleConfiguration[]>;
  getStyleConfiguration(id: number): Promise<StyleWithPacks | null>;
  createStyleConfiguration(style: InsertStyleConfiguration): Promise<StyleConfiguration>;
  updateStyleConfiguration(id: number, style: Partial<InsertStyleConfiguration>): Promise<StyleConfiguration | null>;
  deleteStyleConfiguration(id: number): Promise<boolean>;

  // Modified prepack methods
  listPrepackConfigurations(styleConfigId?: number): Promise<PrepackConfiguration[]>;
  getPrepackConfiguration(id: number): Promise<PrepackWithDistributions | null>;
  createPrepackConfiguration(pack: InsertPrepackConfiguration, distributions: InsertPrepackSizeDistribution[]): Promise<PrepackWithDistributions>;
  updatePrepackConfiguration(id: number, pack: Partial<InsertPrepackConfiguration>, distributions?: InsertPrepackSizeDistribution[]): Promise<PrepackWithDistributions | null>;
  deletePrepackConfiguration(id: number): Promise<boolean>;
}

// Implementation
export const storage: IStorage = {
  // ============================================================
  // STYLE CONFIGURATIONS
  // ============================================================

  async listStyleConfigurations(vendorName?: string) {
    let query = db.select().from(styleConfigurations);

    if (vendorName) {
      query = query.where(eq(styleConfigurations.vendorName, vendorName));
    }

    return await query;
  },

  async getStyleConfiguration(id: number) {
    const [style] = await db
      .select()
      .from(styleConfigurations)
      .where(eq(styleConfigurations.id, id));

    if (!style) return null;

    // Get all packs for this style
    const packs = await db
      .select()
      .from(prepackConfigurations)
      .where(eq(prepackConfigurations.styleConfigId, id));

    // Get distributions for each pack
    const packsWithDistributions = await Promise.all(
      packs.map(async (pack) => {
        const distributions = await db
          .select()
          .from(prepackSizeDistributions)
          .where(eq(prepackSizeDistributions.prepackConfigId, pack.id));

        return { ...pack, distributions };
      })
    );

    return {
      ...style,
      packs: packsWithDistributions,
    };
  },

  async createStyleConfiguration(style: InsertStyleConfiguration) {
    const [created] = await db
      .insert(styleConfigurations)
      .values({
        ...style,
        updatedAt: new Date(),
      })
      .returning();

    return created;
  },

  async updateStyleConfiguration(id: number, style: Partial<InsertStyleConfiguration>) {
    const [updated] = await db
      .update(styleConfigurations)
      .set({
        ...style,
        updatedAt: new Date(),
      })
      .where(eq(styleConfigurations.id, id))
      .returning();

    return updated || null;
  },

  async deleteStyleConfiguration(id: number) {
    const result = await db
      .delete(styleConfigurations)
      .where(eq(styleConfigurations.id, id));

    return result.rowCount > 0;
  },

  // ============================================================
  // PREPACK CONFIGURATIONS (MODIFIED)
  // ============================================================

  async listPrepackConfigurations(styleConfigId?: number) {
    let query = db.select().from(prepackConfigurations);

    if (styleConfigId) {
      query = query.where(eq(prepackConfigurations.styleConfigId, styleConfigId));
    }

    return await query;
  },

  async createPrepackConfiguration(
    pack: InsertPrepackConfiguration,
    distributions: InsertPrepackSizeDistribution[]
  ) {
    // Create prepack
    const [created] = await db
      .insert(prepackConfigurations)
      .values({
        ...pack,
        updatedAt: new Date(),
      })
      .returning();

    // Create size distributions
    const createdDistributions = await db
      .insert(prepackSizeDistributions)
      .values(
        distributions.map((dist) => ({
          ...dist,
          prepackConfigId: created.id,
        }))
      )
      .returning();

    return {
      ...created,
      distributions: createdDistributions,
    };
  },

  async updatePrepackConfiguration(
    id: number,
    pack: Partial<InsertPrepackConfiguration>,
    distributions?: InsertPrepackSizeDistribution[]
  ) {
    // Update prepack
    const [updated] = await db
      .update(prepackConfigurations)
      .set({
        ...pack,
        updatedAt: new Date(),
      })
      .where(eq(prepackConfigurations.id, id))
      .returning();

    if (!updated) return null;

    // Update distributions if provided
    if (distributions) {
      // Delete old distributions
      await db
        .delete(prepackSizeDistributions)
        .where(eq(prepackSizeDistributions.prepackConfigId, id));

      // Insert new distributions
      const newDistributions = await db
        .insert(prepackSizeDistributions)
        .values(
          distributions.map((dist) => ({
            ...dist,
            prepackConfigId: id,
          }))
        )
        .returning();

      return {
        ...updated,
        distributions: newDistributions,
      };
    }

    // Get existing distributions
    const existingDistributions = await db
      .select()
      .from(prepackSizeDistributions)
      .where(eq(prepackSizeDistributions.prepackConfigId, id));

    return {
      ...updated,
      distributions: existingDistributions,
    };
  },

  // ... rest of existing methods ...
};
```

---

## 🌐 API ENDPOINTS

### File: `server/routes.ts`

```typescript
// ============================================================
// STYLE CONFIGURATION ENDPOINTS (NEW)
// ============================================================

// List all styles (optionally filtered by vendor)
app.get("/api/style-configurations", isAuthenticated, async (req, res) => {
  try {
    const { vendorName } = req.query;

    const styles = await storage.listStyleConfigurations(
      vendorName ? String(vendorName) : undefined
    );

    res.json(styles);
  } catch (error) {
    console.error("Error fetching style configurations:", error);
    res.status(500).json({ error: "Failed to fetch style configurations" });
  }
});

// Get single style with all packs and distributions
app.get("/api/style-configurations/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid style ID" });
    }

    const style = await storage.getStyleConfiguration(id);

    if (!style) {
      return res.status(404).json({ error: "Style configuration not found" });
    }

    res.json(style);
  } catch (error) {
    console.error("Error fetching style configuration:", error);
    res.status(500).json({ error: "Failed to fetch style configuration" });
  }
});

// Create new style
app.post("/api/style-configurations", isAuthenticated, async (req, res) => {
  try {
    const validation = insertStyleConfigurationSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validation.error.errors
      });
    }

    const created = await storage.createStyleConfiguration(validation.data);

    res.status(201).json(created);
  } catch (error: any) {
    console.error("Error creating style configuration:", error);

    if (error.code === "23505") {  // Unique constraint violation
      return res.status(409).json({
        error: "Style number already exists for this vendor"
      });
    }

    res.status(500).json({ error: "Failed to create style configuration" });
  }
});

// Update style
app.put("/api/style-configurations/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid style ID" });
    }

    const updated = await storage.updateStyleConfiguration(id, req.body);

    if (!updated) {
      return res.status(404).json({ error: "Style configuration not found" });
    }

    res.json(updated);
  } catch (error) {
    console.error("Error updating style configuration:", error);
    res.status(500).json({ error: "Failed to update style configuration" });
  }
});

// Delete style (cascades to packs)
app.delete("/api/style-configurations/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid style ID" });
    }

    const deleted = await storage.deleteStyleConfiguration(id);

    if (!deleted) {
      return res.status(404).json({ error: "Style configuration not found" });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting style configuration:", error);
    res.status(500).json({ error: "Failed to delete style configuration" });
  }
});

// ============================================================
// PREPACK CONFIGURATION ENDPOINTS (MODIFIED)
// ============================================================

// List prepacks (optionally filtered by style)
app.get("/api/prepack-configurations", isAuthenticated, async (req, res) => {
  try {
    const { styleConfigId } = req.query;

    const packs = await storage.listPrepackConfigurations(
      styleConfigId ? parseInt(String(styleConfigId)) : undefined
    );

    res.json(packs);
  } catch (error) {
    console.error("Error fetching prepack configurations:", error);
    res.status(500).json({ error: "Failed to fetch prepack configurations" });
  }
});

// Create prepack (now requires styleConfigId)
app.post("/api/prepack-configurations", isAuthenticated, async (req, res) => {
  try {
    const { config, sizeDistributions } = req.body;

    if (!config || !sizeDistributions) {
      return res.status(400).json({
        error: "Both config and sizeDistributions are required"
      });
    }

    const validation = insertPrepackConfigurationSchema.safeParse(config);

    if (!validation.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: validation.error.errors
      });
    }

    const created = await storage.createPrepackConfiguration(
      validation.data,
      sizeDistributions
    );

    res.status(201).json(created);
  } catch (error: any) {
    console.error("Error creating prepack configuration:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        error: "Pack name already exists for this style"
      });
    }

    if (error.code === "23503") {
      return res.status(404).json({
        error: "Style configuration not found"
      });
    }

    res.status(500).json({ error: "Failed to create prepack configuration" });
  }
});

// Update prepack
app.put("/api/prepack-configurations/:id", isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid prepack ID" });
    }

    const { prepack, distributions } = req.body;

    if (!prepack) {
      return res.status(400).json({ error: "Prepack configuration is required" });
    }

    const updated = await storage.updatePrepackConfiguration(
      id,
      prepack,
      distributions
    );

    if (!updated) {
      return res.status(404).json({ error: "Prepack configuration not found" });
    }

    res.json(updated);
  } catch (error) {
    console.error("Error updating prepack configuration:", error);
    res.status(500).json({ error: "Failed to update prepack configuration" });
  }
});

// ... other endpoints stay the same ...
```

---

## NEXT STEPS

1. ✅ Design completed (this document)
2. ⏳ Review and approve migration script
3. ⏳ Test migration on dev database
4. ⏳ Update Drizzle schema
5. ⏳ Implement backend storage layer
6. ⏳ Create API endpoints
7. ⏳ Refactor frontend UI
8. ⏳ Build StyleCard component
9. ⏳ End-to-end testing

**Ready to proceed with implementation?**

-- ============================================================
-- MIGRATION: Style-First Prepack Architecture
-- Date: January 2025
-- Description: Restructure prepack configurations to use style-first hierarchy
--
-- Changes:
-- 1. Create style_configurations table
-- 2. Restructure prepack_configurations to reference styles
-- 3. Migrate existing data
-- 4. Verify data integrity
-- ============================================================

BEGIN;

-- ============================================================
-- STEP 1: Create new style_configurations table
-- ============================================================

CREATE TABLE IF NOT EXISTS style_configurations (
  id SERIAL PRIMARY KEY,
  vendor_name TEXT NOT NULL REFERENCES vendor_configurations(vendor_name) ON DELETE CASCADE,
  style_number TEXT NOT NULL,
  size_type TEXT NOT NULL CHECK (size_type IN ('jeans', 'apparel', 'shoes', 'numeric', 'onesize')),
  default_colors JSONB,  -- Default colors suggested for new packs
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_vendor_style UNIQUE(vendor_name, style_number)
);

CREATE INDEX idx_style_vendor ON style_configurations(vendor_name);
CREATE INDEX idx_style_number ON style_configurations(style_number);

-- ============================================================
-- STEP 2: Create new prepack_configurations table structure
-- ============================================================

CREATE TABLE IF NOT EXISTS prepack_configurations_new (
  id SERIAL PRIMARY KEY,
  style_config_id INTEGER NOT NULL REFERENCES style_configurations(id) ON DELETE CASCADE,
  prepack_name TEXT NOT NULL,
  pieces_per_box INTEGER NOT NULL CHECK (pieces_per_box > 0),
  cost_per_box NUMERIC(10, 2),
  available_colors JSONB,  -- Actual colors for THIS pack
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_style_pack UNIQUE(style_config_id, prepack_name)
);

CREATE INDEX idx_prepack_style ON prepack_configurations_new(style_config_id);

-- ============================================================
-- STEP 3: Migrate existing data
-- ============================================================

-- 3a. Create style configurations from existing prepacks
-- Group by (vendor_name, style_number) and use first pack's metadata
INSERT INTO style_configurations (vendor_name, style_number, size_type, default_colors, description, created_at)
SELECT DISTINCT ON (vendor_name, style_number)
  vendor_name,
  style_number,
  size_type,
  -- Convert text array to JSONB array
  CASE
    WHEN available_colors IS NOT NULL THEN
      to_jsonb(available_colors)
    ELSE NULL
  END as default_colors,
  'Migrated from prepack configuration' as description,
  MIN(created_at) as created_at  -- Use earliest creation date
FROM prepack_configurations
WHERE style_number IS NOT NULL AND style_number != ''
GROUP BY vendor_name, style_number, size_type, available_colors
ORDER BY vendor_name, style_number, MIN(created_at);

-- Log how many styles were created
DO $$
DECLARE
  style_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO style_count FROM style_configurations;
  RAISE NOTICE 'Created % style configurations', style_count;
END $$;

-- 3b. Migrate prepack configurations to new structure
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
  -- Convert text array to JSONB array
  CASE
    WHEN pc.available_colors IS NOT NULL THEN
      to_jsonb(pc.available_colors)
    ELSE NULL
  END as available_colors,
  pc.description,
  pc.created_at,
  pc.updated_at
FROM prepack_configurations pc
JOIN style_configurations sc ON
  pc.vendor_name = sc.vendor_name AND
  pc.style_number = sc.style_number
WHERE pc.style_number IS NOT NULL AND pc.style_number != '';

-- Log how many packs were migrated
DO $$
DECLARE
  pack_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO pack_count FROM prepack_configurations_new;
  RAISE NOTICE 'Migrated % prepack configurations', pack_count;
END $$;

-- 3c. Create temporary ID mapping for size distributions update
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
  pc_new.prepack_name = pc_old.prepack_name
WHERE pc_old.style_number IS NOT NULL AND pc_old.style_number != '';

-- Log mapping count
DO $$
DECLARE
  mapping_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO mapping_count FROM id_mapping;
  RAISE NOTICE 'Created % ID mappings for size distributions', mapping_count;
END $$;

-- 3d. Update size distributions to point to new prepack IDs
UPDATE prepack_size_distributions psd
SET prepack_config_id = im.new_id
FROM id_mapping im
WHERE psd.prepack_config_id = im.old_id;

-- Log how many distributions were updated
DO $$
DECLARE
  dist_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dist_count
  FROM prepack_size_distributions psd
  JOIN prepack_configurations_new pc ON psd.prepack_config_id = pc.id;
  RAISE NOTICE 'Updated % size distributions to new IDs', dist_count;
END $$;

-- ============================================================
-- STEP 4: Verify migration integrity
-- ============================================================

-- Check for orphaned size distributions
DO $$
DECLARE
  orphaned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphaned_count
  FROM prepack_size_distributions psd
  LEFT JOIN prepack_configurations_new pc ON psd.prepack_config_id = pc.id
  WHERE pc.id IS NULL;

  IF orphaned_count > 0 THEN
    RAISE WARNING 'Found % orphaned size distributions!', orphaned_count;
  ELSE
    RAISE NOTICE 'No orphaned size distributions found - migration OK';
  END IF;
END $$;

-- Check all styles have at least one pack
DO $$
DECLARE
  styles_without_packs INTEGER;
BEGIN
  SELECT COUNT(*) INTO styles_without_packs
  FROM style_configurations sc
  LEFT JOIN prepack_configurations_new pc ON sc.id = pc.style_config_id
  WHERE pc.id IS NULL;

  IF styles_without_packs > 0 THEN
    RAISE WARNING 'Found % styles without packs!', styles_without_packs;
  ELSE
    RAISE NOTICE 'All styles have packs - migration OK';
  END IF;
END $$;

-- ============================================================
-- STEP 5: Handle packs without style numbers (OPTIONAL)
-- ============================================================

-- Check if there are packs without style numbers
DO $$
DECLARE
  legacy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO legacy_count
  FROM prepack_configurations
  WHERE style_number IS NULL OR style_number = '';

  IF legacy_count > 0 THEN
    RAISE WARNING 'Found % packs without style numbers - these will NOT be migrated!', legacy_count;
    RAISE NOTICE 'To migrate these packs, you must manually assign style numbers first';
  ELSE
    RAISE NOTICE 'All packs have style numbers - migration OK';
  END IF;
END $$;

-- ============================================================
-- STEP 6: Swap tables (COMMENTED OUT - MANUAL STEP)
-- ============================================================

-- IMPORTANT: This step is commented out for safety.
-- After verifying the migration looks correct, manually run these commands:

-- -- Drop the old table (this will cascade to prepack_size_distributions FK)
-- ALTER TABLE prepack_size_distributions
--   DROP CONSTRAINT IF EXISTS prepack_size_distributions_prepack_config_id_fkey;
--
-- DROP TABLE prepack_configurations CASCADE;
--
-- -- Rename new table
-- ALTER TABLE prepack_configurations_new RENAME TO prepack_configurations;
--
-- -- Recreate foreign key for size distributions
-- ALTER TABLE prepack_size_distributions
--   ADD CONSTRAINT prepack_size_distributions_prepack_config_id_fkey
--     FOREIGN KEY (prepack_config_id)
--     REFERENCES prepack_configurations(id)
--     ON DELETE CASCADE;

-- ============================================================
-- FINAL VERIFICATION QUERIES
-- ============================================================

-- Show migration summary
SELECT
  'Style Configurations' as table_name,
  COUNT(*) as record_count,
  COUNT(DISTINCT vendor_name) as vendor_count
FROM style_configurations
UNION ALL
SELECT
  'Prepack Configurations (NEW)' as table_name,
  COUNT(*) as record_count,
  COUNT(DISTINCT style_config_id) as style_count
FROM prepack_configurations_new
UNION ALL
SELECT
  'Prepack Configurations (OLD)' as table_name,
  COUNT(*) as record_count,
  COUNT(DISTINCT vendor_name || '::' || style_number) as style_count
FROM prepack_configurations
WHERE style_number IS NOT NULL AND style_number != '';

-- Show detailed comparison
SELECT
  'Comparison' as check_type,
  (SELECT COUNT(*) FROM prepack_configurations WHERE style_number IS NOT NULL AND style_number != '') as old_pack_count,
  (SELECT COUNT(*) FROM prepack_configurations_new) as new_pack_count,
  (SELECT COUNT(*) FROM prepack_configurations WHERE style_number IS NOT NULL AND style_number != '') -
  (SELECT COUNT(*) FROM prepack_configurations_new) as difference;

COMMIT;

-- ============================================================
-- POST-MIGRATION MANUAL STEPS
-- ============================================================

/*

After running this migration and verifying the results:

1. Review the migration summary output
2. Check for any warnings about orphaned data
3. If everything looks correct, run the table swap commands from STEP 6
4. Run `npm run db:push` to sync Drizzle schema
5. Test the application thoroughly
6. If issues arise, you can rollback by dropping the new tables:
   - DROP TABLE prepack_configurations_new CASCADE;
   - DROP TABLE style_configurations CASCADE;

7. Update application code to use new schema:
   - Backend: server/storage.ts
   - Backend: server/routes.ts
   - Frontend: client/src/pages/vendor-configuration.tsx

*/

#!/bin/bash

# ============================================================
# Style-First Architecture Migration Rollback
# ============================================================

set -e

echo "==================================="
echo "Migration Rollback Script"
echo "==================================="
echo ""

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set"
  exit 1
fi

echo "This will:"
echo "  - Drop style_configurations table"
echo "  - Drop prepack_configurations_new table (if exists)"
echo "  - Restore original prepack_configurations from backup"
echo ""
echo "WARNING: This will UNDO the migration!"
echo ""
read -p "Continue with rollback? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Rollback cancelled"
  exit 0
fi

# Check if backup files exist
if [ ! -f "backup_prepack_configurations.csv" ]; then
  echo "ERROR: Backup file not found: backup_prepack_configurations.csv"
  echo "Cannot rollback without backup"
  exit 1
fi

echo "Rolling back..."

psql "$DATABASE_URL" <<EOF
BEGIN;

-- Drop new tables (if migration completed)
DROP TABLE IF EXISTS prepack_configurations_new CASCADE;
DROP TABLE IF EXISTS style_configurations CASCADE;

-- If migration was fully completed (tables were swapped),
-- we need to restore from backup
-- Check if current prepack_configurations is the new structure
DO \$\$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'prepack_configurations'
    AND column_name = 'style_config_id'
  ) THEN
    -- New structure detected, need to drop and restore
    RAISE NOTICE 'Detected new table structure, dropping and restoring from backup';

    -- Drop new structure
    ALTER TABLE prepack_size_distributions
      DROP CONSTRAINT IF EXISTS prepack_size_distributions_prepack_config_id_fkey;

    DROP TABLE IF EXISTS prepack_configurations CASCADE;

    -- Recreate old structure
    CREATE TABLE prepack_configurations (
      id SERIAL PRIMARY KEY,
      vendor_name TEXT NOT NULL,
      prepack_name TEXT NOT NULL,
      style_number TEXT,
      size_type TEXT NOT NULL,
      pieces_per_box INTEGER NOT NULL,
      cost_per_box NUMERIC(10, 2),
      is_color_specific BOOLEAN DEFAULT true,
      available_colors TEXT[],
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      CONSTRAINT unique_vendor_prepack_style UNIQUE(vendor_name, prepack_name, style_number)
    );

    CREATE INDEX idx_vendor_prepack ON prepack_configurations(vendor_name);
  ELSE
    RAISE NOTICE 'Old table structure detected, no restoration needed';
  END IF;
END \$\$;

COMMIT;
EOF

# Restore data from backup if table was recreated
if [ -f "backup_prepack_configurations.csv" ]; then
  echo "Restoring prepack_configurations from backup..."
  psql "$DATABASE_URL" -c "\COPY prepack_configurations FROM 'backup_prepack_configurations.csv' CSV HEADER"
fi

# Update size distributions to use old IDs
echo "Restoring size distribution foreign keys..."
psql "$DATABASE_URL" <<EOF
BEGIN;

-- Recreate foreign key
ALTER TABLE prepack_size_distributions
  DROP CONSTRAINT IF EXISTS prepack_size_distributions_prepack_config_id_fkey;

ALTER TABLE prepack_size_distributions
  ADD CONSTRAINT prepack_size_distributions_prepack_config_id_fkey
    FOREIGN KEY (prepack_config_id)
    REFERENCES prepack_configurations(id)
    ON DELETE CASCADE;

COMMIT;
EOF

echo "✓ Rollback completed"
echo ""
echo "Next steps:"
echo "  1. Run: npm run db:push"
echo "  2. Verify application works with old schema"
echo ""
echo "==================================="
echo "Rollback finished"
echo "==================================="

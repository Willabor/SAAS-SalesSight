#!/bin/bash

# ============================================================
# Style-First Architecture Migration Runner
# ============================================================

set -e  # Exit on error

echo "==================================="
echo "Style-First Architecture Migration"
echo "==================================="
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set"
  echo "Please set it in your .env file or export it:"
  echo "  export DATABASE_URL='postgresql://...'"
  exit 1
fi

# Function to run SQL and capture output
run_sql() {
  psql "$DATABASE_URL" -f "$1"
}

# Step 1: Backup current data
echo "[1/5] Creating backup of current data..."
echo "Exporting prepack_configurations..."
psql "$DATABASE_URL" -c "\COPY (SELECT * FROM prepack_configurations) TO 'backup_prepack_configurations.csv' CSV HEADER"
echo "Exporting prepack_size_distributions..."
psql "$DATABASE_URL" -c "\COPY (SELECT * FROM prepack_size_distributions) TO 'backup_prepack_size_distributions.csv' CSV HEADER"
echo "✓ Backup created: backup_prepack_configurations.csv, backup_prepack_size_distributions.csv"
echo ""

# Step 2: Show current state
echo "[2/5] Current database state:"
psql "$DATABASE_URL" -c "
SELECT
  COUNT(*) as total_packs,
  COUNT(DISTINCT vendor_name) as vendors,
  COUNT(DISTINCT vendor_name || '::' || style_number) as unique_styles,
  COUNT(CASE WHEN style_number IS NULL OR style_number = '' THEN 1 END) as packs_without_style
FROM prepack_configurations;
"
echo ""

# Step 3: Run migration
echo "[3/5] Running migration..."
read -p "Continue with migration? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "Migration cancelled"
  exit 0
fi

run_sql "001_style_first_architecture.sql"
echo "✓ Migration completed"
echo ""

# Step 4: Show results
echo "[4/5] Migration results:"
psql "$DATABASE_URL" -c "
SELECT * FROM (
  SELECT 'Old prepacks' as table_name, COUNT(*) as count FROM prepack_configurations
  UNION ALL
  SELECT 'New styles' as table_name, COUNT(*) FROM style_configurations
  UNION ALL
  SELECT 'New prepacks' as table_name, COUNT(*) FROM prepack_configurations_new
  UNION ALL
  SELECT 'Size distributions' as table_name, COUNT(*) FROM prepack_size_distributions
) counts ORDER BY table_name;
"
echo ""

# Step 5: Confirm table swap
echo "[5/5] Final step: Swap tables"
echo "This will:"
echo "  - Drop old prepack_configurations table"
echo "  - Rename prepack_configurations_new to prepack_configurations"
echo "  - Update foreign keys"
echo ""
read -p "Proceed with table swap? (yes/no): " swap_confirm

if [ "$swap_confirm" = "yes" ]; then
  echo "Swapping tables..."

  psql "$DATABASE_URL" <<EOF
BEGIN;

-- Drop old table
ALTER TABLE prepack_size_distributions
  DROP CONSTRAINT IF EXISTS prepack_size_distributions_prepack_config_id_fkey;

DROP TABLE prepack_configurations CASCADE;

-- Rename new table
ALTER TABLE prepack_configurations_new RENAME TO prepack_configurations;

-- Recreate foreign key
ALTER TABLE prepack_size_distributions
  ADD CONSTRAINT prepack_size_distributions_prepack_config_id_fkey
    FOREIGN KEY (prepack_config_id)
    REFERENCES prepack_configurations(id)
    ON DELETE CASCADE;

COMMIT;
EOF

  echo "✓ Tables swapped successfully"
  echo ""
  echo "Migration complete! Next steps:"
  echo "  1. Run: npm run db:push"
  echo "  2. Test the application"
  echo "  3. If issues occur, restore from backup CSV files"
else
  echo "Table swap cancelled"
  echo "New tables remain as:"
  echo "  - style_configurations"
  echo "  - prepack_configurations_new"
  echo ""
  echo "To complete migration later, run:"
  echo "  ./run_table_swap.sh"
fi

echo ""
echo "==================================="
echo "Migration process finished"
echo "==================================="

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const sql = neon(DATABASE_URL);

async function populateFinancialData() {
  console.log("Populating financial data tables...\n");

  try {
    // Step 1: Insert vendor pricing data for Argonaut Nations
    console.log("Step 1: Inserting vendor pricing data...");
    await sql`
      INSERT INTO vendor_pricing (vendor_name, style_number, unit_cost, effective_date, notes)
      VALUES
        ('Argonaut Nations', '8501B', 14.00, '2020-01-01', 'Standard cost for style 8501B'),
        ('Argonaut Nations', 'S8502', 14.00, '2020-01-01', 'Standard cost for style S8502')
      ON CONFLICT (vendor_name, style_number, effective_date) DO NOTHING
    `;
    console.log("✓ Inserted vendor pricing for Argonaut Nations (8501B, S8502 @ $14/unit)");

    // Step 2: Calculate and insert SKU financial data
    console.log("\nStep 2: Calculating SKU financial data from sales history...");

    const result = await sql`
      INSERT INTO sku_financial_data (
        sku,
        style_number,
        vendor_name,
        color,
        size,
        inseam,
        avg_selling_price,
        unit_cost,
        profit_per_unit,
        margin_pct,
        velocity_30d,
        velocity_90d,
        velocity_365d,
        velocity_alltime,
        current_inventory,
        days_of_supply,
        last_updated
      )
      SELECT
        il.item_number as sku,
        il.style_number,
        il.vendor_name,
        LEFT(il.attribute, 50) as color,
        LEFT(CASE
          WHEN il.size LIKE '%X%' THEN TRIM(SPLIT_PART(il.size, 'X', 1))
          ELSE il.size
        END, 20) as size,
        LEFT(CASE
          WHEN il.size LIKE '%X%' THEN TRIM(SPLIT_PART(il.size, 'X', 2))
          ELSE NULL
        END, 10) as inseam,

        -- Calculate average selling price from sales
        COALESCE((
          SELECT AVG(CAST(st.price AS NUMERIC))
          FROM sales_transactions st
          WHERE st.sku = il.item_number
            AND st.price IS NOT NULL
            AND CAST(st.price AS NUMERIC) > 0
        ), 0) as avg_selling_price,

        -- Get unit cost from vendor_pricing (default to 0 if not found)
        COALESCE((
          SELECT vp.unit_cost
          FROM vendor_pricing vp
          WHERE vp.vendor_name = il.vendor_name
            AND vp.style_number = il.style_number
          ORDER BY vp.effective_date DESC
          LIMIT 1
        ), 0) as unit_cost,

        -- Calculate profit per unit (price - cost)
        COALESCE((
          SELECT AVG(CAST(st.price AS NUMERIC))
          FROM sales_transactions st
          WHERE st.sku = il.item_number AND CAST(st.price AS NUMERIC) > 0
        ), 0) - COALESCE((
          SELECT vp.unit_cost
          FROM vendor_pricing vp
          WHERE vp.vendor_name = il.vendor_name AND vp.style_number = il.style_number
          ORDER BY vp.effective_date DESC LIMIT 1
        ), 0) as profit_per_unit,

        -- Calculate margin percentage
        CASE
          WHEN COALESCE((
            SELECT AVG(CAST(st.price AS NUMERIC))
            FROM sales_transactions st
            WHERE st.sku = il.item_number AND CAST(st.price AS NUMERIC) > 0
          ), 0) > 0 THEN
            ((COALESCE((
              SELECT AVG(CAST(st.price AS NUMERIC))
              FROM sales_transactions st
              WHERE st.sku = il.item_number AND CAST(st.price AS NUMERIC) > 0
            ), 0) - COALESCE((
              SELECT vp.unit_cost
              FROM vendor_pricing vp
              WHERE vp.vendor_name = il.vendor_name AND vp.style_number = il.style_number
              ORDER BY vp.effective_date DESC LIMIT 1
            ), 0)) / COALESCE((
              SELECT AVG(CAST(st.price AS NUMERIC))
              FROM sales_transactions st
              WHERE st.sku = il.item_number AND CAST(st.price AS NUMERIC) > 0
            ), 1)) * 100
          ELSE 0
        END as margin_pct,

        -- Velocity 30 days
        COALESCE((
          SELECT COUNT(*)::NUMERIC / 30.0
          FROM sales_transactions st
          WHERE st.sku = il.item_number
            AND st.date >= CURRENT_DATE - INTERVAL '30 days'
        ), 0) as velocity_30d,

        -- Velocity 90 days
        COALESCE((
          SELECT COUNT(*)::NUMERIC / 90.0
          FROM sales_transactions st
          WHERE st.sku = il.item_number
            AND st.date >= CURRENT_DATE - INTERVAL '90 days'
        ), 0) as velocity_90d,

        -- Velocity 365 days
        COALESCE((
          SELECT COUNT(*)::NUMERIC / 365.0
          FROM sales_transactions st
          WHERE st.sku = il.item_number
            AND st.date >= CURRENT_DATE - INTERVAL '365 days'
        ), 0) as velocity_365d,

        -- Velocity all time
        COALESCE((
          SELECT
            CASE
              WHEN (MAX(st.date) - MIN(st.date)) > 0 THEN
                COUNT(*)::NUMERIC / (MAX(st.date) - MIN(st.date))::NUMERIC
              ELSE 0
            END
          FROM sales_transactions st
          WHERE st.sku = il.item_number
        ), 0) as velocity_alltime,

        -- Current inventory (sum across all stores)
        COALESCE(il.gm_qty, 0) + COALESCE(il.hm_qty, 0) +
        COALESCE(il.nm_qty, 0) + COALESCE(il.lm_qty, 0) as current_inventory,

        -- Days of supply (inventory / velocity)
        CASE
          WHEN COALESCE((
            SELECT COUNT(*)::NUMERIC / 30.0
            FROM sales_transactions st
            WHERE st.sku = il.item_number
              AND st.date >= CURRENT_DATE - INTERVAL '30 days'
          ), 0) > 0 THEN
            (COALESCE(il.gm_qty, 0) + COALESCE(il.hm_qty, 0) +
             COALESCE(il.nm_qty, 0) + COALESCE(il.lm_qty, 0))::NUMERIC /
            COALESCE((
              SELECT COUNT(*)::NUMERIC / 30.0
              FROM sales_transactions st
              WHERE st.sku = il.item_number
                AND st.date >= CURRENT_DATE - INTERVAL '30 days'
            ), 1)
          ELSE 999
        END as days_of_supply,

        NOW() as last_updated

      FROM item_list il
      WHERE il.style_number IS NOT NULL
        AND il.item_number IS NOT NULL
        AND (
          -- Has inventory OR has recent sales
          (COALESCE(il.gm_qty, 0) + COALESCE(il.hm_qty, 0) +
           COALESCE(il.nm_qty, 0) + COALESCE(il.lm_qty, 0)) > 0
          OR EXISTS (
            SELECT 1 FROM sales_transactions st
            WHERE st.sku = il.item_number
              AND st.date >= CURRENT_DATE - INTERVAL '90 days'
          )
        )
      ON CONFLICT (sku) DO UPDATE SET
        avg_selling_price = EXCLUDED.avg_selling_price,
        unit_cost = EXCLUDED.unit_cost,
        profit_per_unit = EXCLUDED.profit_per_unit,
        margin_pct = EXCLUDED.margin_pct,
        velocity_30d = EXCLUDED.velocity_30d,
        velocity_90d = EXCLUDED.velocity_90d,
        velocity_365d = EXCLUDED.velocity_365d,
        velocity_alltime = EXCLUDED.velocity_alltime,
        current_inventory = EXCLUDED.current_inventory,
        days_of_supply = EXCLUDED.days_of_supply,
        last_updated = NOW()
    `;

    console.log(`✓ Populated sku_financial_data with ${result.length} SKUs`);

    // Step 3: Verify data for 8501B test case
    console.log("\nStep 3: Verifying 8501B test case...");
    const testData = await sql`
      SELECT
        sku,
        style_number,
        color,
        size,
        avg_selling_price,
        unit_cost,
        profit_per_unit,
        margin_pct,
        velocity_30d,
        current_inventory,
        days_of_supply
      FROM sku_financial_data
      WHERE style_number = '8501B'
        AND color = 'Black'
      ORDER BY sku
      LIMIT 5
    `;

    if (testData.length > 0) {
      console.log("\n8501B Black SKUs:");
      console.log("--------------------------------------------------");
      testData.forEach((row: any) => {
        console.log(`SKU: ${row.sku}`);
        console.log(`  Size: ${row.size}`);
        console.log(`  Avg Selling Price: $${parseFloat(row.avg_selling_price || 0).toFixed(2)}`);
        console.log(`  Unit Cost: $${parseFloat(row.unit_cost || 0).toFixed(2)}`);
        console.log(`  Profit/Unit: $${parseFloat(row.profit_per_unit || 0).toFixed(2)}`);
        console.log(`  Margin: ${parseFloat(row.margin_pct || 0).toFixed(2)}%`);
        console.log(`  Velocity (30d): ${parseFloat(row.velocity_30d || 0).toFixed(4)}/day`);
        console.log(`  Inventory: ${row.current_inventory} units`);
        console.log(`  Days Supply: ${parseFloat(row.days_of_supply || 0).toFixed(1)} days`);
        console.log("--------------------------------------------------");
      });
    } else {
      console.log("⚠️  No 8501B data found - may need to import sales data first");
    }

    // Step 4: Show summary statistics
    console.log("\nStep 4: Summary statistics...");
    const summary = await sql`
      SELECT
        COUNT(*) as total_skus,
        COUNT(CASE WHEN avg_selling_price > 0 THEN 1 END) as skus_with_price,
        COUNT(CASE WHEN unit_cost > 0 THEN 1 END) as skus_with_cost,
        COUNT(CASE WHEN velocity_30d > 0 THEN 1 END) as skus_with_sales,
        AVG(CASE WHEN margin_pct > 0 THEN margin_pct END) as avg_margin_pct
      FROM sku_financial_data
    `;

    console.log("\nSummary:");
    console.log(`  Total SKUs: ${summary[0].total_skus}`);
    console.log(`  SKUs with selling price: ${summary[0].skus_with_price}`);
    console.log(`  SKUs with unit cost: ${summary[0].skus_with_cost}`);
    console.log(`  SKUs with sales (30d): ${summary[0].skus_with_sales}`);
    console.log(`  Average margin: ${parseFloat(summary[0].avg_margin_pct || 0).toFixed(2)}%`);

    console.log("\n✅ Financial data population complete!");

  } catch (error) {
    console.error("Error populating financial data:", error);
    process.exit(1);
  }
}

populateFinancialData();

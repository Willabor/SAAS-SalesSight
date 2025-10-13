import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

const sql = neon(DATABASE_URL);

async function populateVendorPricing() {
  console.log("Populating vendor pricing from item_list...\n");

  try {
    // Step 1: Extract vendor pricing from item_list
    console.log("Step 1: Extracting vendor pricing data from item_list...");

    const vendorPricingData = await sql`
      SELECT
        vendor_name,
        style_number,
        COUNT(*) as sku_count,
        AVG(CAST(order_cost AS NUMERIC)) as avg_cost,
        MIN(CAST(order_cost AS NUMERIC)) as min_cost,
        MAX(CAST(order_cost AS NUMERIC)) as max_cost,
        MODE() WITHIN GROUP (ORDER BY CAST(order_cost AS NUMERIC)) as most_common_cost
      FROM item_list
      WHERE vendor_name IS NOT NULL
        AND style_number IS NOT NULL
        AND order_cost IS NOT NULL
        AND CAST(order_cost AS NUMERIC) > 0
      GROUP BY vendor_name, style_number
      ORDER BY vendor_name, style_number
    `;

    console.log(`✓ Found ${vendorPricingData.length} vendor/style combinations with cost data`);

    if (vendorPricingData.length === 0) {
      console.log("⚠️  No cost data found in item_list table");
      return;
    }

    // Step 2: Show sample of data being inserted
    console.log("\nStep 2: Sample of vendor pricing data:");
    console.log("--------------------------------------------------");
    vendorPricingData.slice(0, 10).forEach((row: any) => {
      console.log(`${row.vendor_name} - ${row.style_number}`);
      console.log(`  SKUs: ${row.sku_count}, Avg Cost: $${parseFloat(row.avg_cost || 0).toFixed(2)}`);
      console.log(`  Range: $${parseFloat(row.min_cost || 0).toFixed(2)} - $${parseFloat(row.max_cost || 0).toFixed(2)}`);
      console.log(`  Most Common: $${parseFloat(row.most_common_cost || 0).toFixed(2)}`);
    });
    console.log("--------------------------------------------------");

    // Step 3: Insert vendor pricing data (DIRECT SQL - much faster!)
    console.log("\nStep 3: Inserting vendor pricing data directly from item_list...");

    const today = new Date().toISOString().split('T')[0];

    // Single INSERT ... SELECT query - much faster than individual inserts
    const insertResult = await sql`
      INSERT INTO vendor_pricing (vendor_name, style_number, unit_cost, effective_date, notes)
      SELECT
        vendor_name,
        style_number,
        MODE() WITHIN GROUP (ORDER BY CAST(order_cost AS NUMERIC)) as unit_cost,
        ${today}::date as effective_date,
        'Imported from item_list (' || COUNT(*)::text || ' SKUs)' as notes
      FROM item_list
      WHERE vendor_name IS NOT NULL
        AND style_number IS NOT NULL
        AND order_cost IS NOT NULL
        AND CAST(order_cost AS NUMERIC) > 0
      GROUP BY vendor_name, style_number
      ON CONFLICT (vendor_name, style_number, effective_date)
      DO UPDATE SET
        unit_cost = EXCLUDED.unit_cost,
        notes = EXCLUDED.notes
    `;

    console.log(`✓ Inserted/updated ${vendorPricingData.length} vendor pricing records`);

    // Step 4: Show summary by vendor
    console.log("\nStep 4: Summary by vendor:");
    const vendorSummary = await sql`
      SELECT
        vendor_name,
        COUNT(*) as style_count,
        AVG(unit_cost) as avg_unit_cost,
        MIN(unit_cost) as min_unit_cost,
        MAX(unit_cost) as max_unit_cost
      FROM vendor_pricing
      WHERE effective_date = ${today}
      GROUP BY vendor_name
      ORDER BY style_count DESC
      LIMIT 20
    `;

    console.log("--------------------------------------------------");
    vendorSummary.forEach((row: any) => {
      console.log(`${row.vendor_name}:`);
      console.log(`  Styles: ${row.style_count}`);
      console.log(`  Avg Cost: $${parseFloat(row.avg_unit_cost || 0).toFixed(2)}`);
      console.log(`  Range: $${parseFloat(row.min_unit_cost || 0).toFixed(2)} - $${parseFloat(row.max_unit_cost || 0).toFixed(2)}`);
    });
    console.log("--------------------------------------------------");

    // Step 5: Update sku_financial_data with new cost data
    console.log("\nStep 5: Updating sku_financial_data with new cost data...");

    const updateResult = await sql`
      UPDATE sku_financial_data sfd
      SET
        unit_cost = vp.unit_cost,
        profit_per_unit = sfd.avg_selling_price - vp.unit_cost,
        margin_pct = CASE
          WHEN sfd.avg_selling_price > 0 THEN
            ((sfd.avg_selling_price - vp.unit_cost) / sfd.avg_selling_price) * 100
          ELSE 0
        END,
        last_updated = NOW()
      FROM vendor_pricing vp
      WHERE vp.vendor_name = sfd.vendor_name
        AND vp.style_number = sfd.style_number
        AND vp.effective_date = ${today}
        AND sfd.unit_cost IS DISTINCT FROM vp.unit_cost
    `;

    console.log(`✓ Updated ${updateResult.length} SKUs with new cost data`);

    // Step 6: Show updated statistics
    console.log("\nStep 6: Updated financial data statistics:");
    const finalStats = await sql`
      SELECT
        COUNT(*) as total_skus,
        COUNT(CASE WHEN avg_selling_price > 0 THEN 1 END) as skus_with_price,
        COUNT(CASE WHEN unit_cost > 0 THEN 1 END) as skus_with_cost,
        COUNT(CASE WHEN profit_per_unit > 0 THEN 1 END) as skus_with_profit,
        AVG(CASE WHEN margin_pct > 0 AND margin_pct < 100 THEN margin_pct END) as avg_margin_pct,
        AVG(CASE WHEN profit_per_unit > 0 THEN profit_per_unit END) as avg_profit_per_unit
      FROM sku_financial_data
    `;

    console.log("\n📊 Final Statistics:");
    console.log(`  Total SKUs: ${finalStats[0].total_skus}`);
    console.log(`  SKUs with selling price: ${finalStats[0].skus_with_price}`);
    console.log(`  SKUs with unit cost: ${finalStats[0].skus_with_cost} ⬆️ (was 174)`);
    console.log(`  SKUs with profit data: ${finalStats[0].skus_with_profit}`);
    console.log(`  Average margin: ${parseFloat(finalStats[0].avg_margin_pct || 0).toFixed(2)}%`);
    console.log(`  Average profit per unit: $${parseFloat(finalStats[0].avg_profit_per_unit || 0).toFixed(2)}`);

    // Step 7: Verify 8501B test case
    console.log("\nStep 7: Verifying 8501B test case...");
    const test8501B = await sql`
      SELECT
        sku,
        color,
        size,
        avg_selling_price,
        unit_cost,
        profit_per_unit,
        margin_pct
      FROM sku_financial_data
      WHERE style_number = '8501B'
        AND color = 'Black'
      ORDER BY sku
      LIMIT 3
    `;

    if (test8501B.length > 0) {
      console.log("\n✅ 8501B Black Verification:");
      console.log("--------------------------------------------------");
      test8501B.forEach((row: any) => {
        console.log(`SKU ${row.sku} (${row.size}):`);
        console.log(`  Price: $${parseFloat(row.avg_selling_price || 0).toFixed(2)}`);
        console.log(`  Cost: $${parseFloat(row.unit_cost || 0).toFixed(2)}`);
        console.log(`  Profit: $${parseFloat(row.profit_per_unit || 0).toFixed(2)}`);
        console.log(`  Margin: ${parseFloat(row.margin_pct || 0).toFixed(2)}%`);
      });
      console.log("--------------------------------------------------");
    }

    console.log("\n✅ Vendor pricing population complete!");

  } catch (error) {
    console.error("Error populating vendor pricing:", error);
    process.exit(1);
  }
}

populateVendorPricing();

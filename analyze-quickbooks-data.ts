import { db } from './server/db';
import { sql } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

async function analyzeQuickBooksData() {
  console.log('=== ANALYZING QUICKBOOKS POS REPORTS ===\n');

  // 1. Read Item List from QuickBooks
  console.log('1. Reading Item List from QuickBooks...');
  const itemListWorkbook = XLSX.readFile('docs/Quickbooks POS Reports/Item List as of 09-29-2025.xlsx');
  const itemListSheet = itemListWorkbook.Sheets[itemListWorkbook.SheetNames[0]];

  // Skip first 5 rows (headers) - use range option
  const itemListData = XLSX.utils.sheet_to_json(itemListSheet, { range: 5 });

  console.log(`   - Total rows in QuickBooks Item List (after skipping headers): ${itemListData.length}`);
  console.log(`   - First row sample:`, itemListData[0]);
  console.log(`   - Column names:`, Object.keys(itemListData[0] || {}));

  // Calculate totals from QuickBooks Item List - try different possible column names
  let qbTotalAvailQty = 0;
  let qbTotalHQ = 0;
  let qbTotalGM = 0;
  let qbTotalHM = 0;
  let qbTotalLM = 0;
  let qbTotalNM = 0;
  let qbTotalMM = 0;
  let qbTotalPM = 0;
  let qbTotalItems = 0;

  itemListData.forEach((row: any, index: number) => {
    // Try to find the Avail Qty column - it might have different names
    const availQtyKey = Object.keys(row).find(k => k.includes('Avail') || k.includes('NEXUS'));
    if (availQtyKey) {
      const qty = Number(row[availQtyKey]) || 0;
      if (!isNaN(qty) && qty !== 0) {
        qbTotalAvailQty += qty;
        qbTotalItems++;
      }
    }

    // Sum store quantities
    Object.keys(row).forEach(key => {
      const val = Number(row[key]) || 0;
      if (key.includes('HQ')) qbTotalHQ += val;
      if (key.includes('GM')) qbTotalGM += val;
      if (key.includes('HM')) qbTotalHM += val;
      if (key.includes('LM')) qbTotalLM += val;
      if (key.includes('NM')) qbTotalNM += val;
      if (key.includes('MM')) qbTotalMM += val;
      if (key.includes('PM')) qbTotalPM += val;
    });
  });

  console.log(`   - Total Avail Qty in QuickBooks: ${qbTotalAvailQty}`);
  console.log(`   - Store Totals: HQ=${qbTotalHQ}, GM=${qbTotalGM}, HM=${qbTotalHM}, LM=${qbTotalLM}, NM=${qbTotalNM}, MM=${qbTotalMM}, PM=${qbTotalPM}`);
  console.log(`   - Items counted: ${qbTotalItems}\n`);

  // 2. Query database for Item List
  console.log('2. Querying database for Item List...');
  const dbItemStats = await db.execute(sql`
    SELECT
      COUNT(*) as total_items,
      SUM(COALESCE(avail_qty, 0)) as total_avail_qty,
      SUM(COALESCE(hq_qty, 0)) as total_hq_qty,
      SUM(COALESCE(gm_qty, 0)) as total_gm_qty,
      SUM(COALESCE(hm_qty, 0)) as total_hm_qty,
      SUM(COALESCE(lm_qty, 0)) as total_lm_qty,
      SUM(COALESCE(nm_qty, 0)) as total_nm_qty,
      SUM(COALESCE(mm_qty, 0)) as total_mm_qty,
      SUM(COALESCE(pm_qty, 0)) as total_pm_qty
    FROM item_list
  `);

  console.log('   Database Item List Stats:', dbItemStats.rows[0]);
  console.log('');

  // 3. Read Sales Data from QuickBooks (limit to avoid timeout)
  console.log('3. Reading Sales Data from QuickBooks (analyzing first sheet only for speed)...');
  const salesWorkbook = XLSX.readFile('docs/Quickbooks POS Reports/Daily Sales per Transaction per store  (Google).xlsx');
  console.log(`   - Number of sheets: ${salesWorkbook.SheetNames.length}`);
  console.log(`   - Sheet names:`, salesWorkbook.SheetNames.slice(0, 5), '...');

  let qbTotalTransactions = 0;
  let qbTotalRevenue = 0;

  // Analyze only first sheet to avoid timeout
  const firstSheet = salesWorkbook.Sheets[salesWorkbook.SheetNames[0]];
  const sampleData = XLSX.utils.sheet_to_json(firstSheet, { range: 0, header: 1 });

  console.log(`   - First sheet sample (first 3 rows):`, sampleData.slice(0, 3));
  console.log(`   - Total rows in first sheet: ${sampleData.length}`);
  console.log(`   - Note: Full sales analysis skipped to avoid timeout\n`);

  // 4. Query database for Sales Data
  console.log('4. Querying database for Sales Data...');
  const dbSalesStats = await db.execute(sql`
    SELECT
      COUNT(*) as total_transactions,
      SUM(CAST(price AS DECIMAL)) as total_revenue,
      MIN(date) as earliest_date,
      MAX(date) as latest_date
    FROM sales_transactions
  `);

  console.log('   Database Sales Stats:', dbSalesStats.rows[0]);
  console.log('');

  // 5. Compare Results
  console.log('=== COMPARISON RESULTS ===\n');

  console.log('ITEM LIST:');
  console.log(`  QuickBooks Total Items: ${itemListData.length}`);
  console.log(`  Database Total Items: ${dbItemStats.rows[0].total_items}`);
  console.log(`  Difference: ${Number(dbItemStats.rows[0].total_items) - itemListData.length} items`);
  console.log('');

  console.log(`  QuickBooks Total Avail Qty: ${qbTotalAvailQty}`);
  console.log(`  Database Total Avail Qty: ${dbItemStats.rows[0].total_avail_qty}`);
  console.log(`  Difference: ${Number(dbItemStats.rows[0].total_avail_qty) - qbTotalAvailQty} units`);
  console.log(`  Percentage Difference: ${((Number(dbItemStats.rows[0].total_avail_qty) - qbTotalAvailQty) / qbTotalAvailQty * 100).toFixed(2)}%`);
  console.log('');

  console.log('  Store Quantity Comparison:');
  console.log(`    HQ: QB=${qbTotalHQ}, DB=${dbItemStats.rows[0].total_hq_qty}, Diff=${Number(dbItemStats.rows[0].total_hq_qty) - qbTotalHQ}`);
  console.log(`    GM: QB=${qbTotalGM}, DB=${dbItemStats.rows[0].total_gm_qty}, Diff=${Number(dbItemStats.rows[0].total_gm_qty) - qbTotalGM}`);
  console.log(`    HM: QB=${qbTotalHM}, DB=${dbItemStats.rows[0].total_hm_qty}, Diff=${Number(dbItemStats.rows[0].total_hm_qty) - qbTotalHM}`);
  console.log(`    LM: QB=${qbTotalLM}, DB=${dbItemStats.rows[0].total_lm_qty}, Diff=${Number(dbItemStats.rows[0].total_lm_qty) - qbTotalLM}`);
  console.log(`    NM: QB=${qbTotalNM}, DB=${dbItemStats.rows[0].total_nm_qty}, Diff=${Number(dbItemStats.rows[0].total_nm_qty) - qbTotalNM}`);
  console.log(`    MM: QB=${qbTotalMM}, DB=${dbItemStats.rows[0].total_mm_qty}, Diff=${Number(dbItemStats.rows[0].total_mm_qty) - qbTotalMM}`);
  console.log(`    PM: QB=${qbTotalPM}, DB=${dbItemStats.rows[0].total_pm_qty}, Diff=${Number(dbItemStats.rows[0].total_pm_qty) - qbTotalPM}`);
  console.log('');

  console.log('SALES DATA:');
  console.log(`  Database Total Transactions: ${dbSalesStats.rows[0].total_transactions}`);
  console.log(`  Database Total Revenue: $${Number(dbSalesStats.rows[0].total_revenue).toFixed(2)}`);
  console.log(`  Database Date Range: ${dbSalesStats.rows[0].earliest_date} to ${dbSalesStats.rows[0].latest_date}`);
}

analyzeQuickBooksData()
  .then(() => {
    console.log('\n✓ Analysis complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error during analysis:', error);
    process.exit(1);
  });

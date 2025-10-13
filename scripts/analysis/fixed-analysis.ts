import { db } from './server/db';
import { sql } from 'drizzle-orm';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

async function fixedAnalysis() {
  console.log('=== FIXED ANALYSIS - CAREFUL COLUMN SUMMING ===\n');

  // 1. Read Item List from QuickBooks
  console.log('1. Reading QuickBooks Item List...');
  const itemListWorkbook = XLSX.readFile('docs/Quickbooks POS Reports/Item List as of 09-29-2025.xlsx');
  const itemListSheet = itemListWorkbook.Sheets[itemListWorkbook.SheetNames[0]];
  const itemListData = XLSX.utils.sheet_to_json(itemListSheet, { range: 5 });

  console.log(`Total rows: ${itemListData.length}\n`);

  // Sum quantities CAREFULLY - only from the exact column names
  let qbTotalAvailQty = 0;
  let qbTotalHQ = 0;
  let qbTotalGM = 0;
  let qbTotalHM = 0;
  let qbTotalLM = 0;
  let qbTotalNM = 0;
  let qbTotalMM = 0;
  let qbTotalPM = 0;

  itemListData.forEach((row: any) => {
    qbTotalAvailQty += Number(row['Avail Qty']) || 0;
    qbTotalHQ += Number(row['HQ Qty']) || 0;
    qbTotalGM += Number(row['GM Qty']) || 0;
    qbTotalHM += Number(row['HM Qty']) || 0;
    qbTotalLM += Number(row['LM Qty']) || 0;
    qbTotalNM += Number(row['NM Qty']) || 0;
    qbTotalMM += Number(row['MM Qty']) || 0;
    qbTotalPM += Number(row['PM Qty']) || 0;
  });

  console.log('QuickBooks Totals:');
  console.log(`  Total Avail Qty: ${qbTotalAvailQty}`);
  console.log(`  HQ: ${qbTotalHQ}`);
  console.log(`  GM: ${qbTotalGM}`);
  console.log(`  HM: ${qbTotalHM}`);
  console.log(`  LM: ${qbTotalLM}`);
  console.log(`  NM: ${qbTotalNM}`);
  console.log(`  MM: ${qbTotalMM}`);
  console.log(`  PM: ${qbTotalPM}`);
  console.log(`  Sum of stores: ${qbTotalHQ + qbTotalGM + qbTotalHM + qbTotalLM + qbTotalNM + qbTotalMM + qbTotalPM}`);
  console.log('');

  // 2. Query database
  console.log('2. Querying database...');
  const dbStats = await db.execute(sql`
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

  const dbData = dbStats.rows[0];
  console.log('Database Totals:');
  console.log(`  Total Items: ${dbData.total_items}`);
  console.log(`  Total Avail Qty: ${dbData.total_avail_qty}`);
  console.log(`  HQ: ${dbData.total_hq_qty}`);
  console.log(`  GM: ${dbData.total_gm_qty}`);
  console.log(`  HM: ${dbData.total_hm_qty}`);
  console.log(`  LM: ${dbData.total_lm_qty}`);
  console.log(`  NM: ${dbData.total_nm_qty}`);
  console.log(`  MM: ${dbData.total_mm_qty}`);
  console.log(`  PM: ${dbData.total_pm_qty}`);
  const dbStoreSum = Number(dbData.total_hq_qty) + Number(dbData.total_gm_qty) +
                     Number(dbData.total_hm_qty) + Number(dbData.total_lm_qty) +
                     Number(dbData.total_nm_qty) + Number(dbData.total_mm_qty) +
                     Number(dbData.total_pm_qty);
  console.log(`  Sum of stores: ${dbStoreSum}`);
  console.log('');

  // 3. Comparison
  console.log('=== COMPARISON ===\n');
  console.log(`Avail Qty: QB=${qbTotalAvailQty}, DB=${dbData.total_avail_qty}, Diff=${Number(dbData.total_avail_qty) - qbTotalAvailQty}`);
  console.log(`HQ: QB=${qbTotalHQ}, DB=${dbData.total_hq_qty}, Diff=${Number(dbData.total_hq_qty) - qbTotalHQ}`);
  console.log(`GM: QB=${qbTotalGM}, DB=${dbData.total_gm_qty}, Diff=${Number(dbData.total_gm_qty) - qbTotalGM}`);
  console.log(`HM: QB=${qbTotalHM}, DB=${dbData.total_hm_qty}, Diff=${Number(dbData.total_hm_qty) - qbTotalHM}`);
  console.log(`LM: QB=${qbTotalLM}, DB=${dbData.total_lm_qty}, Diff=${Number(dbData.total_lm_qty) - qbTotalLM}`);
  console.log(`NM: QB=${qbTotalNM}, DB=${dbData.total_nm_qty}, Diff=${Number(dbData.total_nm_qty) - qbTotalNM}`);

  console.log(`\nRatio DB/QB: ${(Number(dbData.total_avail_qty) / qbTotalAvailQty).toFixed(4)}`);
}

fixedAnalysis()
  .then(() => {
    console.log('\n✓ Analysis complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });

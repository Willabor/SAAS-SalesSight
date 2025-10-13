import { db } from './server/db';
import { sql } from 'drizzle-orm';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

async function compareSpecificItems() {
  console.log('=== COMPARING SPECIFIC ITEMS ===\n');

  // 1. Read first 10 items from QuickBooks Excel
  console.log('1. Reading QuickBooks Item List...');
  const itemListWorkbook = XLSX.readFile('docs/Quickbooks POS Reports/Item List as of 09-29-2025.xlsx');
  const itemListSheet = itemListWorkbook.Sheets[itemListWorkbook.SheetNames[0]];
  const itemListData = XLSX.utils.sheet_to_json(itemListSheet, { range: 5 });

  console.log(`Total rows in QuickBooks: ${itemListData.length}\n`);

  // Take first 10 items
  const sampleItems = itemListData.slice(0, 10);

  console.log('Sample Items from QuickBooks:');
  sampleItems.forEach((item: any, index: number) => {
    console.log(`\nItem ${index + 1}:`);
    console.log(`  Item #: ${item['Item #']}`);
    console.log(`  Name: ${item['Item Name']}`);
    console.log(`  Avail Qty: ${item['Avail Qty']}`);
    console.log(`  HQ Qty: ${item['HQ Qty']}`);
    console.log(`  GM Qty: ${item['GM Qty']}`);
    console.log(`  HM Qty: ${item['HM Qty']}`);
    console.log(`  LM Qty: ${item['LM Qty']}`);
    console.log(`  NM Qty: ${item['NM Qty']}`);
  });

  // 2. Query database for the same items
  console.log('\n\n2. Querying database for same items...\n');

  for (let i = 0; i < Math.min(10, sampleItems.length); i++) {
    const qbItem: any = sampleItems[i];
    const itemNumber = String(qbItem['Item #']);

    const dbResult = await db.execute(sql`
      SELECT item_number, item_name, avail_qty, hq_qty, gm_qty, hm_qty, lm_qty, nm_qty
      FROM item_list
      WHERE item_number = ${itemNumber}
    `);

    console.log(`\nItem ${i + 1} Comparison (Item #: ${itemNumber}):`);
    console.log(`  QuickBooks: Avail=${qbItem['Avail Qty']}, HQ=${qbItem['HQ Qty']}, GM=${qbItem['GM Qty']}, HM=${qbItem['HM Qty']}, LM=${qbItem['LM Qty']}, NM=${qbItem['NM Qty']}`);

    if (dbResult.rows.length > 0) {
      const dbItem = dbResult.rows[0];
      console.log(`  Database:   Avail=${dbItem.avail_qty}, HQ=${dbItem.hq_qty}, GM=${dbItem.gm_qty}, HM=${dbItem.hm_qty}, LM=${dbItem.lm_qty}, NM=${dbItem.nm_qty}`);

      // Calculate differences
      const availDiff = Number(dbItem.avail_qty) - Number(qbItem['Avail Qty']);
      const hqDiff = Number(dbItem.hq_qty) - Number(qbItem['HQ Qty']);
      const gmDiff = Number(dbItem.gm_qty) - Number(qbItem['GM Qty']);

      console.log(`  Difference: Avail=${availDiff}, HQ=${hqDiff}, GM=${gmDiff}`);

      if (Number(dbItem.avail_qty) === Number(qbItem['Avail Qty']) / 2) {
        console.log(`  ⚠️  DATABASE VALUE IS EXACTLY HALF OF QUICKBOOKS!`);
      }
    } else {
      console.log(`  ❌ NOT FOUND IN DATABASE`);
    }
  }

  console.log('\n\n3. Checking random items with high quantities...\n');

  // Find items with qty > 100 from QuickBooks
  const highQtyItems = itemListData
    .filter((item: any) => Number(item['Avail Qty']) > 100)
    .slice(0, 5);

  for (const qbItem of highQtyItems) {
    const itemNumber = String(qbItem['Item #']);

    const dbResult = await db.execute(sql`
      SELECT item_number, item_name, avail_qty, hq_qty, gm_qty, hm_qty, lm_qty, nm_qty
      FROM item_list
      WHERE item_number = ${itemNumber}
    `);

    console.log(`\nHigh Quantity Item (Item #: ${itemNumber}):`);
    console.log(`  QuickBooks: Avail=${qbItem['Avail Qty']}`);

    if (dbResult.rows.length > 0) {
      const dbItem = dbResult.rows[0];
      console.log(`  Database:   Avail=${dbItem.avail_qty}`);
      console.log(`  Ratio: ${(Number(dbItem.avail_qty) / Number(qbItem['Avail Qty'])).toFixed(4)}`);
    } else {
      console.log(`  ❌ NOT FOUND IN DATABASE`);
    }
  }
}

compareSpecificItems()
  .then(() => {
    console.log('\n✓ Comparison complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error during comparison:', error);
    process.exit(1);
  });

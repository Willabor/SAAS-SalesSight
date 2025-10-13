import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

async function checkDuplicates() {
  console.log('=== CHECKING FOR DUPLICATE ITEM NUMBERS ===\n');

  // Read Item List from QuickBooks
  const itemListWorkbook = XLSX.readFile('docs/Quickbooks POS Reports/Item List as of 09-29-2025.xlsx');
  const itemListSheet = itemListWorkbook.Sheets[itemListWorkbook.SheetNames[0]];
  const itemListData = XLSX.utils.sheet_to_json(itemListSheet, { range: 5 });

  console.log(`Total rows: ${itemListData.length}\n`);

  // Count occurrences of each item number
  const itemNumberCounts: { [key: string]: number } = {};
  const itemNumberQty: { [key: string]: number[] } = {};

  itemListData.forEach((row: any) => {
    const itemNum = String(row['Item #']);
    itemNumberCounts[itemNum] = (itemNumberCounts[itemNum] || 0) + 1;

    if (!itemNumberQty[itemNum]) {
      itemNumberQty[itemNum] = [];
    }
    itemNumberQty[itemNum].push(Number(row['Avail Qty']) || 0);
  });

  // Find duplicates
  const duplicates = Object.entries(itemNumberCounts).filter(([_, count]) => count > 1);

  console.log(`Unique item numbers: ${Object.keys(itemNumberCounts).length}`);
  console.log(`Duplicate item numbers: ${duplicates.length}\n`);

  if (duplicates.length > 0) {
    console.log('First 20 duplicates:');
    duplicates.slice(0, 20).forEach(([itemNum, count]) => {
      const qtys = itemNumberQty[itemNum];
      console.log(`  Item #${itemNum}: appears ${count} times, quantities: ${qtys.join(', ')}`);
    });

    // Calculate if duplicates would explain the doubling
    let totalDuplicateRows = 0;
    duplicates.forEach(([itemNum, count]) => {
      totalDuplicateRows += (count - 1); // Extra rows beyond the first
    });

    console.log(`\nTotal duplicate rows: ${totalDuplicateRows}`);
    console.log(`This would mean: ${itemListData.length - totalDuplicateRows} unique items\n`);
  } else {
    console.log('✓ No duplicates found!');
  }
}

checkDuplicates()
  .then(() => {
    console.log('\n✓ Check complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });

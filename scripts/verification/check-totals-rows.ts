import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

async function checkTotalsRows() {
  console.log('=== CHECKING FOR TOTAL/SUMMARY ROWS ===\n');

  // 1. Check Item List
  console.log('1. ITEM LIST FILE:\n');
  const itemListWorkbook = XLSX.readFile('docs/Quickbooks POS Reports/Item List as of 09-29-2025.xlsx');
  const itemListSheet = itemListWorkbook.Sheets[itemListWorkbook.SheetNames[0]];
  const itemListData = XLSX.utils.sheet_to_json(itemListSheet, { range: 5 });

  console.log(`Total rows: ${itemListData.length}`);
  console.log('\nLast 10 rows:');

  itemListData.slice(-10).forEach((row: any, index: number) => {
    const rowNum = itemListData.length - 10 + index + 1;
    console.log(`\nRow ${rowNum}:`);
    console.log(`  Item #: ${row['Item #']}`);
    console.log(`  Item Name: ${row['Item Name']}`);
    console.log(`  Avail Qty: ${row['Avail Qty']}`);
    console.log(`  HQ Qty: ${row['HQ Qty']}`);
    console.log(`  GM Qty: ${row['GM Qty']}`);
  });

  // Check if last row has "Total" or similar in Item Name
  const lastRow: any = itemListData[itemListData.length - 1];
  const secondLastRow: any = itemListData[itemListData.length - 2];

  console.log('\n\n=== ANALYSIS ===');
  console.log('\nLast row details:');
  console.log(`  Item #: '${lastRow['Item #']}'`);
  console.log(`  Item Name: '${lastRow['Item Name']}'`);
  console.log(`  Avail Qty: ${lastRow['Avail Qty']}`);
  console.log(`  All columns:`, Object.keys(lastRow).map(k => `${k}=${lastRow[k]}`).join(', '));

  console.log('\nSecond to last row:');
  console.log(`  Item #: '${secondLastRow['Item #']}'`);
  console.log(`  Item Name: '${secondLastRow['Item Name']}'`);
  console.log(`  Avail Qty: ${secondLastRow['Avail Qty']}`);

  // Check if last row's Avail Qty is suspiciously large
  const lastRowQty = Number(lastRow['Avail Qty']) || 0;
  const secondLastQty = Number(secondLastRow['Avail Qty']) || 0;

  console.log(`\nLast row Avail Qty: ${lastRowQty}`);
  console.log(`Second last Avail Qty: ${secondLastQty}`);
  console.log(`Ratio: ${(lastRowQty / secondLastQty).toFixed(2)}x`);

  if (lastRowQty > 30000) {
    console.log('\n⚠️  WARNING: Last row has suspiciously high quantity (>30,000)!');
    console.log('   This might be a TOTAL row!');
  }

  // Calculate sum WITHOUT last row
  let sumWithoutLastRow = 0;
  for (let i = 0; i < itemListData.length - 1; i++) {
    sumWithoutLastRow += Number(itemListData[i]['Avail Qty']) || 0;
  }

  console.log(`\n\nSum of Avail Qty WITHOUT last row: ${sumWithoutLastRow}`);
  console.log(`Sum of Avail Qty WITH last row: ${sumWithoutLastRow + lastRowQty}`);
  console.log(`Database has: 34,745`);
  console.log(`Match? ${sumWithoutLastRow === 34745 ? 'YES! ✓' : 'NO'}`);

  // 2. Check Sales file for totals
  console.log('\n\n\n2. SALES FILE:\n');
  const salesWorkbook = XLSX.readFile('docs/Quickbooks POS Reports/Daily Sales per Transaction per store  (Google).xlsx');
  const firstSalesSheet = salesWorkbook.Sheets[salesWorkbook.SheetNames[0]];
  const salesData = XLSX.utils.sheet_to_json(firstSalesSheet, { header: 1, raw: true });

  console.log(`First sheet: "${salesWorkbook.SheetNames[0]}"`);
  console.log(`Total rows: ${salesData.length}`);
  console.log('\nLast 20 rows:');

  salesData.slice(-20).forEach((row: any, index: number) => {
    const rowNum = salesData.length - 20 + index;
    const hasContent = row.filter((c: any) => c !== null && c !== undefined && c !== '').length;
    if (hasContent > 0) {
      console.log(`Row ${rowNum}: [${row.filter((c: any) => c !== null && c !== undefined && c !== '').join(' | ')}]`);
    }
  });
}

checkTotalsRows()
  .then(() => {
    console.log('\n✓ Check complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });

import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

async function testFilter() {
  console.log('=== TESTING TOTAL ROW FILTER ===\n');

  // Read and process the file
  const workbook = XLSX.readFile('docs/Quickbooks POS Reports/Item List as of 09-29-2025.xlsx');
  const sheetName = 'Item Detail';
  const worksheet = workbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

  // DELETE TOP 5 ROWS (simulate formatItemList)
  const afterRowDelete: any = {};
  for (let R = range.s.r + 5; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const oldAddr = XLSX.utils.encode_cell({r: R, c: C});
      const newAddr = XLSX.utils.encode_cell({r: R - 5, c: C});
      if (worksheet[oldAddr]) {
        afterRowDelete[newAddr] = worksheet[oldAddr];
      }
    }
  }

  // DELETE SPECIFIC COLUMNS (simulate formatItemList)
  const columnsToDelete = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46];
  const colMap: any = {};
  let newCol = 0;
  for (let oldCol = 0; oldCol <= range.e.c; oldCol++) {
    if (!columnsToDelete.includes(oldCol)) {
      colMap[oldCol] = newCol++;
    }
  }

  const finalCells: any = {};
  Object.keys(afterRowDelete).forEach(addr => {
    const cell = XLSX.utils.decode_cell(addr);
    if (colMap[cell.c] !== undefined) {
      const newAddr = XLSX.utils.encode_cell({r: cell.r, c: colMap[cell.c]});
      finalCells[newAddr] = afterRowDelete[addr];
    }
  });

  workbook.Sheets[sheetName] = {
    ...finalCells,
    '!ref': XLSX.utils.encode_range({
      s: {r: 0, c: 0},
      e: {r: range.e.r - 5, c: newCol - 1}
    })
  };

  // PARSE DATA
  const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });

  console.log(`Total rows after formatting: ${jsonData.length}`);
  console.log('\nLast 3 rows BEFORE filtering:');
  jsonData.slice(-3).forEach((row: any, i: number) => {
    console.log(`\nRow ${jsonData.length - 3 + i + 1}:`);
    console.log(`  Item #: ${row['Item #']}`);
    console.log(`  Item Name: ${row['Item Name']}`);
    console.log(`  Avail Qty: ${row['Avail Qty']}`);
  });

  // APPLY THE NEW FILTER
  const filteredData = jsonData.filter((row: any) => {
    const itemNumber = row['Item #'];
    const itemName = row['Item Name'];
    const availQty = Number(row['Avail Qty']) || 0;

    // A valid item must have at least an Item # or Item Name
    const hasItemNumber = itemNumber !== null &&
                          itemNumber !== undefined &&
                          String(itemNumber).trim() !== '';
    const hasItemName = itemName !== null &&
                        itemName !== undefined &&
                        String(itemName).trim() !== '';

    // Also reject rows with suspiciously high quantities (>10,000 units)
    const isSuspiciousQuantity = availQty > 10000;

    // Keep row if it has Item # OR Item Name, AND doesn't have suspicious quantity
    return (hasItemNumber || hasItemName) && !isSuspiciousQuantity;
  });

  console.log('\n\n=== FILTER RESULTS ===\n');
  console.log(`Rows before filter: ${jsonData.length}`);
  console.log(`Rows after filter: ${filteredData.length}`);
  console.log(`Rows filtered out: ${jsonData.length - filteredData.length}`);

  console.log('\nLast 3 rows AFTER filtering:');
  filteredData.slice(-3).forEach((row: any, i: number) => {
    console.log(`\nRow ${filteredData.length - 3 + i + 1}:`);
    console.log(`  Item #: ${row['Item #']}`);
    console.log(`  Item Name: ${row['Item Name']}`);
    console.log(`  Avail Qty: ${row['Avail Qty']}`);
  });

  // Check which rows were filtered
  if (jsonData.length !== filteredData.length) {
    console.log('\n\n=== FILTERED OUT ROWS ===\n');
    const filteredOut = jsonData.filter((row: any) => !filteredData.includes(row));
    filteredOut.forEach((row: any, i: number) => {
      console.log(`\nFiltered Row ${i + 1}:`);
      console.log(`  Item #: ${row['Item #']}`);
      console.log(`  Item Name: ${row['Item Name']}`);
      console.log(`  Avail Qty: ${row['Avail Qty']}`);
      console.log(`  HQ Qty: ${row['HQ Qty']}`);
      console.log(`  GM Qty: ${row['GM Qty']}`);
      console.log(`  Reason: ${
        (!row['Item #'] && !row['Item Name']) ? 'No Item # or Item Name' :
        (Number(row['Avail Qty']) > 10000) ? 'Suspiciously high quantity' :
        'Unknown'
      }`);
    });
  }

  console.log('\n\n✓ Filter test complete');
}

testFilter()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });

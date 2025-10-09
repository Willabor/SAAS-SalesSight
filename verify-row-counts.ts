import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

async function verifyRowCounts() {
  console.log('=== VERIFYING ROW COUNTS ===\n');

  const rawWorkbook = XLSX.readFile('docs/Quickbooks POS Reports/10-08-2025/Receiving History from 01-01-2019 till 10-08-2025 All Locations (GooG).xlsx');

  // Process sheets in REVERSE order (like the formatter does)
  const sheetsInOrder = [...rawWorkbook.SheetNames].reverse();

  console.log('Expected row calculation (matching formatter logic):\n');

  let expectedRows = 1; // Start with 1 for header row

  for (let sheetIdx = 0; sheetIdx < sheetsInOrder.length; sheetIdx++) {
    const sheetName = sheetsInOrder[sheetIdx];
    const sheet = rawWorkbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

    const totalRows = range.e.r + 1; // Total rows including index 0
    const afterDeleting5 = totalRows - 5; // Delete top 5 rows

    let rowsAdded;
    if (sheetIdx === 0) {
      // First sheet: keep all rows including header
      rowsAdded = afterDeleting5;
    } else {
      // Subsequent sheets: skip header row (row 0 after deletion becomes row 5 of original)
      rowsAdded = afterDeleting5 - 1;
    }

    console.log(`Sheet ${sheetIdx}: "${sheetName}"`);
    console.log(`  Total rows (raw): ${totalRows}`);
    console.log(`  After deleting top 5: ${afterDeleting5}`);
    console.log(`  Rows added to formatted: ${rowsAdded}`);
    console.log(`  Cumulative: ${expectedRows} -> ${expectedRows + rowsAdded - 1}\n`);

    expectedRows += rowsAdded;
  }

  console.log(`\n=== EXPECTED VS ACTUAL ===\n`);
  console.log(`Expected total rows in formatted file: ${expectedRows}`);

  // Check actual formatted file
  const formattedWorkbook = XLSX.readFile('docs/Quickbooks POS Reports/10-08-2025/formatted_preview.xlsx');
  const formattedSheet = formattedWorkbook.Sheets[formattedWorkbook.SheetNames[0]];
  const formattedRange = XLSX.utils.decode_range(formattedSheet['!ref'] || 'A1');
  const actualRows = formattedRange.e.r + 1;

  console.log(`Actual total rows in formatted file: ${actualRows}`);
  console.log(`Difference: ${actualRows - expectedRows} rows`);

  // Check the ACTUAL last row with data
  console.log('\n\n=== LAST 5 ROWS IN FORMATTED FILE ===\n');

  for (let r = actualRows - 5; r < actualRows; r++) {
    console.log(`Row ${r}:`);
    let hasData = false;

    for (let c = 0; c <= 15; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = formattedSheet[addr];

      if (cell) {
        hasData = true;
        console.log(`  [${c}]: ${cell.v}`);
      }
    }

    if (!hasData) {
      console.log(`  (empty row)`);
    }

    console.log('');
  }

  // Check if there's something AFTER the expected last row
  console.log('\n=== CHECKING FOR EXTRA DATA AFTER EXPECTED END ===\n');

  const expectedLastRow = expectedRows - 1;
  console.log(`Expected last row: ${expectedLastRow}`);
  console.log(`Actual last row: ${formattedRange.e.r}`);

  if (formattedRange.e.r > expectedLastRow) {
    console.log(`\n⚠️  There are ${formattedRange.e.r - expectedLastRow} EXTRA rows!`);
    console.log(`\nChecking these extra rows:\n`);

    for (let r = expectedLastRow + 1; r <= formattedRange.e.r; r++) {
      console.log(`Extra Row ${r}:`);

      for (let c = 0; c <= 15; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = formattedSheet[addr];

        if (cell) {
          console.log(`  [${c}]: ${cell.v}`);
        }
      }

      console.log('');
    }
  }
}

verifyRowCounts()
  .then(() => {
    console.log('\n✓ Verification complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });

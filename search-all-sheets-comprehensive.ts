import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

async function searchAllSheets() {
  console.log('=== COMPREHENSIVE SEARCH FOR TOTAL ROW ===\n');

  const rawWorkbook = XLSX.readFile('docs/Quickbooks POS Reports/10-08-2025/Receiving History from 01-01-2019 till 10-08-2025 All Locations (GooG).xlsx');

  console.log('Searching for ANY row without a date but with a high total value...\n');

  let foundCount = 0;

  for (const sheetName of rawWorkbook.SheetNames) {
    const sheet = rawWorkbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

    console.log(`\nChecking sheet: "${sheetName}" (${data.length} rows)`);

    let sheetFoundCount = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any[];
      if (!row || row.length === 0) continue;

      const dateValue = row[1]; // Column 1 is Date
      const totalValue = row[13]; // Column 13 is Total

      // Look for rows WITHOUT a date but WITH a high total (potential total rows)
      const hasDate = dateValue && dateValue !== '';
      const hasTotalValue = totalValue && totalValue !== '';

      if (!hasDate && hasTotalValue) {
        const total = Number(String(totalValue).replace(/[$,]/g, ''));

        // Check if this is suspiciously high (>$100,000 suggests it's a sum, not a single item)
        if (!isNaN(total) && total > 100000) {
          console.log(`  ⚠️  Row ${i}: NO DATE but total = $${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
          console.log(`      [${row.slice(0, 15).join(' | ')}]`);
          sheetFoundCount++;
          foundCount++;
        }
      }
    }

    if (sheetFoundCount === 0) {
      console.log(`  ✓ No suspicious rows found`);
    } else {
      console.log(`  Found ${sheetFoundCount} suspicious rows`);
    }
  }

  console.log(`\n\nTotal suspicious rows found across all sheets: ${foundCount}`);

  // Now manually check where row 284,603 in the formatted file came from
  console.log('\n\n=== TRACING ROW 284,603 IN FORMATTED FILE ===\n');

  // The formatter processes sheets in REVERSE order and skips top 5 rows
  // Let's calculate which sheet row 284,603 maps to

  const sheetsInOrder = [...rawWorkbook.SheetNames].reverse();

  let cumulativeRows = 0;
  console.log('Row mapping:');

  for (let sheetIdx = 0; sheetIdx < sheetsInOrder.length; sheetIdx++) {
    const sheetName = sheetsInOrder[sheetIdx];
    const sheet = rawWorkbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

    // Delete top 5 rows
    const remainingRows = data.length - 5;

    // Skip header row on subsequent sheets
    const rowsAdded = sheetIdx === 0 ? remainingRows : remainingRows - 1;

    const startRow = cumulativeRows;
    const endRow = cumulativeRows + rowsAdded - 1;

    console.log(`  Sheet "${sheetName}": Rows ${startRow} - ${endRow} (${rowsAdded} rows)`);

    // Check if row 284,603 falls in this range
    if (284603 >= startRow && 284603 <= endRow) {
      const originalRowIndex = 284603 - startRow + 5 + (sheetIdx > 0 ? 1 : 0);
      console.log(`\n  ⚠️  Row 284,603 comes from this sheet!`);
      console.log(`      Original row index: ${originalRowIndex}`);

      // Show that row
      const originalRow = data[originalRowIndex] as any[];
      console.log(`      Original row: [${originalRow.slice(0, 15).join(' | ')}]`);
    }

    cumulativeRows += rowsAdded;
  }

  console.log(`\nTotal rows in formatted file: ${cumulativeRows + 1} (including header)`);
}

searchAllSheets()
  .then(() => {
    console.log('\n✓ Search complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });

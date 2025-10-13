import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

async function inspectRow24632() {
  console.log('=== INSPECTING ROW 24,632 OF SHEET "Receiving Voucher Detail_5" ===\n');

  const rawWorkbook = XLSX.readFile('docs/Quickbooks POS Reports/10-08-2025/Receiving History from 01-01-2019 till 10-08-2025 All Locations (GooG).xlsx');

  const sheetName = 'Receiving Voucher Detail_5';
  const sheet = rawWorkbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

  console.log(`Sheet: "${sheetName}"`);
  console.log(`Total rows: ${range.e.r + 1}`);
  console.log(`Total columns: ${range.e.c + 1}\n`);

  // Check rows 24,630 - 24,632 (last few rows)
  console.log('Last 10 rows of sheet:\n');

  for (let r = Math.max(0, range.e.r - 9); r <= range.e.r; r++) {
    console.log(`Row ${r}:`);

    for (let c = 0; c <= Math.min(15, range.e.c); c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[addr];

      if (cell) {
        console.log(`  [${c}] (${addr}): ${JSON.stringify(cell)}`);
      }
    }

    if (r >= range.e.r - 2) {
      console.log(''); // Extra spacing for last 3 rows
    }
  }

  // Specifically check row 24,632
  console.log('\n\n=== DETAILED CHECK OF ROW 24,632 ===\n');

  const targetRow = 24632;

  console.log(`Checking ALL columns in row ${targetRow}:\n`);

  let foundAnything = false;

  for (let c = 0; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: targetRow, c });
    const cell = sheet[addr];

    if (cell) {
      foundAnything = true;
      console.log(`  Column ${c} (${addr}):`);
      console.log(`    Type: ${cell.t}`);
      console.log(`    Value: ${cell.v}`);
      console.log(`    Formula: ${cell.f || 'none'}`);
      console.log(`    Raw: ${JSON.stringify(cell)}\n`);
    }
  }

  if (!foundAnything) {
    console.log(`  ❌ Row ${targetRow} is completely empty!`);
  }

  // Check if there's a formula in column 13 (Total column)
  console.log('\n\n=== CHECKING COLUMN 13 (Total) AROUND ROW 24,632 ===\n');

  for (let r = targetRow - 5; r <= Math.min(targetRow + 2, range.e.r); r++) {
    const addr = XLSX.utils.encode_cell({ r, c: 13 });
    const cell = sheet[addr];

    if (cell) {
      console.log(`Row ${r} [${addr}]: value=${cell.v}, formula=${cell.f || 'none'}`);
    } else {
      console.log(`Row ${r} [${addr}]: EMPTY`);
    }
  }
}

inspectRow24632()
  .then(() => {
    console.log('\n✓ Inspection complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });

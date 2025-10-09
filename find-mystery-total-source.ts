import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

async function findMysteryTotal() {
  console.log('=== FINDING SOURCE OF MYSTERY TOTAL $6,307,010.92 ===\n');

  const rawWorkbook = XLSX.readFile('docs/Quickbooks POS Reports/10-08-2025/Receiving History from 01-01-2019 till 10-08-2025 All Locations (GooG).xlsx');

  // Check EVERY cell in EVERY sheet for this value or something close
  console.log('Searching ALL cells in ALL sheets for $6,307,010.92...\n');

  for (const sheetName of rawWorkbook.SheetNames) {
    const sheet = rawWorkbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

    for (let r = 0; r <= range.e.r; r++) {
      for (let c = 0; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = sheet[addr];

        if (cell && cell.v !== undefined && cell.v !== null) {
          const val = Number(String(cell.v).replace(/[$,]/g, ''));

          // Check if value is close to 6,307,010.92
          if (!isNaN(val) && Math.abs(val - 6307010.92) < 1) {
            console.log(`\n⚠️  FOUND IN RAW FILE!`);
            console.log(`   Sheet: "${sheetName}"`);
            console.log(`   Cell: ${addr} (Row ${r}, Col ${c})`);
            console.log(`   Value: ${cell.v}`);
            console.log(`   Type: ${cell.t}`);
            if (cell.f) console.log(`   Formula: ${cell.f}`);
          }
        }
      }
    }
  }

  // Check if value matches sum of any subset of sheets
  console.log('\n\n=== CHECKING IF VALUE MATCHES PARTIAL SHEET SUMS ===\n');

  const sheetTotals: { [key: string]: number } = {};

  for (const sheetName of rawWorkbook.SheetNames) {
    const sheet = rawWorkbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

    let sheetTotal = 0;

    for (let i = 6; i < data.length; i++) {
      const row = data[i] as any[];
      if (!row) continue;

      const dateValue = row[1];
      const totalValue = row[13];

      if (dateValue && dateValue !== '') {
        const cost = Number(String(totalValue || '0').replace(/[$,]/g, ''));
        if (!isNaN(cost) && cost > 0) {
          sheetTotal += cost;
        }
      }
    }

    sheetTotals[sheetName] = sheetTotal;
    console.log(`${sheetName}: $${sheetTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  }

  // Check combinations
  console.log('\n\nChecking combinations:');

  const totals = Object.values(sheetTotals);
  const names = Object.keys(sheetTotals);

  for (let i = 0; i < totals.length; i++) {
    const partialSum = totals.slice(0, i + 1).reduce((a, b) => a + b, 0);
    console.log(`Sum of first ${i + 1} sheets: $${partialSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

    if (Math.abs(partialSum - 6307010.92) < 100) {
      console.log(`  ⚠️  CLOSE TO $6,307,010.92!`);
    }
  }

  // Check sum of last N sheets
  console.log('\n\nChecking from end:');

  for (let i = totals.length - 1; i >= 0; i--) {
    const partialSum = totals.slice(i).reduce((a, b) => a + b, 0);
    console.log(`Sum of last ${totals.length - i} sheets: $${partialSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

    if (Math.abs(partialSum - 6307010.92) < 100) {
      console.log(`  ⚠️  CLOSE TO $6,307,010.92!`);
      console.log(`  Sheets: ${names.slice(i).join(', ')}`);
    }
  }

  // Check if it's close to reported total
  console.log('\n\n=== COMPARISON ===\n');
  console.log(`QuickBooks reported: $6,293,009.48`);
  console.log(`Mystery total row: $6,307,010.92`);
  console.log(`Difference: $${(6307010.92 - 6293009.48).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`\nActual sum of all vouchers: $6,343,658.02`);
  console.log(`Mystery vs Actual: $${(6343658.02 - 6307010.92).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
}

findMysteryTotal()
  .then(() => {
    console.log('\n✓ Search complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });

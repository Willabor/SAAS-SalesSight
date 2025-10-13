import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

async function debugSalesStructure() {
  console.log('=== DEBUGGING SALES FILE STRUCTURE ===\n');

  const salesWorkbook = XLSX.readFile('docs/Quickbooks POS Reports/Daily Sales per Transaction per store  (Google).xlsx');

  // Just look at first sheet
  const sheetName = salesWorkbook.SheetNames[0];
  const sheet = salesWorkbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: false
  });

  console.log(`Sheet: "${sheetName}"`);
  console.log(`Total rows: ${jsonData.length}\n`);

  // Look at rows 6-15 more carefully
  console.log('Analyzing rows 6-15:');
  for (let i = 6; i <= 15; i++) {
    const row = jsonData[i] as any[];
    console.log(`\nRow ${i}:`);
    console.log(`  Full row: [${row.map((v, idx) => `${idx}:'${v}'`).join(', ')}]`);
    console.log(`  row[1]='${row[1]}' is date? ${row[1] && typeof row[1] === 'string' && row[1].match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/) ? 'YES' : 'NO'}`);
    console.log(`  row[8]='${row[8]}' is number? ${row[8] && !isNaN(parseFloat(row[8])) ? 'YES' : 'NO'}`);
    console.log(`  parseFloat(row[8])=${row[8] ? parseFloat(row[8]) : 'N/A'}`);

    // Check if this looks like a header row
    if (row[1] && typeof row[1] === 'string' && row[1].match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/)) {
      console.log(`  ➜ HEADER ROW: Date=${row[1]}, Store=${row[2]}, Receipt=${row[4]}`);
    }
    // Check if this looks like a line item
    else if (!row[1] && row[2] && row[8]) {
      console.log(`  ➜ LINE ITEM: SKU=${row[2]}, Item=${row[4]}, Qty=${row[6]}, Price=${row[8]}`);
    }
  }

  // Now count properly
  console.log('\n\n=== PROPER COUNTING ===\n');

  let headerCount = 0;
  let lineItemCount = 0;
  let totalRevenue = 0;

  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i] as any[];

    if (!row || row.length < 5) continue;

    // Header row: has date in column 1 (index 1)
    if (row[1] && typeof row[1] === 'string' && row[1].match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/)) {
      headerCount++;
    }
    // Line item: no date in column 1, has SKU in column 2, price in column 8
    else if (!row[1] && row[2] && row[8] && !isNaN(parseFloat(row[8]))) {
      lineItemCount++;
      totalRevenue += parseFloat(row[8]);
    }
  }

  console.log(`Headers (receipts): ${headerCount}`);
  console.log(`Line items (transactions): ${lineItemCount}`);
  console.log(`Total revenue: $${totalRevenue.toFixed(2)}`);
}

debugSalesStructure()
  .then(() => {
    console.log('\n✓ Debug complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });

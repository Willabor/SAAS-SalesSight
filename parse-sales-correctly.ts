import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

async function parseSalesCorrectly() {
  console.log('=== PARSING QUICKBOOKS SALES FILE CORRECTLY ===\n');

  const salesWorkbook = XLSX.readFile('docs/Quickbooks POS Reports/Daily Sales per Transaction per store  (Google).xlsx');

  console.log(`Number of sheets: ${salesWorkbook.SheetNames.length}\n`);

  let totalTransactions = 0;
  let totalRevenue = 0;
  let totalHeaderRows = 0;
  let totalLineItems = 0;

  salesWorkbook.SheetNames.forEach((sheetName: string, sheetIndex: number) => {
    if (!/^Sales Detail/i.test(sheetName)) return;

    const sheet = salesWorkbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, {
      header: 1, // Get raw arrays
      defval: null,
      raw: false
    });

    console.log(`\nSheet ${sheetIndex + 1}: "${sheetName}"`);
    console.log(`Total rows: ${jsonData.length}`);

    let sheetHeaderRows = 0;
    let sheetLineItems = 0;
    let sheetRevenue = 0;
    let currentTransaction: any = null;

    // Show first 10 rows to understand structure
    if (sheetIndex === 0) {
      console.log('\nFirst 15 rows (to understand structure):');
      jsonData.slice(0, 15).forEach((row: any, i: number) => {
        console.log(`Row ${i}: [${row.join(' | ')}]`);
      });
      console.log('');
    }

    // Parse hierarchical structure
    // Header rows have: Empty, Date, Empty, Empty, Empty, Empty, Empty, Empty, Empty, Empty, Store Name
    // Line item rows have: Empty, SKU, Empty, Item Name, Empty, empty, empty, Price, empty...
    for (let j = 0; j < jsonData.length; j++) {
      const row = jsonData[j] as any[];

      if (!row || row.length < 5) continue;

      // Skip empty rows
      const nonEmpty = row.filter(cell => cell !== null && cell !== undefined && cell !== '');
      if (nonEmpty.length === 0) continue;

      // Check if this is a header row (has a date in column 1)
      // Date format: 9/27/25, 9/26/25, etc.
      if (row[1] && typeof row[1] === 'string' && row[1].match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/)) {
        // This is a transaction header row
        sheetHeaderRows++;
        currentTransaction = {
          date: row[1],
          store: row[10] || row[11] || 'Unknown' // Store name is in later column
        };
      }
      // Check if this is a line item row (has a price in column 9, index 8)
      // Line items have: empty, empty, SKU, empty, Item Name, empty, Qty, empty, Price
      else if (row[8] && !isNaN(parseFloat(row[8]))) {
        // This is a line item row
        sheetLineItems++;
        const price = parseFloat(row[8]);
        sheetRevenue += price;
      }
    }

    console.log(`Header rows (receipts): ${sheetHeaderRows}`);
    console.log(`Line items (transactions): ${sheetLineItems}`);
    console.log(`Revenue: $${sheetRevenue.toFixed(2)}`);

    totalHeaderRows += sheetHeaderRows;
    totalLineItems += sheetLineItems;
    totalRevenue += sheetRevenue;
  });

  console.log('\n=== TOTALS ===');
  console.log(`Total receipts (header rows): ${totalHeaderRows}`);
  console.log(`Total line items (transactions): ${totalLineItems}`);
  console.log(`Total revenue: $${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  console.log('');

  console.log('=== COMPARISON WITH DATABASE ===');
  console.log('Database:');
  console.log('  - Transactions: 375,581');
  console.log('  - Revenue: $16,095,332.34');
  console.log('  - Receipts: 87,058');
  console.log('');
  console.log('QuickBooks File:');
  console.log(`  - Transactions: ${totalLineItems.toLocaleString()}`);
  console.log(`  - Revenue: $${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  console.log(`  - Receipts: ${totalHeaderRows.toLocaleString()}`);
  console.log('');

  if (totalLineItems > 0) {
    const ratio = 375581 / totalLineItems;
    console.log(`Ratio (DB / QB): ${ratio.toFixed(4)}`);
  }
}

parseSalesCorrectly()
  .then(() => {
    console.log('\n✓ Parsing complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });

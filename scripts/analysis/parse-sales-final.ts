import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

async function parseSalesFinal() {
  console.log('=== FINAL SALES FILE PARSING ===\n');

  const salesWorkbook = XLSX.readFile('docs/Quickbooks POS Reports/Daily Sales per Transaction per store  (Google).xlsx');

  console.log(`Number of sheets: ${salesWorkbook.SheetNames.length}\n`);

  let totalReceipts = 0;
  let totalLineItems = 0;
  let totalRevenue = 0;

  salesWorkbook.SheetNames.forEach((sheetName: string, sheetIndex: number) => {
    if (!/^Sales Detail/i.test(sheetName)) return;

    const sheet = salesWorkbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: null,
      raw: true // Keep as raw values, not strings
    });

    let sheetReceipts = 0;
    let sheetLineItems = 0;
    let sheetRevenue = 0;

    for (let i = 0; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];

      if (!row || row.length < 5) continue;

      // Header row: has date in column 1 (index 1)
      // Date will be either a string like "5/11/25" or a date object
      const cell1 = row[1];
      const isDate = cell1 && (
        (typeof cell1 === 'string' && cell1.match(/^\d{1,2}\/\d{1,2}\/\d{2,4}$/)) ||
        (cell1 instanceof Date)
      );

      if (isDate) {
        sheetReceipts++;
      }
      // Line item: no date in column 1, has SKU in column 3, price in column 9
      else if (!isDate && row[3] && row[9] !== null && row[9] !== undefined) {
        const price = parseFloat(String(row[9]));
        if (!isNaN(price)) {
          sheetLineItems++;
          sheetRevenue += price;
        }
      }
    }

    console.log(`Sheet ${sheetIndex + 1}: "${sheetName}"`);
    console.log(`  Receipts: ${sheetReceipts.toLocaleString()}`);
    console.log(`  Line Items: ${sheetLineItems.toLocaleString()}`);
    console.log(`  Revenue: $${sheetRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

    totalReceipts += sheetReceipts;
    totalLineItems += sheetLineItems;
    totalRevenue += sheetRevenue;
  });

  console.log('\n=== TOTALS ===');
  console.log(`Total Receipts: ${totalReceipts.toLocaleString()}`);
  console.log(`Total Line Items (Transactions): ${totalLineItems.toLocaleString()}`);
  console.log(`Total Revenue: $${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  console.log('');

  console.log('=== COMPARISON WITH DATABASE ===\n');

  console.log('QuickBooks File:');
  console.log(`  Transactions: ${totalLineItems.toLocaleString()}`);
  console.log(`  Revenue: $${totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`  Receipts: ${totalReceipts.toLocaleString()}`);
  console.log('');

  console.log('Database:');
  console.log(`  Transactions: 375,581`);
  console.log(`  Revenue: $16,095,332.34`);
  console.log(`  Receipts: 87,058`);
  console.log('');

  console.log('Comparison:');
  if (totalLineItems > 0) {
    const transactionRatio = 375581 / totalLineItems;
    console.log(`  Transaction ratio (DB / QB): ${transactionRatio.toFixed(4)} (${(transactionRatio * 100).toFixed(2)}%)`);
  }
  if (totalRevenue > 0) {
    const revenueRatio = 16095332.34 / totalRevenue;
    console.log(`  Revenue ratio (DB / QB): ${revenueRatio.toFixed(4)} (${(revenueRatio * 100).toFixed(2)}%)`);
  }
  if (totalReceipts > 0) {
    const receiptRatio = 87058 / totalReceipts;
    console.log(`  Receipt ratio (DB / QB): ${receiptRatio.toFixed(4)} (${(receiptRatio * 100).toFixed(2)}%)`);
  }
}

parseSalesFinal()
  .then(() => {
    console.log('\n✓ Parsing complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });

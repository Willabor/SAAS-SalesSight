import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

async function findTotalRowSource() {
  console.log('=== FINDING SOURCE OF $6,307,010.90 TOTAL ROW ===\n');

  const rawWorkbook = XLSX.readFile('docs/Quickbooks POS Reports/10-08-2025/Receiving History from 01-01-2019 till 10-08-2025 All Locations (GooG).xlsx');

  console.log('Searching all sheets for rows with total ≈ $6,307,010.90...\n');

  for (const sheetName of rawWorkbook.SheetNames) {
    const sheet = rawWorkbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any[];
      if (!row || row.length === 0) continue;

      // Check all columns for the value
      for (let j = 0; j < row.length; j++) {
        const value = row[j];
        if (value !== null && value !== undefined) {
          const num = Number(String(value).replace(/[$,]/g, ''));

          // Look for values close to $6,307,010.90
          if (!isNaN(num) && num > 6000000 && num < 7000000) {
            console.log(`\n⚠️  FOUND IN SHEET: "${sheetName}"`);
            console.log(`    Row ${i}, Column ${j}`);
            console.log(`    Value: $${num.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
            console.log(`    Difference from $6,307,010.90: $${(num - 6307010.90).toLocaleString('en-US', { minimumFractionDigits: 2, signDisplay: 'always' })}`);
            console.log(`    Full row: [${row.slice(0, 15).join(' | ')}]`);
          }
        }
      }
    }
  }

  // Also search formatted file to see the exact total row
  console.log('\n\n=== FORMATTED FILE TOTAL ROW ===\n');

  const formattedWorkbook = XLSX.readFile('docs/Quickbooks POS Reports/10-08-2025/formatted_preview.xlsx');
  const formattedSheet = formattedWorkbook.Sheets[formattedWorkbook.SheetNames[0]];
  const formattedData = XLSX.utils.sheet_to_json(formattedSheet, { header: 1, raw: false });

  for (let i = Math.max(0, formattedData.length - 20); i < formattedData.length; i++) {
    const row = formattedData[i] as any[];
    if (!row || row.length === 0) continue;

    // Check for high values
    for (let j = 0; j < row.length; j++) {
      const value = row[j];
      if (value !== null && value !== undefined) {
        const num = Number(String(value).replace(/[$,]/g, ''));
        if (!isNaN(num) && num > 1000000) {
          console.log(`Row ${i}: Found $${num.toLocaleString('en-US', { minimumFractionDigits: 2 })} in column ${j}`);
          console.log(`  Full row: [${row.join(' | ')}]`);
        }
      }
    }
  }

  // Calculate what the actual sum SHOULD be from vouchers only
  console.log('\n\n=== VERIFICATION: WHAT SHOULD THE TOTAL BE? ===\n');

  let voucherTotal = 0;
  let voucherCount = 0;

  for (const sheetName of rawWorkbook.SheetNames) {
    const sheet = rawWorkbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

    for (let i = 6; i < data.length; i++) {
      const row = data[i] as any[];
      if (!row || row.length === 0) continue;

      const dateValue = row[1]; // Column 1 is Date
      const totalValue = row[13]; // Column 13 is Total

      // Voucher header rows have a date
      if (dateValue && dateValue !== '') {
        const cost = Number(String(totalValue || '0').replace(/[$,]/g, ''));
        if (!isNaN(cost) && cost > 0) {
          voucherTotal += cost;
          voucherCount++;
        }
      }
    }
  }

  console.log(`Total vouchers: ${voucherCount}`);
  console.log(`Sum of voucher totals: $${voucherTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`\nQuickBooks reported: $6,293,009.48`);
  console.log(`Formatted total row: $6,307,010.90`);
  console.log(`Actual voucher sum: $${voucherTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
}

findTotalRowSource()
  .then(() => {
    console.log('\n✓ Search complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });

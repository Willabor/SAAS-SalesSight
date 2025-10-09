import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

async function checkRawFileEnd() {
  console.log('=== CHECKING END OF RAW QUICKBOOKS FILE ===\n');

  const rawWorkbook = XLSX.readFile('docs/Quickbooks POS Reports/10-08-2025/Receiving History from 01-01-2019 till 10-08-2025 All Locations (GooG).xlsx');

  // Check LAST 50 rows of FIRST sheet (most recent)
  console.log('FIRST SHEET (Most Recent):');
  const firstSheetName = rawWorkbook.SheetNames[0];
  console.log(`Sheet: "${firstSheetName}"\n`);

  const firstSheet = rawWorkbook.Sheets[firstSheetName];
  const firstData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false });

  console.log(`Total rows: ${firstData.length}\n`);
  console.log('Last 30 rows:\n');

  for (let i = Math.max(0, firstData.length - 30); i < firstData.length; i++) {
    const row = firstData[i] as any[];
    if (!row || row.filter((c: any) => c).length === 0) continue;

    const dateValue = row[1]; // Column 1 is Date
    const storeValue = row[3]; // Column 3 is Store
    const voucherValue = row[5]; // Column 5 is Voucher #
    const totalValue = row[13]; // Column 13 is Total

    console.log(`Row ${i}:`);
    console.log(`  Date: ${dateValue || 'EMPTY'}`);
    console.log(`  Store: ${storeValue || 'EMPTY'}`);
    console.log(`  Voucher: ${voucherValue || 'EMPTY'}`);
    console.log(`  Total: ${totalValue || 'EMPTY'}`);
    console.log('');
  }

  // Check ALL sheets for total rows at the end
  console.log('\n\n=== CHECKING ALL SHEETS FOR TOTAL ROWS ===\n');

  for (const sheetName of rawWorkbook.SheetNames) {
    const sheet = rawWorkbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

    console.log(`\nSheet: "${sheetName}" - Last 5 rows:`);

    for (let i = Math.max(0, data.length - 5); i < data.length; i++) {
      const row = data[i] as any[];
      if (!row || row.filter((c: any) => c).length === 0) continue;

      const dateValue = row[1];
      const totalValue = row[13];
      const hasDate = dateValue && dateValue !== '';
      const hasTotal = totalValue && totalValue !== '';

      if (!hasDate && hasTotal) {
        const total = Number(String(totalValue).replace(/[$,]/g, ''));
        if (total > 100000) {
          console.log(`  ⚠️  Row ${i}: NO DATE but high total: $${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
          console.log(`      Full row: [${row.slice(0, 15).join(' | ')}]`);
        }
      }
    }
  }
}

checkRawFileEnd()
  .then(() => {
    console.log('\n✓ Check complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });

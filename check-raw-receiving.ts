import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

async function checkRawReceiving() {
  console.log('=== CHECKING RAW RECEIVING FILE ===\n');

  console.log('Reading RAW QuickBooks file...');
  const workbook = XLSX.readFile('docs/Quickbooks POS Reports/10-08-2025/Receiving History from 01-01-2019 till 10-08-2025 All Locations (GooG).xlsx');

  console.log(`Number of sheets: ${workbook.SheetNames.length}`);
  console.log(`Sheet names: ${workbook.SheetNames.join(', ')}\n`);

  // Check LAST sheet (first in chronological order, last in file)
  const lastSheetName = workbook.SheetNames[workbook.SheetNames.length - 1];
  console.log(`\nChecking LAST sheet: "${lastSheetName}"\n`);

  const lastSheet = workbook.Sheets[lastSheetName];
  const lastData = XLSX.utils.sheet_to_json(lastSheet, { header: 1, raw: false });

  console.log(`Total rows in last sheet: ${lastData.length}`);
  console.log('\nLast 20 rows of last sheet:');

  lastData.slice(-20).forEach((row: any, i: number) => {
    const rowNum = lastData.length - 20 + i;
    const hasContent = row.filter((c: any) => c !== null && c !== undefined && c !== '').length;
    if (hasContent > 0) {
      console.log(`Row ${rowNum}: [${row.slice(0, 12).map((v: any) => String(v).substring(0, 20)).join(' | ')}]`);
    }
  });

  // Also check FIRST sheet (latest in chronological order)
  const firstSheetName = workbook.SheetNames[0];
  console.log(`\n\n\nChecking FIRST sheet: "${firstSheetName}"\n`);

  const firstSheet = workbook.Sheets[firstSheetName];
  const firstData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false });

  console.log(`Total rows in first sheet: ${firstData.length}`);
  console.log('\nLast 20 rows of first sheet:');

  firstData.slice(-20).forEach((row: any, i: number) => {
    const rowNum = firstData.length - 20 + i;
    const hasContent = row.filter((c: any) => c !== null && c !== undefined && c !== '').length;
    if (hasContent > 0) {
      console.log(`Row ${rowNum}: [${row.slice(0, 12).map((v: any) => String(v).substring(0, 20)).join(' | ')}]`);
    }
  });
}

checkRawReceiving()
  .then(() => {
    console.log('\n✓ Check complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });

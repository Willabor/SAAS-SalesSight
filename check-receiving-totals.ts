import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

async function checkReceivingTotals() {
  console.log('=== CHECKING RECEIVING FILE FOR TOTAL ROWS ===\n');

  // 1. Read RAW file
  console.log('1. Reading RAW QuickBooks file...');
  const rawWorkbook = XLSX.readFile('docs/Quickbooks POS Reports/10-08-2025/Receiving History from 01-01-2019 till 10-08-2025 All Locations (GooG).xlsx');

  console.log(`   Sheets: ${rawWorkbook.SheetNames.join(', ')}`);

  const rawSheet = rawWorkbook.Sheets[rawWorkbook.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json(rawSheet, { header: 1, raw: false });

  console.log(`   Total rows: ${rawData.length}\n`);

  console.log('   Last 15 rows:');
  rawData.slice(-15).forEach((row: any, i: number) => {
    const rowNum = rawData.length - 15 + i;
    const hasContent = row.filter((c: any) => c !== null && c !== undefined && c !== '').length;
    if (hasContent > 0) {
      console.log(`   Row ${rowNum}: [${row.slice(0, 10).join(' | ')}]`);
    }
  });

  // Calculate total cost from raw file
  console.log('\n\n2. Calculating total from RAW file...');
  let rawTotal = 0;
  let rawLineCount = 0;

  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i] as any[];
    // Look for cost column - typically in column index 7 or 8
    for (let j = 0; j < row.length; j++) {
      const val = row[j];
      if (typeof val === 'number' && val > 0 && val < 100000) {
        // Check if previous columns suggest this is a line item
        if (i > 5) { // Skip header rows
          rawTotal += val;
          rawLineCount++;
          break;
        }
      }
    }
  }

  console.log(`   Estimated total: $${rawTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`   Line items counted: ${rawLineCount}\n`);

  // 2. Read FORMATTED file
  console.log('3. Reading FORMATTED file...');
  const formattedWorkbook = XLSX.readFile('docs/Quickbooks POS Reports/10-08-2025/formatted_preview.xlsx');

  console.log(`   Sheets: ${formattedWorkbook.SheetNames.join(', ')}`);

  const formattedSheet = formattedWorkbook.Sheets[formattedWorkbook.SheetNames[0]];
  const formattedData = XLSX.utils.sheet_to_json(formattedSheet, { header: 1, raw: false });

  console.log(`   Total rows: ${formattedData.length}\n`);

  console.log('   Last 15 rows:');
  formattedData.slice(-15).forEach((row: any, i: number) => {
    const rowNum = formattedData.length - 15 + i;
    const hasContent = row.filter((c: any) => c !== null && c !== undefined && c !== '').length;
    if (hasContent > 0) {
      console.log(`   Row ${rowNum}: [${row.slice(0, 10).join(' | ')}]`);
    }
  });

  // Calculate total cost from formatted file
  console.log('\n\n4. Calculating total from FORMATTED file...');
  let formattedTotal = 0;
  let formattedLineCount = 0;

  for (let i = 0; i < formattedData.length; i++) {
    const row = formattedData[i] as any[];
    for (let j = 0; j < row.length; j++) {
      const val = row[j];
      if (typeof val === 'number' && val > 0 && val < 100000) {
        if (i > 5) {
          formattedTotal += val;
          formattedLineCount++;
          break;
        }
      }
    }
  }

  console.log(`   Estimated total: $${formattedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`   Line items counted: ${formattedLineCount}\n`);

  // 3. Compare
  console.log('=== COMPARISON ===\n');
  console.log(`RAW file total:       $6,293,009.48 (reported by QuickBooks)`);
  console.log(`FORMATTED file total: $6,307,010.90 (reported by user)`);
  console.log(`Difference:           $${(6307010.90 - 6293009.48).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log('');
  console.log(`RAW rows:       ${rawData.length}`);
  console.log(`FORMATTED rows: ${formattedData.length}`);
  console.log(`Difference:     ${formattedData.length - rawData.length} rows`);
}

checkReceivingTotals()
  .then(() => {
    console.log('\n✓ Check complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });

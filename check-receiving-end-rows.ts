import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

async function checkReceivingEndRows() {
  console.log('=== CHECKING END ROWS OF RECEIVING FILES ===\n');

  // 1. Read FORMATTED file (smaller, faster)
  console.log('1. Reading FORMATTED file...');
  const formattedWorkbook = XLSX.readFile('docs/Quickbooks POS Reports/10-08-2025/formatted_preview.xlsx');

  const formattedSheet = formattedWorkbook.Sheets[formattedWorkbook.SheetNames[0]];
  const formattedData = XLSX.utils.sheet_to_json(formattedSheet);

  console.log(`   Total rows: ${formattedData.length}`);
  console.log(`   Columns: ${Object.keys(formattedData[0] || {}).join(', ')}\n`);

  console.log('   Last 10 rows:');
  formattedData.slice(-10).forEach((row: any, i: number) => {
    const rowNum = formattedData.length - 10 + i + 1;
    console.log(`\n   Row ${rowNum}:`);
    console.log(`     Voucher: ${row['Voucher #'] || 'N/A'}`);
    console.log(`     Store: ${row['Store'] || 'N/A'}`);
    console.log(`     Date: ${row['Date'] || 'N/A'}`);
    console.log(`     Vendor: ${row['Vendor'] || 'N/A'}`);
    console.log(`     Item: ${row['Item'] || 'N/A'}`);
    console.log(`     Qty: ${row['Qty'] || 'N/A'}`);
    console.log(`     Cost: ${row['Cost'] || 'N/A'}`);
    console.log(`     Total Cost: ${row['Total Cost'] || 'N/A'}`);
  });

  // Check for suspicious patterns
  console.log('\n\n2. Looking for potential TOTAL rows...\n');

  const lastRow: any = formattedData[formattedData.length - 1];
  const secondLastRow: any = formattedData[formattedData.length - 2];

  console.log('   Last row analysis:');
  console.log(`     Has Voucher #: ${lastRow['Voucher #'] ? 'YES' : 'NO'}`);
  console.log(`     Has Item: ${lastRow['Item'] ? 'YES' : 'NO'}`);
  console.log(`     Total Cost: ${lastRow['Total Cost']}`);

  // Check if total cost is suspiciously large
  const totalCost = Number(lastRow['Total Cost']) || 0;
  if (totalCost > 1000000) {
    console.log(`     ⚠️  WARNING: Total Cost is very high (>${1000000})!`);
    console.log(`     This might be a TOTAL row!`);
  }

  // Sum all Total Cost values
  console.log('\n\n3. Calculating sum of all Total Cost values...');
  let sum = 0;
  let count = 0;

  formattedData.forEach((row: any) => {
    const cost = Number(row['Total Cost']) || 0;
    if (cost > 0) {
      sum += cost;
      count++;
    }
  });

  console.log(`   Sum of all Total Cost: $${sum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`   Rows with cost: ${count}`);
  console.log('');
  console.log(`   User reported: $6,307,010.90`);
  console.log(`   Match? ${Math.abs(sum - 6307010.90) < 1 ? 'YES' : 'NO'}`);
}

checkReceivingEndRows()
  .then(() => {
    console.log('\n✓ Check complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });

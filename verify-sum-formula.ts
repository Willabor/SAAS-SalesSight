import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

async function verifySumFormula() {
  console.log('=== VERIFYING SUM FORMULA CALCULATION ===\n');

  const formattedWorkbook = XLSX.readFile('docs/Quickbooks POS Reports/10-08-2025/formatted_preview.xlsx');
  const formattedSheet = formattedWorkbook.Sheets[formattedWorkbook.SheetNames[0]];

  // The formula is: SUM(K2:K284603)
  // Column K is index 10 (0-indexed)
  // Rows 2 to 284603 (1-indexed) = rows 1 to 284602 (0-indexed)

  console.log('Formula: =SUM(K2:K284603)');
  console.log('This sums column K (Total cost) from row 2 to row 284,603\n');

  let sum = 0;
  let count = 0;
  let highestRow = 0;

  for (let r = 1; r <= 284602; r++) { // Excel rows 2-284603 = indices 1-284602
    const addr = XLSX.utils.encode_cell({ r, c: 10 }); // Column K = index 10
    const cell = formattedSheet[addr];

    if (cell && cell.v !== null && cell.v !== undefined) {
      const val = Number(cell.v);
      if (!isNaN(val)) {
        sum += val;
        count++;
        if (val > 0) {
          highestRow = r;
        }
      }
    }
  }

  console.log(`Manual calculation:`);
  console.log(`  Cells summed: ${count}`);
  console.log(`  Sum: $${sum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`  Excel formula result: $6,307,010.92`);
  console.log(`  Difference: $${(sum - 6307010.92).toLocaleString('en-US', { minimumFractionDigits: 2, signDisplay: 'always' })}`);
  console.log(`  Highest row with value: ${highestRow}`);

  // Now sum only NON-ZERO values
  console.log('\n\nSumming only positive values:');

  let positiveSum = 0;
  let positiveCount = 0;

  for (let r = 1; r <= 284602; r++) {
    const addr = XLSX.utils.encode_cell({ r, c: 10 });
    const cell = formattedSheet[addr];

    if (cell && cell.v !== null && cell.v !== undefined) {
      const val = Number(cell.v);
      if (!isNaN(val) && val > 0) {
        positiveSum += val;
        positiveCount++;
      }
    }
  }

  console.log(`  Positive values summed: ${positiveCount}`);
  console.log(`  Sum: $${positiveSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

  // Compare to our earlier calculations
  console.log('\n\n=== FULL COMPARISON ===\n');
  console.log(`QuickBooks REPORTED total:        $6,293,009.48`);
  console.log(`Raw file (voucher sum):           $6,343,658.02`);
  console.log(`Formatted file (excluding total): $6,343,665.02`);
  console.log(`SUM formula result:               $6,307,010.92`);
  console.log(`Manual sum of K2:K284603:         $${sum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

  console.log('\n--- Key Discrepancies ---');
  console.log(`Raw vs QuickBooks reported:  $${(6343658.02 - 6293009.48).toLocaleString('en-US', { minimumFractionDigits: 2, signDisplay: 'always' })} (QuickBooks UNDER-reports)`);
  console.log(`Formatted vs Raw:            $${(6343665.02 - 6343658.02).toLocaleString('en-US', { minimumFractionDigits: 2, signDisplay: 'always' })} (formatter OK)`);
  console.log(`SUM formula vs QuickBooks:   $${(6307010.92 - 6293009.48).toLocaleString('en-US', { minimumFractionDigits: 2, signDisplay: 'always' })} (the $14,001.42 mystery)`);
  console.log(`SUM formula vs Actual data:  $${(6307010.92 - 6343665.02).toLocaleString('en-US', { minimumFractionDigits: 2, signDisplay: 'always' })} (SUM is LESS than actual)`);
}

verifySumFormula()
  .then(() => {
    console.log('\n✓ Verification complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });

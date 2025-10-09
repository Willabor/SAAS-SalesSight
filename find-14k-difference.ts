import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

async function find14kDifference() {
  console.log('=== FINDING THE $14,010.44 DIFFERENCE ===\n');

  const rawWorkbook = XLSX.readFile('docs/Quickbooks POS Reports/10-08-2025/Receiving History from 01-01-2019 till 10-08-2025 All Locations (GooG).xlsx');

  // Collect all vouchers again
  const vouchers: Array<{
    date: string;
    store: string;
    voucher: string;
    type: string;
    vendor: string;
    total: number;
  }> = [];

  for (const sheetName of rawWorkbook.SheetNames) {
    const sheet = rawWorkbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

    for (let i = 6; i < data.length; i++) {
      const row = data[i] as any[];
      if (!row || row.length === 0) continue;

      const dateValue = row[1];

      if (dateValue && dateValue !== '') {
        const totalValue = row[13];
        const cost = Number(String(totalValue || '0').replace(/[$,]/g, ''));

        vouchers.push({
          date: String(dateValue),
          store: String(row[3] || ''),
          voucher: String(row[5] || ''),
          type: String(row[7] || ''),
          vendor: String(row[9] || ''),
          total: cost
        });
      }
    }
  }

  const allSum = vouchers.reduce((sum, v) => sum + v.total, 0);

  console.log('Current numbers:');
  console.log(`  Total vouchers: ${vouchers.length}`);
  console.log(`  Sum of all vouchers: $${allSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`  QuickBooks reported: $6,293,009.48`);
  console.log(`  Difference: $${(allSum - 6293009.48).toLocaleString('en-US', { minimumFractionDigits: 2 })}\n`);

  // Check what happens if we exclude Returns
  const excludeReturns = vouchers.filter(v => v.type !== 'Return').reduce((sum, v) => sum + v.total, 0);
  console.log('Excluding "Return" type:');
  console.log(`  Sum: $${excludeReturns.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`  Diff from QB: $${(excludeReturns - 6293009.48).toLocaleString('en-US', { minimumFractionDigits: 2, signDisplay: 'always' })}\n`);

  // Check what happens if we exclude negatives only
  const excludeNegatives = vouchers.filter(v => v.total >= 0).reduce((sum, v) => sum + v.total, 0);
  console.log('Excluding negative totals:');
  console.log(`  Sum: $${excludeNegatives.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`  Diff from QB: $${(excludeNegatives - 6293009.48).toLocaleString('en-US', { minimumFractionDigits: 2, signDisplay: 'always' })}\n`);

  // Find vouchers that sum to approximately $14,010
  console.log('=== LOOKING FOR VOUCHERS THAT SUM TO ~$14,010 ===\n');

  const returns = vouchers.filter(v => v.type === 'Return');
  const returnsSum = returns.reduce((sum, v) => sum + v.total, 0);

  console.log(`All Returns: ${returns.length} vouchers, sum = $${returnsSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

  const negatives = vouchers.filter(v => v.total < 0);
  const negativesSum = negatives.reduce((sum, v) => sum + v.total, 0);

  console.log(`All Negatives: ${negatives.length} vouchers, sum = $${negativesSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

  const zeros = vouchers.filter(v => v.total === 0);
  console.log(`All Zeros: ${zeros.length} vouchers, sum = $0.00`);

  // Check specific combinations
  console.log('\n=== TESTING COMBINATIONS ===\n');

  const returnsAndNegatives = [...new Set([...returns, ...negatives])];
  const returnsAndNegativesSum = returnsAndNegatives.reduce((sum, v) => sum + v.total, 0);
  console.log(`Returns + Negatives (unique): ${returnsAndNegatives.length} vouchers, sum = $${returnsAndNegativesSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

  const allExcludingReturnsAndNegatives = allSum - returnsAndNegativesSum;
  console.log(`If we exclude these: $${allExcludingReturnsAndNegatives.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`Diff from QB: $${(allExcludingReturnsAndNegatives - 6293009.48).toLocaleString('en-US', { minimumFractionDigits: 2, signDisplay: 'always' })}\n`);

  // Look for specific voucher numbers or dates that might be excluded
  console.log('=== CHECKING FOR SPECIFIC EXCLUSIONS ===\n');

  // Check if there are vouchers with specific numbers that are excluded
  const highVoucherNumbers = vouchers.filter(v => {
    const num = parseInt(v.voucher);
    return !isNaN(num) && num > 20000;
  });

  if (highVoucherNumbers.length > 0) {
    const highSum = highVoucherNumbers.reduce((sum, v) => sum + v.total, 0);
    console.log(`Vouchers with number > 20000: ${highVoucherNumbers.length}, sum = $${highSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  }

  // Check most recent vouchers (might be pending)
  const recent2025 = vouchers.filter(v => v.date.includes('25'));
  const recent2025Sum = recent2025.reduce((sum, v) => sum + v.total, 0);
  console.log(`Vouchers in 2025: ${recent2025.length}, sum = $${recent2025Sum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

  // Try to find the exact $14,010.44
  console.log('\n\n=== TRYING TO MATCH $14,010.44 EXACTLY ===\n');

  // Check if it's a combination of specific voucher properties
  const negativeReceiving = vouchers.filter(v => v.type === 'Receiving' && v.total < 0);
  const negativeReceivingSum = negativeReceiving.reduce((sum, v) => sum + v.total, 0);
  console.log(`Negative "Receiving" vouchers: ${negativeReceiving.length}, sum = $${negativeReceivingSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

  const combo = negativesSum + returnsSum;
  console.log(`\nNegatives ($${negativesSum.toFixed(2)}) + Returns ($${returnsSum.toFixed(2)}) = $${combo.toFixed(2)}`);

  const absoluteCombo = Math.abs(negativesSum) + Math.abs(returnsSum);
  console.log(`|Negatives| + |Returns| = $${absoluteCombo.toFixed(2)}`);

  if (Math.abs(absoluteCombo - 14010.44) < 10) {
    console.log(`  ⚠️⚠️⚠️  VERY CLOSE! QuickBooks might exclude absolute values of negatives + returns!`);
  }

  // Check the difference between our sum and the SUM formula
  console.log('\n\n=== COMPARING TO SUM FORMULA ===\n');
  console.log(`Our all-vouchers sum: $${allSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`SUM formula result: $6,307,010.92`);
  console.log(`Difference: $${(allSum - 6307010.92).toLocaleString('en-US', { minimumFractionDigits: 2, signDisplay: 'always' })}`);
}

find14kDifference()
  .then(() => {
    console.log('\n✓ Analysis complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });

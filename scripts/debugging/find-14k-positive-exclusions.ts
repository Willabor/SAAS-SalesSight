import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

async function find14kPositiveExclusions() {
  console.log('=== FINDING $14,010.44 IN POSITIVE VOUCHERS ===\n');
  console.log('We know QuickBooks excludes:');
  console.log('  1. Negative vouchers: $36,638.10');
  console.log('  2. Unknown positive vouchers: $14,010.44');
  console.log('  Total: $50,648.54\n\n');

  const rawWorkbook = XLSX.readFile('docs/Quickbooks POS Reports/10-08-2025/Receiving History from 01-01-2019 till 10-08-2025 All Locations (GooG).xlsx');

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

  const positiveVouchers = vouchers.filter(v => v.total > 0);

  // Check dates around report generation (Oct 8, 2025)
  console.log('=== CHECKING RECENT DATES ===\n');

  const dateGroups = [
    { label: 'Oct 8, 2025', filter: (v: any) => v.date.includes('10/8/25') || v.date.includes('10/08/25') },
    { label: 'Oct 7, 2025', filter: (v: any) => v.date.includes('10/7/25') || v.date.includes('10/07/25') },
    { label: 'Oct 6, 2025', filter: (v: any) => v.date.includes('10/6/25') || v.date.includes('10/06/25') },
    { label: 'Oct 2025', filter: (v: any) => v.date.includes('10/') && v.date.includes('25') },
    { label: 'Sep 2025', filter: (v: any) => v.date.includes('9/') && v.date.includes('25') || v.date.includes('09/') && v.date.includes('25') },
  ];

  dateGroups.forEach(group => {
    const filtered = positiveVouchers.filter(group.filter);
    const sum = filtered.reduce((s, v) => s + v.total, 0);
    console.log(`${group.label}: ${filtered.length} vouchers, $${sum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

    if (Math.abs(sum - 14010.44) < 50) {
      console.log(`  ⚠️⚠️⚠️  MATCH! QuickBooks likely excludes "${group.label}" vouchers!\n`);

      if (filtered.length < 50) {
        console.log('  Vouchers:');
        filtered.forEach(v => {
          console.log(`    ${v.date} | ${v.store} | #${v.voucher} | ${v.vendor} | $${v.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
        });
      }
    }
  });

  // Check store "PM" which had smallest total
  console.log('\n\n=== CHECKING STORE "PM" ===\n');
  const pmVouchers = positiveVouchers.filter(v => v.store === 'PM');
  const pmSum = pmVouchers.reduce((s, v) => s + v.total, 0);
  console.log(`PM store: ${pmVouchers.length} vouchers, $${pmSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

  // Check if PM + something else = $14,010.44
  const remaining = 14010.44 - pmSum;
  console.log(`$14,010.44 - $${pmSum.toFixed(2)} = $${remaining.toFixed(2)} remaining\n`);

  // Check zero-cost vouchers (they have quantity but $0 total)
  console.log('=== CHECKING ZERO-COST VOUCHERS ===\n');
  const zeroVouchers = vouchers.filter(v => v.total === 0);
  console.log(`Zero vouchers: ${zeroVouchers.length}`);

  // These don't contribute to the sum, but let's see if there's a pattern
  if (zeroVouchers.length > 0 && zeroVouchers.length < 100) {
    console.log('\nAll zero vouchers:');
    zeroVouchers.forEach(v => {
      console.log(`  ${v.date} | ${v.store} | #${v.voucher} | ${v.type} | ${v.vendor}`);
    });
  }

  // Check specific voucher number ranges
  console.log('\n\n=== CHECKING VOUCHER NUMBER PATTERNS ===\n');

  const voucherNumbers = positiveVouchers.map(v => parseInt(v.voucher)).filter(n => !isNaN(n));
  const highVouchers = positiveVouchers.filter(v => {
    const num = parseInt(v.voucher);
    return !isNaN(num) && num >= 21000;
  });

  const highSum = highVouchers.reduce((s, v) => s + v.total, 0);
  console.log(`Vouchers #21000 and above: ${highVouchers.length}, $${highSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

  if (Math.abs(highSum - 14010.44) < 50) {
    console.log(`  ⚠️⚠️⚠️  MATCH! QuickBooks might exclude voucher numbers >= 21000!`);
  }

  // Try different thresholds
  for (let threshold of [20000, 20500, 21000, 21500, 22000]) {
    const filtered = positiveVouchers.filter(v => {
      const num = parseInt(v.voucher);
      return !isNaN(num) && num >= threshold;
    });
    const sum = filtered.reduce((s, v) => s + v.total, 0);

    if (Math.abs(sum - 14010.44) < 50) {
      console.log(`\n⚠️⚠️⚠️  Vouchers >= #${threshold}: ${filtered.length} vouchers, $${sum.toLocaleString('en-US', { minimumFractionDigits: 2 })} - MATCH!`);
    }
  }

  // Check the "Return" type in positive vouchers (might have been corrected)
  console.log('\n\n=== CHECKING "Return" TYPE ===\n');
  const returns = vouchers.filter(v => v.type === 'Return');
  const positiveReturns = returns.filter(v => v.total > 0);
  const negativeReturns = returns.filter(v => v.total < 0);

  console.log(`Total Returns: ${returns.length}`);
  console.log(`  Positive: ${positiveReturns.length}, $${positiveReturns.reduce((s, v) => s + v.total, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`  Negative: ${negativeReturns.length}, $${negativeReturns.reduce((s, v) => s + v.total, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

  // Combined: PM store + specific dates + zeros?
  console.log('\n\n=== TESTING COMBINATIONS ===\n');

  const oct8 = positiveVouchers.filter(v => v.date.includes('10/8/25') || v.date.includes('10/08/25'));
  const oct8Sum = oct8.reduce((s, v) => s + v.total, 0);

  const combo1 = pmSum + oct8Sum;
  console.log(`PM ($${pmSum.toFixed(2)}) + Oct 8 ($${oct8Sum.toFixed(2)}) = $${combo1.toFixed(2)}`);

  if (Math.abs(combo1 - 14010.44) < 50) {
    console.log(`  ⚠️⚠️⚠️  MATCH!`);
  }
}

find14kPositiveExclusions()
  .then(() => {
    console.log('\n✓ Analysis complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });

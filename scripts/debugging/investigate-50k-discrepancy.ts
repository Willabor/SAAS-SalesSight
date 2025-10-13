import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

async function investigate50kDiscrepancy() {
  console.log('=== INVESTIGATING $50,648.54 DISCREPANCY ===\n');
  console.log('QuickBooks reported: $6,293,009.48');
  console.log('Actual positive vouchers: $6,343,658.02');
  console.log('Difference: $50,648.54\n\n');

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
  const negativeVouchers = vouchers.filter(v => v.total < 0);
  const zeroVouchers = vouchers.filter(v => v.total === 0);

  console.log('=== VOUCHER BREAKDOWN ===\n');
  console.log(`Total vouchers: ${vouchers.length}`);
  console.log(`Positive: ${positiveVouchers.length} = $${positiveVouchers.reduce((s, v) => s + v.total, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`Negative: ${negativeVouchers.length} = $${negativeVouchers.reduce((s, v) => s + v.total, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`Zero: ${zeroVouchers.length} = $0.00\n`);

  // Check if $50,648.54 matches any specific subset
  console.log('=== TESTING EXCLUSION SCENARIOS ===\n');

  // Scenario 1: Exclude negatives only
  const sumWithoutNegatives = vouchers.filter(v => v.total >= 0).reduce((s, v) => s + v.total, 0);
  console.log(`1. Exclude negatives only: $${sumWithoutNegatives.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`   Diff from QB: $${(sumWithoutNegatives - 6293009.48).toLocaleString('en-US', { minimumFractionDigits: 2, signDisplay: 'always' })}\n`);

  // Scenario 2: Include negatives (treat as credits)
  const sumWithNegatives = vouchers.reduce((s, v) => s + v.total, 0);
  console.log(`2. Include all (negatives subtract): $${sumWithNegatives.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`   Diff from QB: $${(sumWithNegatives - 6293009.48).toLocaleString('en-US', { minimumFractionDigits: 2, signDisplay: 'always' })}\n`);

  // What vouchers sum to $50,648.54?
  console.log('=== WHAT VOUCHERS SUM TO $50,648.54? ===\n');

  const negativesSum = Math.abs(negativeVouchers.reduce((s, v) => s + v.total, 0));
  console.log(`Absolute value of negatives: $${negativesSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

  const difference = 50648.54 - negativesSum;
  console.log(`$50,648.54 - $${negativesSum.toFixed(2)} = $${difference.toFixed(2)}\n`);

  // Check specific stores
  console.log('=== BREAKDOWN BY STORE ===\n');
  const byStore: { [key: string]: number } = {};

  positiveVouchers.forEach(v => {
    if (!byStore[v.store]) byStore[v.store] = 0;
    byStore[v.store] += v.total;
  });

  const storesSorted = Object.entries(byStore).sort((a, b) => a[1] - b[1]);

  console.log('Stores by total (ascending):');
  storesSorted.forEach(([store, total]) => {
    console.log(`  ${store}: $${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  });

  // Check if any store sums to ~$50,648
  console.log('\n\nChecking for store matching $50,648.54:');
  storesSorted.forEach(([store, total]) => {
    if (Math.abs(total - 50648.54) < 100) {
      console.log(`  ⚠️⚠️⚠️  ${store}: $${total.toLocaleString('en-US', { minimumFractionDigits: 2 })} - MATCH!`);
    }
  });

  // Check sum of smallest stores
  let runningSum = 0;
  console.log('\n\nCumulative sum from smallest stores:');
  for (let i = 0; i < storesSorted.length; i++) {
    runningSum += storesSorted[i][1];
    if (i < 5 || Math.abs(runningSum - 50648.54) < 1000) {
      console.log(`  First ${i + 1} stores: $${runningSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
      if (Math.abs(runningSum - 50648.54) < 100) {
        console.log(`    ⚠️⚠️⚠️  MATCH! QuickBooks might exclude these stores!`);
        console.log(`    Stores: ${storesSorted.slice(0, i + 1).map(s => s[0]).join(', ')}`);
        break;
      }
    }
  }

  // Check by vendor
  console.log('\n\n=== BREAKDOWN BY VENDOR ===\n');
  const byVendor: { [key: string]: number } = {};

  positiveVouchers.forEach(v => {
    if (!byVendor[v.vendor]) byVendor[v.vendor] = 0;
    byVendor[v.vendor] += v.total;
  });

  const vendorsSorted = Object.entries(byVendor).sort((a, b) => a[1] - b[1]).slice(0, 20);

  console.log('Top 20 vendors by total (ascending):');
  vendorsSorted.forEach(([vendor, total]) => {
    console.log(`  ${vendor}: $${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  });

  // Cumulative vendor sum
  let vendorRunningSum = 0;
  console.log('\n\nCumulative sum from smallest vendors:');
  for (let i = 0; i < vendorsSorted.length; i++) {
    vendorRunningSum += vendorsSorted[i][1];
    if (i < 10 || Math.abs(vendorRunningSum - 50648.54) < 1000) {
      console.log(`  First ${i + 1} vendors: $${vendorRunningSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
      if (Math.abs(vendorRunningSum - 50648.54) < 100) {
        console.log(`    ⚠️⚠️⚠️  CLOSE! QuickBooks might exclude these vendors!`);
        break;
      }
    }
  }

  // Check combined: negatives + zeros + something else
  console.log('\n\n=== COMBINED EXCLUSIONS ===\n');

  const negativesAndZeros = [...negativeVouchers, ...zeroVouchers];
  const negZeroSum = negativesAndZeros.reduce((s, v) => s + Math.abs(v.total), 0);

  console.log(`Negatives + Zeros (absolute): $${negZeroSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`Need to find: $${(50648.54 - negZeroSum).toLocaleString('en-US', { minimumFractionDigits: 2 })} more\n`);

  const remaining = 50648.54 - negZeroSum;

  // Find positive vouchers that sum to the remaining amount
  console.log(`Looking for positive vouchers summing to ~$${remaining.toFixed(2)}...`);
}

investigate50kDiscrepancy()
  .then(() => {
    console.log('\n✓ Investigation complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });

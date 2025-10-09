import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

async function investigateUnderreport() {
  console.log('=== INVESTIGATING WHY QUICKBOOKS UNDER-REPORTS BY $50,648.54 ===\n');

  const rawWorkbook = XLSX.readFile('docs/Quickbooks POS Reports/10-08-2025/Receiving History from 01-01-2019 till 10-08-2025 All Locations (GooG).xlsx');

  // Analyze all vouchers
  const vouchers: Array<{
    sheet: string;
    row: number;
    date: string;
    store: string;
    voucher: string;
    type: string;
    vendor: string;
    totalQty: number;
    total: number;
  }> = [];

  for (const sheetName of rawWorkbook.SheetNames) {
    const sheet = rawWorkbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

    for (let i = 6; i < data.length; i++) {
      const row = data[i] as any[];
      if (!row || row.length === 0) continue;

      const dateValue = row[1]; // Column 1 is Date
      const storeValue = row[3]; // Column 3 is Store
      const voucherValue = row[5]; // Column 5 is Voucher #
      const typeValue = row[7]; // Column 7 is Type
      const vendorValue = row[9]; // Column 9 is Vendor
      const totalQtyValue = row[11]; // Column 11 is Total Qty
      const totalValue = row[13]; // Column 13 is Total

      // Voucher header rows have a date
      if (dateValue && dateValue !== '') {
        const cost = Number(String(totalValue || '0').replace(/[$,]/g, ''));
        const qty = Number(String(totalQtyValue || '0').replace(/[,]/g, ''));

        vouchers.push({
          sheet: sheetName,
          row: i,
          date: String(dateValue),
          store: String(storeValue || ''),
          voucher: String(voucherValue || ''),
          type: String(typeValue || ''),
          vendor: String(vendorValue || ''),
          totalQty: qty,
          total: cost
        });
      }
    }
  }

  console.log(`Total vouchers found: ${vouchers.length}\n`);

  // 1. Check for negative totals
  const negativeVouchers = vouchers.filter(v => v.total < 0);
  const negativeTotalSum = negativeVouchers.reduce((sum, v) => sum + v.total, 0);

  console.log('=== NEGATIVE TOTALS ===');
  console.log(`Vouchers with negative total: ${negativeVouchers.length}`);
  console.log(`Sum of negative totals: $${negativeTotalSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

  if (negativeVouchers.length > 0) {
    console.log('\nFirst 10 negative vouchers:');
    negativeVouchers.slice(0, 10).forEach(v => {
      console.log(`  ${v.date} | ${v.store} | Voucher ${v.voucher} | ${v.type} | ${v.vendor} | $${v.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    });
  }

  // 2. Check for zero totals
  const zeroVouchers = vouchers.filter(v => v.total === 0);

  console.log('\n\n=== ZERO TOTALS ===');
  console.log(`Vouchers with zero total: ${zeroVouchers.length}`);

  if (zeroVouchers.length > 0) {
    console.log('\nFirst 10 zero vouchers:');
    zeroVouchers.slice(0, 10).forEach(v => {
      console.log(`  ${v.date} | ${v.store} | Voucher ${v.voucher} | ${v.type} | ${v.vendor} | Qty: ${v.totalQty}`);
    });
  }

  // 3. Check voucher types
  const typeBreakdown: { [key: string]: { count: number; sum: number } } = {};

  vouchers.forEach(v => {
    if (!typeBreakdown[v.type]) {
      typeBreakdown[v.type] = { count: 0, sum: 0 };
    }
    typeBreakdown[v.type].count++;
    typeBreakdown[v.type].sum += v.total;
  });

  console.log('\n\n=== BREAKDOWN BY TYPE ===');
  Object.entries(typeBreakdown).forEach(([type, data]) => {
    console.log(`${type || '(blank)'}:`);
    console.log(`  Count: ${data.count}`);
    console.log(`  Sum: $${data.sum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  });

  // 4. Calculate different scenarios
  console.log('\n\n=== CALCULATION SCENARIOS ===\n');

  const allVouchersSum = vouchers.reduce((sum, v) => sum + v.total, 0);
  const positiveOnlySum = vouchers.filter(v => v.total > 0).reduce((sum, v) => sum + v.total, 0);
  const receivingOnlySum = vouchers.filter(v => v.type === 'Receiving' && v.total > 0).reduce((sum, v) => sum + v.total, 0);
  const receivingAllSum = vouchers.filter(v => v.type === 'Receiving').reduce((sum, v) => sum + v.total, 0);

  console.log(`1. All vouchers (including negatives/zeros): $${allVouchersSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`   Diff from QB: $${(allVouchersSum - 6293009.48).toLocaleString('en-US', { minimumFractionDigits: 2, signDisplay: 'always' })}`);

  console.log(`\n2. Positive vouchers only: $${positiveOnlySum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`   Diff from QB: $${(positiveOnlySum - 6293009.48).toLocaleString('en-US', { minimumFractionDigits: 2, signDisplay: 'always' })}`);

  console.log(`\n3. "Receiving" type only (positive): $${receivingOnlySum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`   Diff from QB: $${(receivingOnlySum - 6293009.48).toLocaleString('en-US', { minimumFractionDigits: 2, signDisplay: 'always' })}`);
  console.log(`   ⚠️  Is this close to QuickBooks reported?`);

  console.log(`\n4. "Receiving" type (including negatives): $${receivingAllSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`   Diff from QB: $${(receivingAllSum - 6293009.48).toLocaleString('en-US', { minimumFractionDigits: 2, signDisplay: 'always' })}`);

  // 5. Check if $50,648.54 matches specific patterns
  console.log('\n\n=== LOOKING FOR $50,648.54 PATTERN ===\n');

  const nonReceivingSum = vouchers.filter(v => v.type !== 'Receiving').reduce((sum, v) => sum + v.total, 0);
  console.log(`Sum of non-"Receiving" vouchers: $${nonReceivingSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

  if (Math.abs(nonReceivingSum - 50648.54) < 1) {
    console.log(`   ⚠️⚠️⚠️  MATCH! QuickBooks excludes non-"Receiving" vouchers!`);
  }

  const negativeAndZeroSum = vouchers.filter(v => v.total <= 0).reduce((sum, v) => sum + v.total, 0);
  console.log(`\nSum of negative + zero vouchers: $${negativeAndZeroSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

  if (Math.abs(negativeAndZeroSum + 50648.54) < 1) {
    console.log(`   ⚠️⚠️⚠️  MATCH! QuickBooks excludes negative/zero vouchers!`);
  }

  // Check specific vendors
  const vendorBreakdown: { [key: string]: number } = {};
  vouchers.forEach(v => {
    if (!vendorBreakdown[v.vendor]) vendorBreakdown[v.vendor] = 0;
    vendorBreakdown[v.vendor] += v.total;
  });

  const vendorsSorted = Object.entries(vendorBreakdown).sort((a, b) => a[1] - b[1]);

  console.log('\n\nVendors with lowest totals (potential negatives):');
  vendorsSorted.slice(0, 10).forEach(([vendor, total]) => {
    console.log(`  ${vendor}: $${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  });

  console.log('\n\n=== SUMMARY ===');
  console.log(`QuickBooks reported: $6,293,009.48`);
  console.log(`Our calculation: $${allVouchersSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`Missing: $${(allVouchersSum - 6293009.48).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
}

investigateUnderreport()
  .then(() => {
    console.log('\n✓ Investigation complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });

import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

async function detailedAnalysis() {
  console.log('=== DETAILED EXCLUSION ANALYSIS ===\n');

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

  // Let's think about this differently
  // QB reports: $6,293,009.48
  // We have these scenarios:

  const allSum = vouchers.reduce((s, v) => s + v.total, 0);
  const positiveOnly = vouchers.filter(v => v.total > 0).reduce((s, v) => s + v.total, 0);
  const receiving = vouchers.filter(v => v.type === 'Receiving').reduce((s, v) => s + v.total, 0);
  const receivingPositive = vouchers.filter(v => v.type === 'Receiving' && v.total > 0).reduce((s, v) => s + v.total, 0);

  console.log('Summary of all possible calculations:\n');
  console.log(`1. All vouchers (including negatives):     $${allSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`   Diff from QB ($6,293,009.48): $${(allSum - 6293009.48).toLocaleString('en-US', { minimumFractionDigits: 2, signDisplay: 'always' })}\n`);

  console.log(`2. Positive vouchers only:                $${positiveOnly.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`   Diff from QB: $${(positiveOnly - 6293009.48).toLocaleString('en-US', { minimumFractionDigits: 2, signDisplay: 'always' })}\n`);

  console.log(`3. "Receiving" type (all):                $${receiving.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`   Diff from QB: $${(receiving - 6293009.48).toLocaleString('en-US', { minimumFractionDigits: 2, signDisplay: 'always' })}\n`);

  console.log(`4. "Receiving" type (positive only):      $${receivingPositive.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`   Diff from QB: $${(receivingPositive - 6293009.48).toLocaleString('en-US', { minimumFractionDigits: 2, signDisplay: 'always' })}\n`);

  // The $14,010.44 must be in the data somewhere
  // Let's find vouchers by different date ranges
  console.log('\n=== CHECKING DATE PATTERNS ===\n');

  const year2019 = vouchers.filter(v => v.date.includes('19')).reduce((s, v) => s + v.total, 0);
  const year2020 = vouchers.filter(v => v.date.includes('20')).reduce((s, v) => s + v.total, 0);
  const year2021 = vouchers.filter(v => v.date.includes('21')).reduce((s, v) => s + v.total, 0);
  const year2022 = vouchers.filter(v => v.date.includes('22')).reduce((s, v) => s + v.total, 0);
  const year2023 = vouchers.filter(v => v.date.includes('23')).reduce((s, v) => s + v.total, 0);
  const year2024 = vouchers.filter(v => v.date.includes('24')).reduce((s, v) => s + v.total, 0);
  const year2025 = vouchers.filter(v => v.date.includes('25')).reduce((s, v) => s + v.total, 0);

  console.log(`2019: $${year2019.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`2020: $${year2020.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`2021: $${year2021.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`2022: $${year2022.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`2023: $${year2023.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`2024: $${year2024.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`2025: $${year2025.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

  // Maybe QB uses title "Receiving History from 01-01-2019 till 10-08-2025"
  // Does it exclude 10/8/2025? Let's check dates >= 10/8/25
  console.log('\n\n=== CHECKING IF QB EXCLUDES >= 10/8/2025 ===\n');

  const parseDate = (dateStr: string) => {
    // Dates are in format like "10/8/25" or "10/08/25"
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const month = parseInt(parts[0]);
      const day = parseInt(parts[1]);
      const year = 2000 + parseInt(parts[2]);
      return new Date(year, month - 1, day);
    }
    return null;
  };

  const cutoffDate = new Date(2025, 9, 8); // Oct 8, 2025

  const onOrAfterCutoff = vouchers.filter(v => {
    const d = parseDate(v.date);
    return d && d >= cutoffDate;
  });

  const onOrAfterCutoffSum = onOrAfterCutoff.reduce((s, v) => s + v.total, 0);

  console.log(`Vouchers on/after Oct 8, 2025: ${onOrAfterCutoff.length}, $${onOrAfterCutoffSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

  if (Math.abs(onOrAfterCutoffSum - 14010.44) < 50) {
    console.log(`  ⚠️⚠️⚠️  MATCH! QuickBooks excludes vouchers on/after report date!`);

    if (onOrAfterCutoff.length < 30) {
      console.log('\n  These vouchers:');
      onOrAfterCutoff.forEach(v => {
        console.log(`    ${v.date} | ${v.store} | #${v.voucher} | ${v.vendor} | $${v.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
      });
    }
  }

  // Try AFTER 10/8 (excluding 10/8)
  const afterCutoff = vouchers.filter(v => {
    const d = parseDate(v.date);
    return d && d > cutoffDate;
  });

  const afterCutoffSum = afterCutoff.reduce((s, v) => s + v.total, 0);

  console.log(`\nVouchers AFTER Oct 8, 2025: ${afterCutoff.length}, $${afterCutoffSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

  if (Math.abs(afterCutoffSum - 14010.44) < 50) {
    console.log(`  ⚠️⚠️⚠️  MATCH! QuickBooks excludes vouchers after report date!`);
  }

  // Try different cutoff dates
  console.log('\n\nTrying different cutoff dates:');

  for (let day of [5, 6, 7, 8, 9]) {
    const testCutoff = new Date(2025, 9, day); // October = month 9
    const onOrAfter = vouchers.filter(v => {
      const d = parseDate(v.date);
      return d && d >= testCutoff;
    });
    const sum = onOrAfter.reduce((s, v) => s + v.total, 0);

    console.log(`  >= Oct ${day}, 2025: ${onOrAfter.length} vouchers, $${sum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

    if (Math.abs(sum - 14010.44) < 50) {
      console.log(`    ⚠️⚠️⚠️  MATCH!`);
    }
  }

  console.log('\n\n=== FINAL CHECK: WHAT GETS US TO QB NUMBER? ===\n');

  // Start with all positive, subtract things until we hit $6,293,009.48
  console.log(`Starting with all positive vouchers: $${positiveOnly.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`Need to subtract: $${(positiveOnly - 6293009.48).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`\nTarget: $50,648.54`);
}

detailedAnalysis()
  .then(() => {
    console.log('\n✓ Analysis complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });

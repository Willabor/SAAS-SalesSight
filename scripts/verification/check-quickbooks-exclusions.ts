import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

async function checkExclusions() {
  console.log('=== CHECKING FOR QUICKBOOKS EXCLUSIONS ===\n');

  const rawWorkbook = XLSX.readFile('docs/Quickbooks POS Reports/10-08-2025/Receiving History from 01-01-2019 till 10-08-2025 All Locations (GooG).xlsx');

  const vouchers: Array<{
    date: string;
    store: string;
    voucher: string;
    type: string;
    vendor: string;
    total: number;
    time: string;
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
        const timeValue = row[15];
        const cost = Number(String(totalValue || '0').replace(/[$,]/g, ''));

        vouchers.push({
          date: String(dateValue),
          store: String(row[3] || ''),
          voucher: String(row[5] || ''),
          type: String(row[7] || ''),
          vendor: String(row[9] || ''),
          total: cost,
          time: String(timeValue || '')
        });
      }
    }
  }

  console.log(`Total vouchers: ${vouchers.length}`);
  console.log(`Sum: $${vouchers.reduce((s, v) => s + v.total, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}\n`);

  // Check by store
  console.log('=== BY STORE ===\n');
  const byStore: { [key: string]: { count: number; sum: number } } = {};

  vouchers.forEach(v => {
    if (!byStore[v.store]) byStore[v.store] = { count: 0, sum: 0 };
    byStore[v.store].count++;
    byStore[v.store].sum += v.total;
  });

  Object.entries(byStore).sort((a, b) => b[1].sum - a[1].sum).forEach(([store, data]) => {
    console.log(`${store}: ${data.count} vouchers, $${data.sum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  });

  // Check if there's a specific store that sums to ~$14,010
  console.log('\n\n=== LOOKING FOR STORE MATCHING $14,010 ===\n');
  Object.entries(byStore).forEach(([store, data]) => {
    if (Math.abs(Math.abs(data.sum) - 14010) < 100) {
      console.log(`⚠️  ${store}: $${data.sum.toLocaleString('en-US', { minimumFractionDigits: 2 })} - CLOSE!`);
    }
  });

  // Check specific time ranges (maybe only certain times are included?)
  const withTime = vouchers.filter(v => v.time && v.time !== '' && v.time !== '0');
  const withoutTime = vouchers.filter(v => !v.time || v.time === '' || v.time === '0');

  console.log('\n=== BY TIME ===\n');
  console.log(`With time: ${withTime.length} vouchers, $${withTime.reduce((s, v) => s + v.total, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`Without time: ${withoutTime.length} vouchers, $${withoutTime.reduce((s, v) => s + v.total, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

  const withoutTimeSum = withoutTime.reduce((s, v) => s + v.total, 0);
  if (Math.abs(withoutTimeSum - 14010) < 100) {
    console.log(`\n⚠️⚠️⚠️  Vouchers without time sum to ~$14,010!`);
  }

  // Check if there are vouchers on specific dates (like the report generation date)
  console.log('\n\n=== CHECKING RECENT DATES ===\n');

  const oct2025 = vouchers.filter(v => v.date.includes('10/') && v.date.includes('25'));
  const oct8 = vouchers.filter(v => v.date.includes('10/8/25') || v.date.includes('10/08/25'));

  console.log(`October 2025 vouchers: ${oct2025.length}, $${oct2025.reduce((s, v) => s + v.total, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`Oct 8, 2025 vouchers: ${oct8.length}, $${oct8.reduce((s, v) => s + v.total, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

  const oct8Sum = oct8.reduce((s, v) => s + v.total, 0);
  if (Math.abs(oct8Sum - 14010) < 100) {
    console.log(`\n⚠️⚠️⚠️  Oct 8, 2025 vouchers sum to ~$14,010!`);
    console.log(`\nQuickBooks might exclude the report generation date!`);
  }

  // List Oct 8 vouchers
  if (oct8.length > 0 && oct8.length < 50) {
    console.log('\n\nOct 8, 2025 vouchers:');
    oct8.forEach(v => {
      console.log(`  ${v.store} | Voucher ${v.voucher} | ${v.vendor} | $${v.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    });
  }

  // Check if $14,010.44 = sum of vouchers added after QuickBooks generated its total
  console.log('\n\n=== CHECKING FOR POST-REPORT ADDITIONS ===\n');

  // Maybe vouchers from the last day or two
  const recent = vouchers.filter(v =>
    v.date.includes('10/8/25') ||
    v.date.includes('10/7/25') ||
    v.date.includes('10/6/25')
  );

  const recentSum = recent.reduce((s, v) => s + v.total, 0);
  console.log(`Vouchers from Oct 6-8, 2025: ${recent.length}, $${recentSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

  if (Math.abs(recentSum - 14010) < 100) {
    console.log(`\n⚠️⚠️⚠️  Recent vouchers sum to ~$14,010!`);
  }
}

checkExclusions()
  .then(() => {
    console.log('\n✓ Check complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });

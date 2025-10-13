import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function analyzeVouchers() {
  console.log('=== SIMPLE VOUCHER ANALYSIS ===\n');

  // Check vouchers by value thresholds
  const thresholds = [1000, 2500, 5000, 7500, 10000, 15000, 20000];

  console.log('VOUCHER COUNT BY THRESHOLD:\n');
  for (const threshold of thresholds) {
    const result = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM receiving_vouchers
      WHERE corrected_total::numeric >= ${threshold}
    `);
    console.log(`>= $${threshold.toLocaleString()}: ${result.rows[0].count} vouchers`);
  }

  // Get top 20 highest vouchers
  console.log('\n\nTOP 20 HIGHEST VOUCHERS:');
  const top20 = await db.execute(sql`
    SELECT
      voucher_number,
      date,
      store,
      vendor,
      corrected_total,
      total_qty,
      (SELECT COUNT(*) FROM receiving_lines WHERE voucher_id = receiving_vouchers.id) as line_count
    FROM receiving_vouchers
    ORDER BY corrected_total::numeric DESC
    LIMIT 20
  `);

  console.table(top20.rows);

  // Check all JHDesign vouchers
  console.log('\n\nALL JHDESIGN VOUCHERS:');
  const jhdesign = await db.execute(sql`
    SELECT
      voucher_number,
      date,
      store,
      corrected_total,
      total_qty,
      (SELECT COUNT(*) FROM receiving_lines WHERE voucher_id = receiving_vouchers.id) as line_count
    FROM receiving_vouchers
    WHERE vendor ILIKE '%jh%design%'
    ORDER BY corrected_total::numeric DESC
  `);

  console.log(`Total JHDesign vouchers: ${jhdesign.rows.length}\n`);
  console.table(jhdesign.rows);

  process.exit(0);
}

analyzeVouchers().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});

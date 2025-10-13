import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function debugReceivingData() {
  console.log('=== DEBUGGING RECEIVING DATABASE ===\n');

  // 1. Check voucher totals
  console.log('1. Checking first 10 vouchers with their correctedTotal:');
  const vouchers = await db.execute(sql`
    SELECT
      id,
      voucher_number,
      store,
      date,
      vendor,
      type,
      qb_total,
      corrected_total,
      total_qty
    FROM receiving_vouchers
    ORDER BY id
    LIMIT 10
  `);

  console.table(vouchers.rows);

  // 2. Check line items for one voucher
  console.log('\n2. Checking line items for voucher ID 1:');
  const lines = await db.execute(sql`
    SELECT
      id,
      voucher_id,
      item_number,
      item_name,
      qty,
      cost
    FROM receiving_lines
    WHERE voucher_id = 1
  `);

  console.table(lines.rows);

  // 3. Calculate what the total SHOULD be for voucher 1
  console.log('\n3. Calculating corrected total for voucher ID 1 from line items:');
  const calculated = await db.execute(sql`
    SELECT
      SUM(qty * cost::numeric) as calculated_total
    FROM receiving_lines
    WHERE voucher_id = 1
  `);

  console.log('Calculated total from lines:', calculated.rows[0]);

  // 4. Check stats
  console.log('\n4. Overall statistics:');
  const stats = await db.execute(sql`
    SELECT
      COUNT(*) as total_vouchers,
      SUM(corrected_total::numeric) as sum_corrected_total,
      AVG(corrected_total::numeric) as avg_corrected_total,
      MIN(corrected_total::numeric) as min_corrected_total,
      MAX(corrected_total::numeric) as max_corrected_total
    FROM receiving_vouchers
  `);

  console.table(stats.rows);

  // 5. Check for suspiciously high values
  console.log('\n5. Vouchers with correctedTotal > $100,000:');
  const highValues = await db.execute(sql`
    SELECT
      id,
      voucher_number,
      store,
      corrected_total,
      (SELECT COUNT(*) FROM receiving_lines WHERE voucher_id = receiving_vouchers.id) as line_count
    FROM receiving_vouchers
    WHERE corrected_total::numeric > 100000
    ORDER BY corrected_total::numeric DESC
    LIMIT 10
  `);

  console.table(highValues.rows);

  // 6. Compare voucher totals with sum of their lines
  console.log('\n6. Comparing voucher correctedTotal with sum of line items (first 10):');
  const comparison = await db.execute(sql`
    SELECT
      v.id,
      v.voucher_number,
      v.corrected_total as voucher_total,
      COALESCE(SUM(l.qty * l.cost::numeric), 0) as lines_total,
      v.corrected_total::numeric - COALESCE(SUM(l.qty * l.cost::numeric), 0) as difference
    FROM receiving_vouchers v
    LEFT JOIN receiving_lines l ON l.voucher_id = v.id
    GROUP BY v.id, v.voucher_number, v.corrected_total
    ORDER BY v.id
    LIMIT 10
  `);

  console.table(comparison.rows);

  // 7. Check if there are duplicate vouchers
  console.log('\n7. Checking for duplicate vouchers:');
  const duplicates = await db.execute(sql`
    SELECT
      voucher_number,
      store,
      date,
      COUNT(*) as count
    FROM receiving_vouchers
    GROUP BY voucher_number, store, date
    HAVING COUNT(*) > 1
    LIMIT 10
  `);

  console.log(`Found ${duplicates.rows.length} duplicate voucher groups`);
  if (duplicates.rows.length > 0) {
    console.table(duplicates.rows);
  }

  console.log('\n✓ Debug complete');
  process.exit(0);
}

debugReceivingData().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});

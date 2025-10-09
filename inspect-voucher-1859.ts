import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function inspectVoucher() {
  console.log('=== INSPECTING VOUCHER #1859 (ID 49857) ===\n');

  // Get voucher details
  console.log('Voucher details:');
  const voucher = await db.execute(sql`
    SELECT *
    FROM receiving_vouchers
    WHERE id = 49857
  `);

  console.table(voucher.rows);

  // Get all line items
  console.log('\nAll line items for this voucher:');
  const lines = await db.execute(sql`
    SELECT
      id,
      item_number,
      item_name,
      qty,
      cost,
      (qty * cost::numeric) as line_total
    FROM receiving_lines
    WHERE voucher_id = 49857
    ORDER BY id
  `);

  console.table(lines.rows);

  // Calculate totals
  console.log('\nCalculated totals:');
  const calculated = await db.execute(sql`
    SELECT
      COUNT(*) as line_count,
      SUM(qty) as total_qty,
      SUM(qty * cost::numeric) as calculated_total,
      MAX(cost::numeric) as max_cost,
      MIN(cost::numeric) as min_cost,
      AVG(cost::numeric) as avg_cost
    FROM receiving_lines
    WHERE voucher_id = 49857
  `);

  console.table(calculated.rows);

  // Check for abnormally high costs
  console.log('\nLine items with cost > $10,000:');
  const highCosts = await db.execute(sql`
    SELECT
      id,
      item_number,
      item_name,
      qty,
      cost,
      (qty * cost::numeric) as line_total
    FROM receiving_lines
    WHERE voucher_id = 49857 AND cost::numeric > 10000
    ORDER BY cost::numeric DESC
  `);

  console.table(highCosts.rows);

  console.log('\n✓ Inspection complete');
  process.exit(0);
}

inspectVoucher().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});

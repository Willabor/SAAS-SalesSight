import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function analyzeVoucherAnomalies() {
  console.log('=== ANALYZING RECEIVING VOUCHER ANOMALIES ===\n');

  // 1. Get overall statistics
  console.log('1. OVERALL STATISTICS:');
  const stats = await db.execute(sql`
    SELECT
      COUNT(*) as total_vouchers,
      AVG(corrected_total::numeric) as avg_total,
      MIN(corrected_total::numeric) as min_total,
      MAX(corrected_total::numeric) as max_total,
      PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY corrected_total::numeric) as median_total,
      PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY corrected_total::numeric) as p75_total,
      PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY corrected_total::numeric) as p90_total,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY corrected_total::numeric) as p95_total,
      PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY corrected_total::numeric) as p99_total,
      STDDEV(corrected_total::numeric) as std_dev
    FROM receiving_vouchers
  `);

  console.table(stats.rows);

  // 2. Find vouchers over $10,000
  console.log('\n\n2. VOUCHERS OVER $10,000:');
  const highValueVouchers = await db.execute(sql`
    SELECT
      id,
      voucher_number,
      date,
      store,
      vendor,
      type,
      corrected_total,
      (SELECT COUNT(*) FROM receiving_lines WHERE voucher_id = receiving_vouchers.id) as line_count,
      total_qty
    FROM receiving_vouchers
    WHERE corrected_total::numeric > 10000
    ORDER BY corrected_total::numeric DESC
  `);

  console.log(`Found ${highValueVouchers.rows.length} vouchers over $10,000\n`);
  console.table(highValueVouchers.rows);

  // 3. Check voucher #1859 specifically
  console.log('\n\n3. VOUCHER #1859 (JHDesign Dropshipping):');
  const voucher1859 = await db.execute(sql`
    SELECT
      id,
      voucher_number,
      date,
      store,
      vendor,
      type,
      qb_total,
      corrected_total,
      total_qty,
      (SELECT COUNT(*) FROM receiving_lines WHERE voucher_id = receiving_vouchers.id) as line_count
    FROM receiving_vouchers
    WHERE voucher_number = '1859'
  `);

  console.table(voucher1859.rows);

  // 4. Distribution by ranges
  console.log('\n\n4. DISTRIBUTION BY VALUE RANGES:');
  const distribution = await db.execute(sql`
    SELECT
      CASE
        WHEN corrected_total::numeric < 100 THEN '$0 - $100'
        WHEN corrected_total::numeric < 500 THEN '$100 - $500'
        WHEN corrected_total::numeric < 1000 THEN '$500 - $1,000'
        WHEN corrected_total::numeric < 2500 THEN '$1,000 - $2,500'
        WHEN corrected_total::numeric < 5000 THEN '$2,500 - $5,000'
        WHEN corrected_total::numeric < 10000 THEN '$5,000 - $10,000'
        WHEN corrected_total::numeric < 50000 THEN '$10,000 - $50,000'
        ELSE '$50,000+'
      END as value_range,
      COUNT(*) as count,
      ROUND(AVG(corrected_total::numeric), 2) as avg_in_range,
      ROUND(SUM(corrected_total::numeric), 2) as total_in_range
    FROM receiving_vouchers
    GROUP BY value_range
    ORDER BY
      CASE
        WHEN value_range = '$0 - $100' THEN 1
        WHEN value_range = '$100 - $500' THEN 2
        WHEN value_range = '$500 - $1,000' THEN 3
        WHEN value_range = '$1,000 - $2,500' THEN 4
        WHEN value_range = '$2,500 - $5,000' THEN 5
        WHEN value_range = '$5,000 - $10,000' THEN 6
        WHEN value_range = '$10,000 - $50,000' THEN 7
        ELSE 8
      END
  `);

  console.table(distribution.rows);

  // 5. Statistical outliers (3 standard deviations from mean)
  console.log('\n\n5. STATISTICAL OUTLIERS (3σ from mean):');
  const outliers = await db.execute(sql`
    WITH stats AS (
      SELECT
        AVG(corrected_total::numeric) as mean,
        STDDEV(corrected_total::numeric) as std_dev
      FROM receiving_vouchers
    )
    SELECT
      v.id,
      v.voucher_number,
      v.date,
      v.store,
      v.vendor,
      v.corrected_total,
      v.total_qty,
      (SELECT COUNT(*) FROM receiving_lines WHERE voucher_id = v.id) as line_count,
      ROUND((v.corrected_total::numeric - s.mean) / s.std_dev, 2) as std_deviations
    FROM receiving_vouchers v, stats s
    WHERE ABS(v.corrected_total::numeric - s.mean) > (3 * s.std_dev)
    ORDER BY std_deviations DESC
  `);

  console.log(`Found ${outliers.rows.length} statistical outliers\n`);
  console.table(outliers.rows);

  // 6. Analyze by vendor (top 10 by total value)
  console.log('\n\n6. TOP 10 VENDORS BY RECEIVING VALUE:');
  const topVendors = await db.execute(sql`
    SELECT
      vendor,
      COUNT(*) as voucher_count,
      ROUND(SUM(corrected_total::numeric), 2) as total_received,
      ROUND(AVG(corrected_total::numeric), 2) as avg_voucher,
      ROUND(MAX(corrected_total::numeric), 2) as max_voucher
    FROM receiving_vouchers
    WHERE vendor IS NOT NULL
    GROUP BY vendor
    ORDER BY total_received DESC
    LIMIT 10
  `);

  console.table(topVendors.rows);

  // 7. Check JHDesign specifically
  console.log('\n\n7. ALL JHDESIGN VOUCHERS:');
  const jhdesign = await db.execute(sql`
    SELECT
      id,
      voucher_number,
      date,
      store,
      vendor,
      corrected_total,
      total_qty,
      (SELECT COUNT(*) FROM receiving_lines WHERE voucher_id = receiving_vouchers.id) as line_count
    FROM receiving_vouchers
    WHERE vendor ILIKE '%jhdesign%' OR vendor ILIKE '%jh design%'
    ORDER BY corrected_total::numeric DESC
  `);

  console.log(`Found ${jhdesign.rows.length} JHDesign vouchers\n`);
  console.table(jhdesign.rows);

  console.log('\n\n=== ANALYSIS COMPLETE ===');
  console.log('\n📊 SUMMARY:');
  console.log(`Total Vouchers: ${stats.rows[0].total_vouchers}`);
  console.log(`Average Voucher: $${Number(stats.rows[0].avg_total).toFixed(2)}`);
  console.log(`Median Voucher: $${Number(stats.rows[0].median_total).toFixed(2)}`);
  console.log(`Max Voucher: $${Number(stats.rows[0].max_total).toFixed(2)}`);
  console.log(`99th Percentile: $${Number(stats.rows[0].p99_total).toFixed(2)}`);
  console.log(`\nVouchers > $10,000: ${highValueVouchers.rows.length}`);
  console.log(`Statistical Outliers (3σ): ${outliers.rows.length}`);

  process.exit(0);
}

analyzeVoucherAnomalies().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});

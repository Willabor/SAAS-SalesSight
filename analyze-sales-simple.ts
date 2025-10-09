import { db } from './server/db';
import { sql } from 'drizzle-orm';

async function analyzeSalesSimple() {
  console.log('=== SALES DATA ANALYSIS ===\n');

  // 1. Database Sales Stats
  console.log('1. Database Sales Statistics:');
  const dbSalesStats = await db.execute(sql`
    SELECT
      COUNT(*) as total_transactions,
      SUM(CAST(price AS DECIMAL)) as total_revenue,
      AVG(CAST(price AS DECIMAL)) as avg_price,
      MIN(date) as earliest_date,
      MAX(date) as latest_date,
      COUNT(DISTINCT receipt_number) as unique_receipts,
      COUNT(DISTINCT sku) as unique_skus,
      COUNT(DISTINCT store) as unique_stores
    FROM sales_transactions
  `);

  const dbStats = dbSalesStats.rows[0];
  console.log(`   Total Transactions: ${dbStats.total_transactions}`);
  console.log(`   Total Revenue: $${Number(dbStats.total_revenue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  console.log(`   Average Price: $${Number(dbStats.avg_price).toFixed(2)}`);
  console.log(`   Date Range: ${dbStats.earliest_date} to ${dbStats.latest_date}`);
  console.log(`   Unique Receipts: ${dbStats.unique_receipts}`);
  console.log(`   Unique SKUs: ${dbStats.unique_skus}`);
  console.log(`   Unique Stores: ${dbStats.unique_stores}`);
  console.log('');

  // 2. Sales by Store
  console.log('2. Sales by Store:');
  const salesByStore = await db.execute(sql`
    SELECT
      store,
      COUNT(*) as transaction_count,
      SUM(CAST(price AS DECIMAL)) as total_revenue,
      AVG(CAST(price AS DECIMAL)) as avg_price
    FROM sales_transactions
    WHERE store IS NOT NULL
    GROUP BY store
    ORDER BY total_revenue DESC
  `);

  salesByStore.rows.forEach((row: any) => {
    console.log(`   ${row.store}: ${row.transaction_count} transactions, $${Number(row.total_revenue).toLocaleString('en-US', { minimumFractionDigits: 2 })} revenue`);
  });
  console.log('');

  // 3. Sales by Year
  console.log('3. Sales by Year:');
  const salesByYear = await db.execute(sql`
    SELECT
      EXTRACT(YEAR FROM date) as year,
      COUNT(*) as transaction_count,
      SUM(CAST(price AS DECIMAL)) as total_revenue
    FROM sales_transactions
    WHERE date IS NOT NULL
    GROUP BY EXTRACT(YEAR FROM date)
    ORDER BY year DESC
  `);

  salesByYear.rows.forEach((row: any) => {
    console.log(`   ${row.year}: ${row.transaction_count} transactions, $${Number(row.total_revenue).toLocaleString('en-US', { minimumFractionDigits: 2 })} revenue`);
  });
  console.log('');

  // 4. Recent Sample Transactions
  console.log('4. Sample Recent Transactions (last 10):');
  const sampleTransactions = await db.execute(sql`
    SELECT date, receipt_number, sku, price, store, item_name
    FROM sales_transactions
    ORDER BY date DESC, id DESC
    LIMIT 10
  `);

  sampleTransactions.rows.forEach((row: any, i: number) => {
    console.log(`   ${i + 1}. ${row.date} | Receipt: ${row.receipt_number} | SKU: ${row.sku} | $${row.price} | ${row.store}`);
  });
  console.log('');

  // 5. Upload History
  console.log('5. Sales Upload History (last 10):');
  const uploadHistory = await db.execute(sql`
    SELECT id, file_name, upload_mode, total_records, successful_records, failed_records, uploaded_at
    FROM upload_history
    WHERE upload_type = 'sales_transactions'
    ORDER BY uploaded_at DESC
    LIMIT 10
  `);

  if (uploadHistory.rows.length === 0) {
    console.log('   ⚠️  No sales upload history found!');
  } else {
    uploadHistory.rows.forEach((row: any) => {
      console.log(`   ${row.uploaded_at}: ${row.file_name}`);
      console.log(`      ${row.successful_records}/${row.total_records} successful, ${row.failed_records} failed`);
    });
  }
  console.log('');

  // 6. Top 10 Items by Revenue
  console.log('6. Top 10 Items by Revenue:');
  const topItems = await db.execute(sql`
    SELECT
      sku,
      item_name,
      COUNT(*) as times_sold,
      SUM(CAST(price AS DECIMAL)) as total_revenue
    FROM sales_transactions
    WHERE sku IS NOT NULL
    GROUP BY sku, item_name
    ORDER BY total_revenue DESC
    LIMIT 10
  `);

  topItems.rows.forEach((row: any, i: number) => {
    console.log(`   ${i + 1}. SKU: ${row.sku} - ${row.item_name}`);
    console.log(`      Sold ${row.times_sold} times for $${Number(row.total_revenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  });
  console.log('');

  // 7. Check for data quality issues
  console.log('7. Data Quality Checks:');

  const nullChecks = await db.execute(sql`
    SELECT
      COUNT(CASE WHEN date IS NULL THEN 1 END) as null_dates,
      COUNT(CASE WHEN store IS NULL THEN 1 END) as null_stores,
      COUNT(CASE WHEN sku IS NULL THEN 1 END) as null_skus,
      COUNT(CASE WHEN price IS NULL THEN 1 END) as null_prices,
      COUNT(CASE WHEN CAST(price AS DECIMAL) <= 0 THEN 1 END) as zero_or_negative_prices,
      COUNT(CASE WHEN CAST(price AS DECIMAL) > 10000 THEN 1 END) as suspiciously_high_prices
    FROM sales_transactions
  `);

  const qualityStats = nullChecks.rows[0];
  console.log(`   Null dates: ${qualityStats.null_dates}`);
  console.log(`   Null stores: ${qualityStats.null_stores}`);
  console.log(`   Null SKUs: ${qualityStats.null_skus}`);
  console.log(`   Null prices: ${qualityStats.null_prices}`);
  console.log(`   Zero/negative prices: ${qualityStats.zero_or_negative_prices}`);
  console.log(`   Suspiciously high prices (>$10k): ${qualityStats.suspiciously_high_prices}`);
  console.log('');

  console.log('=== SUMMARY ===');
  console.log(`Database contains ${dbStats.total_transactions} sales transactions`);
  console.log(`Total revenue: $${Number(dbStats.total_revenue).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`Date range: ${dbStats.earliest_date} to ${dbStats.latest_date} (${Math.ceil((new Date(dbStats.latest_date).getTime() - new Date(dbStats.earliest_date).getTime()) / (1000 * 60 * 60 * 24))} days)`);
}

analyzeSalesSimple()
  .then(() => {
    console.log('\n✓ Analysis complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error during analysis:', error);
    process.exit(1);
  });

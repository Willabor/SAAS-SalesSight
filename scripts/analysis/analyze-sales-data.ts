import { db } from './server/db';
import { sql } from 'drizzle-orm';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

async function analyzeSalesData() {
  console.log('=== ANALYZING SALES DATA ===\n');

  // 1. Read Sales Data from QuickBooks
  console.log('1. Reading QuickBooks Sales Data...');
  const salesWorkbook = XLSX.readFile('docs/Quickbooks POS Reports/Daily Sales per Transaction per store  (Google).xlsx');

  console.log(`   - Number of sheets: ${salesWorkbook.SheetNames.length}`);
  console.log(`   - Sheet names:`, salesWorkbook.SheetNames);
  console.log('');

  let qbTotalTransactions = 0;
  let qbTotalRevenue = 0;
  let qbEarliestDate: Date | null = null;
  let qbLatestDate: Date | null = null;

  // Process each sheet
  salesWorkbook.SheetNames.forEach((sheetName: string, index: number) => {
    const sheet = salesWorkbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

    console.log(`Sheet ${index + 1}: "${sheetName}"`);
    console.log(`   - Total rows: ${data.length}`);

    // Sample first few rows to understand structure
    if (index === 0) {
      console.log(`   - First 5 rows sample:`);
      data.slice(0, 5).forEach((row: any, i: number) => {
        console.log(`     Row ${i}:`, row);
      });
    }

    // Try to parse sales transactions
    let sheetTransactions = 0;
    let sheetRevenue = 0;

    data.forEach((row: any) => {
      // Look for rows that appear to be transaction line items
      // Typical structure has: Date, Receipt#, SKU, Item, Qty, Price, etc.
      if (Array.isArray(row) && row.length > 5) {
        // Try to identify a price column
        for (let i = 0; i < row.length; i++) {
          const val = row[i];
          if (typeof val === 'number' && val > 0 && val < 100000) {
            // Likely a price
            sheetTransactions++;
            sheetRevenue += val;
            break;
          } else if (typeof val === 'string' && val.match(/^\$?[\d,]+\.?\d*$/)) {
            // String representation of money
            const price = parseFloat(val.replace(/[$,]/g, ''));
            if (!isNaN(price)) {
              sheetTransactions++;
              sheetRevenue += price;
              break;
            }
          }
        }
      }
    });

    console.log(`   - Estimated transactions: ${sheetTransactions}`);
    console.log(`   - Estimated revenue: $${sheetRevenue.toFixed(2)}`);
    console.log('');

    qbTotalTransactions += sheetTransactions;
    qbTotalRevenue += sheetRevenue;
  });

  console.log('QuickBooks Sales Summary:');
  console.log(`   - Total transactions (estimated): ${qbTotalTransactions}`);
  console.log(`   - Total revenue (estimated): $${qbTotalRevenue.toFixed(2)}`);
  console.log('');

  // 2. Query database for Sales Data
  console.log('2. Querying database for Sales Data...');
  const dbSalesStats = await db.execute(sql`
    SELECT
      COUNT(*) as total_transactions,
      SUM(CAST(price AS DECIMAL)) as total_revenue,
      MIN(date) as earliest_date,
      MAX(date) as latest_date,
      COUNT(DISTINCT receipt_number) as unique_receipts,
      COUNT(DISTINCT sku) as unique_skus
    FROM sales_transactions
  `);

  const dbStats = dbSalesStats.rows[0];
  console.log('Database Sales Stats:');
  console.log(`   - Total transactions: ${dbStats.total_transactions}`);
  console.log(`   - Total revenue: $${Number(dbStats.total_revenue).toFixed(2)}`);
  console.log(`   - Date range: ${dbStats.earliest_date} to ${dbStats.latest_date}`);
  console.log(`   - Unique receipts: ${dbStats.unique_receipts}`);
  console.log(`   - Unique SKUs: ${dbStats.unique_skus}`);
  console.log('');

  // 3. Check sample transactions
  console.log('3. Checking sample transactions from database...');
  const sampleTransactions = await db.execute(sql`
    SELECT date, receipt_number, sku, price, store, item_name
    FROM sales_transactions
    ORDER BY date DESC
    LIMIT 10
  `);

  console.log('Recent 10 transactions:');
  sampleTransactions.rows.forEach((row: any, i: number) => {
    console.log(`   ${i + 1}. Date: ${row.date}, Receipt: ${row.receipt_number}, SKU: ${row.sku}, Price: $${row.price}, Store: ${row.store}`);
  });
  console.log('');

  // 4. Check upload history for sales
  console.log('4. Checking upload history for sales transactions...');
  const uploadHistory = await db.execute(sql`
    SELECT id, file_name, upload_mode, total_records, successful_records, failed_records, uploaded_at
    FROM upload_history
    WHERE upload_type = 'sales_transactions'
    ORDER BY uploaded_at DESC
    LIMIT 10
  `);

  console.log('Recent sales uploads:');
  uploadHistory.rows.forEach((row: any) => {
    console.log(`   - ${row.uploaded_at}: ${row.file_name} - ${row.successful_records}/${row.total_records} successful`);
  });
  console.log('');

  // 5. Comparison
  console.log('=== COMPARISON ===\n');
  console.log(`Database has ${dbStats.total_transactions} transactions totaling $${Number(dbStats.total_revenue).toFixed(2)}`);
  console.log(`Date range: ${dbStats.earliest_date} to ${dbStats.latest_date}`);
  console.log('');
  console.log('⚠️  NOTE: QuickBooks sales file has complex hierarchical structure.');
  console.log('    Accurate transaction count requires proper parsing of headers and line items.');
  console.log('    The database numbers are the authoritative source if data was uploaded correctly.');
}

analyzeSalesData()
  .then(() => {
    console.log('\n✓ Sales analysis complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error during analysis:', error);
    process.exit(1);
  });

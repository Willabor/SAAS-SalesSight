import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

async function calculateRawTotal() {
  console.log('=== CALCULATING RAW QUICKBOOKS RECEIVING TOTAL ===\n');

  const rawWorkbook = XLSX.readFile('docs/Quickbooks POS Reports/10-08-2025/Receiving History from 01-01-2019 till 10-08-2025 All Locations (GooG).xlsx');

  let grandTotal = 0;
  let voucherCount = 0;
  const sheetTotals: { [key: string]: { total: number; vouchers: number } } = {};

  for (const sheetName of rawWorkbook.SheetNames) {
    console.log(`\nProcessing sheet: "${sheetName}"`);

    const sheet = rawWorkbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

    console.log(`  Total rows: ${data.length}`);

    // Column 13 is "Total" (the cost column)
    // Column 1 is "Date"
    // Voucher header rows have a Date value in column 1
    // Line item rows have empty column 1

    let sheetTotal = 0;
    let sheetVouchers = 0;

    for (let i = 6; i < data.length; i++) { // Start from row 6 (first data row after header)
      const row = data[i] as any[];
      if (!row || row.length === 0) continue;

      const dateValue = row[1]; // Column 1 is Date
      const totalValue = row[13]; // Column 13 is Total

      // If row has a date, it's a voucher header row
      if (dateValue && dateValue !== '') {
        const cost = Number(String(totalValue || '0').replace(/[$,]/g, ''));
        if (!isNaN(cost) && cost > 0) {
          sheetTotal += cost;
          sheetVouchers++;
          grandTotal += cost;
          voucherCount++;
        }
      }
    }

    console.log(`  Vouchers: ${sheetVouchers}`);
    console.log(`  Total: $${sheetTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

    sheetTotals[sheetName] = { total: sheetTotal, vouchers: sheetVouchers };
  }

  console.log('\n\n=== RAW FILE SUMMARY ===\n');
  console.log('Per Sheet:');
  for (const [name, data] of Object.entries(sheetTotals)) {
    console.log(`  ${name}:`);
    console.log(`    Vouchers: ${data.vouchers}`);
    console.log(`    Total: $${data.total.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  }

  console.log(`\n\nGRAND TOTAL FROM RAW FILE:`);
  console.log(`  Total vouchers: ${voucherCount}`);
  console.log(`  Total cost: $${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`\nQuickBooks reported: $6,293,009.48`);
  console.log(`Calculated from raw: $${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`Difference: $${(grandTotal - 6293009.48).toLocaleString('en-US', { minimumFractionDigits: 2, signDisplay: 'always' })}`);

  // Now check formatted file
  console.log('\n\n=== FORMATTED FILE ===\n');

  const formattedWorkbook = XLSX.readFile('docs/Quickbooks POS Reports/10-08-2025/formatted_preview.xlsx');
  const formattedSheet = formattedWorkbook.Sheets[formattedWorkbook.SheetNames[0]];
  const formattedData = XLSX.utils.sheet_to_json(formattedSheet, { header: 1, raw: false });

  // Headers: Date | Store | Voucher # | Item # | Item Name | Qty | cost | Type | Vendor | Total Qty | Total cost | Time
  // Column 10 is "Total cost"

  let formattedTotal = 0;
  let formattedLineCount = 0;

  for (let i = 1; i < formattedData.length; i++) {
    const row = formattedData[i] as any[];
    if (!row || row.length === 0) continue;

    const totalCostValue = row[10]; // Column 10 is "Total cost"

    if (totalCostValue !== null && totalCostValue !== undefined && totalCostValue !== '') {
      const cost = Number(String(totalCostValue).replace(/[$,]/g, ''));
      if (!isNaN(cost) && cost > 0 && cost < 1000000) { // Exclude total row
        formattedTotal += cost;
        formattedLineCount++;
      }
    }
  }

  console.log(`Total rows: ${formattedData.length}`);
  console.log(`Lines with cost (excluding total row): ${formattedLineCount}`);
  console.log(`Calculated total: $${formattedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

  console.log('\n\n=== THE MYSTERY REVEALED ===\n');
  console.log(`QuickBooks reported:      $6,293,009.48`);
  console.log(`Raw file calculated:      $${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`Formatted file calculated: $${formattedTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`Formatted total row:      $6,307,010.90`);

  console.log(`\n--- Key Discrepancies ---`);
  console.log(`Raw vs QuickBooks:        $${(grandTotal - 6293009.48).toLocaleString('en-US', { minimumFractionDigits: 2, signDisplay: 'always' })}`);
  console.log(`Formatted vs QuickBooks:  $${(formattedTotal - 6293009.48).toLocaleString('en-US', { minimumFractionDigits: 2, signDisplay: 'always' })}`);
  console.log(`Formatted vs Raw:         $${(formattedTotal - grandTotal).toLocaleString('en-US', { minimumFractionDigits: 2, signDisplay: 'always' })}`);
  console.log(`\nTHE $14,001.42 QUESTION:  $${(6307010.90 - 6293009.48).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

  if (Math.abs(formattedTotal - grandTotal) > 1) {
    console.log(`\n⚠️  FOUND IT! Formatted file has $${(formattedTotal - grandTotal).toLocaleString('en-US', { minimumFractionDigits: 2, signDisplay: 'always' })} vs raw file!`);
  }
}

calculateRawTotal()
  .then(() => {
    console.log('\n✓ Calculation complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });

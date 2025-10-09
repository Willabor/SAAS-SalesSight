import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

async function investigateDiscrepancy() {
  console.log('=== INVESTIGATING $14,001.42 DISCREPANCY ===\n');

  // 1. READ RAW QUICKBOOKS FILE
  console.log('1. Reading RAW QuickBooks file...\n');
  const rawWorkbook = XLSX.readFile('docs/Quickbooks POS Reports/10-08-2025/Receiving History from 01-01-2019 till 10-08-2025 All Locations (GooG).xlsx');

  console.log(`Sheets in raw file: ${rawWorkbook.SheetNames.join(', ')}\n`);

  // 2. SUM ALL COSTS FROM RAW FILE (ALL SHEETS)
  let rawTotalCost = 0;
  let rawLineCount = 0;
  const sheetTotals: { [key: string]: { cost: number; lines: number } } = {};

  for (const sheetName of rawWorkbook.SheetNames) {
    const sheet = rawWorkbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

    // Get headers from first non-empty row
    let headers: any[] = [];
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i] as any[];
      if (row && row.some(c => c)) {
        headers = row;
        break;
      }
    }

    // Find "Total" or "Cost" column
    let costColIndex = -1;
    for (let i = 0; i < headers.length; i++) {
      const header = String(headers[i] || '').toLowerCase();
      if (header.includes('total') && !header.includes('qty')) {
        costColIndex = i;
        break;
      }
    }

    if (costColIndex === -1) {
      // Try to find any numeric column that looks like cost
      for (let i = 0; i < headers.length; i++) {
        const header = String(headers[i] || '').toLowerCase();
        if (header.includes('cost') || header.includes('amount')) {
          costColIndex = i;
          break;
        }
      }
    }

    console.log(`Sheet: "${sheetName}"`);
    console.log(`  Total rows: ${data.length}`);
    console.log(`  Cost column index: ${costColIndex} (${headers[costColIndex] || 'N/A'})`);

    let sheetTotal = 0;
    let sheetLines = 0;

    if (costColIndex >= 0) {
      for (let i = 1; i < data.length; i++) {
        const row = data[i] as any[];
        if (!row || row.length === 0) continue;

        const costValue = row[costColIndex];
        if (costValue !== null && costValue !== undefined && costValue !== '') {
          const cost = Number(String(costValue).replace(/[$,]/g, ''));
          if (!isNaN(cost) && cost > 0 && cost < 1000000) {
            sheetTotal += cost;
            sheetLines++;
          }
        }
      }
    }

    console.log(`  Lines with cost: ${sheetLines}`);
    console.log(`  Sheet total: $${sheetTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}\n`);

    sheetTotals[sheetName] = { cost: sheetTotal, lines: sheetLines };
    rawTotalCost += sheetTotal;
    rawLineCount += sheetLines;
  }

  console.log('=== RAW FILE SUMMARY ===');
  console.log(`Total lines with cost: ${rawLineCount}`);
  console.log(`Calculated total cost: $${rawTotalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`QuickBooks reported: $6,293,009.48`);
  console.log(`Difference: $${(rawTotalCost - 6293009.48).toLocaleString('en-US', { minimumFractionDigits: 2 })}\n\n`);

  // 3. READ FORMATTED FILE
  console.log('2. Reading FORMATTED file...\n');
  const formattedWorkbook = XLSX.readFile('docs/Quickbooks POS Reports/10-08-2025/formatted_preview.xlsx');

  const formattedSheet = formattedWorkbook.Sheets[formattedWorkbook.SheetNames[0]];
  const formattedData = XLSX.utils.sheet_to_json(formattedSheet, { header: 1, raw: false });

  // Find cost column in formatted file
  const formattedHeaders = formattedData[0] as any[];
  let formattedCostColIndex = -1;

  for (let i = 0; i < formattedHeaders.length; i++) {
    const header = String(formattedHeaders[i] || '').toLowerCase();
    if (header.includes('total') && header.includes('cost')) {
      formattedCostColIndex = i;
      break;
    }
  }

  console.log(`Formatted file:`);
  console.log(`  Total rows: ${formattedData.length}`);
  console.log(`  Cost column index: ${formattedCostColIndex} (${formattedHeaders[formattedCostColIndex] || 'N/A'})\n`);

  let formattedTotalCost = 0;
  let formattedLineCount = 0;
  let lastRowWithCost = -1;

  for (let i = 1; i < formattedData.length; i++) {
    const row = formattedData[i] as any[];
    if (!row || row.length === 0) continue;

    const costValue = row[formattedCostColIndex];
    if (costValue !== null && costValue !== undefined && costValue !== '') {
      const cost = Number(String(costValue).replace(/[$,]/g, ''));
      if (!isNaN(cost) && cost > 0) {
        if (cost < 1000000) { // Exclude the total row
          formattedTotalCost += cost;
          formattedLineCount++;
          lastRowWithCost = i;
        } else {
          console.log(`  ⚠️  Row ${i} has very high cost: $${cost.toLocaleString('en-US', { minimumFractionDigits: 2 })} (likely total row)`);
        }
      }
    }
  }

  console.log(`Lines with cost (excluding total row): ${formattedLineCount}`);
  console.log(`Calculated total cost: $${formattedTotalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`Last row with cost: Row ${lastRowWithCost}\n\n`);

  // 4. COMPARISON
  console.log('=== COMPARISON ===\n');
  console.log(`QuickBooks reported total:    $6,293,009.48`);
  console.log(`Raw file calculated sum:      $${rawTotalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`Formatted file calculated sum: $${formattedTotalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`Formatted file total row:     $6,307,010.90\n`);

  console.log(`Discrepancy 1 (Raw vs QB):       $${(rawTotalCost - 6293009.48).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`Discrepancy 2 (Formatted vs QB): $${(formattedTotalCost - 6293009.48).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`Discrepancy 3 (Formatted vs Raw): $${(formattedTotalCost - rawTotalCost).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
  console.log(`\nTHE $14,001.42 MYSTERY:          $${(6307010.90 - 6293009.48).toLocaleString('en-US', { minimumFractionDigits: 2 })}`);

  // 5. CHECK FOR DUPLICATES OR EXTRA ROWS
  console.log('\n\n=== CHECKING FOR DUPLICATES ===\n');
  console.log(`Raw file lines: ${rawLineCount}`);
  console.log(`Formatted file lines: ${formattedLineCount}`);
  console.log(`Difference: ${formattedLineCount - rawLineCount} lines`);

  if (formattedLineCount > rawLineCount) {
    console.log(`\n⚠️  Formatted file has ${formattedLineCount - rawLineCount} MORE lines than raw file!`);
    console.log(`This could be the source of the discrepancy.`);
  }
}

investigateDiscrepancy()
  .then(() => {
    console.log('\n✓ Investigation complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });

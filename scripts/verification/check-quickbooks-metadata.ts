import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

async function checkMetadata() {
  console.log('=== CHECKING QUICKBOOKS FILE METADATA ===\n');

  const rawWorkbook = XLSX.readFile('docs/Quickbooks POS Reports/10-08-2025/Receiving History from 01-01-2019 till 10-08-2025 All Locations (GooG).xlsx');

  console.log('Sheet names:', rawWorkbook.SheetNames.join(', '));
  console.log('');

  // Check FIRST sheet - look at ALL rows including headers
  const firstSheetName = rawWorkbook.SheetNames[0];
  console.log(`\nChecking FIRST sheet: "${firstSheetName}"\n`);

  const sheet = rawWorkbook.Sheets[firstSheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

  console.log('FIRST 10 ROWS (might contain report info):\n');

  for (let i = 0; i < Math.min(10, data.length); i++) {
    const row = data[i] as any[];
    if (row && row.some(c => c)) {
      console.log(`Row ${i}:`);
      row.forEach((cell, idx) => {
        if (cell !== null && cell !== undefined && cell !== '') {
          console.log(`  [${idx}]: ${cell}`);
        }
      });
      console.log('');
    }
  }

  // Check if there's a "Grand Total" row at the bottom
  console.log('\n\nLAST 30 ROWS (might contain totals):\n');

  for (let i = Math.max(0, data.length - 30); i < data.length; i++) {
    const row = data[i] as any[];
    if (!row) continue;

    const hasContent = row.some(c => c !== null && c !== undefined && c !== '');
    if (hasContent) {
      const rowText = row.map((c, idx) => {
        if (c !== null && c !== undefined && c !== '') {
          return `[${idx}]${c}`;
        }
        return null;
      }).filter(Boolean).join(' | ');

      // Check if this looks like a total row
      const containsTotal = row.some(c =>
        c && String(c).toLowerCase().includes('total') ||
        String(c).toLowerCase().includes('grand')
      );

      if (containsTotal || i >= data.length - 5) {
        console.log(`Row ${i}: ${rowText}`);
      }
    }
  }

  // Look for specific values
  console.log('\n\n=== SEARCHING FOR QUICKBOOKS REPORTED TOTAL ($6,293,009.48) ===\n');

  for (let i = 0; i < data.length; i++) {
    const row = data[i] as any[];
    if (!row) continue;

    for (let j = 0; j < row.length; j++) {
      const cell = row[j];
      if (cell !== null && cell !== undefined) {
        const val = Number(String(cell).replace(/[$,]/g, ''));

        if (!isNaN(val) && Math.abs(val - 6293009.48) < 1) {
          console.log(`⚠️  FOUND at Row ${i}, Column ${j}`);
          console.log(`   Value: ${cell}`);
          console.log(`   Context: [${row.slice(Math.max(0, j - 2), j + 3).join(' | ')}]`);
        }
      }
    }
  }

  // Check ALL sheets for this value
  console.log('\n\nChecking ALL sheets for $6,293,009.48...\n');

  for (const sheetName of rawWorkbook.SheetNames) {
    const sheet = rawWorkbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

    for (let i = 0; i < data.length; i++) {
      const row = data[i] as any[];
      if (!row) continue;

      for (let j = 0; j < row.length; j++) {
        const cell = row[j];
        if (cell !== null && cell !== undefined) {
          const val = Number(String(cell).replace(/[$,]/g, ''));

          if (!isNaN(val) && Math.abs(val - 6293009.48) < 1) {
            console.log(`⚠️  FOUND in sheet "${sheetName}" at Row ${i}, Column ${j}`);
            console.log(`   Value: ${cell}`);
          }
        }
      }
    }
  }

  console.log('\n\n=== CHECKING FOR FILTERS OR REPORT CRITERIA ===\n');

  // Look in first few rows for keywords
  for (let i = 0; i < Math.min(15, data.length); i++) {
    const row = data[i] as any[];
    if (!row) continue;

    const rowText = row.join(' ').toLowerCase();

    if (rowText.includes('filter') ||
        rowText.includes('criteria') ||
        rowText.includes('exclude') ||
        rowText.includes('include only') ||
        rowText.includes('where') ||
        rowText.includes('type:')) {
      console.log(`Row ${i} (potential filter info):`);
      console.log(`  ${row.filter(c => c).join(' | ')}`);
      console.log('');
    }
  }
}

checkMetadata()
  .then(() => {
    console.log('\n✓ Metadata check complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });

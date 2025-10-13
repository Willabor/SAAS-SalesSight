import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

async function inspectRawStructure() {
  console.log('=== INSPECTING RAW QUICKBOOKS FILE STRUCTURE ===\n');

  const rawWorkbook = XLSX.readFile('docs/Quickbooks POS Reports/10-08-2025/Receiving History from 01-01-2019 till 10-08-2025 All Locations (GooG).xlsx');

  // Check FIRST sheet (most recent chronologically)
  const firstSheetName = rawWorkbook.SheetNames[0];
  console.log(`Checking first sheet: "${firstSheetName}"\n`);

  const firstSheet = rawWorkbook.Sheets[firstSheetName];
  const firstData = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false });

  console.log('First 20 rows of first sheet:\n');
  for (let i = 0; i < Math.min(20, firstData.length); i++) {
    const row = firstData[i] as any[];
    const hasContent = row && row.filter((c: any) => c !== null && c !== undefined && c !== '').length > 0;
    if (hasContent) {
      console.log(`Row ${i}: [${row.slice(0, 15).map((v: any) => String(v || '').substring(0, 20)).join(' | ')}]`);
    }
  }

  // Try to identify headers by looking for common patterns
  console.log('\n\nLooking for header row...\n');
  for (let i = 0; i < Math.min(10, firstData.length); i++) {
    const row = firstData[i] as any[];
    if (row && row.length > 5) {
      const cellCount = row.filter((c: any) => c !== null && c !== undefined && c !== '').length;
      const textCount = row.filter((c: any) => typeof c === 'string' && c.length > 2).length;

      if (textCount > 3 && cellCount > 5) {
        console.log(`Potential header row ${i}:`);
        console.log(`  Columns (${row.length}): ${row.map((v: any, idx: number) => `[${idx}]${v || 'empty'}`).join(', ')}`);
      }
    }
  }

  // Check a few sample data rows
  console.log('\n\nSample data rows (rows 10-20):\n');
  for (let i = 10; i < Math.min(20, firstData.length); i++) {
    const row = firstData[i] as any[];
    if (row && row.filter((c: any) => c !== null && c !== undefined && c !== '').length > 0) {
      console.log(`Row ${i}:`);
      for (let j = 0; j < Math.min(15, row.length); j++) {
        if (row[j] !== null && row[j] !== undefined && row[j] !== '') {
          console.log(`  [${j}]: ${row[j]}`);
        }
      }
      console.log('');
    }
  }

  // Also check LAST sheet (oldest chronologically)
  console.log('\n\n=== CHECKING LAST SHEET ===\n');
  const lastSheetName = rawWorkbook.SheetNames[rawWorkbook.SheetNames.length - 1];
  console.log(`Checking last sheet: "${lastSheetName}"\n`);

  const lastSheet = rawWorkbook.Sheets[lastSheetName];
  const lastData = XLSX.utils.sheet_to_json(lastSheet, { header: 1, raw: false });

  console.log('First 20 rows of last sheet:\n');
  for (let i = 0; i < Math.min(20, lastData.length); i++) {
    const row = lastData[i] as any[];
    const hasContent = row && row.filter((c: any) => c !== null && c !== undefined && c !== '').length > 0;
    if (hasContent) {
      console.log(`Row ${i}: [${row.slice(0, 15).map((v: any) => String(v || '').substring(0, 20)).join(' | ')}]`);
    }
  }
}

inspectRawStructure()
  .then(() => {
    console.log('\n✓ Inspection complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });

import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

async function analyzeFormattedReceiving() {
  console.log('=== ANALYZING FORMATTED RECEIVING FILE ===\n');

  const workbook = XLSX.readFile('docs/Quickbooks POS Reports/10-08-2025/formatted_preview.xlsx');

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');

  console.log(`Total rows: ${range.e.r + 1}`);
  console.log(`Total columns: ${range.e.c + 1}\n`);

  // Get headers
  const headers: string[] = [];
  for (let c = 0; c <= range.e.c; c++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c });
    headers.push(sheet[addr]?.v || `Column ${c}`);
  }

  console.log('Headers:', headers.join(' | '));
  console.log('');

  // Get last 20 rows
  console.log('Last 20 rows:\n');
  for (let r = Math.max(1, range.e.r - 19); r <= range.e.r; r++) {
    const row: string[] = [];
    for (let c = 0; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const val = sheet[addr]?.v;
      row.push(val !== undefined && val !== null ? String(val).substring(0, 15) : '');
    }
    console.log(`Row ${r}: [${row.join(' | ')}]`);
  }

  // Find "Total cost" column and sum it
  const totalCostColIndex = headers.findIndex(h => h.toLowerCase().includes('total') && h.toLowerCase().includes('cost'));
  console.log(`\n\nTotal cost column index: ${totalCostColIndex} (${headers[totalCostColIndex]})`);

  if (totalCostColIndex >= 0) {
    let sum = 0;
    let count = 0;
    let lastNonZeroRow = 0;

    for (let r = 1; r <= range.e.r; r++) {
      const addr = XLSX.utils.encode_cell({ r, c: totalCostColIndex });
      const val = sheet[addr]?.v;

      if (val !== undefined && val !== null) {
        const num = Number(val);
        if (!isNaN(num) && num !== 0) {
          sum += num;
          count++;
          lastNonZeroRow = r;
        }
      }
    }

    console.log(`\nSum of Total cost column: $${sum.toLocaleString('en-US', { minimumFractionDigits: 2 })}`);
    console.log(`Rows with non-zero cost: ${count}`);
    console.log(`Last non-zero row: ${lastNonZeroRow}`);
    console.log('');
    console.log(`User reported: $6,307,010.90`);
    console.log(`Match? ${Math.abs(sum - 6307010.90) < 1 ? 'YES ✓' : 'NO'}`);

    // Check last 10 rows with cost
    console.log('\n\nLast 10 rows WITH cost:');
    let found = 0;
    for (let r = range.e.r; r >= 1 && found < 10; r--) {
      const addr = XLSX.utils.encode_cell({ r, c: totalCostColIndex });
      const val = sheet[addr]?.v;

      if (val !== undefined && val !== null) {
        const num = Number(val);
        if (!isNaN(num) && num !== 0) {
          const row: string[] = [];
          for (let c = 0; c <= Math.min(range.e.c, 10); c++) {
            const cellAddr = XLSX.utils.encode_cell({ r, c });
            const cellVal = sheet[cellAddr]?.v;
            row.push(cellVal !== undefined && cellVal !== null ? String(cellVal).substring(0, 15) : '');
          }
          console.log(`Row ${r}: [${row.join(' | ')}] = $${num}`);
          found++;
        }
      }
    }
  }
}

analyzeFormattedReceiving()
  .then(() => {
    console.log('\n✓ Analysis complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });

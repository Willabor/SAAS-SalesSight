import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

async function checkFormula() {
  console.log('=== CHECKING FOR FORMULA IN FORMATTED FILE ===\n');

  const formattedWorkbook = XLSX.readFile('docs/Quickbooks POS Reports/10-08-2025/formatted_preview.xlsx');
  const formattedSheet = formattedWorkbook.Sheets[formattedWorkbook.SheetNames[0]];

  // Check cell K284604 (column 10, row 284603)
  const targetAddr = 'K284604'; // Column K is index 10

  console.log(`Checking cell ${targetAddr} (the total row cell):\n`);

  const cell = formattedSheet[targetAddr];

  if (cell) {
    console.log(`Cell found:`);
    console.log(`  Type: ${cell.t}`);
    console.log(`  Value: ${cell.v}`);
    console.log(`  Formula: ${cell.f || 'NONE'}`);
    console.log(`  Full cell object: ${JSON.stringify(cell, null, 2)}`);
  } else {
    console.log(`Cell ${targetAddr} does NOT exist!`);
  }

  // Check all cells in row 284603
  console.log('\n\n=== ALL CELLS IN ROW 284603 ===\n');

  const rowIndex = 284603;

  for (let c = 0; c <= 20; c++) {
    const addr = XLSX.utils.encode_cell({ r: rowIndex, c });
    const cell = formattedSheet[addr];

    if (cell) {
      console.log(`Column ${c} (${addr}):`);
      console.log(`  Value: ${cell.v}`);
      console.log(`  Type: ${cell.t}`);
      if (cell.f) console.log(`  Formula: ${cell.f}`);
      console.log('');
    }
  }

  // Check if there are any formulas in the entire sheet
  console.log('\n=== SEARCHING FOR ANY FORMULAS IN FORMATTED FILE ===\n');

  const range = XLSX.utils.decode_range(formattedSheet['!ref'] || 'A1');
  let formulaCount = 0;

  for (let r = 0; r <= range.e.r; r++) {
    for (let c = 0; c <= range.e.c; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = formattedSheet[addr];

      if (cell && cell.f) {
        formulaCount++;
        if (formulaCount <= 10) { // Only show first 10
          console.log(`  ${addr}: ${cell.f} = ${cell.v}`);
        }
      }
    }
  }

  console.log(`\nTotal formulas found: ${formulaCount}`);
}

checkFormula()
  .then(() => {
    console.log('\n✓ Check complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });

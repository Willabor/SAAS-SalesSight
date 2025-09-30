import * as XLSX from 'xlsx';

export async function processExcelFile(file: File): Promise<XLSX.WorkBook> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        resolve(workbook);
      } catch (error) {
        reject(new Error('Failed to parse Excel file'));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

export function processWorkbook(workbook: XLSX.WorkBook, type: 'item-list' | 'sales-transactions'): any[] {
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  if (!worksheet) {
    throw new Error('No worksheet found in Excel file');
  }
  
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  if (data.length < 2) {
    throw new Error('Excel file must contain at least a header row and one data row');
  }
  
  const headers = data[0] as string[];
  const rows = data.slice(1) as any[][];
  
  // Convert rows to objects based on headers
  const processedData = rows
    .filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''))
    .map((row, index) => {
      const obj: any = {};
      headers.forEach((header, i) => {
        if (header && row[i] !== undefined && row[i] !== null) {
          // Clean up header names
          const cleanHeader = header.toString().trim();
          obj[cleanHeader] = row[i];
        }
      });
      return obj;
    });
  
  if (type === 'item-list') {
    return validateItemListData(processedData);
  } else {
    return validateSalesTransactionData(processedData);
  }
}

function validateItemListData(data: any[]): any[] {
  const requiredFields = ['item_number', 'vendor_name', 'item_name'];
  
  return data.map((item, index) => {
    const normalizedItem: any = {};
    
    // Map the actual Excel headers to expected database field names
    const headerMappings: { [key: string]: string } = {
      'Item #': 'item_number',
      'item #': 'item_number',
      'Vendor Name': 'vendor_name',
      'vendor name': 'vendor_name',
      'Item Name': 'item_name',
      'item name': 'item_name',
      'Category': 'category',
      'category': 'category',
      'Gender': 'gender',
      'gender': 'gender',
      'Avail Qty': 'avail_qty',
      'avail qty': 'avail_qty',
      'HQ Qty': 'hq_qty',
      'hq qty': 'hq_qty',
      'GM Qty': 'gm_qty',
      'gm qty': 'gm_qty',
      'HM Qty': 'hm_qty',
      'hm qty': 'hm_qty',
      'MM Qty': 'mm_qty',
      'mm qty': 'mm_qty',
      'NM Qty': 'nm_qty',
      'nm qty': 'nm_qty',
      'PM Qty': 'pm_qty',
      'pm qty': 'pm_qty',
      'LM Qty': 'lm_qty',
      'lm qty': 'lm_qty',
      'Last Rcvd': 'last_rcvd',
      'last rcvd': 'last_rcvd',
      'Creation Date': 'creation_date',
      'creation date': 'creation_date',
      'Last Sold': 'last_sold',
      'last sold': 'last_sold',
      'Style Number': 'style_number',
      'style number': 'style_number',
      'Style Number 2': 'style_number_2',
      'style number 2': 'style_number_2',
      'Order Cost': 'order_cost',
      'order cost': 'order_cost',
      'Selling Price': 'selling_price',
      'selling price': 'selling_price',
      'Notes': 'notes',
      'notes': 'notes',
      'Size': 'size',
      'size': 'size',
      'Attribute': 'attribute',
      'attribute': 'attribute'
    };
    
    // Process each field in the original item
    Object.keys(item).forEach(originalKey => {
      const trimmedKey = originalKey.trim();
      const mappedKey = headerMappings[trimmedKey] || headerMappings[trimmedKey.toLowerCase()];
      
      if (mappedKey) {
        normalizedItem[mappedKey] = item[originalKey];
      } else {
        // Fallback: normalize field names to snake_case
        const normalizedKey = trimmedKey.toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_]/g, '');
        normalizedItem[normalizedKey] = item[originalKey];
      }
    });
    
    // Style Number 2 is already handled in the header mappings
    
    // Validate required fields
    for (const field of requiredFields) {
      if (!normalizedItem[field] || normalizedItem[field] === '') {
        throw new Error(`Row ${index + 1}: Missing required field '${field}' (mapped from Excel headers)`);
      }
    }
    
    return normalizedItem;
  });
}

function validateSalesTransactionData(data: any[]): any[] {
  const requiredFields = ['Date', 'Store', 'Receipt #', 'SKU', 'Item Name', 'Price'];
  
  return data.map((transaction, index) => {
    // Check for required fields
    for (const field of requiredFields) {
      const fieldVariations = [
        field,
        field.toLowerCase(),
        field.replace(/\s+/g, '_'),
        field.replace(/\s+/g, ''),
      ];
      
      let found = false;
      for (const variation of fieldVariations) {
        if (transaction[variation] !== undefined && transaction[variation] !== null && transaction[variation] !== '') {
          found = true;
          break;
        }
      }
      
      if (!found) {
        throw new Error(`Row ${index + 1}: Missing required field '${field}'`);
      }
    }
    
    // Validate price is numeric
    const price = transaction.Price || transaction.price;
    if (price && isNaN(parseFloat(price.toString()))) {
      throw new Error(`Row ${index + 1}: Invalid price format '${price}'`);
    }
    
    return transaction;
  });
}

// ===== Receiving History Processing =====

export interface ReceivingProcessingStats {
  sheetsProcessed: number;
  rowsDeleted: number;
  totalRows: number;
  sheetNames: string[];
}

export interface ReceivingVoucher {
  date: string;
  store: string;
  voucherNumber: string;
  type: string;
  vendor: string;
  totalQty: number;
  qbTotal: number;
  correctedTotal: number;
  time: string;
  lines: ReceivingLine[];
}

export interface ReceivingLine {
  itemNumber: string;
  itemName: string;
  qty: number;
  cost: number;
}

/**
 * Step 1: Format & Consolidate
 * - Consolidate multiple sheets in REVERSE order
 * - Delete top 5 rows from each sheet
 * - Delete alternating columns (A, C, E, G, I, K, M, O)
 * - Insert 4 empty columns after Voucher #
 * - Add headers for new columns
 */
export async function formatReceivingFile(file: File, onProgress?: (status: string) => void): Promise<{
  workbook: XLSX.WorkBook;
  stats: ReceivingProcessingStats;
}> {
  try {
    onProgress?.('Reading file...');
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { cellDates: true, cellStyles: true });
    
    onProgress?.('Formatting and consolidating sheets...');
    const processedSheets: string[] = [];
    let totalRowsDeleted = 0;
    const consolidatedSheet: XLSX.WorkSheet = {};
    let currentRowIndex = 0;
    let maxCol = 0;
    
    // Reverse the sheet order to process in correct chronological order
    const sheetsInOrder = [...workbook.SheetNames].reverse();
    
    // Process each sheet in reverse order
    sheetsInOrder.forEach((sheetName, sheetIdx) => {
      if (!/^Receiving Voucher Detail/i.test(sheetName)) return;
      
      const worksheet = workbook.Sheets[sheetName];
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      
      totalRowsDeleted += 5;
      
      // Delete top 5 rows and alternating columns in one pass
      const colMap: { [key: number]: number } = {};
      let newCol = 0;
      for (let oldCol = 0; oldCol <= range.e.c; oldCol++) {
        // Keep columns that are NOT in positions 0, 2, 4, 6, 8, 10, 12, 14 (alternating)
        if (![0, 2, 4, 6, 8, 10, 12, 14].includes(oldCol)) {
          colMap[oldCol] = newCol++;
        }
      }
      
      maxCol = Math.max(maxCol, newCol - 1);
      
      for (let R = range.s.r + 5; R <= range.e.r; R++) {
        const localRow = R - (range.s.r + 5);
        
        // Skip header row on subsequent sheets
        if (sheetIdx > 0 && localRow === 0) continue;
        
        for (let C = range.s.c; C <= range.e.c; C++) {
          if (colMap[C] !== undefined) {
            const oldAddr = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = worksheet[oldAddr];
            
            if (cell) {
              let targetCol = colMap[C];
              
              // Insert 4 empty columns after Voucher # (column 2)
              if (targetCol >= 3) {
                targetCol += 4;
              }
              
              const newAddr = XLSX.utils.encode_cell({ r: currentRowIndex, c: targetCol });
              consolidatedSheet[newAddr] = cell;
            }
          }
        }
        currentRowIndex++;
      }
      
      processedSheets.push(sheetName);
    });
    
    // Update maxCol to account for the 4 new columns
    maxCol += 4;
    
    // Add headers for the new columns
    consolidatedSheet['D1'] = { t: 's', v: 'Item #' };
    consolidatedSheet['E1'] = { t: 's', v: 'Item Name' };
    consolidatedSheet['F1'] = { t: 's', v: 'Qty' };
    consolidatedSheet['G1'] = { t: 's', v: 'cost' };
    
    // Update "Total" header to "Total cost"
    consolidatedSheet['K1'] = { t: 's', v: 'Total cost' };
    
    // Set the range
    consolidatedSheet['!ref'] = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: currentRowIndex - 1, c: maxCol }
    });
    
    // Create new workbook
    const newWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWorkbook, consolidatedSheet, 'Consolidated Receiving Data');
    
    const stats: ReceivingProcessingStats = {
      sheetsProcessed: processedSheets.length,
      rowsDeleted: totalRowsDeleted,
      sheetNames: processedSheets,
      totalRows: currentRowIndex
    };
    
    return { workbook: newWorkbook, stats };
  } catch (error) {
    console.error('Formatting error:', error);
    throw new Error(`Failed to format file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Step 2: Flatten
 * - Parse hierarchical voucher structure
 * - Handle QuickBooks bug (incorrect totals)
 * - Handle negative quantities (reversals)
 * - Calculate corrected totals
 */
export async function flattenReceivingData(workbook: XLSX.WorkBook, onProgress?: (status: string, percentage?: number) => void): Promise<{
  vouchers: ReceivingVoucher[];
  stats: {
    totalVouchers: number;
    totalLines: number;
    totalCost: number;
    uniqueVendors: number;
    uniqueStores: number;
    qbMismatchCount: number;
  };
}> {
  try {
    onProgress?.('Flattening voucher data from consolidated sheet...', 0);
    
    const allVouchers: ReceivingVoucher[] = [];
    let currentVoucher: ReceivingVoucher | null = null;
    
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    const totalRows = range.e.r;
    
    for (let row = 1; row <= range.e.r; row++) {
      // Report progress every 50 rows to avoid too many updates
      if (row % 50 === 0 || row === range.e.r) {
        const percentage = Math.round((row / totalRows) * 100);
        onProgress?.(`Processing row ${row} of ${totalRows}...`, percentage);
      }
      const getCell = (col: number) => {
        const addr = XLSX.utils.encode_cell({ r: row, c: col });
        return sheet[addr]?.v;
      };
      
      const A = getCell(0); // Date
      const B = getCell(1); // Store or Item #
      const C = getCell(2); // Voucher # or Item Name
      const H = getCell(7); // Type or Qty
      const I = getCell(8); // Vendor or Unit Cost
      const J = getCell(9); // Total Qty
      const K = getCell(10); // Total cost (BUGGY)
      const L = getCell(11); // Time
      
      // Voucher header detection (Date is an object/Date type)
      if (A && typeof A === 'object') {
        if (currentVoucher && currentVoucher.lines.length > 0) {
          allVouchers.push(currentVoucher);
        }
        
        currentVoucher = {
          date: A instanceof Date ? A.toISOString().split('T')[0] : String(A),
          store: B ? String(B) : '',
          voucherNumber: C ? String(C) : '',
          type: H ? String(H) : 'Receiving',
          vendor: I ? String(I) : '',
          totalQty: J || 0,
          qbTotal: K || 0, // Keep QB's buggy value for reference
          time: L instanceof Date ? L.toISOString().split('T')[1].split('.')[0] : (L ? String(L) : ''),
          correctedTotal: 0, // Will be calculated
          lines: []
        };
      } 
      // Line item detection (no Date in column A, but has Item # and Item Name)
      else if (B && C && !A && currentVoucher) {
        currentVoucher.lines.push({
          itemNumber: String(B),
          itemName: String(C),
          qty: H || 0,
          cost: I || 0
        });
      }
    }
    
    // Don't forget last voucher
    if (currentVoucher && currentVoucher.lines.length > 0) {
      allVouchers.push(currentVoucher);
    }
    
    // Calculate corrected totals and handle reversals
    allVouchers.forEach(voucher => {
      // Calculate CORRECT total for this voucher
      const correctVoucherTotal = voucher.lines.reduce((sum, item) => {
        const absoluteCost = Math.abs(Number(item.cost));
        return sum + (Number(item.qty) * absoluteCost);
      }, 0);
      
      voucher.correctedTotal = correctVoucherTotal;
      
      // Update transaction type for negative quantities (reversals)
      voucher.lines.forEach(item => {
        if (Number(item.qty) < 0) {
          voucher.type = 'Reversal';
        }
        // Always use absolute value for cost
        item.cost = Math.abs(Number(item.cost));
      });
    });
    
    // Calculate statistics
    onProgress?.('Calculating statistics...', 100);
    const uniqueVendors = new Set(allVouchers.map(v => v.vendor)).size;
    const uniqueStores = new Set(allVouchers.map(v => v.store)).size;
    const totalLines = allVouchers.reduce((sum, v) => sum + v.lines.length, 0);
    const totalCost = allVouchers.reduce((sum, v) => sum + v.correctedTotal, 0);
    const qbMismatchCount = allVouchers.filter(v => Math.abs(v.qbTotal - v.correctedTotal) > 0.01).length;
    
    const stats = {
      totalVouchers: allVouchers.length,
      totalLines,
      totalCost,
      uniqueVendors,
      uniqueStores,
      qbMismatchCount
    };
    
    onProgress?.(`Completed! Processed ${allVouchers.length} vouchers.`, 100);
    return { vouchers: allVouchers, stats };
  } catch (error) {
    console.error('Flattening error:', error);
    throw new Error(`Failed to flatten data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

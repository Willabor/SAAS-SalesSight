import * as XLSX from 'xlsx';

export interface FormatConfig {
  deleteTopRows?: number;
  deleteBottomRows?: number;
  deleteColumns?: string[];
  headerMappings?: { [oldHeader: string]: string };
  flattenByStore?: boolean;
  autoDetectHeaders?: boolean;
}

export interface FormatResult {
  data: any[];
  headers: string[];
  deletedRows: number;
  deletedColumns: number;
  mappedHeaders: { [oldHeader: string]: string };
}

export interface ItemListStats {
  rowsDeleted: number;
  columnsDeleted: number;
  remainingColumns: number;
}

export interface SalesStats {
  sheetsProcessed: number;
  rowsDeleted: number;
  sheetNames: string[];
}

export interface BusinessStats {
  totalRecords: number;
  totalRevenue: number;
  avgItemPrice: number;
  uniqueReceipts: number;
  uniqueStores: number;
  uniqueSKUs: number;
  topProducts: Array<{
    itemName: string;
    quantity: number;
    totalRevenue: number;
    avgPrice: number;
  }>;
  sheetSummaries: Array<{
    sheetName: string;
    records: number;
    revenue: number;
    uniqueReceipts: number;
  }>;
}

// Detect the header row by finding the first row with meaningful content
export function detectHeaderRow(data: any[][]): number {
  for (let i = 0; i < Math.min(data.length, 10); i++) {
    const row = data[i];
    if (row && row.length > 0) {
      // Check if at least 3 cells have meaningful content
      const meaningfulCells = row.filter(cell => 
        cell !== null && 
        cell !== undefined && 
        cell !== '' && 
        typeof cell === 'string' && 
        cell.trim().length > 0
      );
      if (meaningfulCells.length >= 3) {
        return i;
      }
    }
  }
  return 0; // Default to first row if no clear header detected
}

// Delete rows from data based on configuration
export function deleteRows(data: any[][], config: { top?: number; bottom?: number; matching?: string }): any[][] {
  let result = [...data];
  
  // Delete top rows
  if (config.top && config.top > 0) {
    result = result.slice(config.top);
  }
  
  // Delete bottom rows
  if (config.bottom && config.bottom > 0) {
    result = result.slice(0, result.length - config.bottom);
  }
  
  // Delete rows matching pattern
  if (config.matching) {
    result = result.filter(row => {
      const rowString = row.join(' ').toLowerCase();
      return !rowString.includes(config.matching!.toLowerCase());
    });
  }
  
  return result;
}

// Delete columns from data based on header names or indices
export function deleteColumns(data: any[][], config: { byHeader?: string[]; byIndex?: number[] }): any[][] {
  if (data.length === 0) return data;
  
  const headers = data[0];
  const columnsToDelete = new Set<number>();
  
  // Mark columns for deletion by header name
  if (config.byHeader) {
    config.byHeader.forEach(headerName => {
      const index = headers.findIndex((h: any) => 
        h && h.toString().trim().toLowerCase() === headerName.toLowerCase()
      );
      if (index !== -1) {
        columnsToDelete.add(index);
      }
    });
  }
  
  // Mark columns for deletion by index
  if (config.byIndex) {
    config.byIndex.forEach(index => {
      if (index >= 0 && index < headers.length) {
        columnsToDelete.add(index);
      }
    });
  }
  
  // Filter out marked columns
  return data.map(row => 
    row.filter((_, index) => !columnsToDelete.has(index))
  );
}

// Normalize headers using mapping or auto-detection
export function normalizeHeaders(headers: string[], mapping?: { [oldHeader: string]: string }): { [oldHeader: string]: string } {
  const result: { [oldHeader: string]: string } = {};
  
  // Default mappings for common variations
  const defaultMappings: { [key: string]: string } = {
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
  
  headers.forEach(header => {
    const trimmedHeader = header?.toString().trim() || '';
    if (trimmedHeader) {
      // Use provided mapping first, then default mappings, then normalize
      const mapped = mapping?.[trimmedHeader] || 
                     defaultMappings[trimmedHeader] || 
                     defaultMappings[trimmedHeader.toLowerCase()] ||
                     trimmedHeader.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      result[trimmedHeader] = mapped;
    }
  });
  
  return result;
}

// Coerce data types based on expected schema
export function coerceTypes(data: any[], schema: { [field: string]: 'string' | 'number' | 'date' }): any[] {
  return data.map(row => {
    const coerced: any = {};
    Object.keys(row).forEach(key => {
      const value = row[key];
      const expectedType = schema[key];
      
      if (value === null || value === undefined || value === '') {
        coerced[key] = null;
        return;
      }
      
      switch (expectedType) {
        case 'number':
          const num = parseFloat(value.toString());
          coerced[key] = isNaN(num) ? null : num;
          break;
        case 'date':
          // Handle Excel date formats
          if (typeof value === 'number' && value > 25569) { // Excel date serial number
            const excelDate = XLSX.SSF.parse_date_code(value);
            coerced[key] = new Date(excelDate.y, excelDate.m - 1, excelDate.d);
          } else {
            const parsed = new Date(value.toString());
            coerced[key] = isNaN(parsed.getTime()) ? null : parsed;
          }
          break;
        default:
          coerced[key] = value.toString();
      }
    });
    return coerced;
  });
}

// Flatten item list by store quantities into long format
export function flattenItemListQuantities(data: any[]): any[] {
  const stores = ['avail', 'hq', 'gm', 'hm', 'mm', 'nm', 'pm', 'lm'];
  const flattened: any[] = [];
  
  data.forEach(item => {
    stores.forEach(store => {
      const qtyField = `${store}_qty`;
      const qty = item[qtyField];
      
      if (qty != null && qty !== '' && qty !== 0) {
        flattened.push({
          item_number: item.item_number,
          vendor_name: item.vendor_name,
          item_name: item.item_name,
          category: item.category,
          gender: item.gender,
          store_code: store.toUpperCase(),
          quantity: parseInt(qty) || 0,
          last_rcvd: item.last_rcvd,
          creation_date: item.creation_date,
          last_sold: item.last_sold,
          style_number: item.style_number,
          style_number_2: item.style_number_2,
          order_cost: item.order_cost,
          selling_price: item.selling_price,
          notes: item.notes,
          size: item.size,
          attribute: item.attribute
        });
      }
    });
  });
  
  return flattened;
}

// Sales data formatting step 1: Clean and normalize
export function normalizeSalesStep1(data: any[]): any[] {
  return data.map(row => {
    const normalized: any = {};
    
    // Normalize common sales transaction headers
    Object.keys(row).forEach(key => {
      const trimmedKey = key.trim();
      const value = row[key];
      
      // Map common variations
      if (['Date', 'date', 'DATE'].includes(trimmedKey)) {
        normalized.date = value;
      } else if (['Store', 'store', 'STORE', 'Location'].includes(trimmedKey)) {
        normalized.store = value;
      } else if (['Receipt #', 'receipt #', 'Receipt Number', 'receipt_number'].includes(trimmedKey)) {
        normalized.receipt_number = value;
      } else if (['SKU', 'sku', 'Item Number', 'item_number'].includes(trimmedKey)) {
        normalized.sku = value;
      } else if (['Item Name', 'item name', 'Product Name', 'product_name'].includes(trimmedKey)) {
        normalized.item_name = value;
      } else if (['Transaction Store Type', 'Store Type', 'store_type'].includes(trimmedKey)) {
        normalized.transaction_store_type = value;
      } else if (['Price', 'price', 'Amount', 'amount'].includes(trimmedKey)) {
        normalized.price = parseFloat(value?.toString() || '0') || 0;
      } else if (['Sheet', 'sheet', 'Source Sheet'].includes(trimmedKey)) {
        normalized.sheet = value;
      } else {
        // Keep other fields as-is with normalized key
        const normalizedKey = trimmedKey.toLowerCase().replace(/\s+/g, '_');
        normalized[normalizedKey] = value;
      }
    });
    
    return normalized;
  });
}

// Sales data formatting step 2: Transform and enrich
export function transformSalesStep2(data: any[], itemListData?: any[]): any[] {
  return data.map(transaction => {
    const transformed = { ...transaction };
    
    // Enrich with item list data if provided
    if (itemListData && transaction.sku) {
      const matchingItem = itemListData.find(item => 
        item.item_number === transaction.sku || 
        item.item_name === transaction.item_name
      );
      
      if (matchingItem) {
        transformed.vendor_name = matchingItem.vendor_name;
        transformed.category = matchingItem.category;
        transformed.gender = matchingItem.gender;
      }
    }
    
    // Handle negative prices (returns)
    if (transformed.price < 0) {
      transformed.is_return = true;
      transformed.return_amount = Math.abs(transformed.price);
    }
    
    // Normalize store codes
    if (transformed.store) {
      const store = transformed.store.toString().toLowerCase().trim();
      if (store.includes('hq') || store.includes('headquarters')) {
        transformed.store = 'HQ';
      } else if (store.includes('gm') || store.includes('general')) {
        transformed.store = 'GM';
      }
      // Add more store normalizations as needed
    }
    
    return transformed;
  });
}

// Convert data back to Excel workbook
export function toWorkbook(data: any[], sheetName: string = 'Sheet1'): XLSX.WorkBook {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return wb;
}

// Convert data to CSV format
export function toCSV(data: any[]): string {
  if (data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) return '';
      
      const str = value.toString();
      // Escape commas and quotes
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    csvRows.push(values.join(','));
  });
  
  return csvRows.join('\n');
}

// Infer mapping from known aliases
export function inferMapping(headers: string[], knownAliases: { [field: string]: string[] }): { [header: string]: string } {
  const mapping: { [header: string]: string } = {};
  
  headers.forEach(header => {
    const trimmedHeader = header.trim();
    
    // Find matching field in known aliases
    Object.keys(knownAliases).forEach(field => {
      const aliases = knownAliases[field];
      if (aliases.some(alias => 
        alias.toLowerCase() === trimmedHeader.toLowerCase() ||
        trimmedHeader.toLowerCase().includes(alias.toLowerCase())
      )) {
        mapping[trimmedHeader] = field;
      }
    });
  });
  
  return mapping;
}

// Get sample preview of data
export function samplePreview(data: any[], maxRows: number = 10): any[] {
  return data.slice(0, maxRows);
}

// Specific Item List Formatting (from user's requirements)
export function formatItemList(file: File): Promise<{
  workbook: XLSX.WorkBook;
  stats: ItemListStats;
  parsedData: any[];
}> {
  return new Promise(async (resolve, reject) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { cellDates: true, cellStyles: true });
      
      const sheetName = 'Item Detail';
      if (!workbook.SheetNames.includes(sheetName)) {
        throw new Error('Sheet "Item Detail" not found in workbook');
      }

      const worksheet = workbook.Sheets[sheetName];
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      
      // DELETE TOP 5 ROWS
      const afterRowDelete: any = {};
      for (let R = range.s.r + 5; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
          const oldAddr = XLSX.utils.encode_cell({r: R, c: C});
          const newAddr = XLSX.utils.encode_cell({r: R - 5, c: C});
          if (worksheet[oldAddr]) {
            afterRowDelete[newAddr] = worksheet[oldAddr];
          }
        }
      }
      
      // DELETE SPECIFIC COLUMNS
      const columnsToDelete = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46];
      
      const colMap: any = {};
      let newCol = 0;
      for (let oldCol = 0; oldCol <= range.e.c; oldCol++) {
        if (!columnsToDelete.includes(oldCol)) {
          colMap[oldCol] = newCol++;
        }
      }
      
      const finalCells: any = {};
      Object.keys(afterRowDelete).forEach(addr => {
        const cell = XLSX.utils.decode_cell(addr);
        if (colMap[cell.c] !== undefined) {
          const newAddr = XLSX.utils.encode_cell({r: cell.r, c: colMap[cell.c]});
          finalCells[newAddr] = afterRowDelete[addr];
        }
      });
      
      workbook.Sheets[sheetName] = {
        ...finalCells,
        '!ref': XLSX.utils.encode_range({
          s: {r: 0, c: 0},
          e: {r: range.e.r - 5, c: newCol - 1}
        })
      };
      
      const stats: ItemListStats = {
        rowsDeleted: 5,
        columnsDeleted: columnsToDelete.length,
        remainingColumns: newCol
      };
      
      // PARSE DATA FOR DATABASE UPLOAD
      const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null });
      const parsedRecords = jsonData.map((row: any) => ({
        item_number: row['Item #'] || null,
        vendor_name: row['Vendor Name'] || null,
        item_name: row['Item Name'] || null,
        category: row['Category'] || null,
        gender: row['Gender'] || null,
        avail_qty: row['Avail Qty'] || 0,
        hq_qty: row['HQ Qty'] || 0,
        gm_qty: row['GM Qty'] || 0,
        hm_qty: row['HM Qty'] || 0,
        mm_qty: row['MM Qty'] || 0,
        nm_qty: row['NM Qty'] || 0,
        pm_qty: row['PM Qty'] || 0,
        lm_qty: row['LM Qty'] || 0,
        last_rcvd: row['Last Rcvd'] || null,
        creation_date: row['Creation Date'] || null,
        last_sold: row['Last Sold'] || null,
        style_number: row['Style Number'] || null,
        style_number_2: row['Style Number 2'] || null,
        order_cost: row['Order Cost'] || null,
        selling_price: row['Selling Price'] || null,
        notes: row['Notes'] || null,
        size: row['Size'] || null,
        attribute: row['Attribute'] || null,
        file_name: file.name
      }));
      
      resolve({
        workbook,
        stats,
        parsedData: parsedRecords
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

// Specific Sales Data Formatting Step 1 (from user's requirements)
export function formatSalesFile(file: File): Promise<{
  workbook: XLSX.WorkBook;
  stats: SalesStats;
}> {
  return new Promise(async (resolve, reject) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { cellDates: true, cellStyles: true });
      
      const processedSheets: string[] = [];
      let totalRowsDeleted = 0;
      
      workbook.SheetNames.forEach(sheetName => {
        if (!/^Sales Detail/i.test(sheetName)) return;
        
        const worksheet = workbook.Sheets[sheetName];
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        
        // DELETE TOP 5 ROWS
        totalRowsDeleted += 5;
        const newCells: any = {};
        
        for (let R = range.s.r + 5; R <= range.e.r; R++) {
          for (let C = range.s.c; C <= range.e.c; C++) {
            const oldAddr = XLSX.utils.encode_cell({r: R, c: C});
            const newAddr = XLSX.utils.encode_cell({r: R - 5, c: C});
            if (worksheet[oldAddr]) {
              newCells[newAddr] = worksheet[oldAddr];
            }
          }
        }
        
        // DELETE COLUMNS A, C, E, G, I, K, M, O (0, 2, 4, 6, 8, 10, 12, 14)
        const colMap: any = {};
        let newCol = 0;
        for (let oldCol = 0; oldCol <= range.e.c; oldCol++) {
          if (![0, 2, 4, 6, 8, 10, 12, 14].includes(oldCol)) {
            colMap[oldCol] = newCol++;
          }
        }
        
        const afterColDelete: any = {};
        Object.keys(newCells).forEach(addr => {
          const cell = XLSX.utils.decode_cell(addr);
          if (colMap[cell.c] !== undefined) {
            const newAddr = XLSX.utils.encode_cell({r: cell.r, c: colMap[cell.c]});
            afterColDelete[newAddr] = newCells[addr];
          }
        });
        
        // INSERT SKU AND ITEM NAME COLUMNS
        const afterInsert: any = {};
        Object.keys(afterColDelete).forEach(addr => {
          const cell = XLSX.utils.decode_cell(addr);
          let newC = cell.c;
          if (cell.c >= 3) newC = cell.c + 2;
          const newAddr = XLSX.utils.encode_cell({r: cell.r, c: newC});
          afterInsert[newAddr] = afterColDelete[addr];
        });
        
        // ADD HEADERS
        afterInsert['D1'] = {t: 's', v: 'SKU'};
        afterInsert['E1'] = {t: 's', v: 'Item Name'};
        afterInsert['G1'] = {t: 's', v: 'Price'};
        
        workbook.Sheets[sheetName] = {
          ...afterInsert,
          '!ref': XLSX.utils.encode_range({
            s: {r: 0, c: 0},
            e: {r: range.e.r - 5, c: newCol + 1}
          })
        };
        
        processedSheets.push(sheetName);
      });
      
      const stats: SalesStats = {
        sheetsProcessed: processedSheets.length,
        rowsDeleted: totalRowsDeleted,
        sheetNames: processedSheets
      };
      
      resolve({
        workbook,
        stats
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

// Sales Data Flattening Step 2 (from user's requirements)
export function flattenSalesData(workbook: XLSX.WorkBook): Promise<{
  transactions: any[];
  businessStats: BusinessStats;
  csvData: string;
}> {
  return new Promise((resolve, reject) => {
    try {
      let allTransactions: any[] = [];
      let sheetSummaries: any[] = [];

      for (let i = 0; i < workbook.SheetNames.length; i++) {
        const sheetName = workbook.SheetNames[i];
        
        if (!/^Sales Detail/i.test(sheetName)) continue;
        
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { 
          header: ['Date', 'Store', 'Receipt #', 'SKU', 'Item Name', 'Transaction Store Type', 'Price', 'Col8', 'Col9'],
          defval: null,
          range: 1
        });
        
        let sheetTransactions: any[] = [];
        let currentTransaction: any = null;
        
        // PARSE HIERARCHICAL STRUCTURE
        for (let j = 0; j < jsonData.length; j++) {
          const row = jsonData[j] as any;
          
          // TRANSACTION HEADER ROW (has Date, Store, Receipt #, but no Price)
          if (row.Date && row.Store && row['Receipt #'] && !row.Price) {
            let formattedDate = row.Date instanceof Date 
              ? row.Date.toISOString().split('T')[0] 
              : row.Date;
            
            currentTransaction = {
              date: formattedDate,
              store: row.Store,
              receiptNumber: row['Receipt #'],
              transactionStoreType: row['Transaction Store Type']
            };
          } 
          // LINE ITEM ROW (no Date, has Store/Receipt#/Price)
          else if (!row.Date && row.Store && row['Receipt #'] && row.Price !== null && currentTransaction) {
            const transaction = {
              Date: currentTransaction.date,
              Store: currentTransaction.store,
              'Receipt #': currentTransaction.receiptNumber,
              SKU: row.Store,
              'Item Name': row['Receipt #'],
              'Transaction Store Type': row['Transaction Store Type'] || currentTransaction.transactionStoreType,
              Price: row.Price,
              Sheet: sheetName
            };
            
            sheetTransactions.push(transaction);
            allTransactions.push(transaction);
          }
        }
        
        // Calculate sheet summary
        const revenue = sheetTransactions.reduce((sum, t) => sum + (t.Price || 0), 0);
        const uniqueReceipts = new Set(sheetTransactions.map(t => t['Receipt #'])).size;
        
        sheetSummaries.push({
          sheetName,
          records: sheetTransactions.length,
          revenue,
          uniqueReceipts
        });
      }

      // CALCULATE BUSINESS STATISTICS
      const productGroups = allTransactions.reduce((acc, item) => {
        const name = item['Item Name'];
        if (!acc[name]) {
          acc[name] = [];
        }
        acc[name].push(item);
        return acc;
      }, {} as any);

      const topProducts = Object.keys(productGroups)
        .map(name => ({
          itemName: name,
          quantity: productGroups[name].length,
          totalRevenue: productGroups[name].reduce((sum: number, item: any) => sum + (item.Price || 0), 0),
          avgPrice: productGroups[name].reduce((sum: number, item: any) => sum + (item.Price || 0), 0) / productGroups[name].length
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 10);

      // GENERATE CSV
      const csvHeaders = ['Date', 'Store', 'Receipt #', 'SKU', 'Item Name', 'Transaction Store Type', 'Price', 'Sheet'];
      const csvRows = [csvHeaders.join(',')];
      
      allTransactions.forEach(row => {
        const values = csvHeaders.map(header => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          const str = value.toString();
          // Escape commas and quotes
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        });
        csvRows.push(values.join(','));
      });
      
      const csvData = csvRows.join('\n');
      
      const businessStats: BusinessStats = {
        totalRecords: allTransactions.length,
        totalRevenue: allTransactions.reduce((sum, t) => sum + (t.Price || 0), 0),
        avgItemPrice: allTransactions.reduce((sum, t) => sum + (t.Price || 0), 0) / allTransactions.length || 0,
        uniqueReceipts: new Set(allTransactions.map(t => t['Receipt #'])).size,
        uniqueStores: new Set(allTransactions.map(t => t.Store)).size,
        uniqueSKUs: new Set(allTransactions.map(t => t.SKU)).size,
        topProducts,
        sheetSummaries
      };

      resolve({
        transactions: allTransactions,
        businessStats,
        csvData
      });
      
    } catch (error) {
      reject(error);
    }
  });
}

// Download Functions
export function downloadExcelFile(workbook: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(workbook, filename, { compression: true });
}

export function downloadCSVFile(csvData: string, filename: string) {
  const blob = new Blob([csvData], { type: 'text/csv' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
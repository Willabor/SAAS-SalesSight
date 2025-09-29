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

// Main formatting function that orchestrates all operations
export function formatExcelData(
  workbook: XLSX.WorkBook, 
  config: FormatConfig, 
  type: 'item-list' | 'sales-transactions'
): FormatResult {
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  if (!worksheet) {
    throw new Error('No worksheet found in Excel file');
  }
  
  // Convert to array format for processing
  let data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  
  if (data.length === 0) {
    throw new Error('Excel file contains no data');
  }
  
  // Detect header row if auto-detection is enabled
  let headerRowIndex = 0;
  if (config.autoDetectHeaders) {
    headerRowIndex = detectHeaderRow(data);
    if (headerRowIndex > 0) {
      data = data.slice(headerRowIndex);
    }
  }
  
  // Delete rows as configured
  const originalRowCount = data.length;
  if (config.deleteTopRows || config.deleteBottomRows) {
    data = deleteRows(data, {
      top: config.deleteTopRows,
      bottom: config.deleteBottomRows
    });
  }
  
  // Delete columns as configured
  const originalColumnCount = data[0]?.length || 0;
  if (config.deleteColumns && config.deleteColumns.length > 0) {
    data = deleteColumns(data, { byHeader: config.deleteColumns });
  }
  
  // Convert back to object format
  const headers = data[0] as string[];
  const rows = data.slice(1);
  
  // Normalize headers
  const headerMappings = normalizeHeaders(headers, config.headerMappings);
  
  // Convert to objects with mapped headers
  let processedData = rows
    .filter(row => row.some(cell => cell !== null && cell !== undefined && cell !== ''))
    .map(row => {
      const obj: any = {};
      headers.forEach((header, i) => {
        if (header && row[i] !== undefined) {
          const mappedHeader = headerMappings[header] || header;
          obj[mappedHeader] = row[i];
        }
      });
      return obj;
    });
  
  // Apply type coercion
  if (type === 'item-list') {
    const schema = {
      item_number: 'string',
      vendor_name: 'string',
      item_name: 'string',
      avail_qty: 'number',
      hq_qty: 'number',
      gm_qty: 'number',
      hm_qty: 'number',
      mm_qty: 'number',
      nm_qty: 'number',
      pm_qty: 'number',
      lm_qty: 'number',
      order_cost: 'number',
      selling_price: 'number',
      last_rcvd: 'date',
      creation_date: 'date',
      last_sold: 'date'
    } as const;
    processedData = coerceTypes(processedData, schema);
    
    // Apply flattening if requested
    if (config.flattenByStore) {
      processedData = flattenItemListQuantities(processedData);
    }
  } else if (type === 'sales-transactions') {
    const schema = {
      date: 'date',
      price: 'number'
    } as const;
    processedData = coerceTypes(processedData, schema);
    
    // Apply 2-step sales processing
    processedData = normalizeSalesStep1(processedData);
    processedData = transformSalesStep2(processedData);
  }
  
  return {
    data: processedData,
    headers: Object.values(headerMappings),
    deletedRows: originalRowCount - rows.length - 1, // -1 for header row
    deletedColumns: originalColumnCount - headers.length,
    mappedHeaders: headerMappings
  };
}
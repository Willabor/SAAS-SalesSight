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

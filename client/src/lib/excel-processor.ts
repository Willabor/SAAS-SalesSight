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
    // Check for required fields (case-insensitive)
    const normalizedItem: any = {};
    
    // Normalize field names to snake_case
    Object.keys(item).forEach(key => {
      const normalizedKey = key.toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');
      normalizedItem[normalizedKey] = item[key];
    });
    
    // Map common variations
    if (normalizedItem.item && !normalizedItem.item_number) {
      normalizedItem.item_number = normalizedItem.item;
    }
    if (normalizedItem.vendor && !normalizedItem.vendor_name) {
      normalizedItem.vendor_name = normalizedItem.vendor;
    }
    if (normalizedItem.name && !normalizedItem.item_name) {
      normalizedItem.item_name = normalizedItem.name;
    }
    
    // Validate required fields
    for (const field of requiredFields) {
      if (!normalizedItem[field]) {
        throw new Error(`Row ${index + 1}: Missing required field '${field}'`);
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

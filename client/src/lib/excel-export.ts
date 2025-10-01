import * as XLSX from 'xlsx';

/**
 * Export data to Excel file
 * @param data - Array of objects to export
 * @param filename - Name of the file (without extension)
 * @param sheetName - Name of the worksheet
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  filename: string,
  sheetName: string = 'Sheet1'
): void {
  if (!data || data.length === 0) {
    console.warn('No data to export');
    return;
  }

  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  // Convert data to worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Auto-size columns
  const maxWidth = 50;
  const colWidths = Object.keys(data[0]).map(key => {
    const maxLength = Math.max(
      key.length,
      ...data.map(row => String(row[key] || '').length)
    );
    return { wch: Math.min(maxLength + 2, maxWidth) };
  });
  worksheet['!cols'] = colWidths;

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Generate Excel file and trigger download
  const timestamp = new Date().toISOString().split('T')[0];
  const fullFilename = `${filename}_${timestamp}.xlsx`;
  XLSX.writeFile(workbook, fullFilename);
}

/**
 * Export multiple sheets to a single Excel file
 * @param sheets - Array of { data, sheetName } objects
 * @param filename - Name of the file (without extension)
 */
export function exportMultipleSheetsToExcel(
  sheets: Array<{ data: Record<string, any>[]; sheetName: string }>,
  filename: string
): void {
  if (!sheets || sheets.length === 0) {
    console.warn('No sheets to export');
    return;
  }

  // Create a new workbook
  const workbook = XLSX.utils.book_new();

  sheets.forEach(({ data, sheetName }) => {
    if (data && data.length > 0) {
      // Convert data to worksheet
      const worksheet = XLSX.utils.json_to_sheet(data);

      // Auto-size columns
      const maxWidth = 50;
      const colWidths = Object.keys(data[0]).map(key => {
        const maxLength = Math.max(
          key.length,
          ...data.map(row => String(row[key] || '').length)
        );
        return { wch: Math.min(maxLength + 2, maxWidth) };
      });
      worksheet['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    }
  });

  // Generate Excel file and trigger download
  const timestamp = new Date().toISOString().split('T')[0];
  const fullFilename = `${filename}_${timestamp}.xlsx`;
  XLSX.writeFile(workbook, fullFilename);
}

/**
 * Format data for Excel export with custom column headers
 * @param data - Array of objects
 * @param columnMapping - Mapping of keys to display names (partial mapping allowed)
 */
export function formatDataForExport<T extends Record<string, any>>(
  data: T[],
  columnMapping: Partial<Record<keyof T, string>> | Record<string, string>
): Record<string, any>[] {
  return data.map(row => {
    const formattedRow: Record<string, any> = {};
    Object.entries(columnMapping).forEach(([key, displayName]) => {
      formattedRow[displayName as string] = row[key as keyof T];
    });
    return formattedRow;
  });
}

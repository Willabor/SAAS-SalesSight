import * as XLSX from 'xlsx';

interface ReceivingMetric {
  styleNumber: string;
  itemNumber: string | null;
  lifecycleStage: string | null;
  firstReceiveDate: string | null;
  lastReceiveDate: string | null;
  totalReceiveCount: number | null;
  uniqueReceiveMonths: number | null;
  uniqueReceiveYears: number | null;
  avgDaysBetweenReceives: string | null;
  daysSinceFirstReceive: number | null;
  daysSinceLastReceive: number | null;
  isNewItem: boolean | null;
  isRestockedItem: boolean | null;
  isSeasonalItem: boolean | null;
  isOneTimeBuy: boolean | null;
  isCoreItem: boolean | null;
  creationDate: string | null;
  lastCalculatedAt: string | null;
  // Multi-dimensional metrics
  totalSalesCount?: number | null;
  salesMonthsLastYear?: number | null;
  salesLast90days?: number | null;
  daysOfSupply?: string | null;
  hasSeasonalSalesPattern?: boolean | null;
}

interface ExportStats {
  total: number;
  byLifecycle: Record<string, number>;
  lastCalculated: string | null;
}

interface FailedItem {
  styleNumber: string;
  reason: string;
  category: string;
  error?: string;
}

interface InventoryByLocation {
  hq: number;
  gm: number;
  hm: number;
  lm: number;
  nm: number;
  total: number;
}

export function exportReceivingMetricsToExcel(
  stats: ExportStats,
  metrics: ReceivingMetric[],
  failedItems?: FailedItem[],
  inventory?: Map<string, InventoryByLocation> | Record<string, InventoryByLocation>
) {
  // Convert Map to object if needed for easier access
  const inventoryData = inventory instanceof Map
    ? Object.fromEntries(inventory)
    : (inventory || {});
  const workbook = XLSX.utils.book_new();

  const summaryData = [
    ['Multi-Dimensional Receiving Metrics Report'],
    ['Generated:', new Date().toLocaleString()],
    ['Analysis Type:', 'Multi-dimensional (Receiving + Sales + Inventory)'],
    [''],
    ['Summary Statistics'],
    ['Total Styles Analyzed:', stats.total],
    ['Last Calculated:', stats.lastCalculated ? new Date(stats.lastCalculated).toLocaleString() : 'Never'],
    [''],
    ['Lifecycle Distribution'],
    ['New Items:', stats.byLifecycle['New'] || 0],
    ['Core Items:', stats.byLifecycle['Core'] || 0],
    ['Seasonal Items:', stats.byLifecycle['Seasonal'] || 0],
    ['Clearance Items:', stats.byLifecycle['Clearance'] || 0],
    ['One-Time Buys:', stats.byLifecycle['One-Time'] || 0],
    ['Discontinued Items:', stats.byLifecycle['Discontinued'] || 0],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

  summarySheet['!cols'] = [
    { wch: 30 },
    { wch: 20 }
  ];

  const detailsData = metrics.map(m => {
    const inv = inventoryData[m.styleNumber] || { hq: 0, gm: 0, hm: 0, lm: 0, nm: 0, total: 0 };
    return {
      'Style Number': m.styleNumber,
      'Item Number': m.itemNumber || '',
      'Lifecycle Stage': m.lifecycleStage || '',
      // Inventory by location
      'Total Inventory': inv.total,
      'HQ': inv.hq,
      'GM': inv.gm,
      'HM': inv.hm,
      'LM': inv.lm,
      'NM': inv.nm,
      // Receiving metrics
      'First Receive Date': m.firstReceiveDate ? new Date(m.firstReceiveDate).toLocaleDateString() : '',
      'Last Receive Date': m.lastReceiveDate ? new Date(m.lastReceiveDate).toLocaleDateString() : '',
      'Total Receives': m.totalReceiveCount || 0,
      'Unique Months': m.uniqueReceiveMonths || 0,
      'Unique Years': m.uniqueReceiveYears || 0,
      'Avg Days Between Receives': m.avgDaysBetweenReceives ? parseFloat(m.avgDaysBetweenReceives).toFixed(1) : '',
      'Days Since First Receive': m.daysSinceFirstReceive || 0,
      'Days Since Last Receive': m.daysSinceLastReceive || 0,
      // Sales metrics
      'Total Sales': m.totalSalesCount || 0,
      'Sales Months (Last Year)': m.salesMonthsLastYear || 0,
      'Sales (Last 90 Days)': m.salesLast90days || 0,
      'Days of Supply': m.daysOfSupply ? parseFloat(m.daysOfSupply).toFixed(1) : '',
      'Seasonal Sales Pattern': m.hasSeasonalSalesPattern ? 'Yes' : 'No',
      // Classification flags
      'New Item': m.isNewItem ? 'Yes' : 'No',
      'Restocked Item': m.isRestockedItem ? 'Yes' : 'No',
      'Seasonal Item': m.isSeasonalItem ? 'Yes' : 'No',
      'One-Time Buy': m.isOneTimeBuy ? 'Yes' : 'No',
      'Core Item': m.isCoreItem ? 'Yes' : 'No',
      'Creation Date': m.creationDate ? new Date(m.creationDate).toLocaleDateString() : '',
      'Last Calculated': m.lastCalculatedAt ? new Date(m.lastCalculatedAt).toLocaleString() : '',
    };
  });

  const detailsSheet = XLSX.utils.json_to_sheet(detailsData);

  detailsSheet['!cols'] = [
    { wch: 15 }, // Style Number
    { wch: 15 }, // Item Number
    { wch: 15 }, // Lifecycle Stage
    { wch: 15 }, // Total Inventory
    { wch: 8 },  // HQ
    { wch: 8 },  // GM
    { wch: 8 },  // HM
    { wch: 8 },  // LM
    { wch: 8 },  // NM
    { wch: 18 }, // First Receive Date
    { wch: 18 }, // Last Receive Date
    { wch: 12 }, // Total Receives
    { wch: 12 }, // Unique Months
    { wch: 12 }, // Unique Years
    { wch: 22 }, // Avg Days Between Receives
    { wch: 22 }, // Days Since First Receive
    { wch: 22 }, // Days Since Last Receive
    { wch: 12 }, // Total Sales
    { wch: 22 }, // Sales Months (Last Year)
    { wch: 18 }, // Sales (Last 90 Days)
    { wch: 15 }, // Days of Supply
    { wch: 20 }, // Seasonal Sales Pattern
    { wch: 10 }, // New Item
    { wch: 14 }, // Restocked Item
    { wch: 13 }, // Seasonal Item
    { wch: 13 }, // One-Time Buy
    { wch: 10 }, // Core Item
    { wch: 15 }, // Creation Date
    { wch: 18 }, // Last Calculated
  ];

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  XLSX.utils.book_append_sheet(workbook, detailsSheet, 'Detailed Metrics');

  // Add Clearance Priority sheet if there are clearance items
  const clearanceItems = metrics
    .filter(m => m.lifecycleStage === 'Clearance')
    .sort((a, b) => {
      const aDays = a.daysOfSupply ? parseFloat(a.daysOfSupply) : 0;
      const bDays = b.daysOfSupply ? parseFloat(b.daysOfSupply) : 0;
      return bDays - aDays; // Sort by days of supply descending (worst first)
    });

  if (clearanceItems.length > 0) {
    const clearanceData = clearanceItems.map((m, index) => {
      const inv = inventoryData[m.styleNumber] || { hq: 0, gm: 0, hm: 0, lm: 0, nm: 0, total: 0 };
      return {
        'Priority': index + 1,
        'Style Number': m.styleNumber,
        'Item Number': m.itemNumber || '',
        'Total Inventory': inv.total,
        'HQ': inv.hq,
        'GM': inv.gm,
        'HM': inv.hm,
        'LM': inv.lm,
        'NM': inv.nm,
        'Days of Supply': m.daysOfSupply ? parseFloat(m.daysOfSupply).toFixed(1) : '',
        'Sales (90d)': m.salesLast90days || 0,
        'Last Receive Date': m.lastReceiveDate ? new Date(m.lastReceiveDate).toLocaleDateString() : '',
        'Days Since Received': m.daysSinceLastReceive || 0,
      };
    });

    const clearanceSheet = XLSX.utils.json_to_sheet(clearanceData);
    clearanceSheet['!cols'] = [
      { wch: 8 },  // Priority
      { wch: 15 }, // Style Number
      { wch: 15 }, // Item Number
      { wch: 15 }, // Total Inventory
      { wch: 8 },  // HQ
      { wch: 8 },  // GM
      { wch: 8 },  // HM
      { wch: 8 },  // LM
      { wch: 8 },  // NM
      { wch: 15 }, // Days of Supply
      { wch: 12 }, // Sales (90d)
      { wch: 18 }, // Last Receive Date
      { wch: 20 }, // Days Since Received
    ];

    XLSX.utils.book_append_sheet(workbook, clearanceSheet, 'Clearance Priority');
  }

  // Add Failed/Skipped Items sheet if there are any
  if (failedItems && failedItems.length > 0) {
    const failedData = failedItems.map((item, index) => ({
      'No.': index + 1,
      'Style Number': item.styleNumber,
      'Category': item.category === 'NO_RECEIVING_HISTORY' ? 'No Receiving History' :
                  item.category === 'NO_METRICS' ? 'Not Calculated' :
                  item.category === 'SQL_ERROR' ? 'Database Error' :
                  item.category === 'VALIDATION_ERROR' ? 'Validation Error' : 'Unknown',
      'Reason': item.reason,
      'Error Details': item.error || ''
    }));

    const failedSheet = XLSX.utils.json_to_sheet(failedData);
    failedSheet['!cols'] = [
      { wch: 6 },  // No.
      { wch: 15 }, // Style Number
      { wch: 20 }, // Category
      { wch: 50 }, // Reason
      { wch: 50 }, // Error Details
    ];

    XLSX.utils.book_append_sheet(workbook, failedSheet, 'Failed-Skipped Items');
  }

  const fileName = `receiving-metrics-${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);

  return fileName;
}

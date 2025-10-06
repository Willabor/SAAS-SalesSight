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
}

interface ExportStats {
  total: number;
  byLifecycle: Record<string, number>;
  lastCalculated: string | null;
}

export function exportReceivingMetricsToExcel(
  stats: ExportStats,
  metrics: ReceivingMetric[]
) {
  const workbook = XLSX.utils.book_new();

  const summaryData = [
    ['Receiving Metrics Report'],
    ['Generated:', new Date().toLocaleString()],
    [''],
    ['Summary Statistics'],
    ['Total Styles Analyzed:', stats.total],
    ['Last Calculated:', stats.lastCalculated ? new Date(stats.lastCalculated).toLocaleString() : 'Never'],
    [''],
    ['Lifecycle Distribution'],
    ['New Items:', stats.byLifecycle['New'] || 0],
    ['Core Items:', stats.byLifecycle['Core'] || 0],
    ['Seasonal Items:', stats.byLifecycle['Seasonal'] || 0],
    ['One-Time Buys:', stats.byLifecycle['One-Time'] || 0],
    ['Discontinued Items:', stats.byLifecycle['Discontinued'] || 0],
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

  summarySheet['!cols'] = [
    { wch: 30 },
    { wch: 20 }
  ];

  const detailsData = metrics.map(m => ({
    'Style Number': m.styleNumber,
    'Item Number': m.itemNumber || '',
    'Lifecycle Stage': m.lifecycleStage || '',
    'First Receive Date': m.firstReceiveDate ? new Date(m.firstReceiveDate).toLocaleDateString() : '',
    'Last Receive Date': m.lastReceiveDate ? new Date(m.lastReceiveDate).toLocaleDateString() : '',
    'Total Receives': m.totalReceiveCount || 0,
    'Unique Months': m.uniqueReceiveMonths || 0,
    'Unique Years': m.uniqueReceiveYears || 0,
    'Avg Days Between Receives': m.avgDaysBetweenReceives ? parseFloat(m.avgDaysBetweenReceives).toFixed(1) : '',
    'Days Since First Receive': m.daysSinceFirstReceive || 0,
    'Days Since Last Receive': m.daysSinceLastReceive || 0,
    'New Item': m.isNewItem ? 'Yes' : 'No',
    'Restocked Item': m.isRestockedItem ? 'Yes' : 'No',
    'Seasonal Item': m.isSeasonalItem ? 'Yes' : 'No',
    'One-Time Buy': m.isOneTimeBuy ? 'Yes' : 'No',
    'Core Item': m.isCoreItem ? 'Yes' : 'No',
    'Creation Date': m.creationDate ? new Date(m.creationDate).toLocaleDateString() : '',
    'Last Calculated': m.lastCalculatedAt ? new Date(m.lastCalculatedAt).toLocaleString() : '',
  }));

  const detailsSheet = XLSX.utils.json_to_sheet(detailsData);

  detailsSheet['!cols'] = [
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 18 },
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 22 },
    { wch: 22 },
    { wch: 22 },
    { wch: 10 },
    { wch: 14 },
    { wch: 13 },
    { wch: 13 },
    { wch: 10 },
    { wch: 15 },
    { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  XLSX.utils.book_append_sheet(workbook, detailsSheet, 'Detailed Metrics');

  const fileName = `receiving-metrics-${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
  
  return fileName;
}

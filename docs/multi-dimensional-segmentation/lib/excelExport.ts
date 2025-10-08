// lib/excelExport.ts - Excel export with Clearance Priority sheet

import * as XLSX from 'xlsx';

interface MetricStats {
  total: number;
  lastCalculated: string | null;
  byLifecycle: Record<string, number>;
}

interface MetricRecord {
  item_number: string;
  item_name: string;
  vendor_name: string;
  category: string;
  lifecycle_stage: string;
  total_receive_count: number;
  total_sales_count: number;
  sales_months_last_year: number;
  sales_last_90days: number;
  days_of_supply: number;
  avail_qty: number;
  first_receive_date: string;
  last_receive_date: string;
  last_sold: string;
  avg_days_between_receives: number;
  days_since_last_receive: number;
  has_seasonal_sales_pattern: boolean;
}

export function exportReceivingMetricsToExcel(
  stats: MetricStats,
  metrics: MetricRecord[]
): string {
  const workbook = XLSX.utils.book_new();

  // SUMMARY SHEET
  const summaryData = [
    ['Receiving Metrics Analysis Report'],
    ['Generated:', new Date().toLocaleString()],
    ['Total Items:', stats.total],
    ['Last Calculated:', stats.lastCalculated ? new Date(stats.lastCalculated).toLocaleString() : 'Never'],
    [],
    ['Lifecycle Distribution'],
    ['Category', 'Count', 'Percentage'],
    ...Object.entries(stats.byLifecycle || {})
      .sort((a, b) => b[1] - a[1])
      .map(([lifecycle, count]) => [
        lifecycle,
        count,
        `${((count / stats.total) * 100).toFixed(1)}%`,
      ]),
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // DETAILED METRICS SHEET
  const detailedData = metrics.map(m => ({
    'Item Number': m.item_number,
    'Item Name': m.item_name,
    'Vendor': m.vendor_name,
    'Category': m.category,
    'Lifecycle Stage': m.lifecycle_stage,
    'Total Sales': m.total_sales_count || 0,
    'Sales Months (12mo)': m.sales_months_last_year || 0,
    'Sales Last 90d': m.sales_last_90days || 0,
    'Days of Supply': m.days_of_supply ? Number(m.days_of_supply).toFixed(1) : 'N/A',
    'Current Inventory': m.avail_qty || 0,
    'Total Receives': m.total_receive_count || 0,
    'Avg Days Between': m.avg_days_between_receives ? Number(m.avg_days_between_receives).toFixed(0) : 'N/A',
    'Last Sold': m.last_sold ? new Date(m.last_sold).toLocaleDateString() : 'Never',
    'Seasonal Pattern': m.has_seasonal_sales_pattern ? 'Yes' : 'No',
  }));

  const detailedSheet = XLSX.utils.json_to_sheet(detailedData);
  detailedSheet['!cols'] = Array(14).fill({ wch: 15 });
  XLSX.utils.book_append_sheet(workbook, detailedSheet, 'Detailed Metrics');

  // CLEARANCE PRIORITY SHEET
  const clearanceItems = metrics
    .filter(m => m.lifecycle_stage === 'Clearance')
    .sort((a, b) => (b.days_of_supply || 0) - (a.days_of_supply || 0));

  if (clearanceItems.length > 0) {
    const clearanceData = clearanceItems.map((m, i) => ({
      'Priority': i + 1,
      'Item #': m.item_number,
      'Name': m.item_name,
      'Inventory': m.avail_qty || 0,
      'Sales Last 90d': m.sales_last_90days || 0,
      'Days of Supply': m.days_of_supply ? Number(m.days_of_supply).toFixed(1) : 'N/A',
      'Action': 
        (m.days_of_supply || 0) > 365 ? 'Deep Discount (50%+)' :
        (m.days_of_supply || 0) > 270 ? 'Moderate Discount (30-50%)' :
        'Light Discount (15-30%)',
    }));

    const clearanceSheet = XLSX.utils.json_to_sheet(clearanceData);
    clearanceSheet['!cols'] = [
      { wch: 8 }, { wch: 12 }, { wch: 35 }, { wch: 10 },
      { wch: 14 }, { wch: 15 }, { wch: 25 }
    ];
    XLSX.utils.book_append_sheet(workbook, clearanceSheet, 'Clearance Priority');
  }

  // INDIVIDUAL LIFECYCLE SHEETS
  const lifecycles = ['New', 'Core', 'Seasonal', 'Clearance', 'One-Time', 'Discontinued'];
  
  lifecycles.forEach(lifecycle => {
    const filtered = metrics.filter(m => m.lifecycle_stage === lifecycle);
    if (filtered.length > 0) {
      const data = filtered.map(m => ({
        'Item #': m.item_number,
        'Name': m.item_name,
        'Inventory': m.avail_qty || 0,
        'Sales (90d)': m.sales_last_90days || 0,
        'Last Sold': m.last_sold ? new Date(m.last_sold).toLocaleDateString() : 'Never',
      }));
      const sheet = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, sheet, lifecycle);
    }
  });

  const timestamp = new Date().toISOString().slice(0, 10);
  const filename = `Receiving_Metrics_${timestamp}.xlsx`;
  XLSX.writeFile(workbook, filename);
  return filename;
}

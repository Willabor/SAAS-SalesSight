import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Package,
  AlertTriangle,
  TrendingDown,
  BarChart3,
  DollarSign,
  Download,
} from "lucide-react";
import { exportToExcel, exportMultipleSheetsToExcel, formatDataForExport } from "@/lib/excel-export";
import { InventorySettingsDialog } from "@/components/inventory-settings-dialog";
import {
  InventorySettings,
  loadSettings,
  saveSettings,
  resetSettings as resetSettingsToDefaults,
} from "@/lib/inventory-settings";

// Style-level inventory metrics (PHASE 2 - Updated interfaces)
interface StyleInventoryMetrics {
  styleNumber: string;
  itemName: string;
  category: string | null;
  vendorName: string | null;
  gender: string | null;
  totalActiveQty: number;
  totalClosedStoresQty: number;
  avgOrderCost: number;
  avgSellingPrice: number;
  avgMarginPercent: number;
  inventoryValue: number;
  classification: string;
  seasonalPattern: string;
  lastReceived: string | null;
  daysSinceLastReceive: number | null;
  receiveCount: number;
  stockStatus: string;
}

interface StyleSlowMovingItem {
  styleNumber: string;
  itemName: string;
  category: string | null;
  vendorName: string | null;
  totalActiveQty: number;
  inventoryValue: number;
  avgMarginPercent: number;
  classification: string;
  seasonalPattern: string;
  lastReceived: string | null;
  daysSinceLastReceive: number | null;
  stockStatus: string;
}

interface StyleOverstockItem {
  styleNumber: string;
  itemName: string;
  category: string | null;
  vendorName: string | null;
  totalActiveQty: number;
  inventoryValue: number;
  avgMarginPercent: number;
  unitsSold: number;
  avgDailySales: number;
  daysOfSupply: number;
  classification: string;
  stockStatus: string;
}

interface ProductSegmentation {
  coreHighFrequency: StyleInventoryMetrics[];
  coreMediumFrequency: StyleInventoryMetrics[];
  coreLowFrequency: StyleInventoryMetrics[];
  nonCoreRepeat: StyleInventoryMetrics[];
  oneTimePurchase: StyleInventoryMetrics[];
  summerItems: StyleInventoryMetrics[];
  winterItems: StyleInventoryMetrics[];
  highMarginItems: StyleInventoryMetrics[];
}

export default function InventoryTurnoverDashboard() {
  const [settings, setSettings] = useState<InventorySettings>(() => loadSettings());
  const [showClassificationBreakdown, setShowClassificationBreakdown] = useState(false);
  const [filterClassification, setFilterClassification] = useState<string>('all');
  const [filterSeasonalPattern, setFilterSeasonalPattern] = useState<string>('all');
  const [filterStockStatus, setFilterStockStatus] = useState<string>('all');
  const [excludeSeasonalHold, setExcludeSeasonalHold] = useState(true);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  const handleSaveSettings = (newSettings: InventorySettings) => {
    saveSettings(newSettings);
    setSettings(newSettings);
  };

  const handleResetSettings = () => {
    const defaults = resetSettingsToDefaults();
    setSettings(defaults);
  };

  // NEW: Fetch style-level metrics from Phase 1 backend
  const { data: styleMetrics, isLoading: metricsLoading } = useQuery<StyleInventoryMetrics[]>({
    queryKey: ["inventory", "style-metrics"],
    queryFn: async () => {
      const response = await fetch(`/api/inventory/style-metrics`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error("Failed to fetch style metrics");
      return response.json();
    },
  });

  const { data: slowMoving, isLoading: slowMovingLoading } = useQuery<StyleSlowMovingItem[]>({
    queryKey: ["inventory", "style-slow-moving", settings.slowMovingLimit],
    queryFn: async () => {
      const response = await fetch(`/api/inventory/style-slow-moving?limit=${settings.slowMovingLimit}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error("Failed to fetch slow-moving stock");
      return response.json();
    },
  });

  const { data: stockAnalysis, isLoading: stockAnalysisLoading } = useQuery<StyleOverstockItem[]>({
    queryKey: ["inventory", "style-overstock-understock", settings.salesAnalysisDays, settings.stockAnalysisLimit],
    queryFn: async () => {
      const response = await fetch(
        `/api/inventory/style-overstock-understock?days=${settings.salesAnalysisDays}&limit=${settings.stockAnalysisLimit}`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error("Failed to fetch stock analysis");
      return response.json();
    },
  });

  const { data: segmentation, isLoading: segmentationLoading } = useQuery<ProductSegmentation>({
    queryKey: ["inventory", "product-segmentation"],
    queryFn: async () => {
      const response = await fetch(`/api/inventory/product-segmentation`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error("Failed to fetch product segmentation");
      return response.json();
    },
  });

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  // Calculate aggregated metrics from style data
  const aggregatedMetrics = styleMetrics ? {
    totalStyles: styleMetrics.length,
    totalActiveInventoryValue: styleMetrics.reduce((sum, s) => sum + s.inventoryValue, 0),
    totalClosedStoresValue: styleMetrics.reduce((sum, s) => sum + (s.totalClosedStoresQty * s.avgOrderCost), 0),
    coreItemsCount: styleMetrics.filter(s => s.classification.startsWith('Core')).length,
    coreItemsValue: styleMetrics.filter(s => s.classification.startsWith('Core')).reduce((sum, s) => sum + s.inventoryValue, 0),
    deadStockValue: styleMetrics.filter(s => s.stockStatus === 'Dead Stock').reduce((sum, s) => sum + s.inventoryValue, 0),
    deadStockCount: styleMetrics.filter(s => s.stockStatus === 'Dead Stock').length,
    seasonalHoldValue: styleMetrics.filter(s => s.stockStatus === 'Seasonal Hold').reduce((sum, s) => sum + s.inventoryValue, 0),
    seasonalHoldCount: styleMetrics.filter(s => s.stockStatus === 'Seasonal Hold').length,
    newArrivalValue: styleMetrics.filter(s => s.stockStatus === 'New Arrival').reduce((sum, s) => sum + s.inventoryValue, 0),
    newArrivalCount: styleMetrics.filter(s => s.stockStatus === 'New Arrival').length,
  } : null;

  // Classification breakdown
  const classificationBreakdown = segmentation ? [
    { name: 'Core High (40+)', styles: segmentation.coreHighFrequency.length, value: segmentation.coreHighFrequency.reduce((sum, s) => sum + s.inventoryValue, 0) },
    { name: 'Core Medium (10-39)', styles: segmentation.coreMediumFrequency.length, value: segmentation.coreMediumFrequency.reduce((sum, s) => sum + s.inventoryValue, 0) },
    { name: 'Core Low (6-9)', styles: segmentation.coreLowFrequency.length, value: segmentation.coreLowFrequency.reduce((sum, s) => sum + s.inventoryValue, 0) },
    { name: 'Non-Core (2-5)', styles: segmentation.nonCoreRepeat.length, value: segmentation.nonCoreRepeat.reduce((sum, s) => sum + s.inventoryValue, 0) },
    { name: 'One-Time (1)', styles: segmentation.oneTimePurchase.length, value: segmentation.oneTimePurchase.reduce((sum, s) => sum + s.inventoryValue, 0) },
  ] : [];

  const getClassificationBadge = (classification: string) => {
    const variants: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
      'Core High': 'default',
      'Core Medium': 'secondary',
      'Core Low': 'secondary',
      'Non-Core Repeat': 'outline',
      'One-Time': 'outline',
    };
    const colors: Record<string, string> = {
      'Core High': 'bg-green-100 text-green-800 border-green-300',
      'Core Medium': 'bg-blue-100 text-blue-800 border-blue-300',
      'Core Low': 'bg-cyan-100 text-cyan-800 border-cyan-300',
      'Non-Core Repeat': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'One-Time': 'bg-gray-100 text-gray-800 border-gray-300',
    };
    return <Badge variant="outline" className={colors[classification]}>{classification}</Badge>;
  };

  const getSeasonalBadge = (pattern: string) => {
    const colors: Record<string, string> = {
      'Summer': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'Winter': 'bg-cyan-100 text-cyan-800 border-cyan-300',
      'Year-Round': 'bg-green-100 text-green-800 border-green-300',
      'Spring/Fall': 'bg-orange-100 text-orange-800 border-orange-300',
      'Unknown': 'bg-gray-100 text-gray-800 border-gray-300',
    };
    return <Badge variant="outline" className={colors[pattern] || colors['Unknown']}>{pattern}</Badge>;
  };

  const getStockStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'Dead Stock': 'bg-red-100 text-red-800 border-red-300',
      'Seasonal Hold': 'bg-orange-100 text-orange-800 border-orange-300',
      'New Arrival': 'bg-green-100 text-green-800 border-green-300',
      'Active': 'bg-blue-100 text-blue-800 border-blue-300',
      'Expected One-Time': 'bg-gray-100 text-gray-800 border-gray-300',
      'Overstock': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'Understock': 'bg-red-100 text-red-800 border-red-300',
      'No Sales': 'bg-gray-100 text-gray-800 border-gray-300',
      'Normal': 'bg-green-100 text-green-800 border-green-300',
    };
    return <Badge variant="outline" className={colors[status] || 'bg-gray-100 text-gray-800 border-gray-300'}>{status}</Badge>;
  };

  // Export handlers for style-level data
  const handleExportSlowMoving = () => {
    if (!slowMoving || slowMoving.length === 0) {
      alert('No data to export');
      return;
    }

    const exportData = formatDataForExport(slowMoving, {
      styleNumber: 'Style Number',
      itemName: 'Item Name',
      category: 'Category',
      vendorName: 'Vendor',
      classification: 'Classification',
      seasonalPattern: 'Seasonal Pattern',
      totalActiveQty: 'Active Qty',
      inventoryValue: 'Inventory Value',
      avgMarginPercent: 'Margin %',
      lastReceived: 'Last Received',
      daysSinceLastReceive: 'Days Since Receive',
      stockStatus: 'Stock Status',
    });

    exportToExcel(exportData, 'slow-moving-styles', 'Slow Moving Styles');
  };

  const handleExportStockAnalysis = () => {
    if (!stockAnalysis || stockAnalysis.length === 0) {
      alert('No data to export');
      return;
    }

    const filteredData = stockAnalysis.filter(item => item.stockStatus !== 'Normal');

    const exportData = formatDataForExport(filteredData, {
      styleNumber: 'Style Number',
      itemName: 'Item Name',
      category: 'Category',
      vendorName: 'Vendor',
      classification: 'Classification',
      totalActiveQty: 'On Hand',
      unitsSold: 'Units Sold (30d)',
      avgDailySales: 'Avg Daily Sales',
      daysOfSupply: 'Days of Supply',
      inventoryValue: 'Inventory Value',
      avgMarginPercent: 'Margin %',
      stockStatus: 'Stock Status',
    });

    exportToExcel(exportData, 'style-stock-analysis', 'Style Stock Analysis');
  };

  const handleExportAll = () => {
    if (!styleMetrics && !slowMoving && !stockAnalysis) {
      alert('No data to export');
      return;
    }

    const sheets: Array<{ data: Record<string, any>[]; sheetName: string }> = [];

    // Add summary metrics
    if (aggregatedMetrics) {
      sheets.push({
        data: [{
          'Metric': 'Total Styles',
          'Value': formatNumber(aggregatedMetrics.totalStyles),
        }, {
          'Metric': 'Total Active Inventory Value',
          'Value': formatCurrency(aggregatedMetrics.totalActiveInventoryValue),
        }, {
          'Metric': 'Core Items Count',
          'Value': formatNumber(aggregatedMetrics.coreItemsCount),
        }, {
          'Metric': 'Core Items Value',
          'Value': formatCurrency(aggregatedMetrics.coreItemsValue),
        }, {
          'Metric': 'Core Items %',
          'Value': ((aggregatedMetrics.coreItemsValue / aggregatedMetrics.totalActiveInventoryValue) * 100).toFixed(1) + '%',
        }, {
          'Metric': 'Dead Stock Value',
          'Value': formatCurrency(aggregatedMetrics.deadStockValue),
        }, {
          'Metric': 'Dead Stock Count',
          'Value': formatNumber(aggregatedMetrics.deadStockCount),
        }, {
          'Metric': 'Seasonal Hold Value',
          'Value': formatCurrency(aggregatedMetrics.seasonalHoldValue),
        }, {
          'Metric': 'Closed Stores Inventory (MM+PM)',
          'Value': formatCurrency(aggregatedMetrics.totalClosedStoresValue),
        }],
        sheetName: 'Summary Metrics',
      });
    }

    // Add classification breakdown
    if (classificationBreakdown.length > 0) {
      sheets.push({
        data: classificationBreakdown.map(c => ({
          'Classification': c.name,
          'Style Count': c.styles,
          'Inventory Value': formatCurrency(c.value),
        })),
        sheetName: 'Classification Breakdown',
      });
    }

    // Add slow moving stock
    if (slowMoving && slowMoving.length > 0) {
      sheets.push({
        data: formatDataForExport(slowMoving, {
          styleNumber: 'Style Number',
          itemName: 'Item Name',
          category: 'Category',
          vendorName: 'Vendor',
          classification: 'Classification',
          seasonalPattern: 'Seasonal Pattern',
          totalActiveQty: 'Active Qty',
          inventoryValue: 'Inventory Value',
          avgMarginPercent: 'Margin %',
          lastReceived: 'Last Received',
          daysSinceLastReceive: 'Days Since Receive',
          stockStatus: 'Stock Status',
        }),
        sheetName: 'Slow Moving Stock',
      });
    }

    // Add stock analysis
    if (stockAnalysis && stockAnalysis.length > 0) {
      const filteredData = stockAnalysis.filter(item => item.stockStatus !== 'Normal');
      sheets.push({
        data: formatDataForExport(filteredData, {
          styleNumber: 'Style Number',
          itemName: 'Item Name',
          category: 'Category',
          vendorName: 'Vendor',
          classification: 'Classification',
          totalActiveQty: 'On Hand',
          unitsSold: 'Units Sold (30d)',
          avgDailySales: 'Avg Daily Sales',
          daysOfSupply: 'Days of Supply',
          inventoryValue: 'Inventory Value',
          avgMarginPercent: 'Margin %',
          stockStatus: 'Stock Status',
        }),
        sheetName: 'Stock Analysis',
      });
    }

    exportMultipleSheetsToExcel(sheets, 'style-inventory-turnover-report');
  };

  if (metricsLoading || slowMovingLoading || stockAnalysisLoading || segmentationLoading) {
    return (
      <div className="text-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading inventory analytics...</p>
      </div>
    );
  }

  // Check if we have the required data
  if (!styleMetrics || !slowMoving || !stockAnalysis || !segmentation) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">No inventory data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toolbar: Settings and Export */}
      <div className="flex justify-between items-center">
        <InventorySettingsDialog
          settings={settings}
          onSave={handleSaveSettings}
          onReset={handleResetSettings}
        />
        <Button
          onClick={handleExportAll}
          variant="default"
          className="gap-2"
          data-testid="button-export-all"
        >
          <Download className="w-4 h-4" />
          Export All to Excel
        </Button>
      </div>

      {/* KPI Cards - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card data-testid="card-total-inventory-value">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Active Inventory
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <DollarSign className="w-4 h-4 mr-2 text-green-600" />
              <p className="text-2xl font-bold" data-testid="text-total-inventory-value">
                {formatCurrency(aggregatedMetrics?.totalActiveInventoryValue || 0)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatNumber(aggregatedMetrics?.totalStyles || 0)} styles • Excludes MM/PM
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-core-items-value">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Core Items Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Package className="w-4 h-4 mr-2 text-blue-600" />
              <p className="text-2xl font-bold text-blue-600" data-testid="text-core-items-value">
                {formatCurrency(aggregatedMetrics?.coreItemsValue || 0)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatNumber(aggregatedMetrics?.coreItemsCount || 0)} styles • {aggregatedMetrics?.totalActiveInventoryValue ?
                ((aggregatedMetrics.coreItemsValue / aggregatedMetrics.totalActiveInventoryValue) * 100).toFixed(1) : '0'}% of catalog
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-dead-stock-value">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Dead Stock Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2 text-red-600" />
              <p className="text-2xl font-bold text-red-600" data-testid="text-dead-stock-value">
                {formatCurrency(aggregatedMetrics?.deadStockValue || 0)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatNumber(aggregatedMetrics?.deadStockCount || 0)} styles • Excludes seasonal hold
            </p>
          </CardContent>
        </Card>
      </div>

      {/* KPI Cards - Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card data-testid="card-seasonal-hold">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Seasonal Hold
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <TrendingDown className="w-4 h-4 mr-2 text-orange-600" />
              <p className="text-2xl font-bold text-orange-600" data-testid="text-seasonal-hold-value">
                {formatCurrency(aggregatedMetrics?.seasonalHoldValue || 0)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatNumber(aggregatedMetrics?.seasonalHoldCount || 0)} styles • Out of season
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-closed-stores">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Closed Stores (MM+PM)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2 text-yellow-600" />
              <p className="text-2xl font-bold text-yellow-600" data-testid="text-closed-stores-value">
                {formatCurrency(aggregatedMetrics?.totalClosedStoresValue || 0)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Needs transfer/clearance
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-new-arrivals">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              New Arrivals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <BarChart3 className="w-4 h-4 mr-2 text-green-600" />
              <p className="text-2xl font-bold text-green-600" data-testid="text-new-arrivals-value">
                {formatCurrency(aggregatedMetrics?.newArrivalValue || 0)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatNumber(aggregatedMetrics?.newArrivalCount || 0)} styles • Last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Classification Breakdown - Expandable */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Classification Breakdown</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowClassificationBreakdown(!showClassificationBreakdown)}
            >
              {showClassificationBreakdown ? '▼ Hide' : '► Show'}
            </Button>
          </div>
        </CardHeader>
        {showClassificationBreakdown && (
          <CardContent>
            <div className="space-y-3">
              {classificationBreakdown.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.styles} styles</p>
                  </div>
                  <p className="font-bold">{formatCurrency(item.value)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Slow Moving & Dead Stock Table - STYLE LEVEL */}
      <Card data-testid="card-slow-moving-stock">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Slow Moving & Dead Stock (by Style)</CardTitle>
              <CardDescription>
                Styles with limited sales activity (showing up to {settings.slowMovingLimit} styles)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{slowMoving?.length || 0} styles</Badge>
              <Button
                onClick={handleExportSlowMoving}
                variant="outline"
                size="sm"
                className="gap-2"
                data-testid="button-export-slow-moving"
              >
                <Download className="w-3 h-3" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {slowMoving && slowMoving.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Style #</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Classification</TableHead>
                    <TableHead>Seasonal</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">Margin %</TableHead>
                    <TableHead className="text-right">Days Since Receive</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slowMoving.slice(0, 15).map((item, index) => (
                    <TableRow key={`${item.styleNumber}-${index}`} data-testid={`row-slow-moving-${index}`}>
                      <TableCell className="font-mono text-sm">{item.styleNumber}</TableCell>
                      <TableCell className="max-w-xs truncate">{item.itemName}</TableCell>
                      <TableCell>{getClassificationBadge(item.classification)}</TableCell>
                      <TableCell>{getSeasonalBadge(item.seasonalPattern)}</TableCell>
                      <TableCell className="text-right">{formatNumber(item.totalActiveQty)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.inventoryValue)}</TableCell>
                      <TableCell className="text-right">{item.avgMarginPercent?.toFixed(1)}%</TableCell>
                      <TableCell className="text-right">
                        {item.daysSinceLastReceive !== null ? Math.round(item.daysSinceLastReceive) : 'N/A'}
                      </TableCell>
                      <TableCell>{getStockStatusBadge(item.stockStatus)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No slow-moving stock found</p>
          )}
        </CardContent>
      </Card>

      {/* Overstock & Understock Analysis - STYLE LEVEL */}
      <Card data-testid="card-stock-analysis">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Overstock & Understock Analysis (by Style)</CardTitle>
              <CardDescription>
                Based on last {settings.salesAnalysisDays} days of sales activity (showing up to {settings.stockAnalysisLimit} styles)
              </CardDescription>
            </div>
            <Button
              onClick={handleExportStockAnalysis}
              variant="outline"
              size="sm"
              className="gap-2"
              data-testid="button-export-stock-analysis"
            >
              <Download className="w-3 h-3" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {stockAnalysis && stockAnalysis.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Style #</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Classification</TableHead>
                    <TableHead className="text-right">On Hand</TableHead>
                    <TableHead className="text-right">Sold (30d)</TableHead>
                    <TableHead className="text-right">Avg Daily Sales</TableHead>
                    <TableHead className="text-right">Days of Supply</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockAnalysis
                    .filter(item => item.stockStatus !== 'Normal')
                    .slice(0, 15)
                    .map((item, index) => (
                      <TableRow key={`${item.styleNumber}-${index}`} data-testid={`row-stock-analysis-${index}`}>
                        <TableCell className="font-mono text-sm">{item.styleNumber}</TableCell>
                        <TableCell className="max-w-xs truncate">{item.itemName}</TableCell>
                        <TableCell>{getClassificationBadge(item.classification)}</TableCell>
                        <TableCell className="text-right">{formatNumber(item.totalActiveQty)}</TableCell>
                        <TableCell className="text-right">{formatNumber(item.unitsSold)}</TableCell>
                        <TableCell className="text-right">{item.avgDailySales.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          {item.daysOfSupply < 999 ? item.daysOfSupply.toFixed(0) : '999+'}
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(item.inventoryValue)}</TableCell>
                        <TableCell>{getStockStatusBadge(item.stockStatus)}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No stock issues detected</p>
          )}
        </CardContent>
      </Card>

    </div>
  );
}

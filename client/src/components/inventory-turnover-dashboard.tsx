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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  ArrowRightLeft,
  ShoppingCart,
  Tag,
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

interface EnrichedStyleData extends StyleInventoryMetrics {
  unitsSold30d: number;
  unitsSold90d: number;
  salesVelocity: number;
  lastSaleDate: string | null;
  productTitle: string;
  keywords: string[];
  googleCategory: string;
  priority: number;
  budgetTier: string;
  segment: string;
  marginPerUnit: number;
}

interface ProductSegmentation {
  metadata: {
    generatedDate: string;
    totalStyles: number;
    totalActiveInventoryValue: number;
    analysisDateRange: string;
  };
  segments: {
    bestSellers: EnrichedStyleData[];
    coreHighFrequency: EnrichedStyleData[];
    coreMediumFrequency: EnrichedStyleData[];
    coreLowFrequency: EnrichedStyleData[];
    nonCoreRepeat: EnrichedStyleData[];
    oneTimePurchase: EnrichedStyleData[];
    newArrivals: EnrichedStyleData[];
    summerItems: EnrichedStyleData[];
    winterItems: EnrichedStyleData[];
    clearanceCandidates: EnrichedStyleData[];
  };
}

interface TransferRecommendation {
  styleNumber: string;
  itemName: string;
  category: string | null;
  fromStore: string;
  toStore: string;
  fromStoreQty: number;
  toStoreQty: number;
  fromStoreDailySales: number;
  toStoreDailySales: number;
  recommendedQty: number;
  priority: string;
  avgMarginPercent: number;
  mlPowered?: boolean;
  successProbability?: number;
  mlPriorityScore?: number;
  confidenceLevel?: 'High' | 'Medium' | 'Low';
  modelVersion?: string;
}

interface RestockingRecommendation {
  styleNumber: string;
  itemName: string;
  category: string | null;
  vendorName: string | null;
  totalActiveQty: number;
  avgDailySales: number;
  daysOfSupply: number;
  classification: string;
  lastReceived: string | null;
  daysSinceLastReceive: number | null;
  avgMarginPercent: number;
  recommendedOrderQty: number;
  priority: string;
}

interface SaleRecommendation {
  styleNumber: string;
  itemName: string;
  category: string | null;
  vendorName: string | null;
  totalActiveQty: number;
  inventoryValue: number;
  daysSinceLastSale: number | null;
  daysSinceLastReceive: number | null;
  unitsSold90d: number;
  avgCost: number;
  avgPrice: number;
  avgMarginPercent: number;
  classification: string;
  seasonalPattern: string;
  suggestedDiscountPercent: number;
  discountedPrice: number;
  projectedRecovery: number;
  reason: string;
  priority: string;
}

export default function InventoryTurnoverDashboard() {
  const [settings, setSettings] = useState<InventorySettings>(() => loadSettings());
  const [showClassificationBreakdown, setShowClassificationBreakdown] = useState(false);
  const [filterClassification, setFilterClassification] = useState<string>('all');
  const [filterSeasonalPattern, setFilterSeasonalPattern] = useState<string>('all');
  const [filterStockStatus, setFilterStockStatus] = useState<string>('all');
  const [excludeSeasonalHold, setExcludeSeasonalHold] = useState(true);
  const [useMLPredictions, setUseMLPredictions] = useState(false);

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

  const { data: transferRecommendations, isLoading: transferLoading } = useQuery<TransferRecommendation[]>({
    queryKey: ["inventory", "transfer-recommendations", useMLPredictions, 20],
    queryFn: async () => {
      const endpoint = useMLPredictions
        ? '/api/inventory/transfer-recommendations-ml'
        : '/api/inventory/transfer-recommendations';

      const response = await fetch(`${endpoint}?limit=20`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error("Failed to fetch transfer recommendations");
      return response.json();
    },
  });

  const { data: restockingRecommendations, isLoading: restockingLoading } = useQuery<RestockingRecommendation[]>({
    queryKey: ["inventory", "restocking-recommendations", 20],
    queryFn: async () => {
      const response = await fetch(`/api/inventory/restocking-recommendations?limit=20`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error("Failed to fetch restocking recommendations");
      return response.json();
    },
  });

  const { data: saleRecommendations, isLoading: saleLoading } = useQuery<SaleRecommendation[]>({
    queryKey: ["inventory", "sale-recommendations", 20],
    queryFn: async () => {
      const response = await fetch(`/api/inventory/sale-recommendations?limit=20`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error("Failed to fetch sale recommendations");
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
  const classificationBreakdown = segmentation?.segments ? [
    { name: 'Core High (40+)', styles: segmentation.segments.coreHighFrequency?.length ?? 0, value: segmentation.segments.coreHighFrequency?.reduce((sum: number, s: EnrichedStyleData) => sum + s.inventoryValue, 0) ?? 0 },
    { name: 'Core Medium (10-39)', styles: segmentation.segments.coreMediumFrequency?.length ?? 0, value: segmentation.segments.coreMediumFrequency?.reduce((sum: number, s: EnrichedStyleData) => sum + s.inventoryValue, 0) ?? 0 },
    { name: 'Core Low (6-9)', styles: segmentation.segments.coreLowFrequency?.length ?? 0, value: segmentation.segments.coreLowFrequency?.reduce((sum: number, s: EnrichedStyleData) => sum + s.inventoryValue, 0) ?? 0 },
    { name: 'Non-Core (2-5)', styles: segmentation.segments.nonCoreRepeat?.length ?? 0, value: segmentation.segments.nonCoreRepeat?.reduce((sum: number, s: EnrichedStyleData) => sum + s.inventoryValue, 0) ?? 0 },
    { name: 'One-Time (1)', styles: segmentation.segments.oneTimePurchase?.length ?? 0, value: segmentation.segments.oneTimePurchase?.reduce((sum: number, s: EnrichedStyleData) => sum + s.inventoryValue, 0) ?? 0 },
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

  const handleExportTransferRecommendations = () => {
    if (!transferRecommendations || transferRecommendations.length === 0) {
      alert('No data to export');
      return;
    }

    const fieldMapping: any = {
      styleNumber: 'Style Number',
      itemName: 'Item Name',
      category: 'Category',
      fromStore: 'From Store',
      toStore: 'To Store',
      fromStoreQty: 'From Store Qty',
      toStoreQty: 'To Store Qty',
      fromStoreDailySales: 'From Daily Sales',
      toStoreDailySales: 'To Daily Sales',
      recommendedQty: 'Recommended Transfer Qty',
      avgMarginPercent: 'Margin %',
      priority: 'Priority',
    };

    // Add ML fields if using ML predictions
    if (useMLPredictions && transferRecommendations[0]?.mlPowered) {
      fieldMapping.successProbability = 'Success Probability';
      fieldMapping.confidenceLevel = 'Confidence Level';
      fieldMapping.mlPriorityScore = 'ML Priority Score';
      fieldMapping.modelVersion = 'Model Version';
    }

    const exportData = formatDataForExport(transferRecommendations, fieldMapping);
    exportToExcel(exportData, 'transfer-recommendations', 'Transfer Recommendations');
  };

  const handleExportRestockingRecommendations = () => {
    if (!restockingRecommendations || restockingRecommendations.length === 0) {
      alert('No data to export');
      return;
    }

    const exportData = formatDataForExport(restockingRecommendations, {
      styleNumber: 'Style Number',
      itemName: 'Item Name',
      vendorName: 'Vendor',
      category: 'Category',
      classification: 'Classification',
      totalActiveQty: 'Current Stock',
      avgDailySales: 'Avg Daily Sales',
      daysOfSupply: 'Days of Supply',
      recommendedOrderQty: 'Suggested Order Qty',
      avgMarginPercent: 'Margin %',
      lastReceived: 'Last Received',
      daysSinceLastReceive: 'Days Since Receive',
      priority: 'Priority',
    });

    exportToExcel(exportData, 'restocking-recommendations', 'Restocking Recommendations');
  };

  const handleExportSaleRecommendations = () => {
    if (!saleRecommendations || saleRecommendations.length === 0) {
      alert('No data to export');
      return;
    }

    const exportData = formatDataForExport(saleRecommendations, {
      styleNumber: 'Style Number',
      itemName: 'Item Name',
      category: 'Category',
      vendorName: 'Vendor',
      classification: 'Classification',
      seasonalPattern: 'Seasonal Pattern',
      totalActiveQty: 'Current Stock',
      inventoryValue: 'Inventory Value',
      avgCost: 'Avg Cost',
      avgPrice: 'Current Price',
      suggestedDiscountPercent: 'Discount %',
      discountedPrice: 'Sale Price',
      projectedRecovery: 'Projected Recovery',
      avgMarginPercent: 'Margin %',
      daysSinceLastSale: 'Days Since Last Sale',
      daysSinceLastReceive: 'Days Since Receive',
      unitsSold90d: 'Units Sold (90d)',
      reason: 'Reason',
      priority: 'Priority',
    });

    exportToExcel(exportData, 'sale-recommendations', 'Sale Recommendations');
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

  const handleExportGoogleMarketing = () => {
    if (!segmentation) {
      alert('No segmentation data available');
      return;
    }

    const sheets: Array<{ data: Record<string, any>[]; sheetName: string }> = [];
    const { metadata, segments } = segmentation;

    // Sheet 1: Executive Summary
    sheets.push({
      data: [
        { 'Metric': 'Report Generated', 'Value': new Date(metadata.generatedDate).toLocaleDateString() },
        { 'Metric': 'Total Styles Analyzed', 'Value': formatNumber(metadata.totalStyles) },
        { 'Metric': 'Total Active Inventory Value', 'Value': formatCurrency(metadata.totalActiveInventoryValue) },
        { 'Metric': 'Analysis Date Range', 'Value': metadata.analysisDateRange },
        { 'Metric': '', 'Value': '' },
        { 'Metric': 'Segment Breakdown', 'Value': '' },
        { 'Metric': 'Best Sellers (Priority 5)', 'Value': segments.bestSellers.length },
        { 'Metric': 'Core Items - High (40+)', 'Value': segments.coreHighFrequency.length },
        { 'Metric': 'Core Items - Medium (10-39)', 'Value': segments.coreMediumFrequency.length },
        { 'Metric': 'Core Items - Low (6-9)', 'Value': segments.coreLowFrequency.length },
        { 'Metric': 'Non-Core Repeat (2-5)', 'Value': segments.nonCoreRepeat.length },
        { 'Metric': 'One-Time Purchase (1)', 'Value': segments.oneTimePurchase.length },
        { 'Metric': 'New Arrivals (Last 60 days)', 'Value': segments.newArrivals.length },
        { 'Metric': 'Summer Seasonal', 'Value': segments.summerItems.length },
        { 'Metric': 'Winter Seasonal', 'Value': segments.winterItems.length },
        { 'Metric': 'Clearance Candidates', 'Value': segments.clearanceCandidates.length },
      ],
      sheetName: 'Executive Summary',
    });

    // Sheet 2: Best Sellers (Priority 5)
    sheets.push({
      data: formatDataForExport(segments.bestSellers, {
        styleNumber: 'Style #',
        productTitle: 'Product Title (Google Optimized)',
        vendorName: 'Brand/Vendor',
        category: 'Category',
        totalActiveQty: 'Stock Available',
        avgSellingPrice: 'Retail Price',
        avgMarginPercent: 'Margin %',
        unitsSold30d: 'Sales (30d)',
        salesVelocity: 'Daily Sales Rate',
        inventoryValue: 'Inventory Value',
        budgetTier: 'Ad Budget Tier',
        keywords: 'Suggested Keywords',
        googleCategory: 'Google Product Category',
        priority: 'Campaign Priority (1-5)',
      }),
      sheetName: 'Best Sellers - Priority 5',
    });

    // Sheet 3: Core Items (Evergreen Campaigns)
    const allCoreItems = [...segments.coreHighFrequency, ...segments.coreMediumFrequency, ...segments.coreLowFrequency]
      .sort((a, b) => b.priority - a.priority);
    sheets.push({
      data: formatDataForExport(allCoreItems, {
        styleNumber: 'Style #',
        productTitle: 'Product Title',
        vendorName: 'Brand/Vendor',
        category: 'Category',
        classification: 'Core Tier',
        receiveCount: 'Times Ordered',
        totalActiveQty: 'Stock Available',
        unitsSold30d: 'Sales (30d)',
        avgMarginPercent: 'Margin %',
        inventoryValue: 'Inventory Value',
        budgetTier: 'Ad Budget Tier',
        priority: 'Campaign Priority (1-5)',
        keywords: 'Suggested Keywords',
      }),
      sheetName: 'Core Items - Evergreen',
    });

    // Sheet 4: New Arrivals
    sheets.push({
      data: formatDataForExport(segments.newArrivals, {
        styleNumber: 'Style #',
        productTitle: 'Product Title',
        vendorName: 'Brand/Vendor',
        category: 'Category',
        totalActiveQty: 'Stock Available',
        avgSellingPrice: 'Retail Price',
        marginPerUnit: 'Margin per Unit',
        inventoryValue: 'Inventory Value',
        lastReceived: 'Received Date',
        daysSinceLastReceive: 'Days Since Arrival',
        budgetTier: 'Ad Budget Tier',
        keywords: 'Suggested Keywords',
      }),
      sheetName: 'New Arrivals',
    });

    // Sheet 5: Summer Seasonal
    sheets.push({
      data: formatDataForExport(segments.summerItems, {
        styleNumber: 'Style #',
        productTitle: 'Product Title',
        vendorName: 'Brand/Vendor',
        totalActiveQty: 'Stock Available',
        avgSellingPrice: 'Retail Price',
        unitsSold30d: 'Sales (30d)',
        inventoryValue: 'Inventory Value',
        budgetTier: 'Ad Budget Tier',
        keywords: 'Suggested Keywords',
      }),
      sheetName: 'Seasonal - Summer',
    });

    // Sheet 6: Winter Seasonal
    sheets.push({
      data: formatDataForExport(segments.winterItems, {
        styleNumber: 'Style #',
        productTitle: 'Product Title',
        vendorName: 'Brand/Vendor',
        totalActiveQty: 'Stock Available',
        avgSellingPrice: 'Retail Price',
        unitsSold30d: 'Sales (30d)',
        inventoryValue: 'Inventory Value',
        budgetTier: 'Ad Budget Tier',
        keywords: 'Suggested Keywords',
      }),
      sheetName: 'Seasonal - Winter',
    });

    // Sheet 7: Clearance (Deep Discount Campaigns)
    sheets.push({
      data: formatDataForExport(segments.clearanceCandidates, {
        styleNumber: 'Style #',
        productTitle: 'Product Title',
        vendorName: 'Brand/Vendor',
        totalActiveQty: 'Stock to Clear',
        avgOrderCost: 'Our Cost',
        avgSellingPrice: 'Current Price',
        inventoryValue: 'Tied Up Capital',
        daysSinceLastReceive: 'Days Since Last Receive',
        keywords: 'Suggested Keywords',
      }),
      sheetName: 'Clearance - Discount Campaigns',
    });

    // Sheet 8: Google Shopping Feed Format (GMC-compliant)
    const feedItems = [
      ...segments.bestSellers,
      ...segments.coreHighFrequency.filter((s: EnrichedStyleData) => s.priority >= 3),
      ...segments.coreMediumFrequency.filter((s: EnrichedStyleData) => s.priority >= 3),
      ...segments.newArrivals,
    ];

    sheets.push({
      data: feedItems.map((item: EnrichedStyleData) => {
        // Generate rich description for Google Shopping
        const descriptionParts = [];
        if (item.vendorName) descriptionParts.push(item.vendorName);
        descriptionParts.push(item.itemName);
        if (item.category) descriptionParts.push(`Category: ${item.category}`);
        if (item.gender) descriptionParts.push(`Gender: ${item.gender}`);
        if (item.keywords.length > 0) {
          descriptionParts.push(`Keywords: ${item.keywords.slice(0, 5).join(', ')}`);
        }
        const description = descriptionParts.join(' | ');

        return {
          // Required GMC fields
          'id': item.styleNumber,
          'title': item.productTitle,
          'description': description.substring(0, 5000), // GMC limit
          'link': `https://yourstore.com/products/${item.styleNumber}`,
          'image_link': `https://yourstore.com/images/${item.styleNumber}.jpg`,
          'availability': item.totalActiveQty > 0 ? 'in stock' : 'out of stock',
          'price': `${item.avgSellingPrice.toFixed(2)} USD`,
          'condition': 'new',
          'brand': item.vendorName || 'Unknown',
          'google_product_category': item.googleCategory,
          
          // Recommended GMC fields
          'product_type': item.category || '',
          'mpn': item.styleNumber, // Use style number as manufacturer part number
          'gtin': '', // Leave blank if unknown (UPC/EAN/ISBN)
          
          // Custom labels for campaign targeting (0-4 allowed)
          'custom_label_0': item.segment, // Segment: Best Seller, Core High, etc.
          'custom_label_1': item.classification, // Classification tier
          'custom_label_2': item.seasonalPattern, // Seasonal pattern
          'custom_label_3': item.budgetTier, // Budget tier: High/Medium/Low
          'custom_label_4': `Priority ${item.priority}`, // Priority score 1-5
          
          // Additional useful fields
          'sale_price': item.avgMarginPercent >= 70 ? `${(item.avgSellingPrice * 0.8).toFixed(2)} USD` : '',
          'item_group_id': item.styleNumber, // Group by style for size variations
        };
      }),
      sheetName: 'Google Shopping Feed',
    });

    exportMultipleSheetsToExcel(sheets, `product-segmentation-report-${new Date().toISOString().split('T')[0]}`);
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
        <div className="flex gap-2">
          <Button
            onClick={handleExportGoogleMarketing}
            variant="default"
            className="gap-2"
            data-testid="button-export-google-marketing"
          >
            <Download className="w-4 h-4" />
            Export Google Marketing Report
          </Button>
          <Button
            onClick={handleExportAll}
            variant="outline"
            className="gap-2"
            data-testid="button-export-all"
          >
            <Download className="w-4 h-4" />
            Export All to Excel
          </Button>
        </div>
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

      {/* Transfer Recommendations */}
      <Card data-testid="card-transfer-recommendations">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-blue-600" />
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle>Transfer Recommendations</CardTitle>
                  {useMLPredictions && transferRecommendations?.[0]?.mlPowered && (
                    <Badge variant="default" className="bg-purple-600">
                      🤖 AI-Powered
                    </Badge>
                  )}
                </div>
                <CardDescription>
                  {useMLPredictions
                    ? "Machine learning predictions based on 90 days of sales patterns"
                    : "Move inventory from slow stores to fast-selling stores (showing top 20)"}
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {/* ML Toggle Switch */}
              <div className="flex items-center gap-2">
                <Label htmlFor="ml-toggle" className="text-sm">Use AI</Label>
                <Switch
                  id="ml-toggle"
                  checked={useMLPredictions}
                  onCheckedChange={setUseMLPredictions}
                />
              </div>

              <Button
                onClick={handleExportTransferRecommendations}
                variant="outline"
                size="sm"
                className="gap-2"
                data-testid="button-export-transfer-recommendations"
              >
                <Download className="w-3 h-3" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {transferLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading transfer recommendations...</p>
          ) : transferRecommendations && transferRecommendations.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Style #</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>From Store</TableHead>
                    <TableHead>To Store</TableHead>
                    <TableHead className="text-right">Transfer Qty</TableHead>
                    <TableHead className="text-right">From Stock</TableHead>
                    <TableHead className="text-right">To Stock</TableHead>
                    <TableHead className="text-right">From Sales/Day</TableHead>
                    <TableHead className="text-right">To Sales/Day</TableHead>
                    {useMLPredictions && <TableHead className="text-right">Confidence</TableHead>}
                    <TableHead>Priority</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transferRecommendations.map((item, index) => (
                    <TableRow key={`${item.styleNumber}-${item.fromStore}-${item.toStore}-${index}`} data-testid={`row-transfer-${index}`}>
                      <TableCell className="font-mono text-sm">{item.styleNumber}</TableCell>
                      <TableCell className="max-w-xs truncate">{item.itemName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">{item.fromStore}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono bg-blue-50">{item.toStore}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">{formatNumber(item.recommendedQty)}</TableCell>
                      <TableCell className="text-right">{formatNumber(item.fromStoreQty)}</TableCell>
                      <TableCell className="text-right">{formatNumber(item.toStoreQty)}</TableCell>
                      <TableCell className="text-right">{item.fromStoreDailySales.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-blue-600 font-semibold">{item.toStoreDailySales.toFixed(2)}</TableCell>
                      {useMLPredictions && (
                        <TableCell className="text-right">
                          {item.mlPowered && item.successProbability ? (
                            <Badge
                              variant={
                                item.confidenceLevel === 'High' ? 'default' :
                                item.confidenceLevel === 'Medium' ? 'secondary' :
                                'outline'
                              }
                              className={
                                item.confidenceLevel === 'High' ? 'bg-green-600' :
                                item.confidenceLevel === 'Medium' ? 'bg-yellow-600' :
                                'bg-gray-400'
                              }
                            >
                              {(item.successProbability * 100).toFixed(0)}%
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        <Badge variant={item.priority === 'High' ? 'destructive' : item.priority === 'Medium' ? 'default' : 'secondary'}>
                          {item.priority}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No transfer opportunities found</p>
          )}
        </CardContent>
      </Card>

      {/* Restocking Recommendations */}
      <Card data-testid="card-restocking-recommendations">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-green-600" />
              <div>
                <CardTitle>Restocking Recommendations</CardTitle>
                <CardDescription>
                  Core items approaching stockout or with low days of supply (showing top 20)
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={handleExportRestockingRecommendations}
              variant="outline"
              size="sm"
              className="gap-2"
              data-testid="button-export-restocking-recommendations"
            >
              <Download className="w-3 h-3" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {restockingLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading restocking recommendations...</p>
          ) : restockingRecommendations && restockingRecommendations.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Style #</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Classification</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Avg Daily Sales</TableHead>
                    <TableHead className="text-right">Days of Supply</TableHead>
                    <TableHead className="text-right">Suggested Order Qty</TableHead>
                    <TableHead className="text-right">Margin %</TableHead>
                    <TableHead>Priority</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {restockingRecommendations.map((item, index) => (
                    <TableRow key={`${item.styleNumber}-${index}`} data-testid={`row-restocking-${index}`}>
                      <TableCell className="font-mono text-sm">{item.styleNumber}</TableCell>
                      <TableCell className="max-w-xs truncate">{item.itemName}</TableCell>
                      <TableCell className="max-w-xs truncate">{item.vendorName || 'Unknown'}</TableCell>
                      <TableCell>{getClassificationBadge(item.classification)}</TableCell>
                      <TableCell className="text-right">{formatNumber(item.totalActiveQty)}</TableCell>
                      <TableCell className="text-right">{item.avgDailySales.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <span className={item.daysOfSupply < 7 ? 'text-red-600 font-semibold' : ''}>
                          {item.daysOfSupply < 999 ? item.daysOfSupply.toFixed(0) : '999+'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {formatNumber(item.recommendedOrderQty)}
                      </TableCell>
                      <TableCell className="text-right">{item.avgMarginPercent.toFixed(1)}%</TableCell>
                      <TableCell>
                        <Badge variant={item.priority === 'High' ? 'destructive' : item.priority === 'Medium' ? 'default' : 'secondary'}>
                          {item.priority}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No restocking needed at this time</p>
          )}
        </CardContent>
      </Card>

      {/* Sale Recommendations */}
      <Card data-testid="card-sale-recommendations">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-orange-600" />
              <div>
                <CardTitle>Sale Recommendations</CardTitle>
                <CardDescription>
                  Items recommended for markdown or clearance (showing top 20)
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={handleExportSaleRecommendations}
              variant="outline"
              size="sm"
              className="gap-2"
              data-testid="button-export-sale-recommendations"
            >
              <Download className="w-3 h-3" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {saleLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading sale recommendations...</p>
          ) : saleRecommendations && saleRecommendations.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Style #</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Current Stock</TableHead>
                    <TableHead className="text-right">Inventory Value</TableHead>
                    <TableHead className="text-right">Current Price</TableHead>
                    <TableHead className="text-right">Discount %</TableHead>
                    <TableHead className="text-right">Sale Price</TableHead>
                    <TableHead className="text-right">Projected Recovery</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Priority</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {saleRecommendations.map((item, index) => (
                    <TableRow key={`${item.styleNumber}-${index}`} data-testid={`row-sale-${index}`}>
                      <TableCell className="font-mono text-sm">{item.styleNumber}</TableCell>
                      <TableCell className="max-w-xs truncate">{item.itemName}</TableCell>
                      <TableCell className="max-w-xs truncate">{item.category || 'Uncategorized'}</TableCell>
                      <TableCell className="text-right">{formatNumber(item.totalActiveQty)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(item.inventoryValue)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.avgPrice)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={item.suggestedDiscountPercent >= 50 ? 'destructive' : 'default'} className="font-semibold">
                          {item.suggestedDiscountPercent}% OFF
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-orange-600 font-semibold">
                        {formatCurrency(item.discountedPrice)}
                      </TableCell>
                      <TableCell className="text-right text-green-600 font-semibold">
                        {formatCurrency(item.projectedRecovery)}
                      </TableCell>
                      <TableCell className="max-w-sm text-sm text-muted-foreground">
                        {item.reason}
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.priority === 'High' ? 'destructive' : item.priority === 'Medium' ? 'default' : 'secondary'}>
                          {item.priority}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No items recommended for sale at this time</p>
          )}
        </CardContent>
      </Card>

    </div>
  );
}

import { useState, useEffect, useMemo } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { NetworkLevelRestocking } from "@/components/NetworkLevelRestocking";

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
  skuDetails?: Array<{
    sku: string;
    color: string | null;
    size: string | null;
    fromStoreQty: number;
    toStoreQty: number;
    fromStoreDailySales: number;
    toStoreDailySales: number;
  }>;
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

// Phase 2: Prepack Recommendations (Color-Aware)
interface PrepackColorBreakdown {
  color: string;
  pack_name: string;
  boxes: number;
  total_pieces: number;
  cost_per_box: number;
  total_cost: number;
}

interface PrepackRecommendation {
  style_number: string;
  item_name: string;
  vendor_name: string;
  days_of_supply: number;
  avg_daily_sales: number;
  recommendation: string;
  total_boxes: number;
  total_cost: number;
  color_breakdown: PrepackColorBreakdown[];
  urgency: string;
  distributionPlan?: {
    plan: {
      planId: string;
      styleNumber: string;
      vendorName: string;
      totalBoxes: number;
      totalPieces: number;
      totalCost: string;
      status: string;
      orderDate?: string;
      expectedArrivalDate?: string;
    };
    details: Array<{
      phase: 'initial' | 'reserve';
      targetStore?: string;
      sku: string;
      color: string;
      size: string;
      quantity: number;
      priority?: string;
      rationale?: string;
      status?: string;
    }>;
  };
}

export default function InventoryTurnoverDashboard() {
  const [settings, setSettings] = useState<InventorySettings>(() => loadSettings());
  const [showClassificationBreakdown, setShowClassificationBreakdown] = useState(false);
  const [filterClassification, setFilterClassification] = useState<string>('all');
  const [filterSeasonalPattern, setFilterSeasonalPattern] = useState<string>('all');
  const [filterStockStatus, setFilterStockStatus] = useState<string>('all');
  const [excludeSeasonalHold, setExcludeSeasonalHold] = useState(true);
  const [useMLPredictions, setUseMLPredictions] = useState(false);
  const [expandedPrepackRows, setExpandedPrepackRows] = useState<Set<string>>(new Set());
  const [expandedTransferRows, setExpandedTransferRows] = useState<Set<string>>(new Set());

  // Transfer Recommendations filters and sorting
  const [transferFilterVendor, setTransferFilterVendor] = useState<string>('all');
  const [transferFilterCategory, setTransferFilterCategory] = useState<string>('all');
  const [transferFilterFromStore, setTransferFilterFromStore] = useState<string>('all');
  const [transferFilterToStore, setTransferFilterToStore] = useState<string>('all');
  const [transferSortBy, setTransferSortBy] = useState<'priority' | 'qty' | 'velocity'>('priority');
  const [transferVelocityDays, setTransferVelocityDays] = useState<number>(60); // Default to 60 days

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
    queryKey: ["inventory", "transfer-recommendations", useMLPredictions, 50, transferVelocityDays],
    queryFn: async () => {
      const endpoint = useMLPredictions
        ? '/api/inventory/transfer-recommendations-ml'
        : '/api/inventory/transfer-recommendations-sku'; // Changed to SKU endpoint for color/size breakdown

      const response = await fetch(`${endpoint}?limit=50&days=${transferVelocityDays}`, {
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

  // Phase 2: Prepack Restocking Recommendations (Color-Aware) with Distribution Plans
  const { data: prepackRecommendationsData, isLoading: prepackLoading } = useQuery<{
    success: boolean;
    count: number;
    recommendations: PrepackRecommendation[];
  }>({
    queryKey: ["inventory", "prepack-restocking-with-distribution", 20],
    queryFn: async () => {
      const response = await fetch(`/api/inventory/prepack-restocking-with-distribution?limit=20`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error("Failed to fetch prepack restocking recommendations");
      return response.json();
    },
  });

  const prepackRecommendations = prepackRecommendationsData?.recommendations || [];

  // Filter and sort transfer recommendations
  const filteredAndSortedTransferRecommendations = useMemo(() => {
    if (!transferRecommendations) return [];

    // Apply filters
    let filtered = transferRecommendations.filter(item => {
      // Vendor filter (we need to get vendor from styleMetrics since transfer recs don't include it)
      if (transferFilterVendor !== 'all') {
        const styleMetric = styleMetrics?.find(m => m.styleNumber === item.styleNumber);
        if (!styleMetric || styleMetric.vendorName !== transferFilterVendor) {
          return false;
        }
      }

      // Category filter
      if (transferFilterCategory !== 'all' && item.category !== transferFilterCategory) {
        return false;
      }

      // From Store filter
      if (transferFilterFromStore !== 'all' && item.fromStore !== transferFilterFromStore) {
        return false;
      }

      // To Store filter
      if (transferFilterToStore !== 'all' && item.toStore !== transferFilterToStore) {
        return false;
      }

      return true;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      if (transferSortBy === 'priority') {
        const priorityOrder = { High: 1, Medium: 2, Low: 3 };
        return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
      } else if (transferSortBy === 'qty') {
        return b.recommendedQty - a.recommendedQty;
      } else if (transferSortBy === 'velocity') {
        return (b.toStoreDailySales - b.fromStoreDailySales) - (a.toStoreDailySales - a.fromStoreDailySales);
      }
      return 0;
    });

    return filtered;
  }, [transferRecommendations, transferFilterVendor, transferFilterCategory, transferFilterFromStore, transferFilterToStore, transferSortBy, styleMetrics]);

  // Extract unique values for filter dropdowns
  const uniqueVendors = useMemo(() => {
    if (!styleMetrics) return [];
    const vendors = new Set(styleMetrics.map(m => m.vendorName).filter(Boolean));
    return Array.from(vendors).sort();
  }, [styleMetrics]);

  const uniqueCategories = useMemo(() => {
    if (!transferRecommendations) return [];
    const categories = new Set(transferRecommendations.map(r => r.category).filter(Boolean));
    return Array.from(categories).sort();
  }, [transferRecommendations]);

  const uniqueStores = ['GM', 'HM', 'NM', 'LM'];

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

  // Helper function to calculate SKU-level transfer allocations (shared by UI and export)
  const calculateSkuAllocations = (item: TransferRecommendation) => {
    if (!item.skuDetails || item.skuDetails.length === 0) {
      console.warn(`[SKU Allocation] ${item.styleNumber} ${item.fromStore}→${item.toStore}: No skuDetails array`);
      return [];
    }

    const totalUnitsToTransfer = item.recommendedQty;

    // DEBUG: Log SKU details for troubleshooting
    if (item.skuDetails.every(sku => sku.fromStoreQty <= 0)) {
      console.warn(`[SKU Allocation] ${item.styleNumber} ${item.fromStore}→${item.toStore}:`, {
        skuCount: item.skuDetails.length,
        totalRecommended: totalUnitsToTransfer,
        skus: item.skuDetails.map(s => ({ sku: s.sku, size: s.size, fromQty: s.fromStoreQty })),
        issue: 'All SKUs have 0 stock at source store'
      });
    }
    const hasAnyVelocity = item.skuDetails.some(sku => sku.toStoreDailySales > 0);

    // Calculate transfer scores for each SKU
    const skusWithScores = item.skuDetails.map(sku => {
      if (sku.fromStoreQty <= 0) {
        return { ...sku, transferScore: 0, maxTransferable: 0, reason: 'No stock at source', recommendedTransferQty: 0 };
      }

      let transferScore = 0;
      let urgencyLabel = '';
      const maxTransferable = sku.fromStoreQty;

      if (hasAnyVelocity) {
        // MODE 1: VELOCITY-BASED
        const baseVelocity = sku.toStoreDailySales || 0;
        let stockoutMultiplier = 1;

        if (sku.toStoreQty === 0) {
          stockoutMultiplier = 10;
          urgencyLabel = 'OUT - High velocity';
        } else if (sku.toStoreQty <= 2) {
          stockoutMultiplier = 5;
          urgencyLabel = 'Low stock - High velocity';
        } else {
          urgencyLabel = 'In stock';
        }

        transferScore = baseVelocity * stockoutMultiplier;
      } else {
        // MODE 2: STOCKOUT-FIRST FALLBACK
        const styleVelocity = item.toStoreDailySales || 0;

        if (sku.toStoreQty === 0) {
          transferScore = 1000 + styleVelocity;
          urgencyLabel = 'OUT';
        } else if (sku.toStoreQty <= 2) {
          transferScore = 500 + styleVelocity;
          urgencyLabel = 'Low stock';
        } else if (sku.toStoreQty <= 5) {
          // Give moderate priority to sizes with moderate stock
          transferScore = 100 + styleVelocity;
          urgencyLabel = 'Restock';
        } else {
          // Even if well-stocked, give small score to allow some allocation
          transferScore = 10;
          urgencyLabel = 'Replenishment';
        }
      }

      return {
        ...sku,
        transferScore,
        maxTransferable,
        reason: urgencyLabel,
        recommendedTransferQty: 0
      };
    });

    // Sort by transfer score
    const sortedSkus = [...skusWithScores].sort((a, b) => b.transferScore - a.transferScore);

    // Allocate units
    let remainingUnits = totalUnitsToTransfer;
    const skusWithAllocations = sortedSkus.map(sku => {
      if (remainingUnits <= 0 || sku.transferScore === 0) {
        return { ...sku, recommendedTransferQty: 0 };
      }

      const maxToAllocate = Math.min(
        remainingUnits,
        sku.maxTransferable,
        2 // Max 2 units per SKU to spread across varieties
      );

      remainingUnits -= maxToAllocate;
      return { ...sku, recommendedTransferQty: maxToAllocate };
    });

    // Return only SKUs with transfer recommendations
    return skusWithAllocations.filter(sku => sku.recommendedTransferQty > 0);
  };

  const handleExportTransferRecommendations = () => {
    if (!filteredAndSortedTransferRecommendations || filteredAndSortedTransferRecommendations.length === 0) {
      alert('No data to export');
      return;
    }

    // Define field mapping (used for all sheets)
    const fieldMapping: any = {
      styleNumber: 'Style Number',
      itemName: 'Item Name',
      category: 'Category',
      fromStore: 'From Store',
      toStore: 'To Store',
      priority: 'Priority',
      styleMargin: 'Margin %',

      sku: 'SKU',
      color: 'Color',
      size: 'Size',
      skuFromQty: 'SKU From Qty',
      skuToQty: 'SKU To Qty',
      skuVelocity: 'SKU Velocity/Day',
      transferQty: 'Transfer Qty',
      reason: 'Reason',

      styleTotalFromQty: 'Style Total From',
      styleTotalToQty: 'Style Total To',
      styleRecommendedQty: 'Style Recommended Qty',
      styleFromDailySales: 'Style From Daily Sales',
      styleToDailySales: 'Style To Daily Sales',
    };

    // Group recommendations by "From Store → To Store" combination
    const groupedByStores = filteredAndSortedTransferRecommendations.reduce((acc, item) => {
      const key = `${item.fromStore}-${item.toStore}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {} as Record<string, typeof filteredAndSortedTransferRecommendations>);

    // Create sheets array - one sheet per store combination
    const sheets = Object.entries(groupedByStores).map(([key, items]) => {
      const [fromStore, toStore] = key.split('-');

      // Flatten SKU details for this group - ONLY include SKUs with transfer recommendations
      const flattenedData = items.flatMap(item => {
        // Calculate which SKUs should be transferred (same logic as UI)
        const skusToTransfer = calculateSkuAllocations(item);

        if (skusToTransfer.length > 0) {
          // One row per SKU that needs transfer
          return skusToTransfer.map(sku => ({
            styleNumber: item.styleNumber,
            itemName: item.itemName,
            category: item.category || 'N/A',
            fromStore: item.fromStore,
            toStore: item.toStore,
            priority: item.priority,
            styleMargin: item.avgMarginPercent,

            // SKU-specific fields
            sku: sku.sku,
            color: sku.color || 'N/A',
            size: sku.size || 'N/A',
            skuFromQty: sku.fromStoreQty,
            skuToQty: sku.toStoreQty,
            skuVelocity: sku.toStoreDailySales || 0,
            transferQty: sku.recommendedTransferQty, // NEW: include transfer quantity
            reason: sku.reason, // NEW: include reason

            // Style-level totals
            styleTotalFromQty: item.fromStoreQty,
            styleTotalToQty: item.toStoreQty,
            styleRecommendedQty: item.recommendedQty,
            styleFromDailySales: item.fromStoreDailySales,
            styleToDailySales: item.toStoreDailySales,

            // ML fields if available
            ...(item.mlPowered ? {
              successProbability: item.successProbability,
              confidenceLevel: item.confidenceLevel,
              mlPriorityScore: item.mlPriorityScore,
              modelVersion: item.modelVersion,
            } : {}),
          }));
        } else {
          // No SKU details - just export style-level row
          return [{
            styleNumber: item.styleNumber,
            itemName: item.itemName,
            category: item.category || 'N/A',
            fromStore: item.fromStore,
            toStore: item.toStore,
            priority: item.priority,
            styleMargin: item.avgMarginPercent,
            sku: 'N/A',
            color: 'N/A',
            size: 'N/A',
            skuFromQty: item.fromStoreQty,
            skuToQty: item.toStoreQty,
            skuVelocity: 0,
            transferQty: item.recommendedQty,
            reason: 'Style-level only',
            styleTotalFromQty: item.fromStoreQty,
            styleTotalToQty: item.toStoreQty,
            styleRecommendedQty: item.recommendedQty,
            styleFromDailySales: item.fromStoreDailySales,
            styleToDailySales: item.toStoreDailySales,

            ...(item.mlPowered ? {
              successProbability: item.successProbability,
              confidenceLevel: item.confidenceLevel,
              mlPriorityScore: item.mlPriorityScore,
              modelVersion: item.modelVersion,
            } : {}),
          }];
        }
      });

      // Add ML fields to mapping if using ML predictions
      const sheetFieldMapping = { ...fieldMapping };
      if (useMLPredictions && flattenedData[0]?.successProbability !== undefined) {
        sheetFieldMapping.successProbability = 'Success Probability';
        sheetFieldMapping.confidenceLevel = 'Confidence Level';
        sheetFieldMapping.mlPriorityScore = 'ML Priority Score';
        sheetFieldMapping.modelVersion = 'Model Version';
      }

      return {
        data: formatDataForExport(flattenedData, sheetFieldMapping),
        sheetName: `${fromStore} to ${toStore}`,
      };
    });

    const fileName = `transfer-recommendations-${transferFilterVendor !== 'all' ? transferFilterVendor + '-' : ''}${transferFilterFromStore !== 'all' ? transferFilterFromStore + '-' : ''}${new Date().toISOString().split('T')[0]}`;
    exportMultipleSheetsToExcel(sheets, fileName);
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

  const handleExportPrepackRecommendations = () => {
    if (!prepackRecommendations || prepackRecommendations.length === 0) {
      alert('No data to export');
      return;
    }

    // Flatten the data: one row per color breakdown entry
    const flattenedData = prepackRecommendations.flatMap(item => {
      if (item.color_breakdown && item.color_breakdown.length > 0) {
        return item.color_breakdown.map(color => ({
          styleNumber: item.style_number,
          itemName: item.item_name,
          vendorName: item.vendor_name,
          urgency: item.urgency,
          daysOfSupply: item.days_of_supply.toFixed(1),
          avgDailySales: item.avg_daily_sales.toFixed(2),
          recommendation: item.recommendation,
          color: color.color,
          packName: color.pack_name,
          boxes: color.boxes,
          totalPieces: color.total_pieces,
          costPerBox: color.cost_per_box,
          colorTotalCost: color.total_cost,
          styleTotalBoxes: item.total_boxes,
          styleTotalCost: item.total_cost,
        }));
      } else {
        // If no color breakdown, export one row with just the style info
        return [{
          styleNumber: item.style_number,
          itemName: item.item_name,
          vendorName: item.vendor_name,
          urgency: item.urgency,
          daysOfSupply: item.days_of_supply.toFixed(1),
          avgDailySales: item.avg_daily_sales.toFixed(2),
          recommendation: item.recommendation,
          color: '',
          packName: '',
          boxes: '',
          totalPieces: '',
          costPerBox: '',
          colorTotalCost: '',
          styleTotalBoxes: item.total_boxes,
          styleTotalCost: item.total_cost,
        }];
      }
    });

    const exportData = formatDataForExport(flattenedData, {
      styleNumber: 'Style Number',
      itemName: 'Item Name',
      vendorName: 'Vendor',
      urgency: 'Urgency',
      daysOfSupply: 'Days of Supply',
      avgDailySales: 'Avg Daily Sales',
      color: 'Color',
      packName: 'Pack Name',
      boxes: 'Boxes to Order',
      totalPieces: 'Total Pieces',
      costPerBox: 'Cost per Box',
      colorTotalCost: 'Color Total Cost',
      styleTotalBoxes: 'Style Total Boxes',
      styleTotalCost: 'Style Total Cost',
      recommendation: 'Recommendation',
    });

    exportToExcel(exportData, 'prepack-restocking-recommendations', 'Prepack Recommendations');
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
          ) : filteredAndSortedTransferRecommendations && filteredAndSortedTransferRecommendations.length > 0 ? (
            <div className="space-y-4">
              {/* Filters and Sorting Controls */}
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                  {/* Vendor Filter */}
                  <div className="space-y-1.5">
                    <Label htmlFor="filter-vendor" className="text-xs font-medium">Vendor</Label>
                    <Select value={transferFilterVendor} onValueChange={setTransferFilterVendor}>
                      <SelectTrigger id="filter-vendor" className="h-9">
                        <SelectValue placeholder="All Vendors" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Vendors</SelectItem>
                        {uniqueVendors.filter(v => v !== null).map(vendor => (
                          <SelectItem key={vendor} value={vendor as string}>{vendor}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Category Filter */}
                  <div className="space-y-1.5">
                    <Label htmlFor="filter-category" className="text-xs font-medium">Category</Label>
                    <Select value={transferFilterCategory} onValueChange={setTransferFilterCategory}>
                      <SelectTrigger id="filter-category" className="h-9">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        {uniqueCategories.filter(c => c !== null).map(category => (
                          <SelectItem key={category} value={category as string}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* From Store Filter */}
                  <div className="space-y-1.5">
                    <Label htmlFor="filter-from-store" className="text-xs font-medium">From Store</Label>
                    <Select value={transferFilterFromStore} onValueChange={setTransferFilterFromStore}>
                      <SelectTrigger id="filter-from-store" className="h-9">
                        <SelectValue placeholder="All Stores" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Stores</SelectItem>
                        {uniqueStores.map(store => (
                          <SelectItem key={store} value={store}>{store}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* To Store Filter */}
                  <div className="space-y-1.5">
                    <Label htmlFor="filter-to-store" className="text-xs font-medium">To Store</Label>
                    <Select value={transferFilterToStore} onValueChange={setTransferFilterToStore}>
                      <SelectTrigger id="filter-to-store" className="h-9">
                        <SelectValue placeholder="All Stores" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Stores</SelectItem>
                        {uniqueStores.map(store => (
                          <SelectItem key={store} value={store}>{store}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sort By */}
                  <div className="space-y-1.5">
                    <Label htmlFor="sort-by" className="text-xs font-medium">Sort By</Label>
                    <Select value={transferSortBy} onValueChange={(value: 'priority' | 'qty' | 'velocity') => setTransferSortBy(value)}>
                      <SelectTrigger id="sort-by" className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="priority">Priority</SelectItem>
                        <SelectItem value="qty">Transfer Quantity</SelectItem>
                        <SelectItem value="velocity">Velocity Gap</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Velocity Time Window */}
                  <div className="space-y-1.5">
                    <Label htmlFor="velocity-days" className="text-xs font-medium">Velocity Window</Label>
                    <Select value={transferVelocityDays.toString()} onValueChange={(value) => setTransferVelocityDays(parseInt(value))}>
                      <SelectTrigger id="velocity-days" className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">Last 30 Days</SelectItem>
                        <SelectItem value="60">Last 60 Days</SelectItem>
                        <SelectItem value="90">Last 90 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <Badge variant="secondary" className="text-xs">
                    Showing {filteredAndSortedTransferRecommendations.length} of {transferRecommendations?.length || 0} transfers
                  </Badge>
                  {(transferFilterVendor !== 'all' || transferFilterCategory !== 'all' || transferFilterFromStore !== 'all' || transferFilterToStore !== 'all') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setTransferFilterVendor('all');
                        setTransferFilterCategory('all');
                        setTransferFilterFromStore('all');
                        setTransferFilterToStore('all');
                      }}
                      className="text-xs h-7"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>

              {/* Expandable Transfer Rows */}
              <div className="space-y-3">
                {filteredAndSortedTransferRecommendations.map((item, index) => {
                  const rowKey = `${item.styleNumber}-${item.fromStore}-${item.toStore}`;
                  const isExpanded = expandedTransferRows.has(rowKey);
                  const toggleRow = () => {
                    const newExpanded = new Set(expandedTransferRows);
                    if (isExpanded) {
                      newExpanded.delete(rowKey);
                    } else {
                      newExpanded.add(rowKey);
                    }
                    setExpandedTransferRows(newExpanded);
                  };

                  return (
                    <div key={`${rowKey}-${index}`} className="border rounded-lg overflow-hidden">
                      {/* Collapsed Row - Transfer Summary */}
                      <div
                        className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={toggleRow}
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            <div className="col-span-2 md:col-span-1">
                              <p className="font-mono text-sm font-semibold">{item.styleNumber}</p>
                              <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                {item.itemName}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">From Store</p>
                              <Badge variant="outline" className="font-mono mt-1">{item.fromStore}</Badge>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">To Store</p>
                              <Badge variant="outline" className="font-mono bg-blue-50 mt-1">{item.toStore}</Badge>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Transfer Qty</p>
                              <p className="text-sm font-semibold">{formatNumber(item.recommendedQty)} units</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Velocity Gap</p>
                              <p className="text-sm font-semibold text-blue-600">
                                {(item.toStoreDailySales - item.fromStoreDailySales).toFixed(2)}/day
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Priority</p>
                              <Badge
                                variant={item.priority === 'High' ? 'destructive' : item.priority === 'Medium' ? 'default' : 'secondary'}
                                className="mt-1"
                              >
                                {item.priority}
                              </Badge>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="self-start lg:self-auto">
                            {isExpanded ? '▼ Hide Details' : '► Show Details'}
                          </Button>
                        </div>
                      </div>

                      {/* Expanded Row - SKU-Level Color/Size Breakdown */}
                      {isExpanded && (
                        <div className="border-t bg-muted/20 p-4">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Left Column: SKU Breakdown */}
                            <div>
                              <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <Package className="w-4 h-4" />
                                Which Items to Transfer
                              </h4>
                              {item.skuDetails && item.skuDetails.length > 0 ? (
                                (() => {
                                  // RESPECT THE BACKEND'S RECOMMENDED TOTAL QUANTITY
                                  const totalUnitsToTransfer = item.recommendedQty; // e.g., 9 units

                                  // Check if we have any SKU-level velocity data
                                  const hasAnyVelocity = item.skuDetails.some(sku => sku.toStoreDailySales > 0);

                                  // HYBRID PRIORITY ALGORITHM
                                  const skusWithScores = item.skuDetails.map(sku => {
                                    // Only consider SKUs where source has stock
                                    if (sku.fromStoreQty <= 0) {
                                      return { ...sku, transferScore: 0, maxTransferable: 0, reason: 'No stock at source' };
                                    }

                                    let transferScore = 0;
                                    let urgencyLabel = '';

                                    if (hasAnyVelocity) {
                                      // MODE 1: VELOCITY-BASED (when we have SKU-level sales data)
                                      const baseVelocity = sku.toStoreDailySales || 0;

                                      let stockoutMultiplier = 1;
                                      if (sku.toStoreQty === 0) {
                                        stockoutMultiplier = 10;
                                        urgencyLabel = 'OUT - High velocity';
                                      } else if (sku.toStoreQty === 1) {
                                        stockoutMultiplier = 5;
                                        urgencyLabel = 'Low stock - High velocity';
                                      } else if (sku.toStoreQty === 2) {
                                        stockoutMultiplier = 2;
                                        urgencyLabel = 'Low stock';
                                      } else if (sku.toStoreQty <= 4) {
                                        stockoutMultiplier = 1.2;
                                        urgencyLabel = 'Moderate stock';
                                      } else {
                                        stockoutMultiplier = 1;
                                        urgencyLabel = 'Balance inventory';
                                      }

                                      const marginBonus = item.avgMarginPercent > 60 ? 1.2 : 1.0;
                                      const inventoryGap = sku.fromStoreQty - sku.toStoreQty;
                                      const gapBonus = inventoryGap > 3 ? 1.5 : (inventoryGap > 1 ? 1.2 : 1.0);

                                      transferScore = baseVelocity * stockoutMultiplier * marginBonus * gapBonus;
                                    } else {
                                      // MODE 2: STOCKOUT-FIRST FALLBACK (when no SKU velocity data)
                                      // Use style-level velocity to estimate importance
                                      const styleVelocity = item.toStoreDailySales || 0;

                                      if (sku.toStoreQty === 0) {
                                        // Critical: Out of stock at high-velocity store
                                        transferScore = 1000 + sku.fromStoreQty + (styleVelocity * 100);
                                        urgencyLabel = 'OUT - Replenish';
                                      } else if (sku.toStoreQty === 1) {
                                        // Urgent: Almost out
                                        transferScore = 500 + sku.fromStoreQty + (styleVelocity * 50);
                                        urgencyLabel = 'Low stock';
                                      } else if (sku.toStoreQty === 2) {
                                        // Warning: Low stock
                                        transferScore = 200 + sku.fromStoreQty + (styleVelocity * 20);
                                        urgencyLabel = 'Low stock';
                                      } else if (sku.fromStoreQty > sku.toStoreQty + 3) {
                                        // Balance large gaps
                                        const gap = sku.fromStoreQty - sku.toStoreQty;
                                        transferScore = gap * 10 + sku.fromStoreQty;
                                        urgencyLabel = 'Balance inventory';
                                      } else {
                                        transferScore = 1;
                                        urgencyLabel = 'Maintain variety';
                                      }
                                    }

                                    // Calculate max units we can transfer from this SKU
                                    const maxTransferable = Math.min(
                                      sku.fromStoreQty,
                                      Math.ceil(sku.fromStoreQty / 2) // Don't deplete source completely
                                    );

                                    return {
                                      ...sku,
                                      transferScore,
                                      maxTransferable,
                                      reason: urgencyLabel
                                    };
                                  });

                                  // Sort by transfer score (highest priority first)
                                  const sortedSkus = skusWithScores.sort((a, b) => b.transferScore - a.transferScore);

                                  // ALLOCATE THE RECOMMENDED QUANTITY ACROSS TOP PRIORITY SKUs
                                  let remainingUnits = totalUnitsToTransfer;
                                  const skusWithAllocations = sortedSkus.map(sku => {
                                    if (remainingUnits <= 0 || sku.transferScore === 0) {
                                      return { ...sku, recommendedTransferQty: 0 };
                                    }

                                    // Allocate units to this SKU (1-2 units max per SKU to spread across varieties)
                                    const maxToAllocate = Math.min(
                                      sku.maxTransferable,
                                      2, // Max 2 units per SKU to maintain variety
                                      remainingUnits
                                    );

                                    remainingUnits -= maxToAllocate;
                                    return { ...sku, recommendedTransferQty: maxToAllocate };
                                  });

                                  // Calculate actual total allocated
                                  const totalAllocated = skusWithAllocations.reduce((sum, sku) => sum + sku.recommendedTransferQty, 0);

                                  // Separate SKUs with recommendations from the rest
                                  const skusToTransfer = skusWithAllocations.filter(sku => sku.recommendedTransferQty > 0);
                                  const otherSkus = skusWithAllocations.filter(sku => sku.recommendedTransferQty === 0 && sku.fromStoreQty > 0);
                                  const skusToShow = [...skusToTransfer, ...otherSkus];

                                  return (
                                    <div className="space-y-3">
                                      {totalAllocated > 0 && (
                                        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                                          <p className="text-sm font-semibold text-green-900 flex items-center gap-2">
                                            ✓ Transfer {totalAllocated} units across {skusToTransfer.length} SKUs
                                          </p>
                                          <p className="text-xs text-green-700 mt-1">
                                            {hasAnyVelocity ? (
                                              <><strong>Velocity-based priority:</strong> Items highlighted in green are high-velocity SKUs with low/zero stock at destination. These will generate the most sales and profit.</>
                                            ) : (
                                              <><strong>Stockout-first priority:</strong> Items highlighted in green are out-of-stock or low-stock SKUs at the destination. No individual SKU sales data available, so prioritizing replenishment of stockouts.</>
                                            )}
                                          </p>
                                        </div>
                                      )}
                                      <div className="rounded-md border overflow-hidden">
                                        <Table>
                                          <TableHeader>
                                            <TableRow className="bg-card">
                                              <TableHead className="text-xs">SKU</TableHead>
                                              <TableHead className="text-xs">Color</TableHead>
                                              <TableHead className="text-xs">Size</TableHead>
                                              <TableHead className="text-right text-xs">From Qty</TableHead>
                                              <TableHead className="text-right text-xs">To Qty</TableHead>
                                              <TableHead className="text-right text-xs">Velocity/Day</TableHead>
                                              <TableHead className="text-xs">Reason</TableHead>
                                              <TableHead className="text-right text-xs font-semibold">Transfer</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {skusToShow.map((sku, skuIdx) => {
                                              const shouldTransfer = sku.recommendedTransferQty > 0;
                                              const hasVelocity = sku.toStoreDailySales > 0;
                                              return (
                                                <TableRow
                                                  key={`${sku.sku}-${skuIdx}`}
                                                  className={shouldTransfer ? "text-sm bg-green-50 border-l-4 border-l-green-500" : "text-sm"}
                                                >
                                                  <TableCell className="font-mono text-xs">{sku.sku}</TableCell>
                                                  <TableCell>
                                                    <Badge variant="outline" className="text-xs">
                                                      {sku.color || 'N/A'}
                                                    </Badge>
                                                  </TableCell>
                                                  <TableCell className="font-semibold">{sku.size || 'N/A'}</TableCell>
                                                  <TableCell className="text-right">{formatNumber(sku.fromStoreQty)}</TableCell>
                                                  <TableCell className="text-right">
                                                    <span className={sku.toStoreQty === 0 ? "text-red-600 font-bold" : ""}>
                                                      {formatNumber(sku.toStoreQty)}
                                                    </span>
                                                  </TableCell>
                                                  <TableCell className="text-right">
                                                    {hasVelocity ? (
                                                      <span className="font-semibold text-blue-600">
                                                        {sku.toStoreDailySales.toFixed(2)}
                                                      </span>
                                                    ) : (
                                                      <span className="text-muted-foreground text-xs">0.00</span>
                                                    )}
                                                  </TableCell>
                                                  <TableCell className="text-xs text-muted-foreground max-w-[120px]">
                                                    {shouldTransfer ? sku.reason : '-'}
                                                  </TableCell>
                                                  <TableCell className="text-right">
                                                    {shouldTransfer ? (
                                                      <Badge className="bg-green-600 font-bold">
                                                        → {sku.recommendedTransferQty}
                                                      </Badge>
                                                    ) : (
                                                      <span className="text-muted-foreground text-xs">-</span>
                                                    )}
                                                  </TableCell>
                                                </TableRow>
                                              );
                                            })}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    </div>
                                  );
                                })()
                              ) : (
                                <p className="text-sm text-muted-foreground p-3 bg-card rounded-md border">
                                  No SKU-level details available for this transfer
                                </p>
                              )}
                            </div>

                            {/* Right Column: Store Metrics */}
                            <div>
                              <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <BarChart3 className="w-4 h-4" />
                                Store Metrics
                              </h4>
                              <div className="space-y-3">
                                <div className="p-3 bg-card rounded-md border">
                                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                                    <span className="font-semibold">{item.fromStore}</span> (Source)
                                  </p>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <p className="text-xs text-muted-foreground">Current Stock</p>
                                      <p className="text-lg font-bold">{formatNumber(item.fromStoreQty)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">Daily Sales</p>
                                      <p className="text-lg font-bold">{item.fromStoreDailySales.toFixed(2)}</p>
                                    </div>
                                  </div>
                                </div>

                                <div className="p-3 bg-card rounded-md border border-blue-200">
                                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-2">
                                    <span className="font-semibold">{item.toStore}</span> (Destination)
                                  </p>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <p className="text-xs text-muted-foreground">Current Stock</p>
                                      <p className="text-lg font-bold text-blue-600">{formatNumber(item.toStoreQty)}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">Daily Sales</p>
                                      <p className="text-lg font-bold text-blue-600">{item.toStoreDailySales.toFixed(2)}</p>
                                    </div>
                                  </div>
                                </div>

                                <div className="p-3 bg-card rounded-md border-2 border-primary/20">
                                  <p className="text-xs text-muted-foreground mb-1">Recommended Transfer</p>
                                  <p className="text-2xl font-bold text-green-600">
                                    {formatNumber(item.recommendedQty)} units
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Margin: {item.avgMarginPercent.toFixed(1)}%
                                  </p>
                                </div>

                                {useMLPredictions && item.mlPowered && item.successProbability && (
                                  <div className="p-3 bg-purple-50 rounded-md border border-purple-200">
                                    <p className="text-xs font-semibold mb-2 flex items-center gap-1">
                                      🤖 AI Prediction
                                    </p>
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs text-muted-foreground">Success Probability:</span>
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
                                    </div>
                                    {item.modelVersion && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Model: {item.modelVersion}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : filteredAndSortedTransferRecommendations && filteredAndSortedTransferRecommendations.length === 0 && transferRecommendations && transferRecommendations.length > 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No transfers match your filters</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTransferFilterVendor('all');
                  setTransferFilterCategory('all');
                  setTransferFilterFromStore('all');
                  setTransferFilterToStore('all');
                }}
                className="mt-4"
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No transfer opportunities found</p>
          )}
        </CardContent>
      </Card>

      {/* Prepack Restocking Recommendations (Phase 2 - Color-Aware) */}
      <Card data-testid="card-prepack-restocking">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-2">
              <Package className="w-5 h-5 text-purple-600 mt-1" />
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <CardTitle className="text-base sm:text-lg">Prepack Restocking Recommendations</CardTitle>
                  <Badge variant="default" className="bg-purple-600 w-fit">
                    🎨 Color-Aware
                  </Badge>
                </div>
                <CardDescription className="mt-1">
                  AI-powered prepack ordering for vendors with prepacked boxes (showing top 20)
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{prepackRecommendations.length} styles</Badge>
              <Button
                onClick={handleExportPrepackRecommendations}
                variant="outline"
                size="sm"
                className="gap-2"
                data-testid="button-export-prepack-recommendations"
              >
                <Download className="w-3 h-3" />
                <span className="hidden sm:inline">Export</span>
                <span className="sm:hidden">Export</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {prepackLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading prepack recommendations...</p>
          ) : prepackRecommendations && prepackRecommendations.length > 0 ? (
            <div className="space-y-4">
              {prepackRecommendations.map((item, index) => {
                const isExpanded = expandedPrepackRows.has(item.style_number);
                const toggleRow = () => {
                  const newExpanded = new Set(expandedPrepackRows);
                  if (isExpanded) {
                    newExpanded.delete(item.style_number);
                  } else {
                    newExpanded.add(item.style_number);
                  }
                  setExpandedPrepackRows(newExpanded);
                };

                return (
                  <div key={`${item.style_number}-${index}`} className="border rounded-lg overflow-hidden">
                    {/* Collapsed Row - Style Summary */}
                    <div
                      className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={toggleRow}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                          <div className="col-span-2 md:col-span-1">
                            <p className="font-mono text-sm font-semibold">{item.style_number}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                              {item.item_name}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Vendor</p>
                            <p className="text-sm font-medium truncate">{item.vendor_name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Urgency</p>
                            <Badge
                              variant={
                                item.urgency === 'Critical' ? 'destructive' :
                                item.urgency === 'High' ? 'default' :
                                'secondary'
                              }
                            >
                              {item.urgency}
                            </Badge>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Total Order</p>
                            <p className="text-sm font-semibold">{item.total_boxes} boxes</p>
                            <p className="text-xs text-muted-foreground">
                              {item.color_breakdown.length} colors
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Total Cost</p>
                            <p className="text-sm font-semibold text-green-600">
                              {formatCurrency(item.total_cost)}
                            </p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="self-start lg:self-auto">
                          {isExpanded ? '▼ Hide Details' : '► Show Details'}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Row - Color Breakdown */}
                    {isExpanded && (
                      <div className="border-t bg-muted/20 p-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Left Column: Prepack Order Breakdown */}
                          <div>
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <Package className="w-4 h-4" />
                              Prepack Order Breakdown
                            </h4>
                            <div className="space-y-2">
                              {item.color_breakdown.map((color, colorIdx) => (
                                <div
                                  key={`${item.style_number}-${color.color}-${colorIdx}`}
                                  className="p-3 bg-card rounded-md border"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <Badge variant="outline" className="font-semibold">
                                      {color.color}
                                    </Badge>
                                    <span className="text-sm text-muted-foreground">
                                      {color.pack_name}
                                    </span>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2 text-sm">
                                    <div>
                                      <p className="text-muted-foreground text-xs">Boxes</p>
                                      <p className="font-semibold">{color.boxes}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground text-xs">Pieces</p>
                                      <p className="font-semibold">{color.total_pieces}</p>
                                    </div>
                                    <div>
                                      <p className="text-muted-foreground text-xs">Cost</p>
                                      <p className="font-semibold text-green-600">
                                        {formatCurrency(color.total_cost)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="mt-3 p-3 bg-card rounded-md border-2 border-primary/20">
                              <p className="font-semibold mb-1">📦 Recommendation:</p>
                              <p className="text-sm text-muted-foreground">{item.recommendation}</p>
                            </div>
                          </div>

                          {/* Right Column: Supply Metrics */}
                          <div>
                            <h4 className="font-semibold mb-3 flex items-center gap-2">
                              <BarChart3 className="w-4 h-4" />
                              Supply Metrics
                            </h4>
                            <div className="space-y-3">
                              <div className="p-3 bg-card rounded-md border">
                                <p className="text-xs text-muted-foreground mb-1">Days of Supply</p>
                                <p className="text-2xl font-bold text-red-600">
                                  {item.days_of_supply.toFixed(1)} days
                                </p>
                              </div>
                              <div className="p-3 bg-card rounded-md border">
                                <p className="text-xs text-muted-foreground mb-1">Average Daily Sales</p>
                                <p className="text-2xl font-bold text-blue-600">
                                  {item.avg_daily_sales.toFixed(2)} units/day
                                </p>
                              </div>
                              <div className="p-3 bg-card rounded-md border">
                                <p className="text-xs text-muted-foreground mb-1">Total Investment</p>
                                <p className="text-2xl font-bold text-green-600">
                                  {formatCurrency(item.total_cost)}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {item.total_boxes} boxes • Average {formatCurrency(item.total_cost / item.total_boxes)}/box
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Network Level Distribution Plan */}
                        <div className="mt-6 border-t pt-6">
                          <NetworkLevelRestocking
                            styleNumber={item.style_number}
                            vendorName={item.vendor_name}
                            mlRecommendation={{
                              styleNumber: item.style_number,
                              vendorName: item.vendor_name,
                              recommendations: item.color_breakdown.map(color => ({
                                packName: color.pack_name,
                                color: color.color,
                                boxes: color.boxes,
                                pieces: color.total_pieces / color.boxes,
                                cost: color.cost_per_box,
                                totalCost: color.total_cost
                              }))
                            }}
                            distributionPlan={item.distributionPlan ? {
                              planId: item.distributionPlan.plan.planId,
                              styleNumber: item.distributionPlan.plan.styleNumber,
                              vendorName: item.distributionPlan.plan.vendorName,
                              totalBoxes: item.distributionPlan.plan.totalBoxes,
                              totalPieces: item.distributionPlan.plan.totalPieces,
                              totalCost: parseFloat(item.distributionPlan.plan.totalCost),
                              status: item.distributionPlan.plan.status,
                              orderDate: item.distributionPlan.plan.orderDate,
                              expectedArrivalDate: item.distributionPlan.plan.expectedArrivalDate,
                              details: item.distributionPlan.details
                            } : undefined}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No prepack restocking needed at this time
            </p>
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

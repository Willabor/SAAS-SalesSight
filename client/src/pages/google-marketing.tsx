import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Package,
  TrendingUp,
  DollarSign,
  Download,
  Tag,
  ShoppingCart,
  Sparkles,
  Target,
  Zap,
  AlertCircle,
  Settings,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { exportToExcel, exportMultipleSheetsToExcel, formatDataForExport } from "@/lib/excel-export";

// Product Segmentation Interfaces
interface EnrichedStyleData {
  styleNumber: string;
  itemName: string;
  category: string | null;
  vendorName: string | null;
  gender: string | null;
  totalActiveQty: number;
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

interface MLSegmentation {
  metadata: {
    generatedDate: string;
    totalStyles: number;
    totalActiveInventoryValue: number;
    analysisDateRange: string;
    modelVersion: string;
    mlPowered: boolean;
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
    // ML-enhanced segments
    highValueCustomers?: EnrichedStyleData[];
    crossSellOpportunities?: EnrichedStyleData[];
    churnRisk?: EnrichedStyleData[];
  };
  mlInsights?: {
    segmentConfidence: Record<string, number>;
    recommendedActions: string[];
  };
}

// ML Settings Interface
interface MLDataFilters {
  salesPeriodDays: number;
  excludeBefore: string;
  includedCategories: string[];
  excludedCategories: string[];
  includedStores: string[];
  excludedVendors: string[];
  includedGenders: string[];
  minPrice: number;
  maxPrice: number;
  minInventory: number;
  excludeZeroInventory: boolean;
}

interface MLSettings {
  trainingDays: number;
  newArrivalsDays: number;
  bestSellerThreshold: number;
  coreHighThreshold: number;
  coreMediumThreshold: number;
  coreLowThreshold: number;
  clearanceDays: number;
  filters: MLDataFilters;
}

const defaultMLSettings: MLSettings = {
  trainingDays: 90,
  newArrivalsDays: 60,
  bestSellerThreshold: 50,
  coreHighThreshold: 40,
  coreMediumThreshold: 20,
  coreLowThreshold: 6,
  clearanceDays: 180,
  filters: {
    salesPeriodDays: 90,
    excludeBefore: '',
    includedCategories: [],
    excludedCategories: [],
    includedStores: ['GM', 'HM', 'NM', 'LM', 'HQ'],
    excludedVendors: [],
    includedGenders: [],
    minPrice: 0,
    maxPrice: 99999,
    minInventory: 1,
    excludeZeroInventory: true,
  },
};

export default function GoogleMarketingPage() {
  const [useMLSegmentation, setUseMLSegmentation] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mlSettings, setMLSettings] = useState<MLSettings>(defaultMLSettings);
  const [isTraining, setIsTraining] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch available categories and vendors for filter options
  const { data: filterOptions } = useQuery<{
    categories: string[];
    vendors: string[];
    genders: string[];
  }>({
    queryKey: ["/api/inventory/filter-options"],
  });

  // Fetch rule-based segmentation
  const { data: ruleBasedData, isLoading: ruleLoading, error: ruleError } = useQuery<ProductSegmentation>({
    queryKey: ["/api/inventory/product-segmentation"],
    enabled: !useMLSegmentation,
  });

  // Fetch ML-powered segmentation
  const { data: mlData, isLoading: mlLoading, error: mlError } = useQuery<MLSegmentation>({
    queryKey: ["/api/inventory/ml-product-segmentation"],
    enabled: useMLSegmentation,
  });

  const data = useMLSegmentation ? mlData : ruleBasedData;
  const isLoading = useMLSegmentation ? mlLoading : ruleLoading;
  const error = useMLSegmentation ? mlError : ruleError;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  // Retrain ML model with custom settings
  const handleRetrainModel = async () => {
    setIsTraining(true);
    try {
      const response = await fetch('/api/ml/train-segmentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mlSettings),
      });

      if (!response.ok) {
        throw new Error('Training failed');
      }

      const result = await response.json();

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/ml-product-segmentation"] });

      alert(`Model retrained successfully!\nVersion: ${result.model_version}\nAccuracy: ${(result.test_accuracy * 100).toFixed(2)}%`);
      setSettingsOpen(false);
    } catch (error) {
      alert('Failed to retrain model. Please try again.');
      console.error('Training error:', error);
    } finally {
      setIsTraining(false);
    }
  };

  const handleExportGoogleMarketing = () => {
    if (!data) {
      alert('No segmentation data available');
      return;
    }

    const sheets: Array<{ data: Record<string, any>[]; sheetName: string }> = [];
    const { metadata, segments } = data;

    // Sheet 1: Executive Summary
    const summaryData: Record<string, any>[] = [
      { 'Metric': 'Report Generated', 'Value': new Date(metadata.generatedDate).toLocaleDateString() },
      { 'Metric': 'Total Styles Analyzed', 'Value': formatNumber(metadata.totalStyles) },
      { 'Metric': 'Total Active Inventory Value', 'Value': formatCurrency(metadata.totalActiveInventoryValue) },
      { 'Metric': 'Analysis Date Range', 'Value': metadata.analysisDateRange },
    ];

    if (useMLSegmentation && 'modelVersion' in metadata) {
      summaryData.push(
        { 'Metric': 'AI Model Version', 'Value': metadata.modelVersion },
        { 'Metric': 'AI-Powered', 'Value': 'Yes ✓' }
      );
    }

    summaryData.push(
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
      { 'Metric': 'Clearance Candidates', 'Value': segments.clearanceCandidates.length }
    );

    sheets.push({
      data: summaryData,
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

    const filename = useMLSegmentation
      ? `ml-powered-marketing-report-${new Date().toISOString().split('T')[0]}`
      : `product-segmentation-report-${new Date().toISOString().split('T')[0]}`;

    exportMultipleSheetsToExcel(sheets, filename);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">
              {useMLSegmentation ? 'Loading AI-powered segmentation...' : 'Loading product segmentation...'}
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="py-16 text-center">
              <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
              <p className="text-destructive text-lg">Failed to load product segmentation</p>
              <p className="text-muted-foreground mt-2">Please try refreshing the page</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const { metadata, segments } = data;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Google Marketing Report</h1>
              <p className="text-muted-foreground mt-1">
                AI-powered product segmentation for Google Ads campaigns
              </p>
            </div>
          </div>

          {/* Toolbar: ML Toggle, Settings, and Export */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Switch
                id="ml-segmentation"
                checked={useMLSegmentation}
                onCheckedChange={setUseMLSegmentation}
                data-testid="switch-ml-segmentation"
              />
              <Label htmlFor="ml-segmentation" className="flex items-center gap-2 cursor-pointer">
                <Sparkles className={`w-4 h-4 ${useMLSegmentation ? 'text-purple-600' : 'text-muted-foreground'}`} />
                Use AI-Powered Segmentation
                {useMLSegmentation && (
                  <Badge variant="secondary" className="ml-2">
                    <Zap className="w-3 h-3 mr-1" />
                    ML Active
                  </Badge>
                )}
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="gap-2"
                    title="ML Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      ML Model Configuration
                    </DialogTitle>
                    <DialogDescription>
                      Adjust training parameters and classification thresholds. Changes require retraining the model.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-6 py-4">
                    {/* Training Parameters */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-sm text-muted-foreground">Training Parameters</h3>

                      <div className="space-y-2">
                        <Label htmlFor="training-days">Training Data Period (days)</Label>
                        <div className="flex items-center gap-4">
                          <Slider
                            id="training-days"
                            value={[mlSettings.trainingDays]}
                            onValueChange={(value) => setMLSettings({ ...mlSettings, trainingDays: value[0] })}
                            min={30}
                            max={365}
                            step={30}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            value={mlSettings.trainingDays}
                            onChange={(e) => setMLSettings({ ...mlSettings, trainingDays: parseInt(e.target.value) })}
                            className="w-20"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          How many days of historical data to use for training (30-365 days)
                        </p>
                      </div>
                    </div>

                    {/* Classification Thresholds */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-sm text-muted-foreground">Classification Thresholds</h3>

                      <div className="space-y-2">
                        <Label htmlFor="new-arrivals-days">New Arrivals Window (days)</Label>
                        <div className="flex items-center gap-4">
                          <Slider
                            id="new-arrivals-days"
                            value={[mlSettings.newArrivalsDays]}
                            onValueChange={(value) => setMLSettings({ ...mlSettings, newArrivalsDays: value[0] })}
                            min={14}
                            max={120}
                            step={7}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            value={mlSettings.newArrivalsDays}
                            onChange={(e) => setMLSettings({ ...mlSettings, newArrivalsDays: parseInt(e.target.value) })}
                            className="w-20"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Products received within this many days are "New Arrivals" (14-120 days)
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="best-seller-threshold">Best Seller Threshold (orders)</Label>
                        <div className="flex items-center gap-4">
                          <Slider
                            id="best-seller-threshold"
                            value={[mlSettings.bestSellerThreshold]}
                            onValueChange={(value) => setMLSettings({ ...mlSettings, bestSellerThreshold: value[0] })}
                            min={20}
                            max={100}
                            step={5}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            value={mlSettings.bestSellerThreshold}
                            onChange={(e) => setMLSettings({ ...mlSettings, bestSellerThreshold: parseInt(e.target.value) })}
                            className="w-20"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Minimum orders to classify as "Best Seller" (20-100 orders)
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="core-high-threshold">Core High Threshold (orders)</Label>
                        <div className="flex items-center gap-4">
                          <Slider
                            id="core-high-threshold"
                            value={[mlSettings.coreHighThreshold]}
                            onValueChange={(value) => setMLSettings({ ...mlSettings, coreHighThreshold: value[0] })}
                            min={20}
                            max={60}
                            step={5}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            value={mlSettings.coreHighThreshold}
                            onChange={(e) => setMLSettings({ ...mlSettings, coreHighThreshold: parseInt(e.target.value) })}
                            className="w-20"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Orders needed for "Core High" classification (20-60 orders)
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="core-medium-threshold">Core Medium Threshold (orders)</Label>
                        <div className="flex items-center gap-4">
                          <Slider
                            id="core-medium-threshold"
                            value={[mlSettings.coreMediumThreshold]}
                            onValueChange={(value) => setMLSettings({ ...mlSettings, coreMediumThreshold: value[0] })}
                            min={5}
                            max={40}
                            step={5}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            value={mlSettings.coreMediumThreshold}
                            onChange={(e) => setMLSettings({ ...mlSettings, coreMediumThreshold: parseInt(e.target.value) })}
                            className="w-20"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Orders needed for "Core Medium" classification (5-40 orders)
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="core-low-threshold">Core Low Threshold (orders)</Label>
                        <div className="flex items-center gap-4">
                          <Slider
                            id="core-low-threshold"
                            value={[mlSettings.coreLowThreshold]}
                            onValueChange={(value) => setMLSettings({ ...mlSettings, coreLowThreshold: value[0] })}
                            min={2}
                            max={20}
                            step={1}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            value={mlSettings.coreLowThreshold}
                            onChange={(e) => setMLSettings({ ...mlSettings, coreLowThreshold: parseInt(e.target.value) })}
                            className="w-20"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Orders needed for "Core Low" classification (2-20 orders)
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="clearance-days">Clearance Threshold (days since last sale)</Label>
                        <div className="flex items-center gap-4">
                          <Slider
                            id="clearance-days"
                            value={[mlSettings.clearanceDays]}
                            onValueChange={(value) => setMLSettings({ ...mlSettings, clearanceDays: value[0] })}
                            min={90}
                            max={365}
                            step={30}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            value={mlSettings.clearanceDays}
                            onChange={(e) => setMLSettings({ ...mlSettings, clearanceDays: parseInt(e.target.value) })}
                            className="w-20"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Days without sales before marking as "Clearance" (90-365 days)
                        </p>
                      </div>
                    </div>

                    {/* Data Filters */}
                    <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen} className="space-y-4">
                      <div className="flex items-center justify-between pt-4 border-t">
                        <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                          <Filter className="w-4 h-4" />
                          Data Filters
                        </h3>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="gap-1">
                            {filtersOpen ? (
                              <>
                                Collapse <ChevronUp className="w-4 h-4" />
                              </>
                            ) : (
                              <>
                                Expand <ChevronDown className="w-4 h-4" />
                              </>
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </div>

                      <CollapsibleContent className="space-y-4">
                        {/* Date Filters */}
                        <div className="space-y-2 pt-2">
                          <Label htmlFor="sales-period-days">Sales History Period (days)</Label>
                          <div className="flex items-center gap-4">
                            <Slider
                              id="sales-period-days"
                              value={[mlSettings.filters.salesPeriodDays]}
                              onValueChange={(value) => setMLSettings({
                                ...mlSettings,
                                filters: { ...mlSettings.filters, salesPeriodDays: value[0] }
                              })}
                              min={30}
                              max={365}
                              step={30}
                              className="flex-1"
                            />
                            <Input
                              type="number"
                              value={mlSettings.filters.salesPeriodDays}
                              onChange={(e) => setMLSettings({
                                ...mlSettings,
                                filters: { ...mlSettings.filters, salesPeriodDays: parseInt(e.target.value) }
                              })}
                              className="w-20"
                            />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Include sales data from the last X days (30-365 days)
                          </p>
                        </div>

                        {/* Store Filters */}
                        <div className="space-y-2">
                          <Label>Store Locations</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {['GM', 'HM', 'NM', 'LM', 'HQ'].map((store) => (
                              <div key={store} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`store-${store}`}
                                  checked={mlSettings.filters.includedStores.includes(store)}
                                  onCheckedChange={(checked) => {
                                    const stores = checked
                                      ? [...mlSettings.filters.includedStores, store]
                                      : mlSettings.filters.includedStores.filter(s => s !== store);
                                    setMLSettings({
                                      ...mlSettings,
                                      filters: { ...mlSettings.filters, includedStores: stores }
                                    });
                                  }}
                                />
                                <Label htmlFor={`store-${store}`} className="cursor-pointer font-normal">
                                  {store} {store === 'HQ' && '(Warehouse)'}
                                </Label>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Select which store locations to include in training data
                          </p>
                        </div>

                        {/* Category Filters */}
                        {filterOptions?.categories && filterOptions.categories.length > 0 && (
                          <div className="space-y-2">
                            <Label>Product Categories</Label>
                            <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-2">
                              {filterOptions.categories.map((category) => (
                                <div key={category} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`category-${category}`}
                                    checked={
                                      mlSettings.filters.includedCategories.length === 0 ||
                                      mlSettings.filters.includedCategories.includes(category)
                                    }
                                    onCheckedChange={(checked) => {
                                      if (mlSettings.filters.includedCategories.length === 0) {
                                        // First unchecked - select all except this one
                                        const allExceptThis = filterOptions.categories.filter(c => c !== category);
                                        setMLSettings({
                                          ...mlSettings,
                                          filters: { ...mlSettings.filters, includedCategories: allExceptThis }
                                        });
                                      } else {
                                        const categories = checked
                                          ? [...mlSettings.filters.includedCategories, category]
                                          : mlSettings.filters.includedCategories.filter(c => c !== category);
                                        setMLSettings({
                                          ...mlSettings,
                                          filters: { ...mlSettings.filters, includedCategories: categories }
                                        });
                                      }
                                    }}
                                  />
                                  <Label htmlFor={`category-${category}`} className="cursor-pointer font-normal">
                                    {category || '(Uncategorized)'}
                                  </Label>
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setMLSettings({
                                  ...mlSettings,
                                  filters: { ...mlSettings.filters, includedCategories: [] }
                                })}
                              >
                                Select All
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setMLSettings({
                                  ...mlSettings,
                                  filters: { ...mlSettings.filters, includedCategories: filterOptions.categories }
                                })}
                              >
                                Clear All
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {mlSettings.filters.includedCategories.length === 0
                                ? 'All categories selected'
                                : `${mlSettings.filters.includedCategories.length} of ${filterOptions.categories.length} selected`}
                            </p>
                          </div>
                        )}

                        {/* Vendor Filters */}
                        {filterOptions?.vendors && filterOptions.vendors.length > 0 && (
                          <div className="space-y-2">
                            <Label>Excluded Vendors</Label>
                            <div className="max-h-32 overflow-y-auto border rounded p-2 space-y-2">
                              {filterOptions.vendors.map((vendor) => (
                                <div key={vendor} className="flex items-center space-x-2">
                                  <Checkbox
                                    id={`vendor-${vendor}`}
                                    checked={mlSettings.filters.excludedVendors.includes(vendor)}
                                    onCheckedChange={(checked) => {
                                      const vendors = checked
                                        ? [...mlSettings.filters.excludedVendors, vendor]
                                        : mlSettings.filters.excludedVendors.filter(v => v !== vendor);
                                      setMLSettings({
                                        ...mlSettings,
                                        filters: { ...mlSettings.filters, excludedVendors: vendors }
                                      });
                                    }}
                                  />
                                  <Label htmlFor={`vendor-${vendor}`} className="cursor-pointer font-normal">
                                    {vendor || '(No Vendor)'}
                                  </Label>
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {mlSettings.filters.excludedVendors.length === 0
                                ? 'No vendors excluded'
                                : `${mlSettings.filters.excludedVendors.length} vendor(s) excluded`}
                            </p>
                          </div>
                        )}

                        {/* Inventory Filter */}
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="exclude-zero-inventory"
                              checked={mlSettings.filters.excludeZeroInventory}
                              onCheckedChange={(checked) => setMLSettings({
                                ...mlSettings,
                                filters: { ...mlSettings.filters, excludeZeroInventory: checked as boolean }
                              })}
                            />
                            <Label htmlFor="exclude-zero-inventory" className="cursor-pointer font-normal">
                              Exclude products with zero inventory
                            </Label>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Focus training on products that are currently in stock
                          </p>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>

                    {/* Reset to Defaults */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <Button
                        variant="ghost"
                        onClick={() => setMLSettings(defaultMLSettings)}
                        className="gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Reset to Defaults
                      </Button>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setSettingsOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleRetrainModel}
                      disabled={isTraining}
                      className="gap-2"
                    >
                      {isTraining ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Training... (~2 min)
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Apply & Retrain Model
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button
                onClick={handleExportGoogleMarketing}
                variant="default"
                className="gap-2"
                data-testid="button-export-report"
              >
                <Download className="w-4 h-4" />
                Export Marketing Report
              </Button>
            </div>
          </div>

          {/* ML Model Info (if using ML) */}
          {useMLSegmentation && 'modelVersion' in metadata && (
            <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
              <CardContent className="py-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  <p className="text-sm font-medium">
                    AI Model Active: <span className="font-mono text-purple-700 dark:text-purple-400">{String(metadata.modelVersion)}</span>
                  </p>
                  <Badge variant="outline" className="ml-2">Enhanced Predictions</Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Package className="w-4 h-4 mr-2 text-blue-600" />
                  <p className="text-2xl font-bold">{formatNumber(metadata.totalStyles)}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Analyzed for segmentation
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Inventory Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <DollarSign className="w-4 h-4 mr-2 text-green-600" />
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(metadata.totalActiveInventoryValue)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active catalog value
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Analysis Period
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Target className="w-4 h-4 mr-2 text-purple-600" />
                  <p className="text-lg font-semibold">{metadata.analysisDateRange}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Data range analyzed
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Segment Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Best Sellers */}
            <Card className="border-amber-200 dark:border-amber-900">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <TrendingUp className="w-5 h-5" />
                    Best Sellers
                  </CardTitle>
                  <Badge variant="default" className="bg-amber-600">Priority 5</Badge>
                </div>
                <CardDescription>High-frequency top performers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-600">{segments.bestSellers.length}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatCurrency(segments.bestSellers.reduce((sum, item) => sum + item.inventoryValue, 0))} value
                </p>
              </CardContent>
            </Card>

            {/* Core Items High */}
            <Card className="border-blue-200 dark:border-blue-900">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                    <Package className="w-5 h-5" />
                    Core High
                  </CardTitle>
                  <Badge variant="secondary">40+ orders</Badge>
                </div>
                <CardDescription>High-frequency evergreen items</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">{segments.coreHighFrequency.length}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatCurrency(segments.coreHighFrequency.reduce((sum, item) => sum + item.inventoryValue, 0))} value
                </p>
              </CardContent>
            </Card>

            {/* Core Items Medium */}
            <Card className="border-green-200 dark:border-green-900">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
                    <Package className="w-5 h-5" />
                    Core Medium
                  </CardTitle>
                  <Badge variant="secondary">10-39 orders</Badge>
                </div>
                <CardDescription>Medium-frequency core items</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{segments.coreMediumFrequency.length}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatCurrency(segments.coreMediumFrequency.reduce((sum, item) => sum + item.inventoryValue, 0))} value
                </p>
              </CardContent>
            </Card>

            {/* Core Items Low */}
            <Card className="border-cyan-200 dark:border-cyan-900">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-cyan-700 dark:text-cyan-400">
                    <Package className="w-5 h-5" />
                    Core Low
                  </CardTitle>
                  <Badge variant="secondary">6-9 orders</Badge>
                </div>
                <CardDescription>Low-frequency core items</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-cyan-600">{segments.coreLowFrequency.length}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatCurrency(segments.coreLowFrequency.reduce((sum, item) => sum + item.inventoryValue, 0))} value
                </p>
              </CardContent>
            </Card>

            {/* New Arrivals */}
            <Card className="border-purple-200 dark:border-purple-900">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                    <Sparkles className="w-5 h-5" />
                    New Arrivals
                  </CardTitle>
                  <Badge variant="secondary">Last 60 days</Badge>
                </div>
                <CardDescription>Recently received inventory</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">{segments.newArrivals.length}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatCurrency(segments.newArrivals.reduce((sum, item) => sum + item.inventoryValue, 0))} value
                </p>
              </CardContent>
            </Card>

            {/* Clearance */}
            <Card className="border-red-200 dark:border-red-900">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
                    <Tag className="w-5 h-5" />
                    Clearance
                  </CardTitle>
                  <Badge variant="destructive">Discount</Badge>
                </div>
                <CardDescription>Deep discount candidates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{segments.clearanceCandidates.length}</div>
                <p className="text-sm text-muted-foreground mt-1">
                  {formatCurrency(segments.clearanceCandidates.reduce((sum, item) => sum + item.inventoryValue, 0))} tied up
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Best Sellers Details Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-600" />
                Best Sellers - Campaign Priority 5
              </CardTitle>
              <CardDescription>
                Top-performing products recommended for highest ad budget allocation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {segments.bestSellers.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Style #</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">30d Sales</TableHead>
                        <TableHead className="text-right">Margin %</TableHead>
                        <TableHead>Budget Tier</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {segments.bestSellers.slice(0, 10).map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-sm">{item.styleNumber}</TableCell>
                          <TableCell className="max-w-xs truncate">{item.productTitle}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.vendorName || 'N/A'}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatNumber(item.totalActiveQty)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.avgSellingPrice)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatNumber(item.unitsSold30d)}</TableCell>
                          <TableCell className="text-right text-green-600 font-semibold">
                            {item.avgMarginPercent.toFixed(1)}%
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={item.budgetTier === 'High' ? 'default' : item.budgetTier === 'Medium' ? 'secondary' : 'outline'}
                            >
                              {item.budgetTier}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">No best sellers data available</p>
              )}
              {segments.bestSellers.length > 10 && (
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  Showing top 10 items out of {segments.bestSellers.length} total. Export full report for all items.
                </p>
              )}
            </CardContent>
          </Card>

          {/* New Arrivals Details Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                New Arrivals - Launch Campaigns
              </CardTitle>
              <CardDescription>
                Recently received products for new product launch campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {segments.newArrivals.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Style #</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Margin/Unit</TableHead>
                        <TableHead className="text-right">Days Since Arrival</TableHead>
                        <TableHead>Budget Tier</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {segments.newArrivals.slice(0, 10).map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-sm">{item.styleNumber}</TableCell>
                          <TableCell className="max-w-xs truncate">{item.productTitle}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.vendorName || 'N/A'}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatNumber(item.totalActiveQty)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.avgSellingPrice)}</TableCell>
                          <TableCell className="text-right text-green-600">
                            {formatCurrency(item.marginPerUnit)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary">{item.daysSinceLastReceive || 'N/A'} days</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={item.budgetTier === 'High' ? 'default' : item.budgetTier === 'Medium' ? 'secondary' : 'outline'}
                            >
                              {item.budgetTier}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">No new arrivals data available</p>
              )}
              {segments.newArrivals.length > 10 && (
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  Showing top 10 items out of {segments.newArrivals.length} total. Export full report for all items.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Clearance Candidates Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-red-600" />
                Clearance Candidates - Discount Campaigns
              </CardTitle>
              <CardDescription>
                Slow-moving inventory recommended for deep discount campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {segments.clearanceCandidates.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Style #</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead className="text-right">Stock to Clear</TableHead>
                        <TableHead className="text-right">Our Cost</TableHead>
                        <TableHead className="text-right">Current Price</TableHead>
                        <TableHead className="text-right">Capital Tied</TableHead>
                        <TableHead className="text-right">Days Old</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {segments.clearanceCandidates.slice(0, 10).map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-sm">{item.styleNumber}</TableCell>
                          <TableCell className="max-w-xs truncate">{item.productTitle}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.vendorName || 'N/A'}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatNumber(item.totalActiveQty)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.avgOrderCost)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.avgSellingPrice)}</TableCell>
                          <TableCell className="text-right text-red-600 font-semibold">
                            {formatCurrency(item.inventoryValue)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="destructive">{item.daysSinceLastReceive || 'N/A'} days</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">No clearance candidates available</p>
              )}
              {segments.clearanceCandidates.length > 10 && (
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  Showing top 10 items out of {segments.clearanceCandidates.length} total. Export full report for all items.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Export Call-to-Action */}
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
            <CardContent className="py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-1">Ready to launch your Google Ads campaigns?</h3>
                  <p className="text-sm text-muted-foreground">
                    Export the complete report with Google Shopping feed and campaign targeting data
                  </p>
                </div>
                <Button onClick={handleExportGoogleMarketing} size="lg" className="gap-2">
                  <Download className="w-5 h-5" />
                  Export Full Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

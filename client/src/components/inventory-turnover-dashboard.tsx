import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";

interface TurnoverMetrics {
  totalInventoryValue: number;
  totalInventoryUnits: number;
  deadStockValue: number;
  deadStockUnits: number;
  avgDaysSinceLastSale: number;
}

interface SlowMovingItem {
  itemNumber: string;
  itemName: string;
  category: string | null;
  vendorName: string | null;
  availQty: number;
  orderCost: string | null;
  inventoryValue: number;
  lastSold: string | null;
  daysSinceLastSale: number | null;
  stockStatus: string;
}

interface OverstockItem {
  itemNumber: string;
  itemName: string;
  category: string | null;
  vendorName: string | null;
  availQty: number;
  orderCost: string | null;
  inventoryValue: number;
  unitsSold: number;
  avgDailySales: number;
  daysOfSupply: number;
  stockStatus: string;
}

interface CategoryAnalysis {
  category: string;
  totalInventoryValue: number;
  totalUnits: number;
  totalItemsCount: number;
  totalSales: number;
  avgTurnoverRate: number;
}

export default function InventoryTurnoverDashboard() {
  const { data: metrics, isLoading: metricsLoading } = useQuery<TurnoverMetrics>({
    queryKey: ["inventory", "turnover-metrics"],
    queryFn: async () => {
      const response = await fetch("/api/inventory/turnover-metrics");
      if (!response.ok) throw new Error("Failed to fetch turnover metrics");
      return response.json();
    },
  });

  const { data: slowMoving, isLoading: slowMovingLoading } = useQuery<SlowMovingItem[]>({
    queryKey: ["inventory", "slow-moving", 90, 20],
    queryFn: async () => {
      const response = await fetch("/api/inventory/slow-moving?days=90&limit=20");
      if (!response.ok) throw new Error("Failed to fetch slow-moving stock");
      return response.json();
    },
  });

  const { data: stockAnalysis, isLoading: stockAnalysisLoading } = useQuery<OverstockItem[]>({
    queryKey: ["inventory", "overstock-understock", 30],
    queryFn: async () => {
      const response = await fetch("/api/inventory/overstock-understock?days=30");
      if (!response.ok) throw new Error("Failed to fetch stock analysis");
      return response.json();
    },
  });

  const { data: categoryAnalysis, isLoading: categoryLoading } = useQuery<CategoryAnalysis[]>({
    queryKey: ["inventory", "category-analysis"],
    queryFn: async () => {
      const response = await fetch("/api/inventory/category-analysis");
      if (!response.ok) throw new Error("Failed to fetch category analysis");
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

  const getStockStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
      'Dead Stock': 'destructive',
      'Slow Moving': 'secondary',
      'Overstock': 'secondary',
      'Understock': 'destructive',
      'No Sales': 'outline',
      'Never Sold': 'destructive',
      'Normal': 'default',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  if (metricsLoading || slowMovingLoading || stockAnalysisLoading || categoryLoading) {
    return (
      <div className="text-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading inventory analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card data-testid="card-total-inventory-value">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Inventory Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <DollarSign className="w-4 h-4 mr-2 text-green-600" />
              <p className="text-2xl font-bold" data-testid="text-total-inventory-value">
                {formatCurrency(metrics?.totalInventoryValue || 0)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatNumber(metrics?.totalInventoryUnits || 0)} units
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
                {formatCurrency(metrics?.deadStockValue || 0)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatNumber(metrics?.deadStockUnits || 0)} units (90+ days)
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-avg-days-since-sale">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Days Since Last Sale
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <TrendingDown className="w-4 h-4 mr-2 text-orange-600" />
              <p className="text-2xl font-bold" data-testid="text-avg-days-since-sale">
                {Math.round(metrics?.avgDaysSinceLastSale || 0)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              days average
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-dead-stock-percentage">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Dead Stock %
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Package className="w-4 h-4 mr-2 text-blue-600" />
              <p className="text-2xl font-bold" data-testid="text-dead-stock-percentage">
                {metrics?.totalInventoryValue && metrics.totalInventoryValue > 0
                  ? ((metrics.deadStockValue / metrics.totalInventoryValue) * 100).toFixed(1)
                  : '0.0'}%
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              of total inventory
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Slow Moving & Dead Stock Table */}
      <Card data-testid="card-slow-moving-stock">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Slow Moving & Dead Stock</CardTitle>
              <CardDescription>Items with no sales in the last 90+ days</CardDescription>
            </div>
            <Badge variant="secondary">{slowMoving?.length || 0} items</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {slowMoving && slowMoving.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item #</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                    <TableHead className="text-right">Days Since Sale</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slowMoving.slice(0, 15).map((item, index) => (
                    <TableRow key={`${item.itemNumber}-${index}`} data-testid={`row-slow-moving-${index}`}>
                      <TableCell className="font-mono text-sm">{item.itemNumber}</TableCell>
                      <TableCell className="max-w-xs truncate">{item.itemName}</TableCell>
                      <TableCell>{item.category || 'N/A'}</TableCell>
                      <TableCell className="text-right">{formatNumber(item.availQty)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.inventoryValue)}</TableCell>
                      <TableCell className="text-right">
                        {item.daysSinceLastSale !== null ? Math.round(item.daysSinceLastSale) : 'Never'}
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

      {/* Overstock & Understock Analysis */}
      <Card data-testid="card-stock-analysis">
        <CardHeader>
          <CardTitle>Overstock & Understock Analysis</CardTitle>
          <CardDescription>Based on last 30 days of sales activity</CardDescription>
        </CardHeader>
        <CardContent>
          {stockAnalysis && stockAnalysis.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item #</TableHead>
                    <TableHead>Item Name</TableHead>
                    <TableHead className="text-right">On Hand</TableHead>
                    <TableHead className="text-right">Sold (30d)</TableHead>
                    <TableHead className="text-right">Avg Daily Sales</TableHead>
                    <TableHead className="text-right">Days of Supply</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockAnalysis
                    .filter(item => item.stockStatus !== 'Normal')
                    .slice(0, 15)
                    .map((item, index) => (
                      <TableRow key={`${item.itemNumber}-${index}`} data-testid={`row-stock-analysis-${index}`}>
                        <TableCell className="font-mono text-sm">{item.itemNumber}</TableCell>
                        <TableCell className="max-w-xs truncate">{item.itemName}</TableCell>
                        <TableCell className="text-right">{formatNumber(item.availQty)}</TableCell>
                        <TableCell className="text-right">{formatNumber(item.unitsSold)}</TableCell>
                        <TableCell className="text-right">{item.avgDailySales.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          {item.daysOfSupply < 999 ? item.daysOfSupply.toFixed(0) : '999+'}
                        </TableCell>
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

      {/* Category Analysis */}
      <Card data-testid="card-category-analysis">
        <CardHeader>
          <CardTitle>Category Inventory Analysis</CardTitle>
          <CardDescription>Inventory value and sales by category</CardDescription>
        </CardHeader>
        <CardContent>
          {categoryAnalysis && categoryAnalysis.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Inventory Value</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Items Count</TableHead>
                    <TableHead className="text-right">Sales (30d)</TableHead>
                    <TableHead className="text-right">Turnover %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryAnalysis.map((cat, index) => (
                    <TableRow key={`${cat.category}-${index}`} data-testid={`row-category-${index}`}>
                      <TableCell className="font-medium">{cat.category}</TableCell>
                      <TableCell className="text-right">{formatCurrency(cat.totalInventoryValue)}</TableCell>
                      <TableCell className="text-right">{formatNumber(cat.totalUnits)}</TableCell>
                      <TableCell className="text-right">{formatNumber(cat.totalItemsCount)}</TableCell>
                      <TableCell className="text-right">{formatNumber(cat.totalSales)}</TableCell>
                      <TableCell className="text-right">
                        <span className={cat.avgTurnoverRate < 10 ? 'text-red-600 font-semibold' : ''}>
                          {cat.avgTurnoverRate.toFixed(1)}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No category data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

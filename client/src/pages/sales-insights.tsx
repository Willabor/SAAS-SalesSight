import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft,
  TrendingUp,
  Store,
  Package,
  Calendar,
  DollarSign,
  ShoppingCart,
  BarChart3,
  Tag,
  Clock,
  Truck
} from "lucide-react";
import { Link } from "wouter";
import InventoryTurnoverDashboard from "@/components/inventory-turnover-dashboard";

interface SalesInsights {
  byStore: Array<{ 
    store: string; 
    totalSales: number; 
    totalRevenue: string; 
    transactionCount: number;
  }>;
  byItem: Array<{ 
    sku: string; 
    itemName: string; 
    totalSales: number; 
    totalRevenue: string; 
    vendorName: string | null;
    category: string | null;
  }>;
  byMonth: Array<{ 
    month: string; 
    totalRevenue: string; 
    transactionCount: number;
  }>;
  byYear: Array<{ 
    year: string; 
    totalRevenue: string; 
    transactionCount: number;
  }>;
  byCategory: Array<{
    category: string;
    totalSales: number;
    totalRevenue: string;
    transactionCount: number;
    avgPrice: string;
  }>;
  inventoryAge: Array<{
    ageGroup: string;
    totalSales: number;
    totalRevenue: string;
    itemCount: number;
  }>;
  recentInventory: Array<{
    recencyGroup: string;
    totalSales: number;
    totalRevenue: string;
    itemCount: number;
  }>;
}

export default function SalesInsightsPage() {
  const { data: insights, isLoading, error } = useQuery<SalesInsights>({
    queryKey: ["/api/sales-insights"],
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Link href="/">
                <Button variant="ghost" size="sm" className="flex items-center gap-2" data-testid="button-back-dashboard">
                  <ArrowLeft className="w-4 h-4" />
                  Dashboard
                </Button>
              </Link>
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-semibold text-foreground">Sales Insights</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="sales" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="sales" data-testid="tab-sales-insights">
              <BarChart3 className="w-4 h-4 mr-2" />
              Sales Insights
            </TabsTrigger>
            <TabsTrigger value="inventory" data-testid="tab-inventory-turnover">
              <Package className="w-4 h-4 mr-2" />
              Inventory Turnover
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sales" className="space-y-6">
            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading analytics...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <Card>
                <CardContent className="py-16 text-center">
                  <p className="text-destructive text-lg">Failed to load sales insights</p>
                  <p className="text-muted-foreground mt-2">Please try refreshing the page</p>
                </CardContent>
              </Card>
            )}

            {/* Insights Content */}
            {insights && !isLoading && (
              <div className="space-y-6">
            {/* Sales by Store */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="w-5 h-5" />
                  Sales Performance by Store
                </CardTitle>
                <CardDescription>
                  Revenue and transaction breakdown across all stores
                </CardDescription>
              </CardHeader>
              <CardContent>
                {insights.byStore.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Store</TableHead>
                          <TableHead className="text-right">Total Sales</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">Transactions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {insights.byStore.map((store, index) => (
                          <TableRow key={index} data-testid={`row-store-${index}`}>
                            <TableCell className="font-medium">{store.store}</TableCell>
                            <TableCell className="text-right">{formatNumber(store.totalSales)}</TableCell>
                            <TableCell className="text-right font-semibold text-green-600 dark:text-green-500">
                              {formatCurrency(store.totalRevenue)}
                            </TableCell>
                            <TableCell className="text-right">{formatNumber(store.transactionCount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">No store data available</p>
                )}
              </CardContent>
            </Card>

            {/* Sales by Item/SKU */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Top Selling Items (by SKU)
                </CardTitle>
                <CardDescription>
                  Best performing products with linked item list data
                </CardDescription>
              </CardHeader>
              <CardContent>
                {insights.byItem.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>SKU</TableHead>
                          <TableHead>Item Name</TableHead>
                          <TableHead>Vendor</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Units Sold</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {insights.byItem.slice(0, 20).map((item, index) => (
                          <TableRow key={index} data-testid={`row-item-${index}`}>
                            <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                            <TableCell>{item.itemName}</TableCell>
                            <TableCell>
                              {item.vendorName ? (
                                <Badge variant="outline">{item.vendorName}</Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">Not linked</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {item.category ? (
                                <Badge variant="secondary">{item.category}</Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">N/A</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">{formatNumber(item.totalSales)}</TableCell>
                            <TableCell className="text-right font-semibold text-green-600 dark:text-green-500">
                              {formatCurrency(item.totalRevenue)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">No item data available</p>
                )}
                {insights.byItem.length > 20 && (
                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    Showing top 20 items out of {insights.byItem.length} total
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Sales by Category */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="w-5 h-5" />
                  Sales by Category
                </CardTitle>
                <CardDescription>
                  Product category performance analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                {insights.byCategory && insights.byCategory.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Units Sold</TableHead>
                          <TableHead className="text-right">Revenue</TableHead>
                          <TableHead className="text-right">Avg Price</TableHead>
                          <TableHead className="text-right">Transactions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {insights.byCategory.slice(0, 15).map((category, index) => (
                          <TableRow key={index} data-testid={`row-category-${index}`}>
                            <TableCell className="font-medium">
                              <Badge variant="secondary">{category.category}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{formatNumber(category.totalSales)}</TableCell>
                            <TableCell className="text-right font-semibold text-green-600 dark:text-green-500">
                              {formatCurrency(category.totalRevenue)}
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(category.avgPrice)}</TableCell>
                            <TableCell className="text-right">{formatNumber(category.transactionCount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">No category data available</p>
                )}
                {insights.byCategory && insights.byCategory.length > 15 && (
                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    Showing top 15 categories out of {insights.byCategory.length} total
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Inventory Analytics Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Inventory Age Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Inventory Age Analysis
                  </CardTitle>
                  <CardDescription>
                    Sales performance by inventory age
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {insights.inventoryAge && insights.inventoryAge.length > 0 ? (
                    <div className="space-y-3">
                      {insights.inventoryAge.map((age, index) => (
                        <div 
                          key={index} 
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                          data-testid={`inventory-age-${index}`}
                        >
                          <div>
                            <p className="font-medium">{age.ageGroup}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatNumber(age.totalSales)} units • {formatNumber(age.itemCount)} unique items
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-green-600 dark:text-green-500">
                              {formatCurrency(age.totalRevenue)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">No inventory age data available</p>
                  )}
                </CardContent>
              </Card>

              {/* Recent Inventory Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="w-5 h-5" />
                    Recent Inventory Performance
                  </CardTitle>
                  <CardDescription>
                    Sales by last received date
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {insights.recentInventory && insights.recentInventory.length > 0 ? (
                    <div className="space-y-3">
                      {insights.recentInventory.map((recency, index) => (
                        <div 
                          key={index} 
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                          data-testid={`recent-inventory-${index}`}
                        >
                          <div>
                            <p className="font-medium">{recency.recencyGroup}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatNumber(recency.totalSales)} units • {formatNumber(recency.itemCount)} unique items
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-green-600 dark:text-green-500">
                              {formatCurrency(recency.totalRevenue)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">No recent inventory data available</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Time-based Analytics Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Monthly Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Monthly Performance
                  </CardTitle>
                  <CardDescription>
                    Revenue trends by month
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {insights.byMonth.length > 0 ? (
                    <div className="space-y-3">
                      {insights.byMonth.slice(0, 12).map((month, index) => (
                        <div 
                          key={index} 
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                          data-testid={`month-${index}`}
                        >
                          <div>
                            <p className="font-medium">{month.month}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatNumber(month.transactionCount)} transactions
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-green-600 dark:text-green-500">
                              {formatCurrency(month.totalRevenue)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">No monthly data available</p>
                  )}
                </CardContent>
              </Card>

              {/* Yearly Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Yearly Summary
                  </CardTitle>
                  <CardDescription>
                    Annual performance overview
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {insights.byYear.length > 0 ? (
                    <div className="space-y-3">
                      {insights.byYear.map((year, index) => (
                        <div 
                          key={index} 
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                          data-testid={`year-${index}`}
                        >
                          <div>
                            <p className="font-medium text-lg">{year.year}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatNumber(year.transactionCount)} transactions
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-lg text-green-600 dark:text-green-500">
                              {formatCurrency(year.totalRevenue)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">No yearly data available</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Summary Stats */}
            {insights.byItem.length > 0 && (
              <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Data Insights Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-background/50 rounded-lg" data-testid="stat-stores">
                      <p className="text-2xl font-bold">{insights.byStore.length}</p>
                      <p className="text-sm text-muted-foreground">Active Stores</p>
                    </div>
                    <div className="text-center p-4 bg-background/50 rounded-lg" data-testid="stat-products">
                      <p className="text-2xl font-bold">{insights.byItem.length}</p>
                      <p className="text-sm text-muted-foreground">Unique Products</p>
                    </div>
                    <div className="text-center p-4 bg-background/50 rounded-lg" data-testid="stat-linked">
                      <p className="text-2xl font-bold">
                        {insights.byItem.filter(item => item.vendorName).length}
                      </p>
                      <p className="text-sm text-muted-foreground">Linked to Item List</p>
                    </div>
                    <div className="text-center p-4 bg-background/50 rounded-lg" data-testid="stat-unlinked">
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-500">
                        {insights.byItem.filter(item => !item.vendorName).length}
                      </p>
                      <p className="text-sm text-muted-foreground">Not Linked</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
          </TabsContent>

          <TabsContent value="inventory" className="space-y-6">
            <InventoryTurnoverDashboard />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

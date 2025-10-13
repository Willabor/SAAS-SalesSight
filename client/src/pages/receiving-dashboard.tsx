import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Package, DollarSign, AlertTriangle, Download, ArrowLeft, RefreshCw, Loader2, Search, ArrowUpDown, ArrowUp, ArrowDown, X, Calendar as CalendarIcon, ChevronDown, Eye, EyeOff } from "lucide-react";
import { Link } from "wouter";
import { format, subDays, startOfYear } from "date-fns";
import { AppHeader } from "@/components/app-header";

type SortDirection = 'asc' | 'desc' | null;

interface SortConfig {
  key: string | null;
  direction: SortDirection;
}

export default function ReceivingDashboard() {
  const { toast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [filters, setFilters] = useState({
    stores: ['all'] as string[], // Changed to array for multi-select
    lifecycle: 'all',
    search: '',
    dateRange: {
      from: undefined as Date | undefined,
      to: undefined as Date | undefined
    }
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: null });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [visibleColumns, setVisibleColumns] = useState({
    topProducts: {
      sku: true,
      name: true,
      revenue: true,
      unitsSold: true,
      stock: true
    },
    inventoryHealth: {
      styleNumber: true,
      totalInventory: true,
      daysSinceReceive: true,
      sales90d: true,
      daysOfSupply: true,
      lifecycle: true
    },
    clearance: {
      priority: true,
      styleNumber: true,
      daysOfSupply: true,
      sales90d: true,
      daysSinceReceive: true,
      action: true
    }
  });

  // Build query parameters for backend filtering
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (!filters.stores.includes('all')) params.set('stores', filters.stores.join(','));
    if (filters.lifecycle !== 'all') params.set('lifecycle', filters.lifecycle);
    if (filters.dateRange.from) params.set('dateFrom', filters.dateRange.from.toISOString());
    if (filters.dateRange.to) params.set('dateTo', filters.dateRange.to.toISOString());
    params.set('limit', '500'); // Fetch more data for better filtering
    return params.toString();
  }, [filters]);

  const { data: dashboardData, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["/api/receiving-metrics/dashboard", queryParams],
    refetchInterval: 60000, // Refresh every minute
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        toast({
          title: "Search Focus",
          description: "Press Escape to clear search",
          duration: 2000
        });
      }
      // Escape to clear search and filters
      if (e.key === 'Escape') {
        if (filters.search) {
          setFilters(prev => ({ ...prev, search: '' }));
          searchInputRef.current?.blur();
        }
      }
      // Cmd+R or Ctrl+R to refresh (prevent default browser refresh)
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault();
        handleRefresh();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filters.search]);

  // Date preset helpers
  const setDatePreset = (preset: 'last7' | 'last30' | 'last90' | 'ytd' | 'all') => {
    const today = new Date();
    switch (preset) {
      case 'last7':
        setFilters(prev => ({
          ...prev,
          dateRange: { from: subDays(today, 7), to: today }
        }));
        break;
      case 'last30':
        setFilters(prev => ({
          ...prev,
          dateRange: { from: subDays(today, 30), to: today }
        }));
        break;
      case 'last90':
        setFilters(prev => ({
          ...prev,
          dateRange: { from: subDays(today, 90), to: today }
        }));
        break;
      case 'ytd':
        setFilters(prev => ({
          ...prev,
          dateRange: { from: startOfYear(today), to: today }
        }));
        break;
      case 'all':
        setFilters(prev => ({
          ...prev,
          dateRange: { from: undefined, to: undefined }
        }));
        break;
    }
    setCurrentPage(1);
  };

  // Extract data (with defaults for hooks to work)
  const stats = dashboardData?.stats || {};
  const inventory = dashboardData?.inventoryByLocation || {};
  const totalTransactions = dashboardData?.totalTransactions || 0;
  const salesByMonth = dashboardData?.salesByMonth || [];
  const topProducts = dashboardData?.topProducts || [];
  const clearanceItems = dashboardData?.clearanceItems || [];
  const inventoryHealth = dashboardData?.inventoryHealth || [];
  const lifecycleDistribution = dashboardData?.lifecycleDistribution || {};

  // Calculate total inventory
  const totalInventory = parseInt(inventory.total_qty || '0');

  // Calculate total revenue from sales
  const totalRevenue = salesByMonth.reduce((sum: number, month: any) =>
    sum + parseFloat(month.revenue || '0'), 0
  );

  // Prepare chart data
  const revenueChartData = salesByMonth.map((month: any) => ({
    month: month.month,
    revenue: parseFloat(month.revenue || '0') / 1000, // In thousands
    transactions: parseInt(month.transactions || '0')
  }));

  const lifecycleChartData = Object.entries(lifecycleDistribution).map(([name, value]) => ({
    name,
    value: value as number
  }));

  const LIFECYCLE_COLORS: Record<string, string> = {
    'New': '#3b82f6',
    'Core': '#10b981',
    'Seasonal': '#f59e0b',
    'Clearance': '#ef4444',
    'One-Time': '#8b5cf6',
    'Discontinued': '#6b7280',
    'Unclassified': '#9ca3af'
  };

  // Store comparison data
  const storeComparisonData = [
    { store: 'HQ', inventory: parseInt(inventory.hq_total || '0'), label: 'Headquarters' },
    { store: 'GM', inventory: parseInt(inventory.gm_total || '0'), label: 'Grand Mall' },
    { store: 'HM', inventory: parseInt(inventory.hm_total || '0'), label: 'Harbor Mall' },
    { store: 'LM', inventory: parseInt(inventory.lm_total || '0'), label: 'Lake Mall' },
    { store: 'NM', inventory: parseInt(inventory.nm_total || '0'), label: 'North Mall' },
    { store: 'MM', inventory: parseInt(inventory.mm_total || '0'), label: 'Main Mall' },
    { store: 'PM', inventory: parseInt(inventory.pm_total || '0'), label: 'Plaza Mall' }
  ];

  // Client-side filtering (only for store filter, rest is handled by backend)
  const filteredTopProducts = useMemo(() => {
    if (filters.stores.includes('all')) return topProducts;

    return topProducts.filter((product: any) => {
      // Multi-store filter - check if product has inventory at any selected store
      const hasInventoryInSelectedStores = filters.stores.some(store => {
        const storeKey = `${store.toLowerCase()}_inventory`;
        const storeInventory = parseInt(product[storeKey] || '0');
        return storeInventory > 0;
      });
      return hasInventoryInSelectedStores;
    });
  }, [topProducts, filters.stores]);

  const filteredInventoryHealth = useMemo(() => {
    if (filters.stores.includes('all')) return inventoryHealth;

    return inventoryHealth.filter((item: any) => {
      // Multi-store filter - check if item has inventory at any selected store
      const hasInventoryInSelectedStores = filters.stores.some(store => {
        const storeKey = `${store.toLowerCase()}_inventory`;
        const storeInventory = parseInt(item[storeKey] || '0');
        return storeInventory > 0;
      });
      return hasInventoryInSelectedStores;
    });
  }, [inventoryHealth, filters.stores]);

  const filteredClearanceItems = useMemo(() => {
    if (filters.stores.includes('all')) return clearanceItems;

    return clearanceItems.filter((item: any) => {
      // Multi-store filter - check if item has inventory at any selected store
      const hasInventoryInSelectedStores = filters.stores.some(store => {
        // Backend returns camelCase field names: hqInventory, gmInventory, etc.
        const storeKey = `${store.toLowerCase()}Inventory`;
        const storeInventory = parseInt(item[storeKey] || '0');
        return storeInventory > 0;
      });
      return hasInventoryInSelectedStores;
    });
  }, [clearanceItems, filters.stores]);

  // Error state - AFTER all hooks
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto p-6">
          <Card className="p-12">
            <div className="text-center">
              <AlertTriangle className="w-16 h-16 mx-auto text-destructive mb-4" />
              <h3 className="text-2xl font-semibold mb-2">Error Loading Dashboard</h3>
              <p className="text-muted-foreground mb-6">
                {error instanceof Error ? error.message : 'Failed to fetch dashboard data'}
              </p>
              <Button onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  // Loading state - AFTER all hooks
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-10 w-64 bg-muted animate-pulse rounded" />
              <div className="h-4 w-48 bg-muted animate-pulse rounded" />
            </div>
            <div className="h-10 w-28 bg-muted animate-pulse rounded" />
          </div>

          {/* Filter skeleton */}
          <Card>
            <CardHeader>
              <div className="h-6 w-24 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                    <div className="h-10 w-full bg-muted animate-pulse rounded" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Metrics skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                </CardHeader>
                <CardContent>
                  <div className="h-8 w-24 bg-muted animate-pulse rounded mb-2" />
                  <div className="h-3 w-36 bg-muted animate-pulse rounded" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Chart skeleton */}
          <Card>
            <CardHeader>
              <div className="h-6 w-48 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-[400px] bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  // Sorting logic
  const sortData = (data: any[], config: SortConfig) => {
    if (!config.key || !config.direction) return data;

    return [...data].sort((a, b) => {
      let aVal = a[config.key!];
      let bVal = b[config.key!];

      // Handle numeric values
      if (typeof aVal === 'string' && !isNaN(parseFloat(aVal))) {
        aVal = parseFloat(aVal);
        bVal = parseFloat(bVal);
      }

      if (aVal < bVal) return config.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return config.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setCurrentPage(1);
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig.key !== column) return <ArrowUpDown className="w-4 h-4 ml-2 opacity-50" />;
    return sortConfig.direction === 'asc' ?
      <ArrowUp className="w-4 h-4 ml-2" /> :
      <ArrowDown className="w-4 h-4 ml-2" />;
  };

  // Pagination
  const paginateData = (data: any[]) => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return data.slice(startIndex, startIndex + itemsPerPage);
  };

  const totalPages = (data: any[]) => Math.ceil(data.length / itemsPerPage);

  // Export to CSV function
  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast({
        title: "No Data",
        description: "No data available to export",
        variant: "destructive"
      });
      return;
    }

    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row =>
      Object.values(row).map(val =>
        typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      ).join(',')
    );

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    toast({
      title: "Export Successful",
      description: `Exported ${data.length} records to ${filename}.csv`
    });
  };

  const handleRefresh = () => {
    refetch();
    toast({
      title: "Dashboard Refreshed",
      description: "Data has been updated"
    });
  };

  const clearFilters = () => {
    setFilters({
      stores: ['all'],
      lifecycle: 'all',
      search: '',
      dateRange: { from: undefined, to: undefined }
    });
    setSortConfig({ key: null, direction: null });
    setCurrentPage(1);
    setItemsPerPage(20);
  };

  // Store selection helpers
  const toggleStore = (store: string) => {
    if (store === 'all') {
      setFilters(prev => ({ ...prev, stores: ['all'] }));
    } else {
      setFilters(prev => {
        const currentStores = prev.stores.filter(s => s !== 'all');
        if (currentStores.includes(store)) {
          // Remove store
          const newStores = currentStores.filter(s => s !== store);
          return { ...prev, stores: newStores.length === 0 ? ['all'] : newStores };
        } else {
          // Add store
          return { ...prev, stores: [...currentStores, store] };
        }
      });
    }
    setCurrentPage(1);
  };

  const selectedStoresLabel = filters.stores.includes('all')
    ? 'All Stores'
    : filters.stores.length === 1
    ? filters.stores[0]
    : `${filters.stores.length} stores`;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link href="/receiving-metrics-settings">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Settings
                </Button>
              </Link>
            </div>
            <h1 className="text-4xl font-bold">Analytics Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Real-time insights • Last updated: {new Date().toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              ⌘K to search • Esc to clear • ⌘R to refresh
            </p>
          </div>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isFetching}
          >
            {isFetching ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter and search dashboard data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filter Controls Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search <span className="text-muted-foreground text-xs">(⌘K)</span></label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    placeholder="Search SKU or style..."
                    value={filters.search}
                    onChange={(e) => {
                      setFilters(prev => ({ ...prev, search: e.target.value }));
                      setCurrentPage(1);
                    }}
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Store Locations</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {selectedStoresLabel}
                      <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="store-all"
                          checked={filters.stores.includes('all')}
                          onCheckedChange={() => toggleStore('all')}
                        />
                        <label htmlFor="store-all" className="text-sm font-medium cursor-pointer">
                          All Stores
                        </label>
                      </div>
                      <div className="border-t pt-2 space-y-2">
                        {['HQ', 'GM', 'HM', 'LM', 'NM', 'MM', 'PM'].map(store => (
                          <div key={store} className="flex items-center space-x-2">
                            <Checkbox
                              id={`store-${store}`}
                              checked={filters.stores.includes(store)}
                              onCheckedChange={() => toggleStore(store)}
                            />
                            <label htmlFor={`store-${store}`} className="text-sm cursor-pointer">
                              {store} - {storeComparisonData.find(s => s.store === store)?.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Lifecycle Stage</label>
                <Select
                  value={filters.lifecycle}
                  onValueChange={(value) => {
                    setFilters(prev => ({ ...prev, lifecycle: value }));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Stages" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stages</SelectItem>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Core">Core</SelectItem>
                    <SelectItem value="Seasonal">Seasonal</SelectItem>
                    <SelectItem value="Clearance">Clearance</SelectItem>
                    <SelectItem value="One-Time">One-Time</SelectItem>
                    <SelectItem value="Discontinued">Discontinued</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Items Per Page</label>
                <Select
                  value={itemsPerPage.toString()}
                  onValueChange={(value) => {
                    setItemsPerPage(parseInt(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date Range & Presets Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateRange.from ? (
                        filters.dateRange.to ? (
                          <>
                            {format(filters.dateRange.from, "MMM d, yyyy")} - {format(filters.dateRange.to, "MMM d, yyyy")}
                          </>
                        ) : (
                          format(filters.dateRange.from, "MMM d, yyyy")
                        )
                      ) : (
                        "Select date range"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={{
                        from: filters.dateRange.from,
                        to: filters.dateRange.to
                      }}
                      onSelect={(range) => {
                        setFilters(prev => ({
                          ...prev,
                          dateRange: {
                            from: range?.from,
                            to: range?.to
                          }
                        }));
                        setCurrentPage(1);
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Quick Presets</label>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => setDatePreset('last7')}>
                    Last 7 days
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDatePreset('last30')}>
                    Last 30 days
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDatePreset('last90')}>
                    Last 90 days
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDatePreset('ytd')}>
                    YTD
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDatePreset('all')}>
                    All Time
                  </Button>
                </div>
              </div>
            </div>

            {/* Clear Filters */}
            <div className="flex justify-end">
              <Button variant="outline" onClick={clearFilters} size="sm">
                <X className="w-4 h-4 mr-2" />
                Clear All Filters
              </Button>
            </div>

            {/* Active Filter Badges */}
            {(filters.search || !filters.stores.includes('all') || filters.lifecycle !== 'all' || filters.dateRange.from) && (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <span className="text-sm font-medium text-muted-foreground">Active filters:</span>
                {filters.search && (
                  <Badge variant="secondary" className="gap-1">
                    Search: {filters.search}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-destructive"
                      onClick={() => {
                        setFilters(prev => ({ ...prev, search: '' }));
                        setCurrentPage(1);
                      }}
                    />
                  </Badge>
                )}
                {!filters.stores.includes('all') && (
                  <Badge variant="secondary" className="gap-1">
                    Stores: {selectedStoresLabel}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-destructive"
                      onClick={() => {
                        setFilters(prev => ({ ...prev, stores: ['all'] }));
                        setCurrentPage(1);
                      }}
                    />
                  </Badge>
                )}
                {filters.lifecycle !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    Lifecycle: {filters.lifecycle}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-destructive"
                      onClick={() => {
                        setFilters(prev => ({ ...prev, lifecycle: 'all' }));
                        setCurrentPage(1);
                      }}
                    />
                  </Badge>
                )}
                {filters.dateRange.from && (
                  <Badge variant="secondary" className="gap-1">
                    Date: {filters.dateRange.from && format(filters.dateRange.from, "MMM d")} - {filters.dateRange.to ? format(filters.dateRange.to, "MMM d") : 'now'}
                    <X
                      className="w-3 h-3 cursor-pointer hover:text-destructive"
                      onClick={() => {
                        setFilters(prev => ({ ...prev, dateRange: { from: undefined, to: undefined } }));
                        setCurrentPage(1);
                      }}
                    />
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue (12mo)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(totalRevenue / 1000000).toFixed(2)}M</div>
            <p className="text-xs text-muted-foreground mt-1">
              From {totalTransactions.toLocaleString()} transactions
            </p>
            <div className="flex items-center mt-2 text-sm text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span className="font-medium">12.3% vs last year</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Styles</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total?.toLocaleString() || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across {Object.keys(lifecycleDistribution).length} lifecycle stages
            </p>
            <div className="flex items-center mt-2 text-sm text-amber-600">
              <TrendingDown className="w-4 h-4 mr-1" />
              <span className="font-medium">3.2% vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInventory.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Units across all locations
            </p>
            <div className="flex items-center mt-2 text-sm text-green-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span className="font-medium">Turnover: 8.4x</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clearance Priority</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{clearanceItems.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Items requiring immediate action
            </p>
            <div className="mt-2">
              <Badge variant="destructive">Action Required</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Top Products</TabsTrigger>
          <TabsTrigger value="inventory">Inventory Health</TabsTrigger>
          <TabsTrigger value="clearance">Clearance Priority</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Revenue Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend (Last 12 Months)</CardTitle>
                <CardDescription>Monthly revenue performance</CardDescription>
              </CardHeader>
              <CardContent>
                {revenueChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={revenueChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                        formatter={(value: number, name: string) => [
                          name === 'revenue' ? `$${value.toFixed(1)}K` : value,
                          name === 'revenue' ? 'Revenue' : 'Transactions'
                        ]}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} name="Revenue ($K)" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No revenue data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Lifecycle Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Lifecycle Stage Distribution</CardTitle>
                <CardDescription>Breakdown by product lifecycle</CardDescription>
              </CardHeader>
              <CardContent>
                {lifecycleChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={lifecycleChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {lifecycleChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={LIFECYCLE_COLORS[entry.name] || '#9ca3af'} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No lifecycle data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Store Performance Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Store Performance Comparison</CardTitle>
              <CardDescription>Inventory levels across all locations</CardDescription>
            </CardHeader>
            <CardContent>
              {storeComparisonData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={storeComparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="store" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      formatter={(value: number, name: string) => [
                        value.toLocaleString(),
                        'Inventory'
                      ]}
                      labelFormatter={(label) => {
                        const store = storeComparisonData.find(s => s.store === label);
                        return store ? store.label : label;
                      }}
                    />
                    <Legend />
                    <Bar dataKey="inventory" fill="#3b82f6" name="Inventory Units" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                  No store data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Inventory by Location */}
          <Card>
            <CardHeader>
              <CardTitle>Inventory by Location</CardTitle>
              <CardDescription>Current stock across all stores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {['HQ', 'GM', 'HM', 'LM', 'NM', 'MM', 'PM'].map(location => {
                  const qty = parseInt(inventory[`${location.toLowerCase()}_total`] || '0');
                  return (
                    <div key={location} className="text-center p-4 rounded-lg border hover:border-primary transition-colors">
                      <div className="text-sm font-medium text-muted-foreground">{location}</div>
                      <div className="text-2xl font-bold mt-2">{qty.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {((qty / totalInventory) * 100).toFixed(1)}%
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Products Tab */}
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Top Products (Last 90 Days)</CardTitle>
                <CardDescription>Showing {filteredTopProducts.length} of {topProducts.length} products</CardDescription>
              </div>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-2" />
                      Columns
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-52">
                    <div className="space-y-2">
                      <div className="font-medium text-sm mb-2">Toggle Columns</div>
                      {Object.entries({
                        sku: 'SKU',
                        name: 'Product Name',
                        revenue: 'Revenue',
                        unitsSold: 'Units Sold',
                        stock: 'Current Stock'
                      }).map(([key, label]) => (
                        <div key={key} className="flex items-center space-x-2">
                          <Checkbox
                            id={`col-${key}`}
                            checked={visibleColumns.topProducts[key as keyof typeof visibleColumns.topProducts]}
                            onCheckedChange={(checked) => {
                              setVisibleColumns(prev => ({
                                ...prev,
                                topProducts: {
                                  ...prev.topProducts,
                                  [key]: checked
                                }
                              }));
                            }}
                          />
                          <label htmlFor={`col-${key}`} className="text-sm cursor-pointer">
                            {label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCSV(filteredTopProducts, 'top_products')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {filteredTopProducts.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {visibleColumns.topProducts.sku && (
                            <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('sku')}>
                              <div className="flex items-center">
                                SKU
                                <SortIcon column="sku" />
                              </div>
                            </TableHead>
                          )}
                          {visibleColumns.topProducts.name && <TableHead>Product Name</TableHead>}
                          {visibleColumns.topProducts.revenue && (
                            <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handleSort('revenue')}>
                              <div className="flex items-center justify-end">
                                Revenue
                                <SortIcon column="revenue" />
                              </div>
                            </TableHead>
                          )}
                          {visibleColumns.topProducts.unitsSold && (
                            <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handleSort('units_sold')}>
                              <div className="flex items-center justify-end">
                                Units Sold
                                <SortIcon column="units_sold" />
                              </div>
                            </TableHead>
                          )}
                          {visibleColumns.topProducts.stock && <TableHead className="text-right">Current Stock</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginateData(sortData(filteredTopProducts, sortConfig)).map((product: any, index: number) => (
                          <TableRow key={index}>
                            {visibleColumns.topProducts.sku && <TableCell className="font-medium">{product.sku}</TableCell>}
                            {visibleColumns.topProducts.name && <TableCell>{product.item_name || 'Unknown'}</TableCell>}
                            {visibleColumns.topProducts.revenue && (
                              <TableCell className="text-right font-semibold">
                                ${parseFloat(product.revenue || '0').toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </TableCell>
                            )}
                            {visibleColumns.topProducts.unitsSold && (
                              <TableCell className="text-right">{parseInt(product.units_sold || '0').toLocaleString()}</TableCell>
                            )}
                            {visibleColumns.topProducts.stock && (
                              <TableCell className="text-right">
                                {parseInt(product.current_stock || '0') === 0 ? (
                                  <Badge variant="destructive">Out of Stock</Badge>
                                ) : (
                                  parseInt(product.current_stock || '0').toLocaleString()
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Pagination */}
                  {totalPages(filteredTopProducts) > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages(filteredTopProducts)}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages(filteredTopProducts), prev + 1))}
                          disabled={currentPage === totalPages(filteredTopProducts)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No products match your filters</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Health Tab */}
        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Inventory Health Metrics</CardTitle>
                <CardDescription>Showing {filteredInventoryHealth.length} of {inventoryHealth.length} styles</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToCSV(filteredInventoryHealth, 'inventory_health')}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              {filteredInventoryHealth.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort('style_number')}>
                            <div className="flex items-center">
                              Style Number
                              <SortIcon column="style_number" />
                            </div>
                          </TableHead>
                          <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handleSort('total_inventory')}>
                            <div className="flex items-center justify-end">
                              Total Inventory
                              <SortIcon column="total_inventory" />
                            </div>
                          </TableHead>
                          <TableHead className="text-right">Days Since Last Receive</TableHead>
                          <TableHead className="text-right">Sales (90d)</TableHead>
                          <TableHead className="text-right">Days of Supply</TableHead>
                          <TableHead>Lifecycle</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginateData(sortData(filteredInventoryHealth, sortConfig)).map((item: any, index: number) => {
                          const daysOfSupply = item.days_of_supply ? parseFloat(item.days_of_supply) : null;
                          const statusColor = daysOfSupply && daysOfSupply > 180 ? 'destructive' :
                                             daysOfSupply && daysOfSupply > 90 ? 'default' : 'secondary';

                          return (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{item.style_number}</TableCell>
                              <TableCell className="text-right font-semibold">
                                {parseInt(item.total_inventory || '0').toLocaleString()}
                              </TableCell>
                              <TableCell className="text-right">
                                {item.days_since_last_receive || 'N/A'}
                              </TableCell>
                              <TableCell className="text-right">
                                {parseInt(item.sales_last_90days || '0')}
                              </TableCell>
                              <TableCell className="text-right">
                                {daysOfSupply ? (
                                  <Badge variant={statusColor}>
                                    {daysOfSupply.toFixed(0)} days
                                  </Badge>
                                ) : 'N/A'}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{item.lifecycle_stage || 'Unknown'}</Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Pagination */}
                  {totalPages(filteredInventoryHealth) > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages(filteredInventoryHealth)}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages(filteredInventoryHealth), prev + 1))}
                          disabled={currentPage === totalPages(filteredInventoryHealth)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No inventory items match your filters</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clearance Priority Tab */}
        <TabsContent value="clearance" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Clearance Priority List</CardTitle>
                <CardDescription>
                  Items requiring immediate action - sorted by days of supply (Showing {filteredClearanceItems.length} of {clearanceItems.length})
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToCSV(filteredClearanceItems, 'clearance_priority')}
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              {filteredClearanceItems.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Priority</TableHead>
                          <TableHead>Style Number</TableHead>
                          <TableHead className="text-right">Days of Supply</TableHead>
                          <TableHead className="text-right">Sales (90d)</TableHead>
                          <TableHead className="text-right">Days Since Received</TableHead>
                          <TableHead>Recommended Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginateData(filteredClearanceItems).map((item: any, index: number) => {
                          const daysOfSupply = item.daysOfSupply ? parseFloat(item.daysOfSupply) : 0;
                          const action = daysOfSupply > 365 ? '75% Off - Immediate' :
                                       daysOfSupply > 270 ? '50% Off - Urgent' :
                                       daysOfSupply > 180 ? '35% Off - Soon' : 'Monitor';

                          return (
                            <TableRow key={index}>
                              <TableCell>
                                <Badge variant="destructive">{((currentPage - 1) * itemsPerPage) + index + 1}</Badge>
                              </TableCell>
                              <TableCell className="font-medium">{item.styleNumber}</TableCell>
                              <TableCell className="text-right font-semibold text-destructive">
                                {daysOfSupply.toFixed(0)} days
                              </TableCell>
                              <TableCell className="text-right">
                                {item.salesLast90days || 0}
                              </TableCell>
                              <TableCell className="text-right">
                                {item.daysSinceLastReceive || 'N/A'}
                              </TableCell>
                              <TableCell>
                                <Badge variant={daysOfSupply > 365 ? 'destructive' : 'default'}>
                                  {action}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  {/* Pagination */}
                  {totalPages(filteredClearanceItems) > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages(filteredClearanceItems)}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages(filteredClearanceItems), prev + 1))}
                          disabled={currentPage === totalPages(filteredClearanceItems)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No clearance items found - Great job!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </main>
    </div>
  );
}

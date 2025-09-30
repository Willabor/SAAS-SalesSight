import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Trash2, 
  DatabaseZap, 
  Package,
  ChevronLeft,
  ChevronRight,
  Download,
  Columns,
  DollarSign,
  TrendingUp,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import type { ItemList } from "@shared/schema";

interface ItemListResponse {
  items: ItemList[];
  total: number;
}

interface ColumnConfig {
  key: keyof ItemList;
  label: string;
  visible: boolean;
  align?: 'left' | 'right' | 'center';
  format?: (value: any) => string;
}

export default function ItemListPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterGender, setFilterGender] = useState<string>("all");
  const [filterVendor, setFilterVendor] = useState<string>("all");
  const [sortConfig, setSortConfig] = useState<{ key: keyof ItemList | null; direction: 'asc' | 'desc' }>({ 
    key: null, 
    direction: 'asc' 
  });
  
  const itemsPerPage = 50;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Column configuration with all database fields
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: 'itemNumber', label: 'Item #', visible: true },
    { key: 'itemName', label: 'Item Name', visible: true },
    { key: 'vendorName', label: 'Vendor', visible: true },
    { key: 'category', label: 'Category', visible: true },
    { key: 'gender', label: 'Gender', visible: true },
    { key: 'availQty', label: 'Available Qty', visible: true, align: 'right' },
    { key: 'hqQty', label: 'HQ Qty', visible: false, align: 'right' },
    { key: 'gmQty', label: 'GM Qty', visible: false, align: 'right' },
    { key: 'hmQty', label: 'HM Qty', visible: false, align: 'right' },
    { key: 'mmQty', label: 'MM Qty', visible: false, align: 'right' },
    { key: 'nmQty', label: 'NM Qty', visible: false, align: 'right' },
    { key: 'pmQty', label: 'PM Qty', visible: false, align: 'right' },
    { key: 'lmQty', label: 'LM Qty', visible: false, align: 'right' },
    { key: 'orderCost', label: 'Order Cost', visible: true, align: 'right', format: formatCurrency },
    { key: 'sellingPrice', label: 'Selling Price', visible: true, align: 'right', format: formatCurrency },
    { key: 'lastSold', label: 'Last Sold', visible: true, format: formatDate },
    { key: 'lastRcvd', label: 'Last Received', visible: false, format: formatDate },
    { key: 'creationDate', label: 'Creation Date', visible: false, format: formatDate },
    { key: 'styleNumber', label: 'Style #', visible: false },
    { key: 'styleNumber2', label: 'Style # 2', visible: false },
    { key: 'size', label: 'Size', visible: false },
    { key: 'attribute', label: 'Attribute', visible: false },
    { key: 'notes', label: 'Notes', visible: false },
    { key: 'fileName', label: 'File Name', visible: false },
  ]);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch item list data
  const { data: itemData, isLoading, error } = useQuery<ItemListResponse>({
    queryKey: ["/api/item-list", currentPage, debouncedSearch],
    queryFn: async () => {
      const offset = (currentPage - 1) * itemsPerPage;
      const searchParams = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: offset.toString(),
      });
      
      if (debouncedSearch) {
        searchParams.append("search", debouncedSearch);
      }
      
      const response = await fetch(`/api/item-list?${searchParams}`);
      if (!response.ok) throw new Error("Failed to fetch item list");
      return response.json();
    },
  });

  // Calculate statistics
  const stats = useMemo(() => {
    if (!itemData?.items) return { totalValue: 0, potentialProfit: 0, lowStock: 0 };
    
    const totalValue = itemData.items.reduce((sum, item) => {
      const qty = item.availQty || 0;
      const price = parseFloat(item.sellingPrice || '0');
      return sum + (qty * price);
    }, 0);
    
    const totalCost = itemData.items.reduce((sum, item) => {
      const qty = item.availQty || 0;
      const cost = parseFloat(item.orderCost || '0');
      return sum + (qty * cost);
    }, 0);
    
    const lowStock = itemData.items.filter(item => 
      (item.availQty || 0) > 0 && (item.availQty || 0) <= 2
    ).length;
    
    return {
      totalValue,
      potentialProfit: totalValue - totalCost,
      lowStock
    };
  }, [itemData]);

  // Get unique values for filters
  const filterOptions = useMemo(() => {
    if (!itemData?.items) return { categories: [], genders: [], vendors: [] };
    
    const categories = Array.from(new Set(itemData.items.map(i => i.category).filter(Boolean) as string[])).sort();
    const genders = Array.from(new Set(itemData.items.map(i => i.gender).filter(Boolean) as string[])).sort();
    const vendors = Array.from(new Set(itemData.items.map(i => i.vendorName).filter(Boolean) as string[])).sort();
    
    return { categories, genders, vendors };
  }, [itemData]);

  // Apply filters and sorting
  const filteredAndSortedItems = useMemo(() => {
    if (!itemData?.items) return [];
    
    let filtered = itemData.items.filter(item => {
      const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
      const matchesGender = filterGender === 'all' || item.gender === filterGender;
      const matchesVendor = filterVendor === 'all' || item.vendorName === filterVendor;
      
      return matchesCategory && matchesGender && matchesVendor;
    });

    // Apply sorting
    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortConfig.key!];
        const bVal = b[sortConfig.key!];
        
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [itemData, filterCategory, filterGender, filterVendor, sortConfig]);

  // Delete individual item mutation
  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/item-list/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete item");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/item-list"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/item-list"] });
      toast({
        title: "Item deleted",
        description: "Item has been successfully removed from the database.",
      });
      setDeleteItemId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete item. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete all items mutation
  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/item-list", {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to clear database");
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/item-list"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/item-list"] });
      toast({
        title: "Database cleared",
        description: `Successfully removed ${result.deletedCount} items from the database.`,
      });
      setDeleteAllDialogOpen(false);
      setCurrentPage(1);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to clear database. Please try again.",
        variant: "destructive",
      });
    },
  });

  const totalPages = Math.ceil((itemData?.total || 0) / itemsPerPage);

  function formatCurrency(value: string | null) {
    if (!value) return "N/A";
    const num = parseFloat(value);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  }

  function formatDate(date: string | null) {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  }

  const toggleColumn = (key: keyof ItemList) => {
    setColumns(prev => prev.map(col => 
      col.key === key ? { ...col, visible: !col.visible } : col
    ));
  };

  const handleSort = (key: keyof ItemList) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleExport = (type: 'all' | 'filtered') => {
    const dataToExport = type === 'all' ? (itemData?.items || []) : filteredAndSortedItems;
    
    const visibleColumns = columns.filter(col => col.visible);
    const headers = visibleColumns.map(col => col.label);
    
    const csvContent = [
      headers.join(','),
      ...dataToExport.map(item => 
        visibleColumns.map(col => {
          const value = item[col.key];
          if (value == null) return '';
          const formatted = col.format ? col.format(value) : String(value);
          return `"${formatted.replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `item_list_${type}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Export successful",
      description: `Downloaded ${dataToExport.length} items as CSV`,
    });
  };

  const getSortIcon = (columnKey: keyof ItemList) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="w-3 h-3 ml-1" />;
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-3 h-3 ml-1" />
      : <ArrowDown className="w-3 h-3 ml-1" />;
  };

  const visibleColumns = columns.filter(col => col.visible);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="max-w-[calc(100vw-2rem)] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Items</p>
                  <p className="text-3xl font-bold mt-1">{itemData?.total || 0}</p>
                </div>
                <Package className="w-10 h-10 opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Inventory Value</p>
                  <p className="text-3xl font-bold mt-1">${stats.totalValue.toLocaleString()}</p>
                </div>
                <DollarSign className="w-10 h-10 opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Potential Profit</p>
                  <p className="text-3xl font-bold mt-1">${stats.potentialProfit.toLocaleString()}</p>
                </div>
                <TrendingUp className="w-10 h-10 opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Low Stock Items</p>
                  <p className="text-3xl font-bold mt-1">{stats.lowStock}</p>
                </div>
                <AlertCircle className="w-10 h-10 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Item List Database
                </CardTitle>
                <CardDescription>
                  View, search, filter, and manage your inventory
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2" data-testid="button-columns">
                      <Columns className="w-4 h-4" />
                      Columns
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Toggle Columns</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {columns.map(col => (
                      <DropdownMenuCheckboxItem
                        key={col.key}
                        checked={col.visible}
                        onCheckedChange={() => toggleColumn(col.key)}
                        data-testid={`checkbox-column-${col.key}`}
                      >
                        {col.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-2 bg-green-600 text-white hover:bg-green-700 hover:text-white" data-testid="button-export">
                      <Download className="w-4 h-4" />
                      Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Export Options</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                      checked={false}
                      onCheckedChange={() => handleExport('all')}
                      data-testid="button-export-all"
                    >
                      <Package className="w-4 h-4 mr-2" />
                      Export All Items ({itemData?.total || 0})
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={false}
                      onCheckedChange={() => handleExport('filtered')}
                      disabled={filteredAndSortedItems.length === (itemData?.total || 0) && filterCategory === 'all' && filterGender === 'all' && filterVendor === 'all'}
                      data-testid="button-export-filtered"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export Filtered ({filteredAndSortedItems.length})
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="destructive"
                  onClick={() => setDeleteAllDialogOpen(true)}
                  disabled={deleteAllMutation.isPending || !itemData?.total}
                  className="flex items-center gap-2"
                  data-testid="button-clear-database"
                >
                  <DatabaseZap className="w-4 h-4" />
                  Clear
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Search and Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative sm:col-span-2 lg:col-span-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {filterOptions.categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterGender} onValueChange={setFilterGender}>
                <SelectTrigger data-testid="select-gender">
                  <SelectValue placeholder="All Genders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  {filterOptions.genders.map(gender => (
                    <SelectItem key={gender} value={gender}>{gender}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterVendor} onValueChange={setFilterVendor}>
                <SelectTrigger data-testid="select-vendor">
                  <SelectValue placeholder="All Vendors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {filterOptions.vendors.map(vendor => (
                    <SelectItem key={vendor} value={vendor}>{vendor}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <Badge variant="secondary">
                  Showing {filteredAndSortedItems.length} of {itemData?.total || 0} items
                </Badge>
                {(searchTerm || filterCategory !== 'all' || filterGender !== 'all' || filterVendor !== 'all') && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setFilterCategory('all');
                      setFilterGender('all');
                      setFilterVendor('all');
                    }}
                    className="text-blue-600 hover:text-blue-700"
                    data-testid="button-clear-filters"
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading items...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="text-center py-8">
                <p className="text-destructive">Failed to load items</p>
                <Button 
                  variant="outline" 
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/item-list"] })}
                  className="mt-2"
                >
                  Try Again
                </Button>
              </div>
            )}

            {/* Table */}
            {itemData && !isLoading && (
              <>
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {visibleColumns.map(col => (
                          <TableHead 
                            key={col.key} 
                            className={col.align === 'right' ? 'text-right' : ''}
                          >
                            <button
                              className="flex items-center hover:text-foreground transition-colors"
                              onClick={() => handleSort(col.key)}
                              data-testid={`sort-${col.key}`}
                            >
                              {col.label}
                              {getSortIcon(col.key)}
                            </button>
                          </TableHead>
                        ))}
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedItems.map((item) => (
                        <TableRow key={item.id} data-testid={`row-item-${item.id}`}>
                          {visibleColumns.map(col => {
                            const value = item[col.key];
                            let displayValue: React.ReactNode = null;
                            
                            if (col.format) {
                              displayValue = col.format(value);
                            } else if (col.key === 'gender' && value) {
                              displayValue = <Badge variant="outline" className="text-xs">{String(value)}</Badge>;
                            } else if (value != null) {
                              displayValue = String(value);
                            }
                            
                            return (
                              <TableCell 
                                key={col.key} 
                                className={col.align === 'right' ? 'text-right' : ''}
                              >
                                {displayValue || '-'}
                              </TableCell>
                            );
                          })}
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteItemId(item.id)}
                              disabled={deleteItemMutation.isPending}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              data-testid={`button-delete-${item.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredAndSortedItems.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={visibleColumns.length + 1} className="text-center py-8 text-muted-foreground">
                            {debouncedSearch || filterCategory !== 'all' || filterGender !== 'all' || filterVendor !== 'all'
                              ? "No items found matching your filters."
                              : "No items in the database."}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, itemData.total)} of {itemData.total} items
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        data-testid="button-prev-page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        data-testid="button-next-page"
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Delete Individual Item Dialog */}
      <AlertDialog open={deleteItemId !== null} onOpenChange={() => setDeleteItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteItemId && deleteItemMutation.mutate(deleteItemId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Database Dialog */}
      <AlertDialog open={deleteAllDialogOpen} onOpenChange={setDeleteAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Entire Database</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete ALL {itemData?.total || 0} items from the database? 
              This action cannot be undone and will permanently remove all item list data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAllMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear Database
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

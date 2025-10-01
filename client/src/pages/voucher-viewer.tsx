import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Package,
  Calendar,
  Building2,
  TrendingUp,
  DatabaseZap,
  Download,
  Columns,
  DollarSign,
  FileText,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
} from "lucide-react";
import { AppHeader } from "@/components/app-header";

interface ReceivingLine {
  id: number;
  voucherId: number;
  itemNumber: string | null;
  itemName: string | null;
  qty: number;
  cost: string;
}

interface ReceivingVoucher {
  id: number;
  voucherNumber: string | null;
  date: string | null;
  store: string | null;
  vendor: string | null;
  type: string;
  qbTotal: string | null;
  correctedTotal: string | null;
  totalQty: number;
  time: string | null;
  fileName: string | null;
}

interface VoucherWithLines extends ReceivingVoucher {
  lines: ReceivingLine[];
}

interface VoucherListResponse {
  vouchers: ReceivingVoucher[];
  total: number;
}

interface ColumnConfig {
  key: keyof ReceivingVoucher;
  label: string;
  visible: boolean;
  align?: 'left' | 'right' | 'center';
  format?: (value: any) => string | React.ReactNode;
}

interface StatsData {
  totalVouchers: number;
  totalLines: number;
  totalCost: number;
  uniqueVendors: number;
  uniqueStores: number;
}

export default function VoucherViewerPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherWithLines | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [deleteVoucherId, setDeleteVoucherId] = useState<number | null>(null);
  const [filterStore, setFilterStore] = useState<string>("all");
  const [filterVendor, setFilterVendor] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [sortConfig, setSortConfig] = useState<{ key: keyof ReceivingVoucher | null; direction: 'asc' | 'desc' }>({
    key: null,
    direction: 'desc'
  });
  const { toast } = useToast();

  const itemsPerPage = 50;

  // Helper functions
  function formatCurrency(value: string | null) {
    if (!value) return "$0.00";
    const num = parseFloat(value);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  }

  function formatDate(date: string | null) {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  }

  // Column configuration with all database fields
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { key: 'voucherNumber', label: 'Voucher #', visible: true },
    { key: 'date', label: 'Date', visible: true, format: formatDate },
    { key: 'store', label: 'Store', visible: true },
    { key: 'vendor', label: 'Vendor', visible: true },
    { key: 'type', label: 'Type', visible: true },
    { key: 'totalQty', label: 'Total Qty', visible: true, align: 'right' },
    { key: 'qbTotal', label: 'QB Total', visible: true, align: 'right', format: formatCurrency },
    { key: 'correctedTotal', label: 'Corrected Total', visible: true, align: 'right', format: formatCurrency },
    { key: 'time', label: 'Time', visible: false },
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

  // Reset to page 1 when filters or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStore, filterVendor, filterType, sortConfig.key, sortConfig.direction]);

  // Fetch voucher list data with all filters and sorting
  const { data: voucherData, isLoading } = useQuery<VoucherListResponse>({
    queryKey: ["/api/receiving/vouchers", currentPage, debouncedSearch, filterStore, filterVendor, filterType, sortConfig.key, sortConfig.direction],
    queryFn: async () => {
      const offset = (currentPage - 1) * itemsPerPage;
      const searchParams = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: offset.toString(),
      });

      if (debouncedSearch) {
        searchParams.append("search", debouncedSearch);
      }

      if (filterStore && filterStore !== 'all') {
        searchParams.append("store", filterStore);
      }

      if (filterVendor && filterVendor !== 'all') {
        searchParams.append("vendor", filterVendor);
      }

      if (filterType && filterType !== 'all') {
        searchParams.append("type", filterType);
      }

      if (sortConfig.key) {
        searchParams.append("sortBy", sortConfig.key);
        searchParams.append("sortDirection", sortConfig.direction);
      }

      const response = await fetch(`/api/receiving/vouchers?${searchParams}`);
      if (!response.ok) throw new Error("Failed to fetch vouchers");
      return response.json();
    },
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 0, // Always fetch fresh data
  });

  // Fetch statistics
  const { data: stats } = useQuery<StatsData>({
    queryKey: ["/api/receiving/stats"],
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 0, // Always fetch fresh data
  });

  // Fetch filter options from server
  const { data: filterOptions } = useQuery<{ stores: string[]; vendors: string[]; types: string[] }>({
    queryKey: ["/api/receiving/filter-options"],
    queryFn: async () => {
      const response = await fetch("/api/receiving/filter-options");
      if (!response.ok) throw new Error("Failed to fetch filter options");
      return response.json();
    },
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 30000, // Cache for 30 seconds (filter options don't change as often)
  });

  // Fetch voucher detail
  const { data: voucherDetail, isLoading: isLoadingDetail } = useQuery<VoucherWithLines>({
    queryKey: ["/api/receiving/vouchers", selectedVoucher?.id],
    enabled: !!selectedVoucher && detailDialogOpen,
    queryFn: async () => {
      const response = await fetch(`/api/receiving/vouchers/${selectedVoucher?.id}`);
      if (!response.ok) throw new Error("Failed to fetch voucher details");
      return response.json();
    },
  });

  // Vouchers are already filtered and sorted by the server
  const displayVouchers = voucherData?.vouchers || [];

  // Total pages calculation based on server-side total
  const totalPages = Math.ceil((voucherData?.total || 0) / itemsPerPage);

  // Delete individual voucher mutation
  const deleteVoucherMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/receiving/vouchers/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/receiving/vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/receiving/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/receiving/filter-options"] });
      toast({
        title: "Voucher deleted",
        description: "Voucher has been successfully removed from the database.",
      });
      setDeleteVoucherId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete voucher. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete all vouchers mutation
  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/receiving/vouchers");
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/receiving/vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/receiving/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/receiving/filter-options"] });
      toast({
        title: "Database cleared",
        description: `Successfully removed ${result.deletedCount} vouchers from the database.`,
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

  const handleViewDetails = (voucher: ReceivingVoucher) => {
    setSelectedVoucher(voucher as VoucherWithLines);
    setDetailDialogOpen(true);
  };

  const toggleColumn = (key: keyof ReceivingVoucher) => {
    setColumns(prev => prev.map(col =>
      col.key === key ? { ...col, visible: !col.visible } : col
    ));
  };

  const handleSort = (key: keyof ReceivingVoucher) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleExport = async (type: 'all' | 'filtered') => {
    try {
      let dataToExport: ReceivingVoucher[] = [];

      if (type === 'all') {
        // Fetch all data from export endpoint
        const response = await fetch('/api/receiving/export');
        if (!response.ok) throw new Error("Failed to fetch vouchers");
        dataToExport = await response.json();
      } else {
        // Fetch filtered data from export endpoint
        const searchParams = new URLSearchParams();
        if (filterStore && filterStore !== 'all') searchParams.append('store', filterStore);
        if (filterVendor && filterVendor !== 'all') searchParams.append('vendor', filterVendor);
        if (filterType && filterType !== 'all') searchParams.append('type', filterType);
        if (debouncedSearch) searchParams.append('search', debouncedSearch);

        const response = await fetch(`/api/receiving/export?${searchParams}`);
        if (!response.ok) throw new Error("Failed to export vouchers");
        dataToExport = await response.json();
      }

      const visibleColumns = columns.filter(col => col.visible);
      const headers = visibleColumns.map(col => col.label);

      const csvContent = [
        headers.join(','),
        ...dataToExport.map(voucher =>
          visibleColumns.map(col => {
            const value = voucher[col.key];
            if (value == null) return '';
            let formatted: string;
            if (col.format) {
              const result = col.format(value);
              formatted = typeof result === 'string' ? result : String(value);
            } else {
              formatted = String(value);
            }
            return `"${formatted.replace(/"/g, '""')}"`;
          }).join(',')
        )
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `receiving_vouchers_${type}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export successful",
        description: `Downloaded ${dataToExport.length} vouchers as CSV`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to export vouchers. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getSortIcon = (columnKey: keyof ReceivingVoucher) => {
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
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium">Total Vouchers</p>
                    <p className="text-3xl font-bold mt-1">{stats.totalVouchers.toLocaleString()}</p>
                  </div>
                  <FileText className="w-10 h-10 opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Total Cost</p>
                    <p className="text-3xl font-bold mt-1">${stats.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  <DollarSign className="w-10 h-10 opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Line Items</p>
                    <p className="text-3xl font-bold mt-1">{stats.totalLines.toLocaleString()}</p>
                  </div>
                  <Package className="w-10 h-10 opacity-80" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm font-medium">Unique Vendors</p>
                    <p className="text-3xl font-bold mt-1">{stats.uniqueVendors || 0}</p>
                  </div>
                  <Building2 className="w-10 h-10 opacity-80" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Receiving Vouchers Database
                </CardTitle>
                <CardDescription>
                  View, search, filter, and manage your receiving vouchers
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
                      Export All Vouchers ({voucherData?.total || 0})
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuCheckboxItem
                      checked={false}
                      onCheckedChange={() => handleExport('filtered')}
                      disabled={filterStore === 'all' && filterVendor === 'all' && filterType === 'all' && !debouncedSearch}
                      data-testid="button-export-filtered"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export Filtered ({voucherData?.total || 0})
                    </DropdownMenuCheckboxItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  variant="destructive"
                  onClick={() => setDeleteAllDialogOpen(true)}
                  disabled={deleteAllMutation.isPending || !voucherData?.total}
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
                  placeholder="Search vouchers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>

              <Select value={filterStore} onValueChange={setFilterStore}>
                <SelectTrigger data-testid="select-store">
                  <SelectValue placeholder="All Stores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stores</SelectItem>
                  {filterOptions?.stores.map(store => (
                    <SelectItem key={store} value={store}>{store}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterVendor} onValueChange={setFilterVendor}>
                <SelectTrigger data-testid="select-vendor">
                  <SelectValue placeholder="All Vendors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vendors</SelectItem>
                  {filterOptions?.vendors.map(vendor => (
                    <SelectItem key={vendor} value={vendor}>{vendor}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger data-testid="select-type">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {filterOptions?.types.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <Badge variant="secondary">
                  Showing {displayVouchers.length} of {voucherData?.total || 0} vouchers
                </Badge>
                {(searchTerm || filterStore !== 'all' || filterVendor !== 'all' || filterType !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setFilterStore('all');
                      setFilterVendor('all');
                      setFilterType('all');
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
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            )}

            {/* Table */}
            {voucherData && !isLoading && (
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
                        <TableHead className="w-24">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayVouchers.map((voucher) => {
                        const qbTotal = parseFloat(voucher.qbTotal || "0");
                        const correctedTotal = parseFloat(voucher.correctedTotal || "0");
                        const hasMismatch = Math.abs(qbTotal - correctedTotal) > 0.01;

                        return (
                          <TableRow key={voucher.id} data-testid={`row-voucher-${voucher.id}`}>
                            {visibleColumns.map(col => {
                              const value = voucher[col.key];
                              let displayValue: React.ReactNode = null;

                              if (col.format) {
                                displayValue = col.format(value);
                              } else if (col.key === 'type' && value) {
                                displayValue = (
                                  <Badge variant={value === "Reversal" ? "destructive" : "default"}>
                                    {String(value)}
                                  </Badge>
                                );
                              } else if (col.key === 'correctedTotal' && hasMismatch) {
                                displayValue = (
                                  <div className="flex items-center justify-end gap-1">
                                    {formatCurrency(value as string)}
                                    <Badge variant="destructive" className="ml-1 text-xs">⚠️</Badge>
                                  </div>
                                );
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
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleViewDetails(voucher)}
                                  data-testid={`button-view-${voucher.id}`}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteVoucherId(voucher.id)}
                                  disabled={deleteVoucherMutation.isPending}
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  data-testid={`button-delete-${voucher.id}`}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {displayVouchers.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={visibleColumns.length + 1} className="text-center py-8 text-muted-foreground">
                            {debouncedSearch || filterStore !== 'all' || filterVendor !== 'all' || filterType !== 'all'
                              ? "No vouchers found matching your filters."
                              : "No vouchers in the database."}
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
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, voucherData.total)} of {voucherData.total} vouchers
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

      {/* Voucher Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Voucher Details</DialogTitle>
            <DialogDescription>
              Voucher {voucherDetail?.voucherNumber || selectedVoucher?.voucherNumber}
            </DialogDescription>
          </DialogHeader>

          {isLoadingDetail ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : voucherDetail ? (
            <div className="space-y-6">
              {/* Voucher Header Info */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Date
                  </p>
                  <p className="font-medium" data-testid="text-detail-date">{formatDate(voucherDetail.date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    Store
                  </p>
                  <p className="font-medium" data-testid="text-detail-store">{voucherDetail.store || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vendor</p>
                  <p className="font-medium" data-testid="text-detail-vendor">{voucherDetail.vendor || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <Badge variant={voucherDetail.type === "Reversal" ? "destructive" : "default"}>
                    {voucherDetail.type}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="font-medium" data-testid="text-detail-time">{voucherDetail.time || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Qty</p>
                  <p className="font-medium" data-testid="text-detail-total-qty">{voucherDetail.totalQty}</p>
                </div>
              </div>

              {/* Total Comparison */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Totals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">QuickBooks Total</p>
                      <p className="text-xl font-bold" data-testid="text-detail-qb-total">
                        {formatCurrency(voucherDetail.qbTotal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Corrected Total</p>
                      <p className="text-xl font-bold text-green-600" data-testid="text-detail-corrected-total">
                        {formatCurrency(voucherDetail.correctedTotal)}
                      </p>
                    </div>
                  </div>
                  {Math.abs(parseFloat(voucherDetail.qbTotal || "0") - parseFloat(voucherDetail.correctedTotal || "0")) > 0.01 && (
                    <Badge variant="destructive" className="mt-2">
                      ⚠️ QuickBooks calculation error detected
                    </Badge>
                  )}
                </CardContent>
              </Card>

              {/* Line Items */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Line Items</h3>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item #</TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {voucherDetail.lines.map((line) => {
                        const lineTotal = line.qty * parseFloat(line.cost);
                        return (
                          <TableRow key={line.id} data-testid={`row-line-${line.id}`}>
                            <TableCell className="font-mono text-sm" data-testid={`text-line-item-number-${line.id}`}>
                              {line.itemNumber || "N/A"}
                            </TableCell>
                            <TableCell data-testid={`text-line-item-name-${line.id}`}>{line.itemName || "N/A"}</TableCell>
                            <TableCell className="text-right" data-testid={`text-line-qty-${line.id}`}>
                              {line.qty < 0 && (
                                <Badge variant="destructive" className="mr-2 text-xs">
                                  Rev
                                </Badge>
                              )}
                              {line.qty}
                            </TableCell>
                            <TableCell className="text-right" data-testid={`text-line-cost-${line.id}`}>
                              {formatCurrency(line.cost)}
                            </TableCell>
                            <TableCell className="text-right font-medium" data-testid={`text-line-total-${line.id}`}>
                              {formatCurrency(lineTotal.toString())}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Failed to load voucher details
            </p>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Individual Voucher Dialog */}
      <AlertDialog open={deleteVoucherId !== null} onOpenChange={() => setDeleteVoucherId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Voucher</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this voucher? This will also delete all associated line items. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteVoucherId && deleteVoucherMutation.mutate(deleteVoucherId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Voucher
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
              This will permanently delete all {voucherData?.total || 0} receiving vouchers and their associated line items from the database.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-clear-database">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAllMutation.mutate()}
              disabled={deleteAllMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-clear-database"
            >
              {deleteAllMutation.isPending ? "Clearing..." : "Clear Database"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

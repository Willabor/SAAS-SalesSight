import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Trash2,
  DatabaseZap,
  Receipt,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  HelpCircle,
  ChevronDown
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import DateRangeFilter, { type Preset, resolveRange } from "@/components/DateRangeFilter";
import type { SalesTransaction } from "@shared/schema";

interface SalesTransactionResponse {
  transactions: SalesTransaction[];
  total: number;
}

interface SalesInsights {
  totalRevenue: string;
  totalReceipts: number;
  avgReceiptValue: string;
  revenueByStore: Array<{ store: string; totalRevenue: string; transactionCount: number }>;
  avgTransactionValueByStore: Array<{ store: string; avgTransactionValue: string; transactionCount: number }>;
}

export default function SalesTransactionsPage() {
  // Initialize dates with "All" preset values
  const initialRange = resolveRange("All", { minDate: "2018-01-01" });

  const [currentPage, setCurrentPage] = useState(1);

  // Pending filter values (what user is typing/selecting)
  const [pendingSearch, setPendingSearch] = useState("");
  const [pendingPreset, setPendingPreset] = useState<Preset>("All");
  const [pendingDateFrom, setPendingDateFrom] = useState<string | undefined>(initialRange.from);
  const [pendingDateTo, setPendingDateTo] = useState<string | undefined>(initialRange.to);
  const [pendingStores, setPendingStores] = useState<string[]>([]);

  // Applied filter values (what's actually used in queries)
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedPreset, setAppliedPreset] = useState<Preset>("All");
  const [appliedDateFrom, setAppliedDateFrom] = useState<string | undefined>(initialRange.from);
  const [appliedDateTo, setAppliedDateTo] = useState<string | undefined>(initialRange.to);
  const [appliedStores, setAppliedStores] = useState<string[]>([]);

  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [deleteTransactionId, setDeleteTransactionId] = useState<number | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof SalesTransaction | null; direction: 'asc' | 'desc' }>({
    key: null,
    direction: 'desc'
  });
  const [showAuditInfoDialog, setShowAuditInfoDialog] = useState(false);

  const transactionsPerPage = 50;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Reset to page 1 when applied filters or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [appliedDateFrom, appliedDateTo, appliedStores, appliedSearch, sortConfig.key, sortConfig.direction]);

  // Apply filters handler
  const applyFilters = () => {
    setAppliedSearch(pendingSearch);
    setAppliedPreset(pendingPreset);
    setAppliedDateFrom(pendingDateFrom);
    setAppliedDateTo(pendingDateTo);
    setAppliedStores(pendingStores);
  };

  // Fetch sales transactions data
  const { data: transactionData, isLoading, error } = useQuery<SalesTransactionResponse>({
    queryKey: ["/api/sales-transactions", currentPage, appliedSearch, appliedDateFrom, appliedDateTo, appliedStores, sortConfig.key, sortConfig.direction],
    queryFn: async () => {
      const offset = (currentPage - 1) * transactionsPerPage;
      const searchParams = new URLSearchParams({
        limit: transactionsPerPage.toString(),
        offset: offset.toString(),
      });

      if (appliedSearch) {
        searchParams.append("search", appliedSearch);
      }
      if (appliedDateFrom) {
        searchParams.append("dateFrom", appliedDateFrom);
      }
      if (appliedDateTo) {
        searchParams.append("dateTo", appliedDateTo);
      }
      if (appliedStores.length > 0) {
        searchParams.append("stores", appliedStores.join(","));
      }
      if (sortConfig.key) {
        searchParams.append("sortBy", sortConfig.key);
        searchParams.append("sortDirection", sortConfig.direction);
      }

      const response = await fetch(`/api/sales-transactions?${searchParams}`);
      if (!response.ok) throw new Error("Failed to fetch sales transactions");
      return response.json();
    },
  });

  // Fetch sales insights (respects same filters as table)
  const { data: insightsData } = useQuery<SalesInsights>({
    queryKey: ["/api/sales-transactions/insights", appliedSearch, appliedDateFrom, appliedDateTo, appliedStores],
    queryFn: async () => {
      const searchParams = new URLSearchParams();

      if (appliedSearch) {
        searchParams.append("search", appliedSearch);
      }
      if (appliedDateFrom) {
        searchParams.append("dateFrom", appliedDateFrom);
      }
      if (appliedDateTo) {
        searchParams.append("dateTo", appliedDateTo);
      }
      if (appliedStores.length > 0) {
        searchParams.append("stores", appliedStores.join(","));
      }

      const response = await fetch(`/api/sales-transactions/insights?${searchParams}`);
      if (!response.ok) throw new Error("Failed to fetch insights");
      return response.json();
    },
  });

  // Delete individual transaction mutation
  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/sales-transactions/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete transaction");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/sales"] });
      toast({
        title: "Transaction deleted",
        description: "Transaction has been successfully removed from the database.",
      });
      setDeleteTransactionId(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete transaction. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete all transactions mutation
  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/sales-transactions", {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to clear database");
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/sales-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/sales"] });
      toast({
        title: "Database cleared",
        description: `Successfully removed ${result.deletedCount} transactions from the database.`,
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

  const totalPages = Math.ceil((transactionData?.total || 0) / transactionsPerPage);

  const formatCurrency = (value: string | null) => {
    if (!value) return "N/A";
    const num = parseFloat(value);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "N/A";
    // Use UTC to avoid timezone conversion (display date as stored in database)
    const d = new Date(date);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'UTC'
    }).format(d);
  };

  const clearFilters = () => {
    const initialRange = resolveRange("All", { minDate: "2018-01-01" });
    setPendingSearch("");
    setPendingPreset("All");
    setPendingDateFrom(initialRange.from);
    setPendingDateTo(initialRange.to);
    setPendingStores([]);
    setAppliedSearch("");
    setAppliedPreset("All");
    setAppliedDateFrom(initialRange.from);
    setAppliedDateTo(initialRange.to);
    setAppliedStores([]);
  };

  const handleSort = (key: keyof SalesTransaction) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (columnKey: keyof SalesTransaction) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="w-3 h-3 ml-1" />;
    return sortConfig.direction === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1" />
      : <ArrowDown className="w-3 h-3 ml-1" />;
  };

  const hasActiveFilters = !!appliedDateFrom || !!appliedDateTo || appliedStores.length > 0 || !!appliedSearch;

  // Check if there are pending filter changes
  const hasPendingChanges =
    pendingSearch !== appliedSearch ||
    pendingPreset !== appliedPreset ||
    pendingDateFrom !== appliedDateFrom ||
    pendingDateTo !== appliedDateTo ||
    JSON.stringify(pendingStores) !== JSON.stringify(appliedStores);

  const storeOptions = [
    { value: "HQ", label: "HQ" },
    { value: "GM", label: "GM" },
    { value: "MM", label: "MM" },
    { value: "HM", label: "HM" },
    { value: "NM", label: "NM" },
    { value: "LM", label: "LM" },
    { value: "PM", label: "PM" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="w-5 h-5" />
                  Sales Transactions Database
                </CardTitle>
                <CardDescription>
                  View, search, filter, and manage your sales transaction data
                </CardDescription>
              </div>
              <Button
                variant="destructive"
                onClick={() => setDeleteAllDialogOpen(true)}
                disabled={deleteAllMutation.isPending || !transactionData?.total}
                className="flex items-center gap-2"
                data-testid="button-clear-database"
              >
                <DatabaseZap className="w-4 h-4" />
                Clear Database
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Insights Section */}
            {insightsData && (
              <div className="space-y-4">
                {/* Company-Wide Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Sales (Company-Wide)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-primary">
                        {formatCurrency(insightsData.totalRevenue)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        From {insightsData.totalReceipts.toLocaleString()} unique receipts
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-primary/20 bg-primary/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Average Receipt Value (Company-Wide)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-primary">
                        ${parseFloat(insightsData.avgReceiptValue).toFixed(2)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Average value per receipt
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* By Store Breakdown */}
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Store Performance Breakdown</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowAuditInfoDialog(true)}
                    className="h-8 w-8 p-0"
                    title="Important audit information"
                  >
                    <HelpCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Revenue by Store */}
                  <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Revenue by Store
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {insightsData.revenueByStore.map((item) => (
                        <div key={item.store} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">
                              {item.store}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              ({item.transactionCount} receipts)
                            </span>
                          </div>
                          <span className="font-semibold text-sm">
                            {formatCurrency(item.totalRevenue)}
                          </span>
                        </div>
                      ))}
                      {insightsData.revenueByStore.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No revenue data for selected filters
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Average Transaction Value by Store */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Average Transaction Value by Store
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {insightsData.avgTransactionValueByStore.map((item) => (
                        <div key={item.store} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">
                              {item.store}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              ({item.transactionCount} receipts)
                            </span>
                          </div>
                          <span className="font-semibold text-sm">
                            ${parseFloat(item.avgTransactionValue).toFixed(2)}
                          </span>
                        </div>
                      ))}
                      {insightsData.avgTransactionValueByStore.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No transaction data for selected filters
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            )}

            {/* Filters */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="flex items-center gap-2 flex-1">
                  <Badge variant="secondary" className="text-sm">
                    Total: {transactionData?.total || 0} transactions
                  </Badge>
                  {hasActiveFilters && (
                    <Badge variant="outline" className="text-sm">
                      Filtered: {transactionData?.transactions.length || 0} results
                    </Badge>
                  )}
                </div>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="flex items-center gap-2"
                    data-testid="button-clear-filters"
                  >
                    <X className="w-4 h-4" />
                    Clear Filters
                  </Button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search by SKU, item name, store, or receipt number..."
                    value={pendingSearch}
                    onChange={(e) => setPendingSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        applyFilters();
                      }
                    }}
                    className="pl-10 h-10"
                    data-testid="input-search"
                  />
                </div>

                {/* Date Range Filter */}
                <DateRangeFilter
                  defaultPreset={pendingPreset}
                  minDate="2018-01-01"
                  defaultFrom={pendingDateFrom}
                  defaultTo={pendingDateTo}
                  onChange={({ preset, from, to }) => {
                    setPendingPreset(preset);
                    setPendingDateFrom(from);
                    setPendingDateTo(to);
                  }}
                  className="flex-shrink-0"
                />

                {/* Store Multi-Select */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full sm:w-40 h-10 justify-between" data-testid="select-stores">
                      <span className="truncate">
                        {pendingStores.length === 0
                          ? "All Stores"
                          : pendingStores.length === 1
                          ? pendingStores[0]
                          : `${pendingStores.length} stores`}
                      </span>
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0">
                    <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
                      {storeOptions.map((store) => (
                        <div key={store.value} className="flex items-center space-x-2 px-2 py-1.5 hover:bg-accent rounded-sm cursor-pointer">
                          <Checkbox
                            id={`store-${store.value}`}
                            checked={pendingStores.includes(store.value)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setPendingStores([...pendingStores, store.value]);
                              } else {
                                setPendingStores(pendingStores.filter(s => s !== store.value));
                              }
                            }}
                          />
                          <label
                            htmlFor={`store-${store.value}`}
                            className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {store.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Apply Filter Button - Always visible */}
                <Button
                  onClick={applyFilters}
                  disabled={!hasPendingChanges}
                  className="w-full sm:w-auto h-10 flex items-center justify-center gap-2"
                  data-testid="button-apply-filters"
                >
                  <Filter className="w-4 h-4" />
                  Apply Filters
                </Button>
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading transactions...</p>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="text-center py-8">
                <p className="text-destructive">Failed to load transactions</p>
                <Button 
                  variant="outline" 
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/sales-transactions"] })}
                  className="mt-2"
                  data-testid="button-retry"
                >
                  Try Again
                </Button>
              </div>
            )}

            {/* Table */}
            {transactionData && !isLoading && (
              <>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <button
                            className="flex items-center hover:text-foreground transition-colors"
                            onClick={() => handleSort('date')}
                          >
                            Date
                            {getSortIcon('date')}
                          </button>
                        </TableHead>
                        <TableHead>
                          <button
                            className="flex items-center hover:text-foreground transition-colors"
                            onClick={() => handleSort('store')}
                          >
                            Store
                            {getSortIcon('store')}
                          </button>
                        </TableHead>
                        <TableHead>
                          <button
                            className="flex items-center hover:text-foreground transition-colors"
                            onClick={() => handleSort('receiptNumber')}
                          >
                            Receipt #
                            {getSortIcon('receiptNumber')}
                          </button>
                        </TableHead>
                        <TableHead>
                          <button
                            className="flex items-center hover:text-foreground transition-colors"
                            onClick={() => handleSort('sku')}
                          >
                            SKU
                            {getSortIcon('sku')}
                          </button>
                        </TableHead>
                        <TableHead>
                          <button
                            className="flex items-center hover:text-foreground transition-colors"
                            onClick={() => handleSort('itemName')}
                          >
                            Item Name
                            {getSortIcon('itemName')}
                          </button>
                        </TableHead>
                        <TableHead>
                          <button
                            className="flex items-center hover:text-foreground transition-colors"
                            onClick={() => handleSort('transactionStoreType')}
                          >
                            Type
                            {getSortIcon('transactionStoreType')}
                          </button>
                        </TableHead>
                        <TableHead className="text-right">
                          <button
                            className="flex items-center justify-end hover:text-foreground transition-colors ml-auto"
                            onClick={() => handleSort('price')}
                          >
                            Price
                            {getSortIcon('price')}
                          </button>
                        </TableHead>
                        <TableHead>
                          <button
                            className="flex items-center hover:text-foreground transition-colors"
                            onClick={() => handleSort('sheet')}
                          >
                            Sheet
                            {getSortIcon('sheet')}
                          </button>
                        </TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactionData.transactions.map((transaction) => (
                        <TableRow key={transaction.id} data-testid={`row-transaction-${transaction.id}`}>
                          <TableCell className="font-medium">{formatDate(transaction.date)}</TableCell>
                          <TableCell>{transaction.store || "N/A"}</TableCell>
                          <TableCell>{transaction.receiptNumber || "N/A"}</TableCell>
                          <TableCell className="font-mono text-sm">{transaction.sku || "N/A"}</TableCell>
                          <TableCell>{transaction.itemName || "N/A"}</TableCell>
                          <TableCell>
                            {transaction.transactionStoreType && (
                              <Badge variant="outline" className="text-xs">
                                {transaction.transactionStoreType}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(transaction.price)}</TableCell>
                          <TableCell>{transaction.sheet || "N/A"}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTransactionId(transaction.id)}
                              disabled={deleteTransactionMutation.isPending}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              data-testid={`button-delete-${transaction.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {transactionData.transactions.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            {hasActiveFilters ? "No transactions found matching your filters." : "No transactions in the database."}
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
                      Showing {((currentPage - 1) * transactionsPerPage) + 1} to {Math.min(currentPage * transactionsPerPage, transactionData.total)} of {transactionData.total} transactions
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

      {/* Delete Individual Transaction Dialog */}
      <AlertDialog open={deleteTransactionId !== null} onOpenChange={() => setDeleteTransactionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this transaction? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTransactionId && deleteTransactionMutation.mutate(deleteTransactionId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete Transaction
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
              Are you sure you want to delete ALL {transactionData?.total || 0} transactions from the database?
              This action cannot be undone and will permanently remove all sales transaction data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAllMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-clear-database"
            >
              Clear Database
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Audit Information Dialog */}
      <Dialog open={showAuditInfoDialog} onOpenChange={setShowAuditInfoDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Important Store Data Context - For Audit Reference
            </DialogTitle>
            <DialogDescription>
              Historical context about HQ and GM store data structure
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">📅 Key Date: October 5, 2020</h4>
              <p className="text-sm text-muted-foreground">
                On this date, the company separated the warehouse from the GM physical store location.
              </p>
            </div>

            <div className="border-l-4 border-orange-500 pl-4 py-2 bg-orange-50 dark:bg-orange-950/20 rounded-r">
              <h4 className="font-semibold text-sm mb-2">⚠️ Before October 5, 2020:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li><strong>HQ Store</strong> = GM physical store sales (majority) + Online sales (minimal)</li>
                <li>No warehouse existed as a separate entity</li>
                <li>GM was treated as HQ while online presence was being established</li>
                <li><strong className="text-orange-600 dark:text-orange-400">Cannot accurately split online vs. in-store transactions</strong></li>
              </ul>
            </div>

            <div className="border-l-4 border-green-500 pl-4 py-2 bg-green-50 dark:bg-green-950/20 rounded-r">
              <h4 className="font-semibold text-sm mb-2">✅ After October 5, 2020:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li><strong>HQ Store</strong> = Online/Warehouse sales only</li>
                <li><strong>GM Store</strong> = Physical GM store location (separated out)</li>
                <li>Clear distinction between online and physical store sales</li>
              </ul>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                💡 For Accountants & Auditors:
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Year-over-year comparisons for <strong>HQ</strong> will show a significant drop after Oct 5, 2020</li>
                <li>• Year-over-year comparisons for <strong>GM</strong> will only show data from Oct 5, 2020 onwards</li>
                <li>• Pre-split HQ data represents combined GM + minimal online sales (cannot be separated)</li>
                <li>• Data integrity has been preserved - no historical modifications were made</li>
                <li>• All data reflects how transactions were originally recorded in the system</li>
              </ul>
            </div>

            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground italic">
                This information is provided for audit trail and data interpretation purposes.
                Contact management if you need additional clarification about historical data structure.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

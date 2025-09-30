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
  Receipt,
  ChevronLeft,
  ChevronRight,
  Filter,
  X
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import type { SalesTransaction } from "@shared/schema";

interface SalesTransactionResponse {
  transactions: SalesTransaction[];
  total: number;
}

export default function SalesTransactionsPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [deleteTransactionId, setDeleteTransactionId] = useState<number | null>(null);
  
  const transactionsPerPage = 50;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedYear, selectedMonth]);

  // Fetch sales transactions data
  const { data: transactionData, isLoading, error } = useQuery<SalesTransactionResponse>({
    queryKey: ["/api/sales-transactions", currentPage, debouncedSearch, selectedYear, selectedMonth],
    queryFn: async () => {
      const offset = (currentPage - 1) * transactionsPerPage;
      const searchParams = new URLSearchParams({
        limit: transactionsPerPage.toString(),
        offset: offset.toString(),
      });
      
      if (debouncedSearch) {
        searchParams.append("search", debouncedSearch);
      }
      if (selectedYear && selectedYear !== "all") {
        searchParams.append("year", selectedYear);
      }
      if (selectedMonth && selectedMonth !== "all") {
        searchParams.append("month", selectedMonth);
      }
      
      const response = await fetch(`/api/sales-transactions?${searchParams}`);
      if (!response.ok) throw new Error("Failed to fetch sales transactions");
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
    return new Date(date).toLocaleDateString();
  };

  const clearFilters = () => {
    setSelectedYear("all");
    setSelectedMonth("all");
    setSearchTerm("");
  };

  const hasActiveFilters = (selectedYear !== "all") || (selectedMonth !== "all") || !!debouncedSearch;

  // Generate year options (2020-2025 for now)
  const yearOptions = Array.from({ length: 6 }, (_, i) => (2025 - i).toString());
  
  const monthOptions = [
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
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

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search by SKU, item name, store, or receipt number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search"
                  />
                </div>
                <Select value={selectedYear} onValueChange={(value) => {
                  setSelectedYear(value);
                  if (value === "all") setSelectedMonth("all");
                }}>
                  <SelectTrigger className="w-full sm:w-36" data-testid="select-year">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {yearOptions.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={selectedYear === "all"}>
                  <SelectTrigger className="w-full sm:w-36" data-testid="select-month">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    {monthOptions.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                        <TableHead>Date</TableHead>
                        <TableHead>Store</TableHead>
                        <TableHead>Receipt #</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead>Sheet</TableHead>
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
    </div>
  );
}

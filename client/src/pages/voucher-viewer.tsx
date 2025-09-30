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
  ArrowLeft,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Package,
  Calendar,
  Building2,
  TrendingUp,
  DatabaseZap,
} from "lucide-react";
import { Link } from "wouter";

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

export default function VoucherViewerPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherWithLines | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const { toast } = useToast();

  const itemsPerPage = 50;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: voucherData, isLoading } = useQuery<VoucherListResponse>({
    queryKey: ["/api/receiving/vouchers", currentPage, debouncedSearch],
    queryFn: async () => {
      const offset = (currentPage - 1) * itemsPerPage;
      const searchParams = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: offset.toString(),
      });

      if (debouncedSearch) {
        searchParams.append("search", debouncedSearch);
      }

      const response = await fetch(`/api/receiving/vouchers?${searchParams}`);
      if (!response.ok) throw new Error("Failed to fetch vouchers");
      return response.json();
    },
  });

  const { data: voucherDetail, isLoading: isLoadingDetail } = useQuery<VoucherWithLines>({
    queryKey: ["/api/receiving/vouchers", selectedVoucher?.id],
    enabled: !!selectedVoucher && detailDialogOpen,
    queryFn: async () => {
      const response = await fetch(`/api/receiving/vouchers/${selectedVoucher?.id}`);
      if (!response.ok) throw new Error("Failed to fetch voucher details");
      return response.json();
    },
  });

  const totalPages = Math.ceil((voucherData?.total || 0) / itemsPerPage);

  // Delete all vouchers mutation
  const deleteAllMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", "/api/receiving/vouchers");
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/receiving/vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/receiving/stats"] });
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

  const formatCurrency = (value: string | null) => {
    if (!value) return "$0.00";
    const num = parseFloat(value);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Link href="/receiving" data-testid="link-back">
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              </Link>
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Voucher Viewer</h1>
                <p className="text-xs text-muted-foreground">
                  Search and view receiving vouchers
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Receiving Vouchers</CardTitle>
                <CardDescription>
                  Search by voucher number, vendor, store, or item number
                </CardDescription>
              </div>
              <Button
                variant="destructive"
                onClick={() => setDeleteAllDialogOpen(true)}
                disabled={deleteAllMutation.isPending || !voucherData?.total}
                className="flex items-center gap-2"
                data-testid="button-clear-database"
              >
                <DatabaseZap className="w-4 h-4" />
                Clear Database
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search vouchers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : voucherData && voucherData.vouchers.length > 0 ? (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Voucher #</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Store</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Total Qty</TableHead>
                        <TableHead className="text-right">QB Total</TableHead>
                        <TableHead className="text-right">Corrected Total</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {voucherData.vouchers.map((voucher) => {
                        const qbTotal = parseFloat(voucher.qbTotal || "0");
                        const correctedTotal = parseFloat(voucher.correctedTotal || "0");
                        const hasMismatch = Math.abs(qbTotal - correctedTotal) > 0.01;

                        return (
                          <TableRow key={voucher.id} data-testid={`row-voucher-${voucher.id}`}>
                            <TableCell className="font-medium" data-testid={`text-voucher-number-${voucher.id}`}>
                              {voucher.voucherNumber || "N/A"}
                            </TableCell>
                            <TableCell data-testid={`text-date-${voucher.id}`}>{formatDate(voucher.date)}</TableCell>
                            <TableCell data-testid={`text-store-${voucher.id}`}>{voucher.store || "N/A"}</TableCell>
                            <TableCell data-testid={`text-vendor-${voucher.id}`}>{voucher.vendor || "N/A"}</TableCell>
                            <TableCell>
                              <Badge
                                variant={voucher.type === "Reversal" ? "destructive" : "default"}
                                data-testid={`badge-type-${voucher.id}`}
                              >
                                {voucher.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right" data-testid={`text-qty-${voucher.id}`}>
                              {voucher.totalQty}
                            </TableCell>
                            <TableCell className="text-right" data-testid={`text-qb-total-${voucher.id}`}>
                              {formatCurrency(voucher.qbTotal)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {formatCurrency(voucher.correctedTotal)}
                                {hasMismatch && (
                                  <Badge variant="destructive" className="ml-1 text-xs">
                                    ⚠️
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetails(voucher)}
                                data-testid={`button-view-${voucher.id}`}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground" data-testid="text-pagination-info">
                    Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                    {Math.min(currentPage * itemsPerPage, voucherData.total)} of{" "}
                    {voucherData.total} vouchers
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      data-testid="button-previous-page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <span className="text-sm" data-testid="text-page-info">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      data-testid="button-next-page"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p data-testid="text-no-vouchers">No vouchers found</p>
                {searchTerm && (
                  <p className="text-sm">
                    Try adjusting your search criteria
                  </p>
                )}
              </div>
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

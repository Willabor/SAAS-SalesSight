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
  ChevronRight
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import type { ItemList } from "@shared/schema";

interface ItemListResponse {
  items: ItemList[];
  total: number;
}

export default function ItemListPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);
  
  const itemsPerPage = 50;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1); // Reset to first page on search
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

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Item List Database
                </CardTitle>
                <CardDescription>
                  View, search, and manage your item list data
                </CardDescription>
              </div>
              <Button
                variant="destructive"
                onClick={() => setDeleteAllDialogOpen(true)}
                disabled={deleteAllMutation.isPending || !itemData?.total}
                className="flex items-center gap-2"
                data-testid="button-clear-database"
              >
                <DatabaseZap className="w-4 h-4" />
                Clear Database
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Stats and Search */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="text-sm">
                  Total: {itemData?.total || 0} items
                </Badge>
                {debouncedSearch && (
                  <Badge variant="outline" className="text-sm">
                    Filtered: {itemData?.items.length || 0} results
                  </Badge>
                )}
              </div>
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by item number, name, vendor, or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
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
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item #</TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead>Vendor</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Gender</TableHead>
                        <TableHead className="text-right">Available Qty</TableHead>
                        <TableHead className="text-right">Order Cost</TableHead>
                        <TableHead className="text-right">Selling Price</TableHead>
                        <TableHead>Last Sold</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {itemData.items.map((item) => (
                        <TableRow key={item.id} data-testid={`row-item-${item.id}`}>
                          <TableCell className="font-medium">{item.itemNumber}</TableCell>
                          <TableCell>{item.itemName}</TableCell>
                          <TableCell>{item.vendorName}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell>
                            {item.gender && (
                              <Badge variant="outline" className="text-xs">
                                {item.gender}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{item.availQty}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.orderCost)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.sellingPrice)}</TableCell>
                          <TableCell>{formatDate(item.lastSold)}</TableCell>
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
                      {itemData.items.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                            {debouncedSearch ? "No items found matching your search." : "No items in the database."}
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
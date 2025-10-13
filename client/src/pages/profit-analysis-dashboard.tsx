import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, TrendingUp, AlertTriangle, DollarSign, Package } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/formatters";

interface ProfitOpportunity {
  sku: string;
  style_number: string;
  vendor_name: string;
  color: string;
  size: string;
  inseam: string;
  profit_opportunity: number;
  urgency_level: "CRITICAL" | "LOW" | "MONITOR" | "GOOD" | "HEALTHY";
  days_until_stockout: number;
  current_inventory: number;
  velocity_30d: number;
  recommended_action: string;
  predicted_net_profit: number | null;
  profitability_tier: string | null;
}

interface SummaryStats {
  total_opportunity: number;
  critical_opportunity: number;
  sku_count: number;
  avg_roi: number;
  last_updated: string;
}

interface RecalculateStatus {
  status: "idle" | "processing" | "completed" | "error";
  progress: number;
  skus_processed: number;
  total_skus: number;
  opportunities_found?: number;
  total_opportunity?: number;
  error_message?: string;
}

export default function ProfitAnalysisDashboard() {
  const queryClient = useQueryClient();
  const [showRecalcModal, setShowRecalcModal] = useState(false);
  const [recalcStatus, setRecalcStatus] = useState<RecalculateStatus>({
    status: "idle",
    progress: 0,
    skus_processed: 0,
    total_skus: 0,
  });

  // Filters
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [colorFilter, setColorFilter] = useState<string>("all");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");

  // Fetch summary stats
  const { data: summary } = useQuery<SummaryStats>({
    queryKey: ["profit-analysis-summary"],
    queryFn: async () => {
      const res = await fetch("/api/profit-analysis/summary");
      if (!res.ok) throw new Error("Failed to fetch summary");
      return res.json();
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  // Fetch profit opportunities
  const { data: opportunities = [], isLoading } = useQuery<ProfitOpportunity[]>({
    queryKey: ["profit-opportunities", vendorFilter, colorFilter, urgencyFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (vendorFilter !== "all") params.append("vendor", vendorFilter);
      if (colorFilter !== "all") params.append("color", colorFilter);
      if (urgencyFilter !== "all") params.append("urgency", urgencyFilter);
      params.append("limit", "50");

      const res = await fetch(`/api/profit-analysis/opportunities?${params}`);
      if (!res.ok) throw new Error("Failed to fetch opportunities");
      return res.json();
    },
  });

  // Manual recalculation mutation
  const recalculateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/profit-analysis/recalculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true, scope: "all" }),
      });
      if (!res.ok) throw new Error("Failed to trigger recalculation");
      return res.json();
    },
    onSuccess: (data) => {
      setRecalcStatus({
        status: "processing",
        progress: 0,
        skus_processed: 0,
        total_skus: data.total_skus || 0,
      });

      // Poll for status every 2 seconds
      const pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/profit-analysis/recalculate/status/${data.job_id}`);
          const status: RecalculateStatus = await res.json();

          setRecalcStatus(status);

          if (status.status === "completed" || status.status === "error") {
            clearInterval(pollInterval);
            if (status.status === "completed") {
              // Refetch all data
              queryClient.invalidateQueries({ queryKey: ["profit-analysis-summary"] });
              queryClient.invalidateQueries({ queryKey: ["profit-opportunities"] });
            }
          }
        } catch (error) {
          clearInterval(pollInterval);
          setRecalcStatus((prev) => ({
            ...prev,
            status: "error",
            error_message: "Failed to check status",
          }));
        }
      }, 2000);
    },
    onError: (error) => {
      setRecalcStatus({
        status: "error",
        progress: 0,
        skus_processed: 0,
        total_skus: 0,
        error_message: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });

  const handleRecalculate = () => {
    setShowRecalcModal(false);
    recalculateMutation.mutate();
  };

  const getUrgencyBadge = (urgency: string) => {
    const variants: Record<string, { variant: any; icon: string }> = {
      CRITICAL: { variant: "destructive", icon: "🔴" },
      LOW: { variant: "default", icon: "🟡" },
      MONITOR: { variant: "secondary", icon: "🔵" },
      GOOD: { variant: "outline", icon: "🟢" },
      HEALTHY: { variant: "outline", icon: "⚪" },
    };

    const config = variants[urgency] || variants.MONITOR;

    return (
      <Badge variant={config.variant as any}>
        <span className="mr-1">{config.icon}</span>
        {urgency}
      </Badge>
    );
  };

  const getProfitabilityColor = (tier: string | null) => {
    if (!tier) return "text-gray-500";
    if (tier === "EXCELLENT") return "text-green-600";
    if (tier === "GOOD") return "text-blue-600";
    if (tier === "MARGINAL") return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Profit Analysis Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track and analyze profit opportunities across all SKUs
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            onClick={() => setShowRecalcModal(true)}
            disabled={recalcStatus.status === "processing"}
            className="w-full md:w-auto"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${recalcStatus.status === "processing" ? "animate-spin" : ""}`}
            />
            Recalculate Now
          </Button>
          {summary && (
            <p className="text-xs text-gray-500 text-right">
              Last updated: {new Date(summary.last_updated).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Opportunity</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.total_opportunity)}</div>
              <p className="text-xs text-muted-foreground">{summary.sku_count} SKUs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Opportunity</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(summary.critical_opportunity)}
              </div>
              <p className="text-xs text-muted-foreground">Stockout risk &lt;14 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">SKUs Needing Action</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.sku_count}</div>
              <p className="text-xs text-muted-foreground">Across all vendors</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg ROI</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {summary.avg_roi.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">Expected return</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recalculation Progress */}
      {recalcStatus.status === "processing" && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium">
                  ⟳ Recalculating profit opportunities...
                </p>
                <p className="text-sm text-gray-600">
                  {recalcStatus.skus_processed} / {recalcStatus.total_skus} SKUs
                </p>
              </div>
              <Progress value={recalcStatus.progress} className="h-2" />
              <p className="text-xs text-gray-500">
                This may take 30-60 seconds. Please don't close this page.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {recalcStatus.status === "completed" && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <div className="text-2xl">✓</div>
              <div className="flex-1">
                <p className="font-medium text-green-900">Recalculation Complete!</p>
                <p className="text-sm text-green-700 mt-1">
                  Updated {recalcStatus.skus_processed} SKUs. Found {recalcStatus.opportunities_found} profit
                  opportunities totaling {formatCurrency(recalcStatus.total_opportunity || 0)}.
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRecalcStatus({ status: "idle", progress: 0, skus_processed: 0, total_skus: 0 })}
              >
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Vendor</label>
              <Select value={vendorFilter} onValueChange={setVendorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All vendors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All vendors</SelectItem>
                  <SelectItem value="Argonaut Nations">Argonaut Nations</SelectItem>
                  <SelectItem value="Ethika">Ethika</SelectItem>
                  {/* Add more vendors dynamically */}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Color</label>
              <Select value={colorFilter} onValueChange={setColorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All colors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All colors</SelectItem>
                  <SelectItem value="Black">Black</SelectItem>
                  <SelectItem value="Olive">Olive</SelectItem>
                  <SelectItem value="Ice Blue">Ice Blue</SelectItem>
                  {/* Add more colors dynamically */}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Urgency</label>
              <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All urgency levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                  <SelectItem value="CRITICAL">🔴 Critical</SelectItem>
                  <SelectItem value="LOW">🟡 Low</SelectItem>
                  <SelectItem value="MONITOR">🔵 Monitor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content - Tabs */}
      <Tabs defaultValue="opportunities" className="space-y-4">
        <TabsList>
          <TabsTrigger value="opportunities">Top Opportunities</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="vendors">By Vendor</TabsTrigger>
          <TabsTrigger value="colors">By Color</TabsTrigger>
        </TabsList>

        <TabsContent value="opportunities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Profit Opportunities</CardTitle>
              <CardDescription>
                SKUs with the highest profit potential based on current inventory and sales velocity
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">Loading opportunities...</div>
              ) : opportunities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No profit opportunities found with current filters
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Style</TableHead>
                        <TableHead>Color</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead className="text-right">Profit Opp</TableHead>
                        <TableHead>Urgency</TableHead>
                        <TableHead className="text-right">Days Stock</TableHead>
                        <TableHead>Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {opportunities.map((opp) => (
                        <TableRow key={opp.sku} className="cursor-pointer hover:bg-gray-50">
                          <TableCell className="font-mono text-xs">{opp.sku}</TableCell>
                          <TableCell className="font-medium">{opp.style_number}</TableCell>
                          <TableCell>{opp.color}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {opp.size}
                            {opp.inseam && ` X ${opp.inseam}`}
                          </TableCell>
                          <TableCell className="text-right font-bold">
                            {formatCurrency(opp.profit_opportunity)}
                          </TableCell>
                          <TableCell>{getUrgencyBadge(opp.urgency_level)}</TableCell>
                          <TableCell className="text-right">{opp.days_until_stockout}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{opp.recommended_action}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Historical Trends</CardTitle>
              <CardDescription>Coming soon: Track profit opportunities over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                Historical trend analysis will be available once daily snapshots are collected.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vendors">
          <Card>
            <CardHeader>
              <CardTitle>Analysis by Vendor</CardTitle>
              <CardDescription>Coming soon: Profit opportunities grouped by vendor</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                Vendor analysis view coming soon.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="colors">
          <Card>
            <CardHeader>
              <CardTitle>Analysis by Color</CardTitle>
              <CardDescription>Coming soon: Profit opportunities grouped by color</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-gray-500">
                Color analysis view coming soon.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recalculation Confirmation Modal */}
      <Dialog open={showRecalcModal} onOpenChange={setShowRecalcModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recalculate Profit Analysis?</DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <p>
                This will recalculate profit opportunities for all active SKUs (500+ items).
              </p>
              <p>
                <strong>Estimated time:</strong> 30-60 seconds
              </p>
              <p className="text-xs text-gray-500">
                Note: The dashboard will remain functional during recalculation.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRecalcModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecalculate}>Recalculate Now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

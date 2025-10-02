import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calculator, RefreshCw, Trash2, TrendingUp, Package, Calendar, Archive, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ReceivingMetricsStats {
  total: number;
  byLifecycle: Record<string, number>;
  lastCalculated: string | null;
}

export default function ReceivingMetricsSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current stats
  const { data: stats, isLoading } = useQuery<ReceivingMetricsStats>({
    queryKey: ["/api/receiving-metrics/stats"],
  });

  // Calculate all metrics mutation
  const calculateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/receiving-metrics/calculate", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to calculate metrics");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "✓ Calculation Complete",
        description: `Successfully calculated metrics for ${data.total} styles in ${(data.duration / 1000).toFixed(1)}s`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/receiving-metrics/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Calculation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Clear all metrics mutation
  const clearMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/receiving-metrics", {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to clear metrics");
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "✓ Metrics Cleared",
        description: `Deleted ${data.deleted} metric records`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/receiving-metrics/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Clear Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCalculate = () => {
    calculateMutation.mutate();
  };

  const handleClearAndRebuild = async () => {
    if (!confirm("This will delete all existing metrics and recalculate from scratch. Continue?")) {
      return;
    }
    await clearMutation.mutateAsync();
    calculateMutation.mutate();
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const lifecycleColors: Record<string, string> = {
    New: "bg-green-100 text-green-800 border-green-200",
    Core: "bg-blue-100 text-blue-800 border-blue-200",
    Seasonal: "bg-purple-100 text-purple-800 border-purple-200",
    "One-Time": "bg-gray-100 text-gray-800 border-gray-200",
    Discontinued: "bg-red-100 text-red-800 border-red-200",
  };

  const lifecycleIcons: Record<string, any> = {
    New: Sparkles,
    Core: TrendingUp,
    Seasonal: Calendar,
    "One-Time": Package,
    Discontinued: Archive,
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Receiving Metrics Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage and calculate intelligent receiving pattern analysis for all products
        </p>
      </div>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Current Status
          </CardTitle>
          <CardDescription>Overview of calculated receiving metrics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">Total Styles</div>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
              <div className="text-xs text-muted-foreground mt-1">Analyzed for patterns</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">Last Calculated</div>
              <div className="text-2xl font-bold">{formatDate(stats?.lastCalculated || null)}</div>
              <div className="text-xs text-muted-foreground mt-1">Most recent update</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">Lifecycle Stages</div>
              <div className="text-2xl font-bold">{Object.keys(stats?.byLifecycle || {}).length}</div>
              <div className="text-xs text-muted-foreground mt-1">Different categories</div>
            </div>
          </div>

          {/* Lifecycle Breakdown */}
          {stats && stats.byLifecycle && Object.keys(stats.byLifecycle).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">By Lifecycle Stage</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {Object.entries(stats.byLifecycle).map(([lifecycle, count]) => {
                  const Icon = lifecycleIcons[lifecycle] || Package;
                  return (
                    <div
                      key={lifecycle}
                      className={`p-3 rounded-lg border ${lifecycleColors[lifecycle] || "bg-gray-100"}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-4 h-4" />
                        <span className="text-xs font-medium">{lifecycle}</span>
                      </div>
                      <div className="text-2xl font-bold">{count}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Business Rules Info */}
      <Card>
        <CardHeader>
          <CardTitle>Business Logic Rules</CardTitle>
          <CardDescription>How items are classified into lifecycle stages</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-green-100 text-green-800">New Item</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                • Last receive within 7 days of creation<br />
                • ≤ 2 total receives
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-blue-100 text-blue-800">Core Item</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                • ≥ 3 different months with receives<br />
                • ≥ 5 total receives<br />
                • Average ≤ 60 days between receives
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-purple-100 text-purple-800">Seasonal</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                • ≥ 2 years of receives<br />
                • 60% in same month(s) each year<br />
                • Average ≥ 300 days between receives
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-gray-100 text-gray-800">One-Time Buy</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                • ≤ 2 total receives<br />
                • ≥ 90 days since last receive<br />
                • Not classified as Core
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>Calculate or rebuild receiving metrics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              <strong>Note:</strong> Metrics are automatically updated when you upload new receiving history.
              Manual calculation is only needed for initial setup or troubleshooting.
            </AlertDescription>
          </Alert>

          <div className="flex gap-3">
            <Button
              onClick={handleCalculate}
              disabled={calculateMutation.isPending}
              className="flex items-center gap-2"
            >
              {calculateMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Calculating...
                </>
              ) : (
                <>
                  <Calculator className="w-4 h-4" />
                  Calculate All Metrics
                </>
              )}
            </Button>

            <Button
              onClick={handleClearAndRebuild}
              disabled={clearMutation.isPending || calculateMutation.isPending}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear & Rebuild
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            <strong>Calculate All Metrics:</strong> Process all {stats?.total || 0} styles (takes ~5-10 seconds)
            <br />
            <strong>Clear & Rebuild:</strong> Delete existing metrics and recalculate from scratch
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calculator, RefreshCw, Trash2, TrendingUp, Package, Calendar, Archive, Sparkles, Download } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { UploadProgressAdvanced } from "@/components/upload-progress-advanced";
import { calculateMetricsWithProgress } from "@/lib/api";
import { exportReceivingMetricsToExcel } from "@/lib/excelExport";
import {
  executeTrackedUpload,
  loadUploadState,
  subscribeToUploadState,
  pauseUpload,
  resumeUpload,
  stopUpload,
  clearUploadState,
  resetUploadControlFlags,
  isUploadPaused,
  isUploadStopped,
} from "@/lib/uploadStateManager";

interface ReceivingMetricsStats {
  total: number;
  byLifecycle: Record<string, number>;
  lastCalculated: string | null;
}

export default function ReceivingMetricsSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Progress tracking state
  const [isCalculating, setIsCalculating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const [uploadStats, setUploadStats] = useState<{
    processed: number;
    total: number;
    uploaded: number;
    skipped: number;
    failed: number;
  } | null>(null);

  // Fetch current stats
  const { data: stats, isLoading } = useQuery<ReceivingMetricsStats>({
    queryKey: ["/api/receiving-metrics/stats"],
  });

  // Restore and subscribe to upload state for cross-page persistence
  useEffect(() => {
    const savedState = loadUploadState();
    if (savedState && savedState.uploadType === 'metrics-calculation') {
      setIsCalculating(savedState.isUploading);
      setIsPaused(savedState.isPaused);
      if (savedState.stats) {
        setUploadStats(savedState.stats);
      }
    }

    const unsubscribe = subscribeToUploadState((state) => {
      if (state && state.uploadType === 'metrics-calculation') {
        setIsCalculating(state.isUploading);
        setIsPaused(state.isPaused);
        if (state.stats) {
          setUploadStats(state.stats);
        }
      } else if (!state) {
        setIsCalculating(false);
        setUploadStats(null);
        setIsPaused(false);
        setIsStopped(false);
      }
    });

    return () => unsubscribe();
  }, []);

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

  const handleCalculate = async () => {
    try {
      // Reset control flags before starting new calculation
      resetUploadControlFlags();
      setIsCalculating(true);
      setIsStopped(false);

      const result = await executeTrackedUpload(
        'metrics-calculation',
        'Receiving Metrics Calculation',
        (onProgress) => calculateMetricsWithProgress(
          onProgress,
          100, // batch size
          () => ({ isPaused: isUploadPaused(), isStopped: isUploadStopped() })
        ),
        0, // Will be updated once we know the total
        'flatten'
      );

      if (result.stopped) {
        toast({
          title: "Calculation Stopped",
          description: `Processed ${result.uploaded} styles before stopping`,
        });
      } else {
        toast({
          title: "✓ Calculation Complete",
          description: `Successfully calculated metrics for ${result.uploaded} styles`,
        });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/receiving-metrics/stats"] });
      setIsCalculating(false);
    } catch (error) {
      toast({
        title: "Calculation Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      setIsCalculating(false);
    }
  };

  const handleClearAndRebuild = async () => {
    if (!confirm("This will delete all existing metrics and recalculate from scratch. Continue?")) {
      return;
    }
    await clearMutation.mutateAsync();
    handleCalculate();
  };

  const handlePause = () => {
    pauseUpload();
    setIsPaused(true);
  };

  const handleResume = () => {
    resumeUpload();
    setIsPaused(false);
  };

  const handleStop = () => {
    stopUpload();
    setIsStopped(true);
  };

  const handleClearProgress = () => {
    clearUploadState();
    setIsCalculating(false);
    setUploadStats(null);
    setIsPaused(false);
    setIsStopped(false);
  };

  const handleExport = async () => {
    try {
      const response = await fetch("/api/receiving-metrics/export", {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch export data");
      }
      
      const data = await response.json();
      const fileName = exportReceivingMetricsToExcel(data.stats, data.metrics);
      
      toast({
        title: "✓ Export Complete",
        description: `Downloaded ${fileName} with ${data.metrics.length} records`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export metrics",
        variant: "destructive",
      });
    }
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

      {/* Progress Tracker - Show when calculating */}
      {isCalculating && uploadStats && (
        <UploadProgressAdvanced
          uploadStats={uploadStats}
          isPaused={isPaused}
          isStopped={isStopped}
          uploadType="item-list"
          onPause={handlePause}
          onResume={handleResume}
          onStop={handleStop}
          onClear={handleClearProgress}
          showSkipped={false}
          isUploading={isCalculating}
        />
      )}

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

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleCalculate}
              disabled={isCalculating}
              className="flex items-center gap-2"
              data-testid="button-calculate-metrics"
            >
              {isCalculating ? (
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
              disabled={clearMutation.isPending || isCalculating}
              variant="outline"
              className="flex items-center gap-2"
              data-testid="button-clear-rebuild"
            >
              <Trash2 className="w-4 h-4" />
              Clear & Rebuild
            </Button>

            <Button
              onClick={handleExport}
              disabled={!stats || stats.total === 0}
              variant="secondary"
              className="flex items-center gap-2"
              data-testid="button-export-excel"
            >
              <Download className="w-4 h-4" />
              Export to Excel
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            <strong>Calculate All Metrics:</strong> Process all styles with batch progress tracking (pause/resume/stop supported)
            <br />
            <strong>Clear & Rebuild:</strong> Delete existing metrics and recalculate from scratch
            <br />
            <strong>Export to Excel:</strong> Download a professional report with summary statistics and detailed metrics for management review
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

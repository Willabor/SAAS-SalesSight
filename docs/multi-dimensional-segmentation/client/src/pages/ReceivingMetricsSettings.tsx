import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calculator, RefreshCw, Trash2, TrendingUp, Package, Calendar, Archive, Sparkles, Download, X, Settings as SettingsIcon, Save, RotateCcw, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

interface ReceivingMetricsSettings {
  id?: number;
  newItemDaysFromCreation: number;
  newItemMaxReceives: number;
  newItemMustHaveSold: boolean;
  coreItemMinSalesMonths: number;
  coreItemMinReceives: number;
  coreItemMaxDaysBetweenReceives: number;
  coreItemMaxDaysSinceLastSold: number;
  coreItemMaxDaysSinceLastReceived: number;
  coreItemMinInventoryOrRecentSales: boolean;
  seasonalItemMinYears: number;
  seasonalItemSalesConcentrationPct: number;
  seasonalItemMinDaysBetweenReceives: number;
  seasonalItemMaxDaysSinceActivity: number;
  seasonalOverridesDiscontinued: boolean;
  discontinuedMinDaysSinceSold: number;
  discontinuedMinDaysSinceReceived: number;
  discontinuedRequiresZeroInventory: boolean;
  clearanceMinInventory: number;
  clearanceMaxRecentSales: number;
  clearanceMinDaysSinceReceived: number;
  clearanceMinDaysOfSupply: number;
  oneTimeBuyMaxReceives: number;
  oneTimeBuyMinDaysSinceFirst: number;
  oneTimeBuyMaxDaysSinceSold: number;
}

const DEFAULT_SETTINGS: ReceivingMetricsSettings = {
  newItemDaysFromCreation: 30,
  newItemMaxReceives: 2,
  newItemMustHaveSold: false,
  coreItemMinSalesMonths: 6,
  coreItemMinReceives: 5,
  coreItemMaxDaysBetweenReceives: 60,
  coreItemMaxDaysSinceLastSold: 90,
  coreItemMaxDaysSinceLastReceived: 90,
  coreItemMinInventoryOrRecentSales: true,
  seasonalItemMinYears: 2,
  seasonalItemSalesConcentrationPct: 15,
  seasonalItemMinDaysBetweenReceives: 180,
  seasonalItemMaxDaysSinceActivity: 365,
  seasonalOverridesDiscontinued: true,
  discontinuedMinDaysSinceSold: 180,
  discontinuedMinDaysSinceReceived: 180,
  discontinuedRequiresZeroInventory: true,
  clearanceMinInventory: 10,
  clearanceMaxRecentSales: 3,
  clearanceMinDaysSinceReceived: 180,
  clearanceMinDaysOfSupply: 180,
  oneTimeBuyMaxReceives: 2,
  oneTimeBuyMinDaysSinceFirst: 90,
  oneTimeBuyMaxDaysSinceSold: 90,
};

export default function ReceivingMetricsSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
  const [settings, setSettings] = useState<ReceivingMetricsSettings>(DEFAULT_SETTINGS);
  const [isEditingSettings, setIsEditingSettings] = useState(false);

  const { data: stats, isLoading } = useQuery<ReceivingMetricsStats>({
    queryKey: ["/api/receiving-metrics/stats"],
  });

  const { data: savedSettings } = useQuery<ReceivingMetricsSettings>({
    queryKey: ["/api/receiving-metrics/settings"],
    retry: false,
  });

  useEffect(() => {
    if (savedSettings) setSettings(savedSettings);
  }, [savedSettings]);

  useEffect(() => {
    const savedState = loadUploadState();
    if (savedState && savedState.uploadType === 'metrics-calculation') {
      setIsCalculating(savedState.isUploading);
      setIsPaused(savedState.isPaused);
      if (savedState.stats) setUploadStats(savedState.stats);
    }

    const unsubscribe = subscribeToUploadState((state) => {
      if (state && state.uploadType === 'metrics-calculation') {
        setIsCalculating(state.isUploading);
        setIsPaused(state.isPaused);
        if (state.stats) setUploadStats(state.stats);
      } else if (!state) {
        setIsCalculating(false);
        setUploadStats(null);
        setIsPaused(false);
        setIsStopped(false);
      }
    });

    return () => unsubscribe();
  }, []);

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
      toast({ title: "✓ Metrics Cleared", description: `Deleted ${data.deleted} records` });
      queryClient.invalidateQueries({ queryKey: ["/api/receiving-metrics/stats"] });
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (newSettings: ReceivingMetricsSettings) => {
      const res = await fetch("/api/receiving-metrics/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newSettings),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "✓ Settings Saved" });
      queryClient.invalidateQueries({ queryKey: ["/api/receiving-metrics/settings"] });
      setIsEditingSettings(false);
    },
  });

  const handleCalculate = async () => {
    try {
      resetUploadControlFlags();
      setIsCalculating(true);
      setIsStopped(false);

      const result = await executeTrackedUpload(
        'metrics-calculation',
        'Receiving Metrics Calculation',
        (onProgress) => calculateMetricsWithProgress(
          onProgress,
          100,
          () => ({ isPaused: isUploadPaused(), isStopped: isUploadStopped() })
        ),
        0,
        'flatten'
      );

      if (result.stopped) {
        toast({ title: "Calculation Stopped", description: `Processed ${result.uploaded} styles` });
      } else {
        toast({ title: "✓ Complete", description: `Calculated ${result.uploaded} styles` });
      }

      queryClient.invalidateQueries({ queryKey: ["/api/receiving-metrics/stats"] });
      setIsCalculating(false);
    } catch (error) {
      toast({
        title: "Failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      setIsCalculating(false);
    }
  };

  const lifecycleColors: Record<string, string> = {
    New: "bg-green-100 text-green-800 border-green-200",
    Core: "bg-blue-100 text-blue-800 border-blue-200",
    Seasonal: "bg-purple-100 text-purple-800 border-purple-200",
    "One-Time": "bg-gray-100 text-gray-800 border-gray-200",
    Discontinued: "bg-red-100 text-red-800 border-red-200",
    Clearance: "bg-orange-100 text-orange-800 border-orange-200",
  };

  const lifecycleIcons: Record<string, any> = {
    New: Sparkles,
    Core: TrendingUp,
    Seasonal: Calendar,
    "One-Time": Package,
    Discontinued: Archive,
    Clearance: AlertTriangle,
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
      <div>
        <h1 className="text-3xl font-bold">Receiving Metrics Settings</h1>
        <p className="text-muted-foreground mt-2">
          Multi-dimensional product lifecycle analysis using sales, inventory, and receiving data
        </p>
      </div>

      {isCalculating && uploadStats && (
        <UploadProgressAdvanced
          uploadStats={uploadStats}
          isPaused={isPaused}
          isStopped={isStopped}
          uploadType="item-list"
          onPause={() => { pauseUpload(); setIsPaused(true); }}
          onResume={() => { resumeUpload(); setIsPaused(false); }}
          onStop={() => { stopUpload(); setIsStopped(true); }}
          onClear={() => {
            clearUploadState();
            setIsCalculating(false);
            setUploadStats(null);
            setIsPaused(false);
            setIsStopped(false);
          }}
          showSkipped={false}
          isUploading={isCalculating}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Current Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">Total Styles</div>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">Last Calculated</div>
              <div className="text-2xl font-bold">
                {stats?.lastCalculated ? new Date(stats.lastCalculated).toLocaleDateString() : "Never"}
              </div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">Lifecycle Stages</div>
              <div className="text-2xl font-bold">{Object.keys(stats?.byLifecycle || {}).length}</div>
            </div>
          </div>

          {stats && stats.byLifecycle && Object.keys(stats.byLifecycle).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">By Lifecycle Stage</h3>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
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

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleCalculate}
              disabled={isCalculating}
              className="flex items-center gap-2"
            >
              {isCalculating ? (
                <><RefreshCw className="w-4 h-4 animate-spin" />Calculating...</>
              ) : (
                <><Calculator className="w-4 h-4" />Calculate All Metrics</>
              )}
            </Button>

            <Button
              onClick={() => clearMutation.mutate()}
              disabled={isCalculating || !stats || stats.total === 0}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Clear Metrics
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

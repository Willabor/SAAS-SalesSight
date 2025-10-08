import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calculator, RefreshCw, Trash2, TrendingUp, Package, Calendar, Archive, Sparkles, Download, X, Settings as SettingsIcon, Save, RotateCcw, AlertTriangle, BarChart3, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
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
  coreItemMinMonths: number;
  coreItemMinReceives: number;
  coreItemMaxDaysBetween: number;
  coreItemMaxDaysSinceLast: number; // Phase 1
  coreItemMinSalesMonths: number; // Phase 2
  coreItemMaxDaysSinceLastSold: number; // Phase 2
  coreItemMinInventoryOrRecentSales: boolean; // Phase 2
  seasonalItemMinYears: number;
  seasonalItemConcentrationPct: number;
  seasonalItemMinDaysBetween: number;
  seasonalOverridesDiscontinued: boolean; // Phase 1
  seasonalDiscontinuedThreshold: number; // Phase 1
  seasonalItemSalesConcentrationPct: number; // Phase 2
  seasonalItemMaxDaysSinceActivity: number; // Phase 2
  oneTimeBuyMaxReceives: number;
  oneTimeBuyMinDaysSinceLast: number;
  oneTimeBuyMinDaysSinceFirst: number; // Phase 2
  oneTimeBuyMaxDaysSinceSold: number; // Phase 2
  discontinuedMinDaysSinceLast: number;
  discontinuedMinDaysSinceSold: number; // Phase 2
  discontinuedMinDaysSinceReceived: number; // Phase 2
  discontinuedRequiresZeroInventory: boolean; // Phase 2
  clearanceMinInventory: number; // Phase 2
  clearanceMaxRecentSales: number; // Phase 2
  clearanceMinDaysSinceReceived: number; // Phase 2
  clearanceMinDaysOfSupply: number; // Phase 2
}

const DEFAULT_SETTINGS: ReceivingMetricsSettings = {
  newItemDaysFromCreation: 30,
  newItemMaxReceives: 2,
  coreItemMinMonths: 3,
  coreItemMinReceives: 5,
  coreItemMaxDaysBetween: 60,
  coreItemMaxDaysSinceLast: 90,
  coreItemMinSalesMonths: 6,
  coreItemMaxDaysSinceLastSold: 90,
  coreItemMinInventoryOrRecentSales: true,
  seasonalItemMinYears: 2,
  seasonalItemConcentrationPct: 60,
  seasonalItemMinDaysBetween: 300,
  seasonalOverridesDiscontinued: true,
  seasonalDiscontinuedThreshold: 365,
  seasonalItemSalesConcentrationPct: 15,
  seasonalItemMaxDaysSinceActivity: 365,
  oneTimeBuyMaxReceives: 2,
  oneTimeBuyMinDaysSinceLast: 90,
  oneTimeBuyMinDaysSinceFirst: 90,
  oneTimeBuyMaxDaysSinceSold: 90,
  discontinuedMinDaysSinceLast: 180,
  discontinuedMinDaysSinceSold: 180,
  discontinuedMinDaysSinceReceived: 180,
  discontinuedRequiresZeroInventory: true,
  clearanceMinInventory: 10,
  clearanceMaxRecentSales: 3,
  clearanceMinDaysSinceReceived: 180,
  clearanceMinDaysOfSupply: 180,
};

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

  // Settings state
  const [settings, setSettings] = useState<ReceivingMetricsSettings>(DEFAULT_SETTINGS);
  const [isEditingSettings, setIsEditingSettings] = useState(false);

  // Fetch current stats
  const { data: stats, isLoading } = useQuery<ReceivingMetricsStats>({
    queryKey: ["/api/receiving-metrics/stats"],
  });

  // Fetch current settings
  const { data: savedSettings, isLoading: isLoadingSettings } = useQuery<ReceivingMetricsSettings>({
    queryKey: ["/api/receiving-metrics/settings"],
    retry: false,
  });

  // Initialize settings from server
  useEffect(() => {
    if (savedSettings) {
      setSettings(savedSettings);
    }
  }, [savedSettings]);

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

  // Save settings mutation
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
      toast({
        title: "✓ Settings Saved",
        description: "Business logic rules have been updated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/receiving-metrics/settings"] });
      setIsEditingSettings(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Save Failed",
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
        // Show detailed summary
        const noHistory = result.noReceivingHistory || 0;
        const errors = result.sqlErrors || 0;
        const total = result.total || 0;
        const successful = result.uploaded || 0;

        toast({
          title: "✓ Calculation Complete",
          description: (
            <div className="text-sm space-y-1">
              <div className="font-semibold">Summary:</div>
              <div>• Total Styles: {total}</div>
              <div>• Successfully Calculated: {successful}</div>
              {noHistory > 0 && <div>• Skipped (No Receiving History): {noHistory}</div>}
              {errors > 0 && <div className="text-red-500">• Errors: {errors}</div>}
              {result.failedItems && result.failedItems.length > 0 && (
                <div className="mt-2">
                  <div className="font-semibold">Export to Excel to see detailed failure reasons</div>
                </div>
              )}
            </div>
          ),
          duration: 10000, // Show for 10 seconds
        });

        // Log detailed summary to console for debugging
        console.log('📊 Calculation Summary:', {
          total,
          successful,
          failed: result.failed,
          noReceivingHistory: noHistory,
          sqlErrors: errors,
          failedItems: result.failedItems
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

  const handleClearOnly = async () => {
    if (!confirm("This will permanently delete all calculated metrics. You can recalculate them later. Continue?")) {
      return;
    }
    clearMutation.mutate();
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
      const fileName = exportReceivingMetricsToExcel(data.stats, data.metrics, data.failedItems, data.inventory);

      const failedCount = data.failedItems?.length || 0;
      toast({
        title: "✓ Export Complete",
        description: `Downloaded ${fileName} with ${data.metrics.length} successful and ${failedCount} failed/skipped items (includes inventory by location)`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export metrics",
        variant: "destructive",
      });
    }
  };

  const handleSaveSettings = () => {
    // Extract only the rule values, excluding metadata fields
    const settingsToSave = {
      newItemDaysFromCreation: settings.newItemDaysFromCreation,
      newItemMaxReceives: settings.newItemMaxReceives,
      coreItemMinMonths: settings.coreItemMinMonths,
      coreItemMinReceives: settings.coreItemMinReceives,
      coreItemMaxDaysBetween: settings.coreItemMaxDaysBetween,
      coreItemMaxDaysSinceLast: settings.coreItemMaxDaysSinceLast,
      coreItemMinSalesMonths: settings.coreItemMinSalesMonths,
      coreItemMaxDaysSinceLastSold: settings.coreItemMaxDaysSinceLastSold,
      coreItemMinInventoryOrRecentSales: settings.coreItemMinInventoryOrRecentSales,
      seasonalItemMinYears: settings.seasonalItemMinYears,
      seasonalItemConcentrationPct: settings.seasonalItemConcentrationPct,
      seasonalItemMinDaysBetween: settings.seasonalItemMinDaysBetween,
      seasonalOverridesDiscontinued: settings.seasonalOverridesDiscontinued,
      seasonalDiscontinuedThreshold: settings.seasonalDiscontinuedThreshold,
      seasonalItemSalesConcentrationPct: settings.seasonalItemSalesConcentrationPct,
      seasonalItemMaxDaysSinceActivity: settings.seasonalItemMaxDaysSinceActivity,
      oneTimeBuyMaxReceives: settings.oneTimeBuyMaxReceives,
      oneTimeBuyMinDaysSinceLast: settings.oneTimeBuyMinDaysSinceLast,
      oneTimeBuyMinDaysSinceFirst: settings.oneTimeBuyMinDaysSinceFirst,
      oneTimeBuyMaxDaysSinceSold: settings.oneTimeBuyMaxDaysSinceSold,
      discontinuedMinDaysSinceLast: settings.discontinuedMinDaysSinceLast,
      discontinuedMinDaysSinceSold: settings.discontinuedMinDaysSinceSold,
      discontinuedMinDaysSinceReceived: settings.discontinuedMinDaysSinceReceived,
      discontinuedRequiresZeroInventory: settings.discontinuedRequiresZeroInventory,
      clearanceMinInventory: settings.clearanceMinInventory,
      clearanceMaxRecentSales: settings.clearanceMaxRecentSales,
      clearanceMinDaysSinceReceived: settings.clearanceMinDaysSinceReceived,
      clearanceMinDaysOfSupply: settings.clearanceMinDaysOfSupply,
    };
    saveSettingsMutation.mutate(settingsToSave);
  };

  const handleResetSettings = () => {
    setSettings(savedSettings || DEFAULT_SETTINGS);
    setIsEditingSettings(false);
  };

  const handleSettingChange = (field: keyof ReceivingMetricsSettings, value: number | boolean) => {
    setSettings(prev => ({ ...prev, [field]: value }));
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
    Clearance: "bg-orange-100 text-orange-800 border-orange-200",
    "One-Time": "bg-gray-100 text-gray-800 border-gray-200",
    Discontinued: "bg-red-100 text-red-800 border-red-200",
  };

  const lifecycleIcons: Record<string, any> = {
    New: Sparkles,
    Core: TrendingUp,
    Seasonal: Calendar,
    Clearance: AlertTriangle,
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
        <div className="flex items-center gap-3 mb-2">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back-dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
        <h1 className="text-3xl font-bold">Receiving Metrics Settings</h1>
        <p className="text-muted-foreground mt-2">
          Multi-dimensional lifecycle analysis combining receiving patterns, sales velocity, and inventory levels
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
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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

      {/* Business Rules Info - Editable */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Business Logic Rules</CardTitle>
              <CardDescription>How items are classified into lifecycle stages</CardDescription>
            </div>
            {!isEditingSettings ? (
              <Button
                onClick={() => setIsEditingSettings(true)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <SettingsIcon className="w-4 h-4" />
                Edit Rules
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={handleResetSettings}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveSettings}
                  disabled={saveSettingsMutation.isPending}
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Rules
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* New Item Rules */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-green-100 text-green-800">New Item</Badge>
              </div>
              {isEditingSettings ? (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="newItemDaysFromCreation" className="text-xs">Days from creation</Label>
                    <Input
                      id="newItemDaysFromCreation"
                      type="number"
                      min="1"
                      value={settings.newItemDaysFromCreation}
                      onChange={(e) => handleSettingChange('newItemDaysFromCreation', parseInt(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newItemMaxReceives" className="text-xs">Max receives</Label>
                    <Input
                      id="newItemMaxReceives"
                      type="number"
                      min="1"
                      value={settings.newItemMaxReceives}
                      onChange={(e) => handleSettingChange('newItemMaxReceives', parseInt(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  • Last receive within {settings.newItemDaysFromCreation} days of creation<br />
                  • ≤ {settings.newItemMaxReceives} total receives
                </p>
              )}
            </div>

            {/* Core Item Rules */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-blue-100 text-blue-800">Core Item</Badge>
              </div>
              {isEditingSettings ? (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="coreItemMinMonths" className="text-xs">Min months with receives</Label>
                    <Input
                      id="coreItemMinMonths"
                      type="number"
                      min="1"
                      value={settings.coreItemMinMonths}
                      onChange={(e) => handleSettingChange('coreItemMinMonths', parseInt(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="coreItemMinReceives" className="text-xs">Min total receives</Label>
                    <Input
                      id="coreItemMinReceives"
                      type="number"
                      min="1"
                      value={settings.coreItemMinReceives}
                      onChange={(e) => handleSettingChange('coreItemMinReceives', parseInt(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="coreItemMaxDaysBetween" className="text-xs">Max days between receives</Label>
                    <Input
                      id="coreItemMaxDaysBetween"
                      type="number"
                      min="1"
                      value={settings.coreItemMaxDaysBetween}
                      onChange={(e) => handleSettingChange('coreItemMaxDaysBetween', parseInt(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="coreItemMaxDaysSinceLast" className="text-xs">Max days since last receive</Label>
                    <Input
                      id="coreItemMaxDaysSinceLast"
                      type="number"
                      min="1"
                      value={settings.coreItemMaxDaysSinceLast}
                      onChange={(e) => handleSettingChange('coreItemMaxDaysSinceLast', parseInt(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs font-semibold text-blue-600 mb-2">📊 Sales-Based Validation</p>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="coreItemMinSalesMonths" className="text-xs">Min sales months (last year)</Label>
                        <Input
                          id="coreItemMinSalesMonths"
                          type="number"
                          min="1"
                          value={settings.coreItemMinSalesMonths}
                          onChange={(e) => handleSettingChange('coreItemMinSalesMonths', parseInt(e.target.value))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="coreItemMaxDaysSinceLastSold" className="text-xs">Max days since last sold</Label>
                        <Input
                          id="coreItemMaxDaysSinceLastSold"
                          type="number"
                          min="1"
                          value={settings.coreItemMaxDaysSinceLastSold}
                          onChange={(e) => handleSettingChange('coreItemMaxDaysSinceLastSold', parseInt(e.target.value))}
                          className="mt-1"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="coreItemMinInventoryOrRecentSales" className="text-xs">Require inventory OR recent sales</Label>
                          <p className="text-xs text-muted-foreground">Must have stock or selling activity</p>
                        </div>
                        <Switch
                          id="coreItemMinInventoryOrRecentSales"
                          checked={settings.coreItemMinInventoryOrRecentSales}
                          onCheckedChange={(checked) => handleSettingChange('coreItemMinInventoryOrRecentSales', checked)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  <strong>Receiving Pattern:</strong><br />
                  • ≥ {settings.coreItemMinMonths} months with receives<br />
                  • ≥ {settings.coreItemMinReceives} total receives<br />
                  • Avg ≤ {settings.coreItemMaxDaysBetween} days between<br />
                  • ≤ {settings.coreItemMaxDaysSinceLast} days since last<br />
                  <strong className="text-blue-600">Sales Validation:</strong><br />
                  • ≥ {settings.coreItemMinSalesMonths} sales months<br />
                  • ≤ {settings.coreItemMaxDaysSinceLastSold} days since sold<br />
                  • Inventory/Sales: {settings.coreItemMinInventoryOrRecentSales ? 'Required' : 'Not required'}
                </p>
              )}
            </div>

            {/* Seasonal Item Rules */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-purple-100 text-purple-800">Seasonal</Badge>
              </div>
              {isEditingSettings ? (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="seasonalItemMinYears" className="text-xs">Min years of receives</Label>
                    <Input
                      id="seasonalItemMinYears"
                      type="number"
                      min="1"
                      value={settings.seasonalItemMinYears}
                      onChange={(e) => handleSettingChange('seasonalItemMinYears', parseInt(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="seasonalItemConcentrationPct" className="text-xs">Receiving concentration % in same month(s)</Label>
                    <Input
                      id="seasonalItemConcentrationPct"
                      type="number"
                      min="1"
                      max="100"
                      value={settings.seasonalItemConcentrationPct}
                      onChange={(e) => handleSettingChange('seasonalItemConcentrationPct', parseInt(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="seasonalItemMinDaysBetween" className="text-xs">Min days between receives</Label>
                    <Input
                      id="seasonalItemMinDaysBetween"
                      type="number"
                      min="1"
                      value={settings.seasonalItemMinDaysBetween}
                      onChange={(e) => handleSettingChange('seasonalItemMinDaysBetween', parseInt(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs font-semibold text-purple-600 mb-2">📊 Sales Pattern Validation</p>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="seasonalItemSalesConcentrationPct" className="text-xs">Sales concentration % in same month(s)</Label>
                        <Input
                          id="seasonalItemSalesConcentrationPct"
                          type="number"
                          min="1"
                          max="100"
                          value={settings.seasonalItemSalesConcentrationPct}
                          onChange={(e) => handleSettingChange('seasonalItemSalesConcentrationPct', parseInt(e.target.value))}
                          className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Minimum % of sales in peak months</p>
                      </div>
                      <div>
                        <Label htmlFor="seasonalItemMaxDaysSinceActivity" className="text-xs">Max days since last activity</Label>
                        <Input
                          id="seasonalItemMaxDaysSinceActivity"
                          type="number"
                          min="1"
                          value={settings.seasonalItemMaxDaysSinceActivity}
                          onChange={(e) => handleSettingChange('seasonalItemMaxDaysSinceActivity', parseInt(e.target.value))}
                          className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Days since receive or sale</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="seasonalOverridesDiscontinued" className="text-xs">Seasonal overrides Discontinued</Label>
                        <p className="text-xs text-muted-foreground">Prevents seasonal from being marked discontinued</p>
                      </div>
                      <Switch
                        id="seasonalOverridesDiscontinued"
                        checked={settings.seasonalOverridesDiscontinued}
                        onCheckedChange={(checked) => handleSettingChange('seasonalOverridesDiscontinued', checked)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="seasonalDiscontinuedThreshold" className="text-xs">Seasonal discontinued threshold (days)</Label>
                    <Input
                      id="seasonalDiscontinuedThreshold"
                      type="number"
                      min="1"
                      value={settings.seasonalDiscontinuedThreshold}
                      onChange={(e) => handleSettingChange('seasonalDiscontinuedThreshold', parseInt(e.target.value))}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Days before seasonal item = truly discontinued</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  <strong>Receiving Pattern:</strong><br />
                  • ≥ {settings.seasonalItemMinYears} years of receives<br />
                  • {settings.seasonalItemConcentrationPct}% receives in same months<br />
                  • Avg ≥ {settings.seasonalItemMinDaysBetween} days between<br />
                  <strong className="text-purple-600">Sales Pattern:</strong><br />
                  • {settings.seasonalItemSalesConcentrationPct}% sales in peak months<br />
                  • ≤ {settings.seasonalItemMaxDaysSinceActivity} days since activity<br />
                  • Override discontinued: {settings.seasonalOverridesDiscontinued ? 'ON' : 'OFF'} ({settings.seasonalDiscontinuedThreshold}d)
                </p>
              )}
            </div>

            {/* One-Time Buy Rules */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-gray-100 text-gray-800">One-Time Buy</Badge>
              </div>
              {isEditingSettings ? (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="oneTimeBuyMaxReceives" className="text-xs">Max total receives</Label>
                    <Input
                      id="oneTimeBuyMaxReceives"
                      type="number"
                      min="1"
                      value={settings.oneTimeBuyMaxReceives}
                      onChange={(e) => handleSettingChange('oneTimeBuyMaxReceives', parseInt(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="oneTimeBuyMinDaysSinceLast" className="text-xs">Min days since last receive</Label>
                    <Input
                      id="oneTimeBuyMinDaysSinceLast"
                      type="number"
                      min="1"
                      value={settings.oneTimeBuyMinDaysSinceLast}
                      onChange={(e) => handleSettingChange('oneTimeBuyMinDaysSinceLast', parseInt(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs font-semibold text-gray-600 mb-2">📊 Activity Validation</p>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="oneTimeBuyMinDaysSinceFirst" className="text-xs">Min days since first receive</Label>
                        <Input
                          id="oneTimeBuyMinDaysSinceFirst"
                          type="number"
                          min="1"
                          value={settings.oneTimeBuyMinDaysSinceFirst}
                          onChange={(e) => handleSettingChange('oneTimeBuyMinDaysSinceFirst', parseInt(e.target.value))}
                          className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Prevents new items from being classified as one-time</p>
                      </div>
                      <div>
                        <Label htmlFor="oneTimeBuyMaxDaysSinceSold" className="text-xs">Max days since sold</Label>
                        <Input
                          id="oneTimeBuyMaxDaysSinceSold"
                          type="number"
                          min="1"
                          value={settings.oneTimeBuyMaxDaysSinceSold}
                          onChange={(e) => handleSettingChange('oneTimeBuyMaxDaysSinceSold', parseInt(e.target.value))}
                          className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Must have recent sales activity</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  • ≤ {settings.oneTimeBuyMaxReceives} total receives<br />
                  • ≥ {settings.oneTimeBuyMinDaysSinceLast} days since last receive<br />
                  • ≥ {settings.oneTimeBuyMinDaysSinceFirst} days since first receive<br />
                  • ≤ {settings.oneTimeBuyMaxDaysSinceSold} days since sold<br />
                  • Not classified as Core
                </p>
              )}
            </div>

            {/* Clearance Rules - NEW */}
            <div className="p-4 border rounded-lg bg-orange-50">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-orange-100 text-orange-800">Clearance 🆕</Badge>
              </div>
              {isEditingSettings ? (
                <div className="space-y-3">
                  <p className="text-xs text-orange-700 font-medium mb-2">High inventory + low sales = clearance candidate</p>
                  <div>
                    <Label htmlFor="clearanceMinInventory" className="text-xs">Min inventory quantity</Label>
                    <Input
                      id="clearanceMinInventory"
                      type="number"
                      min="1"
                      value={settings.clearanceMinInventory}
                      onChange={(e) => handleSettingChange('clearanceMinInventory', parseInt(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clearanceMaxRecentSales" className="text-xs">Max sales (last 90 days)</Label>
                    <Input
                      id="clearanceMaxRecentSales"
                      type="number"
                      min="0"
                      value={settings.clearanceMaxRecentSales}
                      onChange={(e) => handleSettingChange('clearanceMaxRecentSales', parseInt(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clearanceMinDaysSinceReceived" className="text-xs">Min days since last received</Label>
                    <Input
                      id="clearanceMinDaysSinceReceived"
                      type="number"
                      min="1"
                      value={settings.clearanceMinDaysSinceReceived}
                      onChange={(e) => handleSettingChange('clearanceMinDaysSinceReceived', parseInt(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clearanceMinDaysOfSupply" className="text-xs">Min days of supply</Label>
                    <Input
                      id="clearanceMinDaysOfSupply"
                      type="number"
                      min="1"
                      value={settings.clearanceMinDaysOfSupply}
                      onChange={(e) => handleSettingChange('clearanceMinDaysOfSupply', parseInt(e.target.value))}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">(inventory / sales_90d) * 90</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  • ≥ {settings.clearanceMinInventory} units in stock<br />
                  • ≤ {settings.clearanceMaxRecentSales} sales (last 90 days)<br />
                  • ≥ {settings.clearanceMinDaysSinceReceived} days since received<br />
                  • ≥ {settings.clearanceMinDaysOfSupply} days of supply<br />
                  <span className="text-xs italic text-orange-700">Excess inventory with low velocity</span>
                </p>
              )}
            </div>

            {/* Discontinued Rules */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-red-100 text-red-800">Discontinued</Badge>
              </div>
              {isEditingSettings ? (
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="discontinuedMinDaysSinceLast" className="text-xs">Min days since last receive</Label>
                    <Input
                      id="discontinuedMinDaysSinceLast"
                      type="number"
                      min="1"
                      value={settings.discontinuedMinDaysSinceLast}
                      onChange={(e) => handleSettingChange('discontinuedMinDaysSinceLast', parseInt(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs font-semibold text-red-600 mb-2">📊 Sales & Inventory Validation</p>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="discontinuedMinDaysSinceSold" className="text-xs">Min days since last sold</Label>
                        <Input
                          id="discontinuedMinDaysSinceSold"
                          type="number"
                          min="1"
                          value={settings.discontinuedMinDaysSinceSold}
                          onChange={(e) => handleSettingChange('discontinuedMinDaysSinceSold', parseInt(e.target.value))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="discontinuedMinDaysSinceReceived" className="text-xs">Min days since last received (validation)</Label>
                        <Input
                          id="discontinuedMinDaysSinceReceived"
                          type="number"
                          min="1"
                          value={settings.discontinuedMinDaysSinceReceived}
                          onChange={(e) => handleSettingChange('discontinuedMinDaysSinceReceived', parseInt(e.target.value))}
                          className="mt-1"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label htmlFor="discontinuedRequiresZeroInventory" className="text-xs">Require zero inventory</Label>
                          <p className="text-xs text-muted-foreground">Must have no stock remaining</p>
                        </div>
                        <Switch
                          id="discontinuedRequiresZeroInventory"
                          checked={settings.discontinuedRequiresZeroInventory}
                          onCheckedChange={(checked) => handleSettingChange('discontinuedRequiresZeroInventory', checked)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  • ≥ {settings.discontinuedMinDaysSinceLast} days since last receive<br />
                  • ≥ {settings.discontinuedMinDaysSinceSold} days since sold<br />
                  • ≥ {settings.discontinuedMinDaysSinceReceived} days since received<br />
                  • Zero inventory: {settings.discontinuedRequiresZeroInventory ? 'Required' : 'Not required'}
                </p>
              )}
            </div>
          </div>

          {isEditingSettings && (
            <Alert className="mt-4">
              <AlertDescription>
                <strong>Note:</strong> After changing rules, click "Clear & Rebuild" or "Calculate All Metrics" to apply the new rules using the multi-dimensional calculator (sales + inventory + receiving analysis).
              </AlertDescription>
            </Alert>
          )}
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
              <strong>Multi-Dimensional Analysis Enabled:</strong> Calculations now combine receiving patterns, sales data, and inventory levels for accurate lifecycle classification.
              <br />
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
              onClick={handleClearOnly}
              disabled={clearMutation.isPending || isCalculating || !stats || stats.total === 0}
              variant="destructive"
              className="flex items-center gap-2"
              data-testid="button-clear-metrics"
            >
              <X className="w-4 h-4" />
              Clear Metrics
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

            <Link href="/receiving-metrics/dashboard">
              <Button
                disabled={!stats || stats.total === 0}
                variant="default"
                className="flex items-center gap-2"
                data-testid="button-view-dashboard"
              >
                <BarChart3 className="w-4 h-4" />
                View Analytics Dashboard
              </Button>
            </Link>
          </div>

          <p className="text-sm text-muted-foreground">
            <strong>Calculate All Metrics:</strong> Process all styles with batch progress tracking (pause/resume/stop supported)
            <br />
            <strong>Clear & Rebuild:</strong> Delete existing metrics and recalculate from scratch
            <br />
            <strong>Clear Metrics:</strong> Permanently delete all metrics without recalculating (reset to zero)
            <br />
            <strong>Export to Excel:</strong> Download a professional report with summary statistics and detailed metrics for management review
            <br />
            <strong>View Analytics Dashboard:</strong> Interactive dashboard with charts, trends, top products, clearance priority, and inventory health metrics
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

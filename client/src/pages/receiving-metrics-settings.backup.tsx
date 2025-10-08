import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Calculator, RefreshCw, Trash2, TrendingUp, Package, Calendar, Archive, Sparkles, Download, X, Settings as SettingsIcon, Save, RotateCcw } from "lucide-react";
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
  coreItemMaxDaysSinceLast: number; // NEW: Phase 1
  seasonalItemMinYears: number;
  seasonalItemConcentrationPct: number;
  seasonalItemMinDaysBetween: number;
  seasonalOverridesDiscontinued: boolean; // NEW: Phase 1
  seasonalDiscontinuedThreshold: number; // NEW: Phase 1
  oneTimeBuyMaxReceives: number;
  oneTimeBuyMinDaysSinceLast: number;
  discontinuedMinDaysSinceLast: number;
}

const DEFAULT_SETTINGS: ReceivingMetricsSettings = {
  newItemDaysFromCreation: 30, // Changed from 7 to 30
  newItemMaxReceives: 2,
  coreItemMinMonths: 3,
  coreItemMinReceives: 5,
  coreItemMaxDaysBetween: 60,
  coreItemMaxDaysSinceLast: 90, // NEW: Phase 1
  seasonalItemMinYears: 2,
  seasonalItemConcentrationPct: 60,
  seasonalItemMinDaysBetween: 300,
  seasonalOverridesDiscontinued: true, // NEW: Phase 1
  seasonalDiscontinuedThreshold: 365, // NEW: Phase 1
  oneTimeBuyMaxReceives: 2,
  oneTimeBuyMinDaysSinceLast: 90,
  discontinuedMinDaysSinceLast: 180,
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

  const handleSaveSettings = () => {
    // Extract only the rule values, excluding metadata fields
    const settingsToSave = {
      newItemDaysFromCreation: settings.newItemDaysFromCreation,
      newItemMaxReceives: settings.newItemMaxReceives,
      coreItemMinMonths: settings.coreItemMinMonths,
      coreItemMinReceives: settings.coreItemMinReceives,
      coreItemMaxDaysBetween: settings.coreItemMaxDaysBetween,
      coreItemMaxDaysSinceLast: settings.coreItemMaxDaysSinceLast, // NEW
      seasonalItemMinYears: settings.seasonalItemMinYears,
      seasonalItemConcentrationPct: settings.seasonalItemConcentrationPct,
      seasonalItemMinDaysBetween: settings.seasonalItemMinDaysBetween,
      seasonalOverridesDiscontinued: settings.seasonalOverridesDiscontinued, // NEW
      seasonalDiscontinuedThreshold: settings.seasonalDiscontinuedThreshold, // NEW
      oneTimeBuyMaxReceives: settings.oneTimeBuyMaxReceives,
      oneTimeBuyMinDaysSinceLast: settings.oneTimeBuyMinDaysSinceLast,
      discontinuedMinDaysSinceLast: settings.discontinuedMinDaysSinceLast,
    };
    saveSettingsMutation.mutate(settingsToSave);
  };

  const handleResetSettings = () => {
    setSettings(savedSettings || DEFAULT_SETTINGS);
    setIsEditingSettings(false);
  };

  const handleSettingChange = (field: keyof ReceivingMetricsSettings, value: number) => {
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
                    <Label htmlFor="coreItemMaxDaysSinceLast" className="text-xs font-semibold text-blue-600">🆕 Max days since last receive</Label>
                    <Input
                      id="coreItemMaxDaysSinceLast"
                      type="number"
                      min="1"
                      value={settings.coreItemMaxDaysSinceLast}
                      onChange={(e) => handleSettingChange('coreItemMaxDaysSinceLast', parseInt(e.target.value))}
                      className="mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Prevents zombie Core items</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  • ≥ {settings.coreItemMinMonths} different months with receives<br />
                  • ≥ {settings.coreItemMinReceives} total receives<br />
                  • Average ≤ {settings.coreItemMaxDaysBetween} days between receives<br />
                  • ≤ {settings.coreItemMaxDaysSinceLast} days since last receive
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
                    <Label htmlFor="seasonalItemConcentrationPct" className="text-xs">Concentration % in same month(s)</Label>
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
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="seasonalOverridesDiscontinued" className="text-xs font-semibold text-purple-600">🆕 Seasonal overrides Discontinued</Label>
                        <p className="text-xs text-muted-foreground">Prevents seasonal items from being marked discontinued</p>
                      </div>
                      <Switch
                        id="seasonalOverridesDiscontinued"
                        checked={settings.seasonalOverridesDiscontinued}
                        onCheckedChange={(checked) => handleSettingChange('seasonalOverridesDiscontinued', checked ? 1 : 0)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="seasonalDiscontinuedThreshold" className="text-xs font-semibold text-purple-600">🆕 Seasonal discontinued threshold (days)</Label>
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
                  • ≥ {settings.seasonalItemMinYears} years of receives<br />
                  • {settings.seasonalItemConcentrationPct}% in same month(s) each year<br />
                  • Average ≥ {settings.seasonalItemMinDaysBetween} days between receives<br />
                  • Override discontinued: {settings.seasonalOverridesDiscontinued ? 'ON' : 'OFF'} ({settings.seasonalDiscontinuedThreshold}d threshold)
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
                  <div>
                    <Label htmlFor="discontinuedMinDaysSinceLast" className="text-xs">Discontinued threshold (days)</Label>
                    <Input
                      id="discontinuedMinDaysSinceLast"
                      type="number"
                      min="1"
                      value={settings.discontinuedMinDaysSinceLast}
                      onChange={(e) => handleSettingChange('discontinuedMinDaysSinceLast', parseInt(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  • ≤ {settings.oneTimeBuyMaxReceives} total receives<br />
                  • ≥ {settings.oneTimeBuyMinDaysSinceLast} days since last receive<br />
                  • Not classified as Core<br />
                  <span className="text-xs italic">({settings.discontinuedMinDaysSinceLast}+ days = Discontinued)</span>
                </p>
              )}
            </div>
          </div>

          {isEditingSettings && (
            <Alert className="mt-4">
              <AlertDescription>
                <strong>Note:</strong> After changing rules, click "Clear & Rebuild" or "Calculate All Metrics" to apply the new rules to existing data.
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
          </div>

          <p className="text-sm text-muted-foreground">
            <strong>Calculate All Metrics:</strong> Process all styles with batch progress tracking (pause/resume/stop supported)
            <br />
            <strong>Clear & Rebuild:</strong> Delete existing metrics and recalculate from scratch
            <br />
            <strong>Clear Metrics:</strong> Permanently delete all metrics without recalculating (reset to zero)
            <br />
            <strong>Export to Excel:</strong> Download a professional report with summary statistics and detailed metrics for management review
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

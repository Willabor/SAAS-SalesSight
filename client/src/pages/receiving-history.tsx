import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { uploadReceivingWithProgress } from "@/lib/api";
import {
  subscribeToUploadState,
  loadUploadState,
  executeTrackedUpload,
  clearUploadState,
  isUploadActive,
  pauseUpload,
  resumeUpload,
  stopUpload,
  isUploadPaused,
  isUploadStopped,
  resetUploadControlFlags
} from "@/lib/uploadStateManager";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Upload,
  FileSpreadsheet,
  Check,
  AlertCircle,
  FileCheck,
  Database,
  Eye,
  Download,
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { Link } from "wouter";
import { UploadProgressAdvanced } from "@/components/upload-progress-advanced";
import {
  formatReceivingFile,
  flattenReceivingData,
  exportFlattenedToExcel,
  type ReceivingVoucher,
  type ReceivingProcessingStats,
} from "@/lib/excel-processor";
import * as XLSX from "xlsx";

type ProcessingStep = "upload" | "format" | "flatten" | "complete";

interface UploadResponse {
  success: boolean;
  message: string;
  uploaded: number;
  lines: number;
  skipped: number;
  failed: number;
  errors: string[];
  duplicateVouchers: any[];
}

export default function ReceivingHistoryPage() {
  const [currentStep, setCurrentStep] = useState<ProcessingStep>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processedWorkbook, setProcessedWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [formatStats, setFormatStats] = useState<ReceivingProcessingStats | null>(null);
  const [flattenedData, setFlattenedData] = useState<ReceivingVoucher[] | null>(null);
  const [flattenStats, setFlattenStats] = useState<any>(null);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(null);
  const [uploadStats, setUploadStats] = useState<{
    processed: number;
    total: number;
    uploaded: number;
    skipped: number;
    failed: number;
  } | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isStopped, setIsStopped] = useState<boolean>(false);
  const [showAnomalyDialog, setShowAnomalyDialog] = useState<boolean>(false);
  const [excludedVoucherNumbers, setExcludedVoucherNumbers] = useState<Set<string>>(new Set());
  const [anomalyReviewed, setAnomalyReviewed] = useState<boolean>(false);
  const { toast } = useToast();

  const { data: stats } = useQuery<{
    totalVouchers: number;
    totalLines: number;
    totalCost: number;
    uniqueVendors: number;
    uniqueStores: number;
  }>({
    queryKey: ["/api/receiving/stats"],
  });

  // Restore upload state on mount and subscribe to changes
  useEffect(() => {
    const savedState = loadUploadState();

    if (savedState && savedState.uploadType === 'receiving') {
      // If state shows upload completed or not actively uploading, clear it
      if (!savedState.isUploading || savedState.currentStep === 'complete') {
        clearUploadState();
        return;
      }

      // Restore upload state even if activeUploadPromise is null
      // (it might be null due to page reload, but upload could still be running server-side)
      setIsUploading(savedState.isUploading);
      setIsPaused(savedState.isPaused);
      if (savedState.stats) {
        setUploadStats(savedState.stats);
        const percentage = Math.round((savedState.stats.processed / savedState.stats.total) * 100);
        setUploadProgress(percentage);
      }

      // If upload was in progress, restore to the flatten step to show progress
      if (savedState.isUploading && savedState.currentStep === 'flatten') {
        setCurrentStep('flatten');
        // The upload is still running in the background
        // The subscription below will update the UI as it progresses
      }
    }

    // Subscribe to upload state changes
    const unsubscribe = subscribeToUploadState((state) => {
      if (state && state.uploadType === 'receiving') {
        setIsUploading(state.isUploading);
        setIsPaused(state.isPaused);
        if (state.stats) {
          setUploadStats(state.stats);
          const percentage = Math.round((state.stats.processed / state.stats.total) * 100);
          setUploadProgress(percentage);
        }

        // If upload completed while we were on another page
        if (!state.isUploading && state.currentStep === 'complete') {
          setCurrentStep('complete');
          // Will be cleared automatically after 3 seconds
        }
      } else if (state === null) {
        // State was cleared - reset UI if still showing old progress
        setIsUploading(false);
        setUploadStats(null);
        setIsPaused(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setCurrentStep("upload");
      setProcessedWorkbook(null);
      setFormatStats(null);
      setFlattenedData(null);
      setFlattenStats(null);
      setUploadResponse(null);
    }
  };

  const handleFormatAndConsolidate = async () => {
    if (!selectedFile) return;

    try {
      setProcessingStatus("Formatting and consolidating...");
      const result = await formatReceivingFile(selectedFile, setProcessingStatus);
      setProcessedWorkbook(result.workbook);
      setFormatStats(result.stats);
      setCurrentStep("format");
      toast({
        title: "Format Complete",
        description: `Processed ${result.stats.sheetsProcessed} sheets successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to format file",
        variant: "destructive",
      });
    }
  };

  const handleFlatten = async () => {
    if (!processedWorkbook) return;

    try {
      setProcessingStatus("Flattening voucher data...");
      setProcessingProgress(0);
      const result = await flattenReceivingData(processedWorkbook, (status, percentage) => {
        setProcessingStatus(status);
        if (percentage !== undefined) {
          setProcessingProgress(percentage);
        }
      });
      setFlattenedData(result.vouchers);
      setFlattenStats(result.stats);
      setCurrentStep("flatten");
      setProcessingProgress(100);

      // Show anomaly dialog if anomalies detected
      if (result.stats.anomalousVouchersCount > 0) {
        setShowAnomalyDialog(true);
        setAnomalyReviewed(false);
        // Initialize excluded vouchers - all anomalies are INCLUDED by default (checkboxes checked)
        setExcludedVoucherNumbers(new Set());
      } else {
        setAnomalyReviewed(true); // No anomalies, so no review needed
      }

      toast({
        title: "Flatten Complete",
        description: `Processed ${result.stats.totalVouchers} vouchers with ${result.stats.totalLines} line items.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to flatten data",
        variant: "destructive",
      });
    }
  };


  const handleUpload = async () => {
    if (!flattenedData || !selectedFile) return;
    // Prevent double-click and concurrent uploads
    if (isUploading) return;

    // If there are anomalies and user hasn't reviewed them yet, block upload
    if (flattenStats?.anomalousVouchersCount > 0 && !anomalyReviewed) {
      toast({
        title: "Review Required",
        description: "Please review the anomalous vouchers before uploading.",
        variant: "destructive",
      });
      setShowAnomalyDialog(true);
      return;
    }

    // Filter out excluded vouchers
    const vouchersToUpload = flattenedData.filter(
      voucher => !excludedVoucherNumbers.has(voucher.voucherNumber)
    );

    const excludedCount = flattenedData.length - vouchersToUpload.length;

    if (vouchersToUpload.length === 0) {
      toast({
        title: "No Vouchers to Upload",
        description: "All vouchers have been excluded. Please review your selections.",
        variant: "destructive",
      });
      return;
    }

    // Reset control flags
    resetUploadControlFlags();
    setIsPaused(false);
    setIsStopped(false);

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStats({ processed: 0, total: vouchersToUpload.length, uploaded: 0, skipped: excludedCount, failed: 0 });

    try {
      // Use executeTrackedUpload to persist state across navigation
      const result = await executeTrackedUpload(
        'receiving',
        selectedFile.name,
        (onProgress) => uploadReceivingWithProgress(
          vouchersToUpload,
          (progress) => {
            // Add excluded count to skipped
            const adjustedProgress = {
              ...progress,
              skipped: progress.skipped + excludedCount
            };
            setUploadStats(adjustedProgress);
            onProgress(adjustedProgress);
            // Update upload progress percentage based on processed items
            const percentage = Math.round((progress.processed / progress.total) * 100);
            setUploadProgress(percentage);

            // Invalidate stats every 10 batches to update the cards in real-time
            if (progress.processed % 500 === 0 || progress.processed === progress.total) {
              queryClient.invalidateQueries({ queryKey: ["/api/receiving/stats"] });
            }
          },
          selectedFile.name,
          50, // batch size
          () => ({ isPaused: isUploadPaused(), isStopped: isUploadStopped() })
        ),
        vouchersToUpload.length,
        'flatten'
      );

      // Check if upload was stopped
      if (result.stopped) {
        setIsStopped(true);
        toast({
          title: "Upload Stopped",
          description: `Upload was stopped. ${result.uploaded} vouchers were uploaded before stopping.`,
        });
        // Don't transition to complete, stay on flatten step to show stopped state
        return;
      }

      // Update response state
      setUploadResponse({
        success: result.success,
        message: `Upload complete. ${result.uploaded} vouchers and ${result.lines || 0} line items uploaded successfully.${excludedCount > 0 ? ` ${excludedCount} anomalous voucher(s) excluded.` : ''}`,
        uploaded: result.uploaded,
        lines: result.lines || 0,
        skipped: (result.skipped || 0) + excludedCount,
        failed: result.failed,
        errors: result.errors,
        duplicateVouchers: result.duplicateVouchers || []
      });

      setCurrentStep("complete");

      // Invalidate queries to refresh stats
      queryClient.invalidateQueries({ queryKey: ["/api/receiving/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/receiving/vouchers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/receiving/filter-options"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });

      if (result.failed > 0) {
        toast({
          title: "Upload completed with errors",
          description: `${result.uploaded} vouchers uploaded, ${result.failed} failed`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Upload Successful",
          description: `${result.uploaded} vouchers uploaded successfully`,
        });
      }

    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload data",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setIsPaused(false);
      setTimeout(() => {
        setUploadStats(null);
      }, 3000); // Clear progress after 3 seconds
    }
  };

  const downloadPreview = () => {
    if (!processedWorkbook) return;
    const wbout = XLSX.write(processedWorkbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "formatted_preview.xlsx";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePauseUpload = () => {
    pauseUpload();
    setIsPaused(true);
  };

  const handleResumeUpload = () => {
    resumeUpload();
    setIsPaused(false);
  };

  const handleStopUpload = () => {
    stopUpload();
    setIsStopped(true);
    setIsPaused(false);
  };

  const handleResetUpload = () => {
    // Clear upload state and reset to beginning
    resetWorkflow();
  };

  const resetWorkflow = () => {
    // Clear persisted upload state
    clearUploadState();
    resetUploadControlFlags();

    setCurrentStep("upload");
    setSelectedFile(null);
    setProcessedWorkbook(null);
    setFormatStats(null);
    setFlattenedData(null);
    setFlattenStats(null);
    setUploadResponse(null);
    setIsUploading(false);
    setUploadStats(null);
    setUploadProgress(0);
    setIsPaused(false);
    setIsStopped(false);
    setShowAnomalyDialog(false);
    setExcludedVoucherNumbers(new Set());
    setAnomalyReviewed(false);
  };

  const toggleVoucherExclusion = (voucherNumber: string) => {
    setExcludedVoucherNumbers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(voucherNumber)) {
        newSet.delete(voucherNumber); // Re-include (check the box)
      } else {
        newSet.add(voucherNumber); // Exclude (uncheck the box)
      }
      return newSet;
    });
  };

  const handleConfirmAnomalyReview = () => {
    setAnomalyReviewed(true);
    setShowAnomalyDialog(false);

    const excludedCount = excludedVoucherNumbers.size;
    if (excludedCount > 0) {
      toast({
        title: "Anomalies Reviewed",
        description: `${excludedCount} voucher(s) will be skipped during upload.`,
      });
    } else {
      toast({
        title: "Anomalies Reviewed",
        description: "All anomalous vouchers will be uploaded.",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex justify-end">
          <Link href="/receiving/viewer" data-testid="link-voucher-viewer">
            <Button variant="outline" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              View Vouchers
            </Button>
          </Link>
        </div>
        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card data-testid="card-stats-vouchers">
              <CardHeader className="pb-2">
                <CardDescription>Total Vouchers</CardDescription>
                <CardTitle className="text-2xl" data-testid="text-total-vouchers">{stats.totalVouchers.toLocaleString()}</CardTitle>
              </CardHeader>
            </Card>
            <Card data-testid="card-stats-lines">
              <CardHeader className="pb-2">
                <CardDescription>Total Line Items</CardDescription>
                <CardTitle className="text-2xl" data-testid="text-total-lines">{stats.totalLines.toLocaleString()}</CardTitle>
              </CardHeader>
            </Card>
            <Card data-testid="card-stats-cost">
              <CardHeader className="pb-2">
                <CardDescription>Total Cost</CardDescription>
                <CardTitle className="text-2xl" data-testid="text-total-cost">
                  ${stats.totalCost?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card data-testid="card-stats-vendors">
              <CardHeader className="pb-2">
                <CardDescription>Unique Vendors</CardDescription>
                <CardTitle className="text-2xl" data-testid="text-unique-vendors">{stats.uniqueVendors || 0}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* Processing Steps */}
        <Card>
          <CardHeader>
            <CardTitle>Upload & Process Receiving History</CardTitle>
            <CardDescription>
              Follow the steps to format, consolidate, and upload QuickBooks receiving voucher data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step Indicators */}
            <div className="flex items-center justify-between">
              {[
                { id: "upload", label: "Upload", icon: Upload },
                { id: "format", label: "Format", icon: FileCheck },
                { id: "flatten", label: "Flatten", icon: FileSpreadsheet },
                { id: "complete", label: "Complete", icon: Check },
              ].map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = ["upload", "format", "flatten", "complete"].indexOf(currentStep) > index;
                
                return (
                  <div key={step.id} className="flex flex-col items-center flex-1">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : isCompleted
                          ? "bg-green-500 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                      data-testid={`step-indicator-${step.id}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <p className="text-xs mt-2 text-center">{step.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Step 1: Upload */}
            {currentStep === "upload" && (
              <div className="space-y-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>QuickBooks Export Required</AlertTitle>
                  <AlertDescription>
                    Export your Receiving Voucher Detail report from QuickBooks as an Excel file (.xlsx). The file should contain
                    multiple sheets with receiving voucher data.
                  </AlertDescription>
                </Alert>

                <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 bg-muted/30">
                  <FileSpreadsheet className="w-12 h-12 text-muted-foreground mb-4" />
                  <Input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="max-w-sm"
                    data-testid="input-file-upload"
                  />
                  {selectedFile && (
                    <p className="text-sm text-muted-foreground mt-2" data-testid="text-selected-file">
                      Selected: {selectedFile.name}
                    </p>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleFormatAndConsolidate}
                    disabled={!selectedFile}
                    data-testid="button-start-processing"
                  >
                    Start Processing
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Format & Consolidate */}
            {currentStep === "format" && formatStats && (
              <div className="space-y-4">
                <Alert>
                  <Check className="h-4 w-4" />
                  <AlertTitle>Format & Consolidate Complete</AlertTitle>
                  <AlertDescription>
                    Sheets consolidated, rows deleted, and columns formatted successfully.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Sheets Processed</CardDescription>
                      <CardTitle data-testid="text-sheets-processed">{formatStats.sheetsProcessed}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Rows Deleted</CardDescription>
                      <CardTitle data-testid="text-rows-deleted">{formatStats.rowsDeleted}</CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={downloadPreview} data-testid="button-download-preview">
                    <Download className="w-4 h-4 mr-2" />
                    Download Preview
                  </Button>
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={resetWorkflow} data-testid="button-start-over">
                    Start Over
                  </Button>
                  <Button onClick={handleFlatten} data-testid="button-flatten">
                    Continue to Flatten
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Flatten */}
            {currentStep === "flatten" && flattenStats && (
              <div className="space-y-4">
                <Alert>
                  <Check className="h-4 w-4" />
                  <AlertTitle>Flatten Complete</AlertTitle>
                  <AlertDescription>
                    Voucher data has been flattened and corrected totals calculated.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Vouchers</CardDescription>
                      <CardTitle data-testid="text-flatten-vouchers">{flattenStats.totalVouchers}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Line Items</CardDescription>
                      <CardTitle data-testid="text-flatten-lines">{flattenStats.totalLines}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>QB Mismatches</CardDescription>
                      <CardTitle data-testid="text-qb-mismatches">{flattenStats.qbMismatchCount}</CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                {flattenStats.qbMismatchCount > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>QuickBooks Calculation Errors Detected</AlertTitle>
                    <AlertDescription>
                      {flattenStats.qbMismatchCount} vouchers have incorrect totals due to QuickBooks bugs.
                      Corrected totals have been calculated.
                    </AlertDescription>
                  </Alert>
                )}

                {flattenStats.anomalousVouchersCount > 0 && !anomalyReviewed && (
                  <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950">
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                    <AlertTitle className="text-orange-800 dark:text-orange-200">
                      ⚠️ Action Required: Review Anomalous Vouchers
                    </AlertTitle>
                    <AlertDescription className="text-orange-700 dark:text-orange-300">
                      <p className="mb-3">
                        {flattenStats.anomalousVouchersCount} voucher(s) exceed normal thresholds ($10,000+).
                        These may be dropshipping placeholders or bulk orders.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAnomalyDialog(true)}
                        className="border-orange-600 text-orange-700 hover:bg-orange-100"
                      >
                        <AlertCircle className="w-4 h-4 mr-2" />
                        Review Anomalies ({flattenStats.anomalousVouchersCount})
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {flattenStats.anomalousVouchersCount > 0 && anomalyReviewed && (
                  <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                    <Check className="h-4 w-4 text-green-600" />
                    <AlertTitle className="text-green-800 dark:text-green-200">
                      Anomalies Reviewed
                    </AlertTitle>
                    <AlertDescription className="text-green-700 dark:text-green-300 space-y-2">
                      <p>
                        {flattenStats.anomalousVouchersCount - excludedVoucherNumbers.size} voucher(s) will be uploaded.
                        {excludedVoucherNumbers.size > 0 && ` ${excludedVoucherNumbers.size} voucher(s) will be skipped.`}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAnomalyDialog(true)}
                        className="text-xs"
                      >
                        Review Again
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-between items-center gap-2">
                  <Button variant="outline" onClick={resetWorkflow} data-testid="button-reset">
                    Start Over
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (flattenedData && selectedFile) {
                          const fileName = selectedFile.name.replace(/\.[^/.]+$/, '-flattened.xlsx');
                          exportFlattenedToExcel(flattenedData, fileName);
                          toast({
                            title: "Download Started",
                            description: "Flattened Excel file is being downloaded.",
                          });
                        }
                      }}
                      data-testid="button-download-flattened"
                      disabled={!flattenedData}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Excel
                    </Button>
                    <Button
                      onClick={handleUpload}
                      disabled={isUploading || !flattenedData}
                      data-testid="button-upload-database"
                    >
                      <Database className="w-4 h-4 mr-2" />
                      {isUploading ? "Uploading..." : "Upload to Database"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Standalone Upload Progress Display - Shows during active upload even without flattenStats */}
            {currentStep === "flatten" && isUploading && uploadStats && (
              <div className="space-y-4">
                {/* Upload Progress Display - Detailed like Sales Formatter */}
                {!flattenStats && (
                  <Alert>
                    <Database className="h-4 w-4" />
                    <AlertTitle>Upload In Progress</AlertTitle>
                    <AlertDescription>
                      Uploading vouchers to database. Progress restored from previous session.
                    </AlertDescription>
                  </Alert>
                )}

                <UploadProgressAdvanced
                  uploadStats={uploadStats}
                  isPaused={isPaused}
                  isStopped={isStopped}
                  uploadType="receiving"
                  onPause={handlePauseUpload}
                  onResume={handleResumeUpload}
                  onStop={handleStopUpload}
                  onClear={resetWorkflow}
                  showSkipped={true}
                  isUploading={isUploading}
                />
              </div>
            )}


            {/* Step 4: Complete */}
            {currentStep === "complete" && uploadResponse && (
              <div className="space-y-4">
                <Alert>
                  <Check className="h-4 w-4" />
                  <AlertTitle>Upload Complete</AlertTitle>
                  <AlertDescription>{uploadResponse.message}</AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Uploaded</CardDescription>
                      <CardTitle className="text-green-600" data-testid="text-uploaded-count">{uploadResponse.uploaded}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Line Items</CardDescription>
                      <CardTitle data-testid="text-uploaded-lines">{uploadResponse.lines}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Skipped</CardDescription>
                      <CardTitle className="text-yellow-600" data-testid="text-skipped-count">{uploadResponse.skipped}</CardTitle>
                    </CardHeader>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Failed</CardDescription>
                      <CardTitle className="text-red-600" data-testid="text-failed-count">{uploadResponse.failed}</CardTitle>
                    </CardHeader>
                  </Card>
                </div>

                {uploadResponse.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Errors Occurred</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc list-inside space-y-1">
                        {uploadResponse.errors.slice(0, 5).map((error, i) => (
                          <li key={i} className="text-sm">{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2">
                  <Button onClick={resetWorkflow} data-testid="button-process-another">
                    Process Another File
                  </Button>
                  <Link href="/receiving/viewer">
                    <Button variant="outline" data-testid="button-view-vouchers">
                      <Eye className="w-4 h-4 mr-2" />
                      View Vouchers
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {processingStatus && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center" data-testid="text-processing-status">
                  {processingStatus}
                </p>
                {processingProgress >= 0 && processingProgress <= 100 && currentStep === "format" && (
                  <div className="space-y-1">
                    <Progress value={processingProgress} className="h-2" data-testid="progress-flatten" />
                    <p className="text-xs text-center text-muted-foreground" data-testid="text-progress-percentage">
                      {processingProgress}% complete
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Anomaly Review Dialog */}
        <Dialog open={showAnomalyDialog} onOpenChange={setShowAnomalyDialog}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-orange-600">⚠️ Review Anomalous Vouchers</DialogTitle>
              <DialogDescription>
                {flattenStats?.anomalousVouchersCount} voucher(s) exceed normal thresholds.
                Review each voucher and decide whether to upload or skip it.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Instructions */}
              <Alert className="border-orange-300 bg-orange-50 dark:bg-orange-950">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-sm">
                  <p className="font-medium mb-2">How to review:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li><strong>Checked (✓)</strong> = Voucher will be <strong>uploaded</strong> to database</li>
                    <li><strong>Unchecked (☐)</strong> = Voucher will be <strong>skipped</strong> (not uploaded)</li>
                    <li>All vouchers are checked by default</li>
                    <li>Skipped vouchers will count towards the "Skipped" metric</li>
                  </ul>
                </AlertDescription>
              </Alert>

              {/* Voucher Table */}
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-orange-100 dark:bg-orange-900 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Upload?</th>
                      <th className="px-3 py-2 text-left font-medium">Voucher #</th>
                      <th className="px-3 py-2 text-left font-medium">Vendor</th>
                      <th className="px-3 py-2 text-left font-medium">Store</th>
                      <th className="px-3 py-2 text-left font-medium">Date</th>
                      <th className="px-3 py-2 text-right font-medium">Total</th>
                      <th className="px-3 py-2 text-right font-medium">Qty</th>
                      <th className="px-3 py-2 text-right font-medium">Lines</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-950">
                    {flattenStats?.anomalousVouchers?.map((voucher: any, idx: number) => {
                      const isExcluded = excludedVoucherNumbers.has(voucher.voucherNumber);
                      return (
                        <tr
                          key={idx}
                          className={`border-t border-orange-200 dark:border-orange-800 ${
                            isExcluded ? 'opacity-50 bg-gray-100 dark:bg-gray-900' : ''
                          }`}
                        >
                          <td className="px-3 py-2">
                            <Checkbox
                              checked={!isExcluded}
                              onCheckedChange={() => toggleVoucherExclusion(voucher.voucherNumber)}
                              aria-label={`Upload voucher ${voucher.voucherNumber}`}
                            />
                          </td>
                          <td className="px-3 py-2 font-mono">{voucher.voucherNumber}</td>
                          <td className="px-3 py-2">{voucher.vendor}</td>
                          <td className="px-3 py-2">{voucher.store}</td>
                          <td className="px-3 py-2 text-xs">{voucher.date}</td>
                          <td className="px-3 py-2 text-right font-semibold text-orange-600">
                            ${voucher.correctedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-3 py-2 text-right">{voucher.totalQty.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right">{voucher.lineCount}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="flex items-center justify-between px-2 py-2 bg-muted rounded-md">
                <span className="text-sm font-medium">
                  To Upload: {flattenStats?.anomalousVouchersCount - excludedVoucherNumbers.size}
                </span>
                <span className="text-sm font-medium text-yellow-600">
                  To Skip: {excludedVoucherNumbers.size}
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowAnomalyDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmAnomalyReview}
              >
                Confirm & Continue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

import { useState, useRef, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText } from "lucide-react";
import { processExcelFile, processWorkbook } from "@/lib/excel-processor";
import { uploadDataWithProgress } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  executeTrackedUpload,
  subscribeToUploadState,
  pauseUpload,
  resumeUpload,
  stopUpload,
  resetUploadControlFlags,
  isUploadPaused,
  isUploadStopped,
  loadUploadState,
  clearUploadState,
} from "@/lib/uploadStateManager";
import { UploadProgressAdvanced } from "@/components/upload-progress-advanced";

export function FileUploadTabs() {
  const [activeTab, setActiveTab] = useState("item-list");
  const [uploadMode, setUploadMode] = useState("initial");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStats, setUploadStats] = useState<{
    processed: number;
    total: number;
    uploaded: number;
    skipped: number;
    failed: number;
  } | null>(null);
  const [uploadResults, setUploadResults] = useState<{
    successful: number;
    failed: number;
    total: number;
    errors: string[];
  } | null>(null);
  
  const itemListFileRef = useRef<HTMLInputElement>(null);
  const salesFileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Restore upload state on mount and subscribe to changes
  useEffect(() => {
    const savedState = loadUploadState();

    if (savedState && (savedState.uploadType === 'item-list' || savedState.uploadType === 'sales')) {
      // If state shows upload completed or not actively uploading, clear it
      if (!savedState.isUploading || savedState.currentStep === 'complete') {
        clearUploadState();
        return;
      }

      // Restore upload state
      setIsUploading(savedState.isUploading);
      setIsPaused(savedState.isPaused);
      if (savedState.stats) {
        setUploadStats(savedState.stats);
        const percentage = Math.round((savedState.stats.processed / savedState.stats.total) * 100);
        setUploadProgress(percentage);
      }
    }

    // Subscribe to upload state changes
    const unsubscribe = subscribeToUploadState((state) => {
      if (state && (state.uploadType === 'item-list' || state.uploadType === 'sales')) {
        setIsUploading(state.isUploading);
        setIsPaused(state.isPaused);
        if (state.stats) {
          setUploadStats(state.stats);
          const percentage = Math.round((state.stats.processed / state.stats.total) * 100);
          setUploadProgress(percentage);
        }

        // If upload completed while we were on another page
        if (!state.isUploading && state.currentStep === 'complete') {
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

  const handleFileSelect = async (file: File, type: 'item-list' | 'sales-transactions') => {
    if (!file) return;

    // Prevent double-click and concurrent uploads
    if (isUploading || isProcessing) return;

    // Reset control flags
    resetUploadControlFlags();
    setIsPaused(false);
    setIsStopped(false);

    setIsProcessing(true);
    setUploadProgress(0);
    setUploadResults(null);
    setUploadStats(null);

    try {
      // Process Excel file
      const workbook = await processExcelFile(file);
      const data = processWorkbook(workbook, type);
      
      setIsProcessing(false);
      setIsUploading(true);
      setUploadProgress(0);

      // Use executeTrackedUpload to persist state across navigation
      const uploadType = type === 'sales-transactions' ? 'sales' : 'item-list';
      const result = await executeTrackedUpload(
        uploadType,
        file.name,
        (onProgress) => uploadDataWithProgress(
          type,
          data,
          (progress) => {
            setUploadStats(progress);
            onProgress(progress);
            // Update upload progress percentage based on processed items
            const percentage = Math.round((progress.processed / progress.total) * 100);
            setUploadProgress(percentage);

            // Invalidate dashboard stats during upload for real-time updates
            if (progress.processed % 500 === 0 || progress.processed === progress.total) {
              queryClient.invalidateQueries({ queryKey: ["/api/stats/item-list"] });
              queryClient.invalidateQueries({ queryKey: ["/api/stats/sales"] });
            }
          },
          type === 'item-list' ? uploadMode : undefined,
          file.name,
          100, // batch size
          () => ({ isPaused: isUploadPaused(), isStopped: isUploadStopped() })
        ),
        data.length,
        'flatten'
      );

      // Check if upload was stopped
      if (result.stopped) {
        setIsStopped(true);
        toast({
          title: "Upload Stopped",
          description: `Upload was stopped. ${result.uploaded} records were uploaded before stopping.`,
        });
        return;
      }

      // Update response state
      setUploadResults({
        successful: result.uploaded,
        failed: result.failed,
        total: result.total,
        errors: result.errors,
      });

      // Invalidate queries to refresh stats
      queryClient.invalidateQueries({ queryKey: ["/api/stats/item-list"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/upload-history"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });

      if (result.failed > 0) {
        toast({
          title: "Upload completed with errors",
          description: `${result.uploaded} records uploaded, ${result.failed} failed`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Upload Successful",
          description: `${result.uploaded} records uploaded successfully`,
        });
      }

    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to process or upload file",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setIsProcessing(false);
      setIsPaused(false);
      setTimeout(() => {
        setUploadStats(null);
      }, 3000); // Clear progress after 3 seconds
    }
  };

  const handleItemListUpload = () => {
    if (!isUploading) {
      itemListFileRef.current?.click();
    }
  };

  const handleSalesUpload = () => {
    if (!isUploading) {
      salesFileRef.current?.click();
    }
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
    // Clear persisted upload state
    clearUploadState();
    // Clear local UI state
    setIsUploading(false);
    setIsPaused(false);
    setIsStopped(false);
    setUploadStats(null);
    setUploadProgress(0);
    setUploadResults(null);
  };

  return (
    <div className="bg-card border border-border rounded-lg">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="border-b border-border">
          <TabsList className="h-auto p-0 bg-transparent">
            <TabsTrigger
              value="item-list"
              className="py-4 px-6 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent"
              data-testid="tab-item-list"
            >
              Item List Upload
            </TabsTrigger>
            <TabsTrigger
              value="sales-transactions"
              className="py-4 px-6 border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent"
              data-testid="tab-sales-transactions"
            >
              Sales Transactions
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="item-list" className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upload Mode Selection */}
            <div className="lg:col-span-1">
              <h3 className="text-lg font-semibold text-foreground mb-4">Upload Mode</h3>
              <RadioGroup value={uploadMode} onValueChange={setUploadMode} className="space-y-3" disabled={isUploading || isProcessing}>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="initial" id="initial" disabled={isUploading || isProcessing} />
                  <Label htmlFor="initial" className="cursor-pointer">
                    <div>
                      <p className="font-medium text-foreground">Initial Upload</p>
                      <p className="text-sm text-muted-foreground">Fresh data import, will fail on duplicates</p>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="weekly_update" id="weekly" disabled={isUploading || isProcessing} />
                  <Label htmlFor="weekly" className="cursor-pointer">
                    <div>
                      <p className="font-medium text-foreground">Weekly Update</p>
                      <p className="text-sm text-muted-foreground">Update existing items with new data</p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* File Upload Area */}
            <div className="lg:col-span-2">
              <h3 className="text-lg font-semibold text-foreground mb-4">Select Excel File</h3>
              <div 
                className={`border-2 border-dashed border-border rounded-lg p-8 text-center transition-colors ${
                  isUploading || isProcessing ? 'cursor-not-allowed opacity-60' : 'hover:border-primary cursor-pointer'
                }`}
                onClick={handleItemListUpload}
                data-testid="dropzone-item-list"
              >
                <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <p className="text-lg font-medium text-foreground mb-2">Drop your Excel file here</p>
                <p className="text-muted-foreground mb-4">or click to browse your files</p>
                <Button 
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={isProcessing || isUploading}
                  data-testid="button-choose-file-item-list"
                >
                  {isProcessing ? "Processing..." : isUploading ? "Uploading..." : "Choose File"}
                </Button>
                <p className="text-xs text-muted-foreground mt-3">Supports .xlsx, .xls files up to 50MB</p>
              </div>
              <Input
                ref={itemListFileRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file, 'item-list');
                }}
                className="hidden"
                data-testid="input-file-item-list"
                disabled={isUploading || isProcessing}
              />

              {/* Upload Progress */}
              {(isUploading || uploadStats) && (
                <div className="mt-6">
                  <UploadProgressAdvanced
                    uploadStats={uploadStats!}
                    isPaused={isPaused}
                    isStopped={isStopped}
                    uploadType={activeTab === "item-list" ? "item-list" : "sales"}
                    onPause={handlePauseUpload}
                    onResume={handleResumeUpload}
                    onStop={handleStopUpload}
                    onClear={handleResetUpload}
                    showSkipped={true}
                    isUploading={isUploading}
                  />
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sales-transactions" className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Instructions */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Upload Instructions</h3>
              <div className="bg-muted rounded-lg p-4">
                <h4 className="font-medium text-foreground mb-2">Required Columns:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Date</li>
                  <li>• Store</li>
                  <li>• Receipt #</li>
                  <li>• SKU</li>
                  <li>• Item Name</li>
                  <li>• Transaction Store Type</li>
                  <li>• Price</li>
                  <li>• Sheet</li>
                </ul>
              </div>
            </div>

            {/* File Upload Area */}
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Select Excel File</h3>
              <div 
                className={`border-2 border-dashed border-border rounded-lg p-6 text-center transition-colors ${
                  isUploading || isProcessing ? 'cursor-not-allowed opacity-60' : 'hover:border-primary cursor-pointer'
                }`}
                onClick={handleSalesUpload}
                data-testid="dropzone-sales-transactions"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <p className="text-base font-medium text-foreground mb-2">Upload Sales Data</p>
                <p className="text-sm text-muted-foreground mb-3">Drop file or click to browse</p>
                <Button 
                  className="bg-primary text-primary-foreground hover:bg-primary/90 text-sm"
                  disabled={isProcessing || isUploading}
                  data-testid="button-choose-file-sales"
                >
                  {isProcessing ? "Processing..." : isUploading ? "Uploading..." : "Choose File"}
                </Button>
              </div>
              <Input
                ref={salesFileRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file, 'sales-transactions');
                }}
                className="hidden"
                data-testid="input-file-sales"
                disabled={isUploading || isProcessing}
              />

              {/* Upload Progress */}
              {(isUploading || uploadStats) && (
                <div className="mt-6">
                  <UploadProgressAdvanced
                    uploadStats={uploadStats!}
                    isPaused={isPaused}
                    isStopped={isStopped}
                    uploadType={activeTab === "item-list" ? "item-list" : "sales"}
                    onPause={handlePauseUpload}
                    onResume={handleResumeUpload}
                    onStop={handleStopUpload}
                    onClear={handleResetUpload}
                    showSkipped={true}
                    isUploading={isUploading}
                  />
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

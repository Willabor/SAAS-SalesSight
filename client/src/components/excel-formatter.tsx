import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, Download, FileText, BarChart3, CheckCircle, Pause, Play, StopCircle } from "lucide-react";
import { formatItemList, formatSalesFile, flattenSalesData, downloadExcelFile, downloadCSVFile, samplePreview } from "@/lib/formatters";
import type { ItemListStats, SalesStats, BusinessStats } from "@/lib/formatters";
import { uploadData, uploadDataWithProgress } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  executeTrackedUpload,
  pauseUpload,
  resumeUpload,
  stopUpload,
  isUploadPaused,
  isUploadStopped,
  resetUploadControlFlags,
  loadUploadState,
  subscribeToUploadState,
} from "@/lib/uploadStateManager";

type ProcessingMode = 'item-list' | 'sales';
type Step = 'upload' | 'choose-mode' | 'formatting-item-list' | 'item-list-ready-upload' | 'ready-to-format' | 'formatting' | 'ready-to-flatten' | 'flattening' | 'sales-ready-upload';

export function ExcelFormatter() {
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>('upload');
  const [processingMode, setProcessingMode] = useState<ProcessingMode | null>(null);
  const [uploadMode, setUploadMode] = useState<'initial' | 'weekly_update'>('initial');
  const [status, setStatus] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Upload progress tracking
  const [isUploading, setIsUploading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const [uploadStats, setUploadStats] = useState<{
    processed: number;
    total: number;
    uploaded: number;
    failed: number;
  } | null>(null);
  
  // Item List state
  const [itemListWorkbook, setItemListWorkbook] = useState<any>(null);
  const [itemListStats, setItemListStats] = useState<ItemListStats | null>(null);
  const [parsedItemData, setParsedItemData] = useState<any[] | null>(null);
  
  // Sales state
  const [formattedWorkbook, setFormattedWorkbook] = useState<any>(null);
  const [salesStats, setSalesStats] = useState<SalesStats | null>(null);
  const [consolidatedCSV, setConsolidatedCSV] = useState('');
  const [businessStats, setBusinessStats] = useState<BusinessStats | null>(null);
  const [parsedSalesData, setParsedSalesData] = useState<any[] | null>(null);
  
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Restore and subscribe to upload state for cross-page persistence
  useEffect(() => {
    // Check for existing upload state on mount
    const savedState = loadUploadState();
    if (savedState && (savedState.uploadType === 'item-list' || savedState.uploadType === 'sales')) {
      // Restore upload state
      setIsUploading(savedState.isUploading);
      setIsPaused(savedState.isPaused);
      if (savedState.stats) {
        setUploadStats(savedState.stats);
        const percentage = Math.round((savedState.stats.processed / savedState.stats.total) * 100);
        setUploadProgress(percentage);
      }
    }

    // Subscribe to state changes
    const unsubscribe = subscribeToUploadState((state) => {
      if (state && (state.uploadType === 'item-list' || state.uploadType === 'sales')) {
        setIsUploading(state.isUploading);
        setIsPaused(state.isPaused);
        if (state.stats) {
          setUploadStats(state.stats);
          const percentage = Math.round((state.stats.processed / state.stats.total) * 100);
          setUploadProgress(percentage);
        }
      } else if (!state) {
        // State was cleared - reset UI if still showing old progress
        setIsUploading(false);
        setUploadStats(null);
        setIsPaused(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const uploadMutation = useMutation({
    mutationFn: async ({ data, type, mode, fileName }: {
      data: any[];
      type: 'item-list' | 'sales-transactions';
      mode?: string;
      fileName: string;
    }) => {
      return uploadData(type, data, mode, fileName);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/stats/item-list"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/upload-history"] });
      
      if (result.failed > 0) {
        toast({
          title: "Upload completed with errors",
          description: `${result.uploaded} records uploaded, ${result.failed} failed`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Upload successful",
          description: `${result.uploaded} records uploaded successfully`,
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setStep('choose-mode');
      setStatus('File selected. Choose processing mode.');
    }
  };

  const handleModeSelect = (mode: ProcessingMode) => {
    setProcessingMode(mode);
    
    if (mode === 'item-list') {
      formatItemListData();
    } else {
      setStep('ready-to-format');
    }
  };

  const formatItemListData = async () => {
    if (!file) return;

    setStep('formatting-item-list');
    setStatus('Reading Item List file...');
    setUploadProgress(10);

    try {
      setStatus('Formatting Item Detail sheet...');
      setUploadProgress(30);
      
      const result = await formatItemList(file);
      
      setUploadProgress(80);
      setItemListWorkbook(result.workbook);
      setItemListStats(result.stats);
      setParsedItemData(result.parsedData);
      
      setStep('item-list-ready-upload');
      setStatus('Item list formatted successfully!');
      setUploadProgress(100);
      
    } catch (error) {
      setStatus('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setStep('choose-mode');
      toast({
        title: "Formatting failed",
        description: error instanceof Error ? error.message : "Failed to format item list",
        variant: "destructive",
      });
    }
  };

  const formatSalesData = async () => {
    if (!file) return;

    setStep('formatting');
    setStatus('Reading file...');
    setUploadProgress(10);

    try {
      setStatus('Formatting sheets...');
      setUploadProgress(30);
      
      const result = await formatSalesFile(file);
      
      setUploadProgress(70);
      setFormattedWorkbook(result.workbook);
      setSalesStats(result.stats);
      
      setStep('ready-to-flatten');
      setStatus('Sales data formatted successfully!');
      setUploadProgress(100);
      
    } catch (error) {
      setStatus('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setStep('ready-to-format');
      toast({
        title: "Formatting failed",
        description: error instanceof Error ? error.message : "Failed to format sales data",
        variant: "destructive",
      });
    }
  };

  const flattenSalesDataStep = async () => {
    if (!formattedWorkbook) return;

    setStep('flattening');
    setStatus('Flattening data...');
    setUploadProgress(10);

    try {
      setUploadProgress(30);
      
      const result = await flattenSalesData(formattedWorkbook);
      
      setUploadProgress(80);
      setConsolidatedCSV(result.csvData);
      setBusinessStats(result.businessStats);
      setParsedSalesData(result.transactions);
      
      setStep('sales-ready-upload');
      setStatus('Sales data flattened successfully!');
      setUploadProgress(100);
      
    } catch (error) {
      setStatus('Error: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setStep('ready-to-flatten');
      toast({
        title: "Flattening failed",
        description: error instanceof Error ? error.message : "Failed to flatten sales data",
        variant: "destructive",
      });
    }
  };

  const uploadToDatabase = async () => {
    if (!file) return;
    
    let data: any[];
    let type: 'item-list' | 'sales-transactions';
    let uploadType: 'item-list' | 'sales';
    
    if (processingMode === 'item-list' && parsedItemData) {
      data = parsedItemData;
      type = 'item-list';
      uploadType = 'item-list';
    } else if (processingMode === 'sales' && parsedSalesData) {
      data = parsedSalesData;
      type = 'sales-transactions';
      uploadType = 'sales';
    } else {
      return;
    }

    // Reset control flags before starting
    resetUploadControlFlags();
    setIsUploading(true);
    setIsPaused(false);
    setIsStopped(false);
    setUploadStats({ processed: 0, total: data.length, uploaded: 0, failed: 0 });
    
    try {
      const result = await executeTrackedUpload(
        uploadType,
        file.name,
        (onProgress) => uploadDataWithProgress(
          type,
          data,
          (progress) => {
            const progressWithSkipped = { ...progress, skipped: 0 };
            setUploadStats(progress);
            onProgress(progressWithSkipped);
            // Update upload progress percentage based on uploaded items
            const percentage = Math.round((progress.uploaded / progress.total) * 100);
            setUploadProgress(percentage);
            setStatus(`Uploading to database: ${progress.processed} of ${progress.total} items processed (${progress.uploaded} uploaded, ${progress.failed} failed)`);
          },
          processingMode === 'item-list' ? uploadMode : undefined,
          file.name,
          100,
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
          title: "Upload successful",
          description: `${result.uploaded} records uploaded successfully`,
        });
      }
      
      setStatus(`Upload complete: ${result.uploaded} items uploaded, ${result.failed} failed`);
      
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
      setStatus("Upload failed");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setTimeout(() => {
        setUploadStats(null);
      }, 3000); // Clear progress after 3 seconds
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

  const downloadItemList = () => {
    if (!itemListWorkbook) return;
    downloadExcelFile(itemListWorkbook, 'Formatted_Item_List.xlsx');
  };

  const downloadFormattedExcel = () => {
    if (!formattedWorkbook) return;
    downloadExcelFile(formattedWorkbook, 'Formatted_Sales_Data.xlsx');
  };

  const downloadConsolidatedCSV = () => {
    if (!consolidatedCSV) return;
    downloadCSVFile(consolidatedCSV, 'Consolidated_Sales_Data.csv');
  };

  const resetWorkflow = () => {
    setFile(null);
    setStep('upload');
    setProcessingMode(null);
    setStatus('');
    setUploadProgress(0);
    setItemListWorkbook(null);
    setItemListStats(null);
    setParsedItemData(null);
    setFormattedWorkbook(null);
    setSalesStats(null);
    setConsolidatedCSV('');
    setBusinessStats(null);
    setParsedSalesData(null);
  };

  return (
    <div className="space-y-6">
      {/* Upload Step */}
      {step === 'upload' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Excel File Upload & Formatting
            </CardTitle>
            <CardDescription>
              Upload your Excel file to format and process item lists or sales data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div 
              className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
              onClick={() => fileRef.current?.click()}
              data-testid="excel-upload-zone"
            >
              <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <p className="text-lg font-medium text-foreground mb-2">Drop your Excel file here</p>
              <p className="text-muted-foreground mb-4">or click to browse your files</p>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                Choose Excel File
              </Button>
              <p className="text-xs text-muted-foreground mt-3">Supports .xlsx, .xls files up to 50MB</p>
            </div>
            <Input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
          </CardContent>
        </Card>
      )}

      {/* Mode Selection Step */}
      {step === 'choose-mode' && file && (
        <Card>
          <CardHeader>
            <CardTitle>Choose Processing Mode</CardTitle>
            <CardDescription>
              Selected file: {file.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-auto p-6 flex flex-col items-center gap-3"
                onClick={() => handleModeSelect('item-list')}
                data-testid="button-item-list-mode"
              >
                <FileText className="w-8 h-8 text-primary" />
                <div className="text-center">
                  <p className="font-semibold">Item List Formatter</p>
                  <p className="text-sm text-muted-foreground">Process Item Detail sheet</p>
                </div>
              </Button>
              
              <Button
                variant="outline"
                className="h-auto p-6 flex flex-col items-center gap-3"
                onClick={() => handleModeSelect('sales')}
                data-testid="button-sales-mode"
              >
                <BarChart3 className="w-8 h-8 text-primary" />
                <div className="text-center">
                  <p className="font-semibold">Sales Data Formatter</p>
                  <p className="text-sm text-muted-foreground">2-step process for sales data</p>
                </div>
              </Button>
            </div>
            
            <Button variant="ghost" onClick={resetWorkflow} className="w-full">
              Choose Different File
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Progress Indicator */}
      {(step === 'formatting-item-list' || step === 'formatting' || step === 'flattening') && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">Processing...</p>
                <Badge variant="secondary">{uploadProgress}%</Badge>
              </div>
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-muted-foreground">{status}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Item List Results */}
      {step === 'item-list-ready-upload' && itemListStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Item List Formatted Successfully
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{itemListStats.rowsDeleted}</p>
                <p className="text-sm text-muted-foreground">Rows Deleted</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{itemListStats.columnsDeleted}</p>
                <p className="text-sm text-muted-foreground">Columns Deleted</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{parsedItemData?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Records Ready</p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-semibold">Upload Mode</h4>
              <RadioGroup value={uploadMode} onValueChange={(value: any) => setUploadMode(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="initial" id="initial" />
                  <Label htmlFor="initial">Initial Upload (fail on duplicates)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="weekly_update" id="weekly" />
                  <Label htmlFor="weekly">Weekly Update (update existing)</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Upload Progress Display */}
            {isUploading && uploadStats && (
              <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    {isStopped ? "Upload Stopped" : isPaused ? "Upload Paused" : "Uploading to Database"}
                  </p>
                  <Badge variant="secondary">{Math.round((uploadStats.uploaded / uploadStats.total) * 100)}%</Badge>
                </div>
                <Progress value={(uploadStats.uploaded / uploadStats.total) * 100} className="w-full" />
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-lg font-bold text-blue-900 dark:text-blue-100">{uploadStats.processed}</p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">Processed</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">{uploadStats.uploaded}</p>
                    <p className="text-xs text-green-700 dark:text-green-300">Uploaded</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-red-600 dark:text-red-400">{uploadStats.failed}</p>
                    <p className="text-xs text-red-700 dark:text-red-300">Failed</p>
                  </div>
                </div>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {uploadStats.processed} of {uploadStats.total} items processed
                </p>
                {isUploading && !isStopped && (
                  <div className="flex gap-2">
                    {isPaused ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResumeUpload}
                        className="flex items-center gap-2"
                        data-testid="button-resume-upload"
                      >
                        <Play className="w-4 h-4" />
                        Resume
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePauseUpload}
                        className="flex items-center gap-2"
                        data-testid="button-pause-upload"
                      >
                        <Pause className="w-4 h-4" />
                        Pause
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleStopUpload}
                      className="flex items-center gap-2"
                      data-testid="button-stop-upload"
                    >
                      <StopCircle className="w-4 h-4" />
                      Stop
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={downloadItemList} variant="outline" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Download Formatted Excel
              </Button>
              <Button 
                onClick={uploadToDatabase} 
                disabled={isUploading}
                className="flex items-center gap-2"
                data-testid="button-upload-database"
              >
                <Upload className="w-4 h-4" />
                {isUploading ? 'Uploading...' : 'Upload to Database'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sales Formatting Steps */}
      {step === 'ready-to-format' && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Format Sales Data</CardTitle>
            <CardDescription>Clean and format the Excel sheets</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={formatSalesData} className="w-full">
              Start Formatting
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 'ready-to-flatten' && salesStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Step 1 Complete: Data Formatted
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{salesStats.sheetsProcessed}</p>
                <p className="text-sm text-muted-foreground">Sheets Processed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{salesStats.rowsDeleted}</p>
                <p className="text-sm text-muted-foreground">Rows Deleted</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{salesStats.sheetNames.length}</p>
                <p className="text-sm text-muted-foreground">Sales Detail Sheets</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={downloadFormattedExcel} variant="outline" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Download Formatted Excel
              </Button>
              <Button onClick={flattenSalesDataStep} className="flex items-center gap-2">
                Next: Flatten Data
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 'sales-ready-upload' && businessStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Step 2 Complete: Data Flattened
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{businessStats.totalRecords}</p>
                <p className="text-sm text-muted-foreground">Total Records</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">${businessStats.totalRevenue.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{businessStats.uniqueReceipts}</p>
                <p className="text-sm text-muted-foreground">Unique Receipts</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{businessStats.uniqueStores}</p>
                <p className="text-sm text-muted-foreground">Stores</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold">Top Products by Revenue</h4>
              <div className="space-y-2">
                {businessStats.topProducts.slice(0, 5).map((product, index) => (
                  <div key={index} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <span className="font-medium">{product.itemName}</span>
                    <span className="text-primary font-semibold">${product.totalRevenue.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Upload Progress Display */}
            {isUploading && uploadStats && (
              <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    {isStopped ? "Upload Stopped" : isPaused ? "Upload Paused" : "Uploading to Database"}
                  </p>
                  <Badge variant="secondary">{Math.round((uploadStats.uploaded / uploadStats.total) * 100)}%</Badge>
                </div>
                <Progress value={(uploadStats.uploaded / uploadStats.total) * 100} className="w-full" />
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-lg font-bold text-blue-900 dark:text-blue-100">{uploadStats.processed}</p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">Processed</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">{uploadStats.uploaded}</p>
                    <p className="text-xs text-green-700 dark:text-green-300">Uploaded</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-red-600 dark:text-red-400">{uploadStats.failed}</p>
                    <p className="text-xs text-red-700 dark:text-red-300">Failed</p>
                  </div>
                </div>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  {uploadStats.processed} of {uploadStats.total} items processed
                </p>
                {isUploading && !isStopped && (
                  <div className="flex gap-2">
                    {isPaused ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResumeUpload}
                        className="flex items-center gap-2"
                        data-testid="button-resume-upload"
                      >
                        <Play className="w-4 h-4" />
                        Resume
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePauseUpload}
                        className="flex items-center gap-2"
                        data-testid="button-pause-upload"
                      >
                        <Pause className="w-4 h-4" />
                        Pause
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleStopUpload}
                      className="flex items-center gap-2"
                      data-testid="button-stop-upload"
                    >
                      <StopCircle className="w-4 h-4" />
                      Stop
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={downloadConsolidatedCSV} variant="outline" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Download CSV
              </Button>
              <Button 
                onClick={uploadToDatabase} 
                disabled={isUploading}
                className="flex items-center gap-2"
                data-testid="button-upload-database-sales"
              >
                <Upload className="w-4 h-4" />
                {isUploading ? 'Uploading...' : 'Upload to Database'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {(step === 'item-list-ready-upload' || step === 'sales-ready-upload') && (
        <Card>
          <CardContent className="pt-6">
            <Button variant="ghost" onClick={resetWorkflow} className="w-full">
              Start Over with New File
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
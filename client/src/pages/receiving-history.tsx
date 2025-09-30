import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  Check,
  AlertCircle,
  FileCheck,
  Database,
  Eye,
  Download,
} from "lucide-react";
import { Link } from "wouter";
import {
  formatReceivingFile,
  flattenReceivingData,
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
  const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(null);
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

  const uploadMutation = useMutation({
    mutationFn: async (data: { vouchers: ReceivingVoucher[]; fileName: string }) => {
      const response = await apiRequest("POST", "/api/receiving/upload", data);
      return response.json() as Promise<UploadResponse>;
    },
    onSuccess: (data) => {
      setUploadResponse(data);
      setCurrentStep("complete");
      queryClient.invalidateQueries({ queryKey: ["/api/receiving/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/receiving/vouchers"] });
      toast({
        title: "Upload Successful",
        description: data.message,
      });
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload data",
        variant: "destructive",
      });
    },
  });

  const handleUpload = () => {
    if (!flattenedData || !selectedFile) return;
    uploadMutation.mutate({
      vouchers: flattenedData,
      fileName: selectedFile.name,
    });
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

  const resetWorkflow = () => {
    setCurrentStep("upload");
    setSelectedFile(null);
    setProcessedWorkbook(null);
    setFormatStats(null);
    setFlattenedData(null);
    setFlattenStats(null);
    setUploadResponse(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Link href="/" data-testid="link-dashboard">
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Dashboard
                </Button>
              </Link>
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Receiving History</h1>
                <p className="text-xs text-muted-foreground">Process QuickBooks receiving vouchers</p>
              </div>
            </div>
            <Link href="/receiving/viewer" data-testid="link-voucher-viewer">
              <Button variant="outline" className="flex items-center gap-2">
                <Eye className="w-4 h-4" />
                View Vouchers
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
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

                <div className="flex justify-between">
                  <Button variant="outline" onClick={resetWorkflow} data-testid="button-reset">
                    Start Over
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={uploadMutation.isPending}
                    data-testid="button-upload-database"
                  >
                    <Database className="w-4 h-4 mr-2" />
                    {uploadMutation.isPending ? "Uploading..." : "Upload to Database"}
                  </Button>
                </div>
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
      </main>
    </div>
  );
}

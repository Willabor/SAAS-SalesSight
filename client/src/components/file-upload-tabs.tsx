import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload, FileText } from "lucide-react";
import { processExcelFile, processWorkbook } from "@/lib/excel-processor";
import { uploadData } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function FileUploadTabs() {
  const [activeTab, setActiveTab] = useState("item-list");
  const [uploadMode, setUploadMode] = useState("initial");
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
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
      setUploadResults({
        successful: result.uploaded,
        failed: result.failed,
        total: result.total,
        errors: result.errors,
      });
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
    },
    onError: (error) => {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = async (file: File, type: 'item-list' | 'sales-transactions') => {
    if (!file) return;

    setIsProcessing(true);
    setUploadProgress(0);
    setUploadResults(null);

    try {
      const workbook = await processExcelFile(file);
      const data = processWorkbook(workbook, type);
      
      setUploadProgress(50);
      
      await uploadMutation.mutateAsync({
        data,
        type,
        mode: type === 'item-list' ? uploadMode : undefined,
        fileName: file.name,
      });
      
      setUploadProgress(100);
    } catch (error) {
      toast({
        title: "File processing failed",
        description: error instanceof Error ? error.message : "Failed to process Excel file",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleItemListUpload = () => {
    itemListFileRef.current?.click();
  };

  const handleSalesUpload = () => {
    salesFileRef.current?.click();
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
              <RadioGroup value={uploadMode} onValueChange={setUploadMode} className="space-y-3">
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="initial" id="initial" />
                  <Label htmlFor="initial" className="cursor-pointer">
                    <div>
                      <p className="font-medium text-foreground">Initial Upload</p>
                      <p className="text-sm text-muted-foreground">Fresh data import, will fail on duplicates</p>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="weekly_update" id="weekly" />
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
                className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
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
                  disabled={isProcessing}
                  data-testid="button-choose-file-item-list"
                >
                  {isProcessing ? "Processing..." : "Choose File"}
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
              />
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
                className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
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
                  disabled={isProcessing}
                  data-testid="button-choose-file-sales"
                >
                  {isProcessing ? "Processing..." : "Choose File"}
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
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/**
 * Vendor Configuration Page
 * Phase 0, Day 3: Admin UI for vendor prepack configuration
 *
 * Features:
 * - List all vendors with prepack configurations
 * - Search and filter vendors
 * - Auto-detect size types
 * - Create/Edit/Delete vendor configurations
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Sparkles,
  Edit,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Upload,
  Download,
  Package,
  Box,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StyleCard } from "@/components/StyleCard";
import { StyleDialog } from "@/components/StyleDialog";
import { PackDialog } from "@/components/PackDialog";

interface VendorConfiguration {
  id: number;
  vendorName: string;
  usesPrepacks: boolean;
  minOrderQty: number | null;
  minOrderValue: string | null;
  defaultSizeType: string | null;
  sizeTypeAutoDetected: boolean;
  sizeTypeConfidence: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SizeTypeDetectionResult {
  detectedType: string;
  confidence: number;
  samplesAnalyzed: number;
  matchedSamples: number;
  explanation: string;
  sizeBreakdown: {
    jeans: number;
    apparel: number;
    shoes: number;
    numeric: number;
    onesize: number;
  };
}

interface PrepackSizeDistribution {
  id: number;
  prepackConfigId: number;
  sizeValue: string;
  quantity: number;
  percentage: string | null;
}

interface PrepackConfiguration {
  id: number;
  styleConfigId: number;
  prepackName: string;
  piecesPerBox: number;
  costPerBox: string | null;
  availableColors: string[] | null;
  description: string | null;
  distributions: PrepackSizeDistribution[];
  createdAt: string;
  updatedAt: string;
}

interface StyleConfiguration {
  id: number;
  vendorName: string;
  styleNumber: string;
  sizeType: string;
  defaultColors: string[] | null;
  description: string | null;
  packs?: PrepackConfiguration[];
  createdAt: string;
  updatedAt: string;
}

export default function VendorConfiguration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPrepacks, setFilterPrepacks] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<VendorConfiguration | null>(null);
  const [deletingVendor, setDeletingVendor] = useState<string | null>(null);
  const [detectingVendor, setDetectingVendor] = useState<string | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  // Style & Pack state
  const [filterVendorStyles, setFilterVendorStyles] = useState<string>("all");
  const [isAddStyleDialogOpen, setIsAddStyleDialogOpen] = useState(false);
  const [editingStyle, setEditingStyle] = useState<StyleConfiguration | null>(null);
  const [deletingStyle, setDeletingStyle] = useState<number | null>(null);
  const [isAddPackDialogOpen, setIsAddPackDialogOpen] = useState(false);
  const [packDialogStyleId, setPackDialogStyleId] = useState<number | null>(null);
  const [packDialogStyleNumber, setPackDialogStyleNumber] = useState<string>("");
  const [packDialogVendorName, setPackDialogVendorName] = useState<string>("");
  const [packDialogDefaultColors, setPackDialogDefaultColors] = useState<string[] | null>(null);
  const [editingPack, setEditingPack] = useState<PrepackConfiguration | null>(null);
  const [duplicatingPack, setDuplicatingPack] = useState<PrepackConfiguration | null>(null);
  const [deletingPack, setDeletingPack] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    vendorName: "",
    usesPrepacks: false,
    minOrderQty: "",
    minOrderValue: "",
    defaultSizeType: "",
    notes: "",
  });


  // Fetch vendors
  const { data: vendorsData, isLoading } = useQuery<{
    vendors: VendorConfiguration[];
    total: number;
  }>({
    queryKey: ["/api/vendor-configurations", {
      usesPrepacks: filterPrepacks === "all" ? undefined : filterPrepacks === "true"
    }],
  });

  // Create vendor mutation
  const createVendorMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/vendor-configurations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create vendor");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-configurations"] });
      setIsAddDialogOpen(false);
      resetForm();
      toast({
        title: "Vendor created",
        description: "Vendor configuration has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update vendor mutation
  const updateVendorMutation = useMutation({
    mutationFn: async ({ vendorName, data }: { vendorName: string; data: any }) => {
      const response = await fetch(`/api/vendor-configurations/${encodeURIComponent(vendorName)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update vendor");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-configurations"] });
      setEditingVendor(null);
      resetForm();
      toast({
        title: "Vendor updated",
        description: "Vendor configuration has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete vendor mutation
  const deleteVendorMutation = useMutation({
    mutationFn: async (vendorName: string) => {
      const response = await fetch(`/api/vendor-configurations/${encodeURIComponent(vendorName)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete vendor");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-configurations"] });
      setDeletingVendor(null);
      toast({
        title: "Vendor deleted",
        description: "Vendor configuration has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // CSV Import mutation
  const importVendorsMutation = useMutation({
    mutationFn: async (vendors: any[]) => {
      const response = await fetch("/api/vendor-configurations/import/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ vendors }),
      });
      if (!response.ok) throw new Error("Failed to import vendors");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor-configurations"] });
      setIsImportDialogOpen(false);
      setImportFile(null);
      toast({
        title: "Import complete",
        description: `Created: ${data.created}, Updated: ${data.updated}, Failed: ${data.failed}`,
        duration: 5000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch styles with packs
  const { data: stylesData, isLoading: isLoadingStyles } = useQuery<StyleConfiguration[]>({
    queryKey: ["/api/style-configurations", {
      vendorName: filterVendorStyles === "all" ? undefined : filterVendorStyles
    }],
  });
  // Note: Backend now returns StyleWithPacks[] with packs array populated

  // Create style mutation
  const createStyleMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/style-configurations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create style");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/style-configurations"] });
      setIsAddStyleDialogOpen(false);
      setEditingStyle(null);
      toast({
        title: "Style created",
        description: "Style configuration has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update style mutation
  const updateStyleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await fetch(`/api/style-configurations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update style");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/style-configurations"] });
      setIsAddStyleDialogOpen(false);
      setEditingStyle(null);
      toast({
        title: "Style updated",
        description: "Style configuration has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete style mutation
  const deleteStyleMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/style-configurations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete style");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/style-configurations"] });
      setDeletingStyle(null);
      toast({
        title: "Style deleted",
        description: "Style configuration and all its packs have been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create pack mutation
  const createPackMutation = useMutation({
    mutationFn: async (data: any) => {
      // Convert frontend format to backend format
      const payload = {
        prepack: data.config,
        distributions: data.sizeDistributions
      };
      const response = await fetch("/api/prepack-configurations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create pack");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/style-configurations"] });
      setIsAddPackDialogOpen(false);
      setEditingPack(null);
      setDuplicatingPack(null);
      toast({
        title: "Pack created",
        description: "Pack configuration has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update pack mutation
  const updatePackMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const payload = {
        prepack: data.config,
        distributions: data.sizeDistributions
      };
      const response = await fetch(`/api/prepack-configurations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update pack");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/style-configurations"] });
      setIsAddPackDialogOpen(false);
      setEditingPack(null);
      toast({
        title: "Pack updated",
        description: "Pack configuration has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete pack mutation
  const deletePackMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/prepack-configurations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete pack");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/style-configurations"] });
      setDeletingPack(null);
      toast({
        title: "Pack deleted",
        description: "Pack configuration has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle CSV file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
    }
  };

  // Parse and import CSV
  const handleImportCSV = async () => {
    if (!importFile) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        toast({
          title: "Error",
          description: "CSV file is empty or invalid",
          variant: "destructive",
        });
        return;
      }

      // Parse CSV manually (simple CSV parser)
      const headers = lines[0].split(',').map(h => h.trim());
      const vendors = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const vendor: any = {};

        headers.forEach((header, index) => {
          const key = header.replace(/['"]/g, '');
          const value = values[index]?.replace(/['"]/g, '');

          if (key === 'vendorName') vendor.vendorName = value;
          else if (key === 'usesPrepacks') vendor.usesPrepacks = value;
          else if (key === 'minOrderQty') vendor.minOrderQty = value ? parseInt(value) : null;
          else if (key === 'minOrderValue') vendor.minOrderValue = value || null;
          else if (key === 'defaultSizeType') vendor.defaultSizeType = value || null;
          else if (key === 'notes') vendor.notes = value || null;
        });

        if (vendor.vendorName) {
          vendors.push(vendor);
        }
      }

      if (vendors.length === 0) {
        toast({
          title: "Error",
          description: "No valid vendors found in CSV",
          variant: "destructive",
        });
        return;
      }

      importVendorsMutation.mutate(vendors);
    };

    reader.readAsText(importFile);
  };

  // Download CSV template
  const downloadCSVTemplate = () => {
    const template = `vendorName,usesPrepacks,minOrderQty,minOrderValue,defaultSizeType,notes
"Sample Vendor",true,12,300.00,jeans,"Sample vendor for testing"
"Another Vendor",false,,,apparel,"Open stock vendor"`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vendor-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Auto-detect size type
  const detectSizeType = async (vendorName: string) => {
    setDetectingVendor(vendorName);
    try {
      const response = await fetch(
        `/api/vendor-configurations/${encodeURIComponent(vendorName)}/detect-size-type?autoUpdate=true`,
        {
          method: "POST",
          credentials: "include",
        }
      );
      if (!response.ok) throw new Error("Failed to detect size type");

      const result: SizeTypeDetectionResult = await response.json();

      queryClient.invalidateQueries({ queryKey: ["/api/vendor-configurations"] });

      toast({
        title: "Size type detected",
        description: `${result.detectedType} (${(result.confidence * 100).toFixed(1)}% confidence) - ${result.explanation}`,
        duration: 5000,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to detect size type",
        variant: "destructive",
      });
    } finally {
      setDetectingVendor(null);
    }
  };

  // Form handlers
  const resetForm = () => {
    setFormData({
      vendorName: "",
      usesPrepacks: false,
      minOrderQty: "",
      minOrderValue: "",
      defaultSizeType: "",
      notes: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const submitData = {
      vendorName: formData.vendorName,
      usesPrepacks: formData.usesPrepacks,
      minOrderQty: formData.minOrderQty ? parseInt(formData.minOrderQty) : null,
      minOrderValue: formData.minOrderValue || null,
      defaultSizeType: formData.defaultSizeType || null,
      notes: formData.notes || null,
    };

    if (editingVendor) {
      updateVendorMutation.mutate({
        vendorName: editingVendor.vendorName,
        data: submitData
      });
    } else {
      createVendorMutation.mutate(submitData);
    }
  };

  const handleEdit = (vendor: VendorConfiguration) => {
    setEditingVendor(vendor);
    setFormData({
      vendorName: vendor.vendorName,
      usesPrepacks: vendor.usesPrepacks,
      minOrderQty: vendor.minOrderQty?.toString() || "",
      minOrderValue: vendor.minOrderValue || "",
      defaultSizeType: vendor.defaultSizeType || "",
      notes: vendor.notes || "",
    });
  };

  const handleCloseDialog = (open: boolean) => {
    if (open) {
      setIsAddDialogOpen(true);
    } else {
      setIsAddDialogOpen(false);
      setEditingVendor(null);
      resetForm();
    }
  };

  // Style handlers
  const handleStyleSubmit = (data: any) => {
    if (editingStyle) {
      updateStyleMutation.mutate({ id: editingStyle.id, data });
    } else {
      createStyleMutation.mutate(data);
    }
  };

  const handleEditStyle = (style: StyleConfiguration) => {
    setEditingStyle(style);
    setIsAddStyleDialogOpen(true);
  };

  const handleDeleteStyle = (styleId: number) => {
    setDeletingStyle(styleId);
  };

  // Pack handlers
  const handleAddPackToStyle = (styleId: number, styleNumber: string) => {
    const style = stylesData?.find(s => s.id === styleId);
    setPackDialogStyleId(styleId);
    setPackDialogStyleNumber(styleNumber);
    setPackDialogVendorName(style?.vendorName || "");
    setPackDialogDefaultColors(style?.defaultColors || null);
    setEditingPack(null);
    setDuplicatingPack(null);
    setIsAddPackDialogOpen(true);
  };

  const handlePackSubmit = (data: any) => {
    if (editingPack) {
      updatePackMutation.mutate({ id: editingPack.id, data });
    } else {
      createPackMutation.mutate(data);
    }
  };

  const handleEditPack = (pack: PrepackConfiguration) => {
    const style = stylesData?.find(s => s.id === pack.styleConfigId);
    setPackDialogStyleId(pack.styleConfigId);
    setPackDialogStyleNumber(style?.styleNumber || "");
    setPackDialogVendorName(style?.vendorName || "");
    setPackDialogDefaultColors(style?.defaultColors || null);
    setEditingPack(pack);
    setDuplicatingPack(null);
    setIsAddPackDialogOpen(true);
  };

  const handleDuplicatePack = (pack: PrepackConfiguration) => {
    const style = stylesData?.find(s => s.id === pack.styleConfigId);
    setPackDialogStyleId(pack.styleConfigId);
    setPackDialogStyleNumber(style?.styleNumber || "");
    setPackDialogVendorName(style?.vendorName || "");
    setPackDialogDefaultColors(style?.defaultColors || null);
    setDuplicatingPack(pack);
    setEditingPack(pack);
    setIsAddPackDialogOpen(true);
  };

  const handleDeletePack = (packId: number) => {
    setDeletingPack(packId);
  };

  // Filter vendors
  const filteredVendors = vendorsData?.vendors.filter(vendor => {
    const matchesSearch = vendor.vendorName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }) || [];

  const getConfidenceBadge = (confidence: string | null, autoDetected: boolean) => {
    if (!confidence || !autoDetected) return null;

    const conf = parseFloat(confidence);
    if (conf >= 0.7) {
      return <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" /> High</Badge>;
    } else if (conf >= 0.4) {
      return <Badge variant="secondary" className="gap-1"><AlertCircle className="h-3 w-3" /> Medium</Badge>;
    } else {
      return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Low</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vendor Configuration</h1>
          <p className="text-muted-foreground mt-1">
            Manage vendor prepack settings and size types
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadCSVTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Template
          </Button>
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Vendors from CSV</DialogTitle>
                <DialogDescription>
                  Upload a CSV file to bulk import or update vendor configurations.
                  Download the template to see the required format.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="csv-file">CSV File</Label>
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                  />
                  {importFile && (
                    <p className="text-sm text-muted-foreground">
                      Selected: {importFile.name}
                    </p>
                  )}
                </div>
                <div className="rounded-lg border bg-muted/50 p-4">
                  <h4 className="font-medium mb-2">CSV Format</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Required: vendorName</li>
                    <li>• Optional: usesPrepacks, minOrderQty, minOrderValue, defaultSizeType, notes</li>
                    <li>• Existing vendors will be updated</li>
                    <li>• New vendors will be created</li>
                  </ul>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsImportDialogOpen(false);
                    setImportFile(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleImportCSV}
                  disabled={!importFile || importVendorsMutation.isPending}
                >
                  {importVendorsMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Import
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={isAddDialogOpen || !!editingVendor} onOpenChange={handleCloseDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Vendor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingVendor ? "Edit Vendor" : "Add New Vendor"}</DialogTitle>
                  <DialogDescription>
                    Configure vendor prepack settings and ordering requirements.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="vendorName">Vendor Name *</Label>
                    <Input
                      id="vendorName"
                      value={formData.vendorName}
                      onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                      placeholder="e.g., Argonaut Nations"
                      required
                      disabled={!!editingVendor}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Vendor Type *</Label>
                    <p className="text-sm text-muted-foreground">Choose how you order inventory from this vendor</p>
                    <RadioGroup
                      value={formData.usesPrepacks ? "prepack" : "openstock"}
                      onValueChange={(value) => setFormData({ ...formData, usesPrepacks: value === "prepack" })}
                      className="space-y-3"
                    >
                      <div className="flex items-start space-x-3 border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                        <RadioGroupItem value="prepack" id="prepack" className="mt-1" />
                        <div className="flex-1 space-y-2">
                          <Label htmlFor="prepack" className="flex items-center gap-2 text-base font-medium cursor-pointer">
                            <Package className="h-4 w-4" />
                            Prepack Vendor
                          </Label>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            Orders come in pre-packed boxes with fixed size distributions (e.g., Pack A, Pack B).
                            Each box contains a specific mix of sizes in <span className="font-medium text-foreground">ONE color</span>.
                          </p>
                          <p className="text-xs text-muted-foreground italic">
                            Example: Argonaut Nations - Pack A has 12 jeans (4× 30W, 2× 32W, 2× 34W, etc.)
                          </p>
                          {formData.usesPrepacks && (
                            <Alert className="mt-2">
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                After saving, configure packs in the Prepack Configurations section below
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </div>
                      <div className="flex items-start space-x-3 border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                        <RadioGroupItem value="openstock" id="openstock" className="mt-1" />
                        <div className="flex-1 space-y-2">
                          <Label htmlFor="openstock" className="flex items-center gap-2 text-base font-medium cursor-pointer">
                            <Box className="h-4 w-4" />
                            Open Stock Vendor
                          </Label>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            Can order any quantity of any size and color combination. No pre-packed boxes.
                          </p>
                          <p className="text-xs text-muted-foreground italic">
                            Example: Ethika - Order 5 Small, 10 Medium, 3 Large in any color mix as needed
                          </p>
                          {!formData.usesPrepacks && (
                            <Alert className="mt-2 border-green-200 bg-green-50 text-green-900">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <AlertDescription>
                                No pack configuration needed for this vendor type
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="minOrderQty">
                        {formData.usesPrepacks ? "Minimum Order (prepacks)" : "Minimum Order (units)"}
                      </Label>
                      <Input
                        id="minOrderQty"
                        type="number"
                        value={formData.minOrderQty}
                        onChange={(e) => setFormData({ ...formData, minOrderQty: e.target.value })}
                        placeholder={formData.usesPrepacks ? "e.g., 1" : "e.g., 6"}
                      />
                      <p className="text-xs text-muted-foreground">
                        {formData.usesPrepacks
                          ? "Minimum is typically 1 prepack (regardless of box count)"
                          : "Minimum is usually 6 units"}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minOrderValue">Min Order Value ($)</Label>
                      <Input
                        id="minOrderValue"
                        type="number"
                        step="0.01"
                        value={formData.minOrderValue}
                        onChange={(e) => setFormData({ ...formData, minOrderValue: e.target.value })}
                        placeholder="e.g., 300.00"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="defaultSizeType">Default Size Type</Label>
                    <Select
                      value={formData.defaultSizeType}
                      onValueChange={(value) => setFormData({ ...formData, defaultSizeType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select size type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="jeans">Jeans (30W×32L)</SelectItem>
                        <SelectItem value="apparel">Apparel (S/M/L/XL)</SelectItem>
                        <SelectItem value="shoes">Shoes (8, 8.5, 9)</SelectItem>
                        <SelectItem value="numeric">Numeric (24, 28, 32)</SelectItem>
                        <SelectItem value="onesize">One Size</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional vendor information..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleCloseDialog}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createVendorMutation.isPending || updateVendorMutation.isPending}>
                    {(createVendorMutation.isPending || updateVendorMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingVendor ? "Update" : "Create"} Vendor
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vendors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterPrepacks} onValueChange={setFilterPrepacks}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                <SelectItem value="true">Prepack Only</SelectItem>
                <SelectItem value="false">Open Stock Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vendors Table */}
      <Card>
        <CardHeader>
          <CardTitle>Vendors ({filteredVendors.length})</CardTitle>
          <CardDescription>
            Configure vendor prepack settings and manage size type detection
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredVendors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No vendors found. Add your first vendor to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor Name</TableHead>
                  <TableHead>Packaging Type</TableHead>
                  <TableHead>Size Type</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Min Order</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVendors.map((vendor) => (
                  <TableRow key={vendor.id}>
                    <TableCell className="font-medium">{vendor.vendorName}</TableCell>
                    <TableCell>
                      {vendor.usesPrepacks ? (
                        <Badge className="gap-1">
                          <Package className="h-3 w-3" />
                          PREPACK
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <Box className="h-3 w-3" />
                          OPEN STOCK
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {vendor.defaultSizeType ? (
                        <Badge variant="secondary">{vendor.defaultSizeType}</Badge>
                      ) : (
                        <span className="text-muted-foreground">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {getConfidenceBadge(vendor.sizeTypeConfidence, vendor.sizeTypeAutoDetected)}
                    </TableCell>
                    <TableCell>
                      {vendor.minOrderQty && `${vendor.minOrderQty} ${vendor.usesPrepacks ? (vendor.minOrderQty === 1 ? 'pack' : 'packs') : 'units'}`}
                      {vendor.minOrderValue && ` / $${vendor.minOrderValue}`}
                      {!vendor.minOrderQty && !vendor.minOrderValue && (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => detectSizeType(vendor.vendorName)}
                        disabled={detectingVendor === vendor.vendorName}
                      >
                        {detectingVendor === vendor.vendorName ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(vendor)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeletingVendor(vendor.vendorName)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Vendor Confirmation Dialog */}
      <AlertDialog open={!!deletingVendor} onOpenChange={() => setDeletingVendor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vendor Configuration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the configuration for "{deletingVendor}"?
              This will also delete all associated prepack configurations. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingVendor && deleteVendorMutation.mutate(deletingVendor)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Style Configurations Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Style Configurations</CardTitle>
              <CardDescription>
                Configure styles and their prepack variations
              </CardDescription>
            </div>
            <Button
              onClick={() => {
                setEditingStyle(null);
                setIsAddStyleDialogOpen(true);
              }}
              disabled={!vendorsData?.vendors.some(v => v.usesPrepacks)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Style
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Select value={filterVendorStyles} onValueChange={setFilterVendorStyles}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Filter by vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {vendorsData?.vendors.filter(v => v.usesPrepacks).map(vendor => (
                  <SelectItem key={vendor.id} value={vendor.vendorName}>
                    {vendor.vendorName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoadingStyles ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !stylesData || stylesData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No style configurations found. Add your first style to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {stylesData.map((style) => (
                <StyleCard
                  key={style.id}
                  style={style}
                  onEditStyle={handleEditStyle}
                  onDeleteStyle={handleDeleteStyle}
                  onAddPack={handleAddPackToStyle}
                  onEditPack={handleEditPack}
                  onDuplicatePack={handleDuplicatePack}
                  onDeletePack={handleDeletePack}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Style Dialog */}
      <StyleDialog
        open={isAddStyleDialogOpen || !!editingStyle}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddStyleDialogOpen(false);
            setEditingStyle(null);
          }
        }}
        vendors={vendorsData?.vendors || []}
        editingStyle={editingStyle}
        onSubmit={handleStyleSubmit}
        isSubmitting={createStyleMutation.isPending || updateStyleMutation.isPending}
      />

      {/* Pack Dialog */}
      <PackDialog
        open={isAddPackDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddPackDialogOpen(false);
            setEditingPack(null);
            setDuplicatingPack(null);
          }
        }}
        styleId={packDialogStyleId || 0}
        styleNumber={packDialogStyleNumber}
        vendorName={packDialogVendorName}
        styleDefaultColors={packDialogDefaultColors}
        editingPack={editingPack}
        isDuplicating={!!duplicatingPack}
        onSubmit={handlePackSubmit}
        isSubmitting={createPackMutation.isPending || updatePackMutation.isPending}
      />

      {/* Delete Style Confirmation Dialog */}
      <AlertDialog open={!!deletingStyle} onOpenChange={() => setDeletingStyle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Style Configuration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this style configuration?
              This will also delete all associated packs and size distributions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingStyle && deleteStyleMutation.mutate(deletingStyle)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Pack Confirmation Dialog */}
      <AlertDialog open={!!deletingPack} onOpenChange={() => setDeletingPack(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Pack Configuration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this pack configuration?
              This will also delete all associated size distributions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingPack && deletePackMutation.mutate(deletingPack)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

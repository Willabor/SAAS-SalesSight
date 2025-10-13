import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/app-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle, Save, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface InventorySettings {
  id: number;
  salesAnalysisPeriodDays: number;
  restockUrgencyThresholdDays: number;
  overstockThresholdDays: number;
  understockThresholdDays: number;
  transferMinStockLevel: number;
  transferTargetDaysSupply: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
}

const SETTING_INFO = {
  salesAnalysisPeriodDays: {
    label: "Sales Analysis Period",
    description: "Number of days of sales history to analyze for demand calculations, ML training, and restocking recommendations. This affects all inventory analysis features.",
    unit: "days"
  },
  restockUrgencyThresholdDays: {
    label: "Restock Urgency Threshold",
    description: "Items with less than this many days of supply will appear in Restocking Recommendations. Lower values = only critical items shown.",
    unit: "days"
  },
  overstockThresholdDays: {
    label: "Overstock Threshold",
    description: "Items with more than this many days of supply are considered overstocked and may appear in sales recommendations.",
    unit: "days"
  },
  understockThresholdDays: {
    label: "Understock Threshold",
    description: "Items with fewer than this many days of supply are flagged as understocked if they have recent sales activity.",
    unit: "days"
  },
  transferMinStockLevel: {
    label: "Transfer Minimum Stock",
    description: "Minimum quantity required at source location before suggesting a transfer to another store.",
    unit: "units"
  },
  transferTargetDaysSupply: {
    label: "Transfer Target Supply",
    description: "Target number of days of supply to maintain when calculating transfer quantities between stores.",
    unit: "days"
  }
};

export default function InventorySettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery<InventorySettings>({
    queryKey: ["/api/inventory-settings"],
  });

  const [formData, setFormData] = useState<Partial<InventorySettings>>({});

  // Update form when data loads
  useState(() => {
    if (settings && Object.keys(formData).length === 0) {
      setFormData(settings);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<InventorySettings>) => {
      const res = await fetch("/api/inventory-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory-settings"] });
      toast({
        title: "Settings Updated",
        description: "Inventory settings have been saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleChange = (key: keyof InventorySettings, value: string) => {
    setFormData(prev => ({
      ...prev,
      [key]: parseInt(value) || 0
    }));
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleReset = () => {
    if (settings) {
      setFormData(settings);
      toast({
        title: "Reset",
        description: "Form reset to current saved values.",
      });
    }
  };

  if (isLoading || !settings) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto p-6">
          <div className="text-center py-12 text-muted-foreground">Loading settings...</div>
        </main>
      </div>
    );
  }

  const hasChanges = JSON.stringify(formData) !== JSON.stringify(settings);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Inventory Settings</h1>
            <p className="text-muted-foreground mt-2">
              Configure global parameters for inventory analysis and recommendations
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Analysis Parameters</CardTitle>
            <CardDescription>
              These settings control how inventory data is analyzed across all features
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <TooltipProvider>
              {(Object.keys(SETTING_INFO) as Array<keyof typeof SETTING_INFO>).map((key) => (
                <div key={key} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={key} className="text-base">
                      {SETTING_INFO[key].label}
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>{SETTING_INFO[key].description}</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      id={key}
                      type="number"
                      min="1"
                      value={formData[key] || 0}
                      onChange={(e) => handleChange(key, e.target.value)}
                      className="max-w-[200px]"
                    />
                    <span className="text-sm text-muted-foreground">
                      {SETTING_INFO[key].unit}
                    </span>
                  </div>
                </div>
              ))}
            </TooltipProvider>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={handleSave}
                disabled={!hasChanges || updateMutation.isPending}
              >
                <Save className="mr-2 h-4 w-4" />
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={!hasChanges}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset
              </Button>
            </div>

            <div className="text-sm text-muted-foreground pt-4 border-t">
              <p>Last updated: {new Date(settings.updatedAt).toLocaleString()}</p>
              {settings.updatedBy && <p>Updated by: {settings.updatedBy}</p>}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

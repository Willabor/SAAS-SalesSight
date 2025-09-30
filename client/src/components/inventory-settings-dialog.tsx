import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  InventorySettings,
  DEFAULT_SETTINGS,
  validateSettings,
} from "@/lib/inventory-settings";

interface InventorySettingsDialogProps {
  settings: InventorySettings;
  onSave: (settings: InventorySettings) => void;
  onReset: () => void;
}

export function InventorySettingsDialog({
  settings,
  onSave,
  onReset,
}: InventorySettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<InventorySettings>(settings);
  const [errors, setErrors] = useState<string[]>([]);

  const handleChange = (field: keyof InventorySettings, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      setFormData((prev) => ({ ...prev, [field]: numValue }));
      setErrors([]);
    }
  };

  const handleSave = () => {
    const validationErrors = validateSettings(formData);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    onSave(formData);
    setOpen(false);
    setErrors([]);
  };

  const handleReset = () => {
    setFormData(DEFAULT_SETTINGS);
    onReset();
    setErrors([]);
  };

  const handleCancel = () => {
    setFormData(settings);
    setOpen(false);
    setErrors([]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="w-4 h-4" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Inventory Turnover Settings</DialogTitle>
          <DialogDescription>
            Configure thresholds and limits for inventory analysis
          </DialogDescription>
        </DialogHeader>

        {errors.length > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              <ul className="list-disc list-inside">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6 py-4">
          {/* Display & Export Limits */}
          <div>
            <h3 className="font-semibold mb-3">Display & Export Limits</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="slowMovingLimit">
                  Slow Moving Items Limit
                </Label>
                <Input
                  id="slowMovingLimit"
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.slowMovingLimit}
                  onChange={(e) =>
                    handleChange("slowMovingLimit", e.target.value)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Max items to display/export (1-1000)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stockAnalysisLimit">
                  Stock Analysis Limit
                </Label>
                <Input
                  id="stockAnalysisLimit"
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.stockAnalysisLimit}
                  onChange={(e) =>
                    handleChange("stockAnalysisLimit", e.target.value)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Max items to display/export (1-1000)
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Dead Stock Thresholds */}
          <div>
            <h3 className="font-semibold mb-3">Dead Stock Thresholds</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deadStockDays">Dead Stock Days</Label>
                <Input
                  id="deadStockDays"
                  type="number"
                  min="1"
                  max="365"
                  value={formData.deadStockDays}
                  onChange={(e) => handleChange("deadStockDays", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  No sales in X days = "Dead Stock" (1-365)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slowMovingDays">Slow Moving Days</Label>
                <Input
                  id="slowMovingDays"
                  type="number"
                  min="1"
                  max="365"
                  value={formData.slowMovingDays}
                  onChange={(e) =>
                    handleChange("slowMovingDays", e.target.value)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  No sales in X days = "Slow Moving" (1-365)
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Stock Analysis Thresholds */}
          <div>
            <h3 className="font-semibold mb-3">Stock Analysis Settings</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salesAnalysisDays">Sales Analysis Period</Label>
                <Input
                  id="salesAnalysisDays"
                  type="number"
                  min="1"
                  max="365"
                  value={formData.salesAnalysisDays}
                  onChange={(e) =>
                    handleChange("salesAnalysisDays", e.target.value)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Days of sales data (1-365)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="overstockDays">Overstock Threshold</Label>
                <Input
                  id="overstockDays"
                  type="number"
                  min="1"
                  max="365"
                  value={formData.overstockDays}
                  onChange={(e) => handleChange("overstockDays", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Days of supply (1-365)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="understockDays">Understock Threshold</Label>
                <Input
                  id="understockDays"
                  type="number"
                  min="1"
                  max="90"
                  value={formData.understockDays}
                  onChange={(e) =>
                    handleChange("understockDays", e.target.value)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Days of supply (1-90)
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Category Analysis */}
          <div>
            <h3 className="font-semibold mb-3">Category Analysis</h3>
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="categoryAnalysisDays">Analysis Period</Label>
              <Input
                id="categoryAnalysisDays"
                type="number"
                min="1"
                max="365"
                value={formData.categoryAnalysisDays}
                onChange={(e) =>
                  handleChange("categoryAnalysisDays", e.target.value)
                }
              />
              <p className="text-xs text-muted-foreground">
                Days for turnover calculation (1-365)
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleReset}>
            Reset to Defaults
          </Button>
          <Button variant="ghost" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

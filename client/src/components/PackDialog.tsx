/**
 * PackDialog Component
 * Dialog for adding or editing prepack configurations within a style
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, Trash2, X, Calculator, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { PrepackConfiguration, PrepackSizeDistribution } from "@shared/schema";

interface PrepackWithDistributions extends PrepackConfiguration {
  distributions: PrepackSizeDistribution[];
}

interface PackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  styleId: number;
  styleNumber: string;
  vendorName: string;
  styleDefaultColors?: string[] | null;
  editingPack?: PrepackWithDistributions | null;
  isDuplicating?: boolean;
  onSubmit: (data: {
    config: {
      styleConfigId: number;
      prepackName: string;
      piecesPerBox: number;
      costPerBox: string;
      availableColors: string[];
      description: string;
    };
    sizeDistributions: Array<{
      sizeValue: string;
      quantity: number;
    }>;
  }) => void;
  isSubmitting: boolean;
}

export function PackDialog({
  open,
  onOpenChange,
  styleId,
  styleNumber,
  vendorName,
  styleDefaultColors,
  editingPack,
  isDuplicating = false,
  onSubmit,
  isSubmitting,
}: PackDialogProps) {
  const [formData, setFormData] = useState({
    prepackName: "",
    piecesPerBox: "",
    costPerBox: "",
    availableColors: [] as string[],
    description: "",
  });
  const [sizeDistributions, setSizeDistributions] = useState<Array<{
    sizeValue: string;
    quantity: string;
  }>>([{ sizeValue: "", quantity: "" }]);
  const [newColorInput, setNewColorInput] = useState("");
  const [isCalculatingCost, setIsCalculatingCost] = useState(false);
  const [isLoadingColors, setIsLoadingColors] = useState(false);
  const [calculatedCost, setCalculatedCost] = useState<{
    totalCost: string;
    averageCostPerUnit: string;
    sizeBreakdown: Array<{
      sizeValue: string;
      quantity: number;
      averageCost: string;
      subtotal: string;
      itemsFound: number;
    }>;
    totalItemsFound: number;
    totalItemsExpected: number;
  } | null>(null);

  // Update form when editing pack changes
  useEffect(() => {
    if (editingPack) {
      setFormData({
        prepackName: isDuplicating ? `${editingPack.prepackName} (Copy)` : editingPack.prepackName,
        piecesPerBox: editingPack.piecesPerBox.toString(),
        costPerBox: editingPack.costPerBox || "",
        availableColors: editingPack.availableColors || [],
        description: editingPack.description || "",
      });
      setSizeDistributions(
        editingPack.distributions.map((dist) => ({
          sizeValue: dist.sizeValue,
          quantity: dist.quantity.toString(),
        }))
      );
    } else if (open) {
      // Reset form when opening for new pack
      setFormData({
        prepackName: "",
        piecesPerBox: "",
        costPerBox: "",
        availableColors: styleDefaultColors || [],
        description: "",
      });
      setSizeDistributions([{ sizeValue: "", quantity: "" }]);
    }
  }, [editingPack, isDuplicating, open, styleDefaultColors]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate size distributions
    const totalQuantity = sizeDistributions.reduce((sum, dist) => {
      const qty = parseInt(dist.quantity) || 0;
      return sum + qty;
    }, 0);

    const piecesPerBox = parseInt(formData.piecesPerBox) || 0;

    if (totalQuantity !== piecesPerBox) {
      alert(
        `Size quantities (${totalQuantity}) must equal pieces per box (${piecesPerBox})`
      );
      return;
    }

    // Prepare size distributions
    const distributions = sizeDistributions
      .filter((dist) => dist.sizeValue && dist.quantity)
      .map((dist) => ({
        sizeValue: dist.sizeValue,
        quantity: parseInt(dist.quantity),
      }));

    if (distributions.length === 0) {
      alert("At least one size distribution is required");
      return;
    }

    onSubmit({
      config: {
        styleConfigId: styleId,
        prepackName: formData.prepackName,
        piecesPerBox: piecesPerBox,
        costPerBox: formData.costPerBox || "",
        availableColors: formData.availableColors,
        description: formData.description || "",
      },
      sizeDistributions: distributions,
    });
  };

  const addColor = () => {
    const color = newColorInput.trim();
    if (color && !formData.availableColors.includes(color)) {
      setFormData({
        ...formData,
        availableColors: [...formData.availableColors, color],
      });
      setNewColorInput("");
    }
  };

  const removeColor = (color: string) => {
    setFormData({
      ...formData,
      availableColors: formData.availableColors.filter((c) => c !== color),
    });
  };

  const useDefaultColors = async () => {
    // If style has configured default colors, use those
    if (styleDefaultColors && styleDefaultColors.length > 0) {
      setFormData({
        ...formData,
        availableColors: styleDefaultColors,
      });
      return;
    }

    // Otherwise, fetch available colors from inventory
    setIsLoadingColors(true);
    try {
      const response = await fetch(
        `/api/prepack-configurations/available-colors?vendorName=${encodeURIComponent(vendorName)}&styleNumber=${encodeURIComponent(styleNumber)}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch available colors");
      }

      const data = await response.json();

      if (data.colors && data.colors.length > 0) {
        setFormData({
          ...formData,
          availableColors: data.colors,
        });
      } else {
        alert("No colors found in inventory for this style. Please add colors manually.");
      }
    } catch (error) {
      console.error("Error fetching colors from inventory:", error);
      alert(`Failed to load colors from inventory: ${error instanceof Error ? error.message : "Unknown error"}. Please add colors manually.`);
    } finally {
      setIsLoadingColors(false);
    }
  };

  const addSizeRow = () => {
    setSizeDistributions([...sizeDistributions, { sizeValue: "", quantity: "" }]);
  };

  const removeSizeRow = (index: number) => {
    setSizeDistributions(sizeDistributions.filter((_, i) => i !== index));
  };

  const updateSizeDistribution = (
    index: number,
    field: "sizeValue" | "quantity",
    value: string
  ) => {
    const updated = [...sizeDistributions];
    updated[index][field] = value;
    setSizeDistributions(updated);
  };

  const getTotalQuantity = () => {
    return sizeDistributions.reduce((sum, dist) => {
      const qty = parseInt(dist.quantity) || 0;
      return sum + qty;
    }, 0);
  };

  const calculateCost = async () => {
    // Validate that we have size distributions
    const distributions = sizeDistributions
      .filter((dist) => dist.sizeValue && dist.quantity)
      .map((dist) => ({
        sizeValue: dist.sizeValue,
        quantity: parseInt(dist.quantity),
      }));

    if (distributions.length === 0) {
      alert("Please add at least one size distribution first");
      return;
    }

    setIsCalculatingCost(true);
    setCalculatedCost(null);

    try {
      const response = await fetch("/api/prepack-configurations/calculate-cost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          vendorName,
          styleNumber,
          sizeDistributions: distributions,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "Failed to calculate cost");
      }

      const result = await response.json();
      console.log("Cost calculation result:", result);

      setCalculatedCost(result);

      // Auto-fill the cost per box field with the calculated cost
      setFormData({
        ...formData,
        costPerBox: result.totalCost,
      });
    } catch (error) {
      console.error("Error calculating cost:", error);
      alert(`Failed to calculate cost from inventory: ${error instanceof Error ? error.message : "Unknown error"}. Please enter manually.`);
    } finally {
      setIsCalculatingCost(false);
    }
  };

  const dialogTitle = editingPack
    ? isDuplicating
      ? `Duplicate Pack from ${editingPack.prepackName}`
      : `Edit ${editingPack.prepackName}`
    : `Add Pack to Style ${styleNumber}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              Configure pack settings, colors, and size distributions for this
              style.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Pack Name and Pieces */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prepackName">Pack Name *</Label>
                <Input
                  id="prepackName"
                  value={formData.prepackName}
                  onChange={(e) =>
                    setFormData({ ...formData, prepackName: e.target.value })
                  }
                  placeholder="e.g., Pack A, Standard Pack"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="piecesPerBox">Pieces per Box *</Label>
                <Input
                  id="piecesPerBox"
                  type="number"
                  value={formData.piecesPerBox}
                  onChange={(e) =>
                    setFormData({ ...formData, piecesPerBox: e.target.value })
                  }
                  placeholder="e.g., 12"
                  required
                  min="1"
                />
              </div>
            </div>

            {/* Cost per Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="costPerBox">Cost per Box ($)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={calculateCost}
                  disabled={isCalculatingCost || sizeDistributions.every(d => !d.sizeValue || !d.quantity)}
                >
                  {isCalculatingCost ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Calculator className="h-4 w-4 mr-1" />
                  )}
                  Calculate from Inventory
                </Button>
              </div>
              <Input
                id="costPerBox"
                type="number"
                step="0.01"
                value={formData.costPerBox}
                onChange={(e) =>
                  setFormData({ ...formData, costPerBox: e.target.value })
                }
                placeholder="e.g., 300.00"
              />

              {/* Cost Breakdown Display */}
              {calculatedCost && (
                <Alert className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      <div className="font-semibold">
                        Calculated Total: ${calculatedCost.totalCost}
                        <span className="text-muted-foreground text-xs ml-2">
                          (${calculatedCost.averageCostPerUnit} per unit)
                        </span>
                      </div>
                      <div className="text-xs">
                        <div className="font-medium mb-1">Size Breakdown:</div>
                        <div className="space-y-1">
                          {calculatedCost.sizeBreakdown.map((size, idx) => (
                            <div key={idx} className="flex justify-between text-muted-foreground">
                              <span>
                                {size.sizeValue} ({size.quantity}× @ ${size.averageCost})
                              </span>
                              <span>${size.subtotal}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      {calculatedCost.totalItemsFound < calculatedCost.totalItemsExpected && (
                        <div className="text-xs text-amber-600">
                          ⚠️ Only {calculatedCost.totalItemsFound} of {calculatedCost.totalItemsExpected} sizes found in inventory
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Available Colors */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Available Colors</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={useDefaultColors}
                  disabled={isLoadingColors}
                >
                  {isLoadingColors ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Loading...
                    </>
                  ) : styleDefaultColors && styleDefaultColors.length > 0 ? (
                    `Use Style Defaults (${styleDefaultColors.length} colors)`
                  ) : (
                    "Use Colors from Inventory"
                  )}
                </Button>
              </div>

              {/* Display Colors */}
              {formData.availableColors.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 border rounded-lg">
                  {formData.availableColors.map((color) => (
                    <Badge key={color} variant="secondary" className="gap-1">
                      {color}
                      <button
                        type="button"
                        onClick={() => removeColor(color)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Add Color Input */}
              <div className="flex gap-2">
                <Input
                  value={newColorInput}
                  onChange={(e) => setNewColorInput(e.target.value)}
                  placeholder="Enter color name"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addColor();
                    }
                  }}
                />
                <Button type="button" onClick={addColor} variant="outline">
                  Add
                </Button>
              </div>
            </div>

            {/* Size Distribution */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Size Distribution *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSizeRow}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Size
                </Button>
              </div>
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Size Value</TableHead>
                      <TableHead className="w-[25%]">Quantity</TableHead>
                      <TableHead className="w-[25%]">Percentage</TableHead>
                      <TableHead className="w-[10%]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sizeDistributions.map((dist, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Input
                            value={dist.sizeValue}
                            onChange={(e) =>
                              updateSizeDistribution(
                                index,
                                "sizeValue",
                                e.target.value
                              )
                            }
                            placeholder="e.g., 30W×32L, M, 10"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={dist.quantity}
                            onChange={(e) =>
                              updateSizeDistribution(
                                index,
                                "quantity",
                                e.target.value
                              )
                            }
                            placeholder="0"
                            min="0"
                          />
                        </TableCell>
                        <TableCell>
                          {formData.piecesPerBox && dist.quantity ? (
                            <span className="text-sm text-muted-foreground">
                              {(
                                (parseInt(dist.quantity) /
                                  parseInt(formData.piecesPerBox)) *
                                100
                              ).toFixed(1)}
                              %
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              0%
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {sizeDistributions.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeSizeRow(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div
                className={`text-sm font-medium ${
                  getTotalQuantity() === parseInt(formData.piecesPerBox || "0")
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                Total: {getTotalQuantity()} pieces
                {formData.piecesPerBox && (
                  <span>
                    {getTotalQuantity() === parseInt(formData.piecesPerBox)
                      ? " ✓"
                      : ` (must equal ${formData.piecesPerBox})`}
                  </span>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Additional details about this pack..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !formData.prepackName ||
                !formData.piecesPerBox ||
                sizeDistributions.length === 0
              }
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingPack && !isDuplicating ? "Update" : "Create"} Pack
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

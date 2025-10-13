/**
 * StyleDialog Component
 * Dialog for adding or editing style configurations
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, X } from "lucide-react";
import type { StyleConfiguration } from "@shared/schema";

interface StyleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendors: Array<{ vendorName: string; usesPrepacks: boolean }>;
  editingStyle?: StyleConfiguration | null;
  onSubmit: (data: {
    vendorName: string;
    styleNumber: string;
    sizeType: string;
    defaultColors: string[];
    description: string;
  }) => void;
  isSubmitting: boolean;
}

export function StyleDialog({
  open,
  onOpenChange,
  vendors,
  editingStyle,
  onSubmit,
  isSubmitting,
}: StyleDialogProps) {
  const [formData, setFormData] = useState({
    vendorName: "",
    styleNumber: "",
    sizeType: "",
    defaultColors: [] as string[],
    description: "",
  });
  const [newColorInput, setNewColorInput] = useState("");

  // Update form when editing style changes
  useEffect(() => {
    if (editingStyle) {
      setFormData({
        vendorName: editingStyle.vendorName,
        styleNumber: editingStyle.styleNumber,
        sizeType: editingStyle.sizeType,
        defaultColors: editingStyle.defaultColors || [],
        description: editingStyle.description || "",
      });
    } else {
      setFormData({
        vendorName: "",
        styleNumber: "",
        sizeType: "",
        defaultColors: [],
        description: "",
      });
    }
  }, [editingStyle]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const addColor = () => {
    const color = newColorInput.trim();
    if (color && !formData.defaultColors.includes(color)) {
      setFormData({
        ...formData,
        defaultColors: [...formData.defaultColors, color],
      });
      setNewColorInput("");
    }
  };

  const removeColor = (color: string) => {
    setFormData({
      ...formData,
      defaultColors: formData.defaultColors.filter((c) => c !== color),
    });
  };

  const prepackVendors = vendors.filter((v) => v.usesPrepacks);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {editingStyle ? "Edit Style" : "Add New Style"}
            </DialogTitle>
            <DialogDescription>
              Configure a style with default colors and settings. Packs can be
              added to this style afterward.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Vendor Selection */}
            <div className="space-y-2">
              <Label htmlFor="vendorName">Vendor *</Label>
              <Select
                value={formData.vendorName}
                onValueChange={(value) =>
                  setFormData({ ...formData, vendorName: value })
                }
                disabled={!!editingStyle} // Can't change vendor when editing
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a prepack vendor" />
                </SelectTrigger>
                <SelectContent>
                  {prepackVendors.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      No prepack vendors found. Create a vendor first.
                    </div>
                  ) : (
                    prepackVendors.map((vendor) => (
                      <SelectItem
                        key={vendor.vendorName}
                        value={vendor.vendorName}
                      >
                        {vendor.vendorName}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Style Number */}
            <div className="space-y-2">
              <Label htmlFor="styleNumber">Style Number *</Label>
              <Input
                id="styleNumber"
                value={formData.styleNumber}
                onChange={(e) =>
                  setFormData({ ...formData, styleNumber: e.target.value })
                }
                placeholder="e.g., 8501B"
                required
                disabled={!!editingStyle} // Can't change style number when editing
              />
              <p className="text-xs text-muted-foreground">
                The style number that identifies this product style
              </p>
            </div>

            {/* Size Type */}
            <div className="space-y-2">
              <Label htmlFor="sizeType">Size Type *</Label>
              <Select
                value={formData.sizeType}
                onValueChange={(value) =>
                  setFormData({ ...formData, sizeType: value })
                }
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

            {/* Default Colors */}
            <div className="space-y-2">
              <Label>Default Colors (optional)</Label>
              <p className="text-xs text-muted-foreground">
                These colors will be suggested when creating new packs for this
                style. Each pack can customize its colors.
              </p>

              {/* Display Colors */}
              {formData.defaultColors.length > 0 && (
                <div className="flex flex-wrap gap-2 p-3 border rounded-lg">
                  {formData.defaultColors.map((color) => (
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
                  placeholder="Enter color name (e.g., Black, Navy)"
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

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Additional details about this style..."
                rows={3}
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
                !formData.vendorName ||
                !formData.styleNumber ||
                !formData.sizeType
              }
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingStyle ? "Update" : "Create"} Style
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

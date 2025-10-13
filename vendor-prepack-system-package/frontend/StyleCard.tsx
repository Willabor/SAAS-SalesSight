/**
 * StyleCard Component
 * Displays a style configuration with all its prepack configurations in a hierarchical, collapsible structure
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ChevronDown,
  ChevronRight,
  Edit,
  Trash2,
  Plus,
  Copy,
  Package,
  Palette,
  Ruler,
} from "lucide-react";

interface SizeDistribution {
  id: number;
  sizeValue: string;
  quantity: number;
  percentage: string | null;
}

interface PrepackConfig {
  id: number;
  styleConfigId: number;
  prepackName: string;
  piecesPerBox: number;
  costPerBox: string | null;
  availableColors: string[] | null;
  description: string | null;
  distributions: SizeDistribution[];
}

interface StyleConfiguration {
  id: number;
  vendorName: string;
  styleNumber: string;
  sizeType: string;
  defaultColors: string[] | null;
  description: string | null;
  packs?: PrepackConfig[];
}

interface StyleCardProps {
  style: StyleConfiguration;
  onEditStyle: (style: StyleConfiguration) => void;
  onDeleteStyle: (styleId: number) => void;
  onAddPack: (styleId: number, styleNumber: string) => void;
  onEditPack: (pack: PrepackConfig) => void;
  onDuplicatePack: (pack: PrepackConfig) => void;
  onDeletePack: (packId: number) => void;
}

export function StyleCard({
  style,
  onEditStyle,
  onDeleteStyle,
  onAddPack,
  onEditPack,
  onDuplicatePack,
  onDeletePack,
}: StyleCardProps) {
  const [isStyleOpen, setIsStyleOpen] = useState(true);
  const [openPacks, setOpenPacks] = useState<Set<number>>(new Set());

  const togglePack = (packId: number) => {
    setOpenPacks((prev) => {
      const next = new Set(prev);
      if (next.has(packId)) {
        next.delete(packId);
      } else {
        next.add(packId);
      }
      return next;
    });
  };

  const colorCount = style.defaultColors?.length || 0;
  const packCount = style.packs?.length || 0;

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isStyleOpen} onOpenChange={setIsStyleOpen}>
        {/* Style Header */}
        <div className="flex items-center justify-between p-4 border-b bg-muted/30 hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-4 flex-1">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="p-0 h-auto">
                {isStyleOpen ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </Button>
            </CollapsibleTrigger>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold">
                  {style.vendorName} / Style #{style.styleNumber}
                </h3>
              </div>

              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Palette className="h-4 w-4" />
                  {colorCount > 0 ? `${colorCount} colors` : "No default colors"}
                </span>
                <span className="flex items-center gap-1">
                  <Ruler className="h-4 w-4" />
                  <Badge variant="secondary" className="text-xs">
                    {style.sizeType}
                  </Badge>
                </span>
                <span className="flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  {packCount} {packCount === 1 ? "pack" : "packs"}
                </span>
              </div>

              {style.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {style.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEditStyle(style)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDeleteStyle(style.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <CollapsibleContent>
          <CardContent className="p-0">
            {/* Default Colors Display */}
            {style.defaultColors && style.defaultColors.length > 0 && (
              <div className="px-4 py-3 border-b bg-muted/10">
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Default Colors:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {style.defaultColors.map((color) => (
                      <Badge
                        key={color}
                        variant="outline"
                        className="text-xs font-normal"
                      >
                        {color}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Packs List */}
            <div className="divide-y">
              {!style.packs || style.packs.length === 0 ? (
                <div className="px-4 py-8 text-center text-muted-foreground">
                  No packs configured for this style.
                </div>
              ) : (
                style.packs.map((pack) => (
                  <PackRow
                    key={pack.id}
                    pack={pack}
                    isOpen={openPacks.has(pack.id)}
                    onToggle={() => togglePack(pack.id)}
                    onEdit={() => onEditPack(pack)}
                    onDuplicate={() => onDuplicatePack(pack)}
                    onDelete={() => onDeletePack(pack.id)}
                  />
                ))
              )}
            </div>

            {/* Add Pack Button */}
            <div className="px-4 py-3 border-t bg-muted/10">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddPack(style.id, style.styleNumber)}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Pack to Style {style.styleNumber}
              </Button>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

interface PackRowProps {
  pack: PrepackConfig;
  isOpen: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function PackRow({
  pack,
  isOpen,
  onToggle,
  onEdit,
  onDuplicate,
  onDelete,
}: PackRowProps) {
  const colorCount = pack.availableColors?.length || 0;
  const costDisplay = pack.costPerBox
    ? `$${parseFloat(pack.costPerBox).toFixed(2)}`
    : "No cost";

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <div className="px-4 py-3 hover:bg-muted/20 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="p-0 h-auto">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">{pack.prepackName}</span>
                <span className="text-sm text-muted-foreground">
                  ({pack.piecesPerBox} pcs, {costDisplay})
                </span>
              </div>

              {!isOpen && (
                <div className="flex items-center gap-2 mt-1">
                  {colorCount > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {colorCount} {colorCount === 1 ? "color" : "colors"}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {pack.distributions.length} size{pack.distributions.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Edit className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDuplicate}>
              <Copy className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <CollapsibleContent>
          <div className="mt-3 pl-7 space-y-3">
            {/* Available Colors */}
            {pack.availableColors && pack.availableColors.length > 0 && (
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  Available Colors ({colorCount}):
                </span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {pack.availableColors.map((color) => (
                    <Badge
                      key={color}
                      variant="secondary"
                      className="text-xs font-normal"
                    >
                      {color}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Size Distribution */}
            <div>
              <span className="text-xs font-medium text-muted-foreground uppercase">
                Size Distribution:
              </span>
              <div className="mt-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {pack.distributions.map((dist) => (
                  <div
                    key={dist.id}
                    className="flex items-center justify-between px-2 py-1 rounded bg-muted/50 text-sm"
                  >
                    <span className="font-medium">{dist.sizeValue}</span>
                    <span className="text-muted-foreground">
                      {dist.quantity}× {dist.percentage && `(${parseFloat(dist.percentage).toFixed(0)}%)`}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {pack.description && (
              <div>
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  Description:
                </span>
                <p className="text-sm text-muted-foreground mt-1">
                  {pack.description}
                </p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

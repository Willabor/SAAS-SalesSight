import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Package, Warehouse, Store, TrendingUp, AlertCircle, CheckCircle, Truck, PackageCheck } from "lucide-react";

interface DistributionDetail {
  phase: 'initial' | 'reserve';
  targetStore?: string;
  sku: string;
  color: string;
  size: string;
  quantity: number;
  priority?: string;
  rationale?: string;
}

interface DistributionPlan {
  planId: string;
  styleNumber: string;
  vendorName: string;
  totalBoxes: number;
  totalPieces: number;
  totalCost: number;
  orderDate?: string;
  expectedArrivalDate?: string;
  status: string;
  details: DistributionDetail[];
}

interface PrepackRecommendation {
  styleNumber: string;
  vendorName: string;
  recommendations: Array<{
    packName: string;
    color: string;
    boxes: number;
    pieces: number;
    cost: number;
    totalCost: number;
  }>;
}

interface NetworkLevelRestockingProps {
  styleNumber: string;
  vendorName: string;
  mlRecommendation?: PrepackRecommendation;
  distributionPlan?: DistributionPlan;
  onGeneratePlan?: () => void;
}

export function NetworkLevelRestocking({
  styleNumber,
  vendorName,
  mlRecommendation,
  distributionPlan,
  onGeneratePlan
}: NetworkLevelRestockingProps) {
  // State for order tracking
  const [currentStatus, setCurrentStatus] = useState(distributionPlan?.status || 'pending');
  const [distributedSkus, setDistributedSkus] = useState<Set<string>>(new Set());
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Calculate totals from ML recommendation
  const totalBoxes = mlRecommendation?.recommendations.reduce((sum, r) => sum + r.boxes, 0) || 0;
  const totalPieces = mlRecommendation?.recommendations.reduce((sum, r) => sum + r.pieces, 0) || 0;
  const totalCost = mlRecommendation?.recommendations.reduce((sum, r) => sum + r.totalCost, 0) || 0;

  // Handle status update
  const handleUpdateStatus = async (newStatus: string) => {
    if (!distributionPlan?.planId) return;

    setIsUpdatingStatus(true);
    try {
      const response = await fetch(`/api/warehouse/distribution-plan/${distributionPlan.planId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setCurrentStatus(newStatus);
      } else {
        alert('Failed to update status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error updating status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Handle marking SKU as distributed
  const handleMarkDistributed = async (sku: string, targetStore?: string) => {
    if (!distributionPlan?.planId) return;

    try {
      const response = await fetch(`/api/warehouse/distribution/${distributionPlan.planId}/distribute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sku, targetStore, status: 'distributed' })
      });

      if (response.ok) {
        setDistributedSkus(prev => new Set([...prev, sku]));
      } else {
        alert('Failed to mark SKU as distributed');
      }
    } catch (error) {
      console.error('Error marking SKU as distributed:', error);
      alert('Error marking SKU as distributed');
    }
  };

  // Get status badge properties
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return { variant: 'outline' as const, icon: Package, label: 'Pending', color: 'text-gray-600' };
      case 'ordered':
        return { variant: 'default' as const, icon: CheckCircle, label: 'Ordered', color: 'text-blue-600' };
      case 'received':
        return { variant: 'secondary' as const, icon: Truck, label: 'Received', color: 'text-orange-600' };
      case 'distributed':
        return { variant: 'default' as const, icon: PackageCheck, label: 'Distributed', color: 'text-green-600' };
      default:
        return { variant: 'outline' as const, icon: Package, label: status, color: 'text-gray-600' };
    }
  };

  const statusInfo = getStatusBadge(currentStatus);
  const StatusIcon = statusInfo.icon;

  // Group distribution details by phase and store
  const initialDistribution = distributionPlan?.details.filter(d => d.phase === 'initial') || [];
  const warehouseReserve = distributionPlan?.details.filter(d => d.phase === 'reserve') || [];

  // Group initial distribution by store
  const distributionByStore = initialDistribution.reduce((acc, detail) => {
    const store = detail.targetStore || 'Unknown';
    if (!acc[store]) {
      acc[store] = [];
    }
    acc[store].push(detail);
    return acc;
  }, {} as Record<string, DistributionDetail[]>);

  // Calculate store totals
  const storeTotals = Object.entries(distributionByStore).map(([store, details]) => ({
    store,
    totalPieces: details.reduce((sum, d) => sum + d.quantity, 0),
    criticalItems: details.filter(d => d.priority === 'CRITICAL').length,
    highItems: details.filter(d => d.priority === 'HIGH').length
  }));

  const getPriorityBadgeColor = (priority?: string) => {
    switch (priority) {
      case 'CRITICAL':
        return 'destructive';
      case 'HIGH':
        return 'default';
      case 'MEDIUM':
        return 'secondary';
      case 'LOW':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Warehouse Order Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Warehouse className="h-5 w-5 text-blue-600" />
              <CardTitle>Warehouse Order Summary</CardTitle>
            </div>
            {distributionPlan && (
              <div className="flex items-center gap-2">
                <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
                <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
              </div>
            )}
          </div>
          <CardDescription>
            Order ships to warehouse, then distributed to stores based on needs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Total Boxes</div>
              <div className="text-2xl font-bold">{totalBoxes}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Total Pieces</div>
              <div className="text-2xl font-bold">{totalPieces}</div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-medium text-muted-foreground">Total Cost</div>
              <div className="text-2xl font-bold">${totalCost.toFixed(2)}</div>
            </div>
          </div>

          {distributionPlan && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="text-sm font-medium">Order Tracking Workflow</div>
                <div className="flex gap-2">
                  {currentStatus === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => handleUpdateStatus('ordered')}
                      disabled={isUpdatingStatus}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Mark as Ordered
                    </Button>
                  )}
                  {currentStatus === 'ordered' && (
                    <Button
                      size="sm"
                      onClick={() => handleUpdateStatus('received')}
                      disabled={isUpdatingStatus}
                    >
                      <Truck className="h-4 w-4 mr-1" />
                      Mark as Received
                    </Button>
                  )}
                  {currentStatus === 'received' && (
                    <Button
                      size="sm"
                      onClick={() => handleUpdateStatus('distributed')}
                      disabled={isUpdatingStatus}
                    >
                      <PackageCheck className="h-4 w-4 mr-1" />
                      Mark as Distributed
                    </Button>
                  )}
                  {currentStatus === 'distributed' && (
                    <div className="flex items-center gap-2 text-green-600">
                      <PackageCheck className="h-4 w-4" />
                      <span className="text-sm font-medium">Order Complete</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Order Breakdown by Color + Pack */}
      {mlRecommendation && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-purple-600" />
              <CardTitle>Order Breakdown</CardTitle>
            </div>
            <CardDescription>Prepack boxes by color and configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pack Name</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead className="text-right">Boxes</TableHead>
                  <TableHead className="text-right">Pieces per Box</TableHead>
                  <TableHead className="text-right">Total Pieces</TableHead>
                  <TableHead className="text-right">Cost per Box</TableHead>
                  <TableHead className="text-right">Total Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mlRecommendation.recommendations.map((rec, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{rec.packName}</TableCell>
                    <TableCell>{rec.color}</TableCell>
                    <TableCell className="text-right">{rec.boxes}</TableCell>
                    <TableCell className="text-right">{rec.pieces}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {rec.boxes * rec.pieces}
                    </TableCell>
                    <TableCell className="text-right">${rec.cost.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-semibold">
                      ${rec.totalCost.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={2} className="font-bold">
                    TOTAL
                  </TableCell>
                  <TableCell className="text-right font-bold">{totalBoxes}</TableCell>
                  <TableCell />
                  <TableCell className="text-right font-bold">{totalPieces}</TableCell>
                  <TableCell />
                  <TableCell className="text-right font-bold">${totalCost.toFixed(2)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Initial Distribution Plan (Phase 1) */}
      {distributionPlan && initialDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-green-600" />
              <CardTitle>Phase 1: Initial Distribution Plan</CardTitle>
            </div>
            <CardDescription>
              Immediate distribution to stores based on current needs (60-70% of inventory)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Store Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {storeTotals.map(({ store, totalPieces, criticalItems, highItems }) => (
                <Card key={store}>
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div className="font-semibold">{store}</div>
                      <div className="text-2xl font-bold">{totalPieces} pcs</div>
                      {(criticalItems > 0 || highItems > 0) && (
                        <div className="flex gap-2 text-xs">
                          {criticalItems > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {criticalItems} Critical
                            </Badge>
                          )}
                          {highItems > 0 && (
                            <Badge variant="default" className="text-xs">
                              {highItems} High
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Separator />

            {/* Detailed Distribution Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Store</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Rationale</TableHead>
                  {currentStatus === 'received' && <TableHead>Action</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialDistribution.map((detail, idx) => {
                  const isDistributed = distributedSkus.has(detail.sku);
                  return (
                    <TableRow key={idx} className={isDistributed ? 'opacity-50' : ''}>
                      <TableCell className="font-medium">{detail.targetStore || 'N/A'}</TableCell>
                      <TableCell>{detail.sku}</TableCell>
                      <TableCell>{detail.color}</TableCell>
                      <TableCell>{detail.size}</TableCell>
                      <TableCell className="text-right font-semibold">{detail.quantity}</TableCell>
                      <TableCell>
                        <Badge variant={getPriorityBadgeColor(detail.priority)}>
                          {detail.priority || 'MEDIUM'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                        {detail.rationale || 'Restocking based on velocity'}
                      </TableCell>
                      {currentStatus === 'received' && (
                        <TableCell>
                          {isDistributed ? (
                            <div className="flex items-center gap-1 text-green-600 text-sm">
                              <PackageCheck className="h-3 w-3" />
                              Sent
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkDistributed(detail.sku, detail.targetStore)}
                            >
                              <PackageCheck className="h-3 w-3 mr-1" />
                              Send to Store
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Warehouse Reserve (Phase 2) */}
      {distributionPlan && warehouseReserve.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-600" />
              <CardTitle>Phase 2: Warehouse Reserve</CardTitle>
            </div>
            <CardDescription>
              Held at warehouse for future distribution (30-40% of inventory)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead className="text-right">Qty Reserved</TableHead>
                  <TableHead>Purpose</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehouseReserve.map((detail, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-medium">{detail.sku}</TableCell>
                    <TableCell>{detail.color}</TableCell>
                    <TableCell>{detail.size}</TableCell>
                    <TableCell className="text-right font-semibold">{detail.quantity}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {detail.rationale || 'Available for future transfers'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Network Analysis */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-600" />
            <CardTitle>Network-Level Optimization</CardTitle>
          </div>
          <CardDescription>Why this approach eliminates waste</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-green-100 p-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <div className="font-semibold">0% Store-Level Waste</div>
                <div className="text-sm text-muted-foreground">
                  Each store receives only the exact SKUs they need (no unwanted sizes/colors)
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-blue-100 p-2">
                <Warehouse className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <div className="font-semibold">Flexible Reserve</div>
                <div className="text-sm text-muted-foreground">
                  Warehouse holds 30-40% for future transfers based on emerging demand
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-purple-100 p-2">
                <Package className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <div className="font-semibold">Bulk Pricing Benefits</div>
                <div className="text-sm text-muted-foreground">
                  Order full prepack boxes to get vendor discounts, then optimize distribution
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

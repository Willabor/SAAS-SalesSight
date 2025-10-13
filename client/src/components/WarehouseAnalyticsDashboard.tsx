import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Package, DollarSign, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

interface AnalyticsData {
  success: boolean;
  period: {
    daysBack: number;
    startDate: string;
    endDate: string;
  };
  overall: {
    totalPlans: number;
    completedPlans: number;
    pendingPlans: number;
    completionRate: number;
    totalBoxes: number;
    totalPieces: number;
    totalInvestment: number;
    statusBreakdown: {
      pending: number;
      ordered: number;
      received: number;
      distributed: number;
      completed: number;
    };
  };
  cycleTimes: {
    avgOrderToReceive: number;
    avgTotalCycle: number;
    minReceiveTime: number;
    maxReceiveTime: number;
  };
  topStyles: Array<{
    styleNumber: string;
    vendorName: string;
    totalOrders: number;
    completedOrders: number;
    totalBoxes: number;
    totalPieces: number;
    totalCost: number;
    completionRate: number;
  }>;
  timeline: Array<{
    date: string;
    plansCreated: number;
    boxesOrdered: number;
    investment: number;
    completedCount: number;
  }>;
  storePerformance: Array<{
    store: string;
    plansReceived: number;
    piecesAllocated: number;
    piecesDistributed: number;
    distributionRate: number;
  }>;
  recentActivity: Array<{
    planId: string;
    styleNumber: string;
    vendorName: string;
    totalBoxes: number;
    totalPieces: number;
    totalCost: number;
    status: string;
    orderDate: string | null;
    expectedArrival: string | null;
    createdAt: string;
    distributionProgress: string;
  }>;
}

interface WarehouseAnalyticsDashboardProps {
  daysBack?: number;
}

export function WarehouseAnalyticsDashboard({ daysBack = 90 }: WarehouseAnalyticsDashboardProps) {
  const { data, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ['warehouse', 'distribution-analytics', daysBack],
    queryFn: async () => {
      const response = await fetch(`/api/warehouse/distribution-analytics?days=${daysBack}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    },
    refetchInterval: 60000, // Refetch every minute
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-destructive">Failed to load analytics data</div>
      </div>
    );
  }

  const { overall, cycleTimes, topStyles, timeline, storePerformance, recentActivity } = data;

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
      pending: { label: 'Pending', variant: 'outline' },
      ordered: { label: 'Ordered', variant: 'secondary' },
      received: { label: 'Received', variant: 'default' },
      distributed: { label: 'Distributed', variant: 'default' },
      completed: { label: 'Completed', variant: 'default' },
    };
    const config = statusConfig[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Warehouse Distribution Analytics</h2>
        <p className="text-muted-foreground">
          Performance metrics for the last {daysBack} days
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Plans</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overall.totalPlans}</div>
            <p className="text-xs text-muted-foreground">
              {overall.completedPlans} completed ({overall.completionRate.toFixed(1)}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investment</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${overall.totalInvestment.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {overall.totalBoxes} boxes, {overall.totalPieces.toLocaleString()} pieces
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Order to Receive</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cycleTimes.avgOrderToReceive.toFixed(1)} days</div>
            <p className="text-xs text-muted-foreground">
              Range: {cycleTimes.minReceiveTime.toFixed(0)}-{cycleTimes.maxReceiveTime.toFixed(0)} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overall.completionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {overall.pendingPlans} pending plans
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Different Views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="styles">Top Styles</TabsTrigger>
          <TabsTrigger value="stores">Store Performance</TabsTrigger>
          <TabsTrigger value="activity">Recent Activity</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Status Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Status Breakdown</CardTitle>
                <CardDescription>Distribution of plans by status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(overall.statusBreakdown).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(status)}
                        <span className="text-sm capitalize">{status}</span>
                      </div>
                      <span className="font-bold">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Timeline Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Last 7 days of distribution activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {timeline.slice(0, 7).map((day) => (
                    <div key={day.date} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                      <div className="flex items-center gap-4">
                        <span>{day.plansCreated} plans</span>
                        <span className="text-muted-foreground">{day.boxesOrdered} boxes</span>
                        <span className="font-medium">${day.investment.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cycle Times */}
          <Card>
            <CardHeader>
              <CardTitle>Cycle Time Analysis</CardTitle>
              <CardDescription>Average time metrics for distribution workflow</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <div className="text-sm text-muted-foreground">Avg. Order to Receive</div>
                  <div className="text-2xl font-bold">{cycleTimes.avgOrderToReceive.toFixed(1)} days</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Avg. Total Cycle Time</div>
                  <div className="text-2xl font-bold">{cycleTimes.avgTotalCycle.toFixed(1)} days</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Receive Time Range</div>
                  <div className="text-2xl font-bold">
                    {cycleTimes.minReceiveTime.toFixed(0)}-{cycleTimes.maxReceiveTime.toFixed(0)} days
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Styles Tab */}
        <TabsContent value="styles">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Styles</CardTitle>
              <CardDescription>Styles with highest completion rates (minimum 2 orders)</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Style</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                    <TableHead className="text-right">Boxes</TableHead>
                    <TableHead className="text-right">Pieces</TableHead>
                    <TableHead className="text-right">Investment</TableHead>
                    <TableHead className="text-right">Completion Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topStyles.map((style) => (
                    <TableRow key={style.styleNumber}>
                      <TableCell className="font-medium">{style.styleNumber}</TableCell>
                      <TableCell>{style.vendorName}</TableCell>
                      <TableCell className="text-right">{style.totalOrders}</TableCell>
                      <TableCell className="text-right">{style.completedOrders}</TableCell>
                      <TableCell className="text-right">{style.totalBoxes}</TableCell>
                      <TableCell className="text-right">{style.totalPieces.toLocaleString()}</TableCell>
                      <TableCell className="text-right">${style.totalCost.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={style.completionRate >= 80 ? 'default' : 'secondary'}>
                          {style.completionRate.toFixed(0)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {topStyles.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        No data available yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Store Performance Tab */}
        <TabsContent value="stores">
          <Card>
            <CardHeader>
              <CardTitle>Store-Level Distribution Performance</CardTitle>
              <CardDescription>Allocation and distribution rates by store</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Store</TableHead>
                    <TableHead className="text-right">Plans Received</TableHead>
                    <TableHead className="text-right">Pieces Allocated</TableHead>
                    <TableHead className="text-right">Pieces Distributed</TableHead>
                    <TableHead className="text-right">Distribution Rate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {storePerformance.map((store) => (
                    <TableRow key={store.store}>
                      <TableCell className="font-medium">{store.store}</TableCell>
                      <TableCell className="text-right">{store.plansReceived}</TableCell>
                      <TableCell className="text-right">{store.piecesAllocated.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{store.piecesDistributed.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {store.distributionRate >= 80 ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : store.distributionRate < 50 ? (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                          )}
                          <Badge
                            variant={
                              store.distributionRate >= 80 ? 'default' :
                              store.distributionRate >= 50 ? 'secondary' :
                              'outline'
                            }
                          >
                            {store.distributionRate.toFixed(1)}%
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {storePerformance.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        No distribution data available yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Activity Tab */}
        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Recent Distribution Plans</CardTitle>
              <CardDescription>Last 20 distribution plans created</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan ID</TableHead>
                    <TableHead>Style</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-right">Boxes</TableHead>
                    <TableHead className="text-right">Pieces</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentActivity.map((activity) => (
                    <TableRow key={activity.planId}>
                      <TableCell className="font-mono text-xs">{activity.planId.split('_')[1]?.slice(0, 8) || activity.planId}</TableCell>
                      <TableCell className="font-medium">{activity.styleNumber}</TableCell>
                      <TableCell>{activity.vendorName}</TableCell>
                      <TableCell className="text-right">{activity.totalBoxes}</TableCell>
                      <TableCell className="text-right">{activity.totalPieces}</TableCell>
                      <TableCell className="text-right">${activity.totalCost.toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(activity.status)}</TableCell>
                      <TableCell className="font-mono text-sm">{activity.distributionProgress}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(activity.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                  {recentActivity.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
                        No recent activity
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

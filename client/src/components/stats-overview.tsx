import { useQuery } from "@tanstack/react-query";
import { Package, Users, DollarSign, CreditCard } from "lucide-react";

interface ItemListStats {
  totalItems: number;
  totalVendors: number;
  totalCategories: number;
  totalAvailable: number;
}

interface SalesStats {
  totalTransactions: number;
  totalRevenue: string;
  totalReceipts: number;
  totalStores: number;
}

export function StatsOverview() {
  const { data: itemStats, isLoading: itemStatsLoading } = useQuery<ItemListStats>({
    queryKey: ["/api/stats/item-list"],
  });

  const { data: salesStats, isLoading: salesStatsLoading } = useQuery<SalesStats>({
    queryKey: ["/api/stats/sales"],
  });

  const formatCurrency = (value: string) => {
    const num = parseFloat(value);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Total Items Card */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm" data-testid="card-total-items">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Items</p>
            <p className="text-2xl font-bold text-foreground" data-testid="text-total-items">
              {itemStatsLoading ? "..." : formatNumber(itemStats?.totalItems || 0)}
            </p>
          </div>
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
            <Package className="w-6 h-6 text-primary" />
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm">
          <span className="text-green-600 font-medium">+12.5%</span>
          <span className="text-muted-foreground ml-1">from last week</span>
        </div>
      </div>

      {/* Total Vendors Card */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm" data-testid="card-total-vendors">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Vendors</p>
            <p className="text-2xl font-bold text-foreground" data-testid="text-total-vendors">
              {itemStatsLoading ? "..." : formatNumber(itemStats?.totalVendors || 0)}
            </p>
          </div>
          <div className="w-12 h-12 bg-chart-2/10 rounded-lg flex items-center justify-center">
            <Users className="w-6 h-6 text-chart-2" />
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm">
          <span className="text-green-600 font-medium">+3</span>
          <span className="text-muted-foreground ml-1">new vendors</span>
        </div>
      </div>

      {/* Total Revenue Card */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm" data-testid="card-total-revenue">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold text-foreground" data-testid="text-total-revenue">
              {salesStatsLoading ? "..." : formatCurrency(salesStats?.totalRevenue || "0")}
            </p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-green-600" />
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm">
          <span className="text-green-600 font-medium">+8.2%</span>
          <span className="text-muted-foreground ml-1">from last month</span>
        </div>
      </div>

      {/* Total Transactions Card */}
      <div className="bg-card border border-border rounded-lg p-6 shadow-sm" data-testid="card-total-transactions">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Transactions</p>
            <p className="text-2xl font-bold text-foreground" data-testid="text-total-transactions">
              {salesStatsLoading ? "..." : formatNumber(salesStats?.totalTransactions || 0)}
            </p>
          </div>
          <div className="w-12 h-12 bg-chart-4/10 rounded-lg flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-chart-4" />
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm">
          <span className="text-green-600 font-medium">+156</span>
          <span className="text-muted-foreground ml-1">this week</span>
        </div>
      </div>
    </div>
  );
}

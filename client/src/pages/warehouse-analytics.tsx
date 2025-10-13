import { WarehouseAnalyticsDashboard } from '@/components/WarehouseAnalyticsDashboard';

export default function WarehouseAnalyticsPage() {
  return (
    <div className="container mx-auto p-6">
      <WarehouseAnalyticsDashboard daysBack={90} />
    </div>
  );
}

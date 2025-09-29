import { useQuery } from "@tanstack/react-query";
import { Upload, FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UploadHistory {
  id: number;
  fileName: string;
  uploadType: string;
  uploadMode?: string;
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  uploadedAt: string;
}

export function RecentActivity() {
  const { data: activities = [], isLoading } = useQuery<UploadHistory[]>({
    queryKey: ["/api/upload-history"],
  });

  const getActivityIcon = (type: string, mode?: string) => {
    if (type === "sales_transactions") {
      return <FileText className="w-4 h-4 text-blue-600" />;
    }
    if (mode === "weekly_update") {
      return <RefreshCw className="w-4 h-4 text-orange-600" />;
    }
    return <Upload className="w-4 h-4 text-green-600" />;
  };

  const getActivityIconBg = (type: string, mode?: string) => {
    if (type === "sales_transactions") {
      return "bg-blue-100";
    }
    if (mode === "weekly_update") {
      return "bg-orange-100";
    }
    return "bg-green-100";
  };

  const getActivityTitle = (type: string, mode?: string) => {
    if (type === "sales_transactions") {
      return "Sales Transactions Upload";
    }
    if (mode === "weekly_update") {
      return "Weekly Update Completed";
    }
    return "Item List Upload Completed";
  };

  const getActivityDescription = (activity: UploadHistory) => {
    const timeAgo = new Date(activity.uploadedAt).toLocaleString();
    if (activity.uploadType === "sales_transactions") {
      return `${activity.successfulRecords.toLocaleString()} transactions imported • ${timeAgo}`;
    }
    if (activity.uploadMode === "weekly_update") {
      return `${activity.successfulRecords.toLocaleString()} items updated, ${activity.failedRecords} conflicts resolved • ${timeAgo}`;
    }
    return `${activity.successfulRecords.toLocaleString()} items processed successfully • ${timeAgo}`;
  };

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center space-x-4 p-3">
              <div className="w-8 h-8 bg-muted rounded-full animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-3 bg-muted rounded w-3/4 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Recent Activity</h3>
        <Button variant="link" className="text-sm text-primary hover:text-primary/80 font-medium" data-testid="button-view-all">
          View All
        </Button>
      </div>

      <div className="space-y-4">
        {activities.length === 0 ? (
          <div className="text-center py-8" data-testid="empty-state-activities">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No recent uploads</p>
          </div>
        ) : (
          activities.map((activity) => (
            <div 
              key={activity.id}
              className="flex items-center space-x-4 p-3 hover:bg-muted rounded-lg transition-colors"
              data-testid={`activity-${activity.id}`}
            >
              <div className={`w-8 h-8 ${getActivityIconBg(activity.uploadType, activity.uploadMode)} rounded-full flex items-center justify-center`}>
                {getActivityIcon(activity.uploadType, activity.uploadMode)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {getActivityTitle(activity.uploadType, activity.uploadMode)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {getActivityDescription(activity)}
                </p>
              </div>
              <div className="text-xs text-muted-foreground" data-testid={`filename-${activity.id}`}>
                {activity.fileName}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

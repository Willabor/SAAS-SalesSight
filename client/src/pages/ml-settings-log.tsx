import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AppHeader } from "@/components/app-header";
import { CheckCircle2, XCircle, Clock, Zap, Filter, Package, Sparkles } from "lucide-react";

interface MLSettingsLogEntry {
  id: number;
  userId: string;
  modelVersion: string;
  settingsSnapshot: any;
  trainingDays: number;
  testAccuracy: string;
  trainingStatus: string;
  errorMessage: string | null;
  trainingDurationMs: number;
  filtersEnabled: boolean;
  receivingHistoryEnabled: boolean;
  featureSelectionEnabled: boolean;
  createdAt: string;
}

export default function MLSettingsLogPage() {
  const { data: logs = [], isLoading } = useQuery<MLSettingsLogEntry[]>({
    queryKey: ["/api/ml/settings-log"],
  });

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      <main className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">ML Training History</h1>
            <p className="text-muted-foreground mt-2">
              Complete audit trail of all ML model training sessions
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Training Sessions</CardTitle>
            <CardDescription>
              View all ML model training attempts with settings, accuracy, and performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading logs...</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No training sessions yet. Train a model to see logs here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Model Version</TableHead>
                      <TableHead>Accuracy</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Features</TableHead>
                      <TableHead>Settings</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {formatDate(log.createdAt)}
                        </TableCell>
                        <TableCell>
                          {log.trainingStatus === 'success' ? (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Success
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="w-3 h-3" />
                              Failed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {log.modelVersion}
                        </TableCell>
                        <TableCell>
                          {log.testAccuracy ? (
                            <span className="font-semibold">
                              {(parseFloat(log.testAccuracy) * 100).toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Zap className="w-3 h-3 text-muted-foreground" />
                            {formatDuration(log.trainingDurationMs)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {log.filtersEnabled && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <Filter className="w-3 h-3" />
                                Filters
                              </Badge>
                            )}
                            {log.receivingHistoryEnabled && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <Package className="w-3 h-3" />
                                Receiving
                              </Badge>
                            )}
                            {log.featureSelectionEnabled && (
                              <Badge variant="outline" className="text-xs gap-1">
                                <Sparkles className="w-3 h-3" />
                                Custom
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {log.trainingDays}d training
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

import { Check, X, FileText, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

interface UploadProgressProps {
  isUploading?: boolean;
  progress?: number;
  results?: {
    successful: number;
    failed: number;
    total: number;
    errors: string[];
  } | null;
}

export function UploadProgress({ 
  isUploading = false, 
  progress = 0, 
  results = null 
}: UploadProgressProps) {
  const hasErrors = results && results.failed > 0;

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Upload Progress</h3>
      
      {/* Progress Bar */}
      {isUploading && (
        <div className="mb-6" data-testid="progress-container">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Processing file...</span>
            <span className="text-sm text-muted-foreground" data-testid="text-progress-percentage">
              {progress}%
            </span>
          </div>
          <Progress value={progress} className="w-full" data-testid="progress-bar" />
        </div>
      )}

      {/* Upload Results */}
      {results && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Success Card */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4" data-testid="card-upload-success">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-800">Successfully Uploaded</p>
                <p className="text-lg font-bold text-green-900" data-testid="text-upload-successful">
                  {results.successful.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Failed Card */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4" data-testid="card-upload-failed">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <X className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-red-800">Failed Uploads</p>
                <p className="text-lg font-bold text-red-900" data-testid="text-upload-failed">
                  {results.failed.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Total Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4" data-testid="card-upload-total">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-800">Total Records</p>
                <p className="text-lg font-bold text-blue-900" data-testid="text-upload-total">
                  {results.total.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Details */}
      {hasErrors && (
        <div className="mt-6" data-testid="error-details">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <h4 className="font-medium text-destructive mb-2 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Upload Errors ({results!.failed})
            </h4>
            <div className="space-y-2 text-sm">
              {results!.errors.slice(0, 3).map((error, index) => (
                <div key={index} className="text-muted-foreground" data-testid={`error-${index}`}>
                  • {error}
                </div>
              ))}
              {results!.errors.length > 3 && (
                <Button 
                  variant="link" 
                  className="text-primary hover:text-primary/80 text-sm font-medium p-0 h-auto"
                  data-testid="button-show-all-errors"
                >
                  Show all errors →
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

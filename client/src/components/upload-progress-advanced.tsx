import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Pause, Play, StopCircle, RotateCcw, AlertCircle } from "lucide-react";

interface UploadProgressAdvancedProps {
  uploadStats: {
    processed: number;
    total: number;
    uploaded: number;
    skipped?: number;
    failed: number;
  };
  isPaused: boolean;
  isStopped: boolean;
  uploadType: 'receiving' | 'item-list' | 'sales';
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onClear: () => void;
  showSkipped?: boolean;
  isUploading?: boolean;
}

export function UploadProgressAdvanced({
  uploadStats,
  isPaused,
  isStopped,
  uploadType,
  onPause,
  onResume,
  onStop,
  onClear,
  showSkipped = true,
  isUploading = true,
}: UploadProgressAdvancedProps) {
  const percentage = Math.round((uploadStats.processed / uploadStats.total) * 100);

  const typeLabels = {
    'receiving': 'vouchers',
    'item-list': 'items',
    'sales': 'transactions'
  };

  const itemLabel = typeLabels[uploadType];

  return (
    <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg" data-testid="upload-progress-container">
      {/* Header with live badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="font-medium text-blue-900">
            {isStopped ? "Upload Stopped" : isPaused ? "Upload Paused" : "Uploading to Database"}
          </p>
          {uploadStats.processed > 0 && !isStopped && (
            <Badge variant="outline" className="text-xs">
              Live Progress
            </Badge>
          )}
        </div>
        <Badge variant="secondary">{percentage}%</Badge>
      </div>

      {/* Progress bar */}
      <Progress value={percentage} className="w-full" data-testid="progress-upload" />

      {/* Statistics grid (3 or 4 columns based on showSkipped) */}
      <div className={`grid ${showSkipped ? 'grid-cols-4' : 'grid-cols-3'} gap-4 text-center`}>
        <div>
          <p className="text-lg font-bold text-blue-900">{uploadStats.processed}</p>
          <p className="text-xs text-blue-700">Processed</p>
        </div>
        <div>
          <p className="text-lg font-bold text-green-600">{uploadStats.uploaded}</p>
          <p className="text-xs text-green-700">Uploaded</p>
        </div>
        {showSkipped && uploadStats.skipped !== undefined && (
          <div>
            <p className="text-lg font-bold text-yellow-600">{uploadStats.skipped}</p>
            <p className="text-xs text-yellow-700">Skipped</p>
          </div>
        )}
        <div>
          <p className="text-lg font-bold text-red-600">{uploadStats.failed}</p>
          <p className="text-xs text-red-700">Failed</p>
        </div>
      </div>

      {/* Status text */}
      <p className="text-sm text-blue-800">
        {uploadStats.processed} of {uploadStats.total} {itemLabel} processed
        {isPaused && <span className="ml-2 text-yellow-600 font-semibold">(Paused)</span>}
      </p>

      {/* Control buttons */}
      {isStopped ? (
        <div className="flex justify-center">
          <Button
            onClick={onClear}
            variant="outline"
            size="sm"
            data-testid="button-reset-upload"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset Upload
          </Button>
        </div>
      ) : (
        <div className="flex gap-2 justify-center">
          {!isPaused ? (
            <Button
              onClick={onPause}
              variant="outline"
              size="sm"
              disabled={!isUploading}
              data-testid="button-pause-upload"
            >
              <Pause className="w-4 h-4 mr-2" />
              Pause
            </Button>
          ) : (
            <Button
              onClick={onResume}
              variant="outline"
              size="sm"
              data-testid="button-resume-upload"
            >
              <Play className="w-4 h-4 mr-2" />
              Resume
            </Button>
          )}
          <Button
            onClick={onStop}
            variant="destructive"
            size="sm"
            disabled={!isUploading}
            data-testid="button-stop-upload"
          >
            <StopCircle className="w-4 h-4 mr-2" />
            Stop
          </Button>
          <Button
            onClick={onClear}
            variant="outline"
            size="sm"
            data-testid="button-clear-upload"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>
      )}

      {/* Warning alert */}
      <Alert className="bg-blue-100 border-blue-300">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 text-xs">
          <strong>Note:</strong> If you refresh the page during upload, the upload will stop.
          The data uploaded so far ({uploadStats.uploaded} {itemLabel}) is already saved in the database.
          Click "Clear" to reset and start over, or check the data page to verify your uploads.
        </AlertDescription>
      </Alert>
    </div>
  );
}

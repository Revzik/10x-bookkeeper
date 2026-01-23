import type { ApiErrorDto } from "@/types";
import { Button } from "@/components/ui/button";

interface InlineBannerProps {
  error: ApiErrorDto;
  onRetry?: () => void;
}

/**
 * InlineBanner - Display retryable errors and rate limits
 */
export const InlineBanner = ({ error, onRetry }: InlineBannerProps) => {
  const isRateLimited = error.code === "RATE_LIMITED";
  const isInternalError = error.code === "INTERNAL_ERROR";

  let title = "Error";
  let description = error.message;

  if (isRateLimited) {
    title = "Rate Limited";
    description = "You're doing that too often. Please wait and try again.";
  } else if (isInternalError) {
    title = "Something went wrong";
    description = "We encountered an error. Please try again.";
  }

  return (
    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-destructive">{title}</h3>
          <p className="mt-1 text-sm text-destructive/90">{description}</p>
          {error.details && (
            <pre className="mt-2 text-xs text-destructive/80">{JSON.stringify(error.details, null, 2)}</pre>
          )}
        </div>

        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="ml-4">
            Retry
          </Button>
        )}
      </div>
    </div>
  );
};

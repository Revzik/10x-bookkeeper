import type { ApiErrorDto } from "@/types";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/react";

interface InlineBannerProps {
  error: ApiErrorDto;
  onRetry?: () => void;
}

/**
 * InlineBanner - Display retryable errors and rate limits
 */
export const InlineBanner = ({ error, onRetry }: InlineBannerProps) => {
  const { t } = useT();
  const isRateLimited = error.code === "RATE_LIMITED";
  const isInternalError = error.code === "INTERNAL_ERROR";

  let title = t("errors.title");
  let description = t(error.message);

  if (isRateLimited) {
    title = t("errors.rateLimitedTitle");
    description = t("errors.rateLimitedDescription");
  } else if (isInternalError) {
    title = t("errors.internalTitle");
    description = t("errors.internalDescription");
  }

  return (
    <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4" data-testid="error-banner">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="font-semibold text-destructive">{title}</h3>
          <p className="mt-1 text-sm text-destructive/90">{description}</p>
          {error.details && (
            <pre className="mt-2 text-xs text-destructive/80">{JSON.stringify(error.details, null, 2)}</pre>
          )}
        </div>

        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="ml-4" data-testid="btn-error-retry">
            {t("common.actions.retry")}
          </Button>
        )}
      </div>
    </div>
  );
};

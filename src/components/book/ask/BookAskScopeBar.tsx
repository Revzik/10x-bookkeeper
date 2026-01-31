import { useEffect } from "react";
import type { BookAskScopeViewModel } from "@/types";
import { ScopeSwitch } from "./ScopeSwitch";
import { useT } from "@/i18n/react";

interface BookAskScopeBarProps {
  scope: BookAskScopeViewModel;
  canUseSeriesScope: boolean;
  onScopeChange: (scope: BookAskScopeViewModel) => void;
  showSeriesDisabledHint: boolean;
}

/**
 * BookAskScopeBar - Scope selection UI and guidance for series availability.
 *
 * Features:
 * - ScopeSwitch component (segmented control)
 * - Series availability hint when needed
 * - Auto-fallback to "book" scope when series unavailable
 */
export const BookAskScopeBar = ({
  scope,
  canUseSeriesScope,
  onScopeChange,
  showSeriesDisabledHint,
}: BookAskScopeBarProps) => {
  const { t } = useT();
  // Auto-fallback: if URL requests series scope but series is unavailable, fall back to book
  useEffect(() => {
    if (scope === "series" && !canUseSeriesScope) {
      onScopeChange("book");
    }
  }, [scope, canUseSeriesScope, onScopeChange]);

  return (
    <div>
      {/* Scope selector row - styled like other header rows */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{t("ai.chat.scopeLabel")}</span>
          <ScopeSwitch value={scope} seriesEnabled={canUseSeriesScope} onChange={onScopeChange} />
        </div>
      </div>

      {/* Series disabled hint - shown below the scope bar */}
      {showSeriesDisabledHint && <p className="mt-2 text-sm text-muted-foreground">{t("ai.chat.seriesHint")}</p>}
    </div>
  );
};

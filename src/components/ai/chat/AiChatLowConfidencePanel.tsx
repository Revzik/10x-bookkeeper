import { useT } from "@/i18n/react";

interface AiChatLowConfidencePanelProps {
  visible: boolean;
  scope: "book" | "series";
  canUseSeriesScope: boolean;
}

/**
 * AiChatLowConfidencePanel - Guidance UI when AI answer has low confidence.
 *
 * Shared component used by both Book Ask and Series Ask tabs.
 * Features:
 * - Scope-aware guidance (different suggestions for book vs series)
 * - Non-destructive styling (warning/info palette)
 * - Suggests actions to improve answer quality
 */
export const AiChatLowConfidencePanel = ({ visible, scope, canUseSeriesScope }: AiChatLowConfidencePanelProps) => {
  const { t } = useT();

  if (!visible) {
    return null;
  }

  // Build scope-aware guidance bullets
  const guidanceBullets: string[] = [t("ai.chat.lowConfidenceBase1"), t("ai.chat.lowConfidenceBase2")];

  // Add scope-specific suggestions
  if (scope === "book" && canUseSeriesScope) {
    guidanceBullets.push(t("ai.chat.lowConfidenceBookSeries"));
  } else if (scope === "series") {
    guidanceBullets.push(t("ai.chat.lowConfidenceSeries"));
  } else if (scope === "book") {
    guidanceBullets.push(t("ai.chat.lowConfidenceBook"));
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
      <h3 className="mb-2 font-semibold text-amber-900 dark:text-amber-100">{t("ai.chat.lowConfidenceTitle")}</h3>
      <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-200">
        {guidanceBullets.map((bullet, index) => (
          <li key={index}>• {bullet}</li>
        ))}
      </ul>
    </div>
  );
};

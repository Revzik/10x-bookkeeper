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
  if (!visible) {
    return null;
  }

  // Build scope-aware guidance bullets
  const guidanceBullets: string[] = [
    "Add notes to the relevant chapter(s)",
    "Try a more specific phrasing (names, places, chapter number)",
  ];

  // Add scope-specific suggestions
  if (scope === "book" && canUseSeriesScope) {
    guidanceBullets.push("Try switching to 'This series' for broader context");
  } else if (scope === "series") {
    guidanceBullets.push("Try narrowing to a specific book, or add more notes");
  } else if (scope === "book") {
    guidanceBullets.push("Confirm you're asking about the right book");
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
      <h3 className="mb-2 font-semibold text-amber-900 dark:text-amber-100">Not enough in your notes (yet)</h3>
      <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-200">
        {guidanceBullets.map((bullet, index) => (
          <li key={index}>• {bullet}</li>
        ))}
      </ul>
    </div>
  );
};

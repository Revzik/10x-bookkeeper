interface SeriesAskTabPanelProps {
  seriesId: string;
}

/**
 * SeriesAskTabPanel - Series-scoped Q&A interface
 *
 * STUB/PLACEHOLDER: To be implemented in separate plan (US-009–US-011)
 * Will include:
 * - AI query input
 * - Series-scoped RAG retrieval
 * - Answer display with citations
 */
export const SeriesAskTabPanel = ({ seriesId }: SeriesAskTabPanelProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="max-w-md space-y-4">
        <h2 className="text-2xl font-semibold">Ask Tab</h2>
        <p className="text-muted-foreground">
          This tab will provide a series-scoped Q&A interface where you can ask questions about all books and notes in
          this series (ID: {seriesId}).
        </p>
        <p className="text-sm text-muted-foreground italic">To be implemented in separate plan</p>
      </div>
    </div>
  );
};

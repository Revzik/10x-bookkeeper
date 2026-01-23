import type { SeriesBooksQueryViewModel } from "@/types";

interface SeriesBooksTabPanelProps {
  seriesId: string;
  query: SeriesBooksQueryViewModel;
  onQueryChange: (query: SeriesBooksQueryViewModel) => void;
}

/**
 * SeriesBooksTabPanel - Displays books within a series
 *
 * PLACEHOLDER: To be implemented in follow-up work
 * Will include:
 * - Books list filtered by series_id
 * - Search, sort, filter controls
 * - Pagination
 */
export const SeriesBooksTabPanel = ({ seriesId }: SeriesBooksTabPanelProps) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="max-w-md space-y-4">
        <h2 className="text-2xl font-semibold">Books Tab</h2>
        <p className="text-muted-foreground">
          This tab will display all books in this series (ID: {seriesId}). It will include search, filter, and sort
          controls similar to the Library Books tab.
        </p>
        <p className="text-sm text-muted-foreground italic">To be implemented in follow-up work</p>
      </div>
    </div>
  );
};

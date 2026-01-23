import type { SeriesListItemViewModel } from "@/types";
import { SeriesRow } from "@/components/library/SeriesRow";
import { EntrySkeleton } from "@/components/shared/EntrySkeleton";

interface SeriesListProps {
  items: SeriesListItemViewModel[];
  loading: boolean;
  onOpenSeries: (id: string) => void;
}

/**
 * SeriesList - Display series results with loading and empty states
 */
export const SeriesList = ({ items, loading, onOpenSeries }: SeriesListProps) => {
  if (loading) {
    return <EntrySkeleton />;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <p className="mb-4 text-foreground">No series found</p>
        <p className="text-sm text-muted-foreground">Try adjusting your filters or add your first series</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((series) => (
        <SeriesRow key={series.id} series={series} onClick={() => onOpenSeries(series.id)} />
      ))}
    </div>
  );
};

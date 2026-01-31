import type { LibrarySeriesQueryViewModel, SeriesListItemViewModel, PaginationMetaDto, ApiErrorDto } from "@/types";
import { SeriesToolbar } from "@/components/library/SeriesToolbar";
import { SeriesList } from "@/components/library/SeriesList";
import { PaginationControls } from "@/components/library/PaginationControls";
import { InlineBanner } from "@/components/library/InlineBanner";
import { useT } from "@/i18n/react";
import { withLocalePath } from "@/i18n";

interface SeriesTabPanelProps {
  query: LibrarySeriesQueryViewModel;
  onQueryChange: (next: LibrarySeriesQueryViewModel) => void;
  items: SeriesListItemViewModel[];
  meta: PaginationMetaDto | null;
  loading: boolean;
  error: ApiErrorDto | null;
  onRetry: () => void;
}

/**
 * SeriesTabPanel - Series list UI with search and pagination
 */
export const SeriesTabPanel = ({ query, onQueryChange, items, meta, loading, error, onRetry }: SeriesTabPanelProps) => {
  const { locale } = useT();
  const handleOpenSeries = (id: string) => {
    window.location.href = `${withLocalePath(locale, "/series")}/${id}`;
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <SeriesToolbar query={query} onQueryChange={onQueryChange} />

      {/* Error banner */}
      {error && <InlineBanner error={error} onRetry={onRetry} />}

      {/* Series list */}
      <SeriesList items={items} loading={loading} onOpenSeries={handleOpenSeries} />

      {/* Pagination */}
      {meta && (
        <PaginationControls
          meta={meta}
          onPageChange={(page) => onQueryChange({ ...query, page })}
          onSizeChange={(size) => onQueryChange({ ...query, size, page: 1 })}
        />
      )}
    </div>
  );
};

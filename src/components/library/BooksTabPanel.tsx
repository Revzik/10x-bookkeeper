import type {
  LibraryBooksQueryViewModel,
  BookListItemViewModel,
  SeriesSelectOptionViewModel,
  PaginationMetaDto,
  ApiErrorDto,
} from "@/types";
import { BooksToolbar } from "@/components/library/BooksToolbar";
import { BooksList } from "@/components/library/BooksList";
import { PaginationControls } from "@/components/library/PaginationControls";
import { InlineBanner } from "@/components/library/InlineBanner";
import { useT } from "@/i18n/react";
import { withLocalePath } from "@/i18n";

interface BooksTabPanelProps {
  query: LibraryBooksQueryViewModel;
  onQueryChange: (next: LibraryBooksQueryViewModel) => void;
  items: BookListItemViewModel[];
  meta: PaginationMetaDto | null;
  loading: boolean;
  error: ApiErrorDto | null;
  seriesOptions: SeriesSelectOptionViewModel[];
  onRetry: () => void;
}

/**
 * BooksTabPanel - Books list UI with search, filters, and pagination
 */
export const BooksTabPanel = ({
  query,
  onQueryChange,
  items,
  meta,
  loading,
  error,
  seriesOptions,
  onRetry,
}: BooksTabPanelProps) => {
  const { locale } = useT();
  const handleOpenBook = (id: string) => {
    window.location.href = `${withLocalePath(locale, "/books")}/${id}`;
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <BooksToolbar query={query} seriesOptions={seriesOptions} onQueryChange={onQueryChange} />

      {/* Error banner */}
      {error && <InlineBanner error={error} onRetry={onRetry} />}

      {/* Books list */}
      <BooksList items={items} loading={loading} onOpenBook={handleOpenBook} />

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

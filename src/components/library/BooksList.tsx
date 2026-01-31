import type { BookListItemViewModel } from "@/types";
import { BookRow } from "@/components/library/BookRow";
import { EntrySkeleton } from "@/components/shared/EntrySkeleton";
import { useT } from "@/i18n/react";

interface BooksListProps {
  items: BookListItemViewModel[];
  loading: boolean;
  onOpenBook: (id: string) => void;
}

/**
 * BooksList - Display books results with loading and empty states
 */
export const BooksList = ({ items, loading, onOpenBook }: BooksListProps) => {
  const { t } = useT();
  if (loading) {
    return <EntrySkeleton data-testid="books-list-loading" />;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center" data-testid="books-list-empty">
        <p className="mb-4 text-foreground">{t("library.empty.booksTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("library.empty.booksSubtitle")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="books-list">
      {items.map((book) => (
        <BookRow key={book.id} book={book} onClick={() => onOpenBook(book.id)} />
      ))}
    </div>
  );
};

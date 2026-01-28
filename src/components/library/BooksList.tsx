import type { BookListItemViewModel } from "@/types";
import { BookRow } from "@/components/library/BookRow";
import { EntrySkeleton } from "@/components/shared/EntrySkeleton";

interface BooksListProps {
  items: BookListItemViewModel[];
  loading: boolean;
  onOpenBook: (id: string) => void;
}

/**
 * BooksList - Display books results with loading and empty states
 */
export const BooksList = ({ items, loading, onOpenBook }: BooksListProps) => {
  if (loading) {
    return <EntrySkeleton data-test-id="books-list-loading" />;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center" data-test-id="books-list-empty">
        <p className="mb-4 text-foreground">No books found</p>
        <p className="text-sm text-muted-foreground">Try adjusting your filters or add your first book</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-test-id="books-list">
      {items.map((book) => (
        <BookRow key={book.id} book={book} onClick={() => onOpenBook(book.id)} />
      ))}
    </div>
  );
};

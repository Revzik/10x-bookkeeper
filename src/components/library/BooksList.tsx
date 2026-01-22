import type { BookListItemViewModel } from "@/types";
import { BookRow } from "@/components/library/BookRow";
import { Skeleton } from "../ui/skeleton";

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
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <p className="mb-4 text-foreground">No books found</p>
        <p className="text-sm text-muted-foreground">Try adjusting your filters or add your first book</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((book) => (
        <BookRow key={book.id} book={book} onClick={() => onOpenBook(book.id)} />
      ))}
    </div>
  );
};

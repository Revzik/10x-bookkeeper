import type { BookListItemViewModel } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { BookStatusBadge } from "@/components/shared/BookStatusBadge";

interface BookRowProps {
  book: BookListItemViewModel;
  onClick: () => void;
}

/**
 * BookRow - Single book item in the list
 */
export const BookRow = ({ book, onClick }: BookRowProps) => {
  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      data-test-id={`book-card-${book.id}`}
    >
      <CardContent className="flex items-center gap-4 p-4">
        {/* Main info */}
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-card-foreground" data-test-id="book-card-title">
            {book.title}
          </h3>
          <p className="text-sm text-muted-foreground" data-test-id="book-card-author">
            {book.author}
          </p>
        </div>

        {/* Status badge */}
        <div data-test-id="book-card-status">
          <BookStatusBadge status={book.status} />
        </div>

        {/* Progress */}
        <div className="text-right" data-test-id="book-card-progress">
          <div className="text-sm font-medium text-foreground" data-test-id="book-card-progress-label">
            {book.progressLabel}
          </div>
          <div className="text-xs text-muted-foreground" data-test-id="book-card-progress-percent">
            {book.progressPercent}%
          </div>
        </div>

        {/* Updated timestamp */}
        <div className="text-right" data-test-id="book-card-updated">
          <div className="text-xs text-muted-foreground">Updated</div>
          <div className="text-xs text-foreground" data-test-id="book-card-updated-label">
            {book.updatedAtLabel}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

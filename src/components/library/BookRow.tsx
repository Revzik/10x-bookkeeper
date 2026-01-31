import type { BookListItemViewModel } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { BookStatusBadge } from "@/components/shared/BookStatusBadge";
import { useT } from "@/i18n/react";

interface BookRowProps {
  book: BookListItemViewModel;
  onClick: () => void;
}

/**
 * BookRow - Single book item in the list
 */
export const BookRow = ({ book, onClick }: BookRowProps) => {
  const { t } = useT();
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
      data-testid={`book-card-${book.id}`}
    >
      <CardContent className="flex items-center gap-4 p-4">
        {/* Main info */}
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-card-foreground" data-testid="book-card-title">
            {book.title}
          </h3>
          <p className="text-sm text-muted-foreground" data-testid="book-card-author">
            {book.author}
          </p>
        </div>

        {/* Status badge */}
        <div data-testid="book-card-status">
          <BookStatusBadge status={book.status} />
        </div>

        {/* Progress */}
        <div className="text-right" data-testid="book-card-progress">
          <div className="text-sm font-medium text-foreground" data-testid="book-card-progress-label">
            {book.progressLabel}
          </div>
          <div className="text-xs text-muted-foreground" data-testid="book-card-progress-percent">
            {book.progressPercent}%
          </div>
        </div>

        {/* Updated timestamp */}
        <div className="text-right" data-testid="book-card-updated">
          <div className="text-xs text-muted-foreground">{t("book.updated")}</div>
          <div className="text-xs text-foreground" data-testid="book-card-updated-label">
            {book.updatedAtLabel}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

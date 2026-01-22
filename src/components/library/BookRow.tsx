import type { BookListItemViewModel, BookStatus } from "@/types";
import { Card, CardContent } from "@/components/ui/card";

interface BookRowProps {
  book: BookListItemViewModel;
  onClick: () => void;
}

/**
 * BookRow - Single book item in the list
 */
export const BookRow = ({ book, onClick }: BookRowProps) => {
  const statusLabels: Record<BookStatus, string> = {
    want_to_read: "Want to Read",
    reading: "Reading",
    completed: "Completed",
  };

  const statusColors: Record<BookStatus, string> = {
    want_to_read: "bg-secondary text-secondary-foreground",
    reading: "bg-accent text-accent-foreground",
    completed: "bg-primary/10 text-primary",
  };

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
    >
      <CardContent className="flex items-center gap-4 p-4">
        {/* Main info */}
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-card-foreground">{book.title}</h3>
          <p className="text-sm text-muted-foreground">{book.author}</p>
        </div>

        {/* Status badge */}
        <div>
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
              statusColors[book.status] || "bg-secondary text-secondary-foreground"
            }`}
          >
            {statusLabels[book.status] || book.status}
          </span>
        </div>

        {/* Progress */}
        <div className="text-right">
          <div className="text-sm font-medium text-foreground">{book.progressLabel}</div>
          <div className="text-xs text-muted-foreground">{book.progressPercent}%</div>
        </div>

        {/* Updated timestamp */}
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Updated</div>
          <div className="text-xs text-foreground">{book.updatedAtLabel}</div>
        </div>
      </CardContent>
    </Card>
  );
};

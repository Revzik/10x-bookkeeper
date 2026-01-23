import type { SeriesBookRowViewModel, BookStatus } from "@/types";
import { BookRow } from "@/components/library/BookRow";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SeriesBookRowProps {
  book: SeriesBookRowViewModel;
  isEditing: boolean;
  onOpen: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}

/**
 * SeriesBookRow - Renders a single book row with edit mode support
 *
 * Responsibilities:
 * - In view mode: delegates to BookRow for standard rendering
 * - In edit mode: renders with move up/down buttons and position indicator
 * - Prevents navigation in edit mode
 * - Provides keyboard-accessible controls for reordering
 */
export const SeriesBookRow = ({ book, isEditing, onOpen, onMoveUp, onMoveDown }: SeriesBookRowProps) => {
  // View mode: use the standard BookRow component
  if (!isEditing) {
    return <BookRow book={book} onClick={() => onOpen(book.id)} />;
  }

  // Edit mode: custom rendering with reorder controls
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
    <Card className="border-2 border-dashed">
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

        {/* Reorder controls */}
        <div className="flex flex-col gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onMoveUp(book.id)}
            disabled={book.isMoveUpDisabled}
            aria-label={`Move ${book.title} up`}
            className="h-7 px-2 text-xs"
          >
            ↑
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onMoveDown(book.id)}
            disabled={book.isMoveDownDisabled}
            aria-label={`Move ${book.title} down`}
            className="h-7 px-2 text-xs"
          >
            ↓
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

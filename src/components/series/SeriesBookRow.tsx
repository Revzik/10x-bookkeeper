import type { SeriesBookRowViewModel } from "@/types";
import { BookRow } from "@/components/library/BookRow";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown } from "lucide-react";

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
  // TODO: during refactor. Extract the cards to a separate components (SeriesBookRowEditMode, SeriesBookRowViewMode)
  if (!isEditing) {
    return <BookRow book={book} onClick={() => onOpen(book.id)} />;
  }

  return (
    <Card className="border-2 border-dashed">
      <CardContent className="flex items-center gap-4 p-4">
        {/* Main info */}
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-card-foreground">{book.title}</h3>
          <p className="text-sm text-muted-foreground">{book.author}</p>
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
            <ChevronUp className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onMoveDown(book.id)}
            disabled={book.isMoveDownDisabled}
            aria-label={`Move ${book.title} down`}
            className="h-7 px-2 text-xs"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

import type { ChapterListItemViewModel } from "@/types";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Card, CardContent } from "../ui/card";

interface BookChapterRowProps {
  item: ChapterListItemViewModel;
  isEditing: boolean;
  isMoveUpDisabled?: boolean;
  isMoveDownDisabled?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

/**
 * BookChapterRow - Single chapter row with edit/delete controls
 *
 * Features:
 * - Chapter title display
 * - Updated timestamp
 * - Edit/Delete buttons in view mode
 * - Move up/down buttons in reorder mode
 */
export const BookChapterRow = ({
  item,
  isEditing,
  isMoveUpDisabled = false,
  isMoveDownDisabled = false,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
}: BookChapterRowProps) => {
  // TODO: during refactor. Extract the cards to a separate components (BookChapterRowEditMode, BookChapterRowViewMode)
  return (
    <Card className="border-2 border-dashed">
      <CardContent className="flex items-center gap-4 p-4">
        {/* Left section: Chapter info */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-card-foreground">{item.title}</h3>
          <p className="text-xs text-muted-foreground mt-1">Updated {item.updatedAtLabel}</p>
        </div>

        {/* Right section: Action buttons */}
        {isEditing ? (
          <div className="flex flex-col gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onMoveUp}
              disabled={isMoveUpDisabled}
              aria-label="Move chapter up"
              className="h-7 px-2 text-xs"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onMoveDown}
              disabled={isMoveDownDisabled}
              aria-label="Move chapter down"
              className="h-7 px-2 text-xs"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onEdit} aria-label="Edit chapter">
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-destructive"
              aria-label="Delete chapter"
            >
              Delete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

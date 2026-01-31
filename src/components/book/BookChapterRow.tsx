import type { ChapterListItemViewModel } from "@/types";
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { useT } from "@/i18n/react";
import { cn } from "@/lib/utils";

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
  const { t } = useT();
  // TODO: during refactor. Extract the cards to a separate components (BookChapterRowEditMode, BookChapterRowViewMode)
  return (
    <Card className={cn(isEditing && "border-2 border-dashed")}>
      <CardContent className="flex items-center gap-4 p-4">
        {/* Left section: Chapter info */}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-card-foreground">{item.title}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {t("book.chapters.updatedAt", { date: item.updatedAtLabel })}
          </p>
        </div>

        {/* Right section: Action buttons */}
        {isEditing ? (
          <div className="flex flex-col gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onMoveUp}
              disabled={isMoveUpDisabled}
              aria-label={t("book.chapters.moveUpAria", { title: item.title })}
              className="h-7 px-2 text-xs"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onMoveDown}
              disabled={isMoveDownDisabled}
              aria-label={t("book.chapters.moveDownAria", { title: item.title })}
              className="h-7 px-2 text-xs"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              aria-label={t("book.chapters.editAria", { title: item.title })}
            >
              {t("common.actions.edit")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-destructive"
              aria-label={t("book.chapters.deleteAria", { title: item.title })}
            >
              {t("common.actions.delete")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

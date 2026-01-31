import type { ChapterListItemViewModel } from "@/types";
import { BookChapterRow } from "./BookChapterRow";
import { EntrySkeleton } from "@/components/shared/EntrySkeleton";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/react";

interface BookChaptersListProps {
  items: ChapterListItemViewModel[];
  loading: boolean;
  isEditing: boolean;
  draftOrderIds: string[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveUp?: (id: string) => void;
  onMoveDown?: (id: string) => void;
  onAddChapter: () => void;
}

/**
 * BookChaptersList - Render chapters list with loading/empty states
 *
 * Features:
 * - Loading skeleton
 * - Empty state with call-to-action
 * - List of chapter rows with reorder support
 * - Reorders items based on draftOrderIds in edit mode
 */
export const BookChaptersList = ({
  items,
  loading,
  isEditing,
  draftOrderIds,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onAddChapter,
}: BookChaptersListProps) => {
  const { t } = useT();
  if (loading) {
    return <EntrySkeleton />;
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <p className="mb-4 text-foreground">{t("book.chapters.emptyTitle")}</p>
        <p className="text-sm text-muted-foreground mb-6">{t("book.chapters.emptySubtitle")}</p>
        <Button onClick={onAddChapter}>{t("book.chapters.add")}</Button>
      </div>
    );
  }

  // In edit mode, reorder items based on draftOrderIds
  const orderedItems = isEditing
    ? draftOrderIds
        .map((id) => items.find((item) => item.id === id))
        .filter((item): item is ChapterListItemViewModel => item !== undefined)
    : items;

  return (
    <div className="space-y-3">
      {orderedItems.map((chapter, index) => (
        <BookChapterRow
          key={chapter.id}
          item={chapter}
          isEditing={isEditing}
          isMoveUpDisabled={index === 0}
          isMoveDownDisabled={index === orderedItems.length - 1}
          onEdit={() => onEdit(chapter.id)}
          onDelete={() => onDelete(chapter.id)}
          onMoveUp={onMoveUp ? () => onMoveUp(chapter.id) : undefined}
          onMoveDown={onMoveDown ? () => onMoveDown(chapter.id) : undefined}
        />
      ))}
    </div>
  );
};

import { useState, useMemo } from "react";
import type { ChapterListItemViewModel } from "@/types";
import { useChaptersList, useChaptersReorder } from "./hooks";
import { BookChaptersHeaderRow } from "./BookChaptersHeaderRow";
import { BookChaptersList } from "./BookChaptersList";
import { InlineBanner } from "@/components/library/InlineBanner";
import { AddChapterDialog } from "./AddChapterDialog";
import { EditChapterDialog } from "./EditChapterDialog";
import { DeleteChapterDialog } from "./DeleteChapterDialog";
import { useT } from "@/i18n/react";

interface BookChaptersTabPanelProps {
  bookId: string;
  onChaptersChanged?: () => void;
}

/**
 * BookChaptersTabPanel - Chapter management UI
 *
 * Features:
 * - List chapters in order
 * - Create/edit/delete chapters (dialogs to be implemented)
 * - (Future) Reorder chapters
 */
export const BookChaptersTabPanel = ({ bookId, onChaptersChanged }: BookChaptersTabPanelProps) => {
  const { t } = useT();
  const { items, loading, error, refetch } = useChaptersList(bookId);

  // Dialog state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<ChapterListItemViewModel | null>(null);

  // Reorder state and handlers
  const reorderHook = useChaptersReorder(items, refetch);
  const { state: reorderState, enterEditMode, exitEditMode, moveUp, moveDown, discard, save } = reorderHook;

  // Calculate suggested order for new chapters (max order + 1)
  const suggestedOrder = useMemo(() => {
    if (items.length === 0) return 0;
    const maxOrder = Math.max(...items.map((item) => item.order));
    return maxOrder + 1;
  }, [items]);

  // Dialog handlers
  const handleOpenAdd = () => {
    // Don't allow adding chapters while in edit mode
    if (reorderState.isEditing) return;
    setIsAddOpen(true);
  };

  const handleOpenEdit = (chapterId: string) => {
    // Don't allow editing while in reorder mode
    if (reorderState.isEditing) return;

    const chapter = items.find((c) => c.id === chapterId);
    if (chapter) {
      setSelectedChapter(chapter);
      setIsEditOpen(true);
    }
  };

  const handleOpenDelete = (chapterId: string) => {
    // Don't allow deleting while in reorder mode
    if (reorderState.isEditing) return;

    const chapter = items.find((c) => c.id === chapterId);
    if (chapter) {
      setSelectedChapter(chapter);
      setIsDeleteOpen(true);
    }
  };

  const handleCreated = () => {
    setIsAddOpen(false);
    refetch();
    onChaptersChanged?.();
  };

  const handleUpdated = () => {
    setIsEditOpen(false);
    setSelectedChapter(null);
    refetch();
    onChaptersChanged?.();
  };

  const handleDeleted = () => {
    setIsDeleteOpen(false);
    setSelectedChapter(null);
    refetch();
    onChaptersChanged?.();
  };

  // Reorder handlers
  const handleToggleReorder = () => {
    if (reorderState.isEditing) {
      exitEditMode();
    } else {
      enterEditMode();
    }
  };

  const handleSaveReorder = async () => {
    await save();
    onChaptersChanged?.();
  };

  const handleDiscardReorder = () => {
    discard();
  };

  return (
    <div className="space-y-4">
      {/* Header row with actions */}
      <BookChaptersHeaderRow
        onAdd={handleOpenAdd}
        reorder={{
          isEditing: reorderState.isEditing,
          isDirty: reorderState.isDirty,
          isSaving: reorderState.isSaving,
          isDisabled: loading || items.length === 0,
          disabledReason: items.length === 0 ? t("book.chapters.reorderDisabled") : undefined,
        }}
        onToggleReorder={handleToggleReorder}
        onSaveReorder={handleSaveReorder}
        onDiscardReorder={handleDiscardReorder}
      />

      {/* Error banner (list error or reorder error) */}
      {error && <InlineBanner error={error} onRetry={refetch} />}
      {reorderState.saveError && <InlineBanner error={reorderState.saveError} />}

      {/* Chapters list */}
      <BookChaptersList
        items={items}
        loading={loading}
        isEditing={reorderState.isEditing}
        draftOrderIds={reorderState.draftOrderIds}
        onEdit={handleOpenEdit}
        onDelete={handleOpenDelete}
        onMoveUp={moveUp}
        onMoveDown={moveDown}
        onAddChapter={handleOpenAdd}
      />

      {/* Dialogs */}
      <AddChapterDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        bookId={bookId}
        suggestedOrder={suggestedOrder}
        onCreated={handleCreated}
      />

      {selectedChapter && (
        <>
          <EditChapterDialog
            open={isEditOpen}
            onOpenChange={setIsEditOpen}
            chapter={selectedChapter}
            onUpdated={handleUpdated}
          />

          <DeleteChapterDialog
            open={isDeleteOpen}
            onOpenChange={setIsDeleteOpen}
            chapterId={selectedChapter.id}
            chapterTitle={selectedChapter.title}
            onDeleted={handleDeleted}
          />
        </>
      )}
    </div>
  );
};

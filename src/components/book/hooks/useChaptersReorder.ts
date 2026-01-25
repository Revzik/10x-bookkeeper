import { useState, useCallback, useMemo } from "react";
import type { ChapterListItemViewModel, BookChaptersReorderStateViewModel, ApiErrorDto } from "@/types";
import { apiClient } from "@/lib/api/client";

interface UseChaptersReorderResult {
  state: BookChaptersReorderStateViewModel;
  enterEditMode: () => void;
  exitEditMode: () => void;
  moveUp: (id: string) => void;
  moveDown: (id: string) => void;
  discard: () => void;
  save: () => Promise<void>;
}

/**
 * Hook to manage chapter reordering state and operations
 *
 * Features:
 * - Enter/exit edit mode
 * - Move chapters up/down
 * - Track dirty state
 * - Save changes (PATCH each changed chapter)
 * - Discard changes (restore server order)
 */
export const useChaptersReorder = (
  items: ChapterListItemViewModel[],
  onSaveSuccess: () => void
): UseChaptersReorderResult => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<ApiErrorDto | null>(null);

  // Server order snapshot (ids in current order)
  const [serverOrderIds, setServerOrderIds] = useState<string[]>([]);

  // Draft order (modified by move operations)
  const [draftOrderIds, setDraftOrderIds] = useState<string[]>([]);

  // Compute dirty state
  const isDirty = useMemo(() => {
    if (!isEditing) return false;
    if (serverOrderIds.length !== draftOrderIds.length) return false;

    return serverOrderIds.some((id, index) => id !== draftOrderIds[index]);
  }, [isEditing, serverOrderIds, draftOrderIds]);

  // Enter edit mode: snapshot current order
  const enterEditMode = useCallback(() => {
    const currentIds = items.map((item) => item.id);
    setServerOrderIds(currentIds);
    setDraftOrderIds(currentIds);
    setIsEditing(true);
    setSaveError(null);
  }, [items]);

  // Exit edit mode: clear state
  const exitEditMode = useCallback(() => {
    setIsEditing(false);
    setServerOrderIds([]);
    setDraftOrderIds([]);
    setSaveError(null);
  }, []);

  // Move chapter up (swap with previous)
  const moveUp = useCallback(
    (id: string) => {
      const index = draftOrderIds.indexOf(id);
      if (index <= 0) return; // Already at top

      const newOrder = [...draftOrderIds];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      setDraftOrderIds(newOrder);
    },
    [draftOrderIds]
  );

  // Move chapter down (swap with next)
  const moveDown = useCallback(
    (id: string) => {
      const index = draftOrderIds.indexOf(id);
      if (index < 0 || index >= draftOrderIds.length - 1) return; // Already at bottom

      const newOrder = [...draftOrderIds];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      setDraftOrderIds(newOrder);
    },
    [draftOrderIds]
  );

  // Discard changes: restore server order and exit
  const discard = useCallback(() => {
    setDraftOrderIds(serverOrderIds);
    exitEditMode();
  }, [serverOrderIds, exitEditMode]);

  // Save changes: PATCH each chapter with new order
  const save = useCallback(async () => {
    if (!isDirty) return;

    setIsSaving(true);
    setSaveError(null);

    try {
      // For each chapter, if its position changed, PATCH with new order
      const updates = draftOrderIds.map(async (id, newIndex) => {
        const oldIndex = serverOrderIds.indexOf(id);
        if (oldIndex === newIndex) return; // No change

        // Find the chapter to get its current data
        const chapter = items.find((item) => item.id === id);
        if (!chapter) return;

        // PATCH with new order (use newIndex as the order value)
        await apiClient.patchJson(`/chapters/${id}`, {
          order: newIndex,
        });
      });

      await Promise.all(updates);

      // Success: refresh list and exit edit mode
      onSaveSuccess();
      exitEditMode();
    } catch (error) {
      // Handle error: restore server order and show error
      const apiError = error as { error: ApiErrorDto };
      const errorDto = apiError.error || {
        code: "INTERNAL_ERROR" as const,
        message: "Failed to save chapter order",
      };

      setSaveError(errorDto);
      setDraftOrderIds(serverOrderIds); // Restore original order
    } finally {
      setIsSaving(false);
    }
  }, [isDirty, draftOrderIds, serverOrderIds, items, onSaveSuccess, exitEditMode]);

  const state: BookChaptersReorderStateViewModel = {
    isEditing,
    isDirty,
    isSaving,
    serverOrderIds,
    draftOrderIds,
    saveError,
  };

  return {
    state,
    enterEditMode,
    exitEditMode,
    moveUp,
    moveDown,
    discard,
    save,
  };
};

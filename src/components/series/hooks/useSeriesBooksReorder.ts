import { useState, useCallback, useEffect, useRef } from "react";
import type { BookListItemViewModel, ApiErrorDto, UpdateBookCommand, UpdateBookResponseDto } from "@/types";
import { apiClient } from "@/lib/api/client";

interface UseSeriesBooksReorderParams {
  items: BookListItemViewModel[];
  isEditing: boolean;
}

interface UseSeriesBooksReorderResult {
  draftOrderIds: string[];
  isDirty: boolean;
  isSaving: boolean;
  saveError: ApiErrorDto | null;
  moveUp: (id: string) => void;
  moveDown: (id: string) => void;
  setDraftOrderIds: (ids: string[]) => void;
  discard: () => void;
  save: () => Promise<void>;
}

/**
 * Hook to manage series books reordering state
 *
 * Responsibilities:
 * - Snapshot original order when entering edit mode (once per edit session)
 * - Track draft order during editing
 * - Compute dirty state (draft !== server)
 * - Provide move up/down helpers
 * - Provide discard function to restore original order
 * - Provide save function placeholder (will implement API calls in later steps)
 */
export const useSeriesBooksReorder = ({
  items,
  isEditing,
}: UseSeriesBooksReorderParams): UseSeriesBooksReorderResult => {
  const [serverOrderIds, setServerOrderIds] = useState<string[]>([]);
  const [draftOrderIds, setDraftOrderIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<ApiErrorDto | null>(null);

  // Track if we've already initialized for this edit session
  const hasInitializedRef = useRef(false);

  // Snapshot order when entering edit mode (only once per edit session)
  useEffect(() => {
    if (isEditing && !hasInitializedRef.current) {
      // First time entering edit mode - snapshot the order
      const currentIds = items.map((item) => item.id);
      setServerOrderIds(currentIds);
      setDraftOrderIds(currentIds);
      hasInitializedRef.current = true;
    } else if (!isEditing) {
      // Exiting edit mode - reset for next edit session
      hasInitializedRef.current = false;
      setServerOrderIds([]);
      setDraftOrderIds([]);
    }
  }, [isEditing, items]);

  // Compute dirty state
  const isDirty =
    isEditing &&
    serverOrderIds.length === draftOrderIds.length &&
    !serverOrderIds.every((id, index) => id === draftOrderIds[index]);

  // Move up: swap with previous item
  const moveUp = useCallback(
    (id: string) => {
      const index = draftOrderIds.indexOf(id);
      if (index <= 0) return; // Already at top or not found

      const newOrder = [...draftOrderIds];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      setDraftOrderIds(newOrder);
    },
    [draftOrderIds]
  );

  // Move down: swap with next item
  const moveDown = useCallback(
    (id: string) => {
      const index = draftOrderIds.indexOf(id);
      if (index < 0 || index >= draftOrderIds.length - 1) return; // At bottom or not found

      const newOrder = [...draftOrderIds];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      setDraftOrderIds(newOrder);
    },
    [draftOrderIds]
  );

  // Discard changes: restore server order
  const discard = useCallback(() => {
    setDraftOrderIds(serverOrderIds);
    setSaveError(null);
  }, [serverOrderIds]);

  // Save changes: update series_order for changed books
  const save = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      // TODO: Replace with dedicated bulk endpoint: PATCH /api/v1/series/:seriesId/reorder
      // This endpoint should accept: { books: [{ id: string, series_order: number }] }
      // and update all books in a single database transaction for better performance
      // and atomicity. This will eliminate the need for sequential PATCH calls below.

      // Current implementation: Update books sequentially using existing endpoint
      // Determine which books changed position
      const changedBooks = draftOrderIds
        .map((id, index) => {
          const serverIndex = serverOrderIds.indexOf(id);
          if (serverIndex !== index) {
            return { id, newOrder: index + 1 }; // 1-based series_order
          }
          return null;
        })
        .filter((book): book is { id: string; newOrder: number } => book !== null);

      // Update each changed book sequentially
      for (const book of changedBooks) {
        const command: UpdateBookCommand = {
          series_order: book.newOrder,
        };
        await apiClient.patchJson<UpdateBookCommand, UpdateBookResponseDto>(`/books/${book.id}`, command);
      }

      // On success: update server snapshot
      setServerOrderIds(draftOrderIds);
    } catch (err) {
      const apiError = err as { error: ApiErrorDto };
      setSaveError(apiError.error || { code: "INTERNAL_ERROR", message: "apiErrors.internal" });

      // On failure: restore original order
      setDraftOrderIds(serverOrderIds);
    } finally {
      setIsSaving(false);
    }
  }, [draftOrderIds, serverOrderIds]);

  return {
    draftOrderIds,
    isDirty,
    isSaving,
    saveError,
    moveUp,
    moveDown,
    setDraftOrderIds,
    discard,
    save,
  };
};

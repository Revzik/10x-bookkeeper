import { useState, useEffect, useCallback } from "react";
import type {
  NoteListItemViewModel,
  ApiErrorDto,
  ListNotesResponseDto,
  PaginationMetaDto,
  BookNotesQueryViewModel,
} from "@/types";
import { apiClient } from "@/lib/api/client";
import { transformNoteListItem } from "./transformers";

interface UseNotesListParams extends BookNotesQueryViewModel {
  book_id: string;
}

interface UseNotesListResult {
  items: NoteListItemViewModel[];
  meta: PaginationMetaDto | null;
  loading: boolean;
  error: ApiErrorDto | null;
  refetch: () => void;
}

/**
 * Fetch notes for a book with optional chapter filter and pagination
 *
 * Handles:
 * - Loading state
 * - Error state
 * - Pagination metadata
 * - Transformation to NoteListItemViewModel[]
 *
 * Note: Notes are returned in API order (typically by updated_at desc).
 * Client-side grouping and chapter-order sorting happens in the component.
 */
export const useNotesList = (params: UseNotesListParams): UseNotesListResult => {
  const [items, setItems] = useState<NoteListItemViewModel[]>([]);
  const [meta, setMeta] = useState<PaginationMetaDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiErrorDto | null>(null);

  const { book_id, chapter_id, page, size } = params;

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.getJson<ListNotesResponseDto>("/notes", {
        book_id,
        chapter_id,
        page,
        size,
      });

      const viewModels = response.notes.map(transformNoteListItem);
      setItems(viewModels);
      setMeta(response.meta);
    } catch (err) {
      const apiError = err as { error: ApiErrorDto };
      const errorDto = apiError.error || {
        code: "INTERNAL_ERROR" as const,
        message: "apiErrors.internal",
      };

      setError(errorDto);
      setItems([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [book_id, chapter_id, page, size]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const refetch = useCallback(() => {
    fetchNotes();
  }, [fetchNotes]);

  return { items, meta, loading, error, refetch };
};

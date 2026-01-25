import { useState, useEffect, useCallback } from "react";
import type { ChapterListItemViewModel, ApiErrorDto, ListChaptersResponseDto } from "@/types";
import { apiClient } from "@/lib/api/client";
import { transformChapterListItem } from "./transformers";

interface UseChaptersListResult {
  items: ChapterListItemViewModel[];
  loading: boolean;
  error: ApiErrorDto | null;
  refetch: () => void;
}

/**
 * Fetch all chapters for a book
 *
 * Handles:
 * - Loading state
 * - Error state
 * - Transformation to ChapterListItemViewModel[]
 *
 * Note: This hook fetches all chapters without pagination params,
 * which should return all chapters sorted by order (asc).
 */
export const useChaptersList = (bookId: string): UseChaptersListResult => {
  const [items, setItems] = useState<ChapterListItemViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiErrorDto | null>(null);

  const fetchChapters = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all chapters sorted by order (asc)
      const response = await apiClient.getJson<ListChaptersResponseDto>(`/books/${bookId}/chapters`, {
        page: 1,
        size: 100,
        sort: "order",
        order: "asc",
      });
      const viewModels = response.chapters.map(transformChapterListItem);
      setItems(viewModels);
    } catch (err) {
      const apiError = err as { error: ApiErrorDto };
      const errorDto = apiError.error || { code: "INTERNAL_ERROR", message: "Failed to fetch chapters" };

      setError(errorDto);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    fetchChapters();
  }, [fetchChapters]);

  const refetch = useCallback(() => {
    fetchChapters();
  }, [fetchChapters]);

  return { items, loading, error, refetch };
};

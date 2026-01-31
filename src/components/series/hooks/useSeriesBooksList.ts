import { useState, useEffect, useCallback } from "react";
import type { BookListItemViewModel, ApiErrorDto, ListBooksResponseDto } from "@/types";
import { apiClient } from "@/lib/api/client";
import { transformBookListItem } from "@/components/library/hooks/transformers";

interface UseSeriesBooksListResult {
  items: BookListItemViewModel[];
  loading: boolean;
  error: ApiErrorDto | null;
  refetch: () => void;
}

/**
 * Fetch all books for a given series
 * Does not use pagination - loads all books in the series
 * Sorts by series_order (client-side) with nulls last, then by title as fallback
 */
export const useSeriesBooksList = (seriesId: string): UseSeriesBooksListResult => {
  const [items, setItems] = useState<BookListItemViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiErrorDto | null>(null);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.getJson<ListBooksResponseDto>("/books", {
        series_id: seriesId,
        // No pagination, search, filter, or sort params
        // Backend will return all books for this series
      });

      // Transform to view models
      const transformed = response.books.map(transformBookListItem);

      // Sort by series_order ASCENDING (book 1 at top, book 2 below, etc.)
      // Books with null/undefined series_order are pushed to the end
      const sorted = transformed.sort((a, b) => {
        if (a.seriesOrder === null && b.seriesOrder === null) {
          return a.title.localeCompare(b.title);
        }
        if (a.seriesOrder === null) return 1; // a goes to end
        if (b.seriesOrder === null) return -1; // b goes to end

        // Both have series_order: sort ascending (1, 2, 3, ...)
        if (a.seriesOrder !== b.seriesOrder) {
          return a.seriesOrder - b.seriesOrder;
        }

        // Same series_order: fallback to title alphabetically
        return a.title.localeCompare(b.title);
      });

      setItems(sorted);
    } catch (err) {
      const apiError = err as { error: ApiErrorDto };
      setError(apiError.error || { code: "INTERNAL_ERROR", message: "apiErrors.internal" });
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [seriesId]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const refetch = useCallback(() => {
    fetchBooks();
  }, [fetchBooks]);

  return { items, loading, error, refetch };
};

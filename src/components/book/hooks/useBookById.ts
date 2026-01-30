import { useState, useEffect, useCallback } from "react";
import type { BookHeaderViewModel, ApiErrorDto, GetBookResponseDto, GetSeriesResponseDto } from "@/types";
import { apiClient } from "@/lib/api/client";
import { transformBookHeader } from "./transformers";

interface UseBookByIdResult {
  book: BookHeaderViewModel | null;
  loading: boolean;
  error: ApiErrorDto | null;
  notFound: boolean;
  refetch: () => void;
}

/**
 * Fetch a single book by ID
 *
 * Handles:
 * - Loading state
 * - Error state with specific 404 handling
 * - Transformation to BookHeaderViewModel
 */
export const useBookById = (bookId: string): UseBookByIdResult => {
  const [book, setBook] = useState<BookHeaderViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiErrorDto | null>(null);
  const [notFound, setNotFound] = useState(false);

  const fetchBook = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const response = await apiClient.getJson<GetBookResponseDto>(`/books/${bookId}`);
      if (response.book.series_id) {
        const seriesResponse = await apiClient.getJson<GetSeriesResponseDto>(`/series/${response.book.series_id}`);
        setBook(transformBookHeader(response.book, seriesResponse.series.title));
      } else {
        setBook(transformBookHeader(response.book));
      }
    } catch (err) {
      const apiError = err as { error: ApiErrorDto };
      const errorDto = apiError.error || { code: "INTERNAL_ERROR", message: "apiErrors.internal" };

      setError(errorDto);
      setBook(null);

      // Mark as not found for 404 or VALIDATION_ERROR (invalid UUID)
      if (errorDto.code === "NOT_FOUND" || errorDto.code === "VALIDATION_ERROR") {
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  }, [bookId]);

  useEffect(() => {
    fetchBook();
  }, [fetchBook]);

  const refetch = useCallback(() => {
    fetchBook();
  }, [fetchBook]);

  return { book, loading, error, notFound, refetch };
};

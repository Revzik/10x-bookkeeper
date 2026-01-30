import { useState, useEffect, useCallback } from "react";
import type { SeriesHeaderViewModel, ApiErrorDto, GetSeriesResponseDto } from "@/types";
import { apiClient } from "@/lib/api/client";
import { transformSeriesHeader } from "./transformers";

interface UseSeriesByIdResult {
  series: SeriesHeaderViewModel | null;
  loading: boolean;
  error: ApiErrorDto | null;
  notFound: boolean;
  refetch: () => void;
}

/**
 * Fetch a single series by ID
 *
 * Handles:
 * - Loading state
 * - Error state with specific 404 handling
 * - Transformation to SeriesHeaderViewModel
 */
export const useSeriesById = (seriesId: string): UseSeriesByIdResult => {
  const [series, setSeries] = useState<SeriesHeaderViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiErrorDto | null>(null);
  const [notFound, setNotFound] = useState(false);

  const fetchSeries = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const response = await apiClient.getJson<GetSeriesResponseDto>(`/series/${seriesId}`);

      // Fetch book count for this series
      let bookCount = 0;
      try {
        const booksResponse = await apiClient.getJson<{ books: unknown[]; meta: { total_items: number } }>("/books", {
          series_id: seriesId,
          size: 1, // We only need the count, not the actual books
        });
        bookCount = booksResponse.meta.total_items;
      } catch {
        // If fetching book count fails, default to 0
        bookCount = 0;
      }

      setSeries(transformSeriesHeader(response.series, bookCount));
    } catch (err) {
      const apiError = err as { error: ApiErrorDto };
      const errorDto = apiError.error || { code: "INTERNAL_ERROR", message: "apiErrors.internal" };

      setError(errorDto);
      setSeries(null);

      // Mark as not found for 404 or VALIDATION_ERROR (invalid UUID)
      if (errorDto.code === "NOT_FOUND" || errorDto.code === "VALIDATION_ERROR") {
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  }, [seriesId]);

  useEffect(() => {
    fetchSeries();
  }, [fetchSeries]);

  const refetch = useCallback(() => {
    fetchSeries();
  }, [fetchSeries]);

  return { series, loading, error, notFound, refetch };
};

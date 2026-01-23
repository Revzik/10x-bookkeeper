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
      setSeries(transformSeriesHeader(response.series));
    } catch (err) {
      const apiError = err as { error: ApiErrorDto };
      const errorDto = apiError.error || { code: "INTERNAL_ERROR", message: "Failed to fetch series" };

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

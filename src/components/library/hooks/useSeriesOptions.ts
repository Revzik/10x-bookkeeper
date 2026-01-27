import { useState, useEffect, useCallback } from "react";
import type { SeriesSelectOptionViewModel, ListSeriesResponseDto, ApiErrorDto } from "@/types";
import { apiClient } from "@/lib/api/client";
import { transformSeriesOption } from "./transformers";
import { PAGINATION } from "@/lib/constants";

interface UseSeriesOptionsResult {
  options: SeriesSelectOptionViewModel[];
  loading: boolean;
  error: ApiErrorDto | null;
  refetch: () => void;
}

/**
 * Fetch series options for dropdowns
 * Fetches up to 100 series sorted by title
 */
export const useSeriesOptions = (): UseSeriesOptionsResult => {
  const [options, setOptions] = useState<SeriesSelectOptionViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiErrorDto | null>(null);

  const fetchOptions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.getJson<ListSeriesResponseDto>("/series", {
        page: 1,
        size: PAGINATION.MAX_PAGE_SIZE,
        sort: "title",
        order: "asc",
      });

      setOptions(response.series.map(transformSeriesOption));
    } catch (err) {
      const apiError = err as { error: ApiErrorDto };
      setError(apiError.error || { code: "INTERNAL_ERROR", message: "Failed to fetch series options" });
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  const refetch = useCallback(() => {
    fetchOptions();
  }, [fetchOptions]);

  return { options, loading, error, refetch };
};

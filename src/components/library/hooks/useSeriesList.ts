import { useState, useEffect, useCallback } from "react";
import type {
  LibrarySeriesQueryViewModel,
  SeriesListItemViewModel,
  PaginationMetaDto,
  ApiErrorDto,
  ListSeriesResponseDto,
} from "@/types";
import { apiClient } from "@/lib/api/client";
import { transformSeriesListItem } from "./transformers";

interface UseSeriesListResult {
  items: SeriesListItemViewModel[];
  meta: PaginationMetaDto | null;
  loading: boolean;
  error: ApiErrorDto | null;
  refetch: () => void;
}

/**
 * Fetch series list with query params
 */
export const useSeriesList = (query: LibrarySeriesQueryViewModel): UseSeriesListResult => {
  const [items, setItems] = useState<SeriesListItemViewModel[]>([]);
  const [meta, setMeta] = useState<PaginationMetaDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiErrorDto | null>(null);

  const fetchSeries = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.getJson<ListSeriesResponseDto>("/series", {
        page: query.page,
        size: query.size,
        q: query.q,
        sort: query.sort,
        order: query.order,
      });

      // Fetch book counts for each series in parallel
      const seriesWithCounts = await Promise.all(
        response.series.map(async (series) => {
          try {
            const booksResponse = await apiClient.getJson<{ books: unknown[]; meta: PaginationMetaDto }>("/books", {
              series_id: series.id,
              size: 1, // We only need the count, not the actual books
            });
            return transformSeriesListItem(series, booksResponse.meta.total_items);
          } catch {
            // If fetching book count fails, default to 0
            return transformSeriesListItem(series, 0);
          }
        })
      );

      setItems(seriesWithCounts);
      setMeta(response.meta);
    } catch (err) {
      const apiError = err as { error: ApiErrorDto };
      setError(apiError.error || { code: "INTERNAL_ERROR", message: "Failed to fetch series" });
      setItems([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [query.page, query.size, query.q, query.sort, query.order]);

  useEffect(() => {
    fetchSeries();
  }, [fetchSeries]);

  const refetch = useCallback(() => {
    fetchSeries();
  }, [fetchSeries]);

  return { items, meta, loading, error, refetch };
};

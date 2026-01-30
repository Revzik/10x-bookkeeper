import { useState, useEffect, useCallback } from "react";
import type {
  LibraryBooksQueryViewModel,
  BookListItemViewModel,
  PaginationMetaDto,
  ApiErrorDto,
  ListBooksResponseDto,
} from "@/types";
import { apiClient } from "@/lib/api/client";
import { transformBookListItem } from "./transformers";

interface UseBooksListResult {
  items: BookListItemViewModel[];
  meta: PaginationMetaDto | null;
  loading: boolean;
  error: ApiErrorDto | null;
  refetch: () => void;
}

/**
 * Fetch books list with query params
 */
export const useBooksList = (query: LibraryBooksQueryViewModel): UseBooksListResult => {
  const [items, setItems] = useState<BookListItemViewModel[]>([]);
  const [meta, setMeta] = useState<PaginationMetaDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiErrorDto | null>(null);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.getJson<ListBooksResponseDto>("/books", {
        page: query.page,
        size: query.size,
        q: query.q,
        status: query.status,
        series_id: query.series_id,
        sort: query.sort,
        order: query.order,
      });

      setItems(response.books.map(transformBookListItem));
      setMeta(response.meta);
    } catch (err) {
      const apiError = err as { error: ApiErrorDto };
      setError(apiError.error || { code: "INTERNAL_ERROR", message: "apiErrors.internal" });
      setItems([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [query.page, query.size, query.q, query.status, query.series_id, query.sort, query.order]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const refetch = useCallback(() => {
    fetchBooks();
  }, [fetchBooks]);

  return { items, meta, loading, error, refetch };
};

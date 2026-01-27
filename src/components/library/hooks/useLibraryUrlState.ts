import { useState, useEffect, useCallback } from "react";
import type { LibraryTabViewModel, LibraryBooksQueryViewModel, LibrarySeriesQueryViewModel } from "@/types";
import { PAGINATION, SORT } from "@/lib/constants";

interface LibraryUrlState {
  activeTab: LibraryTabViewModel;
  booksQuery: LibraryBooksQueryViewModel;
  seriesQuery: LibrarySeriesQueryViewModel;
  setActiveTab: (tab: LibraryTabViewModel) => void;
  setBooksQuery: (query: LibraryBooksQueryViewModel) => void;
  setSeriesQuery: (query: LibrarySeriesQueryViewModel) => void;
}

/**
 * Parse and manage URL state for Library view
 * Keeps tab and query params in sync with browser URL
 */
export const useLibraryUrlState = (): LibraryUrlState => {
  const [urlState, setUrlState] = useState(() => {
    // Provide defaults for SSR
    if (typeof window === "undefined") {
      return getDefaultState();
    }
    return parseUrl();
  });

  // Initialize state from URL on client mount
  useEffect(() => {
    setUrlState(parseUrl());
  }, []);

  // Listen to browser navigation (back/forward)
  useEffect(() => {
    const handlePopState = () => {
      setUrlState(parseUrl());
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const setActiveTab = useCallback((tab: LibraryTabViewModel) => {
    if (typeof window === "undefined") return;

    setUrlState((prev) => {
      const searchParams = new URLSearchParams();
      searchParams.set("tab", tab);

      // Write the new active tab's query params to URL
      if (tab === "books") {
        updateSearchParams(searchParams, prev.booksQuery);
      } else {
        updateSearchParams(searchParams, prev.seriesQuery);
      }

      const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
      window.history.pushState({}, "", newUrl);

      return { ...prev, activeTab: tab };
    });
  }, []);

  const setBooksQuery = useCallback((query: LibraryBooksQueryViewModel) => {
    if (typeof window === "undefined") return;

    const searchParams = new URLSearchParams();
    searchParams.set("tab", "books");

    // Update URL with books query params (no prefix)
    updateSearchParams(searchParams, query);

    const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
    window.history.pushState({}, "", newUrl);
    setUrlState((prev) => ({ ...prev, booksQuery: query }));
  }, []);

  const setSeriesQuery = useCallback((query: LibrarySeriesQueryViewModel) => {
    if (typeof window === "undefined") return;

    const searchParams = new URLSearchParams();
    searchParams.set("tab", "series");

    // Update URL with series query params (no prefix)
    updateSearchParams(searchParams, query);

    const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
    window.history.pushState({}, "", newUrl);
    setUrlState((prev) => ({ ...prev, seriesQuery: query }));
  }, []);

  return {
    ...urlState,
    setActiveTab,
    setBooksQuery,
    setSeriesQuery,
  };
};

/**
 * Get default state (for SSR or initial load)
 */
function getDefaultState(): Omit<LibraryUrlState, "setActiveTab" | "setBooksQuery" | "setSeriesQuery"> {
  return {
    activeTab: "books",
    booksQuery: {
      sort: SORT.DEFAULT_FIELD,
      order: SORT.DEFAULT_ORDER,
      page: PAGINATION.DEFAULT_PAGE,
      size: PAGINATION.DEFAULT_PAGE_SIZE,
    },
    seriesQuery: {
      sort: SORT.DEFAULT_FIELD,
      order: SORT.DEFAULT_ORDER,
      page: PAGINATION.DEFAULT_PAGE,
      size: PAGINATION.DEFAULT_PAGE_SIZE,
    },
  };
}

/**
 * Parse URL search params into structured state
 */
function parseUrl(): Omit<LibraryUrlState, "setActiveTab" | "setBooksQuery" | "setSeriesQuery"> {
  // Safe check for browser environment
  if (typeof window === "undefined") {
    return getDefaultState();
  }

  const searchParams = new URLSearchParams(window.location.search);

  // Parse tab
  const tabParam = searchParams.get("tab");
  const activeTab: LibraryTabViewModel = tabParam === "series" ? "series" : "books";

  // Parse books query (only from URL if books tab is active, otherwise use defaults)
  const booksQuery: LibraryBooksQueryViewModel =
    activeTab === "books"
      ? {
          q: searchParams.get("q") || undefined,
          status: parseBookStatus(searchParams.get("status")),
          series_id: searchParams.get("series_id") || undefined,
          sort: parseBookSort(searchParams.get("sort")),
          order: parseOrder(searchParams.get("order")),
          page: parsePositiveInt(searchParams.get("page"), PAGINATION.DEFAULT_PAGE),
          size: clamp(
            parseInteger(searchParams.get("size"), PAGINATION.DEFAULT_PAGE_SIZE),
            PAGINATION.MIN_PAGE_SIZE,
            PAGINATION.MAX_PAGE_SIZE
          ),
        }
      : getDefaultState().booksQuery;

  // Parse series query (only from URL if series tab is active, otherwise use defaults)
  const seriesQuery: LibrarySeriesQueryViewModel =
    activeTab === "series"
      ? {
          q: searchParams.get("q") || undefined,
          sort: parseSeriesSort(searchParams.get("sort")),
          order: parseOrder(searchParams.get("order")),
          page: parsePositiveInt(searchParams.get("page"), PAGINATION.DEFAULT_PAGE),
          size: clamp(
            parseInteger(searchParams.get("size"), PAGINATION.DEFAULT_PAGE_SIZE),
            PAGINATION.MIN_PAGE_SIZE,
            PAGINATION.MAX_PAGE_SIZE
          ),
        }
      : getDefaultState().seriesQuery;

  return { activeTab, booksQuery, seriesQuery };
}

/**
 * Update URLSearchParams with query state (no prefix - only active tab in URL)
 */
function updateSearchParams(params: URLSearchParams, query: LibraryBooksQueryViewModel | LibrarySeriesQueryViewModel) {
  // Add query params (without prefix)
  if (query.q) params.set("q", query.q);
  if ("status" in query && query.status) params.set("status", query.status);
  if ("series_id" in query && query.series_id) params.set("series_id", query.series_id);
  params.set("sort", query.sort);
  params.set("order", query.order);
  params.set("page", String(query.page));
  params.set("size", String(query.size));
}

/**
 * Validation helpers
 */
function parseBookStatus(value: string | null): LibraryBooksQueryViewModel["status"] {
  if (value === "want_to_read" || value === "reading" || value === "completed") {
    return value;
  }
  return undefined;
}

function parseBookSort(value: string | null): LibraryBooksQueryViewModel["sort"] {
  if (
    value === "updated_at" ||
    value === "created_at" ||
    value === "title" ||
    value === "author" ||
    value === "status"
  ) {
    return value;
  }
  return SORT.DEFAULT_FIELD;
}

function parseSeriesSort(value: string | null): LibrarySeriesQueryViewModel["sort"] {
  if (value === "created_at" || value === "updated_at" || value === "title") {
    return value;
  }
  return SORT.DEFAULT_FIELD;
}

function parseOrder(value: string | null): "asc" | "desc" {
  return value === "asc" ? "asc" : SORT.DEFAULT_ORDER;
}

function parsePositiveInt(value: string | null, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) || parsed < 1 ? defaultValue : parsed;
}

function parseInteger(value: string | null, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

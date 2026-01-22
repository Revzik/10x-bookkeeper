import { useState, useEffect, useCallback } from "react";
import type { LibraryTabViewModel, LibraryBooksQueryViewModel, LibrarySeriesQueryViewModel } from "@/types";

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

    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set("tab", tab);

    const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
    window.history.pushState({}, "", newUrl);
    setUrlState((prev) => ({ ...prev, activeTab: tab }));
  }, []);

  const setBooksQuery = useCallback((query: LibraryBooksQueryViewModel) => {
    if (typeof window === "undefined") return;

    const searchParams = new URLSearchParams(window.location.search);

    // Keep current tab
    const currentTab = searchParams.get("tab") || "books";
    searchParams.set("tab", currentTab);

    // Update books query params
    updateSearchParams(searchParams, query);

    const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
    window.history.pushState({}, "", newUrl);
    setUrlState((prev) => ({ ...prev, booksQuery: query }));
  }, []);

  const setSeriesQuery = useCallback((query: LibrarySeriesQueryViewModel) => {
    if (typeof window === "undefined") return;

    const searchParams = new URLSearchParams(window.location.search);

    // Keep current tab
    const currentTab = searchParams.get("tab") || "books";
    searchParams.set("tab", currentTab);

    // Update series query params
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
      sort: "updated_at",
      order: "desc",
      page: 1,
      size: 20,
    },
    seriesQuery: {
      sort: "updated_at",
      order: "desc",
      page: 1,
      size: 20,
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

  // Parse books query
  const booksQuery: LibraryBooksQueryViewModel = {
    q: searchParams.get("q") || undefined,
    status: parseBookStatus(searchParams.get("status")),
    series_id: searchParams.get("series_id") || undefined,
    sort: parseBookSort(searchParams.get("sort")),
    order: parseOrder(searchParams.get("order")),
    page: parsePositiveInt(searchParams.get("page"), 1),
    size: clamp(parsePositiveInt(searchParams.get("size"), 20), 1, 100),
  };

  // Parse series query
  const seriesQuery: LibrarySeriesQueryViewModel = {
    q: searchParams.get("q") || undefined,
    sort: parseSeriesSort(searchParams.get("sort")),
    order: parseOrder(searchParams.get("order")),
    page: parsePositiveInt(searchParams.get("page"), 1),
    size: clamp(parsePositiveInt(searchParams.get("size"), 20), 1, 100),
  };

  return { activeTab, booksQuery, seriesQuery };
}

/**
 * Update URLSearchParams with query state
 */
function updateSearchParams(params: URLSearchParams, query: LibraryBooksQueryViewModel | LibrarySeriesQueryViewModel) {
  // Clear all query params except tab
  const tab = params.get("tab");
  params.forEach((_, key) => {
    if (key !== "tab") {
      params.delete(key);
    }
  });
  if (tab) params.set("tab", tab);

  // Add query params
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
  return "updated_at";
}

function parseSeriesSort(value: string | null): LibrarySeriesQueryViewModel["sort"] {
  if (value === "created_at" || value === "updated_at" || value === "title") {
    return value;
  }
  return "updated_at";
}

function parseOrder(value: string | null): "asc" | "desc" {
  return value === "asc" ? "asc" : "desc";
}

function parsePositiveInt(value: string | null, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) || parsed < 1 ? defaultValue : parsed;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

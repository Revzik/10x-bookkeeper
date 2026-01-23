import { useState, useEffect, useCallback } from "react";
import type { SeriesTabViewModel, SeriesBooksQueryViewModel, BookStatus } from "@/types";

interface SeriesUrlState {
  activeTab: SeriesTabViewModel;
  booksQuery: SeriesBooksQueryViewModel;
  setActiveTab: (tab: SeriesTabViewModel) => void;
  setBooksQuery: (query: SeriesBooksQueryViewModel) => void;
}

/**
 * Parse and manage URL state for Series Detail view
 * Keeps tab and namespaced books query params in sync with browser URL
 *
 * Uses namespaced params (books_*) to avoid collisions with future Ask tab params
 */
export const useSeriesUrlState = (): SeriesUrlState => {
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

  const setActiveTab = useCallback((tab: SeriesTabViewModel) => {
    if (typeof window === "undefined") return;

    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set("tab", tab);

    const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
    window.history.pushState({}, "", newUrl);
    setUrlState((prev) => ({ ...prev, activeTab: tab }));
  }, []);

  const setBooksQuery = useCallback((query: SeriesBooksQueryViewModel) => {
    if (typeof window === "undefined") return;

    const searchParams = new URLSearchParams(window.location.search);

    // Keep current tab
    const currentTab = searchParams.get("tab") || "books";
    searchParams.set("tab", currentTab);

    // Update namespaced books query params
    updateBooksSearchParams(searchParams, query);

    const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
    window.history.pushState({}, "", newUrl);
    setUrlState((prev) => ({ ...prev, booksQuery: query }));
  }, []);

  return {
    ...urlState,
    setActiveTab,
    setBooksQuery,
  };
};

/**
 * Get default state (for SSR or initial load)
 */
function getDefaultState(): Omit<SeriesUrlState, "setActiveTab" | "setBooksQuery"> {
  return {
    activeTab: "books",
    booksQuery: {
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
function parseUrl(): Omit<SeriesUrlState, "setActiveTab" | "setBooksQuery"> {
  // Safe check for browser environment
  if (typeof window === "undefined") {
    return getDefaultState();
  }

  const searchParams = new URLSearchParams(window.location.search);

  // Parse tab
  const tabParam = searchParams.get("tab");
  const activeTab: SeriesTabViewModel = tabParam === "ask" ? "ask" : "books";

  // Parse namespaced books query
  const booksQuery: SeriesBooksQueryViewModel = {
    q: searchParams.get("books_q") || undefined,
    status: parseBookStatus(searchParams.get("books_status")),
    sort: parseBookSort(searchParams.get("books_sort")),
    order: parseOrder(searchParams.get("books_order")),
    page: parsePositiveInt(searchParams.get("books_page"), 1),
    size: clamp(parsePositiveInt(searchParams.get("books_size"), 20), 1, 100),
  };

  return { activeTab, booksQuery };
}

/**
 * Update URLSearchParams with namespaced books query state
 */
function updateBooksSearchParams(params: URLSearchParams, query: SeriesBooksQueryViewModel) {
  // Clear all books_* params
  const keysToDelete: string[] = [];
  params.forEach((_, key) => {
    if (key.startsWith("books_")) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach((key) => params.delete(key));

  // Add namespaced books query params
  if (query.q) params.set("books_q", query.q);
  if (query.status) params.set("books_status", query.status);
  params.set("books_sort", query.sort);
  params.set("books_order", query.order);
  params.set("books_page", String(query.page));
  params.set("books_size", String(query.size));
}

/**
 * Validation helpers
 */
function parseBookStatus(value: string | null): BookStatus | undefined {
  if (value === "want_to_read" || value === "reading" || value === "completed") {
    return value;
  }
  return undefined;
}

function parseBookSort(value: string | null): SeriesBooksQueryViewModel["sort"] {
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

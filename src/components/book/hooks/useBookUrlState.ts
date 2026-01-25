import { useState, useEffect, useCallback } from "react";
import type { BookTabViewModel, BookAskScopeViewModel, BookNotesQueryViewModel } from "@/types";

interface BookUrlState {
  activeTab: BookTabViewModel;
  askScope: BookAskScopeViewModel;
  notesQuery: BookNotesQueryViewModel;
  setActiveTab: (tab: BookTabViewModel) => void;
  setAskScope: (scope: BookAskScopeViewModel) => void;
  setNotesQuery: (query: BookNotesQueryViewModel) => void;
}

/**
 * Parse and manage URL state for Book Detail view
 * Keeps tab and askScope in sync with browser URL
 */
export const useBookUrlState = (): BookUrlState => {
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

  const setActiveTab = useCallback((tab: BookTabViewModel) => {
    if (typeof window === "undefined") return;

    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set("tab", tab);

    const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
    window.history.pushState({}, "", newUrl);
    setUrlState((prev) => ({ ...prev, activeTab: tab }));
  }, []);

  const setAskScope = useCallback((scope: BookAskScopeViewModel) => {
    if (typeof window === "undefined") return;

    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set("scope", scope);

    const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
    window.history.pushState({}, "", newUrl);
    setUrlState((prev) => ({ ...prev, askScope: scope }));
  }, []);

  const setNotesQuery = useCallback((query: BookNotesQueryViewModel) => {
    if (typeof window === "undefined") return;

    const searchParams = new URLSearchParams(window.location.search);

    // Preserve existing tab and scope params
    const currentTab = searchParams.get("tab");
    const currentScope = searchParams.get("scope");

    // Clear all params and rebuild
    const newParams = new URLSearchParams();

    if (currentTab) {
      newParams.set("tab", currentTab);
    }
    if (currentScope) {
      newParams.set("scope", currentScope);
    }

    // Set notes query params (no sort/order - hardcoded by chapter order)
    if (query.chapter_id) {
      newParams.set("chapter_id", query.chapter_id);
    }
    newParams.set("page", query.page.toString());
    newParams.set("size", query.size.toString());

    const newUrl = `${window.location.pathname}?${newParams.toString()}`;
    window.history.pushState({}, "", newUrl);
    setUrlState((prev) => ({ ...prev, notesQuery: query }));
  }, []);

  return {
    ...urlState,
    setActiveTab,
    setAskScope,
    setNotesQuery,
  };
};

/**
 * Get default state (for SSR or initial load)
 */
function getDefaultState(): Omit<BookUrlState, "setActiveTab" | "setAskScope" | "setNotesQuery"> {
  return {
    activeTab: "notes",
    askScope: "book",
    notesQuery: getDefaultNotesQuery(),
  };
}

/**
 * Get default notes query state
 * Note: Sorting is hardcoded by chapter order (ascending), not stored in URL
 */
function getDefaultNotesQuery(): BookNotesQueryViewModel {
  return {
    chapter_id: undefined,
    page: 1,
    size: 20,
  };
}

/**
 * Parse URL search params into structured state
 */
function parseUrl(): Omit<BookUrlState, "setActiveTab" | "setAskScope" | "setNotesQuery"> {
  // Safe check for browser environment
  if (typeof window === "undefined") {
    return getDefaultState();
  }

  const searchParams = new URLSearchParams(window.location.search);

  // Parse tab (default: chapters)
  const tabParam = searchParams.get("tab");
  let activeTab: BookTabViewModel = "notes";
  if (tabParam === "notes" || tabParam === "ask") {
    activeTab = tabParam;
  }

  // Parse scope (default: book)
  const scopeParam = searchParams.get("scope");
  const askScope: BookAskScopeViewModel = scopeParam === "series" ? "series" : "book";

  // Parse notes query params
  const notesQuery = parseNotesQuery(searchParams);

  return { activeTab, askScope, notesQuery };
}

/**
 * Parse notes query params from URLSearchParams
 * Validates and sanitizes all query params with strict rules
 * Note: Sorting is hardcoded by chapter order (ascending), not parsed from URL
 */
function parseNotesQuery(searchParams: URLSearchParams): BookNotesQueryViewModel {
  const defaults = getDefaultNotesQuery();

  // Parse chapter_id (must look like a UUID; invalid values are ignored)
  const chapterIdParam = searchParams.get("chapter_id");
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const chapter_id = chapterIdParam && uuidRegex.test(chapterIdParam) ? chapterIdParam : undefined;

  // Parse page (must be >= 1)
  const pageParam = searchParams.get("page");
  const pageNum = parseInt(pageParam || "", 10);
  const page = !isNaN(pageNum) && pageNum >= 1 ? pageNum : defaults.page;

  // Parse size (must be in range [1, 100])
  const sizeParam = searchParams.get("size");
  const sizeNum = parseInt(sizeParam || "", 10);
  let size = defaults.size;
  if (!isNaN(sizeNum)) {
    size = Math.max(1, Math.min(100, sizeNum));
  }

  return { chapter_id, page, size };
}

import { useState, useEffect, useCallback } from "react";
import type { BookTabViewModel, BookAskScopeViewModel } from "@/types";

interface BookUrlState {
  activeTab: BookTabViewModel;
  askScope: BookAskScopeViewModel;
  setActiveTab: (tab: BookTabViewModel) => void;
  setAskScope: (scope: BookAskScopeViewModel) => void;
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

  return {
    ...urlState,
    setActiveTab,
    setAskScope,
  };
};

/**
 * Get default state (for SSR or initial load)
 */
function getDefaultState(): Omit<BookUrlState, "setActiveTab" | "setAskScope"> {
  return {
    activeTab: "chapters",
    askScope: "book",
  };
}

/**
 * Parse URL search params into structured state
 */
function parseUrl(): Omit<BookUrlState, "setActiveTab" | "setAskScope"> {
  // Safe check for browser environment
  if (typeof window === "undefined") {
    return getDefaultState();
  }

  const searchParams = new URLSearchParams(window.location.search);

  // Parse tab (default: chapters)
  const tabParam = searchParams.get("tab");
  let activeTab: BookTabViewModel = "chapters";
  if (tabParam === "notes" || tabParam === "ask") {
    activeTab = tabParam;
  }

  // Parse scope (default: book)
  const scopeParam = searchParams.get("scope");
  const askScope: BookAskScopeViewModel = scopeParam === "series" ? "series" : "book";

  return { activeTab, askScope };
}

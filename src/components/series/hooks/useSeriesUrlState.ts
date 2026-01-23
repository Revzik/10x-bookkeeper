import { useState, useEffect, useCallback } from "react";
import type { SeriesTabViewModel } from "@/types";

interface SeriesUrlState {
  activeTab: SeriesTabViewModel;
  setActiveTab: (tab: SeriesTabViewModel) => void;
}

/**
 * Parse and manage URL state for Series Detail view
 * Keeps only the active tab in sync with browser URL
 *
 * Note: Books tab does not use URL query params (displays all books in series)
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

  return {
    ...urlState,
    setActiveTab,
  };
};

/**
 * Get default state (for SSR or initial load)
 */
function getDefaultState(): Omit<SeriesUrlState, "setActiveTab"> {
  return {
    activeTab: "books",
  };
}

/**
 * Parse URL search params into structured state
 */
function parseUrl(): Omit<SeriesUrlState, "setActiveTab"> {
  // Safe check for browser environment
  if (typeof window === "undefined") {
    return getDefaultState();
  }

  const searchParams = new URLSearchParams(window.location.search);

  // Parse tab
  const tabParam = searchParams.get("tab");
  const activeTab: SeriesTabViewModel = tabParam === "ask" ? "ask" : "books";

  return { activeTab };
}

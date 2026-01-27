/**
 * Unit tests for useLibraryUrlState hook
 * Verifies URL state synchronization, validation, and browser history integration
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useLibraryUrlState } from "./useLibraryUrlState";
import { PAGINATION, SORT } from "@/lib/constants";
import type { LibraryBooksQueryViewModel, LibrarySeriesQueryViewModel } from "@/types";

describe("useLibraryUrlState", () => {
  beforeEach(() => {
    // Reset URL to clean state before each test using history API
    // This works properly with happy-dom
    window.history.replaceState({}, "", "http://localhost:3000/library");
  });

  describe("Initialization", () => {
    it("should return default state when no URL params are present", () => {
      // Arrange & Act
      const { result } = renderHook(() => useLibraryUrlState());

      // Assert
      expect(result.current.activeTab).toBe("books");
      expect(result.current.booksQuery).toEqual({
        sort: SORT.DEFAULT_FIELD,
        order: SORT.DEFAULT_ORDER,
        page: PAGINATION.DEFAULT_PAGE,
        size: PAGINATION.DEFAULT_PAGE_SIZE,
      });
      expect(result.current.seriesQuery).toEqual({
        sort: SORT.DEFAULT_FIELD,
        order: SORT.DEFAULT_ORDER,
        page: PAGINATION.DEFAULT_PAGE,
        size: PAGINATION.DEFAULT_PAGE_SIZE,
      });
    });

    it("should parse existing URL params on mount", () => {
      // Arrange
      window.history.replaceState(
        {},
        "",
        "http://localhost:3000/library?tab=series&q=fantasy&sort=title&order=asc&page=3&size=50"
      );

      // Act
      const { result } = renderHook(() => useLibraryUrlState());

      // Assert
      expect(result.current.activeTab).toBe("series");
      expect(result.current.seriesQuery.q).toBe("fantasy");
      expect(result.current.seriesQuery.sort).toBe("title");
      expect(result.current.seriesQuery.order).toBe("asc");
      expect(result.current.seriesQuery.page).toBe(3);
      expect(result.current.seriesQuery.size).toBe(50);
    });

    it("should parse books-specific URL params", () => {
      // Arrange
      window.history.replaceState(
        {},
        "",
        "http://localhost:3000/library?tab=books&status=reading&series_id=abc-123&sort=author&page=2"
      );

      // Act
      const { result } = renderHook(() => useLibraryUrlState());

      // Assert
      expect(result.current.activeTab).toBe("books");
      expect(result.current.booksQuery.status).toBe("reading");
      expect(result.current.booksQuery.series_id).toBe("abc-123");
      expect(result.current.booksQuery.sort).toBe("author");
      expect(result.current.booksQuery.page).toBe(2);
    });
  });

  describe("URL Validation and Sanitization", () => {
    it("should default to 'books' tab for invalid tab values", () => {
      // Arrange
      window.history.replaceState({}, "", "http://localhost:3000/library?tab=invalid");

      // Act
      const { result } = renderHook(() => useLibraryUrlState());

      // Assert
      expect(result.current.activeTab).toBe("books");
    });

    it("should filter out invalid book status values", () => {
      // Arrange
      window.history.replaceState({}, "", "http://localhost:3000/library?status=invalid");

      // Act
      const { result } = renderHook(() => useLibraryUrlState());

      // Assert
      expect(result.current.booksQuery.status).toBeUndefined();
    });

    it("should validate book status enum values", () => {
      // Arrange - Test all valid statuses
      const validStatuses = ["want_to_read", "reading", "completed"];

      validStatuses.forEach((status) => {
        window.history.replaceState({}, "", `http://localhost:3000/library?status=${status}`);

        // Act
        const { result } = renderHook(() => useLibraryUrlState());

        // Assert
        expect(result.current.booksQuery.status).toBe(status);
      });
    });

    it("should default to 'updated_at' for invalid book sort values", () => {
      // Arrange
      window.history.replaceState({}, "", "http://localhost:3000/library?sort=invalid");

      // Act
      const { result } = renderHook(() => useLibraryUrlState());

      // Assert
      expect(result.current.booksQuery.sort).toBe(SORT.DEFAULT_FIELD);
    });

    it("should validate all book sort field values", () => {
      // Arrange - Test all valid book sort fields
      const validSorts = ["updated_at", "created_at", "title", "author", "status"];

      validSorts.forEach((sort) => {
        window.history.replaceState({}, "", `http://localhost:3000/library?sort=${sort}`);

        // Act
        const { result } = renderHook(() => useLibraryUrlState());

        // Assert
        expect(result.current.booksQuery.sort).toBe(sort);
      });
    });

    it("should validate all series sort field values", () => {
      // Arrange - Test all valid series sort fields
      const validSorts = ["created_at", "updated_at", "title"];

      validSorts.forEach((sort) => {
        window.history.replaceState({}, "", `http://localhost:3000/library?tab=series&sort=${sort}`);

        // Act
        const { result } = renderHook(() => useLibraryUrlState());

        // Assert
        expect(result.current.seriesQuery.sort).toBe(sort);
      });
    });

    it("should default to 'desc' for invalid order values", () => {
      // Arrange
      window.history.replaceState({}, "", "http://localhost:3000/library?order=invalid");

      // Act
      const { result } = renderHook(() => useLibraryUrlState());

      // Assert
      expect(result.current.booksQuery.order).toBe(SORT.DEFAULT_ORDER);
    });

    it("should handle both 'asc' and 'desc' order values", () => {
      // Arrange & Act - Test 'asc'
      window.history.replaceState({}, "", "http://localhost:3000/library?order=asc");
      const { result: resultAsc } = renderHook(() => useLibraryUrlState());
      expect(resultAsc.current.booksQuery.order).toBe("asc");

      // Arrange & Act - Test 'desc'
      window.history.replaceState({}, "", "http://localhost:3000/library?order=desc");
      const { result: resultDesc } = renderHook(() => useLibraryUrlState());
      expect(resultDesc.current.booksQuery.order).toBe("desc");
    });

    it("should clamp page size between min and max values", () => {
      // Arrange & Act - Test below minimum
      window.history.replaceState({}, "", "http://localhost:3000/library?size=0");
      const { result: resultMin } = renderHook(() => useLibraryUrlState());
      expect(resultMin.current.booksQuery.size).toBe(PAGINATION.MIN_PAGE_SIZE);

      // Arrange & Act - Test above maximum
      window.history.replaceState({}, "", "http://localhost:3000/library?size=200");
      const { result: resultMax } = renderHook(() => useLibraryUrlState());
      expect(resultMax.current.booksQuery.size).toBe(PAGINATION.MAX_PAGE_SIZE);

      // Arrange & Act - Test within range
      window.history.replaceState({}, "", "http://localhost:3000/library?size=50");
      const { result: resultValid } = renderHook(() => useLibraryUrlState());
      expect(resultValid.current.booksQuery.size).toBe(50);
    });

    it("should handle non-numeric page values", () => {
      // Arrange
      window.history.replaceState({}, "", "http://localhost:3000/library?page=abc");

      // Act
      const { result } = renderHook(() => useLibraryUrlState());

      // Assert
      expect(result.current.booksQuery.page).toBe(PAGINATION.DEFAULT_PAGE);
    });

    it("should handle negative page numbers", () => {
      // Arrange
      window.history.replaceState({}, "", "http://localhost:3000/library?page=-5");

      // Act
      const { result } = renderHook(() => useLibraryUrlState());

      // Assert
      expect(result.current.booksQuery.page).toBe(PAGINATION.DEFAULT_PAGE);
    });

    it("should handle zero page numbers", () => {
      // Arrange
      window.history.replaceState({}, "", "http://localhost:3000/library?page=0");

      // Act
      const { result } = renderHook(() => useLibraryUrlState());

      // Assert
      expect(result.current.booksQuery.page).toBe(PAGINATION.DEFAULT_PAGE);
    });
  });

  describe("setActiveTab", () => {
    it("should update active tab and push new URL to history", () => {
      // Arrange
      const { result } = renderHook(() => useLibraryUrlState());

      // Act
      act(() => {
        result.current.setActiveTab("series");
      });

      // Assert
      expect(result.current.activeTab).toBe("series");
      expect(window.location.search).toContain("tab=series");
    });

    it("should update URL with new tab's query params when changing tab", () => {
      // Arrange
      window.history.replaceState({}, "", "http://localhost:3000/library?tab=books&q=test&page=3");
      const { result } = renderHook(() => useLibraryUrlState());

      // Books state should be loaded from URL
      expect(result.current.booksQuery.q).toBe("test");
      expect(result.current.booksQuery.page).toBe(3);

      // Act - Switch to series tab
      act(() => {
        result.current.setActiveTab("series");
      });

      // Assert - URL should now have series tab with default series query params
      expect(window.location.search).toContain("tab=series");
      // Series tab should have default params (not books params)
      expect(result.current.seriesQuery.page).toBe(PAGINATION.DEFAULT_PAGE);
      // Books query should still be preserved in memory
      expect(result.current.booksQuery.q).toBe("test");
      expect(result.current.booksQuery.page).toBe(3);
    });

    it("should switch from books to series tab", () => {
      // Arrange
      const { result } = renderHook(() => useLibraryUrlState());
      expect(result.current.activeTab).toBe("books");

      // Act
      act(() => {
        result.current.setActiveTab("series");
      });

      // Assert
      expect(result.current.activeTab).toBe("series");
    });
  });

  describe("setBooksQuery", () => {
    it("should update books query and push new URL", () => {
      // Arrange
      const { result } = renderHook(() => useLibraryUrlState());
      const newQuery: LibraryBooksQueryViewModel = {
        q: "search term",
        status: "reading",
        series_id: "series-123",
        sort: "title",
        order: "asc",
        page: 2,
        size: 30,
      };

      // Act
      act(() => {
        result.current.setBooksQuery(newQuery);
      });

      // Assert
      expect(result.current.booksQuery).toEqual(newQuery);
      expect(window.location.search).toContain("q=search+term");
      expect(window.location.search).toContain("status=reading");
      expect(window.location.search).toContain("series_id=series-123");
      expect(window.location.search).toContain("sort=title");
      expect(window.location.search).toContain("order=asc");
      expect(window.location.search).toContain("page=2");
      expect(window.location.search).toContain("size=30");
    });

    it("should preserve active tab when updating books query", () => {
      // Arrange
      window.history.replaceState({}, "", "http://localhost:3000/library?tab=books");
      const { result } = renderHook(() => useLibraryUrlState());
      const newQuery: LibraryBooksQueryViewModel = {
        sort: "author",
        order: "desc",
        page: 1,
        size: 20,
      };

      // Act
      act(() => {
        result.current.setBooksQuery(newQuery);
      });

      // Assert
      expect(window.location.search).toContain("tab=books");
    });

    it("should omit undefined optional fields from URL", () => {
      // Arrange
      const { result } = renderHook(() => useLibraryUrlState());
      const newQuery: LibraryBooksQueryViewModel = {
        sort: "title",
        order: "asc",
        page: 1,
        size: 20,
        // q, status, series_id are undefined
      };

      // Act
      act(() => {
        result.current.setBooksQuery(newQuery);
      });

      // Assert
      expect(window.location.search).not.toContain("q=");
      expect(window.location.search).not.toContain("status=");
      expect(window.location.search).not.toContain("series_id=");
    });

    it("should clear previous query params when setting new query", () => {
      // Arrange
      window.history.replaceState({}, "", "http://localhost:3000/library?q=old&status=completed&page=5");
      const { result } = renderHook(() => useLibraryUrlState());
      const newQuery: LibraryBooksQueryViewModel = {
        sort: "title",
        order: "desc",
        page: 1,
        size: 20,
      };

      // Act
      act(() => {
        result.current.setBooksQuery(newQuery);
      });

      // Assert
      expect(window.location.search).not.toContain("q=old");
      expect(window.location.search).not.toContain("status=completed");
      expect(window.location.search).toContain("page=1");
    });
  });

  describe("setSeriesQuery", () => {
    it("should update series query and push new URL", () => {
      // Arrange
      const { result } = renderHook(() => useLibraryUrlState());
      const newQuery: LibrarySeriesQueryViewModel = {
        q: "fantasy",
        sort: "title",
        order: "asc",
        page: 3,
        size: 50,
      };

      // Act
      act(() => {
        result.current.setSeriesQuery(newQuery);
      });

      // Assert
      expect(result.current.seriesQuery).toEqual(newQuery);
      expect(window.location.search).toContain("q=fantasy");
      expect(window.location.search).toContain("sort=title");
      expect(window.location.search).toContain("order=asc");
      expect(window.location.search).toContain("page=3");
      expect(window.location.search).toContain("size=50");
    });

    it("should preserve active tab when updating series query", () => {
      // Arrange
      window.history.replaceState({}, "", "http://localhost:3000/library?tab=series");
      const { result } = renderHook(() => useLibraryUrlState());
      const newQuery: LibrarySeriesQueryViewModel = {
        sort: "created_at",
        order: "desc",
        page: 1,
        size: 20,
      };

      // Act
      act(() => {
        result.current.setSeriesQuery(newQuery);
      });

      // Assert
      expect(window.location.search).toContain("tab=series");
    });

    it("should omit undefined q field from URL", () => {
      // Arrange
      const { result } = renderHook(() => useLibraryUrlState());
      const newQuery: LibrarySeriesQueryViewModel = {
        sort: "title",
        order: "asc",
        page: 1,
        size: 20,
        // q is undefined
      };

      // Act
      act(() => {
        result.current.setSeriesQuery(newQuery);
      });

      // Assert
      expect(window.location.search).not.toContain("q=");
    });
  });

  describe("Browser history integration", () => {
    it("should respond to popstate events (back/forward navigation)", async () => {
      // Arrange
      const { result } = renderHook(() => useLibraryUrlState());

      // Navigate forward
      act(() => {
        result.current.setActiveTab("series");
      });
      expect(result.current.activeTab).toBe("series");

      // Act - Simulate browser back button
      act(() => {
        window.history.back();
      });

      // Trigger popstate event manually (jsdom doesn't auto-trigger)
      act(() => {
        window.dispatchEvent(new PopStateEvent("popstate"));
      });

      // Assert
      await waitFor(() => {
        expect(result.current.activeTab).toBe("books");
      });
    });

    it("should update state when URL changes via popstate", async () => {
      // Arrange
      const { result } = renderHook(() => useLibraryUrlState());

      // Set initial state
      const query1: LibraryBooksQueryViewModel = {
        q: "first",
        sort: "title",
        order: "asc",
        page: 1,
        size: 20,
      };
      act(() => {
        result.current.setBooksQuery(query1);
      });

      // Set second state
      const query2: LibraryBooksQueryViewModel = {
        q: "second",
        sort: "author",
        order: "desc",
        page: 2,
        size: 30,
      };
      act(() => {
        result.current.setBooksQuery(query2);
      });
      expect(result.current.booksQuery.q).toBe("second");

      // Act - Go back in history
      act(() => {
        window.history.back();
        window.dispatchEvent(new PopStateEvent("popstate"));
      });

      // Assert
      await waitFor(() => {
        expect(result.current.booksQuery.q).toBe("first");
      });
    });

    it("should maintain stable function references", () => {
      // Arrange
      const { result, rerender } = renderHook(() => useLibraryUrlState());
      const initialSetActiveTab = result.current.setActiveTab;
      const initialSetBooksQuery = result.current.setBooksQuery;
      const initialSetSeriesQuery = result.current.setSeriesQuery;

      // Act - Force re-render
      rerender();

      // Assert - Functions should be the same reference (memoized with useCallback)
      expect(result.current.setActiveTab).toBe(initialSetActiveTab);
      expect(result.current.setBooksQuery).toBe(initialSetBooksQuery);
      expect(result.current.setSeriesQuery).toBe(initialSetSeriesQuery);
    });
  });

  describe("Edge cases and special scenarios", () => {
    it("should handle empty search query string", () => {
      // Arrange
      window.history.replaceState({}, "", "http://localhost:3000/library?q=");

      // Act
      const { result } = renderHook(() => useLibraryUrlState());

      // Assert
      expect(result.current.booksQuery.q).toBeUndefined();
    });

    it("should handle URL with only tab parameter", () => {
      // Arrange
      window.history.replaceState({}, "", "http://localhost:3000/library?tab=series");

      // Act
      const { result } = renderHook(() => useLibraryUrlState());

      // Assert
      expect(result.current.activeTab).toBe("series");
      expect(result.current.seriesQuery.sort).toBe(SORT.DEFAULT_FIELD);
      expect(result.current.seriesQuery.order).toBe(SORT.DEFAULT_ORDER);
      expect(result.current.seriesQuery.page).toBe(PAGINATION.DEFAULT_PAGE);
      expect(result.current.seriesQuery.size).toBe(PAGINATION.DEFAULT_PAGE_SIZE);
    });

    it("should handle complex query string with special characters", () => {
      // Arrange
      const searchTerm = "test & query";
      const encodedSearch = encodeURIComponent(searchTerm);
      window.history.replaceState({}, "", `http://localhost:3000/library?q=${encodedSearch}`);

      // Act
      const { result } = renderHook(() => useLibraryUrlState());

      // Assert
      expect(result.current.booksQuery.q).toBe(searchTerm);
    });

    it("should handle very large page numbers", () => {
      // Arrange
      window.history.replaceState({}, "", "http://localhost:3000/library?page=999999");

      // Act
      const { result } = renderHook(() => useLibraryUrlState());

      // Assert
      expect(result.current.booksQuery.page).toBe(999999);
    });

    it("should handle fractional page numbers by truncating", () => {
      // Arrange
      window.history.replaceState({}, "", "http://localhost:3000/library?page=3.7");

      // Act
      const { result } = renderHook(() => useLibraryUrlState());

      // Assert
      expect(result.current.booksQuery.page).toBe(3);
    });

    it("should parse multiple consecutive query updates correctly", () => {
      // Arrange
      const { result } = renderHook(() => useLibraryUrlState());

      // Act - Multiple rapid updates
      act(() => {
        result.current.setBooksQuery({
          sort: "title",
          order: "asc",
          page: 1,
          size: 20,
        });
      });

      act(() => {
        result.current.setBooksQuery({
          q: "search",
          sort: "author",
          order: "desc",
          page: 2,
          size: 30,
        });
      });

      act(() => {
        result.current.setBooksQuery({
          q: "final",
          status: "reading",
          sort: "updated_at",
          order: "asc",
          page: 3,
          size: 50,
        });
      });

      // Assert - Final state should be correct
      expect(result.current.booksQuery).toEqual({
        q: "final",
        status: "reading",
        sort: "updated_at",
        order: "asc",
        page: 3,
        size: 50,
      });
    });
  });

  describe("Tab switching behavior", () => {
    it("should keep books and series query state separate in memory", () => {
      // Arrange - Set up books tab with specific query
      const { result } = renderHook(() => useLibraryUrlState());

      const booksQuery: LibraryBooksQueryViewModel = {
        q: "lord",
        status: "reading",
        sort: "title",
        order: "asc",
        page: 5,
        size: 10,
      };

      act(() => {
        result.current.setBooksQuery(booksQuery);
      });

      // Act - Switch to series and set different query
      act(() => {
        result.current.setActiveTab("series");
      });

      const seriesQuery: LibrarySeriesQueryViewModel = {
        q: "fantasy",
        sort: "created_at",
        order: "desc",
        page: 3,
        size: 50,
      };

      act(() => {
        result.current.setSeriesQuery(seriesQuery);
      });

      // Assert - URL should now contain ONLY series parameters (books params removed from URL)
      expect(window.location.search).toContain("tab=series");
      expect(window.location.search).toContain("q=fantasy");
      expect(window.location.search).toContain("page=3");
      expect(window.location.search).toContain("size=50");
      expect(window.location.search).not.toContain("status="); // books-only param should not be in URL

      // Assert - Books query state should still be preserved in memory (not in URL)
      expect(result.current.booksQuery.q).toBe("lord");
      expect(result.current.booksQuery.page).toBe(5);
      expect(result.current.booksQuery.size).toBe(10);
      expect(result.current.booksQuery.status).toBe("reading");

      // Assert - Series query should have its own values
      expect(result.current.seriesQuery.q).toBe("fantasy");
      expect(result.current.seriesQuery.page).toBe(3);
      expect(result.current.seriesQuery.size).toBe(50);

      // Act - Switch back to books
      act(() => {
        result.current.setActiveTab("books");
      });

      // Assert - URL should now contain books parameters again
      expect(window.location.search).toContain("tab=books");
      expect(window.location.search).toContain("q=lord");
      expect(window.location.search).toContain("page=5");
      expect(window.location.search).toContain("size=10");

      // Assert - Books query state should remain unchanged
      expect(result.current.booksQuery.q).toBe("lord");
      expect(result.current.booksQuery.page).toBe(5);
      expect(result.current.booksQuery.size).toBe(10);
    });

    it("should maintain books query state when switching to series and back", () => {
      // Arrange
      window.history.replaceState({}, "", "http://localhost:3000/library?tab=books&q=test&status=reading&page=2");
      const { result } = renderHook(() => useLibraryUrlState());
      const originalBooksQuery = { ...result.current.booksQuery };

      // Act - Switch to series
      act(() => {
        result.current.setActiveTab("series");
      });

      // Switch back to books
      act(() => {
        result.current.setActiveTab("books");
      });

      // Assert - Books query state is preserved
      expect(result.current.booksQuery.q).toBe(originalBooksQuery.q);
      expect(result.current.booksQuery.status).toBe(originalBooksQuery.status);
      expect(result.current.booksQuery.page).toBe(originalBooksQuery.page);
    });

    it("should maintain series query state when switching to books and back", () => {
      // Arrange
      window.history.replaceState({}, "", "http://localhost:3000/library?tab=series&q=fantasy&sort=title&page=3");
      const { result } = renderHook(() => useLibraryUrlState());
      const originalSeriesQuery = { ...result.current.seriesQuery };

      // Act - Switch to books
      act(() => {
        result.current.setActiveTab("books");
      });

      // Switch back to series
      act(() => {
        result.current.setActiveTab("series");
      });

      // Assert - Series query state is preserved
      expect(result.current.seriesQuery.q).toBe(originalSeriesQuery.q);
      expect(result.current.seriesQuery.sort).toBe(originalSeriesQuery.sort);
      expect(result.current.seriesQuery.page).toBe(originalSeriesQuery.page);
    });
  });
});

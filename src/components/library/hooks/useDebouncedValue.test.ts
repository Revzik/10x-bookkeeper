/**
 * Unit tests for useDebouncedValue hook
 * Tests debouncing behavior, timing, cleanup, and type handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebouncedValue } from "./useDebouncedValue";

describe("useDebouncedValue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("Initial value behavior", () => {
    it("should return the initial value immediately without delay", () => {
      // Arrange
      const initialValue = "test";

      // Act
      const { result } = renderHook(() => useDebouncedValue(initialValue));

      // Assert
      expect(result.current).toBe(initialValue);
    });

    it("should handle initial number values", () => {
      // Arrange
      const initialValue = 42;

      // Act
      const { result } = renderHook(() => useDebouncedValue(initialValue));

      // Assert
      expect(result.current).toBe(42);
    });

    it("should handle initial object values", () => {
      // Arrange
      const initialValue = { name: "test", count: 0 };

      // Act
      const { result } = renderHook(() => useDebouncedValue(initialValue));

      // Assert
      expect(result.current).toEqual({ name: "test", count: 0 });
    });

    it("should handle initial array values", () => {
      // Arrange
      const initialValue = [1, 2, 3];

      // Act
      const { result } = renderHook(() => useDebouncedValue(initialValue));

      // Assert
      expect(result.current).toEqual([1, 2, 3]);
    });
  });

  describe("Debouncing behavior", () => {
    it("should update value after default delay (300ms)", () => {
      // Arrange
      const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), {
        initialProps: { value: "initial" },
      });

      // Act
      rerender({ value: "updated" });
      expect(result.current).toBe("initial");

      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Assert
      expect(result.current).toBe("updated");
    });

    it("should update value after custom delay", () => {
      // Arrange
      const customDelay = 500;
      const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, customDelay), {
        initialProps: { value: "initial" },
      });

      // Act
      rerender({ value: "updated" });
      expect(result.current).toBe("initial");

      act(() => {
        vi.advanceTimersByTime(500);
      });

      // Assert
      expect(result.current).toBe("updated");
    });

    it("should reset timer on rapid value changes", () => {
      // Arrange
      const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
        initialProps: { value: "initial" },
      });

      // Act - Rapid changes before delay completes
      rerender({ value: "a" });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current).toBe("initial");

      rerender({ value: "ab" });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current).toBe("initial");

      rerender({ value: "abc" });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current).toBe("initial");

      // Final value after full delay from last change
      act(() => {
        vi.advanceTimersByTime(200); // Total 300ms from last change
      });

      // Assert
      expect(result.current).toBe("abc");
    });

    it("should ignore intermediate values and only use the latest", () => {
      // Arrange
      const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
        initialProps: { value: "initial" },
      });

      // Act - Multiple rapid changes
      rerender({ value: "value1" });
      rerender({ value: "value2" });
      rerender({ value: "value3" });
      rerender({ value: "final" });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Assert - Only final value should be set
      expect(result.current).toBe("final");
    });

    it("should not update before delay completes", () => {
      // Arrange
      const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
        initialProps: { value: "initial" },
      });

      // Act
      rerender({ value: "updated" });
      act(() => {
        vi.advanceTimersByTime(299); // Just before delay
      });

      // Assert
      expect(result.current).toBe("initial");
    });
  });

  describe("Timer cleanup", () => {
    it("should clear timeout on unmount", () => {
      // Arrange
      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");
      const { unmount } = renderHook(() => useDebouncedValue("test", 300));

      // Act
      unmount();

      // Assert
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it("should clear previous timeout when value changes", () => {
      // Arrange
      const clearTimeoutSpy = vi.spyOn(global, "clearTimeout");
      const { rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
        initialProps: { value: "initial" },
      });

      // Act - First change creates a timeout
      rerender({ value: "updated1" });
      const firstCallCount = clearTimeoutSpy.mock.calls.length;

      // Second change should clear the first timeout
      rerender({ value: "updated2" });

      // Assert
      expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThan(firstCallCount);
    });
  });

  describe("Custom delay values", () => {
    it("should work with very short delays", () => {
      // Arrange
      const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 10), {
        initialProps: { value: "initial" },
      });

      // Act
      rerender({ value: "updated" });
      act(() => {
        vi.advanceTimersByTime(10);
      });

      // Assert
      expect(result.current).toBe("updated");
    });

    it("should work with long delays", () => {
      // Arrange
      const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 2000), {
        initialProps: { value: "initial" },
      });

      // Act
      rerender({ value: "updated" });
      act(() => {
        vi.advanceTimersByTime(1999);
      });
      expect(result.current).toBe("initial");

      act(() => {
        vi.advanceTimersByTime(1);
      });

      // Assert
      expect(result.current).toBe("updated");
    });

    it("should handle zero delay", () => {
      // Arrange
      const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 0), {
        initialProps: { value: "initial" },
      });

      // Act
      rerender({ value: "updated" });
      act(() => {
        vi.advanceTimersByTime(0);
      });

      // Assert
      expect(result.current).toBe("updated");
    });

    it("should restart timer when delay value changes", () => {
      // Arrange
      const { result, rerender } = renderHook(({ value, delay }) => useDebouncedValue(value, delay), {
        initialProps: { value: "initial", delay: 300 },
      });

      // Act - Change value with first delay
      rerender({ value: "updated", delay: 300 });
      act(() => {
        vi.advanceTimersByTime(200);
      });

      // Change delay before timer completes
      rerender({ value: "updated", delay: 500 });
      act(() => {
        vi.advanceTimersByTime(300); // Original delay would have completed
      });

      // Assert - Should not update yet (new delay of 500ms)
      expect(result.current).toBe("initial");

      // Complete new delay
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(result.current).toBe("updated");
    });
  });

  describe("Type safety and edge cases", () => {
    it("should handle null values", () => {
      // Arrange
      const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
        initialProps: { value: null as string | null },
      });

      // Act
      rerender({ value: "value" });
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Assert
      expect(result.current).toBe("value");
    });

    it("should handle undefined values", () => {
      // Arrange
      const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
        initialProps: { value: undefined as string | undefined },
      });

      // Act
      rerender({ value: "value" });
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Assert
      expect(result.current).toBe("value");
    });

    it("should handle empty strings", () => {
      // Arrange
      const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
        initialProps: { value: "text" },
      });

      // Act
      rerender({ value: "" });
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Assert
      expect(result.current).toBe("");
    });

    it("should handle boolean values", () => {
      // Arrange
      const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
        initialProps: { value: false },
      });

      // Act
      rerender({ value: true });
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Assert
      expect(result.current).toBe(true);
    });

    it("should handle complex nested objects", () => {
      // Arrange
      const initialValue = { user: { name: "John", age: 30 }, items: [1, 2, 3] };
      const updatedValue = { user: { name: "Jane", age: 25 }, items: [4, 5] };

      const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
        initialProps: { value: initialValue },
      });

      // Act
      rerender({ value: updatedValue });
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Assert
      expect(result.current).toEqual(updatedValue);
    });
  });

  describe("Real-world use cases", () => {
    it("should simulate search input typing behavior", () => {
      // Arrange - Simulating user typing "react"
      const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
        initialProps: { value: "" },
      });

      // Act - User types quickly
      rerender({ value: "r" });
      act(() => {
        vi.advanceTimersByTime(50);
      });
      rerender({ value: "re" });
      act(() => {
        vi.advanceTimersByTime(50);
      });
      rerender({ value: "rea" });
      act(() => {
        vi.advanceTimersByTime(50);
      });
      rerender({ value: "reac" });
      act(() => {
        vi.advanceTimersByTime(50);
      });
      rerender({ value: "react" });

      // Before delay - should still be empty
      expect(result.current).toBe("");

      // After delay - should update to final value
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Assert
      expect(result.current).toBe("react");
    });

    it("should handle user pausing and resuming typing", () => {
      // Arrange
      const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
        initialProps: { value: "" },
      });

      // Act - User types, pauses long enough for debounce
      rerender({ value: "hello" });
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(result.current).toBe("hello");

      // User continues typing after pause
      rerender({ value: "hello w" });
      act(() => {
        vi.advanceTimersByTime(50);
      });
      rerender({ value: "hello wo" });
      act(() => {
        vi.advanceTimersByTime(50);
      });
      rerender({ value: "hello wor" });
      act(() => {
        vi.advanceTimersByTime(50);
      });
      rerender({ value: "hello world" });

      expect(result.current).toBe("hello"); // Still old value

      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Assert
      expect(result.current).toBe("hello world");
    });
  });
});

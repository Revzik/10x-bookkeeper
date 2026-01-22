import { useState, useEffect } from "react";

/**
 * Debounce a value with a delay
 * Useful for search inputs to avoid excessive API calls
 */
export const useDebouncedValue = <T>(value: T, delayMs = 300): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delayMs]);

  return debouncedValue;
};

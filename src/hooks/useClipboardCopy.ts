import { useState, useCallback } from "react";

interface UseClipboardCopyReturn {
  copiedId: string | null;
  copyText: (text: string, id: string) => Promise<void>;
}

/**
 * Custom hook for managing clipboard copy operations with visual feedback.
 *
 * Provides a simple interface to copy text to clipboard and track which item
 * was recently copied (for showing "Copied!" feedback).
 *
 * Features:
 * - Copies text to clipboard using Navigator Clipboard API
 * - Tracks copied item ID for 2 seconds
 * - Gracefully handles clipboard API unavailability
 *
 * @returns Object with copiedId (for feedback) and copyText function
 */
export const useClipboardCopy = (): UseClipboardCopyReturn => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyText = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      // Reset copied state after 2 seconds
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      console.error("Failed to copy text to clipboard");
    }
  }, []);

  return { copiedId, copyText };
};

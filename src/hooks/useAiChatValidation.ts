import { useMemo } from "react";
import type { AiChatComposerViewModel } from "@/types";

/**
 * Custom hook for computing AI chat composer validation state.
 *
 * Validates draft text against length constraints and provides
 * user-facing validation messages and character count display.
 *
 * Features:
 * - Validates input length (0-500 characters)
 * - Computes isEmpty and isTooLong flags
 * - Generates validation error messages
 * - Provides character counter label
 * - Memoized for performance
 *
 * @param draftText - Current draft text from textarea
 * @returns AiChatComposerViewModel with validation state
 */
export const useAiChatValidation = (draftText: string): AiChatComposerViewModel => {
  return useMemo((): AiChatComposerViewModel => {
    const trimmedLength = draftText.trim().length;
    const isEmpty = trimmedLength === 0;
    const isTooLong = trimmedLength > 500;

    return {
      trimmedLength,
      isEmpty,
      isTooLong,
      validationError: isEmpty ? "Type a question to send" : isTooLong ? "Max 500 characters" : null,
      charCountLabel: `${trimmedLength} / 500`,
    };
  }, [draftText]);
};

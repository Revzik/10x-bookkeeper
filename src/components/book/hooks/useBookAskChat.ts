import { useState, useMemo } from "react";
import type { BookHeaderViewModel, BookAskScopeViewModel, AiQueryScopeDto } from "@/types";
import { useAiChat } from "@/components/ai/hooks";

interface UseBookAskChatReturn {
  messages: ReturnType<typeof useAiChat>["messages"];
  draftText: string;
  isSubmitting: boolean;
  lastError: ReturnType<typeof useAiChat>["lastError"];
  canCopyLastAnswer: boolean;
  canClear: boolean;
  showLowConfidencePanel: boolean;
  lastAssistantMessage: ReturnType<typeof useAiChat>["lastAssistantMessage"];
  setDraftText: (text: string) => void;
  submitQuestion: () => Promise<void>;
  retry: () => Promise<void>;
  clearChat: () => void;
}

/**
 * Custom hook for managing Book Ask tab with per-scope transcripts.
 *
 * Maintains separate chat state for "book" and "series" scopes, allowing users to
 * switch between them without losing conversation history.
 *
 * @param book - Book header view model with series information
 * @param askScope - Current active scope ("book" or "series")
 */
export const useBookAskChat = (book: BookHeaderViewModel, askScope: BookAskScopeViewModel): UseBookAskChatReturn => {
  // Track which scope's hook is currently active
  const [activeScope, setActiveScope] = useState<BookAskScopeViewModel>(askScope);

  // Build scope DTOs
  const bookScopeDto: AiQueryScopeDto = useMemo(
    () => ({
      book_id: book.id,
      series_id: null,
    }),
    [book.id]
  );

  const seriesScopeDto: AiQueryScopeDto = useMemo(
    () => ({
      book_id: null,
      series_id: book.seriesId,
    }),
    [book.seriesId]
  );

  // Initialize both chat hooks (one per scope)
  const bookChat = useAiChat(bookScopeDto);
  const seriesChat = useAiChat(seriesScopeDto);

  // Update active scope when askScope changes
  if (activeScope !== askScope) {
    setActiveScope(askScope);
  }

  // Return the appropriate chat hook based on active scope
  return askScope === "book" ? bookChat : seriesChat;
};

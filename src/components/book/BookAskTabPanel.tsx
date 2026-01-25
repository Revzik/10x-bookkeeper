import { useState, useMemo } from "react";
import type { BookHeaderViewModel, BookAskScopeViewModel, AiChatComposerViewModel } from "@/types";
import { useBookAskChat } from "./hooks";
import { BookAskScopeBar } from "./ask";
import { InlineBanner } from "@/components/library/InlineBanner";
import {
  AiChatTranscript,
  AiChatComposer,
  AiChatLowConfidencePanel,
  ClearChatConfirmDialog,
} from "@/components/ai/chat";

interface BookAskTabPanelProps {
  book: BookHeaderViewModel;
  askScope: BookAskScopeViewModel;
  setAskScope: (scope: BookAskScopeViewModel) => void;
}

/**
 * BookAskTabPanel - Book-scoped Q&A interface with optional series scope.
 *
 * Orchestrates the Ask tab for a book: wires the scope switch, delegates chat behavior
 * to useBookAskChat hook, and renders transcript/composer/error/low-confidence states.
 *
 * Features:
 * - Scope toggle between "This book" and "This series" (when available)
 * - Separate chat transcripts per scope (in-memory only)
 * - Low confidence guidance (non-error)
 * - Error handling with retry for rate-limited/internal errors
 * - Copy and clear chat actions
 */
export const BookAskTabPanel = ({ book, askScope, setAskScope }: BookAskTabPanelProps) => {
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // Chat state management (per-scope transcripts)
  const {
    messages,
    draftText,
    isSubmitting,
    lastError,
    canCopyLastAnswer,
    canClear,
    showLowConfidencePanel,
    lastAssistantMessage,
    setDraftText,
    submitQuestion,
    retry,
    clearChat,
  } = useBookAskChat(book, askScope);

  // Determine series scope availability
  const canUseSeriesScope = book.seriesId !== null;
  const showSeriesDisabledHint = !canUseSeriesScope && askScope === "book";

  // Compute validation state for composer
  const composerViewModel: AiChatComposerViewModel = useMemo(() => {
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

  // Handle scope change
  const handleScopeChange = (nextScope: BookAskScopeViewModel) => {
    // Guard: prevent series scope if unavailable
    if (nextScope === "series" && !canUseSeriesScope) {
      return;
    }

    setAskScope(nextScope);
  };

  // Handle copy message content
  const handleCopyMessage = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      // Reset copied state after 2 seconds
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch {
      // Silently fail - clipboard API might not be available
    }
  };

  // Handle copy last answer (from dropdown)
  const handleCopyLastAnswer = async () => {
    if (!lastAssistantMessage) return;
    await handleCopyMessage(lastAssistantMessage.content, lastAssistantMessage.id);
  };

  // Handle clear chat - open confirmation dialog
  const handleClearChatClick = () => {
    setShowClearDialog(true);
  };

  // Handle confirmed clear
  const handleConfirmClear = () => {
    clearChat();
    setShowClearDialog(false);
  };

  // Compute empty state text based on scope
  const emptyStateText =
    askScope === "book"
      ? "Ask a question about this book to get started"
      : "Ask a question about this series to get started";

  // Compute placeholder based on scope
  const placeholder = askScope === "book" ? "Ask a question about this book..." : "Ask a question about this series...";

  return (
    <div className="space-y-4">
      {/* Scope Bar */}
      <BookAskScopeBar
        scope={askScope}
        canUseSeriesScope={canUseSeriesScope}
        onScopeChange={handleScopeChange}
        showSeriesDisabledHint={showSeriesDisabledHint}
      />

      {/* Error Banner */}
      {lastError && (
        <InlineBanner
          error={lastError}
          onRetry={lastError.code === "RATE_LIMITED" || lastError.code === "INTERNAL_ERROR" ? retry : undefined}
        />
      )}

      {/* Chat Transcript */}
      <AiChatTranscript
        messages={messages}
        emptyStateText={emptyStateText}
        copiedMessageId={copiedMessageId}
        onCopyMessage={handleCopyMessage}
      />

      {/* Low Confidence Panel */}
      <AiChatLowConfidencePanel
        visible={showLowConfidencePanel}
        scope={askScope}
        canUseSeriesScope={canUseSeriesScope}
      />

      {/* Composer */}
      <AiChatComposer
        value={draftText}
        disabled={isSubmitting}
        placeholder={placeholder}
        composer={composerViewModel}
        canCopyLastAnswer={canCopyLastAnswer}
        canClear={canClear}
        onChange={setDraftText}
        onSubmit={submitQuestion}
        onCopyLastAnswer={handleCopyLastAnswer}
        onClearChatClick={handleClearChatClick}
      />

      {/* Clear Chat Confirmation Dialog */}
      <ClearChatConfirmDialog open={showClearDialog} onOpenChange={setShowClearDialog} onConfirm={handleConfirmClear} />
    </div>
  );
};

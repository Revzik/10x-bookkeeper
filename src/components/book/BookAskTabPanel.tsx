import { useState } from "react";
import type { BookHeaderViewModel, BookAskScopeViewModel } from "@/types";
import { useBookAskChat } from "./hooks";
import { useClipboardCopy } from "@/hooks/useClipboardCopy";
import { useAiChatValidation } from "@/hooks/useAiChatValidation";
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

  // Clipboard operations
  const { copiedId, copyText } = useClipboardCopy();

  // Validation state for composer
  const composer = useAiChatValidation(draftText);

  // Determine series scope availability
  const canUseSeriesScope = book.seriesId !== null;
  const showSeriesDisabledHint = !canUseSeriesScope && askScope === "book";

  // Handle scope change
  const handleScopeChange = (nextScope: BookAskScopeViewModel) => {
    // Guard: prevent series scope if unavailable
    if (nextScope === "series" && !canUseSeriesScope) {
      return;
    }

    setAskScope(nextScope);
  };

  // Handle copy last answer (from dropdown)
  const handleCopyLastAnswer = async () => {
    if (!lastAssistantMessage) return;
    await copyText(lastAssistantMessage.content, lastAssistantMessage.id);
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
        copiedMessageId={copiedId}
        onCopyMessage={copyText}
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
        composer={composer}
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

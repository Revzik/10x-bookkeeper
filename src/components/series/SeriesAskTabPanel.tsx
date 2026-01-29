import { useState, useMemo } from "react";
import type { AiQueryScopeDto } from "@/types";
import { useAiChat } from "@/components/ai/hooks";
import { useClipboardCopy } from "@/hooks/useClipboardCopy";
import { useAiChatValidation } from "@/hooks/useAiChatValidation";
import { InlineBanner } from "@/components/library/InlineBanner";
import {
  AiChatTranscript,
  AiChatComposer,
  AiChatLowConfidencePanel,
  ClearChatConfirmDialog,
} from "@/components/ai/chat";

interface SeriesAskTabPanelProps {
  seriesId: string;
}

/**
 * SeriesAskTabPanel - Series-scoped Q&A interface
 *
 * Orchestrates the Ask tab for a series: delegates chat behavior to useAiChat hook,
 * and renders transcript/composer/error/low-confidence states using shared components.
 *
 * Features:
 * - Series-scoped AI queries
 * - Low confidence guidance (non-error)
 * - Error handling with retry for rate-limited/internal errors
 * - Copy and clear chat actions
 */
export const SeriesAskTabPanel = ({ seriesId }: SeriesAskTabPanelProps) => {
  const [showClearDialog, setShowClearDialog] = useState(false);

  // Build scope for series
  const scope: AiQueryScopeDto = useMemo(
    () => ({
      book_id: null,
      series_id: seriesId,
    }),
    [seriesId]
  );

  // Chat state management
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
  } = useAiChat(scope);

  // Clipboard operations
  const { copiedId, copyText } = useClipboardCopy();

  // Validation state for composer
  const composer = useAiChatValidation(draftText);

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

  // Compute scope-specific text
  const emptyStateText = "Ask a question about this series to get started";
  const placeholder = "Ask a question about this series...";

  return (
    <div className="space-y-4">
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
      <AiChatLowConfidencePanel visible={showLowConfidencePanel} scope="series" canUseSeriesScope={false} />

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

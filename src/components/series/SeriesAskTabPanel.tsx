import { useState, useRef, useEffect } from "react";
import { useSeriesAiChat } from "./hooks";
import { InlineBanner } from "@/components/library/InlineBanner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SeriesAskTabPanelProps {
  seriesId: string;
}

/**
 * SeriesAskTabPanel - Series-scoped Q&A interface
 *
 * Orchestrates the Ask tab: owns chat state, integrates with POST /ai/query,
 * renders transcript/composer, and handles error/low-confidence states.
 */
export const SeriesAskTabPanel = ({ seriesId }: SeriesAskTabPanelProps) => {
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

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
  } = useSeriesAiChat(seriesId);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages]);

  // Compute validation state
  const trimmedLength = draftText.trim().length;
  const isEmpty = trimmedLength === 0;
  const isTooLong = trimmedLength > 500;
  const isValid = !isEmpty && !isTooLong;

  const validationError = isEmpty ? "Type a question to send" : isTooLong ? "Max 500 characters" : null;

  const charCountLabel = `${trimmedLength} / 500`;

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

  // Handle submit (form submission or Enter key)
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!isValid || isSubmitting) {
      return;
    }

    await submitQuestion();
  };

  // Handle Enter/Shift+Enter behavior
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

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
      <div ref={transcriptRef} className="max-h-[55vh] overflow-auto rounded-lg border p-3">
        <div className="space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">Ask a question about this series to get started</p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              role="group"
              aria-label="Chat message"
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 ${
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : message.status === "pending"
                      ? "bg-muted text-muted-foreground"
                      : message.status === "failed"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted"
                }`}
              >
                <div className="mb-1 flex items-center gap-2 text-xs">
                  <span className="font-medium">{message.role === "user" ? "You" : "Assistant"}</span>
                </div>
                {message.status === "pending" ? (
                  <div className="flex items-center gap-1">
                    <span className="text-sm">Thinking</span>
                    <span className="animate-pulse">...</span>
                  </div>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap break-words text-sm">
                      {message.content || (message.status === "failed" ? "Failed to get response" : "")}
                    </p>
                    {message.role === "assistant" && message.status === "sent" && message.content && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-auto px-2 py-1 text-xs"
                        onClick={() => handleCopyMessage(message.content, message.id)}
                      >
                        {copiedMessageId === message.id ? "Copied!" : "Copy"}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Low Confidence Panel */}
      {showLowConfidencePanel && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
          <h3 className="mb-2 font-semibold text-amber-900 dark:text-amber-100">Not enough in your notes (yet)</h3>
          <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-200">
            <li>• Add notes to the relevant chapter(s)</li>
            <li>• Confirm you&apos;re on the right series</li>
            <li>• Try a more specific phrasing (names, places, chapter number)</li>
          </ul>
        </div>
      )}

      {/* Composer */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          value={draftText}
          onChange={(e) => setDraftText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSubmitting}
          placeholder="Ask a question about this series..."
          className="min-h-[100px] resize-y"
          aria-label="Question input"
        />

        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            <span>{charCountLabel}</span>
            <span>Enter to send • Shift+Enter for newline</span>
          </div>

          <div className="flex items-center gap-2">
            {validationError && !isSubmitting && (
              <span className={`text-xs ${isTooLong ? "text-destructive" : "text-muted-foreground"}`}>
                {validationError}
              </span>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isSubmitting}>
                  Options
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled={!canCopyLastAnswer || isSubmitting} onClick={handleCopyLastAnswer}>
                  Copy last answer
                </DropdownMenuItem>
                <DropdownMenuItem disabled={!canClear || isSubmitting} onClick={handleClearChatClick}>
                  Clear chat
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button type="submit" disabled={!isValid || isSubmitting}>
              {isSubmitting ? "Sending..." : "Send"}
            </Button>
          </div>
        </div>
      </form>

      {/* Clear Chat Confirmation Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear chat?</DialogTitle>
            <DialogDescription>This will clear the current chat transcript. This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmClear}>
              Clear chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

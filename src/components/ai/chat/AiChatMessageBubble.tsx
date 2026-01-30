import type { AiChatMessageViewModel } from "@/types";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/react";

interface AiChatMessageBubbleProps {
  message: AiChatMessageViewModel;
  isCopied: boolean;
  onCopy: () => void;
}

/**
 * AiChatMessageBubble - Shows one message with role-based styling and message status.
 *
 * Shared component used by both Book Ask and Series Ask tabs.
 * Features:
 * - Role-based styling (user vs assistant)
 * - Status-based styling (sent/pending/failed)
 * - Copy button for assistant messages (only when sent and content non-empty)
 * - Safe plain text rendering (no HTML)
 */
export const AiChatMessageBubble = ({ message, isCopied, onCopy }: AiChatMessageBubbleProps) => {
  const { t } = useT();
  // Determine bubble styling based on role and status
  const getBubbleClassName = (): string => {
    const baseClasses = "max-w-[80%] rounded-lg px-3 py-2";

    if (message.role === "user") {
      return `${baseClasses} bg-primary text-primary-foreground`;
    }

    // Assistant messages - style based on status
    if (message.status === "pending") {
      return `${baseClasses} bg-muted text-muted-foreground`;
    }

    if (message.status === "failed") {
      return `${baseClasses} bg-destructive/10 text-destructive`;
    }

    return `${baseClasses} bg-muted`;
  };

  const containerClassName = `flex ${message.role === "user" ? "justify-end" : "justify-start"}`;

  return (
    <div role="group" aria-label={t("ai.chat.messageGroupLabel")} className={containerClassName}>
      <div className={getBubbleClassName()}>
        <div className="mb-1 flex items-center gap-2 text-xs">
          <span className="font-medium">{message.role === "user" ? t("ai.chat.you") : t("ai.chat.assistant")}</span>
        </div>
        {message.status === "pending" ? (
          <div className="flex items-center gap-1">
            <span className="text-sm">{t("ai.chat.thinking")}</span>
            <span className="animate-pulse">...</span>
          </div>
        ) : (
          <>
            <p className="whitespace-pre-wrap break-words text-sm">
              {message.content || (message.status === "failed" ? t("ai.chat.failedResponse") : "")}
            </p>
            {message.role === "assistant" && message.status === "sent" && message.content && (
              <Button variant="ghost" size="sm" className="mt-2 h-auto px-2 py-1 text-xs" onClick={onCopy}>
                {isCopied ? t("ai.chat.copied") : t("ai.chat.copy")}
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

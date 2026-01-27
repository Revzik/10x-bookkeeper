import { useRef, useEffect } from "react";
import type { AiChatMessageViewModel } from "@/types";
import { AiChatMessageBubble } from "./AiChatMessageBubble";

interface AiChatTranscriptProps {
  messages: AiChatMessageViewModel[];
  emptyStateText: string;
  copiedMessageId: string | null;
  onCopyMessage: (content: string, messageId: string) => void;
}

/**
 * AiChatTranscript - Renders the transcript, pending/typing state, and safe text rendering.
 *
 * Shared component used by both Book Ask and Series Ask tabs.
 * Features:
 * - Auto-scrolls to bottom when messages change
 * - Renders safe plain text (no HTML)
 * - Shows empty state when no messages
 */
export const AiChatTranscript = ({
  messages,
  emptyStateText,
  copiedMessageId,
  onCopyMessage,
}: AiChatTranscriptProps) => {
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div ref={transcriptRef} className="max-h-[55vh] overflow-auto rounded-lg border p-3">
      <div className="space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">{emptyStateText}</p>
          </div>
        )}

        {messages.map((message) => (
          <AiChatMessageBubble
            key={message.id}
            message={message}
            isCopied={copiedMessageId === message.id}
            onCopy={() => onCopyMessage(message.content, message.id)}
          />
        ))}
      </div>
    </div>
  );
};

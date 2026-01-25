import { useState, useCallback, useRef, useEffect } from "react";
import type {
  AiChatStateViewModel,
  AiChatMessageViewModel,
  AiQueryScopeDto,
  AiQueryResponseDtoSimple,
  ApiErrorDto,
} from "@/types";
import { apiClient } from "@/lib/api/client";

interface UseAiChatReturn {
  // State
  messages: AiChatMessageViewModel[];
  draftText: string;
  isSubmitting: boolean;
  lastError: ApiErrorDto | null;

  // Derived state
  canCopyLastAnswer: boolean;
  canClear: boolean;
  showLowConfidencePanel: boolean;
  lastAssistantMessage: AiChatMessageViewModel | null;

  // Actions
  setDraftText: (text: string) => void;
  submitQuestion: () => Promise<void>;
  retry: () => Promise<void>;
  clearChat: () => void;
}

/**
 * Shared custom hook for managing AI chat interfaces (Book Ask and Series Ask).
 * Handles AI query submission, message state, error handling, and retry logic.
 *
 * @param scope - The AI query scope (book_id or series_id)
 */
export const useAiChat = (scope: AiQueryScopeDto): UseAiChatReturn => {
  const [state, setState] = useState<AiChatStateViewModel>({
    messages: [],
    draftText: "",
    isSubmitting: false,
    lastError: null,
    lastSubmittedQueryText: null,
  });

  // AbortController for canceling in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Abort request on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Derived state: last assistant message
  const lastAssistantMessage =
    state.messages
      .slice()
      .reverse()
      .find((msg) => msg.role === "assistant") ?? null;

  // Derived state: can copy last answer
  const canCopyLastAnswer = lastAssistantMessage !== null && lastAssistantMessage.status === "sent";

  // Derived state: can clear chat
  const canClear = state.messages.length > 0;

  // Derived state: show low confidence panel
  const showLowConfidencePanel = lastAssistantMessage?.lowConfidence === true;

  /**
   * Update draft text
   */
  const setDraftText = useCallback((text: string) => {
    setState((prev) => ({ ...prev, draftText: text }));
  }, []);

  /**
   * Submit a question to the AI
   */
  const submitQuestion = useCallback(async () => {
    const trimmed = state.draftText.trim();

    // Validate input
    if (trimmed.length === 0 || trimmed.length > 500) {
      return;
    }

    // Abort any in-flight request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    // Create user message
    const userMessage: AiChatMessageViewModel = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      createdAtMs: Date.now(),
      status: "sent",
    };

    // Create pending assistant message
    const pendingAssistantMessage: AiChatMessageViewModel = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      createdAtMs: Date.now(),
      status: "pending",
    };

    // Update state: add messages, set submitting, clear draft and error
    setState((prev) => ({
      ...prev,
      messages: [...prev.messages, userMessage, pendingAssistantMessage],
      draftText: "",
      isSubmitting: true,
      lastError: null,
      lastSubmittedQueryText: trimmed,
    }));

    try {
      // Call AI query endpoint
      const response = await apiClient.postJson<
        { query_text: string; scope: AiQueryScopeDto },
        AiQueryResponseDtoSimple
      >("/ai/query", {
        query_text: trimmed,
        scope,
      });

      // Replace pending message with actual answer
      const assistantMessage: AiChatMessageViewModel = {
        ...pendingAssistantMessage,
        content: response.answer.text,
        status: "sent",
        lowConfidence: response.answer.low_confidence,
      };

      setState((prev) => ({
        ...prev,
        messages: prev.messages.map((msg) => (msg.id === pendingAssistantMessage.id ? assistantMessage : msg)),
        isSubmitting: false,
      }));
    } catch (error) {
      // Handle error
      const apiError = error as { error: ApiErrorDto };

      // Mark pending message as failed
      setState((prev) => ({
        ...prev,
        messages: prev.messages.map((msg) =>
          msg.id === pendingAssistantMessage.id ? { ...msg, status: "failed" as const } : msg
        ),
        isSubmitting: false,
        lastError: apiError.error,
      }));
    }
  }, [state.draftText, scope]);

  /**
   * Retry the last failed question
   */
  const retry = useCallback(async () => {
    const queryText = state.lastSubmittedQueryText;
    if (!queryText) {
      return;
    }

    // Restore draft text and submit
    setState((prev) => ({ ...prev, draftText: queryText }));

    // Wait for state update, then submit
    setTimeout(() => {
      submitQuestion();
    }, 0);
  }, [state.lastSubmittedQueryText, submitQuestion]);

  /**
   * Clear chat transcript and reset state
   */
  const clearChat = useCallback(() => {
    // Abort any in-flight request
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;

    // Reset state
    setState({
      messages: [],
      draftText: "",
      isSubmitting: false,
      lastError: null,
      lastSubmittedQueryText: null,
    });
  }, []);

  return {
    // State
    messages: state.messages,
    draftText: state.draftText,
    isSubmitting: state.isSubmitting,
    lastError: state.lastError,

    // Derived state
    canCopyLastAnswer,
    canClear,
    showLowConfidencePanel,
    lastAssistantMessage,

    // Actions
    setDraftText,
    submitQuestion,
    retry,
    clearChat,
  };
};

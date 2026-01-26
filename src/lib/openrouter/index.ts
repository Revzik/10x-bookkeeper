/**
 * OpenRouter service module
 *
 * This module provides a server-side service for making LLM chat completion requests
 * to the OpenRouter API with structured JSON responses.
 *
 * IMPORTANT: This service must ONLY be used on the server (Astro API routes or
 * Supabase Edge Functions) to keep the OpenRouter API key secure.
 */

// Main service
export { OpenRouterService } from "./openrouter.service";

// Types
export type {
  ChatMessage,
  OpenRouterMessage,
  ModelParams,
  RetryPolicy,
  OpenRouterConfig,
  TokenUsage,
  ChatJsonResult,
  ParsedChatResponse,
  ChatJsonInput,
} from "./openrouter.types";

// Zod schemas
export {
  userPromptSchema,
  systemPromptSchema,
  chatMessageSchema,
  modelParamsSchema,
  openRouterResponseSchema,
} from "./openrouter.types";

// Errors
export {
  OpenRouterError,
  OpenRouterConfigError,
  OpenRouterValidationError,
  OpenRouterAuthError,
  OpenRouterRateLimitError,
  OpenRouterTimeoutError,
  OpenRouterUpstreamError,
  OpenRouterParseError,
  OpenRouterSchemaMismatchError,
  normalizeError,
  errorToStatusCode,
  getSafeErrorMessage,
} from "./openrouter.errors";

// Example schemas
export {
  answerWithCitationsZodSchema,
  answerWithCitationsJsonSchema,
  citationSchema,
  type AnswerWithCitations,
} from "./schemas";

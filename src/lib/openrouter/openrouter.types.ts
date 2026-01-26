import { z } from "zod";

/**
 * App-level chat message structure
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * OpenRouter API message structure (compatible with OpenAI format)
 */
export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Model parameters for chat completions
 */
export interface ModelParams {
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  seed?: number;
}

/**
 * Retry policy configuration
 */
export interface RetryPolicy {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * OpenRouter service configuration
 */
export interface OpenRouterConfig {
  apiKey: string;
  baseUrl?: string;
  model?: string;
  params?: ModelParams;
  schemaName: string;
  appName?: string;
  appUrl?: string;
  timeoutMs?: number;
  retry?: RetryPolicy;
}

/**
 * Token usage information from OpenRouter response
 */
export interface TokenUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

/**
 * Result from chatJson method
 */
export interface ChatJsonResult<T> {
  data: T;
  rawText?: string;
  model: string;
  usage?: TokenUsage;
  requestId?: string;
}

/**
 * Internal parsed response structure
 */
export interface ParsedChatResponse {
  contentText: string;
  usage?: TokenUsage;
  model?: string;
  requestId?: string;
}

/**
 * Input for chatJson method
 */
export interface ChatJsonInput<T> {
  system?: string;
  user: string;
  history?: ChatMessage[];
  jsonSchema: object;
  zodSchema: z.ZodType<T>;
}

// ==================== Zod Schemas ====================

/**
 * Schema for validating user prompt (non-empty string)
 */
export const userPromptSchema = z
  .string()
  .min(1, "User prompt cannot be empty")
  .max(50000, "User prompt exceeds maximum length");

/**
 * Schema for validating system prompt
 */
export const systemPromptSchema = z.string().max(10000, "System prompt exceeds maximum length").optional();

/**
 * Schema for validating chat message
 */
export const chatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().min(1, "Message content cannot be empty"),
});

/**
 * Schema for validating model parameters
 */
export const modelParamsSchema = z
  .object({
    temperature: z.number().min(0).max(2).optional(),
    top_p: z.number().min(0).max(1).optional(),
    max_tokens: z.number().int().positive().optional(),
    frequency_penalty: z.number().min(-2).max(2).optional(),
    presence_penalty: z.number().min(-2).max(2).optional(),
    seed: z.number().int().optional(),
  })
  .strict();

/**
 * Schema for validating OpenRouter API response structure
 */
export const openRouterResponseSchema = z.object({
  id: z.string().optional(),
  choices: z.array(
    z.object({
      message: z.object({
        role: z.string(),
        content: z.string(),
      }),
      finish_reason: z.string().optional(),
    })
  ),
  usage: z
    .object({
      prompt_tokens: z.number().optional(),
      completion_tokens: z.number().optional(),
      total_tokens: z.number().optional(),
    })
    .optional(),
  model: z.string().optional(),
});

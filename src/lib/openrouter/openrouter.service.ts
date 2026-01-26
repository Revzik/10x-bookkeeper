import type { z } from "zod";
import type {
  OpenRouterConfig,
  ModelParams,
  ChatMessage,
  OpenRouterMessage,
  ChatJsonInput,
  ChatJsonResult,
  ParsedChatResponse,
  RetryPolicy,
} from "./openrouter.types";
import {
  userPromptSchema,
  systemPromptSchema,
  chatMessageSchema,
  modelParamsSchema,
  openRouterResponseSchema,
} from "./openrouter.types";
import {
  OpenRouterConfigError,
  OpenRouterValidationError,
  OpenRouterAuthError,
  OpenRouterRateLimitError,
  OpenRouterTimeoutError,
  OpenRouterUpstreamError,
  OpenRouterParseError,
  OpenRouterSchemaMismatchError,
} from "./openrouter.errors";

/**
 * OpenRouter service for making LLM chat completion requests
 *
 * This service is designed to run ONLY on the server (Astro API routes or Supabase Edge Functions)
 * to keep the OpenRouter API key secure and off the client.
 *
 * Features:
 * - Structured JSON responses with JSON Schema validation
 * - Automatic retry with exponential backoff for transient errors
 * - Comprehensive error handling and typed errors
 * - Request timeout support
 * - Token usage tracking
 */
export class OpenRouterService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly params: ModelParams;
  private readonly schemaName: string;
  private readonly appName?: string;
  private readonly appUrl?: string;
  private readonly timeoutMs: number;
  private readonly retryPolicy: RetryPolicy;

  /**
   * Default retry policy for transient errors
   */
  private static readonly DEFAULT_RETRY_POLICY: RetryPolicy = {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 10000,
    backoffMultiplier: 2,
  };

  /**
   * Default model parameters optimized for structured JSON responses
   */
  private static readonly DEFAULT_MODEL_PARAMS: ModelParams = {
    temperature: 0.2,
    top_p: 0.9,
    max_tokens: 600,
  };

  constructor(config: OpenRouterConfig) {
    // Validate configuration early (guard clauses)
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      throw new OpenRouterConfigError("OpenRouter API key is required");
    }

    const baseUrl = config.baseUrl ?? "https://openrouter.ai/api/v1";
    if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
      throw new OpenRouterConfigError("Base URL must start with http:// or https://");
    }

    const model = config.model ?? "openai/gpt-4o-mini";
    if (!model || model.trim().length === 0) {
      throw new OpenRouterConfigError("Model must be specified");
    }

    if (!config.schemaName || config.schemaName.trim().length === 0) {
      throw new OpenRouterConfigError("Schema name is required");
    }

    // Initialize fields
    this.apiKey = config.apiKey;
    this.baseUrl = baseUrl;
    this.model = model;
    this.params = { ...OpenRouterService.DEFAULT_MODEL_PARAMS, ...config.params };
    this.schemaName = config.schemaName;
    this.appName = config.appName;
    this.appUrl = config.appUrl;
    this.timeoutMs = config.timeoutMs ?? 60000; // 60s default
    this.retryPolicy = { ...OpenRouterService.DEFAULT_RETRY_POLICY, ...config.retry };

    // Validate params
    const paramsResult = modelParamsSchema.safeParse(this.params);
    if (!paramsResult.success) {
      throw new OpenRouterConfigError(`Invalid model parameters: ${paramsResult.error.message}`);
    }
  }

  /**
   * Make a chat completion request with structured JSON response
   *
   * @param input - Chat input with user prompt, optional system prompt, history, and JSON schema
   * @returns Promise resolving to validated JSON data with metadata
   * @throws {OpenRouterValidationError} If input validation fails
   * @throws {OpenRouterAuthError} If authentication fails
   * @throws {OpenRouterRateLimitError} If rate limit is exceeded
   * @throws {OpenRouterTimeoutError} If request times out
   * @throws {OpenRouterUpstreamError} If upstream service fails
   * @throws {OpenRouterParseError} If JSON parsing fails
   * @throws {OpenRouterSchemaMismatchError} If returned JSON doesn't match schema
   */
  async chatJson<T>(input: ChatJsonInput<T>): Promise<ChatJsonResult<T>> {
    // Validate input
    this.validateChatJsonInput(input);

    // Build messages
    const messages = this.buildMessages({
      system: input.system,
      history: input.history,
      user: input.user,
    });

    // Build response format for structured output
    const responseFormat = this.buildResponseFormat(this.schemaName, input.jsonSchema);

    // Build request body
    const requestBody = this.buildRequestBody({
      model: this.model,
      messages,
      params: this.params,
      responseFormat,
    });

    // Execute request with retry
    const response = await this.requestWithRetry("/chat/completions", requestBody);

    // Parse response
    const parsed = await this.parseChatResponse(response);

    // Parse and validate JSON
    const jsonData = this.parseJsonFromModel(parsed.contentText);
    const validatedData = this.validateWithZod(jsonData, input.zodSchema);

    return {
      data: validatedData,
      rawText: parsed.contentText,
      model: parsed.model ?? this.model,
      usage: parsed.usage,
      requestId: parsed.requestId,
    };
  }

  /**
   * Validate chat JSON input
   */
  private validateChatJsonInput<T>(input: ChatJsonInput<T>): void {
    // Validate user prompt
    const userResult = userPromptSchema.safeParse(input.user);
    if (!userResult.success) {
      throw new OpenRouterValidationError(`Invalid user prompt: ${userResult.error.message}`);
    }

    // Validate system prompt if provided
    if (input.system !== undefined) {
      const systemResult = systemPromptSchema.safeParse(input.system);
      if (!systemResult.success) {
        throw new OpenRouterValidationError(`Invalid system prompt: ${systemResult.error.message}`);
      }
    }

    // Validate history if provided
    if (input.history) {
      for (const msg of input.history) {
        const msgResult = chatMessageSchema.safeParse(msg);
        if (!msgResult.success) {
          throw new OpenRouterValidationError(`Invalid history message: ${msgResult.error.message}`);
        }
      }
    }

    // Validate JSON schema object
    if (!input.jsonSchema || typeof input.jsonSchema !== "object") {
      throw new OpenRouterValidationError("Valid JSON schema object is required");
    }
  }

  /**
   * Build messages array in the correct order: system -> history -> user
   */
  private buildMessages(options: { system?: string; history?: ChatMessage[]; user: string }): OpenRouterMessage[] {
    const messages: OpenRouterMessage[] = [];

    // Add system message if provided
    if (options.system && options.system.trim().length > 0) {
      messages.push({
        role: "system",
        content: options.system.trim(),
      });
    }

    // Add history if provided (with length cap to prevent unbounded token usage)
    if (options.history && options.history.length > 0) {
      const maxHistoryTurns = 10; // Cap to last 10 messages
      const cappedHistory = options.history.slice(-maxHistoryTurns);

      for (const msg of cappedHistory) {
        const trimmedContent = msg.content.trim();
        // Skip empty messages
        if (trimmedContent.length > 0) {
          messages.push({
            role: msg.role,
            content: trimmedContent,
          });
        }
      }
    }

    // Add final user message (required)
    messages.push({
      role: "user",
      content: options.user.trim(),
    });

    return messages;
  }

  /**
   * Build response format object for structured JSON output
   */
  private buildResponseFormat(
    schemaName: string,
    jsonSchema: object
  ): {
    type: "json_schema";
    json_schema: {
      name: string;
      strict: boolean;
      schema: object;
    };
  } {
    return {
      type: "json_schema",
      json_schema: {
        name: schemaName,
        strict: true,
        schema: jsonSchema,
      },
    };
  }

  /**
   * Build request body for OpenRouter chat completion
   */
  private buildRequestBody(options: {
    model: string;
    messages: OpenRouterMessage[];
    params: ModelParams;
    responseFormat?: object;
  }): object {
    // Start with base payload
    const body: Record<string, unknown> = {
      model: options.model,
      messages: options.messages,
    };

    // Add model parameters (filter out undefined values)
    if (options.params.temperature !== undefined) {
      body.temperature = options.params.temperature;
    }
    if (options.params.top_p !== undefined) {
      body.top_p = options.params.top_p;
    }
    if (options.params.max_tokens !== undefined) {
      body.max_tokens = options.params.max_tokens;
    }
    if (options.params.frequency_penalty !== undefined) {
      body.frequency_penalty = options.params.frequency_penalty;
    }
    if (options.params.presence_penalty !== undefined) {
      body.presence_penalty = options.params.presence_penalty;
    }
    if (options.params.seed !== undefined) {
      body.seed = options.params.seed;
    }

    // Add response format if provided
    if (options.responseFormat) {
      body.response_format = options.responseFormat;
    }

    return body;
  }

  /**
   * Execute HTTP request with retry logic for transient errors
   */
  private async requestWithRetry(path: string, body: object): Promise<Response> {
    let lastError: Error | undefined;
    let attempt = 0;
    const startTime = Date.now();

    while (attempt < this.retryPolicy.maxAttempts) {
      try {
        const response = await this.request(path, body);
        const latency = Date.now() - startTime;

        // Log successful request (safe - no secrets or sensitive data)
        this.logRequest({
          status: "success",
          model: this.model,
          latencyMs: latency,
          attempts: attempt + 1,
        });

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        attempt++;

        // Log retry attempt
        if (attempt < this.retryPolicy.maxAttempts) {
          this.logRequest({
            status: "retry",
            model: this.model,
            attempt,
            maxAttempts: this.retryPolicy.maxAttempts,
            errorType: error instanceof Error ? error.name : "Unknown",
          });
        }

        // Determine if we should retry
        const shouldRetry = this.shouldRetryError(error, attempt);
        if (!shouldRetry || attempt >= this.retryPolicy.maxAttempts) {
          const latency = Date.now() - startTime;
          this.logRequest({
            status: "error",
            model: this.model,
            latencyMs: latency,
            attempts: attempt,
            errorType: error instanceof Error ? error.name : "Unknown",
          });
          throw error;
        }

        // Calculate delay with exponential backoff and jitter
        const baseDelay = Math.min(
          this.retryPolicy.initialDelayMs * Math.pow(this.retryPolicy.backoffMultiplier, attempt - 1),
          this.retryPolicy.maxDelayMs
        );
        const jitter = Math.random() * 0.3 * baseDelay; // 0-30% jitter
        const delayMs = Math.floor(baseDelay + jitter);

        // Handle Retry-After header for rate limits
        if (error instanceof OpenRouterRateLimitError && error.retryAfterMs) {
          await this.sleep(error.retryAfterMs);
        } else {
          await this.sleep(delayMs);
        }
      }
    }

    throw lastError ?? new OpenRouterUpstreamError("Request failed after retries");
  }

  /**
   * Determine if an error should trigger a retry
   */
  private shouldRetryError(error: unknown, attempt: number): boolean {
    // Don't retry if we've exhausted attempts
    if (attempt >= this.retryPolicy.maxAttempts) {
      return false;
    }

    // Retry on rate limits
    if (error instanceof OpenRouterRateLimitError) {
      return true;
    }

    // Retry on timeout (limited - only first retry)
    if (error instanceof OpenRouterTimeoutError && attempt === 1) {
      return true;
    }

    // Retry on 5xx upstream errors
    if (error instanceof OpenRouterUpstreamError && error.status && error.status >= 500) {
      return true;
    }

    // Retry on network errors
    if (error instanceof Error && (error.message.includes("fetch") || error.message.includes("network"))) {
      return true;
    }

    return false;
  }

  /**
   * Execute HTTP request with timeout
   */
  private async request(path: string, body: object): Promise<Response> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: this.buildHeaders(),
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle HTTP errors
      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort (timeout)
      if (error instanceof Error && error.name === "AbortError") {
        throw new OpenRouterTimeoutError(`Request timed out after ${this.timeoutMs}ms`);
      }

      // Handle network errors
      if (error instanceof Error) {
        throw new OpenRouterUpstreamError(`Network error: ${error.message}`);
      }

      throw new OpenRouterUpstreamError("Unknown network error");
    }
  }

  /**
   * Build HTTP headers for OpenRouter request
   */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };

    // Add optional attribution headers (recommended by OpenRouter)
    if (this.appUrl) {
      headers["HTTP-Referer"] = this.appUrl;
    }
    if (this.appName) {
      headers["X-Title"] = this.appName;
    }

    return headers;
  }

  /**
   * Handle error responses from OpenRouter
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    const status = response.status;
    let bodyText = "";

    try {
      bodyText = await response.text();
    } catch {
      // Ignore errors reading body
    }

    const bodySnippet = bodyText.slice(0, 500);

    // Extract request ID if available
    const requestId = response.headers.get("x-request-id") ?? undefined;

    // Handle authentication/authorization errors
    if (status === 401 || status === 403) {
      throw new OpenRouterAuthError("Authentication failed. Invalid or expired API key.", status);
    }

    // Handle rate limiting
    if (status === 429) {
      const retryAfter = response.headers.get("retry-after");
      const retryAfterMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : undefined;
      throw new OpenRouterRateLimitError("Rate limit exceeded.", retryAfterMs);
    }

    // Handle server errors
    if (status >= 500) {
      throw new OpenRouterUpstreamError("Upstream service error.", {
        status,
        bodySnippet,
        requestId,
      });
    }

    // Handle other client errors
    if (status >= 400) {
      throw new OpenRouterUpstreamError(`Request failed with status ${status}.`, {
        status,
        bodySnippet,
        requestId,
      });
    }

    // Fallback
    throw new OpenRouterUpstreamError("Unexpected error response.", {
      status,
      bodySnippet,
      requestId,
    });
  }

  /**
   * Parse chat completion response
   */
  private async parseChatResponse(response: Response): Promise<ParsedChatResponse> {
    let responseJson: unknown;

    try {
      responseJson = await response.json();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      throw new OpenRouterUpstreamError(`Failed to parse response as JSON: ${errorMessage}`);
    }

    // Validate response structure with Zod
    const validationResult = openRouterResponseSchema.safeParse(responseJson);
    if (!validationResult.success) {
      throw new OpenRouterUpstreamError("Response structure validation failed", {
        bodySnippet: JSON.stringify(responseJson).slice(0, 500),
      });
    }

    const data = validationResult.data;

    // Guard against missing choices
    if (!data.choices || data.choices.length === 0) {
      throw new OpenRouterUpstreamError("No choices in response");
    }

    // Extract assistant message content
    const contentText = data.choices[0].message.content;

    // Guard against empty content
    if (!contentText || contentText.trim().length === 0) {
      throw new OpenRouterUpstreamError("Empty completion content");
    }

    // Log token usage (safe - no sensitive data)
    if (data.usage) {
      this.logRequest({
        status: "token_usage",
        model: this.model,
        requestId: data.id,
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      });
    }

    return {
      contentText,
      usage: data.usage,
      model: data.model,
      requestId: data.id,
    };
  }

  /**
   * Parse JSON from model output with fallback extraction
   */
  private parseJsonFromModel(contentText: string): unknown {
    // First attempt: direct JSON parse
    try {
      return JSON.parse(contentText);
    } catch {
      // Ignore and try extraction
    }

    // Second attempt: extract first JSON object or array
    const jsonMatch = contentText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        // Ignore and throw error below
      }
    }

    // Failed to parse
    throw new OpenRouterParseError("Failed to parse JSON from model output", contentText);
  }

  /**
   * Validate parsed JSON with Zod schema
   */
  private validateWithZod<T>(data: unknown, schema: z.ZodType<T>): T {
    const result = schema.safeParse(data);

    if (!result.success) {
      throw new OpenRouterSchemaMismatchError("Response JSON does not match expected schema", result.error.issues);
    }

    return result.data;
  }

  /**
   * Sleep helper for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Safe logging helper - logs only metadata, never secrets or sensitive data
   *
   * This method logs to console but can be easily extended to use a proper
   * logging service. It NEVER logs:
   * - API keys
   * - User prompts or message content
   * - System prompts
   * - Response content
   */
  private logRequest(metadata: Record<string, unknown>): void {
    // In production, replace console.log with your logging service
    console.log("[OpenRouterService]", JSON.stringify(metadata));
  }
}

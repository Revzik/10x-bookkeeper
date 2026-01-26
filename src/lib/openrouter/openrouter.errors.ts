import type { ZodIssue } from "zod";

/**
 * Base class for all OpenRouter errors
 */
export class OpenRouterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenRouterError";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OpenRouterError);
    }
  }
}

/**
 * Error for missing or invalid configuration (e.g., missing API key, invalid base URL)
 */
export class OpenRouterConfigError extends OpenRouterError {
  constructor(message: string) {
    super(message);
    this.name = "OpenRouterConfigError";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OpenRouterConfigError);
    }
  }
}

/**
 * Error for invalid input (e.g., empty prompt, invalid model name, invalid schema)
 */
export class OpenRouterValidationError extends OpenRouterError {
  constructor(message: string) {
    super(message);
    this.name = "OpenRouterValidationError";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OpenRouterValidationError);
    }
  }
}

/**
 * Error for authentication/authorization failures (401/403)
 */
export class OpenRouterAuthError extends OpenRouterError {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "OpenRouterAuthError";
    this.status = status;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OpenRouterAuthError);
    }
  }
}

/**
 * Error for rate limiting (429)
 */
export class OpenRouterRateLimitError extends OpenRouterError {
  public readonly retryAfterMs?: number;

  constructor(message: string, retryAfterMs?: number) {
    super(message);
    this.name = "OpenRouterRateLimitError";
    this.retryAfterMs = retryAfterMs;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OpenRouterRateLimitError);
    }
  }
}

/**
 * Error for request timeout
 */
export class OpenRouterTimeoutError extends OpenRouterError {
  constructor(message: string) {
    super(message);
    this.name = "OpenRouterTimeoutError";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OpenRouterTimeoutError);
    }
  }
}

/**
 * Error for upstream/server errors (5xx) or malformed responses
 */
export class OpenRouterUpstreamError extends OpenRouterError {
  public readonly status?: number;
  public readonly bodySnippet?: string;
  public readonly requestId?: string;

  constructor(message: string, options?: { status?: number; bodySnippet?: string; requestId?: string }) {
    super(message);
    this.name = "OpenRouterUpstreamError";
    this.status = options?.status;
    this.bodySnippet = options?.bodySnippet;
    this.requestId = options?.requestId;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OpenRouterUpstreamError);
    }
  }
}

/**
 * Error for JSON parsing failures
 */
export class OpenRouterParseError extends OpenRouterError {
  public readonly contentLength: number;
  public readonly contentSnippet: string;

  constructor(message: string, content: string) {
    super(message);
    this.name = "OpenRouterParseError";
    this.contentLength = content.length;
    // Safe snippet (first 200 chars)
    this.contentSnippet = content.slice(0, 200);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OpenRouterParseError);
    }
  }
}

/**
 * Error for schema validation failures (when returned JSON doesn't match expected schema)
 */
export class OpenRouterSchemaMismatchError extends OpenRouterError {
  public readonly zodIssues: ZodIssue[];

  constructor(message: string, zodIssues: ZodIssue[]) {
    super(message);
    this.name = "OpenRouterSchemaMismatchError";
    this.zodIssues = zodIssues;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OpenRouterSchemaMismatchError);
    }
  }
}

/**
 * Helper to map unknown errors to typed OpenRouter errors
 */
export function normalizeError(error: unknown): OpenRouterError {
  if (error instanceof OpenRouterError) {
    return error;
  }

  if (error instanceof Error) {
    return new OpenRouterError(error.message);
  }

  return new OpenRouterError("An unknown error occurred");
}

/**
 * Helper to map OpenRouter errors to HTTP status codes
 */
export function errorToStatusCode(error: OpenRouterError): number {
  if (error instanceof OpenRouterConfigError || error instanceof OpenRouterValidationError) {
    return 400;
  }

  if (error instanceof OpenRouterAuthError) {
    return error.status;
  }

  if (error instanceof OpenRouterRateLimitError) {
    return 429;
  }

  if (error instanceof OpenRouterTimeoutError) {
    return 504;
  }

  if (error instanceof OpenRouterUpstreamError) {
    return error.status ?? 502;
  }

  if (error instanceof OpenRouterParseError || error instanceof OpenRouterSchemaMismatchError) {
    return 502;
  }

  return 500;
}

/**
 * Helper to get a safe user-facing error message
 */
export function getSafeErrorMessage(error: OpenRouterError): string {
  if (error instanceof OpenRouterConfigError) {
    return "Service configuration error. Please contact support.";
  }

  if (error instanceof OpenRouterValidationError) {
    return error.message;
  }

  if (error instanceof OpenRouterAuthError) {
    return "Authentication failed. Please contact support.";
  }

  if (error instanceof OpenRouterRateLimitError) {
    return "Rate limit exceeded. Please try again later.";
  }

  if (error instanceof OpenRouterTimeoutError) {
    return "Request timed out. Please try again.";
  }

  if (error instanceof OpenRouterUpstreamError) {
    return "Service temporarily unavailable. Please try again later.";
  }

  if (error instanceof OpenRouterParseError) {
    return "Failed to parse response. Please try again.";
  }

  if (error instanceof OpenRouterSchemaMismatchError) {
    return "Response format mismatch. Please try again.";
  }

  return "An unexpected error occurred. Please try again.";
}

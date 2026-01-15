import type { ApiErrorCode, ApiErrorResponseDto } from "../../types";

/**
 * Creates a JSON response with the specified status code and body.
 * Sets appropriate headers for JSON content.
 */
export function json<T>(status: number, body: T): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

/**
 * Creates a standardized API error response matching ApiErrorResponseDto shape.
 *
 * @param status - HTTP status code
 * @param code - API error code from ApiErrorCode enum
 * @param message - Human-readable error message
 * @param details - Optional additional error details (validation errors, etc.)
 */
export function apiError(status: number, code: ApiErrorCode, message: string, details?: unknown): Response {
  const body: ApiErrorResponseDto = {
    error: {
      code,
      message,
      details,
    },
  };
  return json(status, body);
}

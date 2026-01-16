import type { APIContext } from "astro";
import { ZodError } from "zod";

import { apiError, json } from "../../../../lib/api/responses";
import { NotFoundError } from "../../../../lib/errors";
import { queryAiSimpleChat } from "../../../../lib/services/ai.service";
import { aiQueryBodySchema } from "../../../../lib/validation/ai.schemas";
import type { AiQueryResponseDtoSimple } from "../../../../types";

export const prerender = false;

/**
 * POST /api/v1/ai/query
 * Accepts a natural-language question and returns an AI-generated answer
 * based on the user's notes, optionally scoped to a book or series.
 */
export async function POST(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;

  // Get DEV_USER_ID from environment
  const userId = import.meta.env.DEV_USER_ID;
  if (!userId) {
    console.error("DEV_USER_ID environment variable is not set");
    return apiError(500, "INTERNAL_ERROR", "Server configuration error");
  }

  // Parse and validate request body
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return apiError(400, "VALIDATION_ERROR", "Invalid JSON in request body");
  }

  let validatedBody;
  try {
    validatedBody = aiQueryBodySchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request body", error.errors);
    }
    return apiError(400, "VALIDATION_ERROR", "Invalid request body");
  }

  // Execute AI query
  try {
    const result = await queryAiSimpleChat({
      supabase,
      userId,
      command: {
        query_text: validatedBody.query_text,
        scope: {
          book_id: validatedBody.scope?.book_id ?? null,
          series_id: validatedBody.scope?.series_id ?? null,
        },
      },
    });

    const response: AiQueryResponseDtoSimple = result;
    return json(200, response);
  } catch (error) {
    // Handle NotFoundError for book/series not found
    if (error instanceof NotFoundError) {
      console.error("Resource not found for AI query:", {
        userId,
        scope: validatedBody.scope,
        error: error.message,
      });
      return apiError(404, "NOT_FOUND", error.message);
    }

    // Log unexpected errors
    console.error("Error executing AI query:", {
      error,
      userId,
      query_text: validatedBody.query_text,
      scope: validatedBody.scope,
    });

    return apiError(500, "INTERNAL_ERROR", "Failed to execute AI query");
  }
}

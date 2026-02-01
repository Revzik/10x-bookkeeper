import type { APIContext } from "astro";
import { ZodError } from "zod";

import { apiError, json } from "../../../../lib/api/responses";
import { NotFoundError } from "../../../../lib/errors";
import { queryAiSimpleChat } from "../../../../lib/services/ai.service";
import { aiQueryBodySchema } from "../../../../lib/validation/ai.schemas";
import type { AiQueryResponseDtoSimple } from "../../../../types";
import { normalizeLocale } from "../../../../i18n";
import { getRequestEnv } from "../../../../lib/env";

export const prerender = false;

/**
 * POST /api/v1/ai/query
 * Accepts a natural-language question and returns an AI-generated answer
 * based on the user's notes, optionally scoped to a book or series.
 */
export async function POST(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;

  // Get authenticated user from context
  const userId = context.locals.user?.id;
  if (!userId) {
    return apiError(401, "NOT_ALLOWED", "apiErrors.authRequired");
  }

  // Parse and validate request body
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return apiError(400, "VALIDATION_ERROR", "apiErrors.invalidJson");
  }

  let validatedBody;
  try {
    validatedBody = aiQueryBodySchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "VALIDATION_ERROR", "apiErrors.invalidRequest", error.errors);
    }
    return apiError(400, "VALIDATION_ERROR", "apiErrors.invalidRequest");
  }

  // Execute AI query
  try {
    const acceptLanguage = context.request.headers.get("accept-language");
    const locale = normalizeLocale(acceptLanguage?.split(",")[0] ?? null);
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
      locale,
      env: getRequestEnv(context.locals),
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

    return apiError(500, "INTERNAL_ERROR", "apiErrors.internal");
  }
}

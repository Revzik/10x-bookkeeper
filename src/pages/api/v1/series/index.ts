import type { APIContext } from "astro";
import { ZodError } from "zod";

import { apiError, json } from "../../../../lib/api/responses";
import { createSeries, listSeries } from "../../../../lib/services/series.service";
import { createSeriesBodySchema, listSeriesQuerySchema } from "../../../../lib/validation/series.schemas";
import type { CreateSeriesResponseDto, ListSeriesResponseDto } from "../../../../types";

export const prerender = false;

/**
 * POST /api/v1/series
 * Creates a new series.
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
    validatedBody = createSeriesBodySchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "VALIDATION_ERROR", "apiErrors.invalidRequest", error.errors);
    }
    return apiError(400, "VALIDATION_ERROR", "apiErrors.invalidRequest");
  }

  // Create series
  try {
    const series = await createSeries({
      supabase,
      userId,
      command: validatedBody,
    });

    const response: CreateSeriesResponseDto = { series };
    return json(201, response);
  } catch (error) {
    console.error("Error creating series:", {
      error,
      userId,
      title: validatedBody.title,
    });

    return apiError(500, "INTERNAL_ERROR", "apiErrors.internal");
  }
}

/**
 * GET /api/v1/series
 * Lists series with pagination, optional search, and sorting.
 */
export async function GET(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;

  // Get authenticated user from context
  const userId = context.locals.user?.id;
  if (!userId) {
    return apiError(401, "NOT_ALLOWED", "apiErrors.authRequired");
  }

  // Parse and validate query parameters
  const url = new URL(context.request.url);
  const queryParams = {
    page: url.searchParams.get("page") ?? undefined,
    size: url.searchParams.get("size") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
    order: url.searchParams.get("order") ?? undefined,
  };

  let validatedQuery;
  try {
    validatedQuery = listSeriesQuerySchema.parse(queryParams);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "VALIDATION_ERROR", "apiErrors.validationFailed", error.errors);
    }
    return apiError(400, "VALIDATION_ERROR", "apiErrors.validationFailed");
  }

  // List series
  try {
    const result = await listSeries({
      supabase,
      userId,
      query: validatedQuery,
    });

    const response: ListSeriesResponseDto = {
      series: result.series,
      meta: result.meta,
    };
    return json(200, response);
  } catch (error) {
    console.error("Error listing series:", {
      error,
      userId,
      query: validatedQuery,
    });

    return apiError(500, "INTERNAL_ERROR", "apiErrors.internal");
  }
}

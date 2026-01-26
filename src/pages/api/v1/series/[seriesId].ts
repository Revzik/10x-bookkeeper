import type { APIContext } from "astro";
import { ZodError } from "zod";

import { apiError, json } from "../../../../lib/api/responses";
import { NotFoundError } from "../../../../lib/errors";
import { getSeriesById, updateSeriesById, deleteSeriesById } from "../../../../lib/services/series.service";
import {
  seriesIdParamSchema,
  updateSeriesBodySchema,
  deleteSeriesQuerySchema,
} from "../../../../lib/validation/series.schemas";
import type { GetSeriesResponseDto, UpdateSeriesResponseDto } from "../../../../types";

export const prerender = false;

/**
 * GET /api/v1/series/:seriesId
 * Retrieves a single series by ID.
 */
export async function GET(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;

  // Get authenticated user from context
  const userId = context.locals.user?.id;
  if (!userId) {
    return apiError(401, "NOT_ALLOWED", "Authentication required");
  }

  // Validate seriesId path parameter
  const seriesId = context.params.seriesId;
  let validatedSeriesId: string;
  try {
    validatedSeriesId = seriesIdParamSchema.parse(seriesId);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "VALIDATION_ERROR", "Invalid series ID", error.errors);
    }
    return apiError(400, "VALIDATION_ERROR", "Invalid series ID");
  }

  // Get series
  try {
    const series = await getSeriesById({
      supabase,
      userId,
      seriesId: validatedSeriesId,
    });

    const response: GetSeriesResponseDto = { series };
    return json(200, response);
  } catch (error) {
    // Check if it's a not found error
    if (error instanceof NotFoundError) {
      return apiError(404, "NOT_FOUND", "Series not found");
    }

    console.error("Error getting series:", {
      error,
      userId,
      seriesId: validatedSeriesId,
    });

    return apiError(500, "INTERNAL_ERROR", "Failed to retrieve series");
  }
}

/**
 * PATCH /api/v1/series/:seriesId
 * Updates a series by ID.
 */
export async function PATCH(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;

  // Get authenticated user from context
  const userId = context.locals.user?.id;
  if (!userId) {
    return apiError(401, "NOT_ALLOWED", "Authentication required");
  }

  // Validate seriesId path parameter
  const seriesId = context.params.seriesId;
  let validatedSeriesId: string;
  try {
    validatedSeriesId = seriesIdParamSchema.parse(seriesId);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "VALIDATION_ERROR", "Invalid series ID", error.errors);
    }
    return apiError(400, "VALIDATION_ERROR", "Invalid series ID");
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
    validatedBody = updateSeriesBodySchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request body", error.errors);
    }
    return apiError(400, "VALIDATION_ERROR", "Invalid request body");
  }

  // Update series
  try {
    const series = await updateSeriesById({
      supabase,
      userId,
      seriesId: validatedSeriesId,
      command: validatedBody,
    });

    const response: UpdateSeriesResponseDto = { series };
    return json(200, response);
  } catch (error) {
    // Check if it's a not found error
    if (error instanceof NotFoundError) {
      return apiError(404, "NOT_FOUND", "Series not found");
    }

    console.error("Error updating series:", {
      error,
      userId,
      seriesId: validatedSeriesId,
      fieldsUpdated: Object.keys(validatedBody),
    });

    return apiError(500, "INTERNAL_ERROR", "Failed to update series");
  }
}

/**
 * DELETE /api/v1/series/:seriesId
 * Deletes a series by ID, with optional cascade delete.
 */
export async function DELETE(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;

  // Get authenticated user from context
  const userId = context.locals.user?.id;
  if (!userId) {
    return apiError(401, "NOT_ALLOWED", "Authentication required");
  }

  // Validate seriesId path parameter
  const seriesId = context.params.seriesId;
  let validatedSeriesId: string;
  try {
    validatedSeriesId = seriesIdParamSchema.parse(seriesId);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "VALIDATION_ERROR", "Invalid series ID", error.errors);
    }
    return apiError(400, "VALIDATION_ERROR", "Invalid series ID");
  }

  // Parse and validate query parameters
  const url = new URL(context.request.url);
  const queryParams = {
    cascade: url.searchParams.get("cascade") ?? undefined,
  };

  let validatedQuery;
  try {
    validatedQuery = deleteSeriesQuerySchema.parse(queryParams);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "VALIDATION_ERROR", "Invalid query parameters", error.errors);
    }
    return apiError(400, "VALIDATION_ERROR", "Invalid query parameters");
  }

  // Log cascade delete operations for audit purposes
  if (validatedQuery.cascade) {
    console.warn("Cascade delete operation initiated:", {
      method: "DELETE",
      path: `/api/v1/series/${validatedSeriesId}`,
      seriesId: validatedSeriesId,
      userId,
      cascade: true,
    });
  }

  // Delete series
  try {
    await deleteSeriesById({
      supabase,
      userId,
      seriesId: validatedSeriesId,
      cascade: validatedQuery.cascade,
    });

    // Return 204 No Content on successful delete
    return new Response(null, { status: 204 });
  } catch (error) {
    // Check if it's a not found error
    if (error instanceof NotFoundError) {
      return apiError(404, "NOT_FOUND", "Series not found");
    }

    console.error("Error deleting series:", {
      error,
      userId,
      seriesId: validatedSeriesId,
      cascade: validatedQuery.cascade,
    });

    return apiError(500, "INTERNAL_ERROR", "Failed to delete series");
  }
}

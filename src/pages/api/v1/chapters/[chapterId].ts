import type { APIContext } from "astro";
import { ZodError } from "zod";
import { json, apiError } from "../../../../lib/api/responses";
import { NotFoundError } from "../../../../lib/errors";
import { chapterIdParamSchema, updateChapterBodySchema } from "../../../../lib/validation/chapters.schemas";
import { getChapter, updateChapter, deleteChapter } from "../../../../lib/services/chapters.service";
import type { GetChapterResponseDto, UpdateChapterResponseDto } from "../../../../types";

export const prerender = false;

/**
 * GET /api/v1/chapters/:chapterId
 * Retrieves a single chapter by ID
 */
export async function GET(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;
  const userId = import.meta.env.DEV_USER_ID;

  // Guard: ensure DEV_USER_ID is configured
  if (!userId) {
    console.error("DEV_USER_ID environment variable is not set");
    return apiError(500, "INTERNAL_ERROR", "Server configuration error");
  }

  try {
    // Validate chapterId parameter
    const chapterId = chapterIdParamSchema.parse(context.params.chapterId);

    // Fetch chapter
    const chapter = await getChapter({ supabase, userId, chapterId });

    const response: GetChapterResponseDto = { chapter };
    return json(200, response);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "VALIDATION_ERROR", "Invalid chapter ID", error.errors);
    }

    if (error instanceof NotFoundError) {
      return apiError(404, "NOT_FOUND", error.message);
    }

    console.error("Error fetching chapter:", {
      action: "getChapter",
      userId,
      chapterId: context.params.chapterId,
      error,
    });
    return apiError(500, "INTERNAL_ERROR", "Failed to fetch chapter");
  }
}

/**
 * PATCH /api/v1/chapters/:chapterId
 * Updates a chapter's title and/or order
 */
export async function PATCH(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;
  const userId = import.meta.env.DEV_USER_ID;

  // Guard: ensure DEV_USER_ID is configured
  if (!userId) {
    console.error("DEV_USER_ID environment variable is not set");
    return apiError(500, "INTERNAL_ERROR", "Server configuration error");
  }

  try {
    // Validate chapterId parameter
    const chapterId = chapterIdParamSchema.parse(context.params.chapterId);

    // Parse and validate request body
    let body: unknown;
    try {
      body = await context.request.json();
    } catch {
      return apiError(400, "VALIDATION_ERROR", "Invalid JSON in request body");
    }

    const validatedBody = updateChapterBodySchema.parse(body);

    // Update chapter
    const chapter = await updateChapter({
      supabase,
      userId,
      chapterId,
      command: validatedBody,
    });

    const response: UpdateChapterResponseDto = { chapter };
    return json(200, response);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "VALIDATION_ERROR", "Validation failed", error.errors);
    }

    if (error instanceof NotFoundError) {
      return apiError(404, "NOT_FOUND", error.message);
    }

    console.error("Error updating chapter:", {
      action: "updateChapter",
      userId,
      chapterId: context.params.chapterId,
      error,
    });
    return apiError(500, "INTERNAL_ERROR", "Failed to update chapter");
  }
}

/**
 * DELETE /api/v1/chapters/:chapterId
 * Deletes a chapter (cascades to notes and embeddings via DB constraints)
 */
export async function DELETE(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;
  const userId = import.meta.env.DEV_USER_ID;

  // Guard: ensure DEV_USER_ID is configured
  if (!userId) {
    console.error("DEV_USER_ID environment variable is not set");
    return apiError(500, "INTERNAL_ERROR", "Server configuration error");
  }

  try {
    // Validate chapterId parameter
    const chapterId = chapterIdParamSchema.parse(context.params.chapterId);

    // Delete chapter
    await deleteChapter({ supabase, userId, chapterId });

    // Return 204 No Content on success
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "VALIDATION_ERROR", "Invalid chapter ID", error.errors);
    }

    if (error instanceof NotFoundError) {
      return apiError(404, "NOT_FOUND", error.message);
    }

    console.error("Error deleting chapter:", {
      action: "deleteChapter",
      userId,
      chapterId: context.params.chapterId,
      error,
    });
    return apiError(500, "INTERNAL_ERROR", "Failed to delete chapter");
  }
}

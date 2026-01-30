import type { APIContext } from "astro";
import { ZodError } from "zod";
import { json, apiError } from "../../../../lib/api/responses";
import { NotFoundError } from "../../../../lib/errors";
import { noteIdParamSchema, noteGetQuerySchema, updateNoteBodySchema } from "../../../../lib/validation/notes.schemas";
import { getNoteById, updateNoteById, deleteNoteById } from "../../../../lib/services/notes.service";
import type { GetNoteResponseDto, UpdateNoteResponseDto } from "../../../../types";

export const prerender = false;

/**
 * GET /api/v1/notes/:noteId
 * Retrieves a single note by ID, optionally including chapter/book context.
 * Query parameter: include=context (optional)
 */
export async function GET(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;

  // Get authenticated user from context
  const userId = context.locals.user?.id;
  if (!userId) {
    return apiError(401, "NOT_ALLOWED", "apiErrors.authRequired");
  }

  try {
    // Validate noteId parameter
    const noteId = noteIdParamSchema.parse(context.params.noteId);

    // Parse and validate query parameters
    const queryParams = Object.fromEntries(new URL(context.request.url).searchParams.entries());
    const validatedQuery = noteGetQuerySchema.parse(queryParams);

    // Determine if context should be included
    const includeContext = validatedQuery.include === "context";

    // Fetch note
    const result = await getNoteById({
      supabase,
      userId,
      noteId,
      includeContext,
    });

    const response: GetNoteResponseDto = {
      note: result.note,
      ...(result.context && { context: result.context }),
    };

    return json(200, response);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "VALIDATION_ERROR", "apiErrors.validationFailed", error.errors);
    }

    if (error instanceof NotFoundError) {
      return apiError(404, "NOT_FOUND", error.message);
    }

    console.error("Error fetching note:", {
      action: "getNoteById",
      userId,
      noteId: context.params.noteId,
      error,
    });
    return apiError(500, "INTERNAL_ERROR", "apiErrors.internal");
  }
}

/**
 * PATCH /api/v1/notes/:noteId
 * Updates a note's content.
 */
export async function PATCH(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;

  // Get authenticated user from context
  const userId = context.locals.user?.id;
  if (!userId) {
    return apiError(401, "NOT_ALLOWED", "apiErrors.authRequired");
  }

  try {
    // Validate noteId parameter
    const noteId = noteIdParamSchema.parse(context.params.noteId);

    // Parse and validate request body
    let body: unknown;
    try {
      body = await context.request.json();
    } catch {
      return apiError(400, "VALIDATION_ERROR", "apiErrors.invalidJson");
    }

    const validatedBody = updateNoteBodySchema.parse(body);

    // Update note
    const note = await updateNoteById({
      supabase,
      userId,
      noteId,
      command: validatedBody,
    });

    const response: UpdateNoteResponseDto = { note };
    return json(200, response);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "VALIDATION_ERROR", "apiErrors.validationFailed", error.errors);
    }

    if (error instanceof NotFoundError) {
      return apiError(404, "NOT_FOUND", error.message);
    }

    console.error("Error updating note:", {
      action: "updateNoteById",
      userId,
      noteId: context.params.noteId,
      error,
    });
    return apiError(500, "INTERNAL_ERROR", "apiErrors.internal");
  }
}

/**
 * DELETE /api/v1/notes/:noteId
 * Deletes a note by ID.
 */
export async function DELETE(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;

  // Get authenticated user from context
  const userId = context.locals.user?.id;
  if (!userId) {
    return apiError(401, "NOT_ALLOWED", "apiErrors.authRequired");
  }

  try {
    // Validate noteId parameter
    const noteId = noteIdParamSchema.parse(context.params.noteId);

    // Delete note
    await deleteNoteById({
      supabase,
      userId,
      noteId,
    });

    // Return 204 No Content on success
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "VALIDATION_ERROR", "apiErrors.validationFailed", error.errors);
    }

    if (error instanceof NotFoundError) {
      return apiError(404, "NOT_FOUND", error.message);
    }

    console.error("Error deleting note:", {
      action: "deleteNoteById",
      userId,
      noteId: context.params.noteId,
      error,
    });
    return apiError(500, "INTERNAL_ERROR", "apiErrors.internal");
  }
}

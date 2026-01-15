import type { APIContext } from "astro";
import { ZodError } from "zod";
import { json, apiError } from "../../../../../lib/api/responses";
import { NotFoundError } from "../../../../../lib/errors";
import { chapterIdParamSchema } from "../../../../../lib/validation/chapters.schemas";
import { createNoteBodySchema } from "../../../../../lib/validation/notes.schemas";
import { createNote } from "../../../../../lib/services/notes.service";
import type { CreateNoteResponseDto } from "../../../../../types";

export const prerender = false;

/**
 * POST /api/v1/chapters/:chapterId/notes
 * Creates a new note under a specific chapter
 */
export async function POST(context: APIContext): Promise<Response> {
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

    const validatedBody = createNoteBodySchema.parse(body);

    // Create note
    const note = await createNote({
      supabase,
      userId,
      chapterId,
      command: validatedBody,
    });

    const response: CreateNoteResponseDto = { note };
    return json(201, response);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "VALIDATION_ERROR", "Validation failed", error.errors);
    }

    if (error instanceof NotFoundError) {
      return apiError(404, "NOT_FOUND", error.message);
    }

    console.error("Error creating note:", {
      action: "createNote",
      userId,
      chapterId: context.params.chapterId,
      error,
    });
    return apiError(500, "INTERNAL_ERROR", "Failed to create note");
  }
}

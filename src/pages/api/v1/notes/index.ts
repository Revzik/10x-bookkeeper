import type { APIContext } from "astro";
import { ZodError } from "zod";
import { json, apiError } from "../../../../lib/api/responses";
import { listNotesQuerySchema } from "../../../../lib/validation/notes.schemas";
import { listNotes } from "../../../../lib/services/notes.service";
import type { ListNotesResponseDto } from "../../../../types";

export const prerender = false;

/**
 * GET /api/v1/notes
 * Lists notes with pagination and filters
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
    // Parse and validate query parameters
    const url = new URL(context.request.url);
    const queryParams = Object.fromEntries(url.searchParams.entries());
    const validatedQuery = listNotesQuerySchema.parse(queryParams);

    // List notes
    const { notes, meta } = await listNotes({
      supabase,
      userId,
      query: validatedQuery,
    });

    const response: ListNotesResponseDto = { notes, meta };
    return json(200, response);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "VALIDATION_ERROR", "Invalid query parameters", error.errors);
    }

    console.error("Error listing notes:", {
      action: "listNotes",
      userId,
      query: context.request.url,
      error,
    });
    return apiError(500, "INTERNAL_ERROR", "Failed to list notes");
  }
}

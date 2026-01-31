import type { APIContext } from "astro";
import { ZodError } from "zod";

import { apiError, json } from "../../../../../lib/api/responses";
import { NotFoundError } from "../../../../../lib/errors";
import { createChapter, listChapters } from "../../../../../lib/services/chapters.service";
import { bookIdParamSchema } from "../../../../../lib/validation/books.schemas";
import { createChapterBodySchema, listChaptersQuerySchema } from "../../../../../lib/validation/chapters.schemas";
import type { CreateChapterResponseDto, ListChaptersResponseDto } from "../../../../../types";

export const prerender = false;

/**
 * POST /api/v1/books/:bookId/chapters
 * Creates a new chapter under a specific book.
 */
export async function POST(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;

  // Get authenticated user from context
  const userId = context.locals.user?.id;
  if (!userId) {
    return apiError(401, "NOT_ALLOWED", "apiErrors.authRequired");
  }

  // Validate bookId path parameter
  const bookId = context.params.bookId;
  try {
    bookIdParamSchema.parse(bookId);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "VALIDATION_ERROR", "apiErrors.validationFailed", error.errors);
    }
    return apiError(400, "VALIDATION_ERROR", "apiErrors.validationFailed");
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
    validatedBody = createChapterBodySchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "VALIDATION_ERROR", "apiErrors.invalidRequest", error.errors);
    }
    return apiError(400, "VALIDATION_ERROR", "apiErrors.invalidRequest");
  }

  // Create chapter
  try {
    const chapter = await createChapter({
      supabase,
      userId,
      bookId: bookId as string,
      command: validatedBody,
    });

    const response: CreateChapterResponseDto = { chapter };
    return json(201, response);
  } catch (error) {
    // Handle NotFoundError for book not found
    if (error instanceof NotFoundError) {
      console.error("Book not found:", {
        userId,
        bookId,
      });
      return apiError(404, "NOT_FOUND", error.message);
    }

    console.error("Error creating chapter:", {
      error,
      userId,
      bookId,
      title: validatedBody.title,
      order: validatedBody.order,
    });

    return apiError(500, "INTERNAL_ERROR", "apiErrors.internal");
  }
}

/**
 * GET /api/v1/books/:bookId/chapters
 * Lists chapters for a specific book with pagination and sorting.
 */
export async function GET(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;

  // Get authenticated user from context
  const userId = context.locals.user?.id;
  if (!userId) {
    return apiError(401, "NOT_ALLOWED", "apiErrors.authRequired");
  }

  // Validate bookId path parameter
  const bookId = context.params.bookId;
  try {
    bookIdParamSchema.parse(bookId);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "VALIDATION_ERROR", "apiErrors.validationFailed", error.errors);
    }
    return apiError(400, "VALIDATION_ERROR", "apiErrors.validationFailed");
  }

  // Parse and validate query parameters
  const url = new URL(context.request.url);
  const queryParams = {
    page: url.searchParams.get("page") ?? undefined,
    size: url.searchParams.get("size") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
    order: url.searchParams.get("order") ?? undefined,
  };

  let validatedQuery;
  try {
    validatedQuery = listChaptersQuerySchema.parse(queryParams);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "VALIDATION_ERROR", "apiErrors.validationFailed", error.errors);
    }
    return apiError(400, "VALIDATION_ERROR", "apiErrors.validationFailed");
  }

  // List chapters
  try {
    const result = await listChapters({
      supabase,
      userId,
      bookId: bookId as string,
      query: validatedQuery,
    });

    const response: ListChaptersResponseDto = {
      chapters: result.chapters,
      meta: result.meta,
    };
    return json(200, response);
  } catch (error) {
    // Handle NotFoundError for book not found
    if (error instanceof NotFoundError) {
      console.error("Book not found:", {
        userId,
        bookId,
      });
      return apiError(404, "NOT_FOUND", error.message);
    }

    console.error("Error listing chapters:", {
      error,
      userId,
      bookId,
      query: validatedQuery,
    });

    return apiError(500, "INTERNAL_ERROR", "apiErrors.internal");
  }
}

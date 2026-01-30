import type { APIContext } from "astro";
import { ZodError } from "zod";

import { apiError, json } from "../../../../lib/api/responses";
import { NotFoundError } from "../../../../lib/errors";
import { createBook, listBooks } from "../../../../lib/services/books.service";
import { createBookBodySchema, listBooksQuerySchema } from "../../../../lib/validation/books.schemas";
import type { CreateBookResponseDto, ListBooksResponseDto } from "../../../../types";

export const prerender = false;

/**
 * POST /api/v1/books
 * Creates a new book.
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
    validatedBody = createBookBodySchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "VALIDATION_ERROR", "apiErrors.invalidRequest", error.errors);
    }
    return apiError(400, "VALIDATION_ERROR", "apiErrors.invalidRequest");
  }

  // Create book
  try {
    const book = await createBook({
      supabase,
      userId,
      command: validatedBody,
    });

    const response: CreateBookResponseDto = { book };
    return json(201, response);
  } catch (error) {
    // Handle NotFoundError for series not found
    if (error instanceof NotFoundError) {
      console.error("Series not found:", {
        userId,
        series_id: validatedBody.series_id,
      });
      return apiError(404, "NOT_FOUND", error.message);
    }

    console.error("Error creating book:", {
      error,
      userId,
      title: validatedBody.title,
    });

    return apiError(500, "INTERNAL_ERROR", "apiErrors.internal");
  }
}

/**
 * GET /api/v1/books
 * Lists books with pagination, optional filters, search, and sorting.
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
    series_id: url.searchParams.get("series_id") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
    order: url.searchParams.get("order") ?? undefined,
  };

  let validatedQuery;
  try {
    validatedQuery = listBooksQuerySchema.parse(queryParams);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "VALIDATION_ERROR", "apiErrors.validationFailed", error.errors);
    }
    return apiError(400, "VALIDATION_ERROR", "apiErrors.validationFailed");
  }

  // List books
  try {
    const result = await listBooks({
      supabase,
      userId,
      query: validatedQuery,
    });

    const response: ListBooksResponseDto = {
      books: result.books,
      meta: result.meta,
    };
    return json(200, response);
  } catch (error) {
    console.error("Error listing books:", {
      error,
      userId,
      query: validatedQuery,
    });

    return apiError(500, "INTERNAL_ERROR", "apiErrors.internal");
  }
}

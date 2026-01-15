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
    validatedBody = createBookBodySchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request body", error.errors);
    }
    return apiError(400, "VALIDATION_ERROR", "Invalid request body");
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

    return apiError(500, "INTERNAL_ERROR", "Failed to create book");
  }
}

/**
 * GET /api/v1/books
 * Lists books with pagination, optional filters, search, and sorting.
 */
export async function GET(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;

  // Get DEV_USER_ID from environment
  const userId = import.meta.env.DEV_USER_ID;
  if (!userId) {
    console.error("DEV_USER_ID environment variable is not set");
    return apiError(500, "INTERNAL_ERROR", "Server configuration error");
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
      return apiError(400, "VALIDATION_ERROR", "Invalid query parameters", error.errors);
    }
    return apiError(400, "VALIDATION_ERROR", "Invalid query parameters");
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

    return apiError(500, "INTERNAL_ERROR", "Failed to list books");
  }
}

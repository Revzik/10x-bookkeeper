import type { APIContext } from "astro";
import { ZodError } from "zod";

import { apiError, json } from "../../../../lib/api/responses";
import { NotFoundError, ValidationError } from "../../../../lib/errors";
import { getBookById, updateBookById, deleteBookById } from "../../../../lib/services/books.service";
import { bookIdParamSchema, updateBookBodySchema } from "../../../../lib/validation/books.schemas";
import type { GetBookResponseDto, UpdateBookResponseDto } from "../../../../types";

export const prerender = false;

/**
 * GET /api/v1/books/:bookId
 * Retrieves a single book by ID.
 */
export async function GET(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;

  // Get DEV_USER_ID from environment
  const userId = import.meta.env.DEV_USER_ID;
  if (!userId) {
    console.error("DEV_USER_ID environment variable is not set");
    return apiError(500, "INTERNAL_ERROR", "Server configuration error");
  }

  // Validate bookId path parameter
  const bookId = context.params.bookId;
  let validatedBookId: string;
  try {
    validatedBookId = bookIdParamSchema.parse(bookId);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "VALIDATION_ERROR", "Invalid book ID", error.errors);
    }
    return apiError(400, "VALIDATION_ERROR", "Invalid book ID");
  }

  // Get book
  try {
    const book = await getBookById({
      supabase,
      userId,
      bookId: validatedBookId,
    });

    const response: GetBookResponseDto = { book };
    return json(200, response);
  } catch (error) {
    // Check if it's a not found error
    if (error instanceof NotFoundError) {
      return apiError(404, "NOT_FOUND", "Book not found");
    }

    console.error("Error getting book:", {
      error,
      userId,
      bookId: validatedBookId,
    });

    return apiError(500, "INTERNAL_ERROR", "Failed to retrieve book");
  }
}

/**
 * PATCH /api/v1/books/:bookId
 * Updates a book by ID.
 */
export async function PATCH(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;

  // Get DEV_USER_ID from environment
  const userId = import.meta.env.DEV_USER_ID;
  if (!userId) {
    console.error("DEV_USER_ID environment variable is not set");
    return apiError(500, "INTERNAL_ERROR", "Server configuration error");
  }

  // Validate bookId path parameter
  const bookId = context.params.bookId;
  let validatedBookId: string;
  try {
    validatedBookId = bookIdParamSchema.parse(bookId);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "VALIDATION_ERROR", "Invalid book ID", error.errors);
    }
    return apiError(400, "VALIDATION_ERROR", "Invalid book ID");
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
    validatedBody = updateBookBodySchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request body", error.errors);
    }
    return apiError(400, "VALIDATION_ERROR", "Invalid request body");
  }

  // Update book
  try {
    const book = await updateBookById({
      supabase,
      userId,
      bookId: validatedBookId,
      command: validatedBody,
    });

    const response: UpdateBookResponseDto = { book };
    return json(200, response);
  } catch (error) {
    // Check if it's a not found error
    if (error instanceof NotFoundError) {
      return apiError(404, "NOT_FOUND", error.message);
    }

    // Check if it's a validation error from the service layer
    if (error instanceof ValidationError) {
      return apiError(400, "VALIDATION_ERROR", error.message);
    }

    console.error("Error updating book:", {
      error,
      userId,
      bookId: validatedBookId,
      fieldsUpdated: Object.keys(validatedBody),
    });

    return apiError(500, "INTERNAL_ERROR", "Failed to update book");
  }
}

/**
 * DELETE /api/v1/books/:bookId
 * Deletes a book by ID. Database cascades will remove dependent rows.
 */
export async function DELETE(context: APIContext): Promise<Response> {
  const supabase = context.locals.supabase;

  // Get DEV_USER_ID from environment
  const userId = import.meta.env.DEV_USER_ID;
  if (!userId) {
    console.error("DEV_USER_ID environment variable is not set");
    return apiError(500, "INTERNAL_ERROR", "Server configuration error");
  }

  // Validate bookId path parameter
  const bookId = context.params.bookId;
  let validatedBookId: string;
  try {
    validatedBookId = bookIdParamSchema.parse(bookId);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "VALIDATION_ERROR", "Invalid book ID", error.errors);
    }
    return apiError(400, "VALIDATION_ERROR", "Invalid book ID");
  }

  // Delete book
  try {
    await deleteBookById({
      supabase,
      userId,
      bookId: validatedBookId,
    });

    // Return 204 No Content on successful delete
    return new Response(null, { status: 204 });
  } catch (error) {
    // Check if it's a not found error
    if (error instanceof NotFoundError) {
      return apiError(404, "NOT_FOUND", "Book not found");
    }

    console.error("Error deleting book:", {
      error,
      userId,
      bookId: validatedBookId,
    });

    return apiError(500, "INTERNAL_ERROR", "Failed to delete book");
  }
}

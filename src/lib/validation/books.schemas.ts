import { z } from "zod";
import { paginationOrderSchema, paginationPageSchema, paginationSizeSchema, searchQuerySchema } from "./shared.schemas";

/**
 * Validation schema for POST /api/v1/books request body
 */
export const createBookBodySchema = z.object({
  title: z.string().trim().min(1, "Title is required and cannot be empty"),
  author: z.string().trim().min(1, "Author is required and cannot be empty"),
  total_pages: z.number().int("Total pages must be an integer").positive("Total pages must be greater than 0"),
  series_id: z
    .string()
    .uuid("Invalid UUID format for series_id")
    .nullable()
    .optional()
    .transform((val) => {
      // Normalize empty string to null
      if (val === "") return null;
      return val;
    }),
  series_order: z.number().int("Series order must be an integer").min(1, "Series order must be at least 1").optional(),
  status: z.enum(["want_to_read", "reading", "completed"]).optional(),
  cover_image_url: z
    .string()
    .trim()
    .url("Invalid URL format for cover_image_url")
    .nullable()
    .optional()
    .transform((val) => {
      // Normalize empty string to null
      if (val === "" || val === null) return null;
      return val;
    }),
});

/**
 * Validation schema for GET /api/v1/books query parameters
 */
export const listBooksQuerySchema = z.object({
  page: paginationPageSchema,
  size: paginationSizeSchema,
  series_id: z
    .string()
    .uuid("Invalid UUID format for series_id")
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  status: z.enum(["want_to_read", "reading", "completed"]).optional(),
  q: searchQuerySchema,
  sort: z.enum(["updated_at", "created_at", "title", "author", "status"]).optional().default("updated_at"),
  order: paginationOrderSchema,
});

/**
 * Validation schema for book ID path parameter
 */
export const bookIdParamSchema = z.string().uuid("Invalid book ID format");

/**
 * Validation schema for PATCH /api/v1/books/:bookId request body
 * All fields are optional, but at least one must be provided.
 * Enforces progress invariants and normalizes nullable fields.
 */
export const updateBookBodySchema = z
  .object({
    title: z.string().trim().min(1, "Title cannot be empty").optional(),
    author: z.string().trim().min(1, "Author cannot be empty").optional(),
    total_pages: z
      .number()
      .int("Total pages must be an integer")
      .positive("Total pages must be greater than 0")
      .optional(),
    current_page: z
      .number()
      .int("Current page must be an integer")
      .min(0, "Current page cannot be negative")
      .optional(),
    status: z.enum(["want_to_read", "reading", "completed"]).optional(),
    series_id: z
      .string()
      .uuid("Invalid UUID format for series_id")
      .nullable()
      .optional()
      .transform((val) => {
        // Normalize empty string to null
        if (val === "") return null;
        return val;
      }),
    series_order: z
      .number()
      .int("Series order must be an integer")
      .min(1, "Series order must be at least 1")
      .optional(),
    cover_image_url: z
      .string()
      .trim()
      .url("Invalid URL format for cover_image_url")
      .nullable()
      .optional()
      .transform((val) => {
        // Normalize empty string to null
        if (val === "" || val === null) return null;
        return val;
      }),
  })
  .strict() // Reject unknown fields
  .refine(
    (data) => {
      // Ensure at least one field is provided
      return Object.keys(data).length > 0;
    },
    {
      message: "At least one field must be provided for update",
    }
  )
  .refine(
    (data) => {
      // If both total_pages and current_page are provided, validate the relationship
      if (data.total_pages !== undefined && data.current_page !== undefined) {
        return data.current_page <= data.total_pages;
      }
      return true;
    },
    {
      message: "Current page cannot exceed total pages",
    }
  );

export type CreateBookBody = z.infer<typeof createBookBodySchema>;
export type ListBooksQuery = z.infer<typeof listBooksQuerySchema>;
export type BookIdParam = z.infer<typeof bookIdParamSchema>;
export type UpdateBookBody = z.infer<typeof updateBookBodySchema>;

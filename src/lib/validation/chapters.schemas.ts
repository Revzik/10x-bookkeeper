import { z } from "zod";
import { paginationOrderSchema, paginationPageSchema, paginationSizeSchema } from "./shared.schemas";

/**
 * Validation schema for POST /api/v1/books/:bookId/chapters request body
 */
export const createChapterBodySchema = z
  .object({
    title: z.string().trim().min(1, "Title is required and cannot be empty"),
    order: z.number().int("Order must be an integer").min(0, "Order cannot be negative").optional().default(0),
  })
  .strict(); // Reject unknown fields

/**
 * Validation schema for GET /api/v1/books/:bookId/chapters query parameters
 */
export const listChaptersQuerySchema = z.object({
  page: paginationPageSchema,
  size: paginationSizeSchema,
  sort: z.enum(["order", "created_at", "updated_at", "title"]).optional().default("order"),
  order: paginationOrderSchema,
});

/**
 * Validation schema for chapter ID path parameter
 */
export const chapterIdParamSchema = z.string().uuid("Invalid chapter ID format");

/**
 * Validation schema for PATCH /api/v1/chapters/:chapterId request body
 */
export const updateChapterBodySchema = z
  .object({
    title: z.string().trim().min(1, "Title cannot be empty").optional(),
    order: z.number().int("Order must be an integer").min(0, "Order cannot be negative").optional(),
  })
  .strict() // Reject unknown fields
  .refine((data) => data.title !== undefined || data.order !== undefined, {
    message: "At least one field (title or order) must be provided",
  });

export type CreateChapterBody = z.infer<typeof createChapterBodySchema>;
export type ListChaptersQuery = z.infer<typeof listChaptersQuerySchema>;
export type ChapterIdParam = z.infer<typeof chapterIdParamSchema>;
export type UpdateChapterBody = z.infer<typeof updateChapterBodySchema>;

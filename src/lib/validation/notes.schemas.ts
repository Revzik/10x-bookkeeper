import { z } from "zod";
import { paginationOrderSchema, paginationPageSchema, paginationSizeSchema } from "./shared.schemas";

/**
 * Validation schema for POST /api/v1/chapters/:chapterId/notes request body
 */
export const createNoteBodySchema = z
  .object({
    content: z
      .string()
      .trim()
      .min(1, "Content is required and cannot be empty")
      .max(10000, "Content cannot exceed 10,000 characters"),
  })
  .strict(); // Reject unknown fields

/**
 * Validation schema for GET /api/v1/notes query parameters
 */
export const listNotesQuerySchema = z.object({
  page: paginationPageSchema,
  size: paginationSizeSchema,
  book_id: z.string().uuid("Invalid book ID format").optional(),
  chapter_id: z.string().uuid("Invalid chapter ID format").optional(),
  series_id: z.string().uuid("Invalid series ID format").optional(),
  embedding_status: z.enum(["pending", "processing", "completed", "failed"]).optional(),
  sort: z.enum(["created_at", "updated_at"]).optional().default("updated_at"),
  order: paginationOrderSchema,
});

export type CreateNoteBody = z.infer<typeof createNoteBodySchema>;
export type ListNotesQuery = z.infer<typeof listNotesQuerySchema>;

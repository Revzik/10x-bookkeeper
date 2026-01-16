import { z } from "zod";

/**
 * Validation schema for AI query request body.
 * Enforces:
 * - query_text: required, non-empty after trimming, max 500 characters
 * - scope: optional object with at most one of book_id or series_id set
 */
export const aiQueryBodySchema = z
  .object({
    query_text: z
      .string({ required_error: "query_text is required" })
      .trim()
      .min(1, "query_text cannot be empty")
      .max(500, "query_text cannot exceed 500 characters"),
    scope: z
      .object({
        book_id: z.string().uuid("book_id must be a valid UUID").nullable().optional(),
        series_id: z.string().uuid("series_id must be a valid UUID").nullable().optional(),
      })
      .optional(),
  })
  .strict()
  .refine(
    (data) => {
      // Ensure at most one of book_id or series_id is non-null
      const hasBookId = data.scope?.book_id != null;
      const hasSeriesId = data.scope?.series_id != null;
      return !(hasBookId && hasSeriesId);
    },
    {
      message: "Cannot specify both book_id and series_id in scope",
      path: ["scope"],
    }
  );

export type AiQueryBody = z.infer<typeof aiQueryBodySchema>;

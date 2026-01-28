import { z } from "zod";

/**
 * Client-side form validation schema for chapter creation and editing.
 * This schema is designed for React Hook Form usage and handles form input peculiarities
 * (e.g., empty strings, type coercion from input elements).
 *
 * Note: Defaults are handled in the component's defaultValues prop, not in the schema.
 * This ensures proper type inference for React Hook Form.
 */

/**
 * Schema for creating chapters
 * - title: Required, trimmed, min 1 character
 * - order: Optional number with coercion, integer, min 0
 */
export const createChapterFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  order: z.coerce
    .number({ invalid_type_error: "Order must be a number" })
    .int("Order must be an integer")
    .min(0, "Order must be 0 or greater")
    .optional()
    .nullable(),
});

/**
 * Schema for updating chapters
 * - title: Required, trimmed, min 1 character
 * - order: Required number with coercion, integer, min 0
 */
export const updateChapterFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  order: z.coerce
    .number({ invalid_type_error: "Order must be a number" })
    .int("Order must be an integer")
    .min(0, "Order must be 0 or greater"),
});

export type CreateChapterFormData = z.infer<typeof createChapterFormSchema>;
export type UpdateChapterFormData = z.infer<typeof updateChapterFormSchema>;

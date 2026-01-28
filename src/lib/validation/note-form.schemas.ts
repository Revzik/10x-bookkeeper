import { z } from "zod";

const MAX_CONTENT_LENGTH = 10000;

/**
 * Client-side form validation schema for note creation and editing.
 * This schema is designed for React Hook Form usage and handles form input peculiarities
 * (e.g., empty strings, type coercion from input elements).
 *
 * Note: Defaults are handled in the component's defaultValues prop, not in the schema.
 * This ensures proper type inference for React Hook Form.
 */

/**
 * Schema for creating notes
 * - chapter_id: Required, the chapter to attach the note to
 * - content: Required, trimmed, max 10,000 characters
 */
export const createNoteFormSchema = z.object({
  chapter_id: z.string().min(1, "Chapter is required"),
  content: z
    .string()
    .trim()
    .min(1, "Content is required")
    .max(MAX_CONTENT_LENGTH, `Content must be ${MAX_CONTENT_LENGTH} characters or less`),
});

/**
 * Schema for updating notes
 * - chapter_id: Required (for reassignment support)
 * - content: Required, trimmed, max 10,000 characters
 */
export const updateNoteFormSchema = z.object({
  chapter_id: z.string().min(1, "Chapter is required"),
  content: z
    .string()
    .trim()
    .min(1, "Content is required")
    .max(MAX_CONTENT_LENGTH, `Content must be ${MAX_CONTENT_LENGTH} characters or less`),
});

export type CreateNoteFormData = z.infer<typeof createNoteFormSchema>;
export type UpdateNoteFormData = z.infer<typeof updateNoteFormSchema>;

// Export constant for use in components (character counter)
export { MAX_CONTENT_LENGTH };

import { z } from "zod";

/**
 * Client-side form validation schema for series creation and editing.
 * This schema is designed for React Hook Form usage and handles form input peculiarities
 * (e.g., empty strings, type coercion from input elements).
 *
 * Note: Defaults are handled in the component's defaultValues prop, not in the schema.
 * This ensures proper type inference for React Hook Form.
 */
export const seriesFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim(),
  cover_image_url: z
    .string()
    .trim()
    .refine(
      (val) => {
        // Allow empty string or valid URL
        if (!val || val === "") return true;
        try {
          new URL(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Please enter a valid URL" }
    ),
});

export type SeriesFormData = z.infer<typeof seriesFormSchema>;

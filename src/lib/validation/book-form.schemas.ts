import { z } from "zod";

/**
 * Client-side form validation schema for book creation and editing.
 * This schema is designed for React Hook Form usage and handles form input peculiarities
 * (e.g., empty strings, type coercion from input elements).
 *
 * Note: Defaults are handled in the component's defaultValues prop, not in the schema.
 * This ensures proper type inference for React Hook Form.
 */
export const bookFormSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required"),
    author: z.string().trim().min(1, "Author is required"),
    total_pages: z.coerce
      .number({ invalid_type_error: "Total pages must be a number" })
      .int("Total pages must be an integer")
      .positive("Total pages must be greater than 0"),
    current_page: z.coerce
      .number({ invalid_type_error: "Current page must be a number" })
      .int("Current page must be an integer")
      .min(0, "Current page must be 0 or greater"),
    status: z.enum(["want_to_read", "reading", "completed"]),
    series_id: z.string(),
    series_order: z.coerce
      .number({ invalid_type_error: "Series order must be a number" })
      .int("Series order must be an integer")
      .min(1, "Series order must be at least 1")
      .optional()
      .nullable(),
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
  })
  .refine(
    (data) => {
      // Progress invariant: current_page <= total_pages
      return data.current_page <= data.total_pages;
    },
    {
      message: "Current page cannot exceed total pages",
      path: ["current_page"],
    }
  )
  .refine(
    (data) => {
      // If series_order is provided, series_id must be provided
      return !(data.series_order && !data.series_id);
    },
    {
      message: "Series must be selected when providing series order",
      path: ["series_order"],
    }
  );

export type BookFormData = z.infer<typeof bookFormSchema>;

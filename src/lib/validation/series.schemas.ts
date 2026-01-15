import { z } from "zod";

/**
 * Validation schema for POST /api/v1/series request body
 */
export const createSeriesBodySchema = z.object({
  title: z.string().trim().min(1, "Title is required and cannot be empty"),
  description: z.string().optional(),
  cover_image_url: z.string().url("Invalid URL format for cover_image_url").optional().or(z.literal("")),
});

/**
 * Validation schema for GET /api/v1/series query parameters
 */
export const listSeriesQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().min(1, "Page must be at least 1"))
    .default("1"),
  size: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .pipe(z.number().int().min(1, "Size must be at least 1").max(100, "Size cannot exceed 100"))
    .default("10"),
  q: z
    .string()
    .optional()
    .transform((val) => val?.trim())
    .refine((val) => !val || val.length <= 50, {
      message: "Search query cannot exceed 50 characters",
    }),
  sort: z.enum(["created_at", "updated_at", "title"]).optional().default("updated_at"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type CreateSeriesBody = z.infer<typeof createSeriesBodySchema>;
export type ListSeriesQuery = z.infer<typeof listSeriesQuerySchema>;

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

/**
 * Validation schema for series ID path parameter
 */
export const seriesIdParamSchema = z.string().uuid("Invalid series ID format");

/**
 * Validation schema for PATCH /api/v1/series/:seriesId request body
 */
export const updateSeriesBodySchema = z
  .object({
    title: z.string().trim().min(1, "Title cannot be empty").optional(),
    description: z.string().nullable().optional(),
    cover_image_url: z
      .string()
      .trim()
      .url("Invalid URL format for cover_image_url")
      .nullable()
      .optional()
      .transform((val) => {
        // Normalize empty string to null
        if (val === "") return null;
        return val;
      }),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

/**
 * Validation schema for DELETE /api/v1/series/:seriesId query parameters
 */
export const deleteSeriesQuerySchema = z.object({
  cascade: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined) return false;
      if (val === "true" || val === "1") return true;
      if (val === "false" || val === "0") return false;
      return false;
    })
    .pipe(z.boolean())
    .default("false"),
});

export type CreateSeriesBody = z.infer<typeof createSeriesBodySchema>;
export type ListSeriesQuery = z.infer<typeof listSeriesQuerySchema>;
export type SeriesIdParam = z.infer<typeof seriesIdParamSchema>;
export type UpdateSeriesBody = z.infer<typeof updateSeriesBodySchema>;
export type DeleteSeriesQuery = z.infer<typeof deleteSeriesQuerySchema>;

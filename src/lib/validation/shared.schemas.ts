import { z } from "zod";

/**
 * Common pagination validation schema for page parameter.
 * Transforms string to number with default value of 1.
 */
export const paginationPageSchema = z
  .string()
  .optional()
  .transform((val) => (val ? parseInt(val, 10) : 1))
  .pipe(z.number().int().min(1, "Page must be at least 1"))
  .default("1");

/**
 * Common pagination validation schema for size parameter.
 * Transforms string to number with default value of 10, max 100.
 */
export const paginationSizeSchema = z
  .string()
  .optional()
  .transform((val) => (val ? parseInt(val, 10) : 10))
  .pipe(z.number().int().min(1, "Size must be at least 1").max(100, "Size cannot exceed 100"))
  .default("10");

/**
 * Common pagination validation schema for order parameter.
 * Defaults to "desc".
 */
export const paginationOrderSchema = z.enum(["asc", "desc"]).optional().default("desc");

/**
 * Common search query validation schema.
 * Trims whitespace and enforces max length of 50 characters.
 */
export const searchQuerySchema = z
  .string()
  .optional()
  .transform((val) => val?.trim())
  .refine((val) => !val || val.length <= 50, {
    message: "Search query cannot exceed 50 characters",
  });

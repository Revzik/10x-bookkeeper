import type { PaginationMetaDto } from "../../types";

/**
 * Applies default pagination constraints and calculates pagination range.
 *
 * @param page - Page number (defaults to 1, min 1)
 * @param size - Page size (defaults to 10, min 1, max 100)
 * @returns Object with normalized page, size, from, and to values
 */
export function applyPaginationConstraints(
  page?: number,
  size?: number
): { page: number; size: number; from: number; to: number } {
  const normalizedPage = Math.max(1, page ?? 1);
  const normalizedSize = Math.min(Math.max(1, size ?? 10), 100);

  const from = (normalizedPage - 1) * normalizedSize;
  const to = from + normalizedSize - 1;

  return {
    page: normalizedPage,
    size: normalizedSize,
    from,
    to,
  };
}

/**
 * Builds pagination metadata from query results.
 *
 * @param page - Current page number
 * @param size - Page size
 * @param totalItems - Total number of items from count query
 * @returns Pagination metadata object
 */
export function buildPaginationMeta(page: number, size: number, totalItems: number): PaginationMetaDto {
  const totalPages = size > 0 ? Math.ceil(totalItems / size) : 0;

  return {
    current_page: page,
    page_size: size,
    total_items: totalItems,
    total_pages: totalPages,
  };
}

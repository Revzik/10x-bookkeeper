/**
 * Application-wide constants
 */

/**
 * Pagination defaults
 */
export const PAGINATION = {
  /** Default page number (1-indexed) */
  DEFAULT_PAGE: 1,
  /** Default page size (number of items per page) */
  DEFAULT_PAGE_SIZE: 20,
  /** Minimum allowed page size */
  MIN_PAGE_SIZE: 1,
  /** Maximum allowed page size */
  MAX_PAGE_SIZE: 100,
} as const;

/**
 * Sort defaults
 */
export const SORT = {
  /** Default sort field for most entities */
  DEFAULT_FIELD: "updated_at",
  /** Default sort order */
  DEFAULT_ORDER: "desc",
} as const;

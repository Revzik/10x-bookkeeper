import type {
  BookListItemDto,
  SeriesListItemDto,
  BookListItemViewModel,
  SeriesListItemViewModel,
  SeriesSelectOptionViewModel,
} from "@/types";

/**
 * Transform BookListItemDto to BookListItemViewModel
 */
export const transformBookListItem = (dto: BookListItemDto): BookListItemViewModel => {
  const progressPercent = dto.total_pages > 0 ? Math.round((dto.current_page / dto.total_pages) * 100) : 0;

  return {
    id: dto.id,
    title: dto.title,
    author: dto.author,
    status: dto.status,
    progressLabel: `${dto.current_page} / ${dto.total_pages}`,
    progressPercent,
    updatedAtIso: dto.updated_at,
    updatedAtLabel: formatRelativeTime(dto.updated_at),
    seriesId: dto.series_id,
  };
};

/**
 * Transform SeriesListItemDto to SeriesListItemViewModel
 */
export const transformSeriesListItem = (dto: SeriesListItemDto): SeriesListItemViewModel => {
  return {
    id: dto.id,
    title: dto.title,
    bookCount: dto.book_count,
    createdAtIso: dto.created_at,
    createdAtLabel: formatRelativeTime(dto.created_at),
    updatedAtIso: dto.updated_at,
    updatedAtLabel: formatRelativeTime(dto.updated_at),
  };
};

/**
 * Transform SeriesListItemDto to SeriesSelectOptionViewModel
 */
export const transformSeriesOption = (dto: SeriesListItemDto): SeriesSelectOptionViewModel => {
  return {
    value: dto.id,
    label: dto.title,
  };
};

/**
 * Format ISO timestamp to relative time string
 */
function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "just now";
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks}w ago`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months}mo ago`;
  } else {
    const years = Math.floor(diffDays / 365);
    return `${years}y ago`;
  }
}

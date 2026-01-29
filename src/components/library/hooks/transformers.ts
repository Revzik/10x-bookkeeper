import type {
  BookListItemDto,
  SeriesListItemDto,
  BookListItemViewModel,
  SeriesListItemViewModel,
  SeriesSelectOptionViewModel,
} from "@/types";
import { formatRelativeTime } from "@/lib/utils";

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
    seriesOrder: dto.series_order,
  };
};

/**
 * Transform SeriesListItemDto to SeriesListItemViewModel
 * Note: bookCount is defaulted to 0. To display actual count, query books separately.
 */
export const transformSeriesListItem = (dto: SeriesListItemDto, bookCount = 0): SeriesListItemViewModel => {
  return {
    id: dto.id,
    title: dto.title,
    bookCount,
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

import type { SeriesDto, SeriesHeaderViewModel } from "@/types";
import { formatRelativeTime } from "@/lib/utils";

/**
 * Transform SeriesDto to SeriesHeaderViewModel
 */
export const transformSeriesHeader = (dto: SeriesDto): SeriesHeaderViewModel => {
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description,
    coverImageUrl: dto.cover_image_url,
    bookCount: dto.book_count,
    createdAtIso: dto.created_at,
    createdAtLabel: formatRelativeTime(dto.created_at),
    updatedAtIso: dto.updated_at,
    updatedAtLabel: formatRelativeTime(dto.updated_at),
  };
};

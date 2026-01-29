import type { SeriesDto, SeriesHeaderViewModel } from "@/types";
import { formatRelativeTime } from "@/lib/utils";

/**
 * Transform SeriesDto to SeriesHeaderViewModel
 * Note: bookCount is defaulted to 0. To display actual count, query books separately.
 */
export const transformSeriesHeader = (dto: SeriesDto, bookCount = 0): SeriesHeaderViewModel => {
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description,
    coverImageUrl: dto.cover_image_url,
    bookCount,
    createdAtIso: dto.created_at,
    createdAtLabel: formatRelativeTime(dto.created_at),
    updatedAtIso: dto.updated_at,
    updatedAtLabel: formatRelativeTime(dto.updated_at),
  };
};

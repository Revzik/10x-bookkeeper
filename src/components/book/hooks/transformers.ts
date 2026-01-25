import type { BookDto, BookHeaderViewModel } from "@/types";
import { formatRelativeTime } from "@/lib/utils";

/**
 * Transform BookDto to BookHeaderViewModel
 *
 * Includes:
 * - Raw fields from DTO (for edit dialog)
 * - Computed fields (progress percent, formatted timestamps)
 * - Series summary (if book is linked to a series)
 */
export const transformBookHeader = (dto: BookDto, seriesTitle?: string): BookHeaderViewModel => {
  const progressPercent = dto.total_pages > 0 ? Math.round((dto.current_page / dto.total_pages) * 100) : 0;

  return {
    // Raw fields
    id: dto.id,
    title: dto.title,
    author: dto.author,
    status: dto.status,
    totalPages: dto.total_pages,
    currentPage: dto.current_page,
    seriesId: dto.series_id,
    seriesOrder: dto.series_order,
    coverImageUrl: dto.cover_image_url,

    // Computed fields
    progressLabel: `${dto.current_page} / ${dto.total_pages}`,
    progressPercent,
    series: dto.series_id && seriesTitle ? { id: dto.series_id, title: seriesTitle } : null,
    createdAtIso: dto.created_at,
    createdAtLabel: formatRelativeTime(dto.created_at),
    updatedAtIso: dto.updated_at,
    updatedAtLabel: formatRelativeTime(dto.updated_at),
  };
};

import type { PaginationMetaDto } from "@/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT } from "@/i18n/react";

interface PaginationControlsProps {
  meta: PaginationMetaDto;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
}

/**
 * PaginationControls - Server pagination controls
 */
export const PaginationControls = ({ meta, onPageChange, onSizeChange }: PaginationControlsProps) => {
  const { t } = useT();
  const { current_page, total_pages, page_size, total_items } = meta;

  const handlePrevious = () => {
    if (current_page > 1) {
      onPageChange(current_page - 1);
    }
  };

  const handleNext = () => {
    if (current_page < total_pages) {
      onPageChange(current_page + 1);
    }
  };

  const handleSizeChange = (size: number) => {
    onSizeChange(size);
  };

  return (
    <div className="flex items-center justify-between">
      {/* Page info */}
      <div className="text-sm text-muted-foreground" data-testid="pagination-info">
        {t("library.pagination.showing", {
          from: (current_page - 1) * page_size + 1,
          to: Math.min(current_page * page_size, total_items),
          total: total_items,
        })}
      </div>

      <div className="flex items-center gap-4">
        {/* Page size selector */}
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground">{t("library.pagination.perPage")}</Label>
          <Select value={String(page_size)} onValueChange={(value) => handleSizeChange(Number(value))}>
            <SelectTrigger className="w-[80px]" data-testid="select-page-size">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10" data-testid="option-page-size-10">
                10
              </SelectItem>
              <SelectItem value="20" data-testid="option-page-size-20">
                20
              </SelectItem>
              <SelectItem value="50" data-testid="option-page-size-50">
                50
              </SelectItem>
              <SelectItem value="100" data-testid="option-page-size-100">
                100
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Page navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            disabled={current_page === 1}
            data-testid="btn-pagination-previous"
          >
            {t("library.pagination.previous")}
          </Button>

          <span className="text-sm text-muted-foreground">
            {t("library.pagination.pageOf", { current: current_page, total: total_pages })}
          </span>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={current_page === total_pages}
            data-testid="btn-pagination-next"
          >
            {t("library.pagination.next")}
          </Button>
        </div>
      </div>
    </div>
  );
};

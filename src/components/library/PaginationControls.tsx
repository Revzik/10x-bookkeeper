import type { PaginationMetaDto } from "@/types";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PaginationControlsProps {
  meta: PaginationMetaDto;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
}

/**
 * PaginationControls - Server pagination controls
 */
export const PaginationControls = ({ meta, onPageChange, onSizeChange }: PaginationControlsProps) => {
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
      <div className="text-sm text-muted-foreground">
        Showing {(current_page - 1) * page_size + 1} to {Math.min(current_page * page_size, total_items)} of{" "}
        {total_items} results
      </div>

      <div className="flex items-center gap-4">
        {/* Page size selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="page-size" className="text-sm text-muted-foreground">
            Per page:
          </label>
          <Select value={String(page_size)} onValueChange={(value) => handleSizeChange(Number(value))}>
            <SelectTrigger className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Page navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevious} disabled={current_page === 1}>
            Previous
          </Button>

          <span className="text-sm text-muted-foreground">
            Page {current_page} of {total_pages}
          </span>

          <Button variant="outline" size="sm" onClick={handleNext} disabled={current_page === total_pages}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BookNotesQueryViewModel, ChapterSelectOptionViewModel } from "@/types";

interface BookNotesHeaderRowProps {
  query: BookNotesQueryViewModel;
  chapterOptions: ChapterSelectOptionViewModel[];
  isAddDisabled: boolean;
  addDisabledReason?: string;
  onQueryChange: (next: BookNotesQueryViewModel) => void;
  onAdd: () => void;
}

/**
 * Controls panel for Book Notes tab
 *
 * Features:
 * - Chapter filter dropdown (All chapters + individual chapters)
 * - Add note button (primary CTA)
 *
 * Layout:
 * - Mobile: stacked vertically
 * - Desktop: horizontal with space-between
 *
 * Note: Sorting is hardcoded by chapter order (ascending), not user-controlled
 */
export const BookNotesHeaderRow = ({
  query,
  chapterOptions,
  isAddDisabled,
  addDisabledReason,
  onQueryChange,
  onAdd,
}: BookNotesHeaderRowProps) => {
  const handleChapterChange = (value: string) => {
    // "all" means "All chapters"
    const chapter_id = value === "all" ? undefined : value;

    // Reset to page 1 when filter changes
    onQueryChange({
      ...query,
      chapter_id,
      page: 1,
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Left side: Chapter filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Chapter:</span>
        <Select value={query.chapter_id || "all"} onValueChange={handleChapterChange}>
          <SelectTrigger size="sm" className="w-[200px]">
            <SelectValue placeholder="All chapters" />
          </SelectTrigger>
          <SelectContent>
            {chapterOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Right side: Add note button */}
      <Button onClick={onAdd} disabled={isAddDisabled} title={addDisabledReason} size="sm">
        Add note
      </Button>
    </div>
  );
};

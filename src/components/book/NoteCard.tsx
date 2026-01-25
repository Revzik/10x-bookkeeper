import type { NoteListItemViewModel } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface NoteCardProps {
  note: NoteListItemViewModel;
  onOpen: () => void;
}

/**
 * NoteCard - Compact, clickable card for a note
 *
 * Display:
 * - First 60 characters of content (plain text)
 * - Timestamp label (updated at)
 *
 * Interaction:
 * - Clicking opens NoteDialog for this note
 * - Keyboard accessible (Enter/Space)
 *
 * Layout:
 * - Cards are displayed side-by-side and wrap within parent container
 * - Width classes applied inline
 * - Mobile: full width
 * - sm+: ~50% width (2 columns)
 * - lg+: ~33% width (3 columns)
 */
export const NoteCard = ({ note, onOpen }: NoteCardProps) => {
  // Get first 60 characters of content for display
  const displayContent = note.content.trim().substring(0, 60);
  const truncated = note.content.trim().length > 60;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen();
    }
  };

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      className={cn(
        "w-full cursor-pointer transition-colors",
        "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        "sm:w-[calc(50%-0.375rem)] lg:w-[calc(33.333%-0.5rem)]",
        "gap-2 py-4"
      )}
    >
      <CardContent className="space-y-2 px-6">
        {/* Content preview */}
        <p className="text-sm text-foreground">
          {displayContent}
          {truncated && "..."}
        </p>

        {/* Timestamp */}
        <p className="text-xs text-muted-foreground">Updated {note.updatedAtLabel}</p>
      </CardContent>
    </Card>
  );
};

import type { BookListItemViewModel, SeriesBookRowViewModel } from "@/types";
import { SeriesBookRow } from "./SeriesBookRow";
import { EntrySkeleton } from "../shared/EntrySkeleton";

interface SeriesBooksListProps {
  items: BookListItemViewModel[];
  loading: boolean;
  isEditing: boolean;
  draftOrderIds: string[];
  onOpenBook: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}

/**
 * SeriesBooksList - Renders books list with edit mode support
 *
 * Responsibilities:
 * - Display loading skeletons
 * - Display empty state
 * - Transform items to SeriesBookRowViewModel with position metadata
 * - Render rows using SeriesReorderBookRow component
 * - Handle reordering based on draftOrderIds in edit mode
 */
export const SeriesBooksList = ({
  items,
  loading,
  isEditing,
  draftOrderIds,
  onOpenBook,
  onMoveUp,
  onMoveDown,
}: SeriesBooksListProps) => {
  // Loading state
  if (loading) {
    return <EntrySkeleton />;
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-12 text-center">
        <p className="mb-4 text-foreground">No books found in this series</p>
        <p className="text-sm text-muted-foreground">
          Add books to this series from the Library page using the series filter
        </p>
      </div>
    );
  }

  // In edit mode, reorder items based on draftOrderIds
  const orderedItems = isEditing
    ? draftOrderIds
        .map((id) => items.find((item) => item.id === id))
        .filter((item): item is BookListItemViewModel => item !== undefined)
    : items;

  // Transform to SeriesBookRowViewModel with position metadata
  const rowViewModels: SeriesBookRowViewModel[] = orderedItems.map((item, index) => ({
    ...item,
    position: index + 1,
    isMoveUpDisabled: index === 0,
    isMoveDownDisabled: index === orderedItems.length - 1,
  }));

  return (
    <div className="space-y-3">
      {rowViewModels.map((bookRow) => (
        <SeriesBookRow
          key={bookRow.id}
          book={bookRow}
          isEditing={isEditing}
          onOpen={onOpenBook}
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
        />
      ))}
    </div>
  );
};

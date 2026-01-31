import { useState } from "react";
import { useSeriesBooksList, useSeriesBooksReorder } from "./hooks";
import { SeriesBooksHeaderRow } from "./SeriesBooksHeaderRow";
import { SeriesBooksList } from "./SeriesBooksList";
import { InlineBanner } from "@/components/library/InlineBanner";
import { useT } from "@/i18n/react";
import { withLocalePath } from "@/i18n";

interface SeriesBooksTabPanelProps {
  seriesId: string;
}

/**
 * SeriesBooksTabPanel - Displays all books within a series
 *
 * Responsibilities:
 * - Fetch and display all books in the series (no pagination)
 * - Handle loading and error states
 * - Navigate to book detail on row click
 * - Manage reorder mode with draft state and save/discard actions
 */
export const SeriesBooksTabPanel = ({ seriesId }: SeriesBooksTabPanelProps) => {
  const { locale } = useT();
  const { items, loading, error, refetch } = useSeriesBooksList(seriesId);
  const [isEditing, setIsEditing] = useState(false);

  // Reorder state management
  const reorderState = useSeriesBooksReorder({ items, isEditing });

  // TODO: Fix navigation to use proper routing instead of window.location
  // Current implementation triggers linter warning about writing to external variable
  const handleOpenBook = (bookId: string) => {
    window.location.href = withLocalePath(locale, `/books/${bookId}`);
  };

  const handleToggleEdit = () => {
    setIsEditing((prev) => !prev);
  };

  const handleSave = async () => {
    await reorderState.save();
    // Exit edit mode after successful save
    setIsEditing(false);
    // Refresh the list to get updated data from server
    refetch();
  };

  const handleDiscard = () => {
    reorderState.discard();
    setIsEditing(false);
  };

  // Error state (show above header)
  if (error && !loading) {
    return (
      <div className="space-y-4">
        <InlineBanner error={error} onRetry={refetch} />
      </div>
    );
  }

  // Books list
  return (
    <div className="space-y-4">
      {/* Header with reorder controls */}
      <SeriesBooksHeaderRow
        isEditing={isEditing}
        isDirty={reorderState.isDirty}
        isSaving={reorderState.isSaving}
        onToggleEdit={handleToggleEdit}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />

      {/* Save error banner (if present) */}
      {reorderState.saveError && <InlineBanner error={reorderState.saveError} onRetry={handleSave} />}

      {/* Books list with edit mode support */}
      <SeriesBooksList
        items={items}
        loading={loading}
        isEditing={isEditing}
        draftOrderIds={reorderState.draftOrderIds}
        onOpenBook={handleOpenBook}
        onMoveUp={reorderState.moveUp}
        onMoveDown={reorderState.moveDown}
      />
    </div>
  );
};

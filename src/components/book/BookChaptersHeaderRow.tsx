import { Button } from "@/components/ui/button";

interface BookChaptersHeaderRowProps {
  onAdd: () => void;
  reorder?: {
    isEditing: boolean;
    isDirty: boolean;
    isSaving: boolean;
    isDisabled: boolean;
    disabledReason?: string;
  };
  onToggleReorder?: () => void;
  onSaveReorder?: () => void;
  onDiscardReorder?: () => void;
}

/**
 * BookChaptersHeaderRow - Top action row for the Chapters tab
 *
 * Features:
 * - Add chapter button
 * - Reorder mode controls (toggle, save, discard)
 */
export const BookChaptersHeaderRow = ({
  onAdd,
  reorder,
  onToggleReorder,
  onSaveReorder,
  onDiscardReorder,
}: BookChaptersHeaderRowProps) => {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
      {/* Left section: Reorder controls (always present, content conditionally rendered) */}
      <div className="flex items-center gap-3">
        {reorder?.isEditing && reorder.isDirty && (
          <span className="text-sm font-medium text-muted-foreground">Unsaved changes</span>
        )}
      </div>

      {/* Right section: Action buttons */}
      <div className="flex items-center gap-2">
        {reorder?.isEditing ? (
          <>
            <Button variant="outline" size="sm" onClick={onDiscardReorder} disabled={reorder.isSaving}>
              Discard
            </Button>
            <Button variant="default" size="sm" onClick={onSaveReorder} disabled={!reorder.isDirty || reorder.isSaving}>
              {reorder.isSaving ? "Saving..." : "Save"}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleReorder}
              disabled={reorder?.isDisabled}
              title={reorder?.disabledReason}
            >
              Reorder
            </Button>
            <Button variant="default" size="sm" onClick={onAdd}>
              Add Chapter
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

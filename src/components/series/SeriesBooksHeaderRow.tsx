import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/react";

interface SeriesBooksHeaderRowProps {
  isEditing: boolean;
  isDirty: boolean;
  isSaving: boolean;
  onToggleEdit: () => void;
  onSave: () => void;
  onDiscard: () => void;
}

/**
 * SeriesBooksHeaderRow - Header controls for series books list
 *
 * Responsibilities:
 * - Provide reorder mode toggle
 * - Show dirty state indicator
 * - Provide save/discard actions in edit mode
 *
 * Behavior:
 * - When NOT editing: Shows only "Reorder" button
 * - When editing: Hides "Reorder" button, shows "Save" and "Discard" buttons
 * - Save button is enabled only when isDirty and not isSaving
 */
export const SeriesBooksHeaderRow = ({
  isEditing,
  isDirty,
  isSaving,
  onToggleEdit,
  onSave,
  onDiscard,
}: SeriesBooksHeaderRowProps) => {
  const { t } = useT();

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        {/* Dirty indicator (only shown in edit mode when dirty) */}
        {isEditing && isDirty && (
          <span className="text-sm font-medium text-muted-foreground">{t("series.books.unsavedChanges")}</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {!isEditing ? (
          /* View mode: Show only Reorder button */
          <Button variant="outline" size="sm" onClick={onToggleEdit}>
            {t("series.books.reorder")}
          </Button>
        ) : (
          /* Edit mode: Show Save and Discard buttons */
          <>
            <Button variant="outline" size="sm" onClick={onDiscard} disabled={isSaving}>
              {t("common.actions.discard")}
            </Button>
            <Button variant="default" size="sm" onClick={onSave} disabled={!isDirty || isSaving}>
              {isSaving ? t("dialogs.common.saving") : t("common.actions.save")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

import { useState } from "react";
import { useNoteMutations } from "@/hooks/useNoteMutations";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useT } from "@/i18n/react";

interface DeleteNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteId: string;
  chapterTitle: string;
  onDeleted: () => void;
}

/**
 * DeleteNoteDialog - Confirm and execute note deletion
 *
 * Features:
 * - Clear warning about permanent deletion
 * - Destructive styling
 * - Handles NOT_FOUND (already deleted) as success
 * - Uses custom hook for consistent state management and error handling
 */
export const DeleteNoteDialog = ({ open, onOpenChange, noteId, chapterTitle, onDeleted }: DeleteNoteDialogProps) => {
  const { t } = useT();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const { deleteNote, isDeleting } = useNoteMutations();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    const result = await deleteNote(noteId);

    if (result.success) {
      onDeleted();
      onOpenChange(false);
    } else {
      setGeneralError(result.error?.generalError || t("dialogs.note.deleteError"));
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setGeneralError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t("dialogs.note.deleteTitle")}</DialogTitle>
          <DialogDescription>{t("dialogs.note.deleteDescription", { title: chapterTitle })}</DialogDescription>
        </DialogHeader>

        {generalError && (
          <div
            className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
            aria-live="polite"
          >
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Warning */}
          <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            <strong>{t("dialogs.note.deleteWarningTitle")}</strong> {t("dialogs.note.deleteWarningBody")}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isDeleting}>
              {t("common.actions.cancel")}
            </Button>
            <Button type="submit" variant="destructive" disabled={isDeleting}>
              {isDeleting ? t("dialogs.note.deleting") : t("dialogs.note.deleteConfirm")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

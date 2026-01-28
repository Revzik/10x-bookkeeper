import { useState } from "react";
import { useNoteMutations } from "@/hooks/useNoteMutations";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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
      setGeneralError(result.error?.generalError || "Failed to delete note");
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
          <DialogTitle>Delete Note</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete this note from <strong>{chapterTitle}</strong>?
          </DialogDescription>
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
            <strong>Warning:</strong> This will permanently delete this note. This action cannot be undone.
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isDeleting}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete Note"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

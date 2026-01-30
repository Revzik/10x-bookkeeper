import { useState } from "react";
import { useBookMutations } from "@/hooks/useBookMutations";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useT } from "@/i18n/react";

interface DeleteBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookId: string;
  bookTitle: string;
  onDeleted: () => void;
}

/**
 * DeleteBookDialog - Confirm and execute book deletion
 *
 * Features:
 * - Clear warning about cascade behavior (deletes chapters, notes, embeddings, sessions)
 * - Destructive styling
 * - Handles NOT_FOUND (already deleted) - treats as success
 * - Uses custom hook for consistent state management and error handling
 */
export const DeleteBookDialog = ({ open, onOpenChange, bookId, bookTitle, onDeleted }: DeleteBookDialogProps) => {
  const { t } = useT();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const { deleteBook, isDeleting } = useBookMutations();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    const result = await deleteBook(bookId);

    if (result.success) {
      onDeleted();
      onOpenChange(false);
    } else {
      // Handle NOT_FOUND (already deleted) - treat as success
      if (result.error?.generalError?.includes("not found")) {
        onDeleted();
        onOpenChange(false);
        return;
      }

      setGeneralError(result.error?.generalError || t("dialogs.book.deleteError"));
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
          <DialogTitle>{t("dialogs.book.deleteTitle")}</DialogTitle>
          <DialogDescription>{t("dialogs.book.deleteDescription", { title: bookTitle })}</DialogDescription>
        </DialogHeader>

        {generalError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cascade Warning (always shown, not a toggle) */}
          <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            <strong>{t("dialogs.book.deleteWarningTitle")}</strong> {t("dialogs.book.deleteWarningBody")}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isDeleting}>
              {t("dialogs.book.cancel")}
            </Button>
            <Button type="submit" variant="destructive" disabled={isDeleting}>
              {isDeleting ? t("dialogs.book.deleting") : t("dialogs.book.deleteConfirm")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

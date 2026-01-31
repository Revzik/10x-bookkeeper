import { useState } from "react";
import { useChapterMutations } from "@/hooks/useChapterMutations";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useT } from "@/i18n/react";

interface DeleteChapterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapterId: string;
  chapterTitle: string;
  onDeleted: () => void;
}

/**
 * DeleteChapterDialog - Confirm and execute chapter deletion
 *
 * Features:
 * - Clear warning about cascade behavior (deletes notes and embeddings)
 * - Destructive styling
 * - Handles NOT_FOUND (already deleted) as success
 */
export const DeleteChapterDialog = ({
  open,
  onOpenChange,
  chapterId,
  chapterTitle,
  onDeleted,
}: DeleteChapterDialogProps) => {
  const { t } = useT();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const { deleteChapter, isDeleting } = useChapterMutations();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);

    const result = await deleteChapter(chapterId);

    if (result.success) {
      onDeleted();
      onOpenChange(false);
    } else {
      // Handle general errors
      if (result.error?.generalError) {
        setGeneralError(result.error.generalError);
      }
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
          <DialogTitle>{t("dialogs.chapter.deleteTitle")}</DialogTitle>
          <DialogDescription>{t("dialogs.chapter.deleteDescription", { title: chapterTitle })}</DialogDescription>
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
          {/* Cascade Warning */}
          <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            <strong>{t("dialogs.chapter.deleteWarningTitle")}</strong> {t("dialogs.chapter.deleteWarningBody")}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isDeleting}>
              {t("common.actions.cancel")}
            </Button>
            <Button type="submit" variant="destructive" disabled={isDeleting}>
              {isDeleting ? t("dialogs.chapter.deleting") : t("dialogs.chapter.deleteConfirm")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

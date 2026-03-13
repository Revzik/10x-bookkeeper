import { useState } from "react";
import type { NoteListItemViewModel } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DeleteNoteDialog } from "@/components/note/DeleteNoteDialog";
import { useT } from "@/i18n/react";

interface ViewNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: NoteListItemViewModel;
  chapterTitle: string;
  onDeleted: () => void;
  onEdit: () => void;
}

/**
 * ViewNoteDialog - View and delete an existing note
 */
export const ViewNoteDialog = ({ open, onOpenChange, note, chapterTitle, onDeleted, onEdit }: ViewNoteDialogProps) => {
  const { t } = useT();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleOpenDeleteDialog = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirmed = () => {
    setIsDeleteDialogOpen(false);
    onDeleted();
    onOpenChange(false);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{chapterTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Content */}
          <div className="space-y-2">
            <div className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 text-sm">
              {note.content}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4">
            {/* Left side: Delete button */}
            <Button type="button" variant="destructive" onClick={handleOpenDeleteDialog} size="sm">
              {t("common.actions.delete")}
            </Button>

            {/* Right side: Mode-specific actions */}
            <div className="ml-auto flex gap-3">
              <Button type="button" variant="outline" onClick={handleClose}>
                {t("common.actions.close")}
              </Button>
              <Button type="button" onClick={onEdit}>
                {t("common.actions.edit")}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Delete confirmation dialog */}
      <DeleteNoteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        noteId={note.id}
        chapterTitle={chapterTitle}
        onDeleted={handleDeleteConfirmed}
      />
    </Dialog>
  );
};

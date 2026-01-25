import { useState } from "react";
import type { ApiErrorResponseDto } from "@/types";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setSubmitting(true);

    try {
      await apiClient.delete(`/chapters/${chapterId}`);

      onDeleted();
      onOpenChange(false);
    } catch (error) {
      const apiError = error as ApiErrorResponseDto;

      // Handle NOT_FOUND (already deleted) - treat as success
      if (apiError.error?.code === "NOT_FOUND") {
        onDeleted();
        onOpenChange(false);
        return;
      }

      setGeneralError(apiError.error?.message || "Failed to delete chapter");
    } finally {
      setSubmitting(false);
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
          <DialogTitle>Delete Chapter</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{chapterTitle}</strong>?
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
          {/* Cascade Warning */}
          <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            <strong>⚠️ Warning:</strong> This will permanently delete all notes and embeddings associated with this
            chapter. This action cannot be undone.
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={submitting}>
              {submitting ? "Deleting..." : "Delete Chapter"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

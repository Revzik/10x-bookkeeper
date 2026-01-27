import { useState } from "react";
import type { ApiErrorResponseDto } from "@/types";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

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
 * - Handles NOT_FOUND (already deleted)
 */
export const DeleteBookDialog = ({ open, onOpenChange, bookId, bookTitle, onDeleted }: DeleteBookDialogProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setSubmitting(true);

    try {
      await apiClient.delete(`/books/${bookId}`);

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

      setGeneralError(apiError.error?.message || "Failed to delete book");
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
          <DialogTitle>Delete Book</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{bookTitle}</strong>?
          </DialogDescription>
        </DialogHeader>

        {generalError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cascade Warning (always shown, not a toggle) */}
          <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
            <strong>Warning:</strong> This will permanently delete all chapters and notes associated with this book.
            This action cannot be undone.
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={submitting}>
              {submitting ? "Deleting..." : "Delete Book"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

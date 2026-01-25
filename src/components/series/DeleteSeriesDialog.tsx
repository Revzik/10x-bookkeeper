import { useState } from "react";
import type { ApiErrorResponseDto } from "@/types";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface DeleteSeriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seriesId: string;
  seriesTitle: string;
  onDeleted: () => void;
}

/**
 * DeleteSeriesDialog - Confirm and execute series deletion
 *
 * Features:
 * - Explains default vs cascade behavior
 * - Explicit cascade toggle
 * - Destructive styling
 * - Handles NOT_FOUND (already deleted)
 */
export const DeleteSeriesDialog = ({
  open,
  onOpenChange,
  seriesId,
  seriesTitle,
  onDeleted,
}: DeleteSeriesDialogProps) => {
  const [cascade, setCascade] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setSubmitting(true);

    try {
      // Build endpoint with optional cascade query param
      const endpoint = cascade ? `/series/${seriesId}?cascade=true` : `/series/${seriesId}`;

      await apiClient.delete(endpoint);

      onDeleted();
      onOpenChange(false);

      // Reset state
      setCascade(false);
    } catch (error) {
      const apiError = error as ApiErrorResponseDto;

      // Handle NOT_FOUND (already deleted) - treat as success
      if (apiError.error?.code === "NOT_FOUND") {
        onDeleted();
        onOpenChange(false);
        return;
      }

      setGeneralError(apiError.error?.message || "Failed to delete series");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setGeneralError(null);
    setCascade(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Delete Series</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{seriesTitle}</strong>?
          </DialogDescription>
        </DialogHeader>

        {generalError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cascade Toggle */}
          <div className="flex items-center space-x-3 rounded-lg border border-destructive/50 bg-destructive/5 p-4">
            <input
              type="checkbox"
              id="cascade"
              checked={cascade}
              onChange={(e) => setCascade(e.target.checked)}
              disabled={submitting}
              className="h-4 w-4 rounded border-destructive text-destructive focus:ring-destructive"
            />
            <Label htmlFor="cascade" className="cursor-pointer text-sm font-semibold text-destructive">
              Also delete all books, chapters, and notes in this series
            </Label>
          </div>

          {cascade && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              <strong>Warning:</strong> This will permanently delete all content in this series. This action cannot be
              undone.
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={submitting}>
              {submitting ? "Deleting..." : cascade ? "Delete Everything" : "Delete Series"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

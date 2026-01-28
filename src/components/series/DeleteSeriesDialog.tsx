import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useSeriesMutations } from "@/hooks/useSeriesMutations";
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

interface DeleteSeriesFormData {
  cascade: boolean;
}

/**
 * DeleteSeriesDialog - Confirm and execute series deletion
 *
 * Features:
 * - React Hook Form for state management
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
  const [generalError, setGeneralError] = useState<string | null>(null);
  const { deleteSeries, isDeleting } = useSeriesMutations();

  const { register, handleSubmit, reset, watch } = useForm<DeleteSeriesFormData>({
    defaultValues: {
      cascade: false,
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      reset({
        cascade: false,
      });
      setGeneralError(null);
    }
  }, [open, reset]);

  const onSubmit = async (data: DeleteSeriesFormData) => {
    setGeneralError(null);

    const result = await deleteSeries(seriesId, data.cascade);

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
  };

  const cascadeValue = watch("cascade");

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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Cascade Toggle */}
          <div className="flex items-center space-x-3 rounded-lg border border-destructive/50 bg-destructive/5 p-4">
            <input
              type="checkbox"
              id="cascade"
              {...register("cascade")}
              disabled={isDeleting}
              className="h-4 w-4 rounded border-destructive text-destructive focus:ring-destructive"
            />
            <Label htmlFor="cascade" className="cursor-pointer text-sm font-semibold text-destructive">
              Also delete all books, chapters, and notes in this series
            </Label>
          </div>

          {cascadeValue && (
            <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
              <strong>Warning:</strong> This will permanently delete all content in this series. This action cannot be
              undone.
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isDeleting}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive" disabled={isDeleting}>
              {isDeleting ? "Deleting..." : cascadeValue ? "Delete Everything" : "Delete Series"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

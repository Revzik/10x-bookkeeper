import { useState, useEffect } from "react";
import type {
  ChapterListItemViewModel,
  UpdateChapterCommand,
  UpdateChapterResponseDto,
  ApiErrorResponseDto,
} from "@/types";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EditChapterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapter: ChapterListItemViewModel;
  onUpdated: () => void;
}

/**
 * EditChapterDialog - Edit chapter title and/or order
 *
 * Features:
 * - Pre-populated with existing chapter data
 * - Only sends changed fields to PATCH endpoint
 * - Client-side validation (at least one field must change)
 * - Server error mapping to form fields
 */
export const EditChapterDialog = ({ open, onOpenChange, chapter, onUpdated }: EditChapterDialogProps) => {
  const [formState, setFormState] = useState({
    title: chapter.title,
    order: chapter.order.toString(),
  });

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Reset form when chapter changes or dialog opens
  useEffect(() => {
    if (open) {
      setFormState({
        title: chapter.title,
        order: chapter.order.toString(),
      });
      setErrors({});
      setGeneralError(null);
    }
  }, [open, chapter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError(null);

    // Client-side validation
    const newErrors: Record<string, string> = {};

    // Title validation (if being changed)
    const titleChanged = formState.title.trim() !== chapter.title;
    if (titleChanged && !formState.title.trim()) {
      newErrors.title = "Title cannot be empty";
    }

    // Order validation (if being changed)
    const orderParsed = parseInt(formState.order, 10);
    const orderChanged = orderParsed !== chapter.order;
    if (orderChanged && (isNaN(orderParsed) || orderParsed < 0)) {
      newErrors.order = "Order must be 0 or greater";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Build command - only include fields that changed
    const command: UpdateChapterCommand = {};

    if (titleChanged) {
      command.title = formState.title.trim();
    }

    if (orderChanged) {
      command.order = orderParsed;
    }

    // If nothing changed, show message and don't submit
    if (Object.keys(command).length === 0) {
      setGeneralError("No changes to save");
      return;
    }

    setSubmitting(true);

    try {
      await apiClient.patchJson<UpdateChapterCommand, UpdateChapterResponseDto>(`/chapters/${chapter.id}`, command);

      onUpdated();
      onOpenChange(false);
    } catch (error) {
      const apiError = error as ApiErrorResponseDto;

      // Handle NOT_FOUND (chapter was deleted)
      if (apiError.error?.code === "NOT_FOUND") {
        setGeneralError("This chapter no longer exists");
        return;
      }

      // Handle validation errors
      if (apiError.error?.code === "VALIDATION_ERROR" && apiError.error.details) {
        const zodIssues = apiError.error.details as { path: string[]; message: string }[];
        const fieldErrors: Record<string, string> = {};

        zodIssues.forEach((issue) => {
          const fieldName = issue.path.join(".");
          fieldErrors[fieldName] = issue.message;
        });

        setErrors(fieldErrors);
      } else {
        setGeneralError(apiError.error?.message || "Failed to update chapter");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setErrors({});
    setGeneralError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Chapter</DialogTitle>
          <DialogDescription>Update the chapter title or change its position in the book.</DialogDescription>
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
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="edit-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-title"
              type="text"
              value={formState.title}
              onChange={(e) => setFormState({ ...formState, title: e.target.value })}
              disabled={submitting}
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? "edit-title-error" : undefined}
            />
            {errors.title && (
              <p id="edit-title-error" className="text-sm text-destructive" role="alert">
                {errors.title}
              </p>
            )}
          </div>

          {/* Order */}
          <div className="space-y-2">
            <Label htmlFor="edit-order">Order</Label>
            <Input
              id="edit-order"
              type="number"
              min="0"
              step="1"
              value={formState.order}
              onChange={(e) => setFormState({ ...formState, order: e.target.value })}
              disabled={submitting}
              aria-invalid={!!errors.order}
              aria-describedby={errors.order ? "edit-order-error" : undefined}
            />
            {errors.order && (
              <p id="edit-order-error" className="text-sm text-destructive" role="alert">
                {errors.order}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

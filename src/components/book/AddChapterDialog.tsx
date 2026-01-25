import { useState, useEffect } from "react";
import type { CreateChapterCommand, CreateChapterResponseDto, ApiErrorResponseDto } from "@/types";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AddChapterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookId: string;
  suggestedOrder?: number;
  onCreated: () => void;
}

/**
 * AddChapterDialog - Create a new chapter under the current book
 *
 * Features:
 * - Title (required)
 * - Order (optional, defaults to suggestedOrder or 0)
 * - Client-side validation
 * - Server error mapping to form fields
 */
export const AddChapterDialog = ({ open, onOpenChange, bookId, suggestedOrder, onCreated }: AddChapterDialogProps) => {
  const [formState, setFormState] = useState({
    title: "",
    order: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormState({
        title: "",
        order: "",
      });
      setErrors({});
      setGeneralError(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError(null);

    // Client-side validation
    const newErrors: Record<string, string> = {};

    // Title validation
    if (!formState.title.trim()) {
      newErrors.title = "Title is required";
    }

    // Order validation (only if provided)
    let orderValue: number | undefined;
    if (formState.order.trim()) {
      const parsed = parseInt(formState.order, 10);
      if (isNaN(parsed) || parsed < 0) {
        newErrors.order = "Order must be 0 or greater";
      } else {
        orderValue = parsed;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Build command
    const command: CreateChapterCommand = {
      title: formState.title.trim(),
    };

    // Include order if provided, otherwise let server use default or suggestedOrder
    if (orderValue !== undefined) {
      command.order = orderValue;
    } else if (suggestedOrder !== undefined) {
      command.order = suggestedOrder;
    }

    setSubmitting(true);

    try {
      await apiClient.postJson<CreateChapterCommand, CreateChapterResponseDto>(`/books/${bookId}/chapters`, command);

      onCreated();
      onOpenChange(false);
    } catch (error) {
      const apiError = error as ApiErrorResponseDto;

      // Handle NOT_FOUND (book was deleted)
      if (apiError.error?.code === "NOT_FOUND") {
        setGeneralError("This book no longer exists");
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
        setGeneralError(apiError.error?.message || "Failed to create chapter");
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
          <DialogTitle>Add Chapter</DialogTitle>
          <DialogDescription>Create a new chapter to organize your notes for this book.</DialogDescription>
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
            <Label htmlFor="add-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="add-title"
              type="text"
              value={formState.title}
              onChange={(e) => setFormState({ ...formState, title: e.target.value })}
              disabled={submitting}
              placeholder="Enter chapter title"
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? "add-title-error" : undefined}
            />
            {errors.title && (
              <p id="add-title-error" className="text-sm text-destructive" role="alert">
                {errors.title}
              </p>
            )}
          </div>

          {/* Order */}
          <div className="space-y-2">
            <Label htmlFor="add-order">
              Order{" "}
              <span className="text-xs text-muted-foreground">
                (optional, leave empty for auto: {suggestedOrder !== undefined ? suggestedOrder : "default"})
              </span>
            </Label>
            <Input
              id="add-order"
              type="number"
              min="0"
              step="1"
              value={formState.order}
              onChange={(e) => setFormState({ ...formState, order: e.target.value })}
              disabled={submitting}
              placeholder="Auto"
              aria-invalid={!!errors.order}
              aria-describedby={errors.order ? "add-order-error" : undefined}
            />
            {errors.order && (
              <p id="add-order-error" className="text-sm text-destructive" role="alert">
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
              {submitting ? "Creating..." : "Create Chapter"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

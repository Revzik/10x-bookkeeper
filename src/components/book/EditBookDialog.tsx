import { useState, useEffect } from "react";
import type {
  BookHeaderViewModel,
  BookStatus,
  SeriesSelectOptionViewModel,
  UpdateBookCommand,
  UpdateBookResponseDto,
  ApiErrorResponseDto,
} from "@/types";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EditBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  book: BookHeaderViewModel;
  seriesOptions: SeriesSelectOptionViewModel[];
  onUpdated: () => void;
}

/**
 * EditBookDialog - Edit book metadata and progress
 *
 * Features:
 * - Pre-populated with existing book data
 * - Only sends changed fields to PATCH endpoint
 * - Client-side validation (title/author required, progress invariants)
 * - Server error mapping to form fields
 */
export const EditBookDialog = ({ open, onOpenChange, book, seriesOptions, onUpdated }: EditBookDialogProps) => {
  const [formState, setFormState] = useState({
    title: book.title,
    author: book.author,
    total_pages: book.totalPages.toString(),
    current_page: book.currentPage.toString(),
    status: book.status,
    series_id: book.seriesId || "",
    series_order: book.seriesOrder?.toString() || "",
    cover_image_url: book.coverImageUrl || "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Reset form when book changes or dialog opens
  useEffect(() => {
    if (open) {
      setFormState({
        title: book.title,
        author: book.author,
        total_pages: book.totalPages.toString(),
        current_page: book.currentPage.toString(),
        status: book.status,
        series_id: book.seriesId || "",
        series_order: book.seriesOrder?.toString() || "",
        cover_image_url: book.coverImageUrl || "",
      });
      setErrors({});
      setGeneralError(null);
    }
  }, [open, book]);

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

    // Author validation
    if (!formState.author.trim()) {
      newErrors.author = "Author is required";
    }

    // Total pages validation
    const totalPages = parseInt(formState.total_pages, 10);
    if (isNaN(totalPages) || totalPages <= 0) {
      newErrors.total_pages = "Total pages must be greater than 0";
    }

    // Current page validation
    const currentPage = parseInt(formState.current_page, 10);
    if (isNaN(currentPage) || currentPage < 0) {
      newErrors.current_page = "Current page must be 0 or greater";
    }

    // Progress invariant: current_page <= total_pages
    if (!isNaN(currentPage) && !isNaN(totalPages) && currentPage > totalPages) {
      newErrors.current_page = "Current page cannot exceed total pages";
    }

    // Series order validation (only if series is selected)
    if (formState.series_id && formState.series_order) {
      const seriesOrder = parseInt(formState.series_order, 10);
      if (isNaN(seriesOrder) || seriesOrder < 1) {
        newErrors.series_order = "Series order must be at least 1";
      }
    }

    // Cover image URL validation
    if (formState.cover_image_url.trim()) {
      try {
        new URL(formState.cover_image_url.trim());
      } catch {
        newErrors.cover_image_url = "Please enter a valid URL";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Build command - only include fields that changed
    const command: UpdateBookCommand = {};

    if (formState.title.trim() !== book.title) {
      command.title = formState.title.trim();
    }

    if (formState.author.trim() !== book.author) {
      command.author = formState.author.trim();
    }

    if (totalPages !== book.totalPages) {
      command.total_pages = totalPages;
    }

    if (currentPage !== book.currentPage) {
      command.current_page = currentPage;
    }

    if (formState.status !== book.status) {
      command.status = formState.status;
    }

    // Series ID (handle null to unlink)
    const newSeriesId = formState.series_id || null;
    const oldSeriesId = book.seriesId || null;
    if (newSeriesId !== oldSeriesId) {
      command.series_id = newSeriesId;
    }

    // Series order
    const newSeriesOrder = formState.series_order ? parseInt(formState.series_order, 10) : null;
    const oldSeriesOrder = book.seriesOrder || null;
    if (newSeriesOrder !== oldSeriesOrder) {
      command.series_order = newSeriesOrder;
    }

    // Cover image URL (handle null to clear)
    const newCoverUrl = formState.cover_image_url.trim() || null;
    const oldCoverUrl = book.coverImageUrl || null;
    if (newCoverUrl !== oldCoverUrl) {
      command.cover_image_url = newCoverUrl;
    }

    // If nothing changed, show message and don't submit
    if (Object.keys(command).length === 0) {
      setGeneralError("No changes to save");
      return;
    }

    setSubmitting(true);

    try {
      await apiClient.patchJson<UpdateBookCommand, UpdateBookResponseDto>(`/books/${book.id}`, command);

      onUpdated();
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
        setGeneralError(apiError.error?.message || "Failed to update book");
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Book</DialogTitle>
        </DialogHeader>

        {generalError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
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
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
          </div>

          {/* Author */}
          <div className="space-y-2">
            <Label htmlFor="edit-author">
              Author <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-author"
              type="text"
              value={formState.author}
              onChange={(e) => setFormState({ ...formState, author: e.target.value })}
              disabled={submitting}
            />
            {errors.author && <p className="text-sm text-destructive">{errors.author}</p>}
          </div>

          {/* Total Pages */}
          <div className="space-y-2">
            <Label htmlFor="edit-total_pages">
              Total Pages <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-total_pages"
              type="number"
              min="1"
              value={formState.total_pages}
              onChange={(e) => setFormState({ ...formState, total_pages: e.target.value })}
              disabled={submitting}
            />
            {errors.total_pages && <p className="text-sm text-destructive">{errors.total_pages}</p>}
          </div>

          {/* Current Page */}
          <div className="space-y-2">
            <Label htmlFor="edit-current_page">Current Page</Label>
            <Input
              id="edit-current_page"
              type="number"
              min="0"
              value={formState.current_page}
              onChange={(e) => setFormState({ ...formState, current_page: e.target.value })}
              disabled={submitting}
            />
            {errors.current_page && <p className="text-sm text-destructive">{errors.current_page}</p>}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="edit-status">Status</Label>
            <Select
              value={formState.status}
              onValueChange={(value) => setFormState({ ...formState, status: value as BookStatus })}
              disabled={submitting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="want_to_read">Want to Read</SelectItem>
                <SelectItem value="reading">Reading</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Series */}
          <div className="space-y-2">
            <Label htmlFor="edit-series_id">
              Series{" "}
              <span className="text-xs text-muted-foreground">(optional, select &quot;None&quot; to unlink)</span>
            </Label>
            <Select
              value={formState.series_id || "none"}
              onValueChange={(value) => {
                const newSeriesId = value === "none" ? "" : value;
                setFormState({ ...formState, series_id: newSeriesId });
              }}
              disabled={submitting}
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {seriesOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.series_id && <p className="text-sm text-destructive">{errors.series_id}</p>}
          </div>

          {/* Series Order */}
          {formState.series_id && (
            <div className="space-y-2">
              <Label htmlFor="edit-series_order">Order in Series</Label>
              <Input
                id="edit-series_order"
                type="number"
                min="1"
                value={formState.series_order}
                onChange={(e) => setFormState({ ...formState, series_order: e.target.value })}
                disabled={submitting}
              />
              {errors.series_order && <p className="text-sm text-destructive">{errors.series_order}</p>}
            </div>
          )}

          {/* Cover Image URL */}
          <div className="space-y-2">
            <Label htmlFor="edit-cover_image_url">
              Cover Image URL <span className="text-xs text-muted-foreground">(optional, clear to remove)</span>
            </Label>
            <Input
              id="edit-cover_image_url"
              type="url"
              value={formState.cover_image_url}
              onChange={(e) => setFormState({ ...formState, cover_image_url: e.target.value })}
              disabled={submitting}
            />
            {errors.cover_image_url && <p className="text-sm text-destructive">{errors.cover_image_url}</p>}
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

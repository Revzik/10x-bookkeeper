import { useState } from "react";
import type {
  BookStatus,
  SeriesSelectOptionViewModel,
  CreateBookCommand,
  CreateBookResponseDto,
  ApiErrorResponseDto,
} from "@/types";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AddBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seriesOptions: SeriesSelectOptionViewModel[];
  onCreated: () => void;
}

/**
 * AddBookDialog - Create book flow
 */
export const AddBookDialog = ({ open, onOpenChange, seriesOptions, onCreated }: AddBookDialogProps) => {
  const [formState, setFormState] = useState({
    title: "",
    author: "",
    total_pages: "",
    status: "want_to_read" as BookStatus,
    series_id: "",
    series_order: "",
    cover_image_url: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError(null);

    // Client-side validation
    const newErrors: Record<string, string> = {};

    if (!formState.title.trim()) {
      newErrors.title = "Title is required";
    }

    if (!formState.author.trim()) {
      newErrors.author = "Author is required";
    }

    const totalPages = parseInt(formState.total_pages, 10);
    if (!formState.total_pages || isNaN(totalPages) || totalPages <= 0) {
      newErrors.total_pages = "Total pages must be a positive number";
    }

    if (formState.series_order) {
      const seriesOrder = parseInt(formState.series_order, 10);
      if (isNaN(seriesOrder) || seriesOrder < 1) {
        newErrors.series_order = "Series order must be at least 1";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Build command
    const command: CreateBookCommand = {
      title: formState.title.trim(),
      author: formState.author.trim(),
      total_pages: totalPages,
      status: formState.status,
    };

    if (formState.series_id) {
      command.series_id = formState.series_id;
    }

    if (formState.series_order) {
      command.series_order = parseInt(formState.series_order, 10);
    }

    if (formState.cover_image_url.trim()) {
      command.cover_image_url = formState.cover_image_url.trim();
    }

    setSubmitting(true);

    try {
      await apiClient.postJson<CreateBookCommand, CreateBookResponseDto>("/books", command);

      onCreated();

      // Reset form
      setFormState({
        title: "",
        author: "",
        total_pages: "",
        status: "want_to_read",
        series_id: "",
        series_order: "",
        cover_image_url: "",
      });
    } catch (error) {
      const apiError = error as ApiErrorResponseDto;

      if (apiError.error?.code === "VALIDATION_ERROR" && apiError.error.details) {
        // Map Zod validation errors to form fields
        const fieldErrors: Record<string, string> = {};

        apiError.error.details.forEach((issue) => {
          const fieldName = issue.path.join(".");
          fieldErrors[fieldName] = issue.message;
        });

        setErrors(fieldErrors);
      } else {
        setGeneralError(apiError.error?.message || "Failed to create book");
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
          <DialogTitle>Add Book</DialogTitle>
        </DialogHeader>

        {generalError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              type="text"
              value={formState.title}
              onChange={(e) => setFormState({ ...formState, title: e.target.value })}
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
          </div>

          {/* Author */}
          <div className="space-y-2">
            <Label htmlFor="author">
              Author <span className="text-destructive">*</span>
            </Label>
            <Input
              id="author"
              type="text"
              value={formState.author}
              onChange={(e) => setFormState({ ...formState, author: e.target.value })}
            />
            {errors.author && <p className="text-sm text-destructive">{errors.author}</p>}
          </div>

          {/* Total Pages */}
          <div className="space-y-2">
            <Label htmlFor="total_pages">
              Total Pages <span className="text-destructive">*</span>
            </Label>
            <Input
              id="total_pages"
              type="number"
              min="1"
              value={formState.total_pages}
              onChange={(e) => setFormState({ ...formState, total_pages: e.target.value })}
            />
            {errors.total_pages && <p className="text-sm text-destructive">{errors.total_pages}</p>}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formState.status}
              onValueChange={(value) => setFormState({ ...formState, status: value as BookStatus })}
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
            <Label htmlFor="series_id">Series</Label>
            <Select
              value={formState.series_id || "none"}
              onValueChange={(value) => setFormState({ ...formState, series_id: value === "none" ? "" : value })}
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
              <Label htmlFor="series_order">Order in Series</Label>
              <Input
                id="series_order"
                type="number"
                min="1"
                value={formState.series_order}
                onChange={(e) => setFormState({ ...formState, series_order: e.target.value })}
              />
              {errors.series_order && <p className="text-sm text-destructive">{errors.series_order}</p>}
            </div>
          )}

          {/* Cover Image URL */}
          <div className="space-y-2">
            <Label htmlFor="cover_image_url">Cover Image URL</Label>
            <Input
              id="cover_image_url"
              type="url"
              value={formState.cover_image_url}
              onChange={(e) => setFormState({ ...formState, cover_image_url: e.target.value })}
            />
            {errors.cover_image_url && <p className="text-sm text-destructive">{errors.cover_image_url}</p>}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Creating..." : "Create Book"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

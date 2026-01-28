import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { BookHeaderViewModel, SeriesSelectOptionViewModel, UpdateBookCommand } from "@/types";
import { bookFormSchema, type BookFormData } from "@/lib/validation/book-form.schemas";
import { useBookMutations } from "@/hooks/useBookMutations";
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
 * - React Hook Form for state management
 * - Pre-populated with existing book data
 * - Only sends changed fields to PATCH endpoint (using dirtyFields)
 * - Zod validation schema
 * - Field-level and general error handling
 */
export const EditBookDialog = ({ open, onOpenChange, book, seriesOptions, onUpdated }: EditBookDialogProps) => {
  const [generalError, setGeneralError] = useState<string | null>(null);
  const { updateBook, isUpdating } = useBookMutations();

  const {
    register,
    handleSubmit,
    formState: { errors, dirtyFields },
    control,
    reset,
    setError,
    watch,
  } = useForm({
    resolver: zodResolver(bookFormSchema),
    defaultValues: {
      title: book.title,
      author: book.author,
      total_pages: book.totalPages,
      current_page: book.currentPage,
      status: book.status,
      series_id: book.seriesId || "",
      series_order: (book.seriesOrder || undefined) as number | null | undefined,
      cover_image_url: book.coverImageUrl || "",
    },
  });

  // Reset form when book changes or dialog opens
  useEffect(() => {
    if (open) {
      reset({
        title: book.title,
        author: book.author,
        total_pages: book.totalPages,
        current_page: book.currentPage,
        status: book.status,
        series_id: book.seriesId || "",
        series_order: book.seriesOrder || undefined,
        cover_image_url: book.coverImageUrl || "",
      });
      setGeneralError(null);
    }
  }, [open, book, reset]);

  const onSubmit = async (data: BookFormData) => {
    setGeneralError(null);

    // Build command - only include changed fields
    const command: UpdateBookCommand = {};

    if (dirtyFields.title) {
      command.title = data.title.trim();
    }

    if (dirtyFields.author) {
      command.author = data.author.trim();
    }

    if (dirtyFields.total_pages) {
      command.total_pages = data.total_pages;
    }

    if (dirtyFields.current_page) {
      command.current_page = data.current_page;
    }

    if (dirtyFields.status) {
      command.status = data.status;
    }

    if (dirtyFields.series_id) {
      command.series_id = data.series_id || null;
    }

    if (dirtyFields.series_order) {
      command.series_order = data.series_order || null;
    }

    if (dirtyFields.cover_image_url) {
      command.cover_image_url = (data.cover_image_url && data.cover_image_url.trim()) || null;
    }

    // Check if anything changed
    if (Object.keys(command).length === 0) {
      setGeneralError("No changes to save");
      return;
    }

    const result = await updateBook(book.id, command);

    if (result.success) {
      onUpdated();
      onOpenChange(false);
    } else {
      // Handle errors
      if (result.error?.fieldErrors) {
        Object.entries(result.error.fieldErrors).forEach(([field, message]) => {
          setError(field as keyof BookFormData, { message });
        });
      }

      if (result.error?.generalError) {
        setGeneralError(result.error.generalError);
      }
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setGeneralError(null);
  };

  const seriesIdValue = watch("series_id");

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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="edit-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input id="edit-title" type="text" {...register("title")} disabled={isUpdating} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          {/* Author */}
          <div className="space-y-2">
            <Label htmlFor="edit-author">
              Author <span className="text-destructive">*</span>
            </Label>
            <Input id="edit-author" type="text" {...register("author")} disabled={isUpdating} />
            {errors.author && <p className="text-sm text-destructive">{errors.author.message}</p>}
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
              {...register("total_pages", { valueAsNumber: true })}
              disabled={isUpdating}
            />
            {errors.total_pages && <p className="text-sm text-destructive">{errors.total_pages.message}</p>}
          </div>

          {/* Current Page */}
          <div className="space-y-2">
            <Label htmlFor="edit-current_page">Current Page</Label>
            <Input
              id="edit-current_page"
              type="number"
              min="0"
              {...register("current_page", { valueAsNumber: true })}
              disabled={isUpdating}
            />
            {errors.current_page && <p className="text-sm text-destructive">{errors.current_page.message}</p>}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="edit-status">Status</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isUpdating}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="want_to_read">Want to Read</SelectItem>
                    <SelectItem value="reading">Reading</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Series */}
          <div className="space-y-2">
            <Label htmlFor="edit-series_id">
              Series{" "}
              <span className="text-xs text-muted-foreground">(optional, select &quot;None&quot; to unlink)</span>
            </Label>
            <Controller
              control={control}
              name="series_id"
              render={({ field }) => (
                <Select
                  value={field.value || "none"}
                  onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                  disabled={isUpdating}
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
              )}
            />
            {errors.series_id && <p className="text-sm text-destructive">{errors.series_id.message}</p>}
          </div>

          {/* Series Order */}
          {seriesIdValue && (
            <div className="space-y-2">
              <Label htmlFor="edit-series_order">Order in Series</Label>
              <Input
                id="edit-series_order"
                type="number"
                min="1"
                {...register("series_order", { valueAsNumber: true })}
                disabled={isUpdating}
              />
              {errors.series_order && <p className="text-sm text-destructive">{errors.series_order.message}</p>}
            </div>
          )}

          {/* Cover Image URL */}
          <div className="space-y-2">
            <Label htmlFor="edit-cover_image_url">
              Cover Image URL <span className="text-xs text-muted-foreground">(optional, clear to remove)</span>
            </Label>
            <Input id="edit-cover_image_url" type="url" {...register("cover_image_url")} disabled={isUpdating} />
            {errors.cover_image_url && <p className="text-sm text-destructive">{errors.cover_image_url.message}</p>}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isUpdating}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

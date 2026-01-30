import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { SeriesSelectOptionViewModel, CreateBookCommand } from "@/types";
import { bookFormSchema, type BookFormData } from "@/lib/validation/book-form.schemas";
import { useBookMutations } from "@/hooks/useBookMutations";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT } from "@/i18n/react";

interface AddBookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seriesOptions: SeriesSelectOptionViewModel[];
  onCreated: () => void;
}

/**
 * AddBookDialog - Create book flow
 *
 * Features:
 * - React Hook Form for state management
 * - Zod validation schema
 * - Automatic form reset after successful creation
 * - Field-level and general error handling
 */
export const AddBookDialog = ({ open, onOpenChange, seriesOptions, onCreated }: AddBookDialogProps) => {
  const { t } = useT();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const { createBook, isCreating } = useBookMutations();

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    reset,
    setError,
    watch,
  } = useForm({
    resolver: zodResolver(bookFormSchema),
    defaultValues: {
      title: "",
      author: "",
      total_pages: 0,
      current_page: 0,
      status: "want_to_read" as const,
      series_id: "",
      series_order: undefined as number | null | undefined,
      cover_image_url: "",
    },
  });

  const onSubmit = async (data: BookFormData) => {
    setGeneralError(null);

    // Build command - only include fields that are present
    const command: CreateBookCommand = {
      title: data.title.trim(),
      author: data.author.trim(),
      total_pages: data.total_pages,
      status: data.status,
    };

    if (data.series_id) {
      command.series_id = data.series_id;
    }

    if (data.series_order) {
      command.series_order = data.series_order;
    }

    if (data.cover_image_url && data.cover_image_url.trim()) {
      command.cover_image_url = data.cover_image_url.trim();
    }

    const result = await createBook(command);

    if (result.success) {
      onCreated();
      reset(); // Reset form to default values
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" data-testid="dialog-add-book">
        <DialogHeader>
          <DialogTitle>{t("dialogs.book.addTitle")}</DialogTitle>
        </DialogHeader>

        {generalError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {t(generalError)}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              {t("dialogs.book.titleLabel")} <span className="text-destructive">*</span>
            </Label>
            <Input id="title" type="text" {...register("title")} disabled={isCreating} data-testid="input-book-title" />
            {errors.title?.message && <p className="text-sm text-destructive">{t(errors.title.message)}</p>}
          </div>

          {/* Author */}
          <div className="space-y-2">
            <Label htmlFor="author">
              {t("dialogs.book.authorLabel")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="author"
              type="text"
              {...register("author")}
              disabled={isCreating}
              data-testid="input-book-author"
            />
            {errors.author?.message && <p className="text-sm text-destructive">{t(errors.author.message)}</p>}
          </div>

          {/* Total Pages */}
          <div className="space-y-2">
            <Label htmlFor="total_pages">
              {t("dialogs.book.totalPagesLabel")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="total_pages"
              type="number"
              min="1"
              {...register("total_pages", { valueAsNumber: true })}
              disabled={isCreating}
              data-testid="input-book-total-pages"
            />
            {errors.total_pages?.message && <p className="text-sm text-destructive">{t(errors.total_pages.message)}</p>}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">{t("dialogs.book.statusLabel")}</Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isCreating}>
                  <SelectTrigger data-testid="select-book-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="want_to_read" data-testid="option-book-status-want-to-read">
                      {t("book.status.wantToRead")}
                    </SelectItem>
                    <SelectItem value="reading" data-testid="option-book-status-reading">
                      {t("book.status.reading")}
                    </SelectItem>
                    <SelectItem value="completed" data-testid="option-book-status-completed">
                      {t("book.status.completed")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Series */}
          <div className="space-y-2">
            <Label htmlFor="series_id">{t("dialogs.book.seriesLabel")}</Label>
            <Controller
              control={control}
              name="series_id"
              render={({ field }) => (
                <Select
                  value={field.value || "none"}
                  onValueChange={(value) => field.onChange(value === "none" ? "" : value)}
                  disabled={isCreating}
                >
                  <SelectTrigger data-testid="select-book-series">
                    <SelectValue placeholder={t("dialogs.book.seriesNone")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" data-testid="option-book-series-none">
                      {t("dialogs.book.seriesNone")}
                    </SelectItem>
                    {seriesOptions.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        data-testid={`option-book-series-${option.value}`}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.series_id?.message && <p className="text-sm text-destructive">{t(errors.series_id.message)}</p>}
          </div>

          {/* Series Order */}
          {seriesIdValue && (
            <div className="space-y-2">
              <Label htmlFor="series_order">{t("dialogs.book.seriesOrderLabel")}</Label>
              <Input
                id="series_order"
                type="number"
                min="1"
                {...register("series_order", { valueAsNumber: true })}
                disabled={isCreating}
                data-testid="input-book-series-order"
              />
              {errors.series_order?.message && (
                <p className="text-sm text-destructive">{t(errors.series_order.message)}</p>
              )}
            </div>
          )}

          {/* Cover Image URL */}
          <div className="space-y-2">
            <Label htmlFor="cover_image_url">{t("dialogs.book.coverImageLabel")}</Label>
            <Input
              id="cover_image_url"
              type="url"
              {...register("cover_image_url")}
              disabled={isCreating}
              data-testid="input-book-cover-image-url"
            />
            {errors.cover_image_url?.message && (
              <p className="text-sm text-destructive">{t(errors.cover_image_url.message)}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
              data-testid="btn-cancel-add-book"
            >
              {t("dialogs.book.cancel")}
            </Button>
            <Button type="submit" disabled={isCreating} data-testid="btn-create-book">
              {isCreating ? t("dialogs.book.creating") : t("dialogs.book.create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

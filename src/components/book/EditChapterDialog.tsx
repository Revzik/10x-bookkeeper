import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ChapterListItemViewModel } from "@/types";
import { updateChapterFormSchema, type UpdateChapterFormData } from "@/lib/validation/chapter-form.schemas";
import { useChapterMutations } from "@/hooks/useChapterMutations";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/i18n/react";

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
 * - React Hook Form for state management
 * - Pre-populated with existing chapter data
 * - Only sends changed fields to PATCH endpoint
 * - Automatic change detection via dirtyFields
 * - Zod validation schema
 * - Server error mapping to form fields
 */
export const EditChapterDialog = ({ open, onOpenChange, chapter, onUpdated }: EditChapterDialogProps) => {
  const { t } = useT();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const { updateChapter, isUpdating } = useChapterMutations();

  const {
    register,
    handleSubmit,
    formState: { errors, dirtyFields },
    reset,
    setError,
  } = useForm<UpdateChapterFormData>({
    resolver: zodResolver(updateChapterFormSchema),
    defaultValues: {
      title: chapter.title,
      order: chapter.order,
    },
  });

  // Reset form when chapter changes or dialog opens
  useEffect(() => {
    if (open) {
      reset({
        title: chapter.title,
        order: chapter.order,
      });
      setGeneralError(null);
    }
  }, [open, chapter, reset]);

  const onSubmit = async (data: UpdateChapterFormData) => {
    setGeneralError(null);

    // Build command - only include fields that changed
    const command: {
      title?: string;
      order?: number;
    } = {};

    if (dirtyFields.title) {
      command.title = data.title.trim();
    }

    if (dirtyFields.order) {
      command.order = data.order;
    }

    // If nothing changed, show message and don't submit
    if (Object.keys(command).length === 0) {
      setGeneralError(t("dialogs.common.noChanges"));
      return;
    }

    const result = await updateChapter(chapter.id, command);

    if (result.success) {
      onUpdated();
      onOpenChange(false);
    } else {
      // Handle field-level errors
      if (result.error?.fieldErrors) {
        Object.entries(result.error.fieldErrors).forEach(([field, message]) => {
          setError(field as keyof UpdateChapterFormData, { message });
        });
      }

      // Handle general errors
      if (result.error?.generalError) {
        setGeneralError(result.error.generalError);
      }
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
          <DialogTitle>{t("dialogs.chapter.editTitle")}</DialogTitle>
          <DialogDescription>{t("dialogs.chapter.editDescription")}</DialogDescription>
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="edit-title">
              {t("dialogs.chapter.titleLabel")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-title"
              type="text"
              {...register("title")}
              disabled={isUpdating}
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? "edit-title-error" : undefined}
            />
            {errors.title && (
              <p id="edit-title-error" className="text-sm text-destructive" role="alert">
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Order */}
          <div className="space-y-2">
            <Label htmlFor="edit-order">{t("dialogs.chapter.orderLabel")}</Label>
            <Input
              id="edit-order"
              type="number"
              min="0"
              step="1"
              {...register("order")}
              disabled={isUpdating}
              aria-invalid={!!errors.order}
              aria-describedby={errors.order ? "edit-order-error" : undefined}
            />
            {errors.order && (
              <p id="edit-order-error" className="text-sm text-destructive" role="alert">
                {errors.order.message}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isUpdating}>
              {t("common.actions.cancel")}
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? t("dialogs.common.saving") : t("dialogs.common.saveChanges")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

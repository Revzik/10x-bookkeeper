import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createChapterFormSchema, type CreateChapterFormData } from "@/lib/validation/chapter-form.schemas";
import { useChapterMutations } from "@/hooks/useChapterMutations";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/i18n/react";

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
 * - React Hook Form for state management
 * - Title (required)
 * - Order (optional, defaults to suggestedOrder or 0)
 * - Zod validation schema
 * - Server error mapping to form fields
 */
export const AddChapterDialog = ({ open, onOpenChange, bookId, suggestedOrder, onCreated }: AddChapterDialogProps) => {
  const { t } = useT();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const { createChapter, isCreating } = useChapterMutations();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm<CreateChapterFormData>({
    resolver: zodResolver(createChapterFormSchema),
    defaultValues: {
      title: "",
      order: null,
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      reset({
        title: "",
        order: null,
      });
      setGeneralError(null);
    }
  }, [open, reset]);

  const onSubmit = async (data: CreateChapterFormData) => {
    setGeneralError(null);

    // Build command
    const command: {
      title: string;
      order?: number;
    } = {
      title: data.title.trim(),
    };

    // Include order if provided by user, otherwise use suggestedOrder if available
    if (data.order !== null && data.order !== undefined) {
      command.order = data.order;
    } else if (suggestedOrder !== undefined) {
      command.order = suggestedOrder;
    }

    const result = await createChapter(bookId, command);

    if (result.success) {
      onCreated();
      onOpenChange(false);
    } else {
      // Handle field-level errors
      if (result.error?.fieldErrors) {
        Object.entries(result.error.fieldErrors).forEach(([field, message]) => {
          setError(field as keyof CreateChapterFormData, { message });
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
          <DialogTitle>{t("dialogs.chapter.addTitle")}</DialogTitle>
          <DialogDescription>{t("dialogs.chapter.addDescription")}</DialogDescription>
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
            <Label htmlFor="add-title">
              {t("dialogs.chapter.titleLabel")} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="add-title"
              type="text"
              {...register("title")}
              disabled={isCreating}
              placeholder={t("dialogs.chapter.titlePlaceholder")}
              aria-invalid={!!errors.title}
              aria-describedby={errors.title ? "add-title-error" : undefined}
            />
            {errors.title && (
              <p id="add-title-error" className="text-sm text-destructive" role="alert">
                {errors.title.message}
              </p>
            )}
          </div>

          {/* Order */}
          <div className="space-y-2">
            <Label htmlFor="add-order">
              {t("dialogs.chapter.orderLabel")}{" "}
              <span className="text-xs text-muted-foreground">
                {t("dialogs.chapter.orderOptionalNote", {
                  suggested: suggestedOrder !== undefined ? suggestedOrder : t("dialogs.chapter.orderAutoDefault"),
                })}
              </span>
            </Label>
            <Input
              id="add-order"
              type="number"
              min="0"
              step="1"
              {...register("order")}
              disabled={isCreating}
              placeholder={t("dialogs.chapter.orderPlaceholder")}
              aria-invalid={!!errors.order}
              aria-describedby={errors.order ? "add-order-error" : undefined}
            />
            {errors.order && (
              <p id="add-order-error" className="text-sm text-destructive" role="alert">
                {errors.order.message}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isCreating}>
              {t("common.actions.cancel")}
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? t("dialogs.chapter.creating") : t("dialogs.chapter.create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

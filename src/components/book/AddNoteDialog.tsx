import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ChapterSelectOptionViewModel } from "@/types";
import { createNoteFormSchema, type CreateNoteFormData, MAX_CONTENT_LENGTH } from "@/lib/validation/note-form.schemas";
import { useNoteMutations } from "@/hooks/useNoteMutations";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT } from "@/i18n/react";

interface AddNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapterOptions: ChapterSelectOptionViewModel[];
  initialChapterId?: string;
  onCreated: () => void;
}

/**
 * AddNoteDialog - Create a new note for a book chapter
 *
 * Features:
 * - React Hook Form for state management
 * - Chapter selection (required)
 * - Content textarea with validation (required, max 10,000 chars)
 * - Character counter
 * - Zod validation schema
 * - Field-level and general error handling
 */
export const AddNoteDialog = ({
  open,
  onOpenChange,
  chapterOptions,
  initialChapterId,
  onCreated,
}: AddNoteDialogProps) => {
  const { t } = useT();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const { createNote, isCreating } = useNoteMutations();

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    reset,
    setError,
    watch,
  } = useForm<CreateNoteFormData>({
    resolver: zodResolver(createNoteFormSchema),
    defaultValues: {
      chapter_id: initialChapterId || "",
      content: "",
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      reset({
        chapter_id: initialChapterId || "",
        content: "",
      });
      setGeneralError(null);
    }
  }, [open, initialChapterId, reset]);

  const contentValue = watch("content");
  const contentLength = contentValue.length;
  const trimmedLength = contentValue.trim().length;
  const isContentTooLong = contentLength > MAX_CONTENT_LENGTH;
  const isContentEmpty = trimmedLength === 0;

  const onSubmit = async (data: CreateNoteFormData) => {
    setGeneralError(null);

    const result = await createNote(data.chapter_id, {
      content: data.content.trim(),
    });

    if (result.success) {
      onCreated();
      onOpenChange(false);
    } else {
      // Handle field-level errors
      if (result.error?.fieldErrors) {
        Object.entries(result.error.fieldErrors).forEach(([field, message]) => {
          setError(field as keyof CreateNoteFormData, { message });
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
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{t("dialogs.note.addTitle")}</DialogTitle>
          <DialogDescription>{t("dialogs.note.addDescription")}</DialogDescription>
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
          {/* Chapter select */}
          <div className="space-y-2">
            <Label htmlFor="note-chapter">
              {t("dialogs.note.chapterLabel")} <span className="text-destructive">*</span>
            </Label>
            <Controller
              control={control}
              name="chapter_id"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={isCreating}>
                  <SelectTrigger
                    id="note-chapter"
                    className="w-full"
                    aria-invalid={!!errors.chapter_id}
                    aria-describedby={errors.chapter_id ? "note-chapter-error" : undefined}
                  >
                    <SelectValue placeholder={t("dialogs.note.chapterPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {chapterOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.chapter_id && (
              <p id="note-chapter-error" className="text-sm text-destructive" role="alert">
                {errors.chapter_id.message}
              </p>
            )}
          </div>

          {/* Content */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="note-content">
                {t("dialogs.note.contentLabel")} <span className="text-destructive">*</span>
              </Label>
              <span className={`text-xs ${isContentTooLong ? "text-destructive" : "text-muted-foreground"}`}>
                {contentLength} / {MAX_CONTENT_LENGTH}
              </span>
            </div>
            <Textarea
              id="note-content"
              {...register("content")}
              disabled={isCreating}
              placeholder={t("dialogs.note.contentPlaceholder")}
              rows={10}
              aria-invalid={!!errors.content}
              aria-describedby={errors.content ? "note-content-error" : undefined}
              className="min-h-[200px]"
            />
            {errors.content && (
              <p id="note-content-error" className="text-sm text-destructive" role="alert">
                {errors.content.message}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isCreating}>
              {t("common.actions.cancel")}
            </Button>
            <Button type="submit" disabled={isCreating || isContentEmpty || isContentTooLong}>
              {isCreating ? t("dialogs.note.creating") : t("dialogs.note.create")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

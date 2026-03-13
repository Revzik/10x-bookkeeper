import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { ChapterSelectOptionViewModel } from "@/types";
import { createNoteFormSchema, type CreateNoteFormData, MAX_CONTENT_LENGTH } from "@/lib/validation/note-form.schemas";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT } from "@/i18n/react";

interface NoteFormProps {
  bookTitle: string;
  initialChapterId: string;
  initialContent: string;
  chapterOptions: ChapterSelectOptionViewModel[];
  isSubmitting: boolean;
  submitLabel: string;
  submittingLabel: string;
  generalError: string | null;
  serverFieldErrors?: Record<string, string>;
  onSubmit: (data: CreateNoteFormData, dirtyFields: Record<string, boolean>) => void;
  onCancel: () => void;
  renderExtraActions?: () => React.ReactNode;
}

export const NoteForm = ({
  bookTitle,
  initialChapterId,
  initialContent,
  chapterOptions,
  isSubmitting,
  submitLabel,
  submittingLabel,
  generalError,
  serverFieldErrors,
  onSubmit,
  onCancel,
  renderExtraActions,
}: NoteFormProps) => {
  const { t } = useT();

  const {
    register,
    handleSubmit,
    formState: { errors, dirtyFields },
    control,
    setError,
    watch,
  } = useForm<CreateNoteFormData>({
    resolver: zodResolver(createNoteFormSchema),
    defaultValues: {
      chapter_id: initialChapterId,
      content: initialContent,
    },
  });

  useEffect(() => {
    if (serverFieldErrors) {
      Object.entries(serverFieldErrors).forEach(([field, message]) => {
        setError(field as keyof CreateNoteFormData, { message });
      });
    }
  }, [serverFieldErrors, setError]);

  const contentValue = watch("content") || "";
  const contentLength = contentValue.length;
  const trimmedLength = contentValue.trim().length;
  const isContentTooLong = contentLength > MAX_CONTENT_LENGTH;
  const isContentEmpty = trimmedLength === 0;

  const handleFormSubmit = (data: CreateNoteFormData) => {
    onSubmit(data, dirtyFields as Record<string, boolean>);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {generalError && (
        <div
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
          role="alert"
          aria-live="polite"
        >
          {generalError}
        </div>
      )}

      {/* Book Title Display */}
      {bookTitle && (
        <div className="mb-4 space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{t("note.bookTitleLabel") || "Book"}</p>
          <p className="text-lg font-semibold">{bookTitle}</p>
        </div>
      )}

      {/* Chapter select */}
      <div className="space-y-2">
        <Label htmlFor="note-chapter">
          {t("note.chapterLabel")} <span className="text-destructive">*</span>
        </Label>
        <Controller
          control={control}
          name="chapter_id"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange} disabled={isSubmitting}>
              <SelectTrigger
                id="note-chapter"
                className="w-full"
                aria-invalid={!!errors.chapter_id}
                aria-describedby={errors.chapter_id ? "note-chapter-error" : undefined}
              >
                <SelectValue placeholder={t("note.chapterPlaceholder")} />
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
            {t("note.contentLabel")} <span className="text-destructive">*</span>
          </Label>
          <span className={`text-xs ${isContentTooLong ? "text-destructive" : "text-muted-foreground"}`}>
            {contentLength} / {MAX_CONTENT_LENGTH}
          </span>
        </div>
        <Textarea
          id="note-content"
          {...register("content")}
          disabled={isSubmitting}
          placeholder={t("note.contentPlaceholder")}
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
      <div className="flex items-center justify-between pt-4 pb-8">
        <div>{renderExtraActions && renderExtraActions()}</div>
        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            {t("common.actions.cancel")}
          </Button>
          <Button type="submit" disabled={isSubmitting || isContentEmpty || isContentTooLong}>
            {isSubmitting ? submittingLabel : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
};

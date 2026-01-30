import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type {
  NoteListItemViewModel,
  ChapterSelectOptionViewModel,
  UpdateNoteCommand,
  ExistingNoteDialogModeViewModel,
} from "@/types";
import { updateNoteFormSchema, type UpdateNoteFormData, MAX_CONTENT_LENGTH } from "@/lib/validation/note-form.schemas";
import { useNoteMutations } from "@/hooks/useNoteMutations";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteNoteDialog } from "./DeleteNoteDialog";
import { useT } from "@/i18n/react";

interface ViewEditNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: NoteListItemViewModel;
  chapterOptions: ChapterSelectOptionViewModel[];
  chapterTitle: string;
  onUpdated: () => void;
}

/**
 * ViewEditNoteDialog - View, edit, and delete an existing note
 *
 * Features:
 * - View mode: Read-only content display with Edit and Delete buttons
 * - Editing mode: Editable textarea and chapter selector with Save and Discard buttons
 * - React Hook Form for state management
 * - Content validation (required, max 10,000 chars) via Zod
 * - Character counter
 * - Chapter reassignment support
 * - Delete confirmation
 * - Error handling for all operations
 */
export const ViewEditNoteDialog = ({
  open,
  onOpenChange,
  note,
  chapterOptions,
  chapterTitle,
  onUpdated,
}: ViewEditNoteDialogProps) => {
  const { t } = useT();
  const [mode, setMode] = useState<ExistingNoteDialogModeViewModel>("view");
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { updateNote, isUpdating } = useNoteMutations();

  const {
    register,
    handleSubmit,
    formState: { errors, dirtyFields },
    control,
    reset,
    setError,
    watch,
  } = useForm<UpdateNoteFormData>({
    resolver: zodResolver(updateNoteFormSchema),
    defaultValues: {
      chapter_id: note.chapterId,
      content: note.content,
    },
  });

  // Reset form when dialog opens or note changes
  useEffect(() => {
    if (open) {
      reset({
        chapter_id: note.chapterId,
        content: note.content,
      });
      setMode("view");
      setGeneralError(null);
    }
  }, [open, note, reset]);

  const contentValue = watch("content");
  const contentLength = contentValue.length;
  const trimmedLength = contentValue.trim().length;
  const isContentTooLong = contentLength > MAX_CONTENT_LENGTH;
  const isContentEmpty = trimmedLength === 0;

  // Check if there are any changes
  const hasChanges = Object.keys(dirtyFields).length > 0;

  const onSubmit = async (data: UpdateNoteFormData) => {
    setGeneralError(null);

    if (!hasChanges) {
      setGeneralError(t("dialogs.common.noChanges"));
      return;
    }

    // Build command - only include changed fields
    const command: UpdateNoteCommand = {};

    if (dirtyFields.content) {
      command.content = data.content.trim();
    }

    if (dirtyFields.chapter_id) {
      command.chapter_id = data.chapter_id;
    }

    const result = await updateNote(note.id, command);

    if (result.success) {
      onUpdated();
      onOpenChange(false);
    } else {
      // Handle field-level errors
      if (result.error?.fieldErrors) {
        Object.entries(result.error.fieldErrors).forEach(([field, message]) => {
          setError(field as keyof UpdateNoteFormData, { message });
        });
      }

      // Handle general errors
      if (result.error?.generalError) {
        setGeneralError(result.error.generalError);
      }
    }
  };

  const handleOpenDeleteDialog = () => {
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirmed = () => {
    setIsDeleteDialogOpen(false);
    onUpdated();
    onOpenChange(false);
  };

  const handleEnterEditMode = () => {
    setMode("editing");
    setGeneralError(null);
  };

  const handleDiscard = () => {
    reset({
      chapter_id: note.chapterId,
      content: note.content,
    });
    setMode("view");
    setGeneralError(null);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>{chapterTitle}</DialogTitle>
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
          {/* Chapter (editing mode only) */}
          {mode === "editing" && (
            <div className="space-y-2">
              <Label htmlFor="note-chapter">
                {t("dialogs.note.chapterLabel")} <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={control}
                name="chapter_id"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange} disabled={isUpdating}>
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
          )}

          {/* Content */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="note-content">
                {t("dialogs.note.contentLabel")} <span className="text-destructive">*</span>
              </Label>
              {mode === "editing" && (
                <span className={`text-xs ${isContentTooLong ? "text-destructive" : "text-muted-foreground"}`}>
                  {contentLength} / {MAX_CONTENT_LENGTH}
                </span>
              )}
            </div>
            {mode === "editing" ? (
              <Textarea
                id="note-content"
                {...register("content")}
                disabled={isUpdating}
                placeholder={t("dialogs.note.contentPlaceholder")}
                rows={10}
                aria-invalid={!!errors.content}
                aria-describedby={errors.content ? "note-content-error" : undefined}
                className="min-h-[200px]"
              />
            ) : (
              <div className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 text-sm">
                {contentValue}
              </div>
            )}
            {errors.content && (
              <p id="note-content-error" className="text-sm text-destructive" role="alert">
                {errors.content.message}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4">
            {/* Left side: Delete button */}
            <Button
              type="button"
              variant="destructive"
              onClick={handleOpenDeleteDialog}
              disabled={isUpdating}
              size="sm"
            >
              {t("common.actions.delete")}
            </Button>

            {/* Right side: Mode-specific actions */}
            <div className="ml-auto flex gap-3">
              {mode === "view" && (
                <>
                  <Button type="button" variant="outline" onClick={handleClose}>
                    {t("common.actions.close")}
                  </Button>
                  <Button type="button" onClick={handleEnterEditMode}>
                    {t("common.actions.edit")}
                  </Button>
                </>
              )}

              {mode === "editing" && (
                <>
                  <Button type="button" variant="outline" onClick={handleDiscard} disabled={isUpdating}>
                    {t("common.actions.discard")}
                  </Button>
                  <Button type="submit" disabled={isUpdating || isContentEmpty || isContentTooLong || !hasChanges}>
                    {isUpdating ? t("dialogs.common.saving") : t("common.actions.save")}
                  </Button>
                </>
              )}
            </div>
          </div>
        </form>
      </DialogContent>

      {/* Delete confirmation dialog */}
      <DeleteNoteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        noteId={note.id}
        chapterTitle={chapterTitle}
        onDeleted={handleDeleteConfirmed}
      />
    </Dialog>
  );
};

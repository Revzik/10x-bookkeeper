import { useState, useEffect, useMemo } from "react";
import type {
  NoteListItemViewModel,
  ChapterSelectOptionViewModel,
  UpdateNoteCommand,
  UpdateNoteResponseDto,
  ApiErrorResponseDto,
  ExistingNoteDialogModeViewModel,
} from "@/types";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteNoteDialog } from "./DeleteNoteDialog";

const MAX_CONTENT_LENGTH = 10000;

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
 * - Content validation (required, max 10,000 chars)
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
  const [editingMode, setEditingMode] = useState<ExistingNoteDialogModeViewModel>("view");
  const [content, setContent] = useState(note.content);
  const [chapterId, setChapterId] = useState(note.chapterId);
  const [originalContent, setOriginalContent] = useState(note.content);
  const [originalChapterId, setOriginalChapterId] = useState(note.chapterId);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Reset state when dialog opens or note changes
  useEffect(() => {
    if (open) {
      setContent(note.content);
      setChapterId(note.chapterId);
      setOriginalContent(note.content);
      setOriginalChapterId(note.chapterId);
      setEditingMode("view");
      setErrors({});
      setGeneralError(null);
    }
  }, [open, note]);

  const contentLength = content.length;
  const trimmedLength = content.trim().length;
  const isContentTooLong = contentLength > MAX_CONTENT_LENGTH;
  const isContentEmpty = trimmedLength === 0;

  // Check if there are any changes
  const hasChanges = useMemo(() => {
    const contentChanged = content.trim() !== originalContent.trim();
    const chapterChanged = chapterId !== originalChapterId;
    return contentChanged || chapterChanged;
  }, [content, originalContent, chapterId, originalChapterId]);

  const handleUpdate = async () => {
    setErrors({});
    setGeneralError(null);

    if (!hasChanges) {
      setGeneralError("No changes to save");
      return;
    }

    // Check if anything changed
    const contentChanged = content.trim() !== originalContent.trim();
    const chapterChanged = chapterId !== originalChapterId;

    // Client-side validation
    const newErrors: Record<string, string> = {};

    if (isContentEmpty) {
      newErrors.content = "Content is required";
    }

    if (isContentTooLong) {
      newErrors.content = `Content must be ${MAX_CONTENT_LENGTH} characters or less`;
    }

    if (!chapterId) {
      newErrors.chapter_id = "Chapter is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);

    try {
      const command: UpdateNoteCommand = {};

      if (contentChanged) {
        command.content = content.trim();
      }

      if (chapterChanged) {
        command.chapter_id = chapterId;
      }

      await apiClient.patchJson<UpdateNoteCommand, UpdateNoteResponseDto>(`/notes/${note.id}`, command);

      onUpdated();
      onOpenChange(false);
    } catch (error) {
      const apiError = error as ApiErrorResponseDto;

      // Handle NOT_FOUND (note was deleted)
      if (apiError.error?.code === "NOT_FOUND") {
        // Treat as success - it was deleted elsewhere
        onUpdated();
        onOpenChange(false);
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
      } else if (apiError.error?.code === "RATE_LIMITED") {
        setGeneralError("Too many requests. Please wait a moment and try again.");
      } else {
        setGeneralError(apiError.error?.message || "Failed to update note");
      }
    } finally {
      setSubmitting(false);
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
    setEditingMode("editing");
    setErrors({});
    setGeneralError(null);
  };

  const handleDiscard = () => {
    setContent(originalContent);
    setChapterId(originalChapterId);
    setEditingMode("view");
    setErrors({});
    setGeneralError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMode === "editing") {
      handleUpdate();
    }
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Chapter (editing mode only) */}
          {editingMode === "editing" && (
            <div className="space-y-2">
              <Label htmlFor="note-chapter">
                Chapter <span className="text-destructive">*</span>
              </Label>
              <Select value={chapterId} onValueChange={setChapterId} disabled={submitting}>
                <SelectTrigger
                  id="note-chapter"
                  className="w-full"
                  aria-invalid={!!errors.chapter_id}
                  aria-describedby={errors.chapter_id ? "note-chapter-error" : undefined}
                >
                  <SelectValue placeholder="Select a chapter" />
                </SelectTrigger>
                <SelectContent>
                  {chapterOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.chapter_id && (
                <p id="note-chapter-error" className="text-sm text-destructive" role="alert">
                  {errors.chapter_id}
                </p>
              )}
            </div>
          )}

          {/* Content */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="note-content">
                Content <span className="text-destructive">*</span>
              </Label>
              {editingMode === "editing" && (
                <span className={`text-xs ${isContentTooLong ? "text-destructive" : "text-muted-foreground"}`}>
                  {contentLength} / {MAX_CONTENT_LENGTH}
                </span>
              )}
            </div>
            {editingMode === "editing" ? (
              <Textarea
                id="note-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                disabled={submitting}
                placeholder="Enter your note content..."
                rows={10}
                aria-invalid={!!errors.content}
                aria-describedby={errors.content ? "note-content-error" : undefined}
                className="min-h-[200px]"
              />
            ) : (
              <div className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 text-sm">
                {content}
              </div>
            )}
            {errors.content && (
              <p id="note-content-error" className="text-sm text-destructive" role="alert">
                {errors.content}
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
              disabled={submitting}
              size="sm"
            >
              Delete
            </Button>

            {/* Right side: Mode-specific actions */}
            <div className="ml-auto flex gap-3">
              {editingMode === "view" && (
                <>
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Close
                  </Button>
                  <Button type="button" onClick={handleEnterEditMode}>
                    Edit
                  </Button>
                </>
              )}

              {editingMode === "editing" && (
                <>
                  <Button type="button" variant="outline" onClick={handleDiscard} disabled={submitting}>
                    Discard
                  </Button>
                  <Button type="submit" disabled={submitting || isContentEmpty || isContentTooLong || !hasChanges}>
                    {submitting ? "Saving..." : "Save"}
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

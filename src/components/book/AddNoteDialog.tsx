import { useState, useEffect } from "react";
import type {
  ChapterSelectOptionViewModel,
  CreateNoteCommand,
  CreateNoteResponseDto,
  ApiErrorResponseDto,
} from "@/types";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MAX_CONTENT_LENGTH = 10000;

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
 * - Chapter selection (required)
 * - Content textarea with validation (required, max 10,000 chars)
 * - Character counter
 * - Error handling for validation and API errors
 */
export const AddNoteDialog = ({
  open,
  onOpenChange,
  chapterOptions,
  initialChapterId,
  onCreated,
}: AddNoteDialogProps) => {
  const [formState, setFormState] = useState({
    chapter_id: initialChapterId || "",
    content: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setFormState({
        chapter_id: initialChapterId || "",
        content: "",
      });
      setErrors({});
      setGeneralError(null);
    }
  }, [open, initialChapterId]);

  const contentLength = formState.content.length;
  const trimmedLength = formState.content.trim().length;
  const isContentTooLong = contentLength > MAX_CONTENT_LENGTH;
  const isContentEmpty = trimmedLength === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError(null);

    // Client-side validation
    const newErrors: Record<string, string> = {};

    if (!formState.chapter_id) {
      newErrors.chapter_id = "Chapter is required";
    }

    if (isContentEmpty) {
      newErrors.content = "Content is required";
    }

    if (isContentTooLong) {
      newErrors.content = `Content must be ${MAX_CONTENT_LENGTH} characters or less`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);

    try {
      const command: CreateNoteCommand = {
        content: formState.content.trim(),
      };

      await apiClient.postJson<CreateNoteCommand, CreateNoteResponseDto>(
        `/chapters/${formState.chapter_id}/notes`,
        command
      );

      onCreated();
      onOpenChange(false);
    } catch (error) {
      const apiError = error as ApiErrorResponseDto;

      // Handle NOT_FOUND (chapter was deleted)
      if (apiError.error?.code === "NOT_FOUND") {
        setGeneralError("This chapter no longer exists. Please refresh and try again.");
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
        setGeneralError(apiError.error?.message || "Failed to create note");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Add note</DialogTitle>
          <DialogDescription>Create a new note for this book chapter.</DialogDescription>
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
          {/* Chapter select */}
          <div className="space-y-2">
            <Label htmlFor="note-chapter">
              Chapter <span className="text-destructive">*</span>
            </Label>
            <Select
              value={formState.chapter_id}
              onValueChange={(value) => setFormState({ ...formState, chapter_id: value })}
              disabled={submitting}
            >
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

          {/* Content */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="note-content">
                Content <span className="text-destructive">*</span>
              </Label>
              <span className={`text-xs ${isContentTooLong ? "text-destructive" : "text-muted-foreground"}`}>
                {contentLength} / {MAX_CONTENT_LENGTH}
              </span>
            </div>
            <Textarea
              id="note-content"
              value={formState.content}
              onChange={(e) => setFormState({ ...formState, content: e.target.value })}
              disabled={submitting}
              placeholder="Enter your note content..."
              rows={10}
              aria-invalid={!!errors.content}
              aria-describedby={errors.content ? "note-content-error" : undefined}
              className="min-h-[200px]"
            />
            {errors.content && (
              <p id="note-content-error" className="text-sm text-destructive" role="alert">
                {errors.content}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || isContentEmpty || isContentTooLong}>
              {submitting ? "Creating..." : "Create Note"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

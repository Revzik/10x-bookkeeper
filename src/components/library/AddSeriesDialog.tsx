import { useState } from "react";
import type { CreateSeriesCommand, CreateSeriesResponseDto, ApiErrorResponseDto } from "@/types";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface AddSeriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

/**
 * AddSeriesDialog - Create series flow
 */
export const AddSeriesDialog = ({ open, onOpenChange, onCreated }: AddSeriesDialogProps) => {
  const [formState, setFormState] = useState({
    title: "",
    description: "",
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

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Build command
    const command: CreateSeriesCommand = {
      title: formState.title.trim(),
    };

    if (formState.description.trim()) {
      command.description = formState.description.trim();
    }

    if (formState.cover_image_url.trim()) {
      command.cover_image_url = formState.cover_image_url.trim();
    }

    setSubmitting(true);

    try {
      await apiClient.postJson<CreateSeriesCommand, CreateSeriesResponseDto>("/series", command);

      onCreated();

      // Reset form
      setFormState({
        title: "",
        description: "",
        cover_image_url: "",
      });
    } catch (error) {
      const apiError = error as ApiErrorResponseDto;

      if (apiError.error?.code === "VALIDATION_ERROR" && apiError.error.details) {
        // Map Zod validation errors to form fields
        const zodIssues = apiError.error.details as { path: string[]; message: string }[];
        const fieldErrors: Record<string, string> = {};

        zodIssues.forEach((issue) => {
          const fieldName = issue.path.join(".");
          fieldErrors[fieldName] = issue.message;
        });

        setErrors(fieldErrors);
      } else {
        setGeneralError(apiError.error?.message || "Failed to create series");
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Series</DialogTitle>
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

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={4}
              value={formState.description}
              onChange={(e) => setFormState({ ...formState, description: e.target.value })}
            />
            {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
          </div>

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
              {submitting ? "Creating..." : "Create Series"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

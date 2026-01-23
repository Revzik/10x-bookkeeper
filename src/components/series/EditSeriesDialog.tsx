import { useState, useEffect } from "react";
import type {
  SeriesHeaderViewModel,
  UpdateSeriesCommand,
  UpdateSeriesResponseDto,
  ApiErrorResponseDto,
  SeriesDto,
} from "@/types";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface EditSeriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  series: SeriesHeaderViewModel;
  onUpdated: (series: SeriesDto) => void;
}

/**
 * EditSeriesDialog - Edit series metadata
 *
 * Features:
 * - Pre-populated with existing series data
 * - Client-side validation (title required, URL format)
 * - Clear optional fields by sending null
 * - Server error mapping to form fields
 */
export const EditSeriesDialog = ({ open, onOpenChange, series, onUpdated }: EditSeriesDialogProps) => {
  const [formState, setFormState] = useState({
    title: series.title,
    description: series.description || "",
    cover_image_url: series.coverImageUrl || "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Reset form when series changes or dialog opens
  useEffect(() => {
    if (open) {
      setFormState({
        title: series.title,
        description: series.description || "",
        cover_image_url: series.coverImageUrl || "",
      });
      setErrors({});
      setGeneralError(null);
    }
  }, [open, series]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError(null);

    // Client-side validation
    const newErrors: Record<string, string> = {};

    if (!formState.title.trim()) {
      newErrors.title = "Title is required";
    }

    // Validate cover_image_url if provided
    if (formState.cover_image_url.trim()) {
      try {
        new URL(formState.cover_image_url.trim());
      } catch {
        newErrors.cover_image_url = "Please enter a valid URL";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Build command - only include fields that changed
    const command: UpdateSeriesCommand = {};

    // Title (always send if changed)
    if (formState.title.trim() !== series.title) {
      command.title = formState.title.trim();
    }

    // Description (send null to clear, or new value if changed)
    const newDescription = formState.description.trim();
    const oldDescription = series.description || "";
    if (newDescription !== oldDescription) {
      command.description = newDescription || null;
    }

    // Cover Image URL (send null to clear, or new value if changed)
    const newCoverUrl = formState.cover_image_url.trim();
    const oldCoverUrl = series.coverImageUrl || "";
    if (newCoverUrl !== oldCoverUrl) {
      command.cover_image_url = newCoverUrl || null;
    }

    // If nothing changed, just close
    if (Object.keys(command).length === 0) {
      onOpenChange(false);
      return;
    }

    setSubmitting(true);

    try {
      const response = await apiClient.patchJson<UpdateSeriesCommand, UpdateSeriesResponseDto>(
        `/series/${series.id}`,
        command
      );

      onUpdated(response.series);
      onOpenChange(false);
    } catch (error) {
      const apiError = error as ApiErrorResponseDto;

      // Handle NOT_FOUND (series was deleted)
      if (apiError.error?.code === "NOT_FOUND") {
        setGeneralError("This series no longer exists");
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
      } else {
        setGeneralError(apiError.error?.message || "Failed to update series");
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
          <DialogTitle>Edit Series</DialogTitle>
        </DialogHeader>

        {generalError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="edit-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-title"
              type="text"
              value={formState.title}
              onChange={(e) => setFormState({ ...formState, title: e.target.value })}
              disabled={submitting}
            />
            {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-description">
              Description <span className="text-xs text-muted-foreground">(optional, clear to remove)</span>
            </Label>
            <Textarea
              id="edit-description"
              rows={4}
              value={formState.description}
              onChange={(e) => setFormState({ ...formState, description: e.target.value })}
              disabled={submitting}
            />
            {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
          </div>

          {/* Cover Image URL */}
          <div className="space-y-2">
            <Label htmlFor="edit-cover_image_url">
              Cover Image URL <span className="text-xs text-muted-foreground">(optional, clear to remove)</span>
            </Label>
            <Input
              id="edit-cover_image_url"
              type="url"
              value={formState.cover_image_url}
              onChange={(e) => setFormState({ ...formState, cover_image_url: e.target.value })}
              disabled={submitting}
            />
            {errors.cover_image_url && <p className="text-sm text-destructive">{errors.cover_image_url}</p>}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

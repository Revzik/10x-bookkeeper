import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { SeriesHeaderViewModel, UpdateSeriesCommand, SeriesDto } from "@/types";
import { seriesFormSchema, type SeriesFormData } from "@/lib/validation/series-form.schemas";
import { useSeriesMutations } from "@/hooks/useSeriesMutations";
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
 * - React Hook Form for state management
 * - Pre-populated with existing series data
 * - Only sends changed fields to PATCH endpoint (using dirtyFields)
 * - Clear optional fields by sending null
 * - Zod validation schema
 * - Field-level and general error handling
 */
export const EditSeriesDialog = ({ open, onOpenChange, series, onUpdated }: EditSeriesDialogProps) => {
  const [generalError, setGeneralError] = useState<string | null>(null);
  const { updateSeries, isUpdating } = useSeriesMutations();

  const {
    register,
    handleSubmit,
    formState: { errors, dirtyFields },
    reset,
    setError,
  } = useForm<SeriesFormData>({
    resolver: zodResolver(seriesFormSchema),
    defaultValues: {
      title: series.title,
      description: series.description || "",
      cover_image_url: series.coverImageUrl || "",
    },
  });

  // Reset form when series changes or dialog opens
  useEffect(() => {
    if (open) {
      reset({
        title: series.title,
        description: series.description || "",
        cover_image_url: series.coverImageUrl || "",
      });
      setGeneralError(null);
    }
  }, [open, series, reset]);

  const onSubmit = async (data: SeriesFormData) => {
    setGeneralError(null);

    // Build command - only include changed fields
    const command: UpdateSeriesCommand = {};

    if (dirtyFields.title) {
      command.title = data.title.trim();
    }

    if (dirtyFields.description) {
      command.description = data.description.trim() || null;
    }

    if (dirtyFields.cover_image_url) {
      command.cover_image_url = data.cover_image_url.trim() || null;
    }

    // If nothing changed, just close
    if (Object.keys(command).length === 0) {
      onOpenChange(false);
      return;
    }

    const result = await updateSeries(series.id, command);

    if (result.success && result.data) {
      onUpdated(result.data.series);
      onOpenChange(false);
    } else {
      // Handle field-level errors
      if (result.error?.fieldErrors) {
        Object.entries(result.error.fieldErrors).forEach(([field, message]) => {
          setError(field as keyof SeriesFormData, { message });
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Series</DialogTitle>
        </DialogHeader>

        {generalError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="edit-title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input id="edit-title" type="text" {...register("title")} disabled={isUpdating} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-description">
              Description <span className="text-xs text-muted-foreground">(optional, clear to remove)</span>
            </Label>
            <Textarea id="edit-description" rows={4} {...register("description")} disabled={isUpdating} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>

          {/* Cover Image URL */}
          <div className="space-y-2">
            <Label htmlFor="edit-cover_image_url">
              Cover Image URL <span className="text-xs text-muted-foreground">(optional, clear to remove)</span>
            </Label>
            <Input id="edit-cover_image_url" type="url" {...register("cover_image_url")} disabled={isUpdating} />
            {errors.cover_image_url && <p className="text-sm text-destructive">{errors.cover_image_url.message}</p>}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isUpdating}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

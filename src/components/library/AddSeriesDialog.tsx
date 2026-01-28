import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { CreateSeriesCommand } from "@/types";
import { seriesFormSchema, type SeriesFormData } from "@/lib/validation/series-form.schemas";
import { useSeriesMutations } from "@/hooks/useSeriesMutations";
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
 *
 * Features:
 * - React Hook Form for state management
 * - Zod validation schema
 * - Field-level and general error handling
 */
export const AddSeriesDialog = ({ open, onOpenChange, onCreated }: AddSeriesDialogProps) => {
  const [generalError, setGeneralError] = useState<string | null>(null);
  const { createSeries, isCreating } = useSeriesMutations();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setError,
  } = useForm<SeriesFormData>({
    resolver: zodResolver(seriesFormSchema),
    defaultValues: {
      title: "",
      description: "",
      cover_image_url: "",
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      reset({
        title: "",
        description: "",
        cover_image_url: "",
      });
      setGeneralError(null);
    }
  }, [open, reset]);

  const onSubmit = async (data: SeriesFormData) => {
    setGeneralError(null);

    // Build command - only include non-empty optional fields
    const command: CreateSeriesCommand = {
      title: data.title.trim(),
    };

    if (data.description.trim()) {
      command.description = data.description.trim();
    }

    if (data.cover_image_url.trim()) {
      command.cover_image_url = data.cover_image_url.trim();
    }

    const result = await createSeries(command);

    if (result.success) {
      onCreated();
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
          <DialogTitle>Add Series</DialogTitle>
        </DialogHeader>

        {generalError && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {generalError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input id="title" type="text" {...register("title")} disabled={isCreating} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={4} {...register("description")} disabled={isCreating} />
            {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
          </div>

          {/* Cover Image URL */}
          <div className="space-y-2">
            <Label htmlFor="cover_image_url">Cover Image URL</Label>
            <Input id="cover_image_url" type="url" {...register("cover_image_url")} disabled={isCreating} />
            {errors.cover_image_url && <p className="text-sm text-destructive">{errors.cover_image_url.message}</p>}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isCreating}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Series"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

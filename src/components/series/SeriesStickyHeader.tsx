import { useState } from "react";
import type { SeriesHeaderViewModel } from "@/types";
import { SeriesActionsMenu } from "@/components/series/SeriesActionsMenu";
import { Button } from "@/components/ui/button";

interface SeriesStickyHeaderProps {
  series: SeriesHeaderViewModel;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * SeriesStickyHeader - Displays series identity + metadata with global actions
 *
 * Features:
 * - Sticky positioning at top of viewport
 * - Series cover image, title, description, metadata
 * - Actions menu with Edit and Delete options
 * - Responsive: collapsible details on small screens (< 640px)
 */
export const SeriesStickyHeader = ({ series, onEdit, onDelete }: SeriesStickyHeaderProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasDetails = series.description || series.bookCount > 0;

  return (
    <div className="sticky top-14 z-20 border-b bg-background">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-start justify-between gap-4">
          {/* Series Identity: Cover + Title/Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3 sm:gap-4">
              {/* Cover Image (if present) */}
              {series.coverImageUrl && (
                <div className="flex-shrink-0 w-12 h-16 sm:w-16 sm:h-24 bg-muted rounded overflow-hidden">
                  <img
                    src={series.coverImageUrl}
                    alt={`${series.title} cover`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to placeholder on error
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              )}

              {/* Title and Details (stacked vertically, next to cover) */}
              <div className="flex-1 min-w-0 space-y-2">
                {/* Title */}
                <h1 className="text-xl sm:text-2xl font-bold truncate">{series.title}</h1>

                {/* Details - Always visible on desktop, collapsible on mobile */}
                {hasDetails && (
                  <div className={`space-y-2 ${isExpanded ? "block" : "hidden sm:block"}`}>
                    {/* Description */}
                    {series.description && (
                      <p className="text-sm text-muted-foreground line-clamp-3 sm:line-clamp-2">{series.description}</p>
                    )}

                    {/* Metadata */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span>{series.bookCount} books</span>
                      <span>Updated {series.updatedAtLabel}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions Menu */}
          <div className="flex-shrink-0 flex items-start gap-2">
            {/* Toggle button for mobile (only show if there are details) */}
            {hasDetails && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="sm:hidden"
                aria-label={isExpanded ? "Hide details" : "Show details"}
              >
                {isExpanded ? "Less" : "More"}
              </Button>
            )}
            <SeriesActionsMenu onEdit={onEdit} onDelete={onDelete} />
          </div>
        </div>
      </div>
    </div>
  );
};

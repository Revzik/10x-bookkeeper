import { useState } from "react";
import type { BookHeaderViewModel } from "@/types";
import { BookActionsMenu } from "@/components/book/BookActionsMenu";
import { BookStatusBadge } from "@/components/shared/BookStatusBadge";
import { Button } from "@/components/ui/button";

interface BookStickyHeaderProps {
  book: BookHeaderViewModel;
  onEdit: () => void;
  onDelete: () => void;
}

/**
 * BookStickyHeader - Displays book identity + metadata with global actions
 *
 * Features:
 * - Sticky positioning at top of viewport
 * - Book cover image, title, author, series link, status, progress, timestamps
 * - Actions menu with Edit and Delete options
 * - Responsive: collapsible details on small screens (< 640px)
 */
export const BookStickyHeader = ({ book, onEdit, onDelete }: BookStickyHeaderProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="sticky top-14 z-20 border-b bg-background">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-start justify-between gap-4">
          {/* Book Identity: Cover + Title/Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-3 sm:gap-4">
              {/* Cover Image (if present) */}
              {book.coverImageUrl && (
                <div className="flex-shrink-0 w-12 h-16 sm:w-16 sm:h-24 bg-muted rounded overflow-hidden">
                  <img
                    src={book.coverImageUrl}
                    alt={`${book.title} cover`}
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
                <h1 className="text-xl sm:text-2xl font-bold truncate">{book.title}</h1>

                {/* Author (always visible) */}
                <p className="text-sm text-muted-foreground truncate">by {book.author}</p>

                {/* Details - Collapsible on mobile, always visible on desktop */}
                <div className={`space-y-2 ${isExpanded ? "block" : "hidden sm:block"}`}>
                  {/* Series Link (if present) */}
                  {book.series && (
                    <div className="text-sm">
                      <a
                        href={`/series/${book.series.id}`}
                        className="text-primary hover:underline"
                        aria-label={`View series: ${book.series.title}`}
                      >
                        Series: {book.series.title}
                      </a>
                    </div>
                  )}

                  {/* Status Badge and Progress */}
                  <div className="flex flex-wrap items-center gap-2">
                    <BookStatusBadge status={book.status} />
                    <span className="text-sm text-muted-foreground">
                      {book.progressLabel} ({book.progressPercent}%)
                    </span>
                  </div>

                  {/* Timestamps */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>Updated {book.updatedAtLabel}</span>
                    <span>Created {book.createdAtLabel}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Actions Menu */}
          <div className="flex-shrink-0 flex items-start gap-2">
            {/* Toggle button for mobile */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="sm:hidden"
              aria-label={isExpanded ? "Hide details" : "Show details"}
            >
              {isExpanded ? "Less" : "More"}
            </Button>
            <BookActionsMenu onEdit={onEdit} onDelete={onDelete} />
          </div>
        </div>
      </div>
    </div>
  );
};

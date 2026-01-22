import type { SeriesListItemViewModel } from "@/types";
import { Card, CardContent } from "@/components/ui/card";

interface SeriesRowProps {
  series: SeriesListItemViewModel;
  onClick: () => void;
}

/**
 * SeriesRow - Single series item in the list
 */
export const SeriesRow = ({ series, onClick }: SeriesRowProps) => {
  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <CardContent className="flex items-center gap-4 p-4">
        {/* Main info */}
        <div className="flex-1">
          <h3 className="font-semibold text-lg text-card-foreground">{series.title}</h3>
          <p className="text-sm text-muted-foreground">
            {series.bookCount} {series.bookCount === 1 ? "book" : "books"}
          </p>
        </div>

        {/* Timestamps */}
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Created</div>
          <div className="text-xs text-foreground">{series.createdAtLabel}</div>
        </div>

        <div className="text-right">
          <div className="text-xs text-muted-foreground">Updated</div>
          <div className="text-xs text-foreground">{series.updatedAtLabel}</div>
        </div>
      </CardContent>
    </Card>
  );
};

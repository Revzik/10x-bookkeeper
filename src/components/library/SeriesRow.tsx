import type { SeriesListItemViewModel } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/i18n/react";

interface SeriesRowProps {
  series: SeriesListItemViewModel;
  onClick: () => void;
}

/**
 * SeriesRow - Single series item in the list
 */
export const SeriesRow = ({ series, onClick }: SeriesRowProps) => {
  const { t } = useT();
  const countKey = series.bookCount === 1 ? "series.bookCountOne" : "series.bookCountMany";
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
          <p className="text-sm text-muted-foreground">{t(countKey, { count: series.bookCount })}</p>
        </div>

        {/* Timestamps */}
        <div className="text-right">
          <div className="text-xs text-muted-foreground">{t("series.created")}</div>
          <div className="text-xs text-foreground">{series.createdAtLabel}</div>
        </div>

        <div className="text-right">
          <div className="text-xs text-muted-foreground">{t("series.updated")}</div>
          <div className="text-xs text-foreground">{series.updatedAtLabel}</div>
        </div>
      </CardContent>
    </Card>
  );
};

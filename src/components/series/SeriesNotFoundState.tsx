import { AppHeader } from "@/components/shared/AppHeader";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/react";
import { withLocalePath } from "@/i18n";

interface SeriesNotFoundStateProps {
  userEmail?: string;
}

/**
 * SeriesNotFoundState - Display when series doesn't exist
 *
 * Shows when:
 * - Series ID doesn't exist (404)
 * - Invalid series ID format (VALIDATION_ERROR)
 * - Series was deleted
 */
export const SeriesNotFoundState = ({ userEmail }: SeriesNotFoundStateProps) => {
  const { t, locale } = useT();
  const handleBackToLibrary = () => {
    window.location.href = `${withLocalePath(locale, "/library")}?tab=series`;
  };

  return (
    <div className="min-h-screen">
      <AppHeader showBackToLibrary userEmail={userEmail} />
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center text-center space-y-6 max-w-md mx-auto">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">{t("series.notFoundTitle")}</h1>
            <p className="text-muted-foreground">{t("series.notFoundSubtitle")}</p>
          </div>

          <Button onClick={handleBackToLibrary} size="lg">
            {t("series.backToLibrary")}
          </Button>
        </div>
      </div>
    </div>
  );
};

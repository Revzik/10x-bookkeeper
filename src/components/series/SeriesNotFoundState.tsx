import { AppHeader } from "@/components/shared/AppHeader";
import { Button } from "@/components/ui/button";

/**
 * SeriesNotFoundState - Display when series doesn't exist
 *
 * Shows when:
 * - Series ID doesn't exist (404)
 * - Invalid series ID format (VALIDATION_ERROR)
 * - Series was deleted
 */
export const SeriesNotFoundState = () => {
  const handleBackToLibrary = () => {
    window.location.href = "/library?tab=series";
  };

  return (
    <div className="min-h-screen">
      <AppHeader showBackToLibrary />
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center text-center space-y-6 max-w-md mx-auto">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Series not found</h1>
            <p className="text-muted-foreground">
              This series may have been deleted or the link might be incorrect. Please check the URL and try again.
            </p>
          </div>

          <Button onClick={handleBackToLibrary} size="lg">
            Back to Library
          </Button>
        </div>
      </div>
    </div>
  );
};

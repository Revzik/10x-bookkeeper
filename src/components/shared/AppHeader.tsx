import { Button } from "@/components/ui/button";
import { ChevronLeft, User } from "lucide-react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

/**
 * AppHeader height constant - Must match h-14 Tailwind class (3.5rem = 56px)
 * Import this constant when calculating sticky positioning offsets
 */
export const APP_HEADER_HEIGHT = 56;

interface AppHeaderProps {
  showBackToLibrary?: boolean;
}

/**
 * AppHeader - Global application header component
 *
 * Features:
 * - Theme toggle (light/dark mode)
 * - Placeholder user dropdown menu (circle icon)
 * - Optional "Back to library" button for detail pages
 * - Sticky positioning at top of viewport
 * - Responsive layout
 */
export const AppHeader = ({ showBackToLibrary = false }: AppHeaderProps) => {
  const handleBackToLibrary = () => {
    window.location.href = "/library";
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left section - Back button or app title */}
        <div className="flex items-center gap-2">
          {showBackToLibrary ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToLibrary}
              className="gap-2"
              aria-label="Back to library"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Library</span>
              <span className="sm:hidden">Library</span>
            </Button>
          ) : (
            <h1 className="text-lg font-semibold">10x Bookkeeper</h1>
          )}
        </div>

        {/* Right section - Theme toggle and user menu */}
        <div className="flex items-center gap-1">
          {/* Theme toggle */}
          <ThemeToggle />

          {/* Placeholder user dropdown - just a circle icon for now */}
          <Button variant="ghost" size="sm" className="rounded-full h-8 w-8 p-0" aria-label="User menu" disabled>
            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
          </Button>
        </div>
      </div>
    </header>
  );
};

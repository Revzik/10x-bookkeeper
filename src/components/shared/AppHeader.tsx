import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronLeft, User, LogOut } from "lucide-react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { apiClient } from "@/lib/api/client";

/**
 * AppHeader height constant - Must match h-14 Tailwind class (3.5rem = 56px)
 * Import this constant when calculating sticky positioning offsets
 */
export const APP_HEADER_HEIGHT = 56;

interface AppHeaderProps {
  showBackToLibrary?: boolean;
  userEmail?: string;
}

/**
 * AppHeader - Global application header component
 *
 * Features:
 * - Theme toggle (light/dark mode)
 * - User dropdown menu with logout
 * - Optional "Back to library" button for detail pages
 * - Sticky positioning at top of viewport
 * - Responsive layout
 */
export const AppHeader = ({ showBackToLibrary = false, userEmail }: AppHeaderProps) => {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleBackToLibrary = () => {
    window.location.href = "/library";
  };

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    try {
      await apiClient.postJson("/auth/logout", {});
      // Redirect to login page after successful logout
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed:", error);
      // Still redirect to login even on error to clear client state
      window.location.href = "/login";
    }
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

          {/* User dropdown menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="rounded-full h-8 w-8 p-0" aria-label="User menu">
                <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {userEmail && (
                <>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">Account</p>
                      <p className="text-xs leading-none text-muted-foreground truncate">{userEmail}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={handleLogout} disabled={loggingOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>{loggingOut ? "Logging out..." : "Log out"}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

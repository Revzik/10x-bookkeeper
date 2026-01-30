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
import { useT } from "@/i18n/react";
import { withLocalePath, type Locale } from "@/i18n";

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
  const { t, locale } = useT();
  const [loggingOut, setLoggingOut] = useState(false);
  const libraryPath = withLocalePath(locale, "/library");
  const loginPath = withLocalePath(locale, "/login");

  const getLocaleSwitchHref = (targetLocale: Locale) => {
    if (typeof window === "undefined") {
      return withLocalePath(targetLocale, "/");
    }

    const { pathname, search, hash } = window.location;
    const basePath = locale === "pl" ? pathname.replace(/^\/pl(\/|$)/, "/") || "/" : pathname || "/";
    const targetPath = withLocalePath(targetLocale, basePath);

    return `${targetPath}${search}${hash}`;
  };

  const handleLocaleSwitch = (targetLocale: Locale) => {
    window.location.href = getLocaleSwitchHref(targetLocale);
  };

  const handleBackToLibrary = () => {
    window.location.href = libraryPath;
  };

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    try {
      await apiClient.postJson("/auth/logout", {});
      // Redirect to login page after successful logout
      window.location.href = loginPath;
    } catch (error) {
      console.error("Logout failed:", error);
      // Still redirect to login even on error to clear client state
      window.location.href = loginPath;
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
              aria-label={t("header.backToLibrary")}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{t("header.backToLibrary")}</span>
              <span className="sm:hidden">{t("header.libraryShort")}</span>
            </Button>
          ) : (
            <h1 className="text-lg font-semibold">{t("app.name")}</h1>
          )}
        </div>

        {/* Right section - Theme toggle and user menu */}
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label="Language menu">
                {locale === "pl" ? "PL" : "EN"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36">
              <DropdownMenuLabel>{t("header.language.label")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleLocaleSwitch("en")} disabled={locale === "en"}>
                EN English
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleLocaleSwitch("pl")} disabled={locale === "pl"}>
                PL Polski
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Theme toggle */}
          <ThemeToggle />

          {/* User dropdown menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="rounded-full h-8 w-8 p-0" aria-label={t("header.userMenu")}>
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
                      <p className="text-sm font-medium leading-none">{t("header.account")}</p>
                      <p className="text-xs leading-none text-muted-foreground truncate">{userEmail}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={handleLogout} disabled={loggingOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>{loggingOut ? t("header.loggingOut") : t("header.logOut")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

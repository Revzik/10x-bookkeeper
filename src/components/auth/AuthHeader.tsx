import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { I18nProvider, useT } from "@/i18n/react";
import { withLocalePath, type Locale } from "@/i18n";

interface AuthHeaderProps {
  showSignInLink?: boolean;
  showSignUpLink?: boolean;
  locale?: string | null;
}

/**
 * AuthHeader - Header for authentication pages
 *
 * Features:
 * - App branding
 * - Theme toggle
 * - Optional navigation between auth pages
 * - Consistent header height and styling
 */
const AuthHeaderContent = ({ showSignInLink, showSignUpLink }: AuthHeaderProps) => {
  const { t, locale } = useT();
  const loginPath = withLocalePath(locale, "/login");
  const signupPath = withLocalePath(locale, "/signup");

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

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left section - App title */}
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">{t("app.name")}</h1>
        </div>

        {/* Right section - Theme toggle and auth navigation */}
        <div className="flex items-center gap-3">
          {showSignInLink && (
            <a href={loginPath} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t("auth.signup.signIn")}
            </a>
          )}
          {showSignUpLink && (
            <a href={signupPath} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {t("auth.login.createAccount")}
            </a>
          )}
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
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};

export const AuthHeader = ({ locale, ...props }: AuthHeaderProps) => {
  return (
    <I18nProvider locale={locale}>
      <AuthHeaderContent {...props} locale={locale} />
    </I18nProvider>
  );
};

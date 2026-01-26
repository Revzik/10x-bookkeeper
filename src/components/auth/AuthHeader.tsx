import { ThemeToggle } from "@/components/shared/ThemeToggle";

interface AuthHeaderProps {
  showSignInLink?: boolean;
  showSignUpLink?: boolean;
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
export const AuthHeader = ({ showSignInLink = false, showSignUpLink = false }: AuthHeaderProps) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left section - App title */}
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">10x Bookkeeper</h1>
        </div>

        {/* Right section - Theme toggle and auth navigation */}
        <div className="flex items-center gap-3">
          {showSignInLink && (
            <a href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sign in
            </a>
          )}
          {showSignUpLink && (
            <a href="/signup" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Create account
            </a>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};

import type { ReactNode } from "react";

interface AuthErrorBannerProps {
  message: string;
  children?: ReactNode;
}

/**
 * AuthErrorBanner - Display error messages in auth forms
 *
 * Features:
 * - Consistent error styling
 * - Matches the pattern used in EditBookDialog
 * - Accessible error presentation
 * - Optional children for additional content (e.g., action links)
 */
export const AuthErrorBanner = ({ message, children }: AuthErrorBannerProps) => {
  return (
    <div
      className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
      role="alert"
      aria-live="polite"
      data-testid="auth-error-banner"
    >
      <div>{message}</div>
      {children}
    </div>
  );
};

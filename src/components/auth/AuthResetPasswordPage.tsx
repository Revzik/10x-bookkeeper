import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthCard } from "./AuthCard";
import { AuthErrorBanner } from "./AuthErrorBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";
import { createResetPasswordSchema, type ResetPasswordFormData } from "@/lib/auth/schemas";
import { useAuthMutations } from "@/hooks/useAuthMutations";
import { I18nProvider, useT } from "@/i18n/react";
import { withLocalePath } from "@/i18n";

interface AuthResetPasswordPageProps {
  hasValidRecoverySession: boolean;
  locale?: string | null;
}

/**
 * AuthResetPasswordPage - Set new password after email verification
 *
 * Features:
 * - Password and confirm password fields
 * - Password strength validation (min 8 chars, upper/lower/number/symbol)
 * - Password match validation
 * - Client-side validation
 * - Error state for expired/invalid recovery links
 * - Loading state during submission
 * - Success redirect to library
 */
const AuthResetPasswordPageContent = ({ hasValidRecoverySession }: AuthResetPasswordPageProps) => {
  const { t, locale } = useT();
  const { resetPassword, logout, isLoggingOut } = useAuthMutations();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const resetPasswordSchema = createResetPasswordSchema(t);
  const loginPath = withLocalePath(locale, "/login");
  const forgotPasswordPath = withLocalePath(locale, "/forgot-password");

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  // Watch password for showing hint
  const password = watch("password");

  /**
   * Handle "Back to sign in" - logs out user and redirects to login
   * This is necessary because the user has a valid recovery session from the password reset flow
   */
  const handleBackToLogin = async (e: React.MouseEvent) => {
    e.preventDefault();

    // Call logout endpoint (always redirects even if it fails)
    await logout();

    // Redirect to login page
    window.location.assign(loginPath);
  };

  // Expired/invalid recovery session state
  if (!hasValidRecoverySession) {
    return (
      <AuthCard>
        {/* Error icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-3">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">{t("auth.reset.expiredTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("auth.reset.expiredSubtitle")}</p>
        </div>

        {/* Action button */}
        <Button asChild className="w-full">
          <a href={forgotPasswordPath}>{t("auth.reset.requestNewLink")}</a>
        </Button>

        {/* Back to login */}
        <div className="text-center">
          <button
            onClick={handleBackToLogin}
            disabled={isLoggingOut}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {isLoggingOut ? t("auth.reset.redirecting") : t("auth.reset.backToSignIn")}
          </button>
        </div>
      </AuthCard>
    );
  }

  const onSubmit = async (data: ResetPasswordFormData) => {
    setGeneralError(null);

    const result = await resetPassword(data);

    if (result.success) {
      // On success, redirect to library
      // Use full page navigation to allow middleware to set up auth state
      window.location.assign(withLocalePath(locale, "/library"));
      return;
    }

    // Handle errors
    if (result.error?.fieldErrors) {
      // Set field-specific errors
      Object.entries(result.error.fieldErrors).forEach(([field, message]) => {
        setError(field as keyof ResetPasswordFormData, { message });
      });
    }

    if (result.error?.generalError) {
      // Map NOT_ALLOWED to more specific message about expired link
      setGeneralError(result.error.generalError);
    }
  };

  // Valid recovery session - show reset form
  return (
    <AuthCard>
      {/* Title */}
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">{t("auth.reset.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("auth.reset.subtitle")}</p>
      </div>

      {/* General error banner */}
      {generalError && <AuthErrorBanner message={t(generalError)} />}

      {/* Reset password form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="reset-password">
            {t("auth.reset.newPasswordLabel")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            placeholder={t("auth.reset.newPasswordPlaceholder")}
            disabled={isSubmitting}
            {...register("password")}
          />
          {errors.password?.message && <p className="text-sm text-destructive">{t(errors.password.message)}</p>}
          {!errors.password && password && (
            <p className="text-xs text-muted-foreground">{t("auth.reset.passwordHint")}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <Label htmlFor="reset-confirm-password">
            {t("auth.reset.confirmPasswordLabel")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="reset-confirm-password"
            type="password"
            autoComplete="new-password"
            placeholder={t("auth.reset.confirmPasswordPlaceholder")}
            disabled={isSubmitting}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword?.message && (
            <p className="text-sm text-destructive">{t(errors.confirmPassword.message)}</p>
          )}
        </div>

        {/* Submit button */}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t("auth.reset.submitting") : t("auth.reset.submit")}
        </Button>
      </form>

      {/* Back to login */}
      <div className="text-center">
        <button
          onClick={handleBackToLogin}
          disabled={isSubmitting || isLoggingOut}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {isLoggingOut ? t("auth.reset.redirecting") : t("auth.reset.backToSignIn")}
        </button>
      </div>
    </AuthCard>
  );
};

export const AuthResetPasswordPage = ({ locale, ...props }: AuthResetPasswordPageProps) => {
  return (
    <I18nProvider locale={locale}>
      <AuthResetPasswordPageContent {...props} locale={locale} />
    </I18nProvider>
  );
};

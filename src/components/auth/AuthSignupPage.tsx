import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthCard } from "./AuthCard";
import { AuthErrorBanner } from "./AuthErrorBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSignupSchema, type SignupFormData } from "@/lib/auth/schemas";
import { useAuthMutations } from "@/hooks/useAuthMutations";
import { I18nProvider, useT } from "@/i18n/react";
import { withLocalePath } from "@/i18n";

/**
 * AuthSignupPage - User registration form
 *
 * Features:
 * - Email/password/confirm password fields
 * - Password strength validation (min 8 chars, upper/lower/number/symbol)
 * - Password match validation
 * - Client-side validation
 * - Error display
 * - Link to sign in
 * - Loading state during submission
 */
const AuthSignupPageContent = () => {
  const { t, locale } = useT();
  const { signup } = useAuthMutations();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [conflictEmail, setConflictEmail] = useState<string | null>(null);
  const signupSchema = createSignupSchema(t);
  const loginPath = withLocalePath(locale, "/login");

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Watch password for showing hint
  const password = watch("password");

  const onSubmit = async (data: SignupFormData) => {
    setGeneralError(null);
    setConflictEmail(null);

    const result = await signup(data);

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
        setError(field as keyof SignupFormData, { message });
      });
    }

    if (result.error?.generalError) {
      setGeneralError(result.error.generalError);
    }

    if (result.error?.conflictEmail) {
      // Email already exists - show link to sign in
      setConflictEmail(data.email);
    }
  };

  return (
    <AuthCard>
      {/* Title */}
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">{t("auth.signup.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("auth.signup.subtitle")}</p>
      </div>

      {/* General error banner */}
      {generalError && (
        <AuthErrorBanner message={t(generalError)}>
          {conflictEmail && (
            <p className="mt-2 text-sm">
              <a
                href={`${loginPath}?email=${encodeURIComponent(conflictEmail)}`}
                className="text-foreground hover:underline font-medium"
              >
                {t("auth.signup.signInInstead")}
              </a>
            </p>
          )}
        </AuthErrorBanner>
      )}

      {/* Signup form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="signup-email">
            {t("auth.signup.emailLabel")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="signup-email"
            type="email"
            autoComplete="email"
            placeholder={t("auth.signup.emailPlaceholder")}
            disabled={isSubmitting}
            {...register("email")}
          />
          {errors.email?.message && <p className="text-sm text-destructive">{t(errors.email.message)}</p>}
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="signup-password">
            {t("auth.signup.passwordLabel")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            placeholder={t("auth.signup.passwordPlaceholder")}
            disabled={isSubmitting}
            {...register("password")}
          />
          {errors.password?.message && <p className="text-sm text-destructive">{t(errors.password.message)}</p>}
          {!errors.password && password && (
            <p className="text-xs text-muted-foreground">{t("auth.signup.passwordHint")}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <Label htmlFor="signup-confirm-password">
            {t("auth.signup.confirmPasswordLabel")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="signup-confirm-password"
            type="password"
            autoComplete="new-password"
            placeholder={t("auth.signup.confirmPasswordPlaceholder")}
            disabled={isSubmitting}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword?.message && (
            <p className="text-sm text-destructive">{t(errors.confirmPassword.message)}</p>
          )}
        </div>

        {/* Submit button */}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t("auth.signup.submitting") : t("auth.signup.submit")}
        </Button>
      </form>

      {/* Sign in link */}
      <div className="text-center text-sm text-muted-foreground">
        {t("auth.signup.haveAccount")}{" "}
        <a href={loginPath} className="text-foreground hover:underline font-medium">
          {t("auth.signup.signIn")}
        </a>
      </div>
    </AuthCard>
  );
};

export const AuthSignupPage = ({ locale }: { locale?: string | null }) => {
  return (
    <I18nProvider locale={locale}>
      <AuthSignupPageContent />
    </I18nProvider>
  );
};

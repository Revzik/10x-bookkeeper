import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthCard } from "./AuthCard";
import { AuthErrorBanner } from "./AuthErrorBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createLoginSchema, type LoginFormData } from "@/lib/auth/schemas";
import { useAuthMutations } from "@/hooks/useAuthMutations";
import { I18nProvider, useT } from "@/i18n/react";
import { withLocalePath } from "@/i18n";

interface AuthLoginPageProps {
  redirectTo?: string;
  emailPrefill?: string;
  locale?: string | null;
}

/**
 * AuthLoginPage - User login form
 *
 * Features:
 * - Email/password authentication
 * - Client-side validation
 * - Error display
 * - Links to forgot password and signup
 * - Loading state during submission
 */
const AuthLoginPageContent = ({ redirectTo, emailPrefill }: AuthLoginPageProps) => {
  const { t, locale } = useT();
  const { login } = useAuthMutations();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const loginSchema = createLoginSchema(t);
  const fallbackRedirect = withLocalePath(locale, "/library");
  const forgotPasswordPath = withLocalePath(locale, "/forgot-password");
  const signupPath = withLocalePath(locale, "/signup");

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: emailPrefill || "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setGeneralError(null);

    const result = await login(data);

    if (result.success) {
      // On success, redirect to the intended destination
      // Use full page navigation to allow middleware to set up auth state
      window.location.assign(redirectTo ?? fallbackRedirect);
      return;
    }

    // Handle errors
    if (result.error?.fieldErrors) {
      // Set field-specific errors
      Object.entries(result.error.fieldErrors).forEach(([field, message]) => {
        setError(field as keyof LoginFormData, { message });
      });
    }

    if (result.error?.generalError) {
      // Map NOT_ALLOWED to more user-friendly message
      setGeneralError(result.error.generalError);
    }
  };

  return (
    <AuthCard>
      {/* Title */}
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">{t("auth.login.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("auth.login.subtitle")}</p>
      </div>

      {/* General error banner */}
      {generalError && <AuthErrorBanner message={t(generalError)} />}

      {/* Login form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="login-email">
            {t("auth.login.emailLabel")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder={t("auth.login.emailPlaceholder")}
            data-testid="login-email"
            disabled={isSubmitting}
            {...register("email")}
          />
          {errors.email?.message && <p className="text-sm text-destructive">{t(errors.email.message)}</p>}
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="login-password">
            {t("auth.login.passwordLabel")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            placeholder={t("auth.login.passwordPlaceholder")}
            data-testid="login-password"
            disabled={isSubmitting}
            {...register("password")}
          />
          {errors.password?.message && <p className="text-sm text-destructive">{t(errors.password.message)}</p>}
        </div>

        {/* Forgot password link */}
        <div className="text-right">
          <a
            href={forgotPasswordPath}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            data-testid="link-forgot-password"
          >
            {t("auth.login.forgotPassword")}
          </a>
        </div>

        {/* Submit button */}
        <Button type="submit" className="w-full" disabled={isSubmitting} data-testid="login-submit">
          {isSubmitting ? t("auth.login.submitting") : t("auth.login.submit")}
        </Button>
      </form>

      {/* Sign up link */}
      <div className="text-center text-sm text-muted-foreground">
        {t("auth.login.noAccount")}{" "}
        <a href={signupPath} className="text-foreground hover:underline font-medium" data-testid="link-signup">
          {t("auth.login.createAccount")}
        </a>
      </div>
    </AuthCard>
  );
};

export const AuthLoginPage = ({ locale, ...props }: AuthLoginPageProps) => {
  return (
    <I18nProvider locale={locale}>
      <AuthLoginPageContent {...props} locale={locale} />
    </I18nProvider>
  );
};

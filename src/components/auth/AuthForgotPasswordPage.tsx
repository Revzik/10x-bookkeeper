import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthCard } from "./AuthCard";
import { AuthErrorBanner } from "./AuthErrorBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";
import { createForgotPasswordSchema, type ForgotPasswordFormData } from "@/lib/auth/schemas";
import { useAuthMutations } from "@/hooks/useAuthMutations";
import { I18nProvider, useT } from "@/i18n/react";
import { withLocalePath } from "@/i18n";

/**
 * AuthForgotPasswordPage - Request password reset email
 *
 * Features:
 * - Email input only
 * - Client-side email validation
 * - Success state (always shown to avoid account enumeration)
 * - Error display for validation or rate limiting
 * - Link back to login
 * - Loading state during submission
 */
const AuthForgotPasswordPageContent = () => {
  const { t, locale } = useT();
  const { requestPasswordReset } = useAuthMutations();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const forgotPasswordSchema = createForgotPasswordSchema(t);
  const loginPath = withLocalePath(locale, "/login");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setError(null);

    const result = await requestPasswordReset(data);

    // Always show success state (prevents account enumeration)
    // The hook handles returning success for most errors
    if (result.success) {
      setSubmitted(true);
      return;
    }

    // Only rate limiting or validation errors are shown
    if (result.error?.generalError) {
      setError(result.error.generalError);
    }
  };

  // Success state
  if (submitted) {
    return (
      <AuthCard>
        {/* Success icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-green-100 dark:bg-green-900/20 p-3">
            <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
        </div>

        {/* Title */}
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-semibold tracking-tight">{t("auth.forgot.successTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("auth.forgot.successSubtitle")}</p>
        </div>

        {/* Instructions */}
        <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-2">
          <p className="font-medium">{t("auth.forgot.nextStepsTitle")}</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>{t("auth.forgot.nextStep1")}</li>
            <li>{t("auth.forgot.nextStep2")}</li>
            <li>{t("auth.forgot.nextStep3")}</li>
          </ol>
        </div>

        {/* Back to login */}
        <div className="text-center">
          <a href={loginPath} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            {t("auth.forgot.backToSignIn")}
          </a>
        </div>
      </AuthCard>
    );
  }

  // Request form
  return (
    <AuthCard>
      {/* Title */}
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">{t("auth.forgot.title")}</h2>
        <p className="text-sm text-muted-foreground">{t("auth.forgot.subtitle")}</p>
      </div>

      {/* Error banner */}
      {error && <AuthErrorBanner message={t(error)} />}

      {/* Request form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="forgot-email">
            {t("auth.forgot.emailLabel")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="forgot-email"
            type="email"
            autoComplete="email"
            placeholder={t("auth.forgot.emailPlaceholder")}
            disabled={isSubmitting}
            {...register("email")}
          />
          {errors.email?.message && <p className="text-sm text-destructive">{t(errors.email.message)}</p>}
        </div>

        {/* Submit button */}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t("auth.forgot.submitting") : t("auth.forgot.submit")}
        </Button>
      </form>

      {/* Back to login */}
      <div className="text-center">
        <a href={loginPath} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          {t("auth.forgot.backToSignIn")}
        </a>
      </div>
    </AuthCard>
  );
};

export const AuthForgotPasswordPage = ({ locale }: { locale?: string | null }) => {
  return (
    <I18nProvider locale={locale}>
      <AuthForgotPasswordPageContent />
    </I18nProvider>
  );
};

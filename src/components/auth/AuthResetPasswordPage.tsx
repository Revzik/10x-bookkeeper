import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthCard } from "./AuthCard";
import { AuthErrorBanner } from "./AuthErrorBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";
import { resetPasswordSchema, type ResetPasswordFormData } from "@/lib/auth/schemas";
import { useAuthMutations } from "@/hooks/useAuthMutations";

interface AuthResetPasswordPageProps {
  hasValidRecoverySession: boolean;
}

/**
 * AuthResetPasswordPage - Set new password after email verification
 *
 * Features:
 * - Password and confirm password fields
 * - Password strength validation (min 8 chars, at least one number)
 * - Password match validation
 * - Client-side validation
 * - Error state for expired/invalid recovery links
 * - Loading state during submission
 * - Success redirect to library
 */
export const AuthResetPasswordPage = ({ hasValidRecoverySession }: AuthResetPasswordPageProps) => {
  const { resetPassword, logout, isLoggingOut } = useAuthMutations();
  const [generalError, setGeneralError] = useState<string | null>(null);

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
    window.location.assign("/login");
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
          <h2 className="text-2xl font-semibold tracking-tight">Reset link expired</h2>
          <p className="text-sm text-muted-foreground">
            Your reset link is invalid or has expired. Please request a new one.
          </p>
        </div>

        {/* Action button */}
        <Button asChild className="w-full">
          <a href="/forgot-password">Request new reset link</a>
        </Button>

        {/* Back to login */}
        <div className="text-center">
          <button
            onClick={handleBackToLogin}
            disabled={isLoggingOut}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {isLoggingOut ? "Redirecting..." : "Back to sign in"}
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
      window.location.assign("/library");
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
      if (result.error.generalError.includes("Authentication failed")) {
        setGeneralError("Your reset link has expired. Please request a new one.");
      } else {
        setGeneralError(result.error.generalError);
      }
    }
  };

  // Valid recovery session - show reset form
  return (
    <AuthCard>
      {/* Title */}
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Set new password</h2>
        <p className="text-sm text-muted-foreground">Enter a new password for your account</p>
      </div>

      {/* General error banner */}
      {generalError && <AuthErrorBanner message={generalError} />}

      {/* Reset password form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="reset-password">
            New Password <span className="text-destructive">*</span>
          </Label>
          <Input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters with a number"
            disabled={isSubmitting}
            {...register("password")}
          />
          {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          {!errors.password && password && (
            <p className="text-xs text-muted-foreground">
              Password must be at least 8 characters and include at least one number
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <Label htmlFor="reset-confirm-password">
            Confirm New Password <span className="text-destructive">*</span>
          </Label>
          <Input
            id="reset-confirm-password"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter your new password"
            disabled={isSubmitting}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
        </div>

        {/* Submit button */}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Resetting password..." : "Reset password"}
        </Button>
      </form>

      {/* Back to login */}
      <div className="text-center">
        <button
          onClick={handleBackToLogin}
          disabled={isSubmitting || isLoggingOut}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {isLoggingOut ? "Redirecting..." : "Back to sign in"}
        </button>
      </div>
    </AuthCard>
  );
};

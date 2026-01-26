import { useState } from "react";
import { AuthCard } from "./AuthCard";
import { AuthErrorBanner } from "./AuthErrorBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle } from "lucide-react";
import { resetPasswordSchema } from "@/lib/auth/schemas";
import { apiClient } from "@/lib/api/client";
import type { ApiErrorResponseDto } from "@/types";

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
  const [formState, setFormState] = useState({
    password: "",
    confirmPassword: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  /**
   * Handle "Back to sign in" - logs out user and redirects to login
   * This is necessary because the user has a valid recovery session from the password reset flow
   */
  const handleBackToLogin = async (e: React.MouseEvent) => {
    e.preventDefault();
    setLoggingOut(true);

    try {
      // Call logout endpoint to invalidate session
      await apiClient.postJson("/auth/logout", {});
    } catch {
      // Even if logout fails, still redirect to login
      // Silent failure is acceptable here since we're navigating away
    }

    // Redirect to login page
    window.location.href = "/login";
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
            disabled={loggingOut}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            {loggingOut ? "Redirecting..." : "Back to sign in"}
          </button>
        </div>
      </AuthCard>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError(null);

    // Client-side validation using Zod schema
    const result = resetPasswordSchema.safeParse({
      password: formState.password,
      confirmPassword: formState.confirmPassword,
    });

    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach((error) => {
        const field = error.path[0] as string;
        newErrors[field] = error.message;
      });
      setErrors(newErrors);
      return;
    }

    setSubmitting(true);

    try {
      // Call the password update API endpoint
      const { password, confirmPassword } = result.data;
      await apiClient.postJson<typeof result.data, { ok: boolean }>("/auth/password-update", {
        password,
        confirmPassword,
      });

      // On success, redirect to library
      // Use full page navigation to allow middleware to set up auth state
      window.location.href = "/library";
    } catch (error) {
      // Handle API errors
      const apiError = error as ApiErrorResponseDto;

      if (apiError.error) {
        // Map error codes to user-friendly messages
        switch (apiError.error.code) {
          case "NOT_ALLOWED":
            // Session expired, show the expired state instead of just an error
            setGeneralError("Your reset link has expired. Please request a new one.");
            break;
          case "VALIDATION_ERROR":
            // Show field-specific validation errors if available
            if (apiError.error.details && apiError.error.details.length > 0) {
              const newErrors: Record<string, string> = {};
              apiError.error.details.forEach((detail) => {
                const field = detail.path[0] as string;
                newErrors[field] = detail.message;
              });
              setErrors(newErrors);
            } else {
              setGeneralError(apiError.error.message);
            }
            break;
          default:
            setGeneralError("An error occurred. Please try again.");
        }
      } else {
        setGeneralError("An error occurred. Please try again.");
      }
    } finally {
      setSubmitting(false);
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
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="reset-password">
            New Password <span className="text-destructive">*</span>
          </Label>
          <Input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            value={formState.password}
            onChange={(e) => setFormState({ ...formState, password: e.target.value })}
            disabled={submitting}
            placeholder="At least 8 characters with a number"
          />
          {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
          {!errors.password && formState.password && (
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
            value={formState.confirmPassword}
            onChange={(e) => setFormState({ ...formState, confirmPassword: e.target.value })}
            disabled={submitting}
            placeholder="Re-enter your new password"
          />
          {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
        </div>

        {/* Submit button */}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Resetting password..." : "Reset password"}
        </Button>
      </form>

      {/* Back to login */}
      <div className="text-center">
        <button
          onClick={handleBackToLogin}
          disabled={submitting || loggingOut}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {loggingOut ? "Redirecting..." : "Back to sign in"}
        </button>
      </div>
    </AuthCard>
  );
};

import { useState } from "react";
import { AuthCard } from "./AuthCard";
import { AuthErrorBanner } from "./AuthErrorBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema } from "@/lib/auth/schemas";
import { apiClient } from "@/lib/api/client";
import type { LoginResponseDto, ApiErrorResponseDto } from "@/types";

interface AuthLoginPageProps {
  redirectTo?: string;
  emailPrefill?: string;
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
export const AuthLoginPage = ({ redirectTo, emailPrefill }: AuthLoginPageProps) => {
  const [formState, setFormState] = useState({
    email: emailPrefill || "",
    password: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError(null);

    // Client-side validation using Zod schema
    const result = loginSchema.safeParse({
      email: formState.email,
      password: formState.password,
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
      // Call the login API endpoint
      const { email, password } = result.data;
      await apiClient.postJson<typeof result.data, LoginResponseDto>("/auth/login", { email, password });

      // On success, redirect to the intended destination
      // Use full page navigation to allow middleware to set up auth state
      window.location.href = redirectTo ?? "/library";
    } catch (error) {
      // Handle API errors
      const apiError = error as ApiErrorResponseDto;

      if (apiError.error) {
        // Map error codes to user-friendly messages
        switch (apiError.error.code) {
          case "NOT_ALLOWED":
            setGeneralError("Incorrect email or password.");
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

  return (
    <AuthCard>
      {/* Title */}
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">Sign in to your account</h2>
        <p className="text-sm text-muted-foreground">Enter your email and password to access your library</p>
      </div>

      {/* General error banner */}
      {generalError && <AuthErrorBanner message={generalError} />}

      {/* Login form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="login-email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            value={formState.email}
            onChange={(e) => setFormState({ ...formState, email: e.target.value })}
            disabled={submitting}
            placeholder="you@example.com"
            data-testid="login-email"
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="login-password">
            Password <span className="text-destructive">*</span>
          </Label>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={formState.password}
            onChange={(e) => setFormState({ ...formState, password: e.target.value })}
            disabled={submitting}
            placeholder="Enter your password"
            data-testid="login-password"
          />
          {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
        </div>

        {/* Forgot password link */}
        <div className="text-right">
          <a
            href="/forgot-password"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            data-testid="link-forgot-password"
          >
            Forgot password?
          </a>
        </div>

        {/* Submit button */}
        <Button type="submit" className="w-full" disabled={submitting} data-testid="login-submit">
          {submitting ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      {/* Sign up link */}
      <div className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <a href="/signup" className="text-foreground hover:underline font-medium" data-testid="link-signup">
          Create account
        </a>
      </div>
    </AuthCard>
  );
};

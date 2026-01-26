import { useState } from "react";
import { AuthCard } from "./AuthCard";
import { AuthErrorBanner } from "./AuthErrorBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signupSchema } from "@/lib/auth/schemas";
import { apiClient } from "@/lib/api/client";
import type { SignupResponseDto, ApiErrorResponseDto } from "@/types";

/**
 * AuthSignupPage - User registration form
 *
 * Features:
 * - Email/password/confirm password fields
 * - Password strength validation (min 8 chars, at least one number)
 * - Password match validation
 * - Client-side validation
 * - Error display
 * - Link to sign in
 * - Loading state during submission
 */
export const AuthSignupPage = () => {
  const [formState, setFormState] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [conflictEmail, setConflictEmail] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setGeneralError(null);
    setConflictEmail(null);

    // Client-side validation using Zod schema
    const result = signupSchema.safeParse({
      email: formState.email,
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
      // Call the signup API endpoint
      const { email, password, confirmPassword } = result.data;
      await apiClient.postJson<typeof result.data, SignupResponseDto>("/auth/signup", {
        email,
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
          case "CONFLICT":
            // Email already exists - show link to sign in
            setConflictEmail(formState.email);
            setGeneralError("An account with this email already exists.");
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
        <h2 className="text-2xl font-semibold tracking-tight">Create your account</h2>
        <p className="text-sm text-muted-foreground">Enter your details to get started with 10x Bookkeeper</p>
      </div>

      {/* General error banner */}
      {generalError && (
        <AuthErrorBanner message={generalError}>
          {conflictEmail && (
            <p className="mt-2 text-sm">
              <a
                href={`/login?email=${encodeURIComponent(conflictEmail)}`}
                className="text-foreground hover:underline font-medium"
              >
                Sign in instead
              </a>
            </p>
          )}
        </AuthErrorBanner>
      )}

      {/* Signup form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="signup-email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="signup-email"
            type="email"
            autoComplete="email"
            value={formState.email}
            onChange={(e) => setFormState({ ...formState, email: e.target.value })}
            disabled={submitting}
            placeholder="you@example.com"
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="signup-password">
            Password <span className="text-destructive">*</span>
          </Label>
          <Input
            id="signup-password"
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
          <Label htmlFor="signup-confirm-password">
            Confirm Password <span className="text-destructive">*</span>
          </Label>
          <Input
            id="signup-confirm-password"
            type="password"
            autoComplete="new-password"
            value={formState.confirmPassword}
            onChange={(e) => setFormState({ ...formState, confirmPassword: e.target.value })}
            disabled={submitting}
            placeholder="Re-enter your password"
          />
          {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
        </div>

        {/* Submit button */}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Creating account..." : "Create account"}
        </Button>
      </form>

      {/* Sign in link */}
      <div className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <a href="/login" className="text-foreground hover:underline font-medium">
          Sign in
        </a>
      </div>
    </AuthCard>
  );
};

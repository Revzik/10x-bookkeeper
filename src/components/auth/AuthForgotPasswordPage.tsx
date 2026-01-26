import { useState } from "react";
import { AuthCard } from "./AuthCard";
import { AuthErrorBanner } from "./AuthErrorBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";
import { forgotPasswordSchema } from "@/lib/auth/schemas";
import { apiClient } from "@/lib/api/client";
import type { ApiErrorResponseDto } from "@/types";

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
export const AuthForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation using Zod schema
    const result = forgotPasswordSchema.safeParse({ email });

    if (!result.success) {
      setError(result.error.errors[0].message);
      return;
    }

    setSubmitting(true);

    try {
      // Call the password reset API endpoint
      const { email: validatedEmail } = result.data;
      await apiClient.postJson<typeof result.data, { ok: boolean }>("/auth/password-reset", {
        email: validatedEmail,
      });

      // Always show success state (prevents account enumeration)
      setSubmitted(true);
    } catch (error) {
      // Handle API errors
      const apiError = error as ApiErrorResponseDto;

      if (apiError.error) {
        // Only show error for rate limiting or validation
        switch (apiError.error.code) {
          case "RATE_LIMITED":
            setError("Too many requests. Please try again later.");
            break;
          case "VALIDATION_ERROR":
            setError(apiError.error.message);
            break;
          default:
            // For all other errors, still show success to prevent enumeration
            setSubmitted(true);
        }
      } else {
        // Unknown error format, show success to prevent enumeration
        setSubmitted(true);
      }
    } finally {
      setSubmitting(false);
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
          <h2 className="text-2xl font-semibold tracking-tight">Check your email</h2>
          <p className="text-sm text-muted-foreground">
            If an account exists for that email, we&apos;ve sent a password reset link.
          </p>
        </div>

        {/* Instructions */}
        <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-2">
          <p className="font-medium">Next steps:</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Check your inbox for an email from 10x Bookkeeper</li>
            <li>Click the password reset link in the email</li>
            <li>Enter your new password</li>
          </ol>
        </div>

        {/* Back to login */}
        <div className="text-center">
          <a href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Back to sign in
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
        <h2 className="text-2xl font-semibold tracking-tight">Reset your password</h2>
        <p className="text-sm text-muted-foreground">
          Enter your email address and we&apos;ll send you a link to reset your password
        </p>
      </div>

      {/* Error banner */}
      {error && <AuthErrorBanner message={error} />}

      {/* Request form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="forgot-email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="forgot-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            placeholder="you@example.com"
          />
        </div>

        {/* Submit button */}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Sending..." : "Send reset link"}
        </Button>
      </form>

      {/* Back to login */}
      <div className="text-center">
        <a href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Back to sign in
        </a>
      </div>
    </AuthCard>
  );
};

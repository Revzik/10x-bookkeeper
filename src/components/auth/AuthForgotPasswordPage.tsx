import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthCard } from "./AuthCard";
import { AuthErrorBanner } from "./AuthErrorBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";
import { forgotPasswordSchema, type ForgotPasswordFormData } from "@/lib/auth/schemas";
import { useAuthMutations } from "@/hooks/useAuthMutations";

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
  const { requestPasswordReset } = useAuthMutations();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="forgot-email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="forgot-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            disabled={isSubmitting}
            {...register("email")}
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>

        {/* Submit button */}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Send reset link"}
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

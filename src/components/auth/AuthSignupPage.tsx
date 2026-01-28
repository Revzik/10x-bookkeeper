import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthCard } from "./AuthCard";
import { AuthErrorBanner } from "./AuthErrorBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signupSchema, type SignupFormData } from "@/lib/auth/schemas";
import { useAuthMutations } from "@/hooks/useAuthMutations";

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
  const { signup } = useAuthMutations();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [conflictEmail, setConflictEmail] = useState<string | null>(null);

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
      window.location.assign("/library");
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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="signup-email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="signup-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            disabled={isSubmitting}
            {...register("email")}
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
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
          <Label htmlFor="signup-confirm-password">
            Confirm Password <span className="text-destructive">*</span>
          </Label>
          <Input
            id="signup-confirm-password"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter your password"
            disabled={isSubmitting}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
        </div>

        {/* Submit button */}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creating account..." : "Create account"}
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

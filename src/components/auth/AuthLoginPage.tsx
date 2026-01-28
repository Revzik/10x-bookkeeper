import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthCard } from "./AuthCard";
import { AuthErrorBanner } from "./AuthErrorBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginFormData } from "@/lib/auth/schemas";
import { useAuthMutations } from "@/hooks/useAuthMutations";

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
  const { login } = useAuthMutations();
  const [generalError, setGeneralError] = useState<string | null>(null);

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
      window.location.assign(redirectTo ?? "/library");
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
      if (result.error.generalError.includes("Authentication failed")) {
        setGeneralError("Incorrect email or password.");
      } else {
        setGeneralError(result.error.generalError);
      }
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
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="login-email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            data-testid="login-email"
            disabled={isSubmitting}
            {...register("email")}
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
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
            placeholder="Enter your password"
            data-testid="login-password"
            disabled={isSubmitting}
            {...register("password")}
          />
          {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
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
        <Button type="submit" className="w-full" disabled={isSubmitting} data-testid="login-submit">
          {isSubmitting ? "Signing in..." : "Sign in"}
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

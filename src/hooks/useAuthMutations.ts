import { useState } from "react";
import { apiClient } from "@/lib/api/client";
import type { LoginFormData, SignupFormData, ForgotPasswordFormData, ResetPasswordFormData } from "@/lib/auth/schemas";
import type { LoginResponseDto, SignupResponseDto, ApiErrorResponseDto } from "@/types";

interface MutationError {
  fieldErrors?: Record<string, string>;
  generalError?: string;
  conflictEmail?: string; // For signup conflict handling
}

interface MutationResult<T> {
  success: boolean;
  data?: T;
  error?: MutationError;
}

/**
 * Custom hook for managing authentication mutations with built-in loading states
 * and error handling.
 *
 * Features:
 * - Centralized API call logic for all auth operations
 * - Loading state management per operation
 * - Standardized error mapping (field-level and general errors)
 * - Type-safe API responses
 * - Special handling for signup conflicts and rate limiting
 */
export const useAuthMutations = () => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [isRequestingReset, setIsRequestingReset] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  /**
   * Maps API errors to form-friendly error structure
   */
  const mapApiError = (error: unknown, context?: "signup" | "forgot-password"): MutationError => {
    const apiError = error as ApiErrorResponseDto;

    if (!apiError.error) {
      return { generalError: "apiErrors.unexpected" };
    }

    // Handle validation errors (map to field-level errors)
    if (apiError.error.code === "VALIDATION_ERROR") {
      if (apiError.error.details && apiError.error.details.length > 0) {
        const fieldErrors: Record<string, string> = {};
        apiError.error.details.forEach((issue) => {
          const fieldName = issue.path.join(".");
          fieldErrors[fieldName] = issue.message;
        });
        return { fieldErrors };
      }
      return { generalError: apiError.error.message || "apiErrors.generic" };
    }

    // Handle signup conflicts (email already exists)
    if (apiError.error.code === "CONFLICT" && context === "signup") {
      return {
        generalError: "apiErrors.conflictEmail",
        conflictEmail: "conflict", // Signal to component to show sign-in link
      };
    }

    // Handle rate limiting
    if (apiError.error.code === "RATE_LIMITED") {
      return { generalError: "apiErrors.rateLimited" };
    }

    // Handle authentication failures
    if (apiError.error.code === "NOT_ALLOWED") {
      return { generalError: apiError.error.message || "apiErrors.authFailed" };
    }

    // Handle not found errors
    if (apiError.error.code === "NOT_FOUND") {
      return { generalError: apiError.error.message || "apiErrors.notFound" };
    }

    // Default error handling
    return { generalError: apiError.error.message || "apiErrors.generic" };
  };

  /**
   * Logs in a user with email and password
   */
  const login = async (data: LoginFormData): Promise<MutationResult<LoginResponseDto>> => {
    setIsLoggingIn(true);
    try {
      const response = await apiClient.postJson<typeof data, LoginResponseDto>("/auth/login", data);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: mapApiError(error) };
    } finally {
      setIsLoggingIn(false);
    }
  };

  /**
   * Signs up a new user
   */
  const signup = async (data: SignupFormData): Promise<MutationResult<SignupResponseDto>> => {
    setIsSigningUp(true);
    try {
      const response = await apiClient.postJson<typeof data, SignupResponseDto>("/auth/signup", data);
      return { success: true, data: response };
    } catch (error) {
      return { success: false, error: mapApiError(error, "signup") };
    } finally {
      setIsSigningUp(false);
    }
  };

  /**
   * Requests a password reset email
   * Note: Always returns success (except for rate limiting) to prevent account enumeration
   */
  const requestPasswordReset = async (data: ForgotPasswordFormData): Promise<MutationResult<void>> => {
    setIsRequestingReset(true);
    try {
      await apiClient.postJson<typeof data, { ok: boolean }>("/auth/password-reset", data);
      return { success: true };
    } catch (error) {
      const apiError = error as ApiErrorResponseDto;

      // Only show errors for rate limiting or validation
      // All other errors should appear as success to prevent account enumeration
      if (apiError.error?.code === "RATE_LIMITED" || apiError.error?.code === "VALIDATION_ERROR") {
        return { success: false, error: mapApiError(error, "forgot-password") };
      }

      // Return success for all other errors (security measure)
      return { success: true };
    } finally {
      setIsRequestingReset(false);
    }
  };

  /**
   * Resets password with new password (requires valid recovery session)
   */
  const resetPassword = async (data: ResetPasswordFormData): Promise<MutationResult<void>> => {
    setIsResettingPassword(true);
    try {
      await apiClient.postJson<typeof data, { ok: boolean }>("/auth/password-update", data);
      return { success: true };
    } catch (error) {
      return { success: false, error: mapApiError(error) };
    } finally {
      setIsResettingPassword(false);
    }
  };

  /**
   * Logs out the current user
   * Used in reset password flow when user clicks "Back to sign in"
   *
   * Security note: This returns success even on failure because:
   * 1. Logout failure typically means session is already invalid
   * 2. The calling component performs full page navigation to /login
   * 3. Middleware will validate auth state on subsequent protected route access
   * 4. Any remaining client-side state is cleared by the full page navigation
   *
   * If logout fails due to network error, the server session may remain active,
   * but the user will be redirected to login and middleware will enforce auth checks.
   */
  const logout = async (): Promise<MutationResult<void>> => {
    setIsLoggingOut(true);
    try {
      await apiClient.postJson("/auth/logout", {});
      return { success: true };
    } catch {
      // Return success to allow navigation to proceed
      // Failure usually indicates session already invalid
      // Full page navigation will clear client state regardless
      return { success: true };
    } finally {
      setIsLoggingOut(false);
    }
  };

  return {
    login,
    signup,
    requestPasswordReset,
    resetPassword,
    logout,
    isLoggingIn,
    isSigningUp,
    isRequestingReset,
    isResettingPassword,
    isLoggingOut,
  };
};

import type { APIContext } from "astro";
import { ZodError } from "zod";

import { createSupabaseServerInstance } from "../../../../db/supabase.client";
import { apiError, json } from "../../../../lib/api/responses";
import { resetPasswordSchema } from "../../../../lib/auth/schemas";

export const prerender = false;

/**
 * POST /api/v1/auth/password-update
 * Updates the user's password (requires valid session from password reset flow)
 *
 * Auth: Requires a valid session (recovery or normal)
 *
 * Flow:
 * 1. User clicks password reset link in email
 * 2. Supabase redirects to /auth/callback with code
 * 3. Callback exchanges code for recovery session
 * 4. User is redirected to /reset-password
 * 5. User submits new password to this endpoint
 * 6. Password is updated and session is refreshed
 */
export async function POST(context: APIContext): Promise<Response> {
  // Parse and validate request body
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return apiError(400, "VALIDATION_ERROR", "Invalid JSON in request body");
  }

  let validatedBody;
  try {
    validatedBody = resetPasswordSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request body", error.errors);
    }
    return apiError(400, "VALIDATION_ERROR", "Invalid request body");
  }

  // Create Supabase server instance
  const supabase = createSupabaseServerInstance({
    cookies: context.cookies,
    headers: context.request.headers,
  });

  // Verify user has a valid session
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return apiError(401, "NOT_ALLOWED", "Recovery session expired. Please request a new reset link.");
  }

  try {
    // Update the password
    const { error } = await supabase.auth.updateUser({
      password: validatedBody.password,
    });

    if (error) {
      // Log minimal error info for debugging (without full stack trace)
      // eslint-disable-next-line no-console
      console.error("Password update failed:", error.message || "Unknown error");

      // Map Supabase errors to API error codes
      if (error.message.includes("session") || error.message.includes("expired")) {
        return apiError(401, "NOT_ALLOWED", "Recovery session expired. Please request a new reset link.");
      }

      // Check for "same password" error
      if (
        error.message.includes("should be different from the old password") ||
        error.message.includes("same password")
      ) {
        return apiError(400, "VALIDATION_ERROR", "New password must be different from your current password.");
      }

      // Check for other password validation errors
      if (error.message.includes("password")) {
        return apiError(400, "VALIDATION_ERROR", "Password does not meet requirements.");
      }

      return apiError(500, "INTERNAL_ERROR", "An error occurred while updating your password. Please try again.");
    }

    // Password updated successfully
    // Session is automatically refreshed by Supabase
    return json(200, { ok: true });
  } catch (error) {
    // Log minimal error info (without full stack trace)
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    // eslint-disable-next-line no-console
    console.error("Unexpected password update error:", errorMessage);
    return apiError(500, "INTERNAL_ERROR", "An unexpected error occurred. Please try again.");
  }
}

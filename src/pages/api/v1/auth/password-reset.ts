import type { APIContext } from "astro";
import { ZodError } from "zod";

import { createSupabaseServerInstance } from "../../../../db/supabase.client";
import { apiError, json } from "../../../../lib/api/responses";
import { createForgotPasswordSchema } from "../../../../lib/auth/schemas";
import { getRequestEnv } from "../../../../lib/env";

export const prerender = false;

/**
 * POST /api/v1/auth/password-reset
 * Sends a password reset email to the user
 *
 * Security notes:
 * - Always returns 202 (success) to prevent account enumeration
 * - Only shows errors for client-side validation or rate limiting
 * - Email is only sent if account exists (handled silently)
 */
export async function POST(context: APIContext): Promise<Response> {
  // Parse and validate request body
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return apiError(400, "VALIDATION_ERROR", "apiErrors.invalidJson");
  }

  const forgotPasswordSchema = createForgotPasswordSchema((key) => key);
  let validatedBody;
  try {
    validatedBody = forgotPasswordSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "VALIDATION_ERROR", "apiErrors.invalidRequest", error.errors);
    }
    return apiError(400, "VALIDATION_ERROR", "apiErrors.invalidRequest");
  }

  // Create Supabase server instance
  const supabase = createSupabaseServerInstance({
    cookies: context.cookies,
    headers: context.request.headers,
    env: getRequestEnv(context.locals),
  });

  try {
    // Use request origin for redirect URL (remove trailing slash if present)
    const siteUrl = context.url.origin.replace(/\/$/, "");

    // Request password reset email
    // Supabase will send email with a link like:
    // {siteUrl}/auth/callback?code={code}&next=/reset-password
    const { error } = await supabase.auth.resetPasswordForEmail(validatedBody.email, {
      redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
    });

    if (error) {
      // Log minimal error info for debugging (prevents enumeration)
      // eslint-disable-next-line no-console
      console.error("Password reset failed:", {
        message: error.message,
        status: error.status,
        code: error.code,
      });

      // Check for rate limiting
      if (error.message?.includes("rate limit") || error.status === 429) {
        return apiError(429, "RATE_LIMITED", "apiErrors.resetLinkActive");
      }
    }

    // Always return success to prevent account enumeration
    // Email is only sent if account exists (handled by Supabase)
    return json(202, { ok: true });
  } catch (error) {
    // Log minimal error info (without full stack trace)
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    // eslint-disable-next-line no-console
    console.error("Unexpected password reset error:", errorMessage);
    // Still return success to prevent enumeration
    return json(202, { ok: true });
  }
}

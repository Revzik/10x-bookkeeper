import type { APIContext } from "astro";
import { ZodError } from "zod";

import { createSupabaseServerInstance } from "../../../../db/supabase.client";
import { apiError, json } from "../../../../lib/api/responses";
import { createSignupSchema } from "../../../../lib/auth/schemas";
import type { SignupResponseDto } from "../../../../types";
import { getRequestEnv } from "../../../../lib/env";

export const prerender = false;

/**
 * POST /api/v1/auth/signup
 * Registers a new user with email and password
 */
export async function POST(context: APIContext): Promise<Response> {
  // Parse and validate request body
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return apiError(400, "VALIDATION_ERROR", "apiErrors.invalidJson");
  }

  const signupSchema = createSignupSchema((key) => key);
  let validatedBody;
  try {
    validatedBody = signupSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "VALIDATION_ERROR", "apiErrors.invalidRequest", error.errors);
    }
    return apiError(400, "VALIDATION_ERROR", "apiErrors.invalidRequest");
  }

  // Create Supabase server instance for this request
  const supabase = createSupabaseServerInstance({
    cookies: context.cookies,
    headers: context.request.headers,
    env: getRequestEnv(context.locals),
  });

  // Attempt to sign up
  try {
    // Use request origin for redirect URL (remove trailing slash if present)
    const siteUrl = context.url.origin.replace(/\/$/, "");

    const { data, error } = await supabase.auth.signUp({
      email: validatedBody.email,
      password: validatedBody.password,
      options: {
        emailRedirectTo: `${siteUrl}/auth/callback?next=/library`,
      },
    });

    if (error) {
      // Map Supabase auth errors to API error codes
      if (error.message.includes("already registered") || error.message.includes("already been registered")) {
        return apiError(409, "CONFLICT", "apiErrors.conflictEmail");
      }

      if (error.message.includes("rate limit") || error.message.includes("too many requests")) {
        return apiError(429, "RATE_LIMITED", "apiErrors.signupRateLimited");
      }

      if (error.message.includes("Password")) {
        return apiError(400, "VALIDATION_ERROR", "apiErrors.passwordInvalid");
      }

      // Log minimal error info (without full stack trace)
      // eslint-disable-next-line no-console
      console.error("Signup failed:", error.message || "Unknown error");
      return apiError(500, "INTERNAL_ERROR", "apiErrors.internal");
    }

    if (!data.user) {
      return apiError(500, "INTERNAL_ERROR", "apiErrors.internal");
    }

    // Return user data
    const response: SignupResponseDto = {
      user: {
        id: data.user.id,
        email: data.user.email ?? "",
      },
      requires_email_confirmation: !data.session,
    };

    return json(201, response);
  } catch (error) {
    // Log minimal error info (without full stack trace)
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    // eslint-disable-next-line no-console
    console.error("Unexpected signup error:", errorMessage);
    return apiError(500, "INTERNAL_ERROR", "apiErrors.unexpected");
  }
}

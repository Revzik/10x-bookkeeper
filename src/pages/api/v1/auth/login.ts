import type { APIContext } from "astro";
import { ZodError } from "zod";

import { createSupabaseServerInstance } from "../../../../db/supabase.client";
import { apiError, json } from "../../../../lib/api/responses";
import { createLoginSchema } from "../../../../lib/auth/schemas";
import type { LoginResponseDto } from "../../../../types";

export const prerender = false;

/**
 * POST /api/v1/auth/login
 * Authenticates a user with email and password
 */
export async function POST(context: APIContext): Promise<Response> {
  // Parse and validate request body
  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return apiError(400, "VALIDATION_ERROR", "apiErrors.invalidJson");
  }

  const loginSchema = createLoginSchema((key) => key);
  let validatedBody;
  try {
    validatedBody = loginSchema.parse(body);
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
  });

  // Attempt to sign in
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: validatedBody.email,
      password: validatedBody.password,
    });

    if (error) {
      // Map Supabase auth errors to API error codes
      if (error.message.includes("Email not confirmed")) {
        return apiError(401, "NOT_ALLOWED", "apiErrors.emailNotConfirmed");
      }

      if (error.message.includes("Invalid login credentials")) {
        return apiError(401, "NOT_ALLOWED", "apiErrors.invalidCredentials");
      }

      // Log minimal error info (without full stack trace)
      console.error("Login failed:", error.message || "Unknown error");
      return apiError(500, "INTERNAL_ERROR", "apiErrors.internal");
    }

    if (!data.user) {
      return apiError(500, "INTERNAL_ERROR", "apiErrors.internal");
    }

    // Return user data
    const response: LoginResponseDto = {
      user: {
        id: data.user.id,
        email: data.user.email ?? "",
      },
    };

    return json(200, response);
  } catch (error) {
    // Log minimal error info (without full stack trace)
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Unexpected login error:", errorMessage);
    return apiError(500, "INTERNAL_ERROR", "apiErrors.unexpected");
  }
}

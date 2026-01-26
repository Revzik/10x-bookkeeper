import type { APIContext } from "astro";
import { ZodError } from "zod";

import { createSupabaseServerInstance } from "../../../../db/supabase.client";
import { apiError, json } from "../../../../lib/api/responses";
import { signupSchema } from "../../../../lib/auth/schemas";
import type { SignupResponseDto } from "../../../../types";

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
    return apiError(400, "VALIDATION_ERROR", "Invalid JSON in request body");
  }

  let validatedBody;
  try {
    validatedBody = signupSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return apiError(400, "VALIDATION_ERROR", "Invalid request body", error.errors);
    }
    return apiError(400, "VALIDATION_ERROR", "Invalid request body");
  }

  // Create Supabase server instance for this request
  const supabase = createSupabaseServerInstance({
    cookies: context.cookies,
    headers: context.request.headers,
  });

  // Attempt to sign up
  try {
    const { data, error } = await supabase.auth.signUp({
      email: validatedBody.email,
      password: validatedBody.password,
    });

    if (error) {
      // Map Supabase auth errors to API error codes
      if (error.message.includes("already registered") || error.message.includes("already been registered")) {
        return apiError(409, "CONFLICT", "An account with this email already exists.");
      }

      if (error.message.includes("Password")) {
        return apiError(400, "VALIDATION_ERROR", error.message);
      }

      // Log minimal error info (without full stack trace)
      console.error("Signup failed:", error.message || "Unknown error");
      return apiError(500, "INTERNAL_ERROR", "An error occurred during registration. Please try again.");
    }

    if (!data.user) {
      return apiError(500, "INTERNAL_ERROR", "Registration succeeded but no user data returned");
    }

    // Return user data
    const response: SignupResponseDto = {
      user: {
        id: data.user.id,
        email: data.user.email ?? "",
      },
    };

    return json(201, response);
  } catch (error) {
    // Log minimal error info (without full stack trace)
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Unexpected signup error:", errorMessage);
    return apiError(500, "INTERNAL_ERROR", "An unexpected error occurred. Please try again.");
  }
}

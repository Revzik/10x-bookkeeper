import type { APIContext } from "astro";

import { createSupabaseServerInstance } from "../../../../db/supabase.client";
import { apiError } from "../../../../lib/api/responses";

export const prerender = false;

/**
 * POST /api/v1/auth/logout
 * Signs out the current user and clears session cookies
 */
export async function POST(context: APIContext): Promise<Response> {
  // Create Supabase server instance for this request
  const supabase = createSupabaseServerInstance({
    cookies: context.cookies,
    headers: context.request.headers,
  });

  // Attempt to sign out
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      // Log the error but don't fail - logout should be idempotent
      console.error("Logout error:", error);
    }

    // Always return success for logout (idempotent operation)
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Unexpected logout error:", error);
    return apiError(500, "INTERNAL_ERROR", "apiErrors.unexpected");
  }
}

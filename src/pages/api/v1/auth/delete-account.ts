import type { APIRoute } from "astro";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/db/supabase.client";
import { getRequestEnv } from "@/lib/env";

/**
 * DELETE ACCOUNT ENDPOINT
 * POST /api/v1/auth/delete-account
 *
 * Deletes the currently authenticated user's account and all associated data.
 *
 * This endpoint:
 * 1. Requires an authenticated session
 * 2. Deletes the user from auth.users using admin client (service role)
 * 3. Cascades to delete all user-owned data (series, books, chapters, notes, search logs)
 * 4. This action is permanent and cannot be undone
 *
 * Request body: {} (empty)
 * Response 200: { "ok": true }
 *
 * Error codes:
 * - 401 AUTHENTICATION_REQUIRED: User is not authenticated
 * - 500 INTERNAL_ERROR: Failed to delete account
 */

export const prerender = false;

// Empty request schema - no input required
const DeleteAccountRequestSchema = z.object({});

export const POST: APIRoute = async ({ request, locals }) => {
  const { supabase } = locals;

  // 1. Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response(
      JSON.stringify({
        error: {
          code: "AUTHENTICATION_REQUIRED",
          message: "You must be signed in to delete your account.",
        },
      }),
      { status: 401, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }

  // 2. Validate request body (should be empty)
  let body: unknown;
  try {
    const text = await request.text();
    body = text.trim() === "" ? {} : JSON.parse(text);
  } catch {
    return new Response(
      JSON.stringify({
        error: {
          code: "INVALID_JSON",
          message: "Invalid JSON in request body.",
        },
      }),
      { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }

  const parsed = DeleteAccountRequestSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(
      JSON.stringify({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request body.",
          details: parsed.error.issues,
        },
      }),
      { status: 400, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }

  // 3. Delete the user account using admin client
  // This will cascade delete all user-owned data via ON DELETE CASCADE foreign keys:
  // - series (user_id → auth.users.id)
  // - books (user_id → auth.users.id)
  // - chapters (user_id → auth.users.id)
  // - notes (user_id → auth.users.id)
  // - search_logs (user_id → auth.users.id)
  // - search_errors (user_id → auth.users.id)
  let adminClient;
  try {
    adminClient = createSupabaseAdminClient(getRequestEnv(locals));
  } catch (error) {
    console.error("[auth/delete-account] Failed to create admin client:", error);
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "Server configuration error. Please contact support.",
        },
      }),
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);

  if (deleteError) {
    console.error("[auth/delete-account] Failed to delete user:", deleteError);
    return new Response(
      JSON.stringify({
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to delete account. Please try again.",
        },
      }),
      { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } }
    );
  }

  // 4. Return success
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};

import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import { SUPABASE_KEY, SUPABASE_URL } from "astro:env/server";
import type { AstroCookies } from "astro";

import type { Database } from "./database.types.ts";

export type SupabaseClientType = SupabaseClient<Database>;

/**
 * Cookie options for Supabase Auth session management
 * These settings ensure secure, HTTP-only cookies for SSR
 */
export const cookieOptions: CookieOptionsWithName = {
  path: "/",
  secure: true,
  httpOnly: true,
  sameSite: "lax",
};

/**
 * Parse Cookie header string into array of name-value pairs
 * Required by @supabase/ssr cookie adapter
 */
function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

/**
 * Creates a Supabase server client for SSR contexts
 * This client can read/write session cookies and must be created per-request
 *
 * @param context - Astro request context with headers and cookies
 * @returns Supabase server client configured for cookie-based auth
 */
export const createSupabaseServerInstance = (context: { headers: Headers; cookies: AstroCookies }) => {
  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    cookieOptions,
    cookies: {
      getAll() {
        return parseCookieHeader(context.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => context.cookies.set(name, value, options));
      },
    },
  });

  return supabase;
};

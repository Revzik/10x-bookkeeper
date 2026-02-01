import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import type { AstroCookies } from "astro";

import type { Database } from "./database.types.ts";
import { getEnvValue, type RuntimeEnv } from "../lib/env";

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
export const createSupabaseServerInstance = (context: {
  headers: Headers;
  cookies: AstroCookies;
  env?: RuntimeEnv;
}) => {
  const supabaseUrl = getEnvValue(context.env, "SUPABASE_URL", import.meta.env.SUPABASE_URL);
  const supabaseKey = getEnvValue(context.env, "SUPABASE_KEY", import.meta.env.SUPABASE_KEY);

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("SUPABASE_URL or SUPABASE_KEY environment variable is not configured");
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
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

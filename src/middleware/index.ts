import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerInstance } from "../db/supabase.client.ts";

/**
 * Public paths that don't require authentication
 * Includes auth pages and auth API endpoints
 */
const PUBLIC_PATHS = [
  // Auth pages
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  // Auth API endpoints
  "/api/v1/auth/login",
  "/api/v1/auth/signup",
  "/api/v1/auth/logout",
  "/api/v1/auth/password-reset",
  "/api/v1/auth/password-update",
];

/**
 * Check if a path is public (doesn't require authentication)
 */
function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((publicPath) => pathname === publicPath || pathname.startsWith(publicPath));
}

/**
 * Check if a path is an API route
 */
function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

/**
 * Check if a path is an auth page (login, signup, etc.)
 * Note: /reset-password is NOT included because users need to be authenticated to reset their password
 */
function isAuthPage(pathname: string): boolean {
  return ["/login", "/signup", "/forgot-password"].includes(pathname);
}

/**
 * Authentication middleware
 * - Creates request-scoped Supabase server instance
 * - Checks authentication status
 * - Protects routes requiring authentication
 * - Redirects authenticated users away from login/signup pages
 * - Allows authenticated users to access /reset-password (needed for password reset flow)
 */
export const onRequest = defineMiddleware(async ({ locals, cookies, url, request, redirect }, next) => {
  // Create Supabase server instance for this request
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  // Make supabase available to endpoints (backward compatibility)
  locals.supabase = supabase;

  // Get authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Populate locals.user if authenticated
  if (user) {
    locals.user = {
      id: user.id,
      email: user.email ?? "",
    };
  }

  const isPublic = isPublicPath(url.pathname);
  const isApi = isApiRoute(url.pathname);
  const isAuth = isAuthPage(url.pathname);

  // If user is authenticated and trying to access login/signup/forgot-password, redirect to library
  // Note: /reset-password is allowed for authenticated users (they need it to complete password reset)
  if (user && isAuth) {
    const redirectTo = url.searchParams.get("redirectTo") || "/library";
    return redirect(redirectTo);
  }

  // If user is not authenticated and trying to access protected route
  if (!user && !isPublic) {
    if (isApi) {
      // For API routes, return 401 JSON error
      return new Response(
        JSON.stringify({
          error: {
            code: "NOT_ALLOWED",
            message: "Authentication required",
          },
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    } else {
      // For page routes, redirect to login with return URL
      return redirect(`/login?redirectTo=${encodeURIComponent(url.pathname)}`);
    }
  }

  return next();
});

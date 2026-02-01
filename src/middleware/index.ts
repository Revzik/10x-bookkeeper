import { defineMiddleware } from "astro:middleware";

import { createSupabaseServerInstance } from "../db/supabase.client.ts";
import { getRequestEnv } from "../lib/env";

/**
 * Public paths that don't require authentication
 * Includes auth pages and auth API endpoints
 */
const PUBLIC_PATHS = [
  // Root page (handles its own redirects)
  "/",
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

const getLocalePrefix = (pathname: string): string => {
  if (pathname === "/pl" || pathname.startsWith("/pl/")) {
    return "/pl";
  }
  return "";
};

const stripLocalePrefix = (pathname: string, localePrefix: string): string => {
  if (!localePrefix) {
    return pathname;
  }
  if (pathname === localePrefix) {
    return "/";
  }
  return pathname.slice(localePrefix.length);
};

const buildLocalizedPath = (localePrefix: string, path: string): string => {
  if (!localePrefix) {
    return path;
  }
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${localePrefix}${normalizedPath === "/" ? "" : normalizedPath}`;
};

/**
 * Check if a path is public (doesn't require authentication)
 * Note: We check exact matches first, then prefix matches only for API routes
 */
const isPublicPath = (pathname: string): boolean => {
  // Exact match check
  if (PUBLIC_PATHS.includes(pathname)) {
    return true;
  }

  // Prefix match only for API routes (to allow /api/v1/auth/*)
  return PUBLIC_PATHS.some((publicPath) => {
    // Only use startsWith for paths that should match prefixes (API routes)
    if (publicPath.startsWith("/api/")) {
      return pathname.startsWith(publicPath);
    }
    return false;
  });
};

/**
 * Check if a path is an API route
 */
const isApiRoute = (pathname: string): boolean => pathname.startsWith("/api/");

/**
 * Check if a path is an auth page (login, signup, etc.)
 * Note: /reset-password is NOT included because users need to be authenticated to reset their password
 */
const isAuthPage = (pathname: string): boolean => ["/login", "/signup", "/forgot-password"].includes(pathname);

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
    env: getRequestEnv(locals),
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

  const localePrefix = getLocalePrefix(url.pathname);
  const basePath = stripLocalePrefix(url.pathname, localePrefix);

  const isPublic = isPublicPath(basePath);
  const isApi = isApiRoute(basePath);
  const isAuth = isAuthPage(basePath);

  // If user is authenticated and trying to access login/signup/forgot-password, redirect to library
  // Note: /reset-password is allowed for authenticated users (they need it to complete password reset)
  if (user && isAuth) {
    const fallback = buildLocalizedPath(localePrefix, "/library");
    const redirectTo = url.searchParams.get("redirectTo") || fallback;
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
            message: "apiErrors.authRequired",
          },
        }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    // For page routes, redirect to login with return URL
    const loginPath = buildLocalizedPath(localePrefix, "/login");
    const redirectTarget = buildLocalizedPath(localePrefix, basePath);
    return redirect(`${loginPath}?redirectTo=${encodeURIComponent(redirectTarget)}`);
  }

  return next();
});

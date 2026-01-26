## Authentication Module — Technical Specification (US-001 / US-002 / US-003)

### Scope and non-breaking constraints

- **In scope (this spec)**: email/password **sign-up**, **log-in**, **log-out**, **forgot password**, **reset password**. This covers PRD user stories **US-001**, **US-002**, **US-003**.
- **Stack constraints**: Astro 5 (server output), React 19 islands, TypeScript 5, Tailwind 4, shadcn/ui, Supabase Auth + Postgres + RLS.
- **Existing behavior that must not be broken**
  - **App routing pattern**: “page shells” are Astro pages with `prerender = false` that mount React pages via `client:only="react"` (e.g. `/library`, `/books/:bookId`, `/series/:seriesId`).
  - **API conventions**: `/api/v1/*` endpoints use **Zod** for input validation and return standardized errors via `apiError()` with `ApiErrorCode` (see `src/lib/api/responses.ts`, `src/types.ts`).
  - **Astro runtime**: `astro.config.mjs` uses `output: "server"` + Node adapter, enabling server-side redirects and cookie/session handling.

This spec introduces **real Supabase Auth + session cookies**.

---

## 1) USER INTERFACE ARCHITECTURE

### 1.1 New and updated routes (Astro pages)

All auth pages are server-rendered (`prerender = false`) and are responsible for:
- initial route gating (redirect if already authenticated / if unauthenticated)
- reading query params (`redirectTo`, recovery tokens/codes)
- mounting the appropriate React island(s)

#### Public (unauthenticated) routes

- `GET /login`
  - **Purpose**: log in (US-002)
  - **Redirect rule**: if already authenticated → redirect to `redirectTo` (default `/library`).
  - **React island**: `AuthLoginPage` (client component).

- `GET /signup`
  - **Purpose**: register (US-001)
  - **Redirect rule**: if already authenticated → redirect to `/library`.
  - **React island**: `AuthSignupPage`.

- `GET /forgot-password`
  - **Purpose**: request password reset email (US-003, step 2–3)
  - **React island**: `AuthForgotPasswordPage`.

#### Recovery / callback routes

- `GET /auth/callback`
  - **Purpose**: handle Supabase Auth redirect flows that return an authorization `code` (PKCE) and exchange it for a session cookie on the server.
  - **Redirect**: to `next` query param if present; else:
    - for password recovery → `/reset-password`
    - otherwise → `/library`

- `GET /reset-password`
  - **Purpose**: set new password after clicking email link (US-003, step 4–5)
  - **Redirect rule**:
    - if no “recovery session” present (expired/invalid link) → show error state + link back to `/forgot-password`
    - if user is authenticated with a recovery session → show reset form
  - **React island**: `AuthResetPasswordPage`

#### Protected (authenticated) routes

Existing protected routes remain as-is but gain **route protection**:
- `GET /library`
- `GET /books/:bookId`
- `GET /series/:seriesId`

Protection behavior:
- If unauthenticated → 302 redirect to `/login?redirectTo=<originalPath>`.
- If authenticated → render existing React pages exactly as today.

Addition:
- `GET /` (index)
  - redirect to `/library` when authenticated
  - redirect to `/login` when unauthenticated

---

### 1.2 Layout and navigation in auth vs non-auth mode

#### Base HTML layout (Astro)

Continue using `src/layouts/Layout.astro` for:
- global CSS
- theme initialization script
- `<slot />`

Add (new) `src/layouts/AuthLayout.astro` to standardize auth pages:
- include a dedicated `AuthHeader.tsx` (React) for auth routes
- minimal header row: app name + `ThemeToggle` (rendered inside `AuthHeader.tsx`)
- centered card container with responsive padding
- consistent page titles and meta

#### Header behavior on protected vs auth routes

- **Protected pages (`AppHeader`)**
  - `src/components/shared/AppHeader.tsx` is rendered only inside protected React pages (e.g. `LibraryPage`, `BookDetailPage`, `SeriesDetailPage`).
  - Extend it to replace the current disabled user icon with an active user menu:
    - shows user email
    - “Log out” action
    - “Delete account” (GDPR “Right to be Forgotten” support; implementation may be phased, but the UI contract is defined here)

- **Auth pages (`AuthHeader`)**
  - Add `src/components/auth/AuthHeader.tsx` and render it on `/login`, `/signup`, `/forgot-password`, `/reset-password`.
  - Responsibilities:
    - display app name/brand
    - expose `ThemeToggle`
    - optionally show secondary navigation between auth pages (e.g. “Create account” link on login, “Sign in” link on signup)

Auth state is derived from a dedicated client hook (see below) that reads session/user from Supabase cookie-based session.

---

### 1.3 React islands: responsibilities and boundaries

The existing architecture uses React components for interactive surfaces and keeps Astro pages thin. We keep the same separation:

#### Astro page responsibilities

- **Route protection** (server-side, before any React renders)
- **Passing initial props** to React islands:
  - `redirectTo` for login/signup
  - `emailPrefill` if provided
  - `recoveryContext` (a boolean derived from server session state)
- **SSR redirects** using Astro’s server runtime (Node adapter)

#### React responsibilities

Auth flows are implemented as React islands to match the current app’s UI patterns (shadcn/ui forms, dialog/toast patterns).

New React modules:

- `src/components/auth/` (new folder)
  - `AuthHeader.tsx`
  - `AuthLoginPage.tsx`
  - `AuthSignupPage.tsx`
  - `AuthForgotPasswordPage.tsx`
  - `AuthResetPasswordPage.tsx`
  - `AuthCard.tsx` (shared layout card)
  - `PasswordStrengthHint.tsx` (optional)
  - `AuthErrorBanner.tsx` (shared error display)

New client hooks/services:
- `src/lib/auth/` (new folder)
  - `auth.client.ts`:
    - creates a **browser Supabase client** configured for **cookie-based** auth storage (not localStorage) so SSR/API can read the session.
  - `useAuth.ts`:
    - exposes `user`, `session`, `loading`, `signIn`, `signUp`, `signOut`, `requestPasswordReset`, `updatePassword`
    - subscribes to auth state changes to update the UI (header, redirects)

Navigation rules inside React:
- After successful login/sign-up: `window.location.href = redirectTo ?? "/library"` (mirrors existing navigation style used in components).
- After logout: redirect to `/login`.

---

### 1.4 Form validation, error messages, and UX rules

All auth forms validate both:
- **Client-side** (immediate feedback for UX)
- **Server-side** (authoritative validation + consistent error shape)

#### Shared validation rules (US-001/US-002/US-003)

- **Email**
  - must be present
  - must be valid email format
  - normalized to lowercase + trimmed
  - Error messages:
    - “Email is required”
    - “Enter a valid email address”

- **Password (sign-up and reset)**
  - must be present
  - password strength baseline (recommended):
    - min length \( \ge 8 \)
    - at least one of: letter + number
  - Error messages:
    - “Password is required”
    - “Password must be at least 8 characters”
    - “Password must include at least one number”

- **Confirm password (sign-up and reset)**
  - must match password
  - Error: “Passwords do not match”

#### Login error messaging (US-002 acceptance criteria #2)

Incorrect credentials must show a clear, user-friendly error without leaking security details:
- Display message: **“Incorrect email or password.”**
- HTTP/API mapping: treat as `401 NOT_ALLOWED` or `400 VALIDATION_ERROR` depending on upstream error; normalize to the message above.

#### Forgot password (US-003 acceptance criteria #3)

Avoid account enumeration:
- Always show success UI state after submission:
  - “If an account exists for that email, we’ve sent a password reset link.”
- Only show a visible error for obvious client-side issues (invalid email) or rate limiting (429):
  - “Too many requests. Please try again later.”

#### Reset password (US-003 acceptance criteria #4–5)

States to handle:
- valid recovery session → show “New password” + “Confirm password”
- missing/expired recovery session → show:
  - title: “Reset link expired”
  - message: “Your reset link is invalid or has expired. Please request a new one.”
  - CTA: “Request new reset link” → `/forgot-password`

#### Loading and error UI

For all auth operations:
- disable submit button while pending
- show inline error banner (shadcn `Alert` or custom banner) for request failures
- optionally show toast for success states (e.g., reset email sent)

---

### 1.5 Primary user journeys (scenarios)

#### US-001: Sign up

- User navigates to `/signup`
- Form validates email/password/confirm password
- On submit:
  - Create user via Supabase Auth
  - Ensure “user record created”: Supabase creates `auth.users` row
- On success:
  - User is authenticated (session cookie set)
  - Redirect to `/library`

#### US-002: Log in

- User navigates to `/login?redirectTo=/books/<id>` (or `/login`)
- Form validates email/password
- On submit:
  - Authenticate via Supabase Auth
  - Set session cookie
- On success:
  - Redirect to `redirectTo` if provided; else `/library`
- On wrong credentials:
  - Show “Incorrect email or password.”

#### US-003: Password reset

- From `/login`, user clicks “Forgot password?”
- On `/forgot-password`:
  - user inputs email
  - app requests reset link via Supabase, with `redirectTo = <site>/auth/callback?next=/reset-password`
- User clicks email link
- Browser returns to `/auth/callback` with `code`
- Server exchanges code → session cookie
- Redirect to `/reset-password`
- User enters new password + confirm
- On submit:
  - update password via Supabase Auth
  - redirect to `/library`

---

## 2) BACKEND LOGIC

### 2.1 Auth-related API endpoints (Astro server endpoints)

Endpoints under `/src/pages/api/v1/auth/*` (new):

#### `POST /api/v1/auth/signup`

- **Body**
  - `email: string`
  - `password: string`
  - `confirm_password: string`
- **Responses**
  - `201` `{ user: { id: string, email: string } }`
  - `400 VALIDATION_ERROR` for schema violations
  - `409 CONFLICT` if email already registered (normalized)
  - `500 INTERNAL_ERROR` for unexpected failures

#### `POST /api/v1/auth/login`

- **Body**: `email`, `password`
- **Responses**
  - `200` `{ user: { id, email } }`
  - `401 NOT_ALLOWED` with message “Incorrect email or password.”
  - `400 VALIDATION_ERROR` for malformed input

#### `POST /api/v1/auth/logout`

- **Body**: none
- **Responses**
  - `204` on success
  - `401 NOT_ALLOWED` if already logged out (optional; may also return `204` idempotently)

#### `POST /api/v1/auth/password-reset`

- **Body**: `email`
- **Responses**
  - `202` `{ ok: true }` (always, unless validation fails)
  - `400 VALIDATION_ERROR` (invalid email)
  - `429 RATE_LIMITED` (optional, if rate limiting is added)

#### `POST /api/v1/auth/password-update`

- **Body**: `password`, `confirm_password`
- **Auth**: requires a valid session (recovery or normal)
- **Responses**
  - `200` `{ ok: true }`
  - `401 NOT_ALLOWED` (no/expired recovery session)
  - `400 VALIDATION_ERROR` (weak password or mismatch)

---

### 2.2 Updating existing API endpoints for auth

Current endpoints use `DEV_USER_ID` and frequently pass `userId` into services:
- `src/pages/api/v1/books/*`
- `src/pages/api/v1/series/*`
- `src/pages/api/v1/chapters/*`
- `src/pages/api/v1/notes/*`
- `src/pages/api/v1/ai/query`

New rule:
- **Production**: derive user context from Supabase session (`auth.uid()` via JWT), and rely on **RLS** to isolate data.

Contract for “effective user context” (server-side):
- `user_id`:
  - authenticated user id from Supabase session
- API behavior when missing:
  - if auth is required and neither is present:
    - return `401 NOT_ALLOWED` “Authentication required”

---

### 2.3 Input validation mechanism

Maintain the existing Zod-first pattern:
- new schemas in `src/lib/validation/auth.schemas.ts`
- for each endpoint:
  - parse JSON with try/catch
  - validate via schema `.parse()`
  - on `ZodError`, return `apiError(400, "VALIDATION_ERROR", "...", error.errors)`

For shared validation, reuse existing shared schemas patterns (e.g., `.trim()`, `.strict()`, `.refine()`).

---

### 2.4 Exception handling and error normalization

Auth endpoints should map Supabase errors into the existing error envelope:

- **Invalid credentials**
  - return `401 NOT_ALLOWED`
  - message: “Incorrect email or password.”

- **Email already registered**
  - return `409 CONFLICT`
  - message: “An account with this email already exists.”

- **Recovery link expired / invalid**
  - return `401 NOT_ALLOWED`
  - message: “Recovery session expired. Please request a new reset link.”

- **Unexpected upstream or server errors**
  - log server-side with minimal PII (avoid logging full emails where possible)
  - return `500 INTERNAL_ERROR` with a generic message

All logs should follow existing style (structured objects) and should not include plaintext passwords or tokens.

---

### 2.5 Server-side rendering (SSR) updates for selected pages

Given `output: "server"` and Node adapter, we can (and should) perform server-side redirects for auth:

#### Middleware route guard

Implement access control in `src/middleware/index.ts`:
- create a request-scoped Supabase server client that can read/write cookies
- fetch session/user once per request and attach to `context.locals`
- enforce:
  - protected page routes redirect to `/login`
  - protected API routes return `401` JSON error
  - public auth routes redirect away when already authenticated

---

## 3) AUTHENTICATION SYSTEM (Supabase Auth + Astro)

### 3.1 Supabase Auth configuration assumptions

To satisfy US-001 acceptance criteria “Upon success, user is authenticated and redirected to dashboard”:
- **Email confirmations should be disabled for MVP**, OR the UI must treat “sign up success” as “check your email” (which conflicts with US-001 as written).

Password reset:
- Configure “Site URL” and “Redirect URLs” in Supabase Auth to include:
  - `<site>/auth/callback`
  - `<site>/reset-password`

---

### 3.2 Session storage strategy (cookie-based, SSR-friendly)

Goal: the same session used by React UI must be readable server-side by Astro pages and API endpoints.

Use a cookie-based session flow:
- Browser auth actions set/update cookies
- Astro middleware/server reads cookies to create an authenticated Supabase client per request

Key contracts:
- **Browser client**: configured to persist session in cookies (not localStorage)
- **Server client**: created per request with cookie getters/setters so refresh tokens rotate correctly

This enables:
- server-side redirects based on auth state (no “flash of unauthenticated”)
- API endpoints to operate under RLS without needing explicit `userId` parameters from the client

---

### 3.3 How auth integrates with RLS and existing data model

Database schema already uses:
- `user_id uuid not null references auth.users(id) on delete cascade`
- RLS policies compare `user_id = auth.uid()`

Therefore, once requests are executed with the authenticated user’s JWT:
- reads/writes automatically isolate to the user

---

### 3.4 Logout, expiration, and resilience

#### Logout

- Client triggers logout via:
  - `POST /api/v1/auth/logout` (recommended for consistent cookie clearing)
- On success:
  - redirect to `/login`

#### Session expiration / refresh

- Server client should transparently refresh sessions when needed (via Supabase SSR helpers) and update cookies on the response.
- If session cannot be refreshed:
  - pages redirect to `/login`
  - API returns `401 NOT_ALLOWED`

---

## Appendix A — Required contracts and module inventory

### New files/modules (proposed)

- **Astro pages**
  - `src/pages/login.astro`
  - `src/pages/signup.astro`
  - `src/pages/forgot-password.astro`
  - `src/pages/reset-password.astro`
  - `src/pages/auth/callback.astro`
  - (optional) `src/pages/index.astro`

- **Astro layouts**
  - `src/layouts/AuthLayout.astro`

- **React components**
  - `src/components/auth/AuthHeader.tsx`
  - `src/components/auth/AuthLoginPage.tsx`
  - `src/components/auth/AuthSignupPage.tsx`
  - `src/components/auth/AuthForgotPasswordPage.tsx`
  - `src/components/auth/AuthResetPasswordPage.tsx`
  - `src/components/auth/AuthCard.tsx`
  - `src/components/auth/AuthErrorBanner.tsx`

- **Client auth helpers**
  - `src/lib/auth/auth.client.ts`
  - `src/lib/auth/useAuth.ts`

- **API endpoints**
  - `src/pages/api/v1/auth/signup.ts`
  - `src/pages/api/v1/auth/login.ts`
  - `src/pages/api/v1/auth/logout.ts`
  - `src/pages/api/v1/auth/password-reset.ts`
  - `src/pages/api/v1/auth/password-update.ts`

- **Validation**
  - `src/lib/validation/auth.schemas.ts`

- **Middleware changes**
  - Extend `src/middleware/index.ts` to create a request-scoped Supabase server client and attach auth context to `context.locals`.

### Existing modules to extend (proposed)

- `src/components/shared/AppHeader.tsx`:
  - enable user menu + logout
- `src/env.d.ts`:
  - extend `App.Locals` to include `user` / `session` (optional but recommended for clarity)

---

## Appendix B — API error consistency (auth)

Reuse existing `ApiErrorCode` values whenever possible:
- `VALIDATION_ERROR` for malformed payloads
- `NOT_ALLOWED` for unauthenticated/unauthorized access and invalid credentials
- `CONFLICT` for email already registered
- `RATE_LIMITED` for reset spam protection (optional)
- `INTERNAL_ERROR` for unexpected failures

All auth endpoints must return errors in the standard envelope:

```json
{
  "error": {
    "code": "NOT_ALLOWED",
    "message": "Incorrect email or password.",
    "details": []
  }
}
```


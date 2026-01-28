## Test Plan — 10x Bookkeeper (MVP / PoC)

### 1) Introduction and Testing Objectives

10x Bookkeeper is a responsive web app for private, structured reading notes (Series → Book → Chapter → Notes) with an AI “Ask” feature grounded strictly in the user’s own notes. This test plan targets the current Astro + React implementation, server-side auth middleware, Supabase-backed APIs, and the OpenRouter-backed “simple chat” AI query.

**Testing objectives**

- **Verify core user value**: users can authenticate, manage library entities, take notes, and ask questions scoped to a book/series.
- **Verify security and data isolation**: unauthenticated requests are blocked; authenticated users cannot access or mutate other users’ data; RLS and app-level guards behave correctly.
- **Verify correctness of API contracts**: request validation, response shapes, status codes, and error codes are stable and consistent.
- **Verify UX and reliability**: key pages render with correct routing/redirect behavior; client-side validation and error states are clear; no crashes in common paths.
- **Verify AI safety requirements**: answers are based only on notes; “low confidence” behavior triggers appropriately; failures are handled predictably.
- **Establish regression coverage**: prevent accidental breaking changes in middleware routing rules, CRUD semantics, pagination/sorting, and AI endpoint behavior.

### 2) Test Scope

**In-scope features (per PRD + current code)**

- **Authentication** (email/password): signup, login, logout, forgot-password, password reset via `/auth/callback` exchange.
  - API: `src/pages/api/v1/auth/*`
  - Pages: `src/pages/login.astro`, `src/pages/signup.astro`, `src/pages/forgot-password.astro`, `src/pages/reset-password.astro`, `src/pages/auth/callback.astro`
  - Middleware: `src/middleware/index.ts`
- **Library management**: Series and Books CRUD + listing with pagination/search/sort.
  - API: `src/pages/api/v1/series/*`, `src/pages/api/v1/books/*`
  - Services: `src/lib/services/series.service.ts`, `src/lib/services/books.service.ts`
- **Chapters management**: create/list under book; get/update/delete by id; ordering field support.
  - API: `src/pages/api/v1/books/[bookId]/chapters.ts`, `src/pages/api/v1/chapters/[chapterId].ts`
  - Services: `src/lib/services/chapters.service.ts`
- **Notes management**: create under chapter; list/filter; get (optional context); update; delete.
  - API: `src/pages/api/v1/chapters/[chapterId]/notes.ts`, `src/pages/api/v1/notes/*`
  - Services: `src/lib/services/notes.service.ts`
- **Ask (AI Q&A) “simple chat”**: query notes and call OpenRouter LLM; low-confidence flag supported.
  - API: `src/pages/api/v1/ai/query.ts`
  - Services: `src/lib/services/ai.service.ts`, `src/lib/openrouter/*`
  - UI: `src/components/ai/*`, `src/components/book/BookAskTabPanel.tsx`, `src/components/series/SeriesAskTabPanel.tsx`
- **Progress tracking**: via `PATCH /api/v1/books/:bookId` updating `current_page`, `total_pages`, and `status` with invariants.

**Explicitly out-of-scope for MVP (subject for removal)**

- **Vector retrieval / citations / embeddings pipeline** (pgvector, `match_notes` RPC, `note_embeddings`) — not implemented in current API; only “simple chat” is active.
- **Reading session tracking** (`reading_sessions`) — schema/types exist, but endpoints are postponed and not present under `src/pages/api/v1/`.
- Embedding lifecycle flags (PoC): `embedding_status` is set to `"pending"` on create/update.

**Non-functional scope**

- **Security**: authentication gating, RLS/ownership isolation, safe error handling (no sensitive leakage).
- **Performance**: API latency for list endpoints and AI query; basic load/stress guidance.
- **Accessibility and responsiveness**: baseline checks for primary flows using shadcn/ui patterns.

### 3) Types of Tests to Conduct

#### Unit Tests

Focus: pure logic and deterministic functions.

- **Validation schemas** (Zod): `src/lib/validation/*.schemas.ts`, `src/lib/auth/schemas.ts`
- **Utility logic**: pagination helpers `src/lib/services/shared.service.ts`
- **AI service helpers**: context building, scope checks, error source mapping in `src/lib/services/ai.service.ts` (with OpenRouter mocked)

#### API Integration Tests (Astro API routes + services)

Focus: route-level behavior (status codes, error shapes, auth checks, data persistence) using a real Supabase environment (local) where possible.

- **Auth endpoints**: session cookie behavior, redirect/exchange flows
- **CRUD endpoints**: ownership checks, NotFound vs Validation errors, cascade deletes, query filters/sorting/pagination
- **AI query endpoint**: request validation, scope constraints, OpenRouter error mapping/logging, latency measurement presence

#### UI Component Tests (React)

Focus: key user interactions and UI state transitions with mocked API.

- **Auth forms**: client-side validation, error banner mapping, redirect behavior triggers
- **Library views**: tabs, URL state management, pagination controls, dialog flows
- **Book/Series detail views**: chapters list/reorder behaviors, notes grouping and dialogs, ask tab behavior
- **AI chat**: transcript rendering, pending/failed message states, retry/clear, low confidence panel

#### End-to-End (E2E) Tests (Browser)

Focus: realistic user journeys through Astro pages + React islands + server middleware.

- Auth flows (including password reset via callback)
- Full CRUD workflow across series/book/chapter/note
- Ask workflow with mocked OpenRouter (or test-only model) and deterministic responses
- Unauthorized access and redirect behaviors

#### Security Tests

Focus: isolation, auth bypass prevention, enumeration resistance, input hardening.

- Middleware protections and public path rules
- RLS enforcement (multi-user)
- Rate-limit behavior (where present) and enumeration-safe password reset behavior
- Injection attempts (XSS via note content rendering; query strings; API payloads)

#### Performance / Reliability Tests

Focus: baseline response times and resilience under failure.

- List endpoints with pagination at max page size (100)
- AI query latency and timeout/retry behavior in `OpenRouterService`
- Error logging behavior to `search_errors` and `search_logs` tables (where enabled)

### 4) Test Scenarios for Key Functionalities

#### 4.1 Authentication flows (`src/pages/api/v1/auth/`)

**Signup — `POST /api/v1/auth/signup`**

- **Happy path**
  - Valid email + password + confirmPassword → `201` + `user` DTO
  - Client redirects to `/library` and middleware recognizes session
- **Validation**
  - Invalid email format → `400 VALIDATION_ERROR` with details
  - Weak password / missing fields → `400 VALIDATION_ERROR`
  - Unknown/extra fields → rejected by schema (if applicable)
- **Conflicts**
  - Existing email → `409 CONFLICT` + message (“account exists”)
- **Security**
  - Ensure no sensitive fields (password) echoed in response/logs

**Login — `POST /api/v1/auth/login`**

- **Happy path**
  - Correct credentials → `200` + `user` DTO; session cookies set
  - Redirect to `redirectTo` param (page-level) or `/library`
- **Invalid credentials**
  - Wrong password / unconfirmed email → `401 NOT_ALLOWED` with generic message (“Incorrect email or password.”)
- **Validation**
  - Malformed JSON → `400 VALIDATION_ERROR` “Invalid JSON…”
  - Invalid body → `400 VALIDATION_ERROR` with details

**Logout — `POST /api/v1/auth/logout`**

- Always returns `204` (idempotent) even if already logged out.
- After logout, protected pages should redirect to `/login`.

**Forgot password — `POST /api/v1/auth/password-reset`**

- **Enumeration resistance**
  - Existing email and non-existing email both return `202 { ok: true }`
- **Rate limiting**
  - If Supabase rate-limits → `429 RATE_LIMITED`
- **Input validation**
  - Invalid email → `400 VALIDATION_ERROR`

**Password update — `POST /api/v1/auth/password-update`**

- Requires valid recovery or normal session:
  - No valid session → `401 NOT_ALLOWED` with “Recovery session expired…”
- Valid new password:
  - Success → `200 { ok: true }` and session remains valid
- Validation:
  - Password mismatch / weak password → `400 VALIDATION_ERROR`
  - “Same password” error mapping → `400 VALIDATION_ERROR` with correct message

**Callback exchange — `GET /auth/callback` (`src/pages/auth/callback.astro`)**

- Missing `code` → redirect `/login?error=invalid_callback`
- Invalid/expired `code`:
  - if `next` contains `reset-password` → redirect `/forgot-password?error=callback_failed`
  - else → redirect `/login?error=callback_failed`
- Valid `code` → session set + redirect to `next` (default `/library`)

**Middleware gating — `src/middleware/index.ts`**

- Unauthenticated request to protected page (e.g., `/library`) → redirect `/login?redirectTo=/library`
- Unauthenticated request to protected API (e.g., `/api/v1/books`) → `401` JSON error `{ error: { code: "NOT_ALLOWED" } }`
- Authenticated user visiting `/login` or `/signup` or `/forgot-password` → redirected to `redirectTo` or `/library`
- Public routes list correctness:
  - Ensure only intended routes are public; regression-test `PUBLIC_PATHS` and prefix matching for `/api/*`

#### 4.2 CRUD Operations (Series, Books, Chapters, Notes)

##### Series (`/api/v1/series`)

**Create — `POST /series`**

- Valid title → `201` with `series` DTO
- Missing/empty title → `400 VALIDATION_ERROR`

**List — `GET /series`**

- Pagination defaults and bounds:
  - default page=1, size=10; size capped at 100 (via `applyPaginationConstraints`)
- Search (`q`) filter on title:
  - case-insensitive match behavior validated
- Sorting:
  - allowed sort fields enforced (created_at/updated_at/title)
  - order asc/desc respected

**Get/Update/Delete — `GET|PATCH|DELETE /series/:seriesId`**

- Invalid UUID → `400 VALIDATION_ERROR`
- Non-existent (or not owned) series → `404 NOT_FOUND`
- Update:
  - partial update succeeds; unknown fields rejected
- Delete:
  - `cascade=false` deletes series only; verify expected DB behavior if books still reference series (depending on DB constraints)
  - `cascade=true` deletes books first (service-level); verify:
    - warning log is generated (observability)
    - all dependent entities removed (books → chapters → notes → note_embeddings)

##### Books (`/api/v1/books`)

**Create — `POST /books`**

- Valid book (title, author, total_pages>0) → `201`
- Optional fields:
  - series_id null/empty string normalization
  - cover_image_url URL validation and normalization
  - status default `want_to_read`
- Invalid series_id (non-owned or missing) → `404 NOT_FOUND` “Series not found”

**List — `GET /books`**

- Filters:
  - series_id, status, search `q` (title/author); verify escaping of `%` and `_` in `LIKE`
- Sorting whitelist:
  - updated_at/created_at/title/author/status only
- Pagination meta:
  - `meta.total_items` and `meta.total_pages` correct under varying counts

**Get/Update/Delete — `GET|PATCH|DELETE /books/:bookId`**

- Invalid UUID → `400 VALIDATION_ERROR`
- Not found / not owned → `404 NOT_FOUND`
- Patch invariants:
  - `current_page <= total_pages` always enforced (schema + service + DB check fallback)
  - Partial updates: update only `current_page`, only `total_pages`, both, or metadata
  - Setting series_id to null vs switching series: verify not found case and success
- Delete:
  - returns `204` and dependent records removed via DB cascading

##### Chapters (`/api/v1/books/:bookId/chapters` and `/api/v1/chapters/:chapterId`)

**Create/List under book**

- Create chapter with title, optional order (default 0) → `201`
- Create under non-owned/non-existent book → `404 NOT_FOUND`
- List sorts by `order` asc by default; pagination works

**Get/Update/Delete by id**

- Update title and/or order; reject empty title; reject negative order
- Delete chapter cascades to notes + embeddings via DB constraints; returns `204`

**Reordering**

- Validate UI-driven reordering results in correct persisted `order` values.
- Concurrency edge case:
  - two clients reorder simultaneously → last write wins; ensure UI handles stale ordering gracefully (E2E + exploratory)

##### Notes (`/api/v1/chapters/:chapterId/notes`, `/api/v1/notes`)

**Create**

- Create note under chapter → `201` with note DTO
- Content limits:
  - empty/whitespace-only rejected
  - >10,000 chars rejected
- Embedding status:
  - created note has `embedding_status="pending"`

**List — `GET /notes`**

- Filters:
  - chapter_id, book_id, series_id, embedding_status
- Join-based filters correctness:
  - `book_id` filter uses chapters join; `series_id` filter uses chapters→books join
- Pagination and sorting:
  - allowed sort fields (created_at/updated_at) only

**Get — `GET /notes/:noteId`**

- Default response includes note only
- `?include=context` includes `context` with book and chapter titles; verify DTO shape

**Update/Delete**

- Update content sets `embedding_status="pending"` (PoC behavior)
- Delete returns `204`; related embeddings deleted via cascade

#### 4.3 AI Query Functionality (`src/pages/api/v1/ai/query.ts`)

**Request validation**

- Malformed JSON → `400 VALIDATION_ERROR` “Invalid JSON…”
- Body schema:
  - `query_text` required, trimmed, 1..500 chars
  - `scope` optional, but **cannot specify both** `book_id` and `series_id` non-null
- Unauthorized → `401 NOT_ALLOWED`

**Scope verification**

- Scope with non-owned / non-existent `book_id` or `series_id` → `404 NOT_FOUND`
- Scope omitted → query runs across all notes for user (verify by behavior)

**Answer grounding and low confidence**

- With no notes in scope: context says “No notes…” and model should return `low_confidence=true` (validate UI shows low-confidence panel)
- With sufficient notes:
  - answer text should be non-empty
  - `low_confidence=false` when notes clearly contain answer
- Negative tests (anti-hallucination):
  - ask for information not in notes; expected `low_confidence=true` and answer explicitly states insufficient info

**OpenRouter failure modes (mocked or controlled)**

- Missing `OPENROUTER_API_KEY` → server error; verify returned `500 INTERNAL_ERROR` and logged error exists
- Rate limit / timeout / auth errors:
  - Verify error logging to `search_errors` with correct `source` (`llm` vs `database` vs `unknown`)
  - Verify the API returns `500 INTERNAL_ERROR` (current route behavior) and does not leak upstream body

**Observability / logging**

- A `search_logs` row is created per request (when DB insert succeeds)
- On error, a `search_errors` row is created and error message is truncated to 500 chars

#### 4.4 Reading Session Tracking

Reading sessions are **present in the DB types** (`reading_sessions`) but **postponed** and not exposed via API routes in `src/pages/api/v1/`.

**Current test approach**

- **Regression guard**: confirm no public API endpoints exist for reading sessions (route inventory test).
- **Schema integrity checks (DB-level, optional)**: verify cascades/foreign keys behave (book delete cascades to notes if configured).

**Forward-looking (when implemented)**

- Add integration + E2E for:
  - start session (prevent multiple active sessions per book/user)
  - stop session (idempotency, end_page validation)
  - optional update book progress on stop

### 5) Test Environment

**Environments**

- **Local development**
  - Astro dev server (`astro dev`)
  - Supabase local stack via Supabase CLI (recommended for unit/integration tests)
  - Mocked OpenRouter to keep tests deterministic
- **E2E Testing (Cloud environment)**
  - Dedicated Supabase cloud project separate from development and production
  - Astro dev server or deployed preview environment
  - Predefined test user account with known credentials
  - Real OpenRouter integration (or test-mode API key if available)
  - Environment isolated from development to prevent test data pollution
- **CI**
  - Typecheck + lint already present; add unit/integration/E2E as pipeline evolves
  - Unit/Integration: prefer local Supabase in CI runner
  - E2E: use dedicated cloud Supabase project with secure credential management

**Core configuration needs**

**Development & Integration Testing:**
- `SUPABASE_URL`, `SUPABASE_KEY` (SSR server client uses anon key; RLS relies on auth context)
- `OPENROUTER_API_KEY` (server-side only)

**E2E Testing (Cloud):**
- `E2E_SUPABASE_URL` - dedicated cloud Supabase project URL
- `E2E_SUPABASE_KEY` - dedicated cloud Supabase anon key
- `E2E_TEST_USER_ID` - UUID of predefined test user
- `E2E_TEST_USER_EMAIL` - email of predefined test user
- `E2E_TEST_USER_PASSWORD` - password of predefined test user

**HTTPS/cookie behavior note:**
- `src/db/supabase.client.ts` sets cookies `secure: true`; local tests should run in an HTTPS-capable setup (or provide a documented local override strategy) to avoid false negatives around auth cookies.
- E2E cloud environment should use HTTPS for production-like behavior

**Test data**

**Unit/Integration Tests:**
- Ephemeral test data created per test run (local Supabase)
- Cleaned up after test completion

**E2E Tests (Cloud):**
- Predefined test user account (manually created in E2E Supabase project):
  - User ID, email, and password stored in environment variables
  - User should have RLS policies applied like production
- Test data approach:
  - Tests create their own test data during test setup and clean up after completion
- Use deterministic fixtures for AI queries

**E2E Environment Setup Checklist:**
1. Create dedicated Supabase cloud project for E2E testing
2. Run all migrations on E2E project
3. Create test user account manually via Supabase dashboard or auth API
4. Document test user credentials in secure location (e.g., CI secrets, password manager)
5. Configure environment variables in `.env.local` or CI/CD platform
6. Verify RLS policies are enabled and functioning correctly
7. Test isolation: ensure tests don't interfere with each other (use unique data or cleanup strategies)

### 6) Testing Tools (Recommended)

**Unit + integration**

- **Vitest**: unit tests for schemas, services, helpers (TypeScript-native)
- **MSW**: mock `/api/v1/*` in component tests
- **nock** (or MSW in node mode): mock OpenRouter HTTP calls for deterministic AI tests
- **Supabase CLI**: local Postgres + auth for integration tests, including RLS policy verification

**React component tests**

- **React Testing Library** + **@testing-library/user-event**
- **happy-dom** or **jsdom** as test DOM

**E2E**

- **Playwright**: cross-browser flows; strong for Astro + React islands
- **Cloud Supabase**: dedicated E2E Supabase project for production-like testing
- **Environment variables**: test user credentials and E2E Supabase configuration loaded from `.env.local` or CI secrets

**Quality gates**

- ESLint + TypeScript (already configured)
- Optional: **axe-core** (Playwright/RTL integration) for accessibility checks on key pages

### 7) Test Schedule

**Phase 0 — Setup (1–2 days)**

- Establish environments:
  - Local Supabase for unit/integration tests
  - Dedicated cloud Supabase project for E2E tests
  - Configure environment variables for E2E (test user credentials, Supabase URL/key)
- Create test user in E2E Supabase project and document credentials securely
- Set up deterministic OpenRouter mock strategy for unit/integration tests
- Configure CI/CD secrets for E2E environment
- Add baseline smoke suite and CI execution (non-blocking at first)

**Phase 1 — High-risk functional coverage (3–5 days)**

- Middleware/auth flows (login/signup/logout/password reset + callback).
- CRUD API contract tests for series/books/chapters/notes including ownership isolation.
- Basic E2E journeys for “happy paths”.

**Phase 2 — AI reliability and safety (2–4 days)**

- AI query endpoint validation, scope behavior, low-confidence behavior.
- OpenRouter error handling tests and search_logs/search_errors logging.

**Phase 3 — Regression hardening (ongoing)**

- Expand E2E coverage for pagination/filter/sort, deletion cascades, reorder UX.
- Add performance baselines and lightweight load checks.

### 8) Test Acceptance Criteria

Release is acceptable when:

- **P0 flows pass** (auth, library CRUD, notes, ask):
  - No blocking defects in signup/login/password reset, CRUD operations, or AI query.
- **Security gates pass**:
  - Protected routes are not accessible without auth.
  - Cross-user access is blocked (API returns 404/401 as appropriate; DB does not leak data).
  - Password reset endpoint is enumeration-safe (`202` regardless of account existence).
- **API contract stability**:
  - All endpoints return documented status codes and `ApiErrorResponseDto` shape on error.
  - Validation errors include `details` where applicable.
- **Data integrity**:
  - Deletions cascade as expected (book delete removes chapters/notes; series cascade delete removes books and dependents).
  - Book progress invariants enforced (`current_page <= total_pages`).
- **AI behavior baseline**:
  - “Ask” never uses external knowledge beyond notes in scope (validated via test fixtures).
  - Low confidence is returned for unanswerable queries and the UI surfaces it.
- **No critical UX regressions**:
  - Key pages render; redirects work; major dialogs and forms function on supported browsers.

### 9) Roles and Responsibilities in the Testing Process

- **QA Engineer**
  - Owns test plan, test case design, automated suite health, release sign-off.
  - Maintains test data strategy and environment readiness.
- **Developers**
  - Write/maintain unit and integration tests near code changes.
  - Fix defects and add regression tests for discovered issues.
- **Tech Lead**
  - Ensures CI gating strategy and quality bar; triages architectural test gaps.
- **Product/Design**
  - Validate acceptance criteria for UX flows and error messaging; confirm PRD alignment.
- **DevOps/Platform (if applicable)**
  - Ensure staging/prod config parity; manage secrets; support Supabase/OpenRouter operational needs.

### 10) Bug Reporting Procedures

**Where to file**

- GitHub Issues (or project’s issue tracker), labeled by area:
  - `auth`, `middleware`, `api`, `db/rls`, `ui`, `ai`, `performance`

**Required bug report fields**

- **Title**: concise, action-oriented
- **Environment**: local/CI/staging/prod + commit SHA
- **Steps to reproduce**: numbered, minimal
- **Expected vs actual**
- **Impact / severity**
  - P0: security issue, data loss, broken login, broken core CRUD, crash
  - P1: major feature impaired with workaround
  - P2: minor defect or cosmetic issue
- **Artifacts**
  - Screenshots/video (UI), request/response logs (API), relevant console/server logs
  - Example payloads and IDs (sanitized)

**Triage + lifecycle**

- New issues triaged within 1 business day (P0 immediately).
- Fix includes:
  - root cause summary
  - test added/updated to prevent regression
  - verification notes (how it was tested)


## API Endpoint Implementation Plan: Series (`POST /api/v1/series`, `GET /api/v1/series`)

### 1. Endpoint Overview
- **Purpose**: Provide basic Series CRUD entry points for the Series resource.
  - **Create series**: `POST /api/v1/series`
  - **List series**: `GET /api/v1/series` with pagination, optional search by title, and sorting.
- **Auth**: Disabled for MVP iteration per spec; however **database rows still require `user_id`** (non-null FK to `auth.users.id`), so the API layer must supply a user context (see Security Considerations).
- **Content-Type**: `application/json; charset=utf-8`
- **IDs**: UUID strings
- **Timestamps**: ISO8601 strings (Supabase returns `timestamptz` as ISO strings)

### 2. Request Details

#### 2.1 `POST /api/v1/series`
- **Request body**
  - **Required**
    - `title: string` (non-empty after trimming)
  - **Optional**
    - `description?: string`
    - `cover_image_url?: string`
- **Notes**
  - Ignore/strip unknown fields (do not allow client to set `id`, `user_id`, `book_count`, `created_at`, `updated_at`).
  - `cover_image_url` should be validated as a URL if provided (soft validation is acceptable, but must prevent obviously invalid values).

#### 2.2 `GET /api/v1/series`
- **Query params**
  - **Optional**
    - `page?: number` (default **1**, min **1**)
    - `size?: number` (default **10**, min **1**, max **100**)
    - `q?: string` (title search; trim; if empty after trim treat as not provided)
    - `sort?: "created_at" | "updated_at" | "title"` (default: implementation choice; recommend `updated_at`)
    - `order?: "asc" | "desc"` (default **desc**)

### 3. Used Types
Use the existing shared DTOs / command models from `src/types.ts`:
- **Commands**
  - `CreateSeriesCommand`
- **DTOs**
  - `SeriesDto`
  - `SeriesListItemDto`
  - `CreateSeriesResponseDto`
  - `ListSeriesResponseDto`
  - `PaginationMetaDto`
  - `SeriesListQueryDto`
  - `ApiErrorResponseDto`, `ApiErrorDto`, `ApiErrorCode`

### 4. Response Details

#### 4.1 Success responses
- **`POST /series`**
  - **Status**: `201 Created`
  - **Body** (`CreateSeriesResponseDto`):
    - `{ series: SeriesDto }`
- **`GET /series`**
  - **Status**: `200 OK`
  - **Body** (`ListSeriesResponseDto`):
    - `{ series: SeriesListItemDto[], meta: PaginationMetaDto }`

#### 4.2 Error responses (all non-2xx)
- **Shape** (must match the API plan):
  - `{ error: { code: ApiErrorCode, message: string, details?: Json } }`
- **Status code guidance**
  - The API plan lists `422` for validation errors, but **implementation rules for this task require `400` for invalid input**. Use:
    - `400 Bad Request` + `code: "VALIDATION_ERROR"` for invalid input/query params/body.
  - Use:
    - `500 Internal Server Error` + `code: "INTERNAL_ERROR"` for unexpected server or database failures.
  - (Auth disabled) Do not emit `401` currently; reserve it for when auth is enabled.

### 5. Data Flow

#### 5.1 Common plumbing (Astro + Supabase)
- **Routing**
  - Create Astro endpoint file: `src/pages/api/v1/series/index.ts`
  - Implement:
    - `export const prerender = false`
    - `export async function POST(context)`
    - `export async function GET(context)`
- **Supabase access**
  - Use `context.locals.supabase` inside handlers (per project rules).
  - Ensure middleware sets `context.locals.supabase` (already present in `src/middleware/index.ts`).
- **User context (required even when auth is disabled)**
  - Because `public.series.user_id` is `NOT NULL` FK to `auth.users(id)`, the API must provide a user id for inserts.
  - Recommended MVP approach:
    - Add `DEV_USER_ID` (UUID) to environment variables and use it as the `user_id` for all writes and filters.
    - Ensure there is an `auth.users` row with this id in the dev environment.

#### 5.2 `POST /series` flow
1. Parse JSON body.
2. Validate with Zod schema (see Input Validation).
3. Resolve `user_id` (from `DEV_USER_ID`).
4. Insert into `public.series`:
   - values: `user_id`, `title`, `description`, `cover_image_url`
5. Select and return the inserted row as `SeriesDto` (omit `book_count`).

#### 5.3 `GET /series` flow
1. Parse and validate query params with Zod.
2. Compute pagination:
   - `page = max(1, page)`
   - `size = min(max(1, size), 100)`
   - `from = (page - 1) * size`
   - `to = from + size - 1`
3. Build a Supabase query:
   - base table: `public.series`
   - select: `id,title,created_at,updated_at`
   - filter by `user_id` (same user context strategy as above)
   - optional search: `ilike("title", %q%)`
   - sort: whitelist only (`created_at|updated_at|title`)
   - range: `.range(from, to)`
   - count: request exact count for pagination meta (`{ count: "exact" }`)
4. Return list + computed `meta`.

### 6. Security Considerations
- **User isolation**:
  - Always filter by an explicit `user_id` (from env) so data does not mix between dev users.
- **Injection / query manipulation**
  - Only allow whitelisted `sort` fields; never pass untrusted column names directly without a whitelist.
  - Use Supabase query builder (parameterized) for filters like `ilike`.
- **DoS / abuse**
  - Enforce `size <= 100` and reasonable `q` length (e.g., max 50 chars).
- **Input sanitization**
  - Store raw strings; if `description` is rendered as markdown/html later, sanitize on render to prevent XSS in the UI.

### 7. Error Handling
- **Validation errors (400)**
  - Missing/empty `title` on create
  - Invalid JSON body
  - Invalid query params (non-numeric `page/size`, out of range, invalid `sort/order`)
  - Invalid `cover_image_url` format (if validated as URL)
- **Database errors (500)**
  - Insert fails due to missing/invalid `user_id` (FK violation)
  - Supabase connectivity issues or unexpected Postgres errors
- **Error logging**
  - No dedicated “series error table” exists; do not write to `embedding_errors` or `search_errors` for these endpoints.
  - Log server-side errors to console with enough context:
    - method/path, a generated request id, and the Supabase error payload (avoid logging full request bodies if they can contain sensitive data).

### 8. Performance
- **List query efficiency**
  - Use indexed filtering on `series.user_id` (index exists per schema plan).
  - Use `ilike` on `title`
- **Pagination**
  - Use `range(from, to)` to avoid transferring large datasets.

### 9. Implementation Steps
1. **Create route file**
   - Add `src/pages/api/v1/series/index.ts` with `GET` and `POST` handlers.
   - Include `export const prerender = false`.
2. **Add Zod validation**
   - Add dependency: `zod`.
   - Create schemas (suggested location): `src/lib/validation/series.schemas.ts`
     - `createSeriesBodySchema`
     - `listSeriesQuerySchema`
3. **Create a Series service**
   - Add `src/lib/services/series.service.ts`:
     - `createSeries({ supabase, userId, command }): Promise<SeriesDto>`
     - `listSeries({ supabase, userId, query }): Promise<{ series: SeriesListItemDto[]; meta: PaginationMetaDto }>`
   - Keep the route handler thin: parse → validate → call service → map response.
4. **Standardize API responses**
   - Add small helpers (suggested): `src/lib/api/responses.ts`
     - `json<T>(status, body)`
     - `apiError(status, code, message, details?)` matching `ApiErrorResponseDto`
5. **User context strategy**
   - `DEV_USER_ID` env var 
6. **Implement `POST /series`**
   - Validate body.
   - Insert with `user_id`.
   - Return `201` and `CreateSeriesResponseDto`.
7. **Implement `GET /series`**
   - Validate query params; apply defaults and caps.
   - Query with count + range + optional `ilike` filter + whitelisted sort.
   - Return `200` and `ListSeriesResponseDto`.
8. **Add lightweight tests (optional but recommended)**
   - If the project has no test runner yet, add minimal integration tests later; for now, validate with manual calls via `curl` against `astro dev`.

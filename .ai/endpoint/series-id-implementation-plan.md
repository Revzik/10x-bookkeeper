## API Endpoint Implementation Plan: Series by ID (`GET|PATCH|DELETE /api/v1/series/:seriesId`)

## 1. Endpoint Overview
- **Purpose**: Provide read/update/delete operations for a single Series resource, including an optional dangerous cascade delete mode.
- **Base path**: `/api/v1`
- **Content type**: `application/json; charset=utf-8`
- **Auth**: Disabled for MVP iteration; API must still supply and enforce a `user_id` context because `public.series.user_id` is `NOT NULL` and all queries must be scoped to a user.
- **Resource**: `public.series`
  - Primary key: `id` (UUID)
  - Owner: `user_id` (UUID, FK to `auth.users(id)`)

## 2. Request Details

### 2.1 `GET /series/:seriesId`
- **Path params**
  - **Required**
    - `seriesId: uuid`

### 2.2 `PATCH /series/:seriesId`
- **Path params**
  - **Required**
    - `seriesId: uuid`
- **Request body**
  - **Optional fields** (at least one should be provided; otherwise `400 VALIDATION_ERROR`)
    - `title?: string` (when present: trimmed, non-empty)
    - `description?: string | null`
    - `cover_image_url?: string | null`
- **Normalization rules**
  - `title`: `trim()`; if empty after trimming → validation error.
  - `description`:
    - `null` should clear the column (`NULL`)
    - `undefined` leaves unchanged
  - `cover_image_url`:
    - `null` clears the column
    - if a string is provided:
      - either validate as URL, or accept empty string and normalize to `null` (recommend: accept `""` and normalize to `null` for client convenience, but keep the persisted value either `NULL` or a valid URL string).

### 2.3 `DELETE /series/:seriesId`
- **Path params**
  - **Required**
    - `seriesId: uuid`
- **Query params**
  - **Optional**
    - `cascade?: boolean` (accept `true|false`; default `false`)
- **Behavior**
  - **Default (`cascade=false`)**: delete the series row. Because `books.series_id` is `ON DELETE SET NULL`, books remain and are detached from the deleted series.
  - **Danger mode (`cascade=true`)**: delete all books in the series (which cascades to chapters, notes, embeddings, reading sessions via FKs), then delete the series row.
  - Operation is irreversible; require explicit `?cascade=true` to activate.

## 3. Response Details

### 3.1 Success responses

### `GET /series/:seriesId`
- **200 OK**

```json
{
  "series": {
    "id": "uuid",
    "title": "string",
    "description": "string|null",
    "cover_image_url": "string|null",
    "book_count": "number",
    "created_at": "iso",
    "updated_at": "iso"
  }
}
```

### `PATCH /series/:seriesId`
- **200 OK**

```json
{ "series": { "id": "uuid", "title": "string", "description": "string|null", "cover_image_url": "string|null", "book_count": "number", "created_at": "iso", "updated_at": "iso" } }
```

### `DELETE /series/:seriesId`
- **204 No Content**
- No response body.

### 3.2 Error responses (all non-2xx)
- **Shape** (must match `ApiErrorResponseDto`):

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": { "any": "json" }
  }
}
```

- **Status codes**
  - `400` + `VALIDATION_ERROR` for invalid path/query/body
  - `404` + `NOT_FOUND` when the series does not exist (or does not belong to the current user context)
  - `500` + `INTERNAL_ERROR` for unexpected database/server failures

## 4. Data Flow

### 4.1 Route file and handler structure (Astro)
- Implement a dynamic Astro API route:
  - `src/pages/api/v1/series/[seriesId].ts`
  - `export const prerender = false`
  - Handlers: `GET`, `PATCH`, `DELETE` (uppercase)
- Obtain Supabase client from `context.locals.supabase` (do not import the client directly inside route handlers).

### 4.2 User context strategy (MVP)
- Even with auth disabled, **every series operation must be scoped by `user_id`**.
- Use an MVP user context:
  - `const userId = import.meta.env.DEV_USER_ID`
  - If missing: log and return `500 INTERNAL_ERROR` (“Server configuration error”).
- Ensure every DB query includes `.eq("user_id", userId)` in addition to `.eq("id", seriesId)`.

### 4.3 Service extraction
- Extend the existing `src/lib/services/series.service.ts` with single-series methods, keeping route handlers thin.
- Suggested service API:
  - `getSeriesById({ supabase, userId, seriesId }): Promise<SeriesDto>`
  - `updateSeriesById({ supabase, userId, seriesId, command }): Promise<SeriesDto>`
  - `deleteSeriesById({ supabase, userId, seriesId, cascade }): Promise<void>`

### 4.4 DB access patterns (recommended)

#### GET
- Query `public.series` filtered by `(id, user_id)`.
- Select DTO fields:
  - `select("id, title, description, cover_image_url, book_count, created_at, updated_at")`
- If not found → `404 NOT_FOUND`.
- Build response:
  - return the selected row as `SeriesDto`

#### PATCH
- Validate body to produce an `UpdateSeriesCommand`.
- Recommended flow for clean 404 behavior:
  - First, check existence with a lightweight select filtered by `(id, user_id)`.
  - If not found → `404 NOT_FOUND`.
  - Then run update with the same filters and `.select(...).single()` to return the updated row.
- Let DB trigger update `updated_at`.

#### DELETE (non-cascade)
- Existence check filtered by `(id, user_id)`; if not found → `404 NOT_FOUND`.
- Delete series row filtered by `(id, user_id)`.
- Rely on FK `books.series_id ON DELETE SET NULL` for detaching books.

#### DELETE (cascade)
- Existence check filtered by `(id, user_id)`; if not found → `404 NOT_FOUND`.
- Perform the cascade in a safe order:
  1. Delete all books belonging to this user in the series: `delete from public.books where user_id = :userId and series_id = :seriesId`
     - This cascades to `chapters`, `notes`, `note_embeddings`, `reading_sessions` via `ON DELETE CASCADE`.
  2. Delete the series row: `delete from public.series where user_id = :userId and id = :seriesId`
- **Atomicity note**: If strict atomicity is required, implement a Postgres `SECURITY DEFINER` function (RPC) to perform both deletes in a single transaction. For MVP, a two-step delete is acceptable but should log failures clearly.

## 5. Security Considerations
- **Tenant isolation without auth**: Always scope reads/writes/deletes by `user_id = DEV_USER_ID`. Without that, disabling RLS for dev can expose cross-tenant data.
- **Dangerous cascade delete**:
  - Must require explicit `?cascade=true` to activate.
  - Log a clear audit-style message on cascade deletes (method/path, seriesId, userId, cascade=true).
  - Consider adding a second explicit confirmation mechanism in the future (e.g., header), but keep MVP aligned with spec.
- **Input validation**:
  - Validate `seriesId` as UUID to avoid leaking details via PostgREST error messages and to prevent unbounded queries.
  - Whitelist `include` and coerce `cascade` to boolean.

## 6. Error Handling

### 6.1 Validation errors → `400 VALIDATION_ERROR`
- `seriesId` is missing/invalid UUID
- `DELETE cascade` provided but not parseable to boolean
- `PATCH` body is invalid JSON
- `PATCH` has no updatable fields (empty body or only unknown keys)
- `PATCH title` provided but empty/whitespace
- `PATCH cover_image_url` provided but not a valid URL (if validating); optionally normalize `""` to `null`

### 6.2 Not found → `404 NOT_FOUND`
- No series exists with `(id=seriesId, user_id=userId)`
  - Applies to GET/PATCH/DELETE

### 6.3 Server/database errors → `500 INTERNAL_ERROR`
- Supabase connectivity errors
- Unexpected Postgres errors (constraint/permission issues)
- Partial failure during cascade delete (e.g., books deleted but series delete fails)
  - Return `500` and log structured context so it can be repaired manually.

### 6.4 Logging guidance
- Use `console.error` in route handlers for unexpected failures with structured context:
  - method, path, seriesId, userId, include/cascade, and Supabase error object
- Do **not** log full request bodies; log only safe summaries (e.g., which fields are being updated).

## 7. Performance
- **Queries**:
  - Select only needed columns.
  - Use `.single()` for single-row fetches.

## 8. Implementation Steps
1. **Add/extend validation schemas** in `src/lib/validation/series.schemas.ts`:
   - `seriesIdParamSchema`: `z.string().uuid()`
   - `updateSeriesBodySchema`: object allowing optional `title`, `description` (nullable), `cover_image_url` (nullable); enforce “at least one field”
   - `deleteSeriesQuerySchema`: coerce `cascade` to boolean with accepted string values (`true`, `false`)
2. **Extend `src/lib/services/series.service.ts`** with:
   - `getSeriesById`
   - `updateSeriesById` (scoped by user, returns updated DTO)
   - `deleteSeriesById` (cascade vs non-cascade behavior)
3. **Create the dynamic route** `src/pages/api/v1/series/[seriesId].ts`:
   - `export const prerender = false`
   - Implement `GET`, `PATCH`, `DELETE`
   - Use `context.locals.supabase`
   - Resolve `DEV_USER_ID` and fail fast with `500` when missing
   - Use `json()` and `apiError()` from `src/lib/api/responses.ts`
   - Use Zod error handling consistent with `src/pages/api/v1/series/index.ts`
4. **Manual verification checklist** (against a running dev server):
   - GET existing series returns `200` and correct shape
   - GET unknown id returns `404 NOT_FOUND`
   - PATCH updates a field and returns `200`; invalid title returns `400 VALIDATION_ERROR`
   - DELETE non-cascade returns `204` and leaves books present with `series_id = null`
   - DELETE `?cascade=1` returns `204` and removes books/chapters/notes under the series

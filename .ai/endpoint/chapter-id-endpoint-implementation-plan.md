# API Endpoint Implementation Plan: Chapter by ID (`GET /chapters/:chapterId`, `PATCH /chapters/:chapterId`, `DELETE /chapters/:chapterId`)

## 1. Endpoint Overview
- **Base path**: `/api/v1`
- **Resource**: `chapters` (`public.chapters`)
- **Purpose**:
  - Fetch a single chapter by ID
  - Update a chapter’s `title` and/or `order`
  - Delete a chapter (DB-level cascading deletes remove dependent notes/embeddings)
- **Auth**: Disabled for MVP; use `import.meta.env.DEV_USER_ID` as the effective `userId` (consistent with existing endpoints).
- **Content-Type**: `application/json; charset=utf-8`

## 2. Request Details

### 2.1 GET `/chapters/:chapterId`
- **HTTP Method**: `GET`
- **URL Structure**: `/api/v1/chapters/:chapterId`
- **Path parameters**:
  - **Required**: `chapterId` (UUID)
- **Request body**: none

### 2.2 PATCH `/chapters/:chapterId`
- **HTTP Method**: `PATCH`
- **URL Structure**: `/api/v1/chapters/:chapterId`
- **Path parameters**:
  - **Required**: `chapterId` (UUID)
- **Request body** (`application/json`):
  - **Optional**:
    - `title`: string (trimmed, non-empty if provided)
    - `order`: integer (recommended `min(0)` if provided)
  - **Constraints**:
    - At least one field must be present
    - Reject unknown fields

Example request:

```json
{ "title": "Chapter 2", "order": 2 }
```

### 2.3 DELETE `/chapters/:chapterId`
- **HTTP Method**: `DELETE`
- **URL Structure**: `/api/v1/chapters/:chapterId`
- **Path parameters**:
  - **Required**: `chapterId` (UUID)
- **Request body**: none

## 3. Used Types (DTOs and Command Models)
Use and/or reference the following existing types from `src/types.ts`:
- **DTOs**
  - `ChapterDto`
  - `GetChapterResponseDto` (`{ chapter: ChapterDto }`)
  - `UpdateChapterResponseDto` (`{ chapter: ChapterDto }`)
  - `ApiErrorResponseDto`
- **Command models**
  - `UpdateChapterCommand` (service-layer update model, `Partial<{ title; order }>` derived from DB types)

New validation schema types to add in `src/lib/validation/chapters.schemas.ts`:
- `chapterIdParamSchema` → infers `ChapterIdParam`
- `updateChapterBodySchema` → infers `UpdateChapterBody`

## 4. Response Details

### 4.1 GET `/chapters/:chapterId`
- **Success (200 OK)**:

```json
{
  "chapter": {
    "id": "uuid",
    "book_id": "uuid",
    "title": "string",
    "order": 0,
    "created_at": "iso",
    "updated_at": "iso"
  }
}
```

- **Errors**
  - **404 NOT_FOUND**: chapter not found
  - **500 INTERNAL_ERROR**: server-side failure

### 4.2 PATCH `/chapters/:chapterId`
- **Success (200 OK)**: same response shape as GET.
- **Errors**
  - **400 VALIDATION_ERROR**: invalid UUID / invalid JSON / invalid body / unknown fields
  - **404 NOT_FOUND**: chapter not found
  - **500 INTERNAL_ERROR**: server-side failure

### 4.3 DELETE `/chapters/:chapterId`
- **Success (204 NO CONTENT)**: no response body.
- **Errors**
  - **404 NOT_FOUND**: chapter not found
  - **500 INTERNAL_ERROR**: server-side failure

## 5. Data Flow

### 5.1 Route handler responsibilities (Astro API route)
Create `src/pages/api/v1/chapters/[chapterId].ts`:
- `export const prerender = false`
- Obtain Supabase client from `context.locals.supabase` (per backend rules).
- Resolve effective `userId` from `import.meta.env.DEV_USER_ID`; if missing:
  - Log `console.error("DEV_USER_ID environment variable is not set")`
  - Return `apiError(500, "INTERNAL_ERROR", "Server configuration error")`
- Validate `chapterId` using `chapterIdParamSchema`.

Handler-specific logic:
- **GET**
  - Call `getChapter({ supabase, userId, chapterId })`
  - Return `json(200, { chapter })`
- **PATCH**
  - Parse JSON body with `try/catch`; on failure return `apiError(400, "VALIDATION_ERROR", "Invalid JSON in request body")`
  - Validate with `updateChapterBodySchema` (include Zod error details in `details`)
  - Call `updateChapter({ supabase, userId, chapterId, command })`
  - Return `json(200, { chapter })`
- **DELETE**
  - Call `deleteChapter({ supabase, userId, chapterId })`
  - Return `new Response(null, { status: 204 })`

### 5.2 Service layer responsibilities
Extend `src/lib/services/chapters.service.ts` with:
- `getChapter({ supabase, userId, chapterId }): Promise<ChapterDto>`
- `updateChapter({ supabase, userId, chapterId, command }): Promise<ChapterDto>`
- `deleteChapter({ supabase, userId, chapterId }): Promise<void>`

Implementation guidelines (DB interactions):
- Always scope by `user_id`:
  - `.eq("id", chapterId).eq("user_id", userId)`
- **GET**:
  - Select: `id, book_id, title, order, created_at, updated_at`
  - If no row returned → throw `new NotFoundError("Chapter not found")`
- **PATCH**:
  - Construct update payload only from validated fields:
    - if `title` is `undefined`, don’t include it
    - if `order` is `undefined`, don’t include it
  - Execute `.update(payload).select(...).maybeSingle()` (or equivalent) and if no row → `NotFoundError`
- **DELETE**:
  - Prefer delete-with-returning to distinguish “not found” vs success:
    - `.delete().select("id").maybeSingle()`
    - If `data` is null → `NotFoundError`
  - Cascades are handled by DB foreign keys (`ON DELETE CASCADE`) for `notes` and downstream `note_embeddings` (confirm via migrations; no app-side cascading needed).

## 6. Security Considerations
- **Tenant isolation / IDOR**: Even with auth disabled, all reads/writes must filter by `user_id`. This is the primary control preventing cross-user access.
- **Input validation**:
  - UUID validation for `chapterId`
  - `.strict()` PATCH body to prevent mass assignment / unexpected fields
  - Enforce `order` as an integer and non-negative (aligns with “sorting order” semantics)
- **Future auth readiness**:
  - Keep the `userId` resolution in one guard clause so swapping to real auth (Supabase session) is localized.

## 7. Error Handling
- Use shared response helpers from `src/lib/api/responses.ts`:
  - `json(status, body)` for success
  - `apiError(status, code, message, details?)` for failures
- Error mapping:
  - **ZodError** (params/body) → `400 VALIDATION_ERROR` with `details = error.errors`
  - **NotFoundError** → `404 NOT_FOUND`
  - **Any other error** → `500 INTERNAL_ERROR`
- Logging (current convention):
  - Use `console.error` with structured context:
    - action (`getChapter`/`updateChapter`/`deleteChapter`)
    - `userId`, `chapterId`
    - for PATCH, include only the validated fields (not raw body)

## 8. Performance
- All operations are single-row by primary key (`chapters.id`) and scoped by `user_id`; expected to be fast.
- Ensure the DB has effective indexes (PK on `id` is implied; if queries commonly include `user_id`, a composite index may help, but likely unnecessary for MVP scale).
- PATCH should update only provided fields to minimize writes and avoid unnecessary trigger activity.

## 9. Implementation Steps
1. **Add validation schemas**
   - Update `src/lib/validation/chapters.schemas.ts`:
     - `export const chapterIdParamSchema = z.string().uuid("Invalid chapter ID format");`
     - `export const updateChapterBodySchema = z.object({ title: ..., order: ... }).strict().refine(...)`
     - Export inferred types (`ChapterIdParam`, `UpdateChapterBody`) as needed.
2. **Add/extend service functions**
   - Update `src/lib/services/chapters.service.ts`:
     - Implement `getChapter`, `updateChapter`, `deleteChapter`
     - Throw `NotFoundError` when the chapter is missing/not owned by the user.
3. **Create the API route**
   - Add `src/pages/api/v1/chapters/[chapterId].ts`:
     - `export const prerender = false`
     - Implement `GET`, `PATCH`, `DELETE` handlers using the existing endpoint structure:
       - `context.locals.supabase`
       - `DEV_USER_ID` guard
       - Zod validation (`ZodError` handling)
       - Service call + correct status codes (200/204)
       - Standardized error responses via `apiError`
4. **Verify response shapes and status codes**
   - Ensure GET and PATCH respond with `{ chapter: ChapterDto }` and **200**.
   - Ensure DELETE responds with **204** and no body.
   - Ensure all non-2xx responses match the standardized error shape and codes from `src/types.ts`.

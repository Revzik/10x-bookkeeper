## API Endpoint Implementation Plan: Books — `GET|PATCH|DELETE /api/v1/books/:bookId`

## 1. Endpoint Overview
Implement the book “by-id” route at `src/pages/api/v1/books/[bookId].ts` providing:
- `GET /api/v1/books/:bookId` to fetch a single book plus computed aggregates (`meta`).
- `PATCH /api/v1/books/:bookId` to update metadata/progress while enforcing progress invariants.
- `DELETE /api/v1/books/:bookId` to delete the book (DB cascades remove dependent rows).

This endpoint must follow the existing conventions in the repo:
- `export const prerender = false`
- Use `context.locals.supabase`
- Use Zod for validation, and `apiError()` / `json()` for responses
- Use `import.meta.env.DEV_USER_ID` for MVP scoping (no auth)

## 2. Request Details
- **HTTP Methods**: `GET`, `PATCH`, `DELETE`
- **URL Structure**: `/api/v1/books/:bookId`
- **Headers**:
  - `Content-Type: application/json; charset=utf-8` for `PATCH` requests (client side)
- **Path Parameters**:
  - **Required**:
    - `bookId` (UUID string)
- **Query Parameters**:
  - **None** (per current spec)
- **Request Body**:
  - **GET**: none
  - **PATCH**: JSON object with optional fields:
    - `title?: string`
    - `author?: string`
    - `total_pages?: number`
    - `current_page?: number`
    - `status?: "want_to_read" | "reading" | "completed"`
    - `series_id?: "uuid" | null`
    - `series_order?: number`
    - `cover_image_url?: string | null`
  - **DELETE**: none

### Used Types (DTOs and Command Models)
- **DTOs** (`src/types.ts`):
  - `GetBookResponseDto` (GET response)
  - `UpdateBookResponseDto` (PATCH response)
  - `BookDto`, `BookGetMetaDto`, `BookProgressMetaDto`, `BookActiveSessionMetaDto`
  - `ApiErrorResponseDto`, `ApiErrorCode`
- **Command Models** (`src/types.ts`):
  - `UpdateBookCommand` (service input for PATCH)
- **Validation types** (`src/lib/validation/books.schemas.ts`):
  - `BookIdParam` (already present)
  - Add `UpdateBookBody` (new)

## 3. Response Details

### `GET /api/v1/books/:bookId`
- **200 OK**:

```json
{
  "book": {
    "id": "uuid",
    "title": "string",
    "author": "string",
    "total_pages": 100,
    "current_page": 42,
    "status": "reading",
    "series_id": "uuid|null",
    "series_order": 1,
    "cover_image_url": "string|null",
    "created_at": "iso",
    "updated_at": "iso"
  },
}
```

- **404 NOT_FOUND**: when the book doesn’t exist for the user.

### `PATCH /api/v1/books/:bookId`
- **200 OK**:

```json
{ "book": { "id": "uuid", "title": "string", "author": "string", "total_pages": 100, "current_page": 42, "status": "reading", "series_id": "uuid|null", "series_order": 1, "cover_image_url": "string|null", "created_at": "iso", "updated_at": "iso" } }
```

- **400 VALIDATION_ERROR**: invalid fields or progress invariants fail.
- **404 NOT_FOUND**: book not found OR new `series_id` (non-null) not found for the user.

### `DELETE /api/v1/books/:bookId`
- **204 NO CONTENT**: successful deletion.
- **404 NOT_FOUND**: book not found.

## 4. Data Flow

### Shared request setup (all methods)
- Route handler reads:
  - `const supabase = context.locals.supabase`
  - `const userId = import.meta.env.DEV_USER_ID` (500 if missing)
- Validate `context.params.bookId` using `bookIdParamSchema`.

### GET data flow (book + meta)
1. Service queries `public.books`:
   - filter: `.eq("id", bookId).eq("user_id", userId)`
   - select fields matching `BookDto`
   - if no row, throw `NotFoundError("Book not found")`
2. Return `{ book }` with status 200.

### PATCH data flow (update book)
1. Parse JSON body with `await context.request.json()` (400 if invalid JSON).
2. Validate body with new `updateBookBodySchema` (see Validation section); recommend `.strict()` to reject unknown keys.
3. Service fetches existing book:
   - `select("id,total_pages,current_page,series_id,series_order,...")` scoped by `user_id`
   - if missing, throw `NotFoundError("Book not found")`
4. If `series_id` is present and non-null:
   - verify series exists for user (query `public.series` by id + user_id); if missing, throw `NotFoundError("Series not found")`
5. Validate progress invariants using a mix of:
   - Zod refinements for single-field constraints
   - service-level cross-check using `existingBook` when only one of `{ total_pages, current_page }` is provided
6. Apply update:
   - `.from("books").update(command).eq("id", bookId).eq("user_id", userId).select(<BookDto fields>).single()`
   - rely on DB constraint `check_progress` as a final guard; convert constraint errors to `400 VALIDATION_ERROR` when identifiable
7. Return `{ book }` with status 200.

### DELETE data flow (delete book)
1. Service checks existence (or relies on delete returning affected rows):
   - preferred: attempt delete with `.delete().eq("id", bookId).eq("user_id", userId).select("id").maybeSingle()`
   - if no row returned, throw `NotFoundError("Book not found")`
2. DB cascades remove:
   - `chapters` (FK on `chapters.book_id`)
   - `notes` (via chapters FK)
   - `note_embeddings` (via notes FK)
   - `reading_sessions` (FK on `reading_sessions.book_id`)
3. Return 204 with empty body.

## 5. Security Considerations
- **Scope every query by `user_id`** (even in MVP) to prevent accidental cross-user data exposure.
- **Do not accept `user_id` from request input**; always derive from server context (`DEV_USER_ID` now; authenticated user later).
- **Mass assignment protection**: reject unknown fields in PATCH (`z.object(...).strict()`).
- **Avoid leaking internal errors**: return `INTERNAL_ERROR` with generic message; log details server-side.

## 6. Error Handling

### Error mapping strategy (consistent with existing routes)
- Use `apiError(status, code, message, details?)` from `src/lib/api/responses.ts`.
- Catch `ZodError` and return `400 VALIDATION_ERROR` with `error.errors` as details.
- Catch `NotFoundError` and return `404 NOT_FOUND`.
- Log unexpected errors with `console.error(...)` and return `500 INTERNAL_ERROR`.

### Concrete cases
- **400 VALIDATION_ERROR**
  - invalid `bookId` UUID
  - invalid JSON body (PATCH)
  - invalid body shape/fields (PATCH)
  - business rules: negative/zero pages, `current_page > total_pages`, empty PATCH object
- **404 NOT_FOUND**
  - book not found for user
  - `series_id` provided and series not found for user
- **500 INTERNAL_ERROR**
  - Supabase errors not attributable to user input
  - unexpected runtime errors

## 7. Performance

## 8. Implementation Steps
1. **Add route file** `src/pages/api/v1/books/[bookId].ts`.
   - Export `prerender = false`.
   - Implement `GET`, `PATCH`, `DELETE` handlers following the `series/[seriesId].ts` style.
   - Use `context.locals.supabase` and `DEV_USER_ID`.
2. **Extend validation schemas** in `src/lib/validation/books.schemas.ts`.
   - Add `updateBookBodySchema` for PATCH:
     - `title`: trimmed non-empty string (optional)
     - `author`: trimmed non-empty string (optional)
     - `total_pages`: int, positive (optional)
     - `current_page`: int, min 0 (optional)
     - `status`: enum (optional)
     - `series_id`: uuid | null (optional; normalize empty string to null)
     - `series_order`: int, min 1 (optional)
     - `cover_image_url`: url | null (optional; normalize empty string to null)
     - `.strict()` and a refinement that rejects an empty object (recommended)
3. **Add/extend service functions** in `src/lib/services/books.service.ts`.
   - `getBookByIdWithMeta({ supabase, userId, bookId }): Promise<{ book; meta }>`
   - `updateBookById({ supabase, userId, bookId, command }): Promise<BookDto>`
   - `deleteBookById({ supabase, userId, bookId }): Promise<void>`
   - Reuse `NotFoundError` for 404 mapping.
4. **Implement GET aggregates** in `getBookByIdWithMeta`.
   - Fetch book first; throw `NotFoundError` if missing.
5. **Implement PATCH cross-field validation**.
   - After Zod parses basic types, fetch existing book for:
     - existence check
     - cross-checking `current_page` vs `total_pages` when only one is provided
   - If `series_id` is provided and non-null, verify series exists for user.
   - Apply update and return updated `BookDto`.
6. **Implement DELETE using scoped delete**.
   - Delete book by `id` + `user_id`.
   - If no row deleted, return 404.
   - Return 204; rely on DB cascades for dependent cleanup.
7. **Add high-signal logging**.
   - On failures, log `{ userId, bookId, operation, error }` (avoid logging entire request bodies containing untrusted large strings).
8. **Verification checklist**
   - `GET` returns `active_session: null` when none exists (even though example shows an object).
   - `PATCH` rejects invalid progress updates with 400.
   - `PATCH` returns 404 when `series_id` references a non-existent series.
   - `DELETE` returns 204 on success and 404 for unknown book IDs.

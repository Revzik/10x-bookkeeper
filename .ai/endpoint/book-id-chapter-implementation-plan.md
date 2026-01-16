## API Endpoint Implementation Plan: Chapters for a Book (`POST /books/:bookId/chapters`, `GET /books/:bookId/chapters`)

## 1. Endpoint Overview
- **Base path**: `/api/v1`
- **Endpoints**:
  - **POST** `/books/:bookId/chapters`: Create a chapter under a specific book.
  - **GET** `/books/:bookId/chapters`: List chapters for a specific book (paginated + sortable).
- **Auth**: Disabled for MVP. Current codebase uses `import.meta.env.DEV_USER_ID` as the effective user context; endpoints should follow this pattern until real auth is enabled.
- **Content-Type**: `application/json; charset=utf-8`
- **IDs**: UUID strings
- **Timestamps**: ISO8601 strings

## 2. Request Details

### 2.1 POST `/books/:bookId/chapters`
- **HTTP Method**: `POST`
- **URL Structure**: `/api/v1/books/:bookId/chapters`
- **Path parameters**:
  - **Required**: `bookId` (UUID)
- **Request body** (`application/json`):
  - **Required**:
    - `title`: string, non-empty after trim
  - **Optional**:
    - `order`: integer (recommend `min(0)`), default `0` if omitted

Example request:

```json
{ "title": "Chapter 1", "order": 1 }
```

### 2.2 GET `/books/:bookId/chapters`
- **HTTP Method**: `GET`
- **URL Structure**: `/api/v1/books/:bookId/chapters`
- **Path parameters**:
  - **Required**: `bookId` (UUID)
- **Query parameters**:
  - **Optional**:
    - `page`: number (default `1`, min `1`)
    - `size`: number (default `10`, min `1`, max `100`)
    - `sort`: one of `order|created_at|updated_at|title` (default `order`)
    - `order`: `asc|desc` (default `asc` for this endpoint, per spec “order asc”)

## 3. Used Types (DTOs and Command Models)

### 3.1 Existing shared types (already in `src/types.ts`)
- **DTOs**:
  - `ChapterDto`
  - `ChapterListItemDto`
  - `PaginationMetaDto`
  - `CreateChapterResponseDto`
  - `ListChaptersResponseDto`
- **Commands / Query DTOs**:
  - `CreateChapterCommand` (body for create)
  - `ChaptersListQueryDto` (query for listing)

### 3.2 New validation schema types (to add)
Create `src/lib/validation/chapters.schemas.ts` with:
- `createChapterBodySchema` → infers `CreateChapterBody`
- `listChaptersQuerySchema` → infers `ListChaptersQuery`
- Reuse `bookIdParamSchema` from `src/lib/validation/books.schemas.ts` (do not duplicate UUID validation logic)

## 4. Response Details

### 4.1 POST `/books/:bookId/chapters`
- **Success (201 CREATED)**:

```json
{
  "chapter": {
    "id": "uuid",
    "book_id": "uuid",
    "title": "string",
    "order": 1,
    "created_at": "iso",
    "updated_at": "iso"
  }
}
```

- **Errors**:
  - **400 VALIDATION_ERROR**:
    - invalid `bookId` UUID
    - invalid JSON body
    - missing/empty `title`
    - invalid `order` (non-integer / negative, if enforced)
  - **404 NOT_FOUND**:
    - book does not exist for current `DEV_USER_ID`
  - **500 INTERNAL_ERROR**:
    - missing `DEV_USER_ID`
    - Supabase errors / unexpected errors

### 4.2 GET `/books/:bookId/chapters`
- **Success (200 OK)**:

```json
{
  "chapters": [
    { "id": "uuid", "book_id": "uuid", "title": "string", "order": 1, "updated_at": "iso" }
  ],
  "meta": { "current_page": 1, "page_size": 10, "total_items": 100, "total_pages": 10 }
}
```

- **Errors**:
  - **400 VALIDATION_ERROR**:
    - invalid `bookId` UUID
    - invalid query params (e.g., `page < 1`, `size > 100`, non-whitelisted `sort`, invalid `order`)
  - **404 NOT_FOUND**:
    - book does not exist for current `DEV_USER_ID`
  - **500 INTERNAL_ERROR**:
    - missing `DEV_USER_ID`
    - Supabase errors / unexpected errors

## 5. Data Flow

### 5.1 Route handler responsibilities (Astro API route)
For both endpoints:
- Obtain Supabase client from `context.locals.supabase` (middleware already injects it).
- Read `userId` from `import.meta.env.DEV_USER_ID`; if missing return `apiError(500, "INTERNAL_ERROR", "Server configuration error")`.
- Validate `bookId` using `bookIdParamSchema`.

POST-specific:
- Parse JSON body with a `try/catch`; on parse error return `400 VALIDATION_ERROR` ("Invalid JSON in request body").
- Validate body with `createChapterBodySchema`.
- Call service `createChapter({ supabase, userId, bookId, command })`.
- Return `json(201, { chapter })`.

GET-specific:
- Parse query params from `new URL(context.request.url).searchParams`.
- Validate query params with `listChaptersQuerySchema` and map into a `ChaptersListQueryDto`.
- Call service `listChapters({ supabase, userId, bookId, query })`.
- Return `json(200, { chapters, meta })`.

### 5.2 Service layer responsibilities (new `src/lib/services/chapters.service.ts`)
Implement DB interactions and book existence checks:
- **Book existence check (required for both endpoints)**:
  - Query `books` with `.select("id").eq("id", bookId).eq("user_id", userId).maybeSingle()`.
  - If no row → throw `new NotFoundError("Book not found")`.
  - Rationale: prevents returning `200` with empty list for a non-existent book and matches API spec `404`.

POST create:
- Insert into `chapters` with `user_id`, `book_id`, `title`, `order` (default `0`).
- Select and return `ChapterDto` fields: `id, book_id, title, order, created_at, updated_at`.

GET list:
- Apply pagination: \(page\), \(size\) → `from`, `to` range.
- Query `chapters` filtered by `.eq("user_id", userId).eq("book_id", bookId)`.
- Select `id, book_id, title, order, updated_at` with `{ count: "exact" }` for pagination.
- Whitelist sort fields (`order`, `created_at`, `updated_at`, `title`) and apply `.order(sort, { ascending })`.
- Apply `.range(from, to)`.
- Return `{ chapters, meta }` where `meta.total_items = count ?? 0` and `total_pages = ceil(total_items / size)`.

## 6. Security Considerations
- **No auth in MVP**: endpoints rely on `DEV_USER_ID`; treat this as privileged configuration.
  - Ensure no user-controlled input can override `userId`.
  - Return **500** if `DEV_USER_ID` is not set (consistent with existing endpoints).
- **RLS alignment**: DB tables include `user_id`; services must always filter by `user_id` even if RLS is disabled in development migrations.
- **Injection prevention**:
  - Use a strict **sort field whitelist**; never pass arbitrary user strings to `.order(...)`.
  - Validate UUIDs and numeric pagination fields with Zod.

## 7. Error Handling

### 7.1 Standard error shape
All non-2xx responses must use the shared error shape produced by `apiError(...)` (already matches the spec).

### 7.2 Mapping errors to HTTP status + code
- **Zod validation errors**:
  - Return `apiError(400, "VALIDATION_ERROR", "...", error.errors)`
- **Invalid JSON body** (POST only):
  - Return `apiError(400, "VALIDATION_ERROR", "Invalid JSON in request body")`
- **NotFoundError** from service (book not found):
  - Return `apiError(404, "NOT_FOUND", "Book not found")`
- **Unexpected errors / Supabase errors**:
  - Log with `console.error` including `userId`, `bookId`, and for POST the `title` and `order` (avoid logging whole body if that grows later).
  - Return `apiError(500, "INTERNAL_ERROR", "Failed to <action>")`:
    - POST: "Failed to create chapter"
    - GET: "Failed to list chapters"

### 7.3 Error logging 
- Follow the current codebase convention: **log to `console.error`** with structured context.

## 8. Performance
- **Pagination**:
  - Use `.range(from, to)` and `{ count: "exact" }` (consistent with books listing).
  - Cap `size` at `100` in Zod schema to avoid large reads.
- **Sorting**:
  - Default sort for chapters should be `order asc` (spec).
  - Keep sorting fields whitelisted to avoid expensive/unindexed sorts where possible.
- **Book existence check**:
  - Adds one extra query per request; acceptable for MVP.

## 9. Implementation Steps
1. **Add validation schemas**
   - Create `src/lib/validation/chapters.schemas.ts`.
   - Implement:
     - `createChapterBodySchema`:
       - `title: z.string().trim().min(1, "Title is required and cannot be empty")`
       - `order: z.number().int("Order must be an integer").min(0, "Order cannot be negative").optional().default(0)`
       - `.strict()` to reject unknown fields (recommended for consistency with update schemas).
     - `listChaptersQuerySchema`:
       - `page`, `size` parsed from strings (same pattern as `listBooksQuerySchema`)
       - `sort: z.enum(["order","created_at","updated_at","title"]).default("order")`
       - `order: z.enum(["asc","desc"]).default("asc")`
2. **Add chapters service**
   - Create `src/lib/services/chapters.service.ts`.
   - Export:
     - `createChapter({ supabase, userId, bookId, command }): Promise<ChapterDto>`
     - `listChapters({ supabase, userId, bookId, query }): Promise<{ chapters: ChapterListItemDto[]; meta: PaginationMetaDto }>`
   - Implement the book existence check and throw `NotFoundError` when missing.
3. **Add API route file**
   - Create `src/pages/api/v1/books/[bookId]/chapters.ts` to match `/api/v1/books/:bookId/chapters`.
   - Implement `export const prerender = false`.
   - Implement `POST` and `GET` handlers using the same structure as existing endpoints:
     - `context.locals.supabase`
     - `DEV_USER_ID` guard
     - Zod validation with `ZodError` handling
     - service call + `json(...)` success responses
     - standardized `apiError(...)` failures
4. **Wire exports and imports**
   - Import `bookIdParamSchema` from `src/lib/validation/books.schemas.ts`.
   - Import new schemas from `src/lib/validation/chapters.schemas.ts`.
   - Import `NotFoundError` from `src/lib/errors.ts`.
   - Import `createChapter` / `listChapters` from `src/lib/services/chapters.service.ts`.
5. **Sanity checks**
   - Confirm responses match `CreateChapterResponseDto` and `ListChaptersResponseDto` shapes.
   - Ensure `GET` default sort/order is `order asc`.
   - Ensure all errors return the common error shape and correct status codes.

## API Endpoint Implementation Plan: Books (`POST /api/v1/books`, `GET /api/v1/books`)

### 1. Endpoint Overview
- **Purpose**:
  - `POST /api/v1/books`: Create a new book in the user’s library (optionally attached to a series).
  - `GET /api/v1/books`: List books with pagination, filtering, search, and sorting.
- **Base path**: `/api/v1`
- **Content-Type**: `application/json; charset=utf-8` (use `src/lib/api/responses.ts` helpers)
- **Auth (MVP)**: Disabled. Current pattern uses `import.meta.env.DEV_USER_ID` to scope data per user (see `src/pages/api/v1/series/*`).
- **Data store**: Supabase Postgres table `public.books` with RLS enabled in migrations (may be disabled in local dev via migration).

### 2. Request Details

#### 2.1 `POST /api/v1/books`
- **HTTP Method**: `POST`
- **URL**: `/api/v1/books`
- **Headers**:
  - `Content-Type: application/json` (client)
- **Body (JSON)**:
  - **Required**
    - `title`: `string` (non-empty after trimming)
    - `author`: `string` (non-empty after trimming)
    - `total_pages`: `number` (integer, `> 0`)
  - **Optional**
    - `series_id`: `uuid | null`
    - `series_order`: `number` (integer; recommended `>= 1` if provided)
    - `status`: `"want_to_read" | "reading" | "completed"`
    - `cover_image_url`: `string | null` (URL format when provided; normalize empty string to `null`)

#### 2.2 `GET /api/v1/books`
- **HTTP Method**: `GET`
- **URL**: `/api/v1/books`
- **Query params**:
  - **Optional (with defaults/constraints)**
    - `page`: number, default `1`, min `1`
    - `size`: number, default `10`, min `1`, max `100`
    - `series_id`: uuid (filter)
    - `status`: `"want_to_read" | "reading" | "completed"` (filter)
    - `q`: string (search in `title` and `author`; recommended trim + max length 50)
    - `sort`: one of `updated_at | created_at | title | author | status` (whitelist)
    - `order`: `asc | desc`, default `desc`

#### 2.3 Used Types (DTOs and Command Models)
Use existing shared types from `src/types.ts` (already aligned with DB schema and API response shapes):
- **Commands**
  - `CreateBookCommand` (for `POST /books`)
  - `BooksListQueryDto` (for `GET /books`)
- **DTOs / Responses**
  - `CreateBookResponseDto` (`{ book: BookDto }`)
  - `ListBooksResponseDto` (`{ books: BookListItemDto[]; meta: PaginationMetaDto }`)
  - `BookDto`, `BookListItemDto`, `PaginationMetaDto`, `SortOrderDto`, `BookStatus`
- **Validation types (to create)**
  - `CreateBookBody` inferred from Zod schema
  - `ListBooksQuery` inferred from Zod schema

### 3. Response Details

#### 3.1 `POST /api/v1/books`
- **Success (201 CREATED)**:

  - Body:
    - `book`: full `BookDto`:
      - `id`, `series_id`, `title`, `author`, `total_pages`, `current_page`, `status`, `series_order`, `cover_image_url`, `created_at`, `updated_at`

- **Errors** (all match common shape via `apiError()`):
  - `400 VALIDATION_ERROR`: invalid JSON, missing required fields, invalid enums, `total_pages <= 0`, invalid UUID format, invalid URL format
  - `404 NOT_FOUND`: `series_id` provided but not found for the user
  - `500 INTERNAL_ERROR`: unexpected DB / server errors

#### 3.2 `GET /api/v1/books`
- **Success (200 OK)**:
  - Body:
    - `books`: array of `BookListItemDto`:
      - `id`, `series_id`, `title`, `author`, `status`, `total_pages`, `current_page`, `updated_at`
    - `meta`: pagination metadata:
      - `current_page`, `page_size`, `total_items`, `total_pages`

- **Errors**:
  - `400 VALIDATION_ERROR`: invalid query params (bad numbers/UUIDs/enums), unsupported sort/order
  - `500 INTERNAL_ERROR`: unexpected DB / server errors

### 4. Data Flow

#### 4.1 Common flow (both endpoints)
1. **Astro API route** receives request in `src/pages/api/v1/books/index.ts`.
2. **Resolve Supabase client** from `context.locals.supabase` (middleware already sets it).
3. **Resolve user scope**:
   - MVP: read `import.meta.env.DEV_USER_ID`.
   - If absent, treat as a server configuration error (return `500 INTERNAL_ERROR`), consistent with existing endpoints.
4. **Validate input** using Zod (new `src/lib/validation/books.schemas.ts`).
5. **Call service layer** in `src/lib/services/books.service.ts` for DB interaction.
6. **Return response** using `json()` for 200/201 or `apiError()` for non-2xx, always with JSON content type.

#### 4.2 `POST /books` service flow
1. Validate and normalize fields:
   - Trim `title`/`author`
   - Normalize `series_id` and `cover_image_url` empty string to `null`
2. If `series_id` is a non-null UUID:
   - Verify series exists and belongs to `userId` (`select id from series where id = :seriesId and user_id = :userId`).
   - If not found, throw/return a domain `NotFoundError` so the route can return `404 NOT_FOUND`.
3. Insert into `books` with `user_id = userId` and validated fields (let DB defaults set `current_page`, `status` if omitted, timestamps).
4. Select and return the created row as `BookDto`.

#### 4.3 `GET /books` service flow
1. Apply defaults + constraints:
   - page \(>= 1\), size \(1..100\), order default `desc`, sort default `updated_at`
2. Build Supabase query on `books`:
   - `.eq("user_id", userId)`
   - Optional `.eq("series_id", seriesId)` when provided
   - Optional `.eq("status", status)` when provided
   - Optional search `q`:
     - Use `.or("title.ilike.%q%,author.ilike.%q%")` (ensure `q` is trimmed; consider escaping `%`/`_` defensively if needed)
3. Apply sorting (whitelist only) and pagination range:
   - `from = (page - 1) * size`, `to = from + size - 1`
   - `.order(sort, { ascending: order === "asc" })`
   - `.range(from, to)`
4. Return:
   - `books` list (selected fields only)
   - `meta` computed from `count` and `size`

### 5. Security Considerations
- **Authentication/Authorization**:
  - MVP: no auth; all requests are scoped by `DEV_USER_ID`.
- **RLS reliance**:
  - Migrations enable RLS on `books`; ensure production keeps RLS enabled and policies enforce `user_id` isolation.
  - Local dev may disable RLS via migration; service must still scope all queries by `user_id` to avoid accidental data leakage during development.
- **Input validation**:
  - Use strict Zod schemas to prevent invalid UUIDs, invalid enums, negative/zero totals, and malformed URLs.
- **Query abuse / DoS**:
  - Enforce `size <= 100`.
  - Limit `q` length (recommend `<= 50`) and trim whitespace.
- **Injection risks**:
  - Supabase query builder parameterizes values; still avoid constructing raw SQL.
  - For `or(ilike...)` strings, treat `q` conservatively; trim and optionally escape wildcard characters (`%`, `_`) if abuse becomes an issue.

### 6. Error Handling

#### 6.1 Standard error shape
All non-2xx responses must use `apiError(status, code, message, details?)` from `src/lib/api/responses.ts`.

#### 6.2 Error logging strategy
- **Server logs**: use `console.error()` with structured context (userId, route, validated inputs where safe).

#### 6.3 Error scenarios and status codes
- **400 VALIDATION_ERROR**
  - Invalid JSON body (`POST`)
  - Missing/empty `title`/`author`
  - `total_pages` not an integer or `<= 0`
  - Invalid `status`
  - Invalid `series_id` UUID format
  - Invalid `cover_image_url` URL format
  - Invalid query params (`page`, `size`, `order`, `sort`, `status`, `series_id`, etc.)
- **404 NOT_FOUND**
  - `POST` with `series_id` provided (non-null) but series doesn’t exist for the user
- **500 INTERNAL_ERROR**
  - Supabase insert/select errors
  - Unexpected runtime errors

### 7. Performance
- **Pagination + counts**:
  - Using `{ count: "exact" }` is simplest and consistent with existing services, but can be slower on large datasets. Acceptable for MVP.
- **Select only needed fields**:
  - `GET /books` should select only list-item fields, not full row, to reduce payload.

### 8. Implementation Steps
1. **Add validation schemas** in `src/lib/validation/books.schemas.ts`:
   - `createBookBodySchema`
     - `title`: `z.string().trim().min(1)`
     - `author`: `z.string().trim().min(1)`
     - `total_pages`: accept number; ensure `int` and `> 0`
     - `series_id`: `z.string().uuid().nullable().optional()` (also allow omission)
     - `series_order`: `z.number().int().min(1).optional()` (or allow `null` if clients send it; normalize to `undefined`/`null`)
     - `status`: `z.enum(["want_to_read","reading","completed"]).optional()`
     - `cover_image_url`: `z.string().trim().url().nullable().optional().transform(empty->null)`
   - `listBooksQuerySchema`
     - `page`/`size`: parse from string like `series.schemas.ts` and enforce bounds
     - `series_id`: optional UUID
     - `status`: enum
     - `q`: trim + max length
     - `sort` and `order`: enums with defaults
2. **Create service layer** `src/lib/services/books.service.ts`:
   - `createBook({ supabase, userId, command }: { ... }): Promise<BookDto>`
     - If `command.series_id` non-null: check existence in `series` scoped by `user_id`, else throw `NotFoundError`.
     - Insert into `books`, select full `BookDto` fields, `.single()`.
   - `listBooks({ supabase, userId, query }: { ... }): Promise<{ books: BookListItemDto[]; meta: PaginationMetaDto }>`
     - Apply filters, search, sorting, pagination, and compute `meta`.
3. **Add API route** `src/pages/api/v1/books/index.ts`:
   - `export const prerender = false`
   - `POST(context)`:
     - Read `context.locals.supabase`
     - Read `DEV_USER_ID` (return `500` if missing)
     - Parse JSON body with try/catch (return `400` on invalid JSON)
     - Validate with Zod (return `400` with details on `ZodError`)
     - Call `createBook()`
     - Map `NotFoundError` (series) to `404 NOT_FOUND`
     - Return `json(201, { book })`
   - `GET(context)`:
     - Parse query params from `new URL(context.request.url)`
     - Validate with Zod (return `400` with `ZodError` details)
     - Call `listBooks()`
     - Return `json(200, { books, meta })`
4. **Consistency checks**
   - Ensure responses match `src/types.ts` DTO shapes exactly.
   - Ensure the API returns the standardized error object for all non-2xx.
5. **Manual verification checklist**
   - `POST /books` creates a book and returns `201` with full `book` object.
   - `POST /books` with invalid fields returns `400 VALIDATION_ERROR` with Zod `errors` in `details`.
   - `POST /books` with nonexistent `series_id` returns `404 NOT_FOUND`.
   - `GET /books` returns paginated list and correct `meta`.
   - Filters (`series_id`, `status`), search (`q`), sorting (`sort`, `order`), and pagination (`page`, `size`) behave as specified.

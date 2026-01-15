## API Endpoint Implementation Plan: Notes (`POST /api/v1/chapters/:chapterId/notes`, `GET /api/v1/notes`)

### 1. Endpoint Overview
- **Purpose**:
  - `POST /api/v1/chapters/:chapterId/notes`: Create a note under a chapter. The note is created with `embedding_status = "pending"` to **enqueue** embedding generation. Embedding is postponed after a working PoC is established.
  - `GET /api/v1/notes`: List notes with pagination and filters (supports “View Book Notes” grouped by chapter on the client).
- **Base path**: `/api/v1`
- **Content-Type**: `application/json; charset=utf-8` (use `src/lib/api/responses.ts` helpers)
- **Auth (MVP)**: Disabled. Current project pattern uses `import.meta.env.DEV_USER_ID` to scope data per user.
- **Data store**: Supabase Postgres table `public.notes` (RLS enabled in migrations; may be disabled locally for development via migration).

### 2. Request Details

#### 2.1 `POST /api/v1/chapters/:chapterId/notes`
- **HTTP Method**: `POST`
- **URL**: `/api/v1/chapters/:chapterId/notes`
- **Path params**:
  - **Required**
    - `chapterId`: `uuid` (chapter the note belongs to)
- **Body (JSON)**:
  - **Required**
    - `content`: `string` (non-empty after trimming)
  - **Optional (recommended enforcement for MVP hardening)**
    - Enforce a max length (10k chars).

#### 2.2 `GET /api/v1/notes`
- **HTTP Method**: `GET`
- **URL**: `/api/v1/notes`
- **Query params**:
  - **Optional (with defaults/constraints)**
    - `page`: number, default `1`, min `1`
    - `size`: number, default `10`, min `1`, max `100`
    - `book_id`: `uuid` (filter via join `notes -> chapters -> books`)
    - `chapter_id`: `uuid` (filter)
    - `series_id`: `uuid` (filter via join `notes -> chapters -> books -> series`)
    - `embedding_status`: `"pending" | "processing" | "completed" | "failed"` (filter)
    - `sort`: one of `created_at | updated_at`
    - `order`: `asc | desc`, default `desc`

#### 2.3 Used Types (DTOs and Command Models)
Use existing shared types from `src/types.ts` (already aligned with DB schema and API response shapes):
- **Commands**
  - `CreateNoteCommand` (for `POST /chapters/:chapterId/notes`)
  - `NotesListQueryDto` (for `GET /notes`)
- **DTOs / Responses**
  - `CreateNoteResponseDto` (`{ note: NoteDto }`)
  - `ListNotesResponseDto` (`{ notes: NoteListItemDto[]; meta: PaginationMetaDto }`)
  - `NoteDto`, `NoteListItemDto`, `PaginationMetaDto`, `SortOrderDto`, `EmbeddingStatus`
- **Validation types (to create)**
  - `CreateNoteBody` inferred from Zod schema
  - `ListNotesQuery` inferred from Zod schema

### 3. Response Details

#### 3.1 `POST /api/v1/chapters/:chapterId/notes`
- **Success (201 CREATED)**:
  - Body: `CreateNoteResponseDto`
    - `note` (full `NoteDto`):
      - `id`, `chapter_id`, `content`, `embedding_status` (must be `"pending"`), `embedding_duration` (`null`), `created_at`, `updated_at`
- **Errors** (all match common shape via `apiError()`):
  - `400 VALIDATION_ERROR`: invalid UUID param, invalid JSON, missing/empty `content`, (optional) `content` too large
  - `404 NOT_FOUND`: chapter not found for the user
  - `500 INTERNAL_ERROR`: unexpected DB/server errors

#### 3.2 `GET /api/v1/notes`
- **Success (200 OK)**:
  - Body: `ListNotesResponseDto`
    - `notes`: `NoteListItemDto[]` (id, chapter_id, content, embedding_status, created_at, updated_at)
    - `meta`: `{ current_page, page_size, total_items, total_pages }`
- **Errors**:
  - `400 VALIDATION_ERROR`: invalid query params (bad UUIDs, unknown enum values, invalid numbers, unsupported sort/order)
  - `500 INTERNAL_ERROR`: unexpected DB/server errors

### 4. Data Flow

#### 4.1 Common flow (both endpoints)
1. **Astro API route** receives request:
   - `POST`: `src/pages/api/v1/chapters/[chapterId]/notes.ts` (new)
   - `GET`: `src/pages/api/v1/notes/index.ts` (new)
2. **Resolve Supabase client** from `context.locals.supabase` (middleware already sets it).
3. **Resolve user scope**:
   - MVP: `const userId = import.meta.env.DEV_USER_ID`
   - If absent: log `console.error` and return `500 INTERNAL_ERROR` (“Server configuration error”), matching existing endpoints.
4. **Validate input** using Zod:
   - Path params + body for `POST`
   - Query params for `GET`
5. **Call service layer** in `src/lib/services` for DB interaction.
6. **Return response** using `json()` for 200/201 or `apiError()` for non-2xx.

#### 4.2 `POST /chapters/:chapterId/notes` service flow
1. **Verify chapter exists and belongs to the user**:
   - Recommended: add `verifyChapterExists({ supabase, userId, chapterId })` in `src/lib/services/chapters.service.ts` (mirrors `verifyBookExists`) or reuse `getChapter()` as a guard.
   - If not found: throw `NotFoundError("Chapter not found")`.
2. **Insert note** into `public.notes`:
   - Set `user_id = userId`
   - Set `chapter_id = chapterId`
   - Set `content = command.content`
   - Set `embedding_status = 'pending'` (explicitly, no embedding job at this stage)
   - Do not set `embedding_duration` (leave null)
3. **Select and return** the inserted row fields matching `NoteDto`.

#### 4.3 `GET /notes` service flow
1. Apply defaults + constraints:
   - `page >= 1`, `size 1..100`
   - `order` default `desc`
   - `sort` default `updated_at`
2. Build a `notes` query scoped to the user:
   - `.from("notes")`
   - `.select("id, chapter_id, content, embedding_status, created_at, updated_at", { count: "exact" })`
   - `.eq("user_id", userId)`
3. Apply filters:
   - `chapter_id`: `.eq("chapter_id", chapterId)` when provided
   - `embedding_status`: `.eq("embedding_status", embeddingStatus)` when provided
   - `book_id` / `series_id`:
     - use PostgREST embedded join for filtering, then **omit embedded data** from the returned rows.
4. Apply sorting (whitelist) and pagination:
   - `.order(sort, { ascending: order === "asc" })`
   - `.range(from, to)`
5. Return:
   - `notes` list (only `NoteListItemDto` fields)
   - `meta` computed from `count` using `buildPaginationMeta()`

### 5. Security Considerations
- **Auth is disabled for MVP**:
  - The endpoint must still apply **strict per-user scoping** by always filtering/inserting `user_id = DEV_USER_ID`.
- **RLS and policy assumptions**:
  - Migrations define RLS policies for `notes`.
  - Local dev may disable RLS; do not rely on that—always scope queries by `user_id` in services.
- **Input hardening**:
  - Enforce `.strict()` Zod schemas for bodies to reject unknown fields.
  - Consider maximum request body size / `content` max length to mitigate abuse (notes can be large).
- **Injection / query safety**:
  - Use Supabase query builder (parameterized).
  - Avoid raw SQL; if filtering via joins becomes complex, consider adding a DB view or RPC later.

### 6. Error Handling

#### 6.1 Standard error shape
All non-2xx responses must use `apiError(status, code, message, details?)` from `src/lib/api/responses.ts`.

#### 6.2 Where to log errors (database vs server logs)
- **Server logs (API routes)**:
  - Use `console.error()` with structured context: `{ action, userId, chapterId, query, error }`

#### 6.3 Error scenarios and status codes
- **400 VALIDATION_ERROR**
  - Invalid `chapterId` UUID
  - Invalid JSON body
  - Missing/empty `content` after trimming
  - (Optional hardening) `content` exceeds max length
  - Invalid query params: `page`, `size`, `book_id`, `chapter_id`, `series_id`, `embedding_status`, `sort`, `order`
- **404 NOT_FOUND**
  - Chapter does not exist (or not owned by the user) when creating a note
- **500 INTERNAL_ERROR**
  - Supabase query errors (insert/select/count)
  - Unexpected runtime errors

### 7. Performance
- **Indexes**:
  - `notes(user_id)` and `notes(chapter_id)` indexes exist per schema plan; these support the common filters.
  - Filtering by `book_id` / `series_id` requires joins—ensure `chapters(book_id)` and `books(series_id)` indexes exist (they do in the schema plan).
- **Pagination counts**:
  - `{ count: "exact" }` is consistent with existing endpoints; acceptable for MVP, but can be expensive at scale.
- **Payload control**:
  - Notes content can be large; consider a future “summary/list view” that returns truncated content, but keep current contract as specified.

### 8. Implementation Steps
1. **Add validation schemas** in `src/lib/validation/notes.schemas.ts` (new):
   - `createNoteBodySchema`:
     - `content`: `z.string().trim().min(1, "Content is required and cannot be empty")`
     - (optional) `.max(N, "Content cannot exceed N characters")`
     - `.strict()`
   - `listNotesQuerySchema`:
     - `page`, `size`, `order`: reuse `paginationPageSchema`, `paginationSizeSchema`, `paginationOrderSchema` from `src/lib/validation/shared.schemas.ts`
     - `book_id`, `chapter_id`, `series_id`: `z.string().uuid().optional()`
     - `embedding_status`: `z.enum(["pending", "processing", "completed", "failed"]).optional()`
     - `sort`: `z.enum(["created_at", "updated_at"]).optional().default("created_at")`
2. **Add/extend service layer**:
   - Create `src/lib/services/notes.service.ts` (new):
     - `createNote({ supabase, userId, chapterId, command }): Promise<NoteDto>`
       - verify chapter exists for user (see next bullet)
       - insert into `notes` with `embedding_status = "pending"`
       - select and return `NoteDto` fields
     - `listNotes({ supabase, userId, query }): Promise<{ notes: NoteListItemDto[]; meta: PaginationMetaDto }>`
       - apply filters (chapter_id, embedding_status)
       - implement `book_id`/`series_id` filtering (document chosen approach)
       - apply sort/order and pagination range using `applyPaginationConstraints`
       - compute meta with `buildPaginationMeta`
   - Add `verifyChapterExists({ supabase, userId, chapterId })` in `src/lib/services/chapters.service.ts` (recommended) to mirror `verifyBookExists`.
3. **Add API route** for creation:
   - Create `src/pages/api/v1/chapters/[chapterId]/notes.ts`:
     - `export const prerender = false`
     - `POST(context)`:
       - guard `DEV_USER_ID`
       - validate `chapterId` using `chapterIdParamSchema` (already exists in `chapters.schemas.ts`)
       - parse JSON with try/catch
       - validate body with `createNoteBodySchema`
       - call `createNote()`
       - return `json(201, { note })`
       - map errors:
         - `ZodError` -> `400 VALIDATION_ERROR` (include `error.errors` in `details`)
         - `NotFoundError` -> `404 NOT_FOUND`
         - default -> log + `500 INTERNAL_ERROR`
4. **Add API route** for listing:
   - Create `src/pages/api/v1/notes/index.ts`:
     - `export const prerender = false`
     - `GET(context)`:
       - guard `DEV_USER_ID`
       - parse query params from `new URL(context.request.url)`
       - validate with `listNotesQuerySchema`
       - call `listNotes()`
       - return `json(200, { notes, meta })`
       - map errors:
         - `ZodError` -> `400 VALIDATION_ERROR`
         - default -> log + `500 INTERNAL_ERROR`
5. **Manual verification checklist**
   - `POST /chapters/:chapterId/notes` returns `201` with `embedding_status: "pending"` and `embedding_duration: null`.
   - `POST` returns `404` when chapter does not exist (or is not owned by user).
   - `GET /notes` returns correct pagination `meta`.
   - `GET /notes` filters properly by `chapter_id`, `book_id`, `series_id`, and `embedding_status`.
   - `GET /notes` sorting works only for `created_at|updated_at` and respects `order`.

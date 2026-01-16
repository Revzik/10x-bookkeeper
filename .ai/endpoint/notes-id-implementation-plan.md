## API Endpoint Implementation Plan: Notes (By ID)

## 1. Endpoint Overview
- **Base path**: `/api/v1`
- **Resource**: `notes`
- **Endpoints covered**:
  - **GET** `/notes/:noteId` — fetch one note; optionally include chapter/book context via `include=context`
  - **PATCH** `/notes/:noteId` — update note content (PoC: set `embedding_status` to `pending`; embedding recalculation is postponed)
  - **DELETE** `/notes/:noteId` — delete note
- **Auth**: Disabled for MVP; implementation still scopes by `user_id` using `import.meta.env.DEV_USER_ID` and `.eq("user_id", userId)` in all DB queries.
- **Content type**: `application/json; charset=utf-8` (use `json()` helper)
- **IDs**: UUID strings (validate path params)
- **Timestamps**: ISO8601 strings (returned from DB)

## 2. Request Details

### GET `/notes/:noteId`
- **Path params**
  - **Required**: `noteId` (UUID)
- **Query params**
  - **Optional**: `include` = `"context"`
    - When present, response includes `context` object `{ book_id, book_title, chapter_id, chapter_title }`
- **Request body**: none

### PATCH `/notes/:noteId`
- **Path params**
  - **Required**: `noteId` (UUID)
- **Request body** (JSON)

```json
{ "content": "updated markdown..." }
```

- **Notes**
  - Enforce `.strict()` and reject unknown fields.
  - Trim content; enforce non-empty.
  - PoC requirement: set `embedding_status` to `"pending"` on update (even though full embedding recomputation is postponed).

### DELETE `/notes/:noteId`
- **Path params**
  - **Required**: `noteId` (UUID)
- **Request body**: none

## 3. Used Types (DTOs and Command Models)

### Existing shared types (`src/types.ts`)
- **DTOs**
  - `NoteDto` (for GET)
  - `NoteContextDto` (for GET with `include=context`)
  - `GetNoteResponseDto` `{ note: NoteDto; context?: NoteContextDto }`
  - `UpdateNoteResponseDto` `{ note: Pick<NoteEntity, "id" | "content" | "embedding_status" | "updated_at"> }`
- **Query DTO**
  - `NoteGetQueryDto` `{ include?: "context" }`
- **Command models**
  - `UpdateNoteCommand` (currently `Pick<TablesUpdate<"notes">, "content">`)

### New/updated Zod-inferred types (to add)
- `NoteIdParam` (UUID string)
- `NoteGetQuery` (optional `include`)
- `UpdateNoteBody` (required `content`)

## 4. Response Details

### GET `/notes/:noteId`
- **200 OK**
  - Without include:

```json
{
  "note": { "id": "uuid", "chapter_id": "uuid", "content": "string", "embedding_status": "completed", "embedding_duration": 123, "created_at": "iso", "updated_at": "iso" }
}
```

  - With `include=context`:

```json
{
  "note": { "id": "uuid", "chapter_id": "uuid", "content": "string", "embedding_status": "completed", "embedding_duration": 123, "created_at": "iso", "updated_at": "iso" },
  "context": { "book_id": "uuid", "book_title": "string", "chapter_id": "uuid", "chapter_title": "string" }
}
```

- **404 NOT FOUND** → `apiError(404, "NOT_FOUND", ...)`

### PATCH `/notes/:noteId`
- **200 OK**

```json
{ "note": { "id": "uuid", "content": "string", "embedding_status": "pending", "updated_at": "iso" } }
```

- **400 BAD REQUEST** → `VALIDATION_ERROR` (invalid UUID, invalid JSON, invalid body)
- **404 NOT FOUND** → `NOT_FOUND` (note not found in user scope)

### DELETE `/notes/:noteId`
- **204 NO CONTENT** (no response body)
- **404 NOT FOUND** → `NOT_FOUND`

## 5. Data Flow

### Shared route guardrails (all handlers)
- Read `supabase` via `context.locals.supabase` (per backend rules).
- Resolve `userId` via `import.meta.env.DEV_USER_ID`.
  - If missing, log `console.error(...)` and return `apiError(500, "INTERNAL_ERROR", "Server configuration error")`.
- Validate `noteId` with Zod param schema (return 400 on invalid UUID).
- Use `json()` / `apiError()` helpers from `src/lib/api/responses.ts`.

### GET flow
1. Parse `noteId` (UUID).
2. Parse query parameters and validate `include` (only `"context"` allowed).
3. Call service `getNoteById({ supabase, userId, noteId, includeContext })`.
4. Service queries:
   - Always: `notes` filtered by `.eq("id", noteId).eq("user_id", userId)`
   - If `includeContext`:
     - Join `chapters` and `books` to obtain:
       - `chapter_id` from `chapters.id`
       - `chapter_title` from `chapters.title`
       - `book_id` from `chapters.book_id`
       - `book_title` from `chapters.books.title`
5. Map DB row(s) into `GetNoteResponseDto` (ensure join payload is not leaked beyond `context`).

### PATCH flow
1. Parse `noteId` (UUID).
2. Parse JSON body (return 400 if JSON parse fails).
3. Validate body via `updateNoteBodySchema` (content required, trimmed, non-empty, max length).
4. Call service `updateNoteById({ supabase, userId, noteId, command })`.
5. Service performs:
   - Update `notes` where `id` + `user_id` match.
   - Set `content = command.content`
   - Set `embedding_status = "pending"` (per endpoint contract; actual embedding job is postponed)
   - Return `id, content, embedding_status, updated_at` via `.select(...).single()`
6. Return `UpdateNoteResponseDto` with 200.

### DELETE flow
1. Parse `noteId` (UUID).
2. Call service `deleteNoteById({ supabase, userId, noteId })`.
3. Service performs:
   - `.from("notes").delete().eq("id", noteId).eq("user_id", userId).select("id").maybeSingle()`
   - If no row returned, throw `NotFoundError`.
4. Return 204.

## 6. Security Considerations
- **IDOR prevention (critical even without auth)**:
  - Always scope by `user_id` in service queries (`.eq("user_id", userId)`).
- **Input validation**:
  - Validate UUID path param and whitelist `include` values.
  - Enforce `content` max length to limit payload size and reduce risk of abuse.
  - Use `.strict()` schemas to prevent silent acceptance of unexpected fields.
- **Data leakage**:
  - For `include=context`, only return `book_id`, `book_title`, `chapter_id`, `chapter_title` (do not return full joined objects).

## 7. Error Handling

### Error shape (use `apiError`)

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": { "any": "json" }
  }
}
```

### Expected error scenarios
- **400 VALIDATION_ERROR**
  - `noteId` is not a UUID
  - GET: `include` is present but not `"context"`
  - PATCH: invalid JSON body
  - PATCH: missing/empty `content`, `content` exceeds max length, unknown fields present
- **404 NOT_FOUND**
  - Note does not exist for the current `userId`
- **500 INTERNAL_ERROR**
  - Supabase query errors / unexpected exceptions
  - Misconfiguration: missing `DEV_USER_ID`

### Error logging / error tables
- There is **no established “API errors” table logging pattern** in the current codebase; existing routes log via `console.error(...)`.
- For this endpoint:
  - **Default**: log structured `console.error` with `action`, `userId`, `noteId`, and the caught `error`.

## 8. Performance Considerations
- **Query shape**:
  - `GET`/`PATCH`/`DELETE` are single-row operations by PK (`notes.id`) + `user_id` filter; should be fast.
  - `include=context` adds joins (`notes -> chapters -> books`); keep select list minimal to reduce payload and query work.
- **Payload limits**:
  - Enforce `content <= 10,000` chars (existing pattern) to cap request/response sizes.
- **Avoid extra round trips**:
  - Use `.update(...).select(...).single()` to update + return in one DB call.

## 9. Implementation Steps
1. **Add API route file**
   - Create `src/pages/api/v1/notes/[noteId].ts`
   - `export const prerender = false`
   - Implement `GET`, `PATCH`, `DELETE` following the established patterns in:
     - `src/pages/api/v1/books/[bookId].ts`
     - `src/pages/api/v1/chapters/[chapterId].ts`
2. **Add validation schemas**
   - Update `src/lib/validation/notes.schemas.ts` to include:
     - `noteIdParamSchema = z.string().uuid("Invalid note ID format")`
     - `noteGetQuerySchema = z.object({ include: z.enum(["context"]).optional() })` (and ignore/omit unknown keys)
     - `updateNoteBodySchema` (same constraints as `createNoteBodySchema`, but required)
3. **Extend notes service**
   - Update `src/lib/services/notes.service.ts` with:
     - `verifyNoteExists({ supabase, userId, noteId })` (optional helper, consistent with `verifyBookExists`)
     - `getNoteById({ supabase, userId, noteId, includeContext })`
     - `updateNoteById({ supabase, userId, noteId, command })` (sets `embedding_status: "pending"`)
     - `deleteNoteById({ supabase, userId, noteId })`
   - Ensure all service methods scope by `user_id`.
4. **Wire route handlers to services**
   - Parse/validate path + query/body.
   - Convert service errors:
     - `NotFoundError` → 404 `NOT_FOUND`
     - `ZodError` → 400 `VALIDATION_ERROR` with `error.errors` in `details`
     - Unexpected → 500 `INTERNAL_ERROR`
5. **Add/confirm DTO alignment**
   - Ensure responses conform to existing types in `src/types.ts`:
     - `GetNoteResponseDto`
     - `UpdateNoteResponseDto`
6. **Add minimal tests (optional but recommended)**
   - If project has an API test setup: cover
     - 400 on invalid UUID
     - 400 on invalid `include`
     - 404 when note not found
     - 200 GET with/without context
     - 200 PATCH updates content + sets embedding_status pending
     - 204 DELETE

# REST API Plan

## Assumptions / Scope Notes
- This API is intended to run as **server-side endpoints** (Astro `src/pages/api/*` and/or Supabase Edge Functions) so **secrets stay off the client** (per tech stack recommendation).
- **Authentication is temporarily disabled** for this iteration. API endpoints do NOT require a Bearer token.
- **RLS is bypassed** or simplified for now; the API will operate on all data (or a single default user context if needed for DB schemas).
- Vectors are generated via OpenRouter-compatible embeddings, but the database schema references OpenAI’s `text-embedding-3-small` dimensionality (1536). We assume the embedding model used returns **1536 dims**.
- “Chat” responses are treated as **non-persisted by default** (unless you later add a `chat_messages` table); **search logs** are persisted via `search_logs`.

---

## 1. Resources
- **Series** → `public.series`
- **Book** → `public.books`
- **Chapter** → `public.chapters`
- **Note** → `public.notes`
- **NoteEmbedding** (internal) → `public.note_embeddings`
- **ReadingSession** → `public.reading_sessions`
- **SearchLog** (internal/metrics) → `public.search_logs`
- **EmbeddingErrorLog** (internal) → `public.embedding_errors`
- **SearchErrorLog** (internal) → `public.search_errors`
- **AI Query (RAG)** (virtual resource) → implemented via DB RPC `match_notes` + LLM completion

---

## 2. Endpoints

### Conventions (applies to all endpoints)
- **Base path**: `/api/v1`
- **Paths below**: listed **relative** to `/api/v1` (e.g., `POST /books` means `POST /api/v1/books`)
- **Content type**: `application/json; charset=utf-8`
- **Auth**: None (disabled for MVP iteration).
- **Timestamps**: ISO8601 strings
- **IDs**: UUID strings
- **Pagination (lists)**:
  - `page` (default 1)
  - `size` (default 10, max 100)
  - Response includes `meta` object: `{ "current_page": number, "page_size": number, "total_items": number, "total_pages": number }`
- **Sorting (lists)**:
  - `sort` field name (whitelist per resource)
  - `order` = `asc|desc` (default `desc`)
- **Error shape** (all non-2xx):

```json
{
  "error": {
    "code": "string",
    "message": "string",
    "details": { "any": "json" }
  }
}
```

Common error codes:
- `403 FORBIDDEN` → `NOT_ALLOWED`
- `404 NOT FOUND` → `NOT_FOUND`
- `409 CONFLICT` → `CONFLICT`
- `422 UNPROCESSABLE ENTITY` → `VALIDATION_ERROR`
- `429 TOO MANY REQUESTS` → `RATE_LIMITED`
- `500 INTERNAL SERVER ERROR` → `INTERNAL_ERROR`

---

### 2.3 Series
> PRD: “Ability to organize notes by Series > Book > Chapter.”

#### POST `/series`
- **Description**: Create a series.
- **Request**:

```json
{
  "title": "Stormlight Archive",
  "description": "optional",
  "cover_image_url": "optional"
}
```

- **Response 201**:

```json
{
  "series": {
    "id": "uuid",
    "title": "Stormlight Archive",
    "description": "optional",
    "cover_image_url": "optional",
    "created_at": "iso",
    "updated_at": "iso"
  }
}
```

- **Success codes**:
  - `201 CREATED`
- **Error codes**:
  - `422 VALIDATION_ERROR` (missing title)

#### GET `/series`
- **Description**: List series.
- **Query params**:
  - `page`, `size`
  - `q` (search in title; optional)
  - `sort` in `created_at|updated_at|title`
  - `order` in `asc|desc`
- **Response 200**:

```json
{
  "series": [ { "id": "uuid", "title": "string", "created_at": "iso", "updated_at": "iso" } ],
  "meta": { "current_page": 1, "page_size": 10, "total_items": 100, "total_pages": 10 }
}
```

- **Success codes**:
  - `200 OK`
- **Error codes**:

#### GET `/series/:seriesId`
- **Description**: Fetch one series (optionally include counts).
- **Query params**:
  - `include` = `books_count` (optional)
- **Response 200**:

```json
{
  "series": { "id": "uuid", "title": "string", "description": "string|null", "cover_image_url": "string|null", "created_at": "iso", "updated_at": "iso" },
  "meta": { "books_count": 3 }
}
```

- **Success codes**:
  - `200 OK`
- **Error codes**:
  - `404 NOT_FOUND`

#### PATCH `/series/:seriesId`
- **Description**: Update series fields.
- **Request**:

```json
{
  "title": "optional",
  "description": "optional|null",
  "cover_image_url": "optional|null"
}
```

- **Response 200**: `{ "series": { ... } }`
- **Success codes**:
  - `200 OK`
- **Error codes**:
  - `404 NOT_FOUND`
  - `422 VALIDATION_ERROR` (empty title if provided)

#### DELETE `/series/:seriesId`
- **Description**: Delete a series. By default, books with `series_id` are set to null (`ON DELETE SET NULL`).  
  Optionally, the user can choose to also **cascade-delete all books, chapters, and related notes** in the series by passing `?cascade=1` as a query parameter (dangerous, cannot be undone).
- **Query parameters**:
  - `cascade` (boolean, optional). If `true`/`1`, deletes all books, chapters, and notes under this series.
- **Response 204**
- **Success codes**:
  - `204 NO CONTENT`
- **Error codes**:
  - `404 NOT_FOUND`

---

### 2.4 Books
> Schema validations: `total_pages > 0`, `current_page >= 0`, `current_page <= total_pages`.

#### POST `/books`
- **Description**: Add a book to the library.
- **Request**:

```json
{
  "title": "The Way of Kings",
  "author": "Brandon Sanderson",
  "total_pages": 1007,
  "series_id": "uuid|null",
  "series_order": 1,
  "status": "want_to_read|reading|completed",
  "cover_image_url": "string|null"
}
```

- **Response 201**:

```json
{
  "book": {
    "id": "uuid",
    "series_id": "uuid|null",
    "title": "string",
    "author": "string",
    "total_pages": 1007,
    "current_page": 0,
    "status": "want_to_read",
    "series_order": 1,
    "cover_image_url": "string|null",
    "created_at": "iso",
    "updated_at": "iso"
  }
}
```

- **Success codes**:
  - `201 CREATED`
- **Error codes**:
  - `422 VALIDATION_ERROR` (missing title/author/total_pages; invalid status; total_pages <= 0)
  - `404 NOT_FOUND` (series_id provided but not found)

#### GET `/books`
- **Description**: List books (library view).
- **Query params**:
  - `page`, `size`
  - `series_id` (filter)
  - `status` (filter: `want_to_read|reading|completed`)
  - `q` (search in title/author)
  - `sort` in `updated_at|created_at|title|author|status`
  - `order` in `asc|desc`
- **Response 200**:

```json
{
  "books": [
    {
      "id": "uuid",
      "series_id": "uuid|null",
      "title": "string",
      "author": "string",
      "status": "reading",
      "total_pages": 100,
      "current_page": 42,
      "updated_at": "iso"
    }
  ],
  "meta": { "current_page": 1, "page_size": 10, "total_items": 100, "total_pages": 10 }
}
```

- **Success codes**:
  - `200 OK`
- **Error codes**:

#### GET `/books/:bookId`
- **Description**: Get a book with optional aggregates.
- **Response 200**:

```json
{
  "book": { "id": "uuid", "title": "string", "author": "string", "total_pages": 100, "current_page": 42, "status": "reading", "series_id": "uuid|null", "series_order": 1, "cover_image_url": "string|null", "created_at": "iso", "updated_at": "iso" },
  "meta": {
    "progress": { "percent": 42 },
    "chapters_count": 12,
    "notes_count": 34,
    "active_session": { "id": "uuid", "started_at": "iso" }
  }
}
```

- **Success codes**:
  - `200 OK`
- **Error codes**:
  - `404 NOT_FOUND`

#### PATCH `/books/:bookId`
- **Description**: Update book metadata and progress.
- **Request**:

```json
{
  "title": "optional",
  "author": "optional",
  "total_pages": 100,
  "current_page": 42,
  "status": "want_to_read|reading|completed",
  "series_id": "uuid|null",
  "series_order": 1,
  "cover_image_url": "string|null"
}
```

- **Response 200**: `{ "book": { ... } }`
- **Success codes**:
  - `200 OK`
- **Error codes**:
  - `422 VALIDATION_ERROR` (current_page < 0, total_pages <= 0, current_page > total_pages)
  - `404 NOT_FOUND` (book or new series not found)

#### POST `/books/:bookId/progress`
> PRD: “Manual entry of current page number… progress bar updates”
- **Description**: Purpose-built endpoint to update `current_page` (and optionally `status`).
- **Request**:

```json
{ "current_page": 42 }
```

- **Response 200**:

```json
{ "book": { "id": "uuid", "current_page": 42, "total_pages": 100, "status": "reading", "updated_at": "iso" } }
```

- **Success codes**:
  - `200 OK`
- **Error codes**:
  - `404 NOT_FOUND`
  - `422 VALIDATION_ERROR` (out of bounds)

#### DELETE `/books/:bookId`
- **Description**: Delete a book. Cascades to chapters, notes, embeddings, sessions.
- **Response 204**
- **Success codes**:
  - `204 NO CONTENT`
- **Error codes**:
  - `404 NOT_FOUND`

---

### 2.5 Chapters
> Schema: `chapters(book_id FK ON DELETE CASCADE, title not null, order int default 0)`

#### POST `/books/:bookId/chapters`
- **Description**: Create a chapter under a book.
- **Request**:

```json
{ "title": "Chapter 1", "order": 1 }
```

- **Response 201**:

```json
{ "chapter": { "id": "uuid", "book_id": "uuid", "title": "string", "order": 1, "created_at": "iso", "updated_at": "iso" } }
```

- **Success codes**:
  - `201 CREATED`
- **Error codes**:
  - `404 NOT_FOUND` (book not found)
  - `422 VALIDATION_ERROR` (missing title)

#### GET `/books/:bookId/chapters`
- **Description**: List chapters for a book.
- **Query params**:
  - `page`, `size`
  - `sort` in `order|created_at|updated_at|title` (default `order asc`)
  - `order` in `asc|desc`
- **Response 200**:

```json
{
  "chapters": [ { "id": "uuid", "book_id": "uuid", "title": "string", "order": 1, "updated_at": "iso" } ],
  "meta": { "current_page": 1, "page_size": 10, "total_items": 100, "total_pages": 10 }
}
```

- **Success codes**:
  - `200 OK`
- **Error codes**:
  - `404 NOT_FOUND`

#### GET `/chapters/:chapterId`
- **Description**: Get a single chapter.
- **Response 200**: `{ "chapter": { ... } }`
- **Success codes**:
  - `200 OK`
- **Error codes**:
  - `404 NOT_FOUND`

#### PATCH `/chapters/:chapterId`
- **Description**: Update chapter title/order.
- **Request**:

```json
{ "title": "optional", "order": 2 }
```

- **Response 200**: `{ "chapter": { ... } }`
- **Success codes**:
  - `200 OK`
- **Error codes**:
  - `404 NOT_FOUND`
  - `422 VALIDATION_ERROR`

#### DELETE `/chapters/:chapterId`
- **Description**: Delete chapter; cascades to notes/embeddings.
- **Response 204**
- **Success codes**:
  - `204 NO CONTENT`
- **Error codes**:
  - `404 NOT_FOUND`

---

### 2.6 Notes
> PRD: “Notes are automatically chunked and embedded upon saving… immediately when created or updated.”
> Schema: `notes(content text not null, embedding_status enum, embedding_duration int)`

#### POST `/chapters/:chapterId/notes`
- **Description**: Create a note under a chapter; triggers embedding job.
- **Request**:

```json
{
  "content": "• Key event...\n• Another event..."
}
```

- **Response 201**:

```json
{
  "note": {
    "id": "uuid",
    "chapter_id": "uuid",
    "content": "string",
    "embedding_status": "pending",
    "embedding_duration": null,
    "created_at": "iso",
    "updated_at": "iso"
  }
}
```

- **Success codes**:
  - `201 CREATED`
- **Error codes**:
  - `404 NOT_FOUND` (chapter not found)
  - `422 VALIDATION_ERROR` (missing/empty content; optional max length enforcement)

#### GET `/notes`
- **Description**: List notes (supports “View Book Notes” grouped by chapter on client).
- **Query params**:
  - `page`, `size`
  - `book_id` (filter via join)
  - `chapter_id` (filter)
  - `series_id` (filter via join)
  - `embedding_status` (filter)
  - `sort` in `created_at|updated_at`
  - `order` in `asc|desc`
- **Response 200**:

```json
{
  "notes": [
    { "id": "uuid", "chapter_id": "uuid", "content": "string", "embedding_status": "completed", "created_at": "iso", "updated_at": "iso" }
  ],
  "meta": { "current_page": 1, "page_size": 10, "total_items": 100, "total_pages": 10 }
}
```

- **Success codes**:
  - `200 OK`
- **Error codes**:

#### GET `/notes/:noteId`
- **Description**: Get a note (optionally include chapter/book context).
- **Query params**:
  - `include` = `context` (adds `book_id`, `book_title`, `chapter_title`)
- **Response 200**:

```json
{
  "note": { "id": "uuid", "chapter_id": "uuid", "content": "string", "embedding_status": "completed", "embedding_duration": 123, "created_at": "iso", "updated_at": "iso" },
  "context": { "book_id": "uuid", "book_title": "string", "chapter_title": "string" }
}
```

- **Success codes**:
  - `200 OK`
- **Error codes**:
  - `404 NOT_FOUND`

#### PATCH `/notes/:noteId`
> PRD: “Upon saving changes… recalculates and updates the vector embedding”
- **Description**: Update note content; marks embedding pending and triggers regeneration.
- **Request**:

```json
{ "content": "updated markdown..." }
```

- **Response 200**:

```json
{ "note": { "id": "uuid", "content": "string", "embedding_status": "pending", "updated_at": "iso" } }
```

- **Success codes**:
  - `200 OK`
- **Error codes**:
  - `404 NOT_FOUND`
  - `422 VALIDATION_ERROR`

#### DELETE `/notes/:noteId`
- **Description**: Delete note; cascades to `note_embeddings`.
- **Response 204**
- **Success codes**:
  - `204 NO CONTENT`
- **Error codes**:
  - `404 NOT_FOUND`

---

### 2.7 Reading Sessions
> PRD: “Manual Start/Stop functionality to track time spent reading.”
> Schema: `reading_sessions(started_at default now, ended_at nullable, end_page int nullable)`

#### POST `/books/:bookId/reading-sessions`
- **Description**: Start a session for a book. Enforce at most one active session per per user via API constraint.
- **Request**:

```json
{ }
```

- **Response 201**:

```json
{
  "reading_session": {
    "id": "uuid",
    "book_id": "uuid",
    "started_at": "iso",
    "ended_at": null,
    "end_page": null
  }
}
```

- **Success codes**:
  - `201 CREATED`
- **Error codes**:
  - `409 CONFLICT` (`ACTIVE_SESSION_EXISTS`)
  - `404 NOT_FOUND` (book not found)

#### POST `/reading-sessions/:sessionId/stop`
- **Description**: Stop a running session; optionally record `end_page` and update book progress.
- **Request**:

```json
{ "ended_at": "optional iso", "end_page": 42, "update_book_progress": true }
```

- **Response 200**:

```json
{
  "reading_session": { "id": "uuid", "ended_at": "iso", "end_page": 42 },
  "book": { "id": "uuid", "current_page": 42, "status": "reading" }
}
```

- **Success codes**:
  - `200 OK`
- **Error codes**:
  - `404 NOT_FOUND`
  - `409 CONFLICT` (`SESSION_ALREADY_ENDED`)
  - `422 VALIDATION_ERROR` (end_page < 0; end_page > total_pages if `update_book_progress`)

#### GET `/reading-sessions`
- **Description**: List sessions (history).
- **Query params**:
  - `book_id` (filter)
  - `started_after`, `started_before` (ISO)
  - `page`, `size`
  - `sort` in `started_at|ended_at`
  - `order` in `asc|desc`
- **Response 200**:

```json
{
  "reading_sessions": [
    { "id": "uuid", "book_id": "uuid", "started_at": "iso", "ended_at": "iso|null", "end_page": 42 }
  ],
  "meta": { "current_page": 1, "page_size": 10, "total_items": 100, "total_pages": 10 }
}
```

- **Success codes**:
  - `200 OK`
- **Error codes**:

#### GET `/reading-sessions/:sessionId`
- **Description**: Get a session.
- **Response 200**: `{ "reading_session": { ... } }`
- **Success codes**:
  - `200 OK`
- **Error codes**:
  - `404 NOT_FOUND`

#### DELETE `/reading-sessions/:sessionId`
- **Description**: Delete a session entry (optional for MVP).
- **Response 204**
- **Success codes**:
  - `204 NO CONTENT`
- **Error codes**:
  - `404 NOT_FOUND`

---

### 2.8 AI Search (RAG Chat)
> PRD: “Chat-driven Q&A interface … vector similarity search … Low Confidence threshold … citations.”

#### POST `/ai/query`
- **Description**: Ask a question and get an answer grounded in the user’s notes. Also logs the query to `search_logs`.
- **Request**:

```json
{
  "query_text": "Who is the assassin in white?",
  "scope": {
    "book_id": "uuid|null",
    "series_id": "uuid|null"
  },
  "retrieval": {
    "match_threshold": 0.75,
    "match_count": 8
  }
}
```

- **Response 200** (high confidence):

```json
{
  "answer": {
    "text": "Based on your notes, ...",
    "low_confidence": false
  },
  "citations": [
    {
      "note_embedding_id": "uuid",
      "note_id": "uuid",
      "book_id": "uuid",
      "book_title": "string",
      "chapter_id": "uuid",
      "chapter_title": "string",
      "chunk_content": "string",
      "similarity": 0.87
    }
  ],
  "usage": {
    "retrieved_chunks": 8,
    "model": "string",
    "latency_ms": 1234
  }
}
```

- **Response 200** (low confidence fallback):

```json
{
  "answer": {
    "text": "I’m not quite sure based on your notes. Try adding a note about that scene, or broaden your scope.",
    "low_confidence": true
  },
  "citations": [],
  "usage": { "retrieved_chunks": 0, "model": "string", "latency_ms": 456 }
}
```

- **Success codes**:
  - `200 OK`
- **Error codes**:
  - `422 VALIDATION_ERROR` (missing query_text; both scope ids provided but invalid combination if you choose to disallow)
  - `404 NOT_FOUND` (scope references not found)
  - `429 RATE_LIMITED`

**Implementation detail (server-side)**:
- Step A: Embed `query_text` → `query_embedding vector(1536)`
- Step B: Call DB RPC `match_notes(query_embedding, match_threshold, match_count, filter_book_id)`; for series scope, either:
  - add an RPC variant that filters by `series_id`, or
  - fetch book ids in series and filter in SQL.
- Step C: If max similarity < threshold → return low confidence response.
- Step D: Else provide citations + pass retrieved chunks into LLM prompt to generate a grounded answer (no outside knowledge).

---

### 2.9 Search Logs (metrics; optional to expose)
> Schema: `search_logs(query_text text not null, created_at default now)`

#### GET `/search-logs`
- **Description**: Admin/user-visible query history (optional for MVP).
- **Query params**:
  - `page`, `size`
  - `started_after`, `started_before`
- **Response 200**:

```json
{
  "search_logs": [ { "id": "uuid", "query_text": "string", "created_at": "iso" } ],
  "meta": { "current_page": 1, "page_size": 10, "total_items": 100, "total_pages": 10 }
}
```

- **Success codes**:
  - `200 OK`
- **Error codes**:

---

### 2.10 Embedding Errors (debug; optional to expose)
> Schema: `embedding_errors(error_message text not null, note_id uuid null, created_at default now)`

#### GET `/embedding-errors`
- **Description**: List embedding failures for the current user (useful for debugging and support).
- **Query params**:
  - `page`, `size`
  - `note_id` (optional filter)
  - `sort` in `created_at`
  - `order` in `asc|desc` (default `desc`)
- **Response 200**:

```json
{
  "embedding_errors": [
    {
      "id": "uuid",
      "note_id": "uuid|null",
      "error_message": "string",
      "created_at": "iso"
    }
  ],
  "meta": { "current_page": 1, "page_size": 10, "total_items": 100, "total_pages": 10 }
}
```

- **Success codes**:
  - `200 OK`
- **Error codes**:

#### GET `/embedding-errors/:embeddingErrorId`
- **Description**: Get a single embedding error log entry.
- **Response 200**:

```json
{
  "embedding_error": {
    "id": "uuid",
    "note_id": "uuid|null",
    "error_message": "string",
    "created_at": "iso"
  }
}
```

- **Success codes**:
  - `200 OK`
- **Error codes**:
  - `404 NOT_FOUND`

#### DELETE `/embedding-errors/:embeddingErrorId`
- **Description**: Delete an embedding error log entry (user-scoped cleanup).
- **Response 204**
- **Success codes**:
  - `204 NO CONTENT`
- **Error codes**:
  - `404 NOT_FOUND`

---

### 2.11 Search Errors (debug; optional to expose)
> Schema: `search_errors(source error_source not null, error_message text not null, search_log_id uuid null, created_at default now)`

#### GET `/search-errors`
- **Description**: List RAG/search failures for the current user.
- **Query params**:
  - `page`, `size`
  - `source` (optional filter: `embedding|llm|database|unknown`)
  - `search_log_id` (optional filter)
  - `sort` in `created_at`
  - `order` in `asc|desc` (default `desc`)
- **Response 200**:

```json
{
  "search_errors": [
    {
      "id": "uuid",
      "search_log_id": "uuid|null",
      "source": "embedding|llm|database|unknown",
      "error_message": "string",
      "created_at": "iso"
    }
  ],
  "meta": { "current_page": 1, "page_size": 10, "total_items": 100, "total_pages": 10 }
}
```

- **Success codes**:
  - `200 OK`
- **Error codes**:

#### GET `/search-errors/:searchErrorId`
- **Description**: Get a single search error log entry.
- **Response 200**:

```json
{
  "search_error": {
    "id": "uuid",
    "search_log_id": "uuid|null",
    "source": "embedding|llm|database|unknown",
    "error_message": "string",
    "created_at": "iso"
  }
}
```

- **Success codes**:
  - `200 OK`
- **Error codes**:
  - `404 NOT_FOUND`

#### DELETE `/search-errors/:searchErrorId`
- **Description**: Delete a search error log entry (user-scoped cleanup).
- **Response 204**
- **Success codes**:
  - `204 NO CONTENT`
- **Error codes**:
  - `404 NOT_FOUND`

---

## 3. Authentication and Authorization

### Authentication
- **Mechanism**: Disabled for this stage. No JWT validation required.
- **Context**: API acts as a single-user system or operates on global data for testing simplicity.

### Authorization
- **RLS**: Temporarily disabled or permissive.
- **Per-user isolation**: Skipped for now.
- API layer rules:
  - Return `404 NOT_FOUND` for missing resources.

### Data security
- Store OpenRouter keys only server-side.
- Log minimal PII. If persisting search logs, consider redacting or allowing user to clear history.

---

## 4. Validation and Business Logic

### 4.1 Validation rules by resource (schema + PRD)

#### Series (`series`)
- **Schema**: `title text not null`
- **API validation**:
  - `title` required on create, non-empty on update
  - `cover_image_url` if present must be a URL (soft validation)

#### Books (`books`)
- **Schema**:
  - `title text not null`
  - `author text not null`
  - `total_pages int not null, check > 0`
  - `current_page int default 0, check >= 0`
  - `check_progress`: `current_page <= total_pages`
  - `status book_status enum default 'want_to_read' not null`
  - `series_id` optional FK to `series.id` (ON DELETE SET NULL)
- **API validation**:
  - `total_pages` must be integer > 0
  - `current_page` must be integer >= 0 and <= `total_pages`
  - `status` must be one of enum values
  - if `series_id` provided, must exist and be owned by user
  - if setting `status = completed`, optionally enforce `current_page = total_pages` (business rule; choose whether strict or lenient)

#### Chapters (`chapters`)
- **Schema**:
  - `book_id not null`
  - `title text not null`
  - `order int default 0`
- **API validation**:
  - ensure parent `book_id` exists/owned
  - `title` required, non-empty
  - `order` integer (optional)

#### Notes (`notes`)
- **Schema**:
  - `chapter_id not null`
  - `content text not null`
  - `embedding_status embedding_status default 'pending' not null`
- **PRD**:
  - “optimized for short bullet points … (approx. 500-1000 characters recommended/enforced)”
- **API validation**:
  - `content` required, trim and non-empty
  - enforce max length (e.g., 2000 chars hard cap)
  - disallow extremely large payloads (request body limit)

#### Note embeddings (`note_embeddings`) (server-managed)
- **Schema**:
  - `chunk_content text not null`
  - `embedding vector(1536) not null`
- **Types note**:
  - In `src/db/database.types.ts`, pgvector values are represented as `string` (including `note_embeddings.embedding` and the `match_notes.query_embedding` argument).
- **API validation**:
  - not directly writable by clients
  - embedding generation validates vector length = 1536

#### Reading sessions (`reading_sessions`)
- **Schema**:
  - `book_id not null`
  - `started_at default now not null`
  - `ended_at nullable`
  - `end_page int nullable`
- **API validation / rules**:
  - `end_page` if provided must be integer >= 0 and <= book.total_pages (if updating progress)
  - enforce `ended_at >= started_at` if client supplies `ended_at`
  - enforce only one “active” session per book (or per user) at a time (API-level)

#### Search logs (`search_logs`) (server-managed)
- **Schema**:
  - `query_text text not null`
- **API validation**:
  - `query_text` required, non-empty; consider max length (e.g., 500 chars)

#### Embedding error logs (`embedding_errors`) (server-managed)
- **Schema**:
  - `error_message text not null`
  - `note_id uuid nullable`
- **API validation**:
  - not directly writable by clients
  - write only from embedding pipeline on failures

#### Search error logs (`search_errors`) (server-managed)
- **Schema**:
  - `source error_source not null`
  - `error_message text not null`
  - `search_log_id uuid nullable`
- **API validation**:
  - not directly writable by clients
  - write only from AI query pipeline on failures

---

### 4.2 Business logic mapping (PRD → API)

#### Library management (Series > Book > Chapter)
- **Create Series**: `POST /series`
- **Add Book**: `POST /books`
- **Create Chapter**: `POST /books/:bookId/chapters`
- **Read hierarchy**:
  - list series: `GET /series`
  - list books (filterable by series): `GET /books?series_id=...`
  - list chapters for book: `GET /books/:bookId/chapters`

#### Note-taking + embedding pipeline
- **Create Note**: `POST /chapters/:chapterId/notes` → set `embedding_status=pending`, enqueue embedding job
- **Edit Note**: `PATCH /notes/:noteId` → set `embedding_status=pending`, regenerate embeddings
- **View Notes**: `GET /notes?book_id=...` (client groups by chapter)
- **Embedding processing** (server-internal):
  - Chunk note content into segments (e.g., paragraph/bullet chunks)
  - For each chunk: upsert into `note_embeddings` with `chunk_content` and `embedding`
  - Update `notes.embedding_status` to `completed` and set `embedding_duration`
  - On failure: set `notes.embedding_status=failed`

#### RAG query + low-confidence handling + citations
- **Ask question**: `POST /ai/query`
  - logs query → `search_logs`
  - embeds query → vector
  - retrieves via `match_notes` (and optional scope filtering)
  - if below threshold → low confidence response with empty citations
  - else → grounded response with citations including book/chapter titles

#### Reading session timer + progress updates
- **Start session**: `POST /books/:bookId/reading-sessions`
- **Stop session**: `POST /reading-sessions/:sessionId/stop` (optionally updates book current_page)
- **Manual page update**: `POST /books/:bookId/progress` (or `PATCH /books/:bookId`)

---

## Security and Performance Considerations (from schema/PRD/stack)
- **Strict data isolation**: use RLS on all tables and JWT auth context.
- **Cascade deletes**: rely on FK `user_id → auth.users(id) ON DELETE CASCADE` on all core tables; deleting the auth user deletes all user-owned rows. `books.series_id` relies on FK `ON DELETE SET NULL` (and the API may also support an explicit “cascade delete series content” option if desired).
- **Vector search performance**: use pgvector HNSW index on `note_embeddings(embedding)` with `vector_cosine_ops`; keep `match_count` capped (e.g., max 20).
- **Input hardening**: request body size limits (especially notes), content sanitization if rendering markdown in UI, and consistent 404-on-not-owned behavior.


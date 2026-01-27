# REST API Plan

## Assumptions / Scope Notes
- This API is intended to run as **server-side endpoints** so **secrets stay off the client**.
- **Authentication is required** for all non-auth endpoints. The API relies on the authenticated user context provided by Supabase sessions.
- **RLS is enabled** and data access is scoped to the authenticated user.
- The Ask feature is implemented as **LLM Q&A grounded in the user’s notes** (no vector similarity retrieval in this scope).
- “Chat” transcripts are treated as **non-persisted** (in-memory on the client). The server records **query logs and errors** for operational visibility.

---

## 1. Resources
- **Series** → `public.series`
- **Book** → `public.books`
- **Chapter** → `public.chapters`
- **Note** → `public.notes`
- **Auth** (virtual) → Supabase Auth session management
- **SearchLog** (internal) → `public.search_logs`
- **SearchErrorLog** (internal) → `public.search_errors`
- **AI Query (Ask)** (virtual) → context fetching + LLM completion

---

## 2. Endpoints

### Conventions (applies to all endpoints)
- **Base path**: `/api/v1`
- **Paths below**: listed **relative** to `/api/v1` (e.g., `POST /books` means `POST /api/v1/books`)
- **Content type**: `application/json; charset=utf-8`
- **Auth**:
  - Required for all non-auth endpoints.
  - Auth endpoints establish or modify the user session.
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
- `400 BAD REQUEST` → `VALIDATION_ERROR`
- `404 NOT FOUND` → `NOT_FOUND`
- `409 CONFLICT` → `CONFLICT`
- `429 TOO MANY REQUESTS` → `RATE_LIMITED`
- `500 INTERNAL SERVER ERROR` → `INTERNAL_ERROR`

---

### 2.2 Auth

#### POST `/auth/signup`
- **Description**: Create a new user account and establish a session.
- **Request**:

```json
{ "email": "user@example.com", "password": "string" }
```

- **Response 201**:

```json
{ "user": { "id": "uuid", "email": "user@example.com" } }
```

#### POST `/auth/login`
- **Description**: Log in with email/password and establish a session.
- **Request**:

```json
{ "email": "user@example.com", "password": "string" }
```

- **Response 200**:

```json
{ "user": { "id": "uuid", "email": "user@example.com" } }
```

#### POST `/auth/logout`
- **Description**: End the current session.
- **Response 200**:

```json
{ "ok": true }
```

#### POST `/auth/password-reset`
- **Description**: Request a password reset email.
- **Request**:

```json
{ "email": "user@example.com" }
```

- **Response 202**:

```json
{ "ok": true }
```

#### POST `/auth/password-update`
- **Description**: Update the user’s password (requires a valid session from the reset flow).
- **Request**:

```json
{ "password": "string" }
```

- **Response 200**:

```json
{ "ok": true }
```

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
    "book_count": 0,
    "created_at": "iso",
    "updated_at": "iso"
  }
}
```

- **Success codes**:
  - `201 CREATED`
- **Error codes**:
  - `400 VALIDATION_ERROR` (missing title)

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
  "series": [ { "id": "uuid", "title": "string", "book_count": 3, "created_at": "iso", "updated_at": "iso" } ],
  "meta": { "current_page": 1, "page_size": 10, "total_items": 100, "total_pages": 10 }
}
```

- **Success codes**:
  - `200 OK`
- **Error codes**:

#### GET `/series/:seriesId`
- **Description**: Fetch one series.
- **Response 200**:

```json
{
  "series": { "id": "uuid", "title": "string", "description": "string|null", "cover_image_url": "string|null", "book_count": 3, "created_at": "iso", "updated_at": "iso" }
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
  - `400 VALIDATION_ERROR` (empty title if provided)
  - `404 NOT_FOUND`

#### DELETE `/series/:seriesId`
- **Description**: Delete a series. By default, books with `series_id` are set to null (`ON DELETE SET NULL`).  
  Optionally, the user can choose to also **cascade-delete all books, chapters, and related notes** in the series by passing `?cascade=true` as a query parameter (dangerous, cannot be undone).
- **Query parameters**:
  - `cascade` (boolean, optional). If `true`, deletes all books, chapters, and notes under this series.
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
  - `400 VALIDATION_ERROR` (missing title/author/total_pages; invalid status; total_pages <= 0)
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
  - `400 VALIDATION_ERROR` (current_page < 0, total_pages <= 0, current_page > total_pages)
  - `404 NOT_FOUND` (book or new series not found)

#### DELETE `/books/:bookId`
- **Description**: Delete a book. Cascades to chapters and notes.
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
  - `400 VALIDATION_ERROR` (missing title)
  - `404 NOT_FOUND` (book not found)

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
  - `400 VALIDATION_ERROR`
  - `404 NOT_FOUND`

#### DELETE `/chapters/:chapterId`
- **Description**: Delete chapter; cascades to notes/embeddings.
- **Response 204**
- **Success codes**:
  - `204 NO CONTENT`
- **Error codes**:
  - `404 NOT_FOUND`

---

### 2.6 Notes
> Schema: `notes(content text not null, embedding_status enum, embedding_duration int)`
>
> Notes include `embedding_status` and `embedding_duration` fields for operational tracking, but this API does not expose an embeddings pipeline or vector retrieval behavior.

#### POST `/chapters/:chapterId/notes`
- **Description**: Create a note under a chapter.
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
  - `400 VALIDATION_ERROR` (missing/empty content; optional max length enforcement)
  - `404 NOT_FOUND` (chapter not found)

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
    { "id": "uuid", "chapter_id": "uuid", "content": "string", "embedding_status": "pending", "created_at": "iso", "updated_at": "iso" }
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
- **Description**: Update note content.
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
  - `400 VALIDATION_ERROR`
  - `404 NOT_FOUND`

#### DELETE `/notes/:noteId`
- **Description**: Delete note.
- **Response 204**
- **Success codes**:
  - `204 NO CONTENT`
- **Error codes**:
  - `404 NOT_FOUND`

---

### 2.7 Ask (AI Q&A)
> PRD: “Chat-driven Q&A interface … grounded in the user’s notes … low confidence handling.”

#### POST `/ai/query`
- **Description**: Ask a question and get an answer grounded in the user’s notes. The server also records the query in `search_logs`.
- **Request**:

```json
{
  "query_text": "Who is the assassin in white?",
  "scope": {
    "book_id": "uuid|null",
    "series_id": "uuid|null"
  }
}
```

- **Response 200**:

```json
{
  "answer": {
    "text": "Based on your notes, ...",
    "low_confidence": false
  },
  "usage": {
    "model": "string",
    "latency_ms": 1234
  }
}
```

- **Success codes**:
  - `200 OK`
- **Error codes**:
  - `400 VALIDATION_ERROR` (missing query_text; invalid scope)
  - `404 NOT_FOUND` (scope references not found or not accessible)
  - `429 RATE_LIMITED`

---

## 3. Authentication and Authorization

### Authentication
- **Mechanism**: Supabase sessions. Endpoints require an authenticated user context.

### Authorization
- **RLS**: Enabled for user-owned tables.
- **Per-user isolation**: Enforced by `user_id` ownership checks and RLS.
- API layer rules:
  - Return `404 NOT_FOUND` for missing resources.

### Data security
- Store OpenRouter keys only server-side.
- Log minimal PII.

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
- **API validation**:
  - `content` required, trim and non-empty
  - enforce max length (e.g., 2000 chars hard cap)
  - disallow extremely large payloads (request body limit)

#### Search logs (`search_logs`) (server-managed)
- **Schema**:
  - `query_text text not null`
- **API validation**:
  - `query_text` required, non-empty; consider max length (e.g., 500 chars)

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
- **Create Note**: `POST /chapters/:chapterId/notes`
- **Edit Note**: `PATCH /notes/:noteId`
- **View Notes**: `GET /notes?book_id=...` (client groups by chapter)

#### Ask (AI Q&A)
- **Ask question**: `POST /ai/query`
  - Records query → `search_logs` (server-managed)
  - Records failures → `search_errors` (server-managed)

---

## Security and Performance Considerations (from schema/PRD/stack)
- **Strict data isolation**: use RLS on all user-owned tables and authenticated user context.
- **Cascade deletes**: rely on FK `user_id → auth.users(id) ON DELETE CASCADE` on all core tables; deleting the auth user deletes all user-owned rows. `books.series_id` relies on FK `ON DELETE SET NULL` (and the API may also support an explicit “cascade delete series content” option if desired).
- **Input hardening**: request body size limits (especially notes), content sanitization if rendering markdown in UI, and consistent 404-on-not-owned behavior.


# Database Schema Plan - Bookkeeper

## 1. Overview
This schema is designed for a single-tenant logical structure within Supabase (PostgreSQL). Every core entity is strictly associated with a `user_id` that references the `auth.users` table. This ensures complete data isolation and enables simple cascading deletions for GDPR compliance.

## 2. Extensions & Enums

### Extensions
```sql
-- Enable pgvector for RAG capabilities
create extension if not exists vector;
```

### Enums
```sql
-- Book status
create type book_status as enum ('want_to_read', 'reading', 'completed');

-- Embedding job status
create type embedding_status as enum ('pending', 'processing', 'completed', 'failed');

-- Error source for search/AI
create type error_source as enum ('embedding', 'llm', 'database', 'unknown');
```

## 3. Tables

### 3.1. Series (`public.series`)
Groups books together.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | FK `auth.users.id`, ON DELETE CASCADE, not null | Owner of the series. |
| `title` | `text` | not null | Name of the series. |
| `description` | `text` | | Optional description. |
| `cover_image_url` | `text` | | Optional cover image. |
| `book_count` | `int` | default 0, not null | Cached count of books in series. |
| `created_at` | `timestamptz` | default `now()`, not null | |
| `updated_at` | `timestamptz` | default `now()`, not null | |

### 3.2. Books (`public.books`)
Core entity for tracking reading material.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | FK `auth.users.id`, ON DELETE CASCADE, not null | Owner for RLS. |
| `series_id` | `uuid` | FK `series.id`, ON DELETE SET NULL | Optional link to a series. |
| `title` | `text` | not null | Book title. |
| `author` | `text` | not null | Book author. |
| `total_pages` | `int` | not null, check `> 0` | Total number of pages. |
| `current_page` | `int` | default 0, check `>= 0` | Current reading progress. |
| `status` | `book_status` | default `'want_to_read'`, not null | Reading status. |
| `cover_image_url` | `text` | | Optional cover image. |
| `series_order` | `int` | | Order within the series (e.g., 1, 2). |
| `created_at` | `timestamptz` | default `now()`, not null | |
| `updated_at` | `timestamptz` | default `now()`, not null | |

**Table Constraints:**
- `check_progress`: `current_page <= total_pages`

### 3.3. Chapters (`public.chapters`)
Structural unit for organizing notes.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | FK `auth.users.id`, ON DELETE CASCADE, not null | Owner for RLS. |
| `book_id` | `uuid` | FK `books.id`, ON DELETE CASCADE, not null | Parent book. |
| `title` | `text` | not null | Chapter title or "Chapter 1". |
| `order` | `int` | default 0 | Sorting order. |
| `created_at` | `timestamptz` | default `now()`, not null | |
| `updated_at` | `timestamptz` | default `now()`, not null | |

### 3.4. Notes (`public.notes`)
User-authored content.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | FK `auth.users.id`, ON DELETE CASCADE, not null | Owner for RLS. |
| `chapter_id` | `uuid` | FK `chapters.id`, ON DELETE CASCADE, not null | Parent chapter. |
| `content` | `text` | not null | The actual note text (markdown supported). |
| `embedding_status` | `embedding_status` | default `'pending'`, not null | Status of vector generation. |
| `embedding_duration` | `int` | | Time in ms to generate/index. |
| `created_at` | `timestamptz` | default `now()`, not null | |
| `updated_at` | `timestamptz` | default `now()`, not null | |

### 3.5. Note Embeddings (`public.note_embeddings`)
Stores vector data for RAG. Separated from notes to support 1-to-many chunking if needed and to keep the notes table lightweight.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | FK `auth.users.id`, ON DELETE CASCADE, not null | Owner for RLS. |
| `note_id` | `uuid` | FK `notes.id`, ON DELETE CASCADE, not null | Parent note. |
| `chunk_content` | `text` | not null | The specific text segment embedded. |
| `embedding` | `vector(1536)` | not null | OpenAI `text-embedding-3-small` vector. |
| `created_at` | `timestamptz` | default `now()`, not null | |

### 3.6. Reading Sessions (`public.reading_sessions`)
Tracks time spent reading.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | FK `auth.users.id`, ON DELETE CASCADE, not null | Owner for RLS. |
| `book_id` | `uuid` | FK `books.id`, ON DELETE CASCADE, not null | Book being read. |
| `started_at` | `timestamptz` | default `now()`, not null | When the session began. |
| `ended_at` | `timestamptz` | | When the session stopped. Null if active. |
| `end_page` | `int` | | Page number reached at end of session. |

### 3.7. Search Logs (`public.search_logs`)
Logs user queries for adoption metrics and value analysis.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | FK `auth.users.id`, ON DELETE CASCADE, not null | Owner for RLS. |
| `query_text` | `text` | not null | The text of the user's question. |
| `created_at` | `timestamptz` | default `now()`, not null | |

### 3.8. Embedding Error Logs (`public.embedding_errors`)
Tracks failures during the asynchronous embedding generation process.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | FK `auth.users.id`, ON DELETE CASCADE, not null | Owner for RLS. |
| `note_id` | `uuid` | FK `notes.id`, ON DELETE CASCADE | Associated note. |
| `error_message` | `text` | not null | Detailed error info. |
| `created_at` | `timestamptz` | default `now()`, not null | |

### 3.9. Search Error Logs (`public.search_errors`)
Tracks failures during the search/RAG process (LLM issues, embedding API failures).

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | FK `auth.users.id`, ON DELETE CASCADE, not null | Owner for RLS. |
| `search_log_id` | `uuid` | FK `search_logs.id`, ON DELETE SET NULL | Optional link to original query. |
| `source` | `error_source` | not null | Where the error occurred. |
| `error_message` | `text` | not null | Detailed error info. |
| `created_at` | `timestamptz` | default `now()`, not null | |

## 4. Indexes & Performance

### Foreign Key Indexes
Standard B-Tree indexes on all foreign keys to speed up joins and filtering.
- `series(user_id)`
- `books(user_id)`, `books(series_id)`
- `chapters(user_id)`, `chapters(book_id)`
- `notes(user_id)`, `notes(chapter_id)`
- `note_embeddings(user_id)`, `note_embeddings(note_id)`
- `reading_sessions(user_id)`, `reading_sessions(book_id)`
- `search_logs(user_id)`
- `embedding_errors(user_id)`, `embedding_errors(note_id)`
- `search_errors(user_id)`, `search_errors(search_log_id)`

### Vector Index
- **Index:** HNSW (Hierarchical Navigable Small World)
- **Target:** `note_embeddings(embedding)`
- **Operator:** `vector_cosine_ops`
- **Purpose:** Accelerate similarity search for RAG queries.

## 5. Security (Row Level Security)

RLS is enabled on **all** tables.

### Policy Strategy
A uniform policy applies to all tables: Users can only perform operations (SELECT, INSERT, UPDATE, DELETE) on rows where `user_id` matches their authenticated ID.

**Generic Policy Pattern:**
```sql
create policy "Users can manage their own [table]"
on public.[table_name]
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());
```

## 6. Automation & Functions

### Timestamp Trigger
A reusable function `handle_updated_at` will be applied to all tables with an `updated_at` column to automatically refresh the timestamp on row updates.

### Series Book Count Trigger
A trigger function `update_series_book_count` will run after INSERT, UPDATE (of `series_id`), or DELETE on the `books` table.
- Increments/decrements `series.book_count`.
- Handles moving a book from one series to another.

### Vector Search Function (`match_notes`)
A PostgreSQL RPC function to perform similarity search.

**Signature:**
```sql
function match_notes (
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_book_id uuid default null
) returns table (
  id uuid,
  note_id uuid,
  chunk_content text,
  similarity float,
  book_id uuid,
  chapter_id uuid,
  chapter_title text,
  book_title text
)
```
*Note: The function will join `note_embeddings` -> `notes` -> `chapters` -> `books` to return context (Book/Chapter titles) along with the content.*

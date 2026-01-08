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
```

## 3. Tables

### 3.1. Profiles (`public.profiles`)
Extends the default Supabase Auth user.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, FK `auth.users.id`, ON DELETE CASCADE | Matches Auth User ID. |

### 3.2. Series (`public.series`)
Groups books together.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | FK `profiles.id`, ON DELETE CASCADE, not null | Owner of the series. |
| `title` | `text` | not null | Name of the series. |
| `description` | `text` | | Optional description. |
| `cover_image_url` | `text` | | Optional cover image. |
| `created_at` | `timestamptz` | default `now()`, not null | |
| `updated_at` | `timestamptz` | default `now()`, not null | |

### 3.3. Books (`public.books`)
Core entity for tracking reading material.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | FK `profiles.id`, ON DELETE CASCADE, not null | Owner for RLS. |
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

### 3.4. Chapters (`public.chapters`)
Structural unit for organizing notes.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | FK `profiles.id`, ON DELETE CASCADE, not null | Owner for RLS. |
| `book_id` | `uuid` | FK `books.id`, ON DELETE CASCADE, not null | Parent book. |
| `title` | `text` | not null | Chapter title or "Chapter 1". |
| `order` | `int` | default 0 | Sorting order. |
| `created_at` | `timestamptz` | default `now()`, not null | |
| `updated_at` | `timestamptz` | default `now()`, not null | |

### 3.5. Notes (`public.notes`)
User-authored content.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | FK `profiles.id`, ON DELETE CASCADE, not null | Owner for RLS. |
| `chapter_id` | `uuid` | FK `chapters.id`, ON DELETE CASCADE, not null | Parent chapter. |
| `content` | `text` | not null | The actual note text (markdown supported). |
| `embedding_status` | `embedding_status` | default `'pending'`, not null | Status of vector generation. |
| `embedding_duration` | `int` | | Time in ms to generate/index. |
| `created_at` | `timestamptz` | default `now()`, not null | |
| `updated_at` | `timestamptz` | default `now()`, not null | |

### 3.6. Note Embeddings (`public.note_embeddings`)
Stores vector data for RAG. Separated from notes to support 1-to-many chunking if needed and to keep the notes table lightweight.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | FK `profiles.id`, ON DELETE CASCADE, not null | Owner for RLS. |
| `note_id` | `uuid` | FK `notes.id`, ON DELETE CASCADE, not null | Parent note. |
| `chunk_content` | `text` | not null | The specific text segment embedded. |
| `embedding` | `vector(1536)` | not null | OpenAI `text-embedding-3-small` vector. |
| `created_at` | `timestamptz` | default `now()`, not null | |

### 3.7. Reading Sessions (`public.reading_sessions`)
Tracks time spent reading.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | FK `profiles.id`, ON DELETE CASCADE, not null | Owner for RLS. |
| `book_id` | `uuid` | FK `books.id`, ON DELETE CASCADE, not null | Book being read. |
| `started_at` | `timestamptz` | default `now()`, not null | When the session began. |
| `ended_at` | `timestamptz` | | When the session stopped. Null if active. |
| `end_page` | `int` | | Page number reached at end of session. |

### 3.8. Search Logs (`public.search_logs`)
Logs user queries for adoption metrics and value analysis.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | FK `profiles.id`, ON DELETE CASCADE, not null | Owner for RLS. |
| `query_text` | `text` | not null | The text of the user's question. |
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

**Specific Policy for Profiles:**
```sql
create policy "Users can manage their own profile"
on public.profiles
for all
to authenticated
using (id = auth.uid())
with check (id = auth.uid());
```

## 6. Automation & Functions

### Timestamp Trigger
A reusable function `handle_updated_at` will be applied to all tables with an `updated_at` column to automatically refresh the timestamp on row updates.

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

# Database Schema Plan - Bookkeeper

## 1. Overview
This schema is designed for a single-tenant logical structure within Supabase (PostgreSQL). Every user-owned entity is associated with a `user_id` that references the `auth.users` table. This enables strict data isolation and simple cascade deletion of user-owned data when an account is deleted.

### Account Deletion
When a user deletes their account via the API (`POST /api/v1/auth/delete-account`), the `auth.users` record is deleted. All user-owned data is automatically cascade-deleted via `ON DELETE CASCADE` foreign key constraints, including:
- All series owned by the user
- All books owned by the user
- All chapters owned by the user
- All notes owned by the user
- All search logs for the user
- All search error logs for the user

This ensures complete data removal and prevents orphaned records.

## 2. Extensions & Enums

### Extensions
None required for this scope.

### Enums
```sql
-- Book status
create type book_status as enum ('want_to_read', 'reading', 'completed');

-- Note processing status (reserved for async note processing)
create type embedding_status as enum ('pending', 'processing', 'completed', 'failed');

-- Error source for Ask/AI
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
| `embedding_status` | `embedding_status` | default `'pending'`, not null | Processing status for note-related async workflows. |
| `embedding_duration` | `int` | | Optional processing duration in ms. |
| `created_at` | `timestamptz` | default `now()`, not null | |
| `updated_at` | `timestamptz` | default `now()`, not null | |

### 3.5. Search Logs (`public.search_logs`)
Logs Ask queries for operational visibility.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `uuid` | PK, default `gen_random_uuid()` | |
| `user_id` | `uuid` | FK `auth.users.id`, ON DELETE CASCADE, not null | Owner for RLS. |
| `query_text` | `text` | not null | The text of the user's question. |
| `created_at` | `timestamptz` | default `now()`, not null | |

### 3.6. Search Error Logs (`public.search_errors`)
Tracks failures during Ask processing (LLM issues, database failures, etc.).

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
- `search_logs(user_id)`
- `search_errors(user_id)`, `search_errors(search_log_id)`

## 5. Security (Row Level Security)

RLS is enabled on all user-owned tables in this scope.

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

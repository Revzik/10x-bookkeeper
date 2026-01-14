-- Migration: Create Core Tables
-- Purpose: Set up all core tables for the bookkeeper application
-- Affected: series, books, chapters, notes, note_embeddings, reading_sessions, search_logs, embedding_errors, search_errors
-- Special considerations: All tables reference auth.users for single-tenant isolation with CASCADE deletes for GDPR compliance

-- Table: series
-- Purpose: Groups books together (e.g., "Harry Potter", "Lord of the Rings")
-- RLS: Enabled (policies defined in separate migration)
create table public.series (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  cover_image_url text,
  book_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS on series table
-- Rationale: Ensures users can only access their own series data
alter table public.series enable row level security;

-- Table: books
-- Purpose: Core entity for tracking reading material
-- RLS: Enabled (policies defined in separate migration)
-- Constraints:
--   - current_page must be <= total_pages (check_progress)
--   - total_pages must be > 0
--   - current_page must be >= 0
create table public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  series_id uuid references public.series(id) on delete set null,
  title text not null,
  author text not null,
  total_pages int not null check (total_pages > 0),
  current_page int not null default 0 check (current_page >= 0),
  status book_status not null default 'want_to_read',
  cover_image_url text,
  series_order int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint check_progress check (current_page <= total_pages)
);

-- Enable RLS on books table
-- Rationale: Ensures users can only access their own books
alter table public.books enable row level security;

-- Table: chapters
-- Purpose: Structural unit for organizing notes within a book
-- RLS: Enabled (policies defined in separate migration)
create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  title text not null,
  "order" int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS on chapters table
-- Rationale: Ensures users can only access chapters from their own books
alter table public.chapters enable row level security;

-- Table: notes
-- Purpose: User-authored content associated with chapters
-- RLS: Enabled (policies defined in separate migration)
-- embedding_status: Tracks asynchronous vector generation lifecycle
-- embedding_duration: Performance metric for embedding generation (milliseconds)
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  content text not null,
  embedding_status embedding_status not null default 'pending',
  embedding_duration int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS on notes table
-- Rationale: Ensures users can only access their own notes
alter table public.notes enable row level security;

-- Table: note_embeddings
-- Purpose: Stores vector data for RAG (Retrieval-Augmented Generation)
-- RLS: Enabled (policies defined in separate migration)
-- Design: Separated from notes to support 1-to-many chunking and keep notes table lightweight
-- embedding: Uses OpenAI text-embedding-3-small (1536 dimensions)
-- chunk_content: The specific text segment that was embedded
create table public.note_embeddings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid not null references public.notes(id) on delete cascade,
  chunk_content text not null,
  embedding vector(1536) not null,
  created_at timestamptz not null default now()
);

-- Enable RLS on note_embeddings table
-- Rationale: Ensures users can only access embeddings from their own notes
alter table public.note_embeddings enable row level security;

-- Table: reading_sessions
-- Purpose: Tracks time spent reading for analytics and reading habits
-- RLS: Enabled (policies defined in separate migration)
-- ended_at: NULL indicates an active (ongoing) reading session
-- end_page: Page number reached at the end of the session
create table public.reading_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  end_page int
);

-- Enable RLS on reading_sessions table
-- Rationale: Ensures users can only access their own reading sessions
alter table public.reading_sessions enable row level security;

-- Table: search_logs
-- Purpose: Logs user queries for adoption metrics and value analysis
-- RLS: Enabled (policies defined in separate migration)
-- query_text: The actual search query submitted by the user
create table public.search_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  query_text text not null,
  created_at timestamptz not null default now()
);

-- Enable RLS on search_logs table
-- Rationale: Ensures users can only access their own search history
alter table public.search_logs enable row level security;

-- Table: embedding_errors
-- Purpose: Tracks failures during asynchronous embedding generation
-- RLS: Enabled (policies defined in separate migration)
-- note_id: Links to the note that failed embedding generation
-- error_message: Detailed error information for debugging
create table public.embedding_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  note_id uuid references public.notes(id) on delete cascade,
  error_message text not null,
  created_at timestamptz not null default now()
);

-- Enable RLS on embedding_errors table
-- Rationale: Ensures users can only access their own error logs
alter table public.embedding_errors enable row level security;

-- Table: search_errors
-- Purpose: Tracks failures during search/RAG operations (LLM issues, embedding API failures)
-- RLS: Enabled (policies defined in separate migration)
-- search_log_id: Optional link to the original query that failed
-- source: Categorizes where the error occurred (embedding, llm, database, unknown)
create table public.search_errors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  search_log_id uuid references public.search_logs(id) on delete set null,
  source error_source not null,
  error_message text not null,
  created_at timestamptz not null default now()
);

-- Enable RLS on search_errors table
-- Rationale: Ensures users can only access their own search error logs
alter table public.search_errors enable row level security;

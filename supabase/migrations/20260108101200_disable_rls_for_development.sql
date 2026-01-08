-- migration: disable RLS for development
-- purpose: temporarily disable all RLS policies for easier development
-- affected: all tables (profiles, series, books, chapters, notes, note_embeddings, reading_sessions, search_logs)
-- WARNING: this is for development only - re-enable RLS before production deployment

-- drop all policies from profiles table
drop policy if exists "authenticated users can select their own profile" on public.profiles;
drop policy if exists "authenticated users can insert their own profile" on public.profiles;
drop policy if exists "authenticated users can update their own profile" on public.profiles;
drop policy if exists "authenticated users can delete their own profile" on public.profiles;

-- drop all policies from series table
drop policy if exists "authenticated users can select their own series" on public.series;
drop policy if exists "authenticated users can insert their own series" on public.series;
drop policy if exists "authenticated users can update their own series" on public.series;
drop policy if exists "authenticated users can delete their own series" on public.series;

-- drop all policies from books table
drop policy if exists "authenticated users can select their own books" on public.books;
drop policy if exists "authenticated users can insert their own books" on public.books;
drop policy if exists "authenticated users can update their own books" on public.books;
drop policy if exists "authenticated users can delete their own books" on public.books;

-- drop all policies from chapters table
drop policy if exists "authenticated users can select their own chapters" on public.chapters;
drop policy if exists "authenticated users can insert their own chapters" on public.chapters;
drop policy if exists "authenticated users can update their own chapters" on public.chapters;
drop policy if exists "authenticated users can delete their own chapters" on public.chapters;

-- drop all policies from notes table
drop policy if exists "authenticated users can select their own notes" on public.notes;
drop policy if exists "authenticated users can insert their own notes" on public.notes;
drop policy if exists "authenticated users can update their own notes" on public.notes;
drop policy if exists "authenticated users can delete their own notes" on public.notes;

-- drop all policies from note_embeddings table
drop policy if exists "authenticated users can select their own note embeddings" on public.note_embeddings;
drop policy if exists "authenticated users can insert their own note embeddings" on public.note_embeddings;
drop policy if exists "authenticated users can update their own note embeddings" on public.note_embeddings;
drop policy if exists "authenticated users can delete their own note embeddings" on public.note_embeddings;

-- drop all policies from reading_sessions table
drop policy if exists "authenticated users can select their own reading sessions" on public.reading_sessions;
drop policy if exists "authenticated users can insert their own reading sessions" on public.reading_sessions;
drop policy if exists "authenticated users can update their own reading sessions" on public.reading_sessions;
drop policy if exists "authenticated users can delete their own reading sessions" on public.reading_sessions;

-- drop all policies from search_logs table
drop policy if exists "authenticated users can select their own search logs" on public.search_logs;
drop policy if exists "authenticated users can insert their own search logs" on public.search_logs;
drop policy if exists "authenticated users can update their own search logs" on public.search_logs;
drop policy if exists "authenticated users can delete their own search logs" on public.search_logs;

-- disable row level security on all tables
alter table public.profiles disable row level security;
alter table public.series disable row level security;
alter table public.books disable row level security;
alter table public.chapters disable row level security;
alter table public.notes disable row level security;
alter table public.note_embeddings disable row level security;
alter table public.reading_sessions disable row level security;
alter table public.search_logs disable row level security;

-- migration: create reading_sessions table
-- purpose: track time spent reading and reading progress over time
-- affected: public.reading_sessions

-- reading_sessions: logs reading activity for analytics and progress tracking
-- each session belongs to a user and a book
-- started_at is set automatically, ended_at is null while session is active
-- cascades on book or profile deletion
create table public.reading_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  end_page int
);

-- enable row level security
alter table public.reading_sessions enable row level security;

-- rls policy: allow authenticated users to select their own reading sessions
create policy "authenticated users can select their own reading sessions"
on public.reading_sessions
for select
to authenticated
using (user_id = auth.uid());

-- rls policy: allow authenticated users to insert their own reading sessions
create policy "authenticated users can insert their own reading sessions"
on public.reading_sessions
for insert
to authenticated
with check (user_id = auth.uid());

-- rls policy: allow authenticated users to update their own reading sessions
create policy "authenticated users can update their own reading sessions"
on public.reading_sessions
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- rls policy: allow authenticated users to delete their own reading sessions
create policy "authenticated users can delete their own reading sessions"
on public.reading_sessions
for delete
to authenticated
using (user_id = auth.uid());

-- index: speed up queries filtering by user_id
create index idx_reading_sessions_user_id on public.reading_sessions(user_id);

-- index: speed up queries filtering by book_id
create index idx_reading_sessions_book_id on public.reading_sessions(book_id);

-- migration: create books table
-- purpose: core entity for tracking reading material and progress
-- affected: public.books

-- books: represents individual books with reading progress tracking
-- each book belongs to a user and optionally to a series
-- cascades on profile deletion, sets series_id to null on series deletion
create table public.books (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
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
  
  -- ensure current_page never exceeds total_pages
  constraint check_progress check (current_page <= total_pages)
);

-- enable row level security
alter table public.books enable row level security;

-- rls policy: allow authenticated users to select their own books
create policy "authenticated users can select their own books"
on public.books
for select
to authenticated
using (user_id = auth.uid());

-- rls policy: allow authenticated users to insert their own books
create policy "authenticated users can insert their own books"
on public.books
for insert
to authenticated
with check (user_id = auth.uid());

-- rls policy: allow authenticated users to update their own books
create policy "authenticated users can update their own books"
on public.books
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- rls policy: allow authenticated users to delete their own books
create policy "authenticated users can delete their own books"
on public.books
for delete
to authenticated
using (user_id = auth.uid());

-- index: speed up queries filtering by user_id
create index idx_books_user_id on public.books(user_id);

-- index: speed up queries filtering by series_id
create index idx_books_series_id on public.books(series_id);

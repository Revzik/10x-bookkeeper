-- migration: create chapters table
-- purpose: structural unit for organizing notes within books
-- affected: public.chapters

-- chapters: organize notes into logical sections within a book
-- each chapter belongs to a book and cascades on book or profile deletion
create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  book_id uuid not null references public.books(id) on delete cascade,
  title text not null,
  book_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- enable row level security
alter table public.chapters enable row level security;

-- rls policy: allow authenticated users to select their own chapters
create policy "authenticated users can select their own chapters"
on public.chapters
for select
to authenticated
using (user_id = auth.uid());

-- rls policy: allow authenticated users to insert their own chapters
create policy "authenticated users can insert their own chapters"
on public.chapters
for insert
to authenticated
with check (user_id = auth.uid());

-- rls policy: allow authenticated users to update their own chapters
create policy "authenticated users can update their own chapters"
on public.chapters
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- rls policy: allow authenticated users to delete their own chapters
create policy "authenticated users can delete their own chapters"
on public.chapters
for delete
to authenticated
using (user_id = auth.uid());

-- index: speed up queries filtering by user_id
create index idx_chapters_user_id on public.chapters(user_id);

-- index: speed up queries filtering by book_id
create index idx_chapters_book_id on public.chapters(book_id);

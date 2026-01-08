-- migration: create notes table
-- purpose: store user-authored content and track embedding generation status
-- affected: public.notes

-- notes: user-authored content within chapters
-- each note belongs to a chapter and tracks embedding generation status
-- cascades on chapter or profile deletion
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  content text not null,
  embedding_status embedding_status not null default 'pending',
  embedding_duration int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- enable row level security
alter table public.notes enable row level security;

-- rls policy: allow authenticated users to select their own notes
create policy "authenticated users can select their own notes"
on public.notes
for select
to authenticated
using (user_id = auth.uid());

-- rls policy: allow authenticated users to insert their own notes
create policy "authenticated users can insert their own notes"
on public.notes
for insert
to authenticated
with check (user_id = auth.uid());

-- rls policy: allow authenticated users to update their own notes
create policy "authenticated users can update their own notes"
on public.notes
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- rls policy: allow authenticated users to delete their own notes
create policy "authenticated users can delete their own notes"
on public.notes
for delete
to authenticated
using (user_id = auth.uid());

-- index: speed up queries filtering by user_id
create index idx_notes_user_id on public.notes(user_id);

-- index: speed up queries filtering by chapter_id
create index idx_notes_chapter_id on public.notes(chapter_id);

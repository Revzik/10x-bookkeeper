-- migration: create series table
-- purpose: allow users to group related books into series
-- affected: public.series

-- series: groups books together (e.g., "Harry Potter", "Foundation")
-- each series belongs to a specific user and cascades on profile deletion
create table public.series (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  cover_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- enable row level security
alter table public.series enable row level security;

-- rls policy: allow authenticated users to select their own series
create policy "authenticated users can select their own series"
on public.series
for select
to authenticated
using (user_id = auth.uid());

-- rls policy: allow authenticated users to insert their own series
create policy "authenticated users can insert their own series"
on public.series
for insert
to authenticated
with check (user_id = auth.uid());

-- rls policy: allow authenticated users to update their own series
create policy "authenticated users can update their own series"
on public.series
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- rls policy: allow authenticated users to delete their own series
create policy "authenticated users can delete their own series"
on public.series
for delete
to authenticated
using (user_id = auth.uid());

-- index: speed up queries filtering by user_id
create index idx_series_user_id on public.series(user_id);

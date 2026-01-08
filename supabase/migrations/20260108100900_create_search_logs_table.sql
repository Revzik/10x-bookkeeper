-- migration: create search_logs table
-- purpose: log user search queries for adoption metrics and value analysis
-- affected: public.search_logs

-- search_logs: tracks user queries for analytics purposes
-- each log entry belongs to a user and records the search query text
-- cascades on profile deletion for GDPR compliance
create table public.search_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  query_text text not null,
  created_at timestamptz not null default now()
);

-- enable row level security
alter table public.search_logs enable row level security;

-- rls policy: allow authenticated users to select their own search logs
create policy "authenticated users can select their own search logs"
on public.search_logs
for select
to authenticated
using (user_id = auth.uid());

-- rls policy: allow authenticated users to insert their own search logs
create policy "authenticated users can insert their own search logs"
on public.search_logs
for insert
to authenticated
with check (user_id = auth.uid());

-- rls policy: allow authenticated users to update their own search logs
create policy "authenticated users can update their own search logs"
on public.search_logs
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- rls policy: allow authenticated users to delete their own search logs
create policy "authenticated users can delete their own search logs"
on public.search_logs
for delete
to authenticated
using (user_id = auth.uid());

-- index: speed up queries filtering by user_id
create index idx_search_logs_user_id on public.search_logs(user_id);

-- migration: create profiles table
-- purpose: extend supabase auth users with custom profile data
-- affected: public.profiles
-- note: this table directly references auth.users and cascades on deletion for GDPR compliance

-- profiles: extends the default supabase auth user
-- currently minimal, but provides a foundation for future profile fields
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade
);

-- enable row level security
alter table public.profiles enable row level security;

-- rls policy: allow authenticated users to select their own profile
create policy "authenticated users can select their own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

-- rls policy: allow authenticated users to insert their own profile
create policy "authenticated users can insert their own profile"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

-- rls policy: allow authenticated users to update their own profile
create policy "authenticated users can update their own profile"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- rls policy: allow authenticated users to delete their own profile
create policy "authenticated users can delete their own profile"
on public.profiles
for delete
to authenticated
using (id = auth.uid());

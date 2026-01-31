-- Migration: Create Row Level Security Policies
-- Purpose: Implement RLS policies for all tables to ensure single-tenant data isolation
-- Affected: All tables (series, books, chapters, notes, search_logs, search_errors)
-- Special considerations: Granular policies per operation (select, insert, update, delete) for authenticated role only
-- Security Model: Users can only access rows where user_id matches their authenticated ID (auth.uid())

-- ============================================================
-- RLS Policies for: series
-- ============================================================

-- Policy: Allow authenticated users to SELECT their own series
-- Rationale: Users should only see series they created
create policy "Authenticated users can select their own series"
on public.series
for select
to authenticated
using (user_id = (select auth.uid()));

-- Policy: Allow authenticated users to INSERT their own series
-- Rationale: Users can create new series for organizing their books
create policy "Authenticated users can insert their own series"
on public.series
for insert
to authenticated
with check (user_id = (select auth.uid()));

-- Policy: Allow authenticated users to UPDATE their own series
-- Rationale: Users can modify series metadata (title, description, cover)
create policy "Authenticated users can update their own series"
on public.series
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Policy: Allow authenticated users to DELETE their own series
-- Rationale: Users can remove series they no longer need
create policy "Authenticated users can delete their own series"
on public.series
for delete
to authenticated
using (user_id = (select auth.uid()));

-- ============================================================
-- RLS Policies for: books
-- ============================================================

-- Policy: Allow authenticated users to SELECT their own books
-- Rationale: Users should only see books they added to their library
create policy "Authenticated users can select their own books"
on public.books
for select
to authenticated
using (user_id = (select auth.uid()));

-- Policy: Allow authenticated users to INSERT their own books
-- Rationale: Users can add new books to their reading list
create policy "Authenticated users can insert their own books"
on public.books
for insert
to authenticated
with check (user_id = (select auth.uid()));

-- Policy: Allow authenticated users to UPDATE their own books
-- Rationale: Users can update reading progress, status, and metadata
create policy "Authenticated users can update their own books"
on public.books
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Policy: Allow authenticated users to DELETE their own books
-- Rationale: Users can remove books from their library
create policy "Authenticated users can delete their own books"
on public.books
for delete
to authenticated
using (user_id = (select auth.uid()));

-- ============================================================
-- RLS Policies for: chapters
-- ============================================================

-- Policy: Allow authenticated users to SELECT their own chapters
-- Rationale: Users should only see chapters from books they own
create policy "Authenticated users can select their own chapters"
on public.chapters
for select
to authenticated
using (user_id = (select auth.uid()));

-- Policy: Allow authenticated users to INSERT their own chapters
-- Rationale: Users can create chapters to organize notes within their books
create policy "Authenticated users can insert their own chapters"
on public.chapters
for insert
to authenticated
with check (user_id = (select auth.uid()));

-- Policy: Allow authenticated users to UPDATE their own chapters
-- Rationale: Users can modify chapter titles and ordering
create policy "Authenticated users can update their own chapters"
on public.chapters
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Policy: Allow authenticated users to DELETE their own chapters
-- Rationale: Users can remove chapters they no longer need
create policy "Authenticated users can delete their own chapters"
on public.chapters
for delete
to authenticated
using (user_id = (select auth.uid()));

-- ============================================================
-- RLS Policies for: notes
-- ============================================================

-- Policy: Allow authenticated users to SELECT their own notes
-- Rationale: Users should only see notes they authored
create policy "Authenticated users can select their own notes"
on public.notes
for select
to authenticated
using (user_id = (select auth.uid()));

-- Policy: Allow authenticated users to INSERT their own notes
-- Rationale: Users can create notes while reading
create policy "Authenticated users can insert their own notes"
on public.notes
for insert
to authenticated
with check (user_id = (select auth.uid()));

-- Policy: Allow authenticated users to UPDATE their own notes
-- Rationale: Users can edit note content
create policy "Authenticated users can update their own notes"
on public.notes
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Policy: Allow authenticated users to DELETE their own notes
-- Rationale: Users can remove notes they no longer want
create policy "Authenticated users can delete their own notes"
on public.notes
for delete
to authenticated
using (user_id = (select auth.uid()));

-- ============================================================
-- RLS Policies for: search_logs
-- ============================================================

-- Policy: Allow authenticated users to SELECT their own search logs
-- Rationale: Users should only see their own search history
create policy "Authenticated users can select their own search logs"
on public.search_logs
for select
to authenticated
using (user_id = (select auth.uid()));

-- Policy: Allow authenticated users to INSERT their own search logs
-- Rationale: Search queries are logged for analytics and user benefit
create policy "Authenticated users can insert their own search logs"
on public.search_logs
for insert
to authenticated
with check (user_id = (select auth.uid()));

-- Policy: Allow authenticated users to UPDATE their own search logs
-- Rationale: Limited use case, but allows modification if needed
create policy "Authenticated users can update their own search logs"
on public.search_logs
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Policy: Allow authenticated users to DELETE their own search logs
-- Rationale: Users may want to clear their search history
create policy "Authenticated users can delete their own search logs"
on public.search_logs
for delete
to authenticated
using (user_id = (select auth.uid()));

-- ============================================================
-- RLS Policies for: search_errors
-- ============================================================

-- Policy: Allow authenticated users to SELECT their own search errors
-- Rationale: Users and admin tools should see search failures
create policy "Authenticated users can select their own search errors"
on public.search_errors
for select
to authenticated
using (user_id = (select auth.uid()));

-- Policy: Allow authenticated users to INSERT their own search errors
-- Rationale: Search processes log failures for debugging and monitoring
create policy "Authenticated users can insert their own search errors"
on public.search_errors
for insert
to authenticated
with check (user_id = (select auth.uid()));

-- Policy: Allow authenticated users to UPDATE their own search errors
-- Rationale: Error records may need status updates or annotations
create policy "Authenticated users can update their own search errors"
on public.search_errors
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Policy: Allow authenticated users to DELETE their own search errors
-- Rationale: Users may want to clear resolved errors
create policy "Authenticated users can delete their own search errors"
on public.search_errors
for delete
to authenticated
using (user_id = (select auth.uid()));

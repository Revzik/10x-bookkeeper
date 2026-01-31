-- Migration: Create Functions and Triggers
-- Purpose: Implement automated timestamp updates
-- Affected: All tables with updated_at
-- Special considerations: These functions enable core app functionality and data consistency

-- ============================================================
-- Function: handle_updated_at
-- Purpose: Automatically update the updated_at timestamp when a row is modified
-- Returns: The modified row with refreshed updated_at timestamp
-- Usage: Applied as a BEFORE UPDATE trigger on tables with updated_at column
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Set the updated_at column to the current timestamp
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- Trigger: Automatically update updated_at for series
-- ============================================================
create trigger set_updated_at_series
before update on public.series
for each row
execute function public.handle_updated_at();

-- ============================================================
-- Trigger: Automatically update updated_at for books
-- ============================================================
create trigger set_updated_at_books
before update on public.books
for each row
execute function public.handle_updated_at();

-- ============================================================
-- Trigger: Automatically update updated_at for chapters
-- ============================================================
create trigger set_updated_at_chapters
before update on public.chapters
for each row
execute function public.handle_updated_at();

-- ============================================================
-- Trigger: Automatically update updated_at for notes
-- ============================================================
create trigger set_updated_at_notes
before update on public.notes
for each row
execute function public.handle_updated_at();

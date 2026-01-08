-- migration: create updated_at trigger function
-- purpose: automatically update updated_at timestamp on row modifications
-- affected: reusable function for multiple tables

-- handle_updated_at: trigger function to refresh updated_at timestamp
-- this function is called before update operations to ensure updated_at is always current
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- apply trigger to series table
create trigger set_updated_at
before update on public.series
for each row
execute function public.handle_updated_at();

-- apply trigger to books table
create trigger set_updated_at
before update on public.books
for each row
execute function public.handle_updated_at();

-- apply trigger to chapters table
create trigger set_updated_at
before update on public.chapters
for each row
execute function public.handle_updated_at();

-- apply trigger to notes table
create trigger set_updated_at
before update on public.notes
for each row
execute function public.handle_updated_at();

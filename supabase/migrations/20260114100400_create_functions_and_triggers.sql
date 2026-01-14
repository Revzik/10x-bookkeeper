-- Migration: Create Functions and Triggers
-- Purpose: Implement automated timestamp updates, series book count maintenance, and vector search
-- Affected: All tables with updated_at, books table (for series count), note_embeddings (for RAG)
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

-- ============================================================
-- Function: update_series_book_count
-- Purpose: Maintain the cached book_count in the series table
-- Behavior:
--   - On INSERT: Increment book_count for the series
--   - On UPDATE: Handle moving books between series (decrement old, increment new)
--   - On DELETE: Decrement book_count for the series
-- Returns: The modified book row (or null for DELETE)
-- ============================================================
create or replace function public.update_series_book_count()
returns trigger
language plpgsql
as $$
begin
  -- Handle INSERT: A book was added to a series
  if (tg_op = 'INSERT') then
    if new.series_id is not null then
      -- Increment the book count for the series
      update public.series
      set book_count = book_count + 1
      where id = new.series_id;
    end if;
    return new;
  end if;

  -- Handle UPDATE: A book's series_id was changed
  if (tg_op = 'UPDATE') then
    -- If series_id changed from non-null to different value or null
    if old.series_id is distinct from new.series_id then
      -- Decrement count from old series
      if old.series_id is not null then
        update public.series
        set book_count = book_count - 1
        where id = old.series_id;
      end if;
      
      -- Increment count for new series
      if new.series_id is not null then
        update public.series
        set book_count = book_count + 1
        where id = new.series_id;
      end if;
    end if;
    return new;
  end if;

  -- Handle DELETE: A book was removed
  if (tg_op = 'DELETE') then
    if old.series_id is not null then
      -- Decrement the book count for the series
      update public.series
      set book_count = book_count - 1
      where id = old.series_id;
    end if;
    return old;
  end if;

  return null;
end;
$$;

-- ============================================================
-- Trigger: Update series book count on INSERT
-- ============================================================
create trigger update_series_book_count_on_insert
after insert on public.books
for each row
execute function public.update_series_book_count();

-- ============================================================
-- Trigger: Update series book count on UPDATE
-- ============================================================
create trigger update_series_book_count_on_update
after update on public.books
for each row
execute function public.update_series_book_count();

-- ============================================================
-- Trigger: Update series book count on DELETE
-- ============================================================
create trigger update_series_book_count_on_delete
after delete on public.books
for each row
execute function public.update_series_book_count();

-- ============================================================
-- Function: match_notes
-- Purpose: Perform vector similarity search for RAG (Retrieval-Augmented Generation)
-- Parameters:
--   - query_embedding: The vector representation of the user's search query (1536 dimensions)
--   - match_threshold: Minimum similarity score (0-1, where 1 is perfect match)
--   - match_count: Maximum number of results to return
--   - filter_book_id: Optional UUID to limit search to a specific book
-- Returns: Table with matching note embeddings and their context (book, chapter info)
-- Security: Function respects RLS - only returns results for the authenticated user
-- Performance: Uses HNSW index on embeddings for fast similarity search
-- ============================================================
create or replace function public.match_notes(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_book_id uuid default null
)
returns table (
  id uuid,
  note_id uuid,
  chunk_content text,
  similarity float,
  book_id uuid,
  chapter_id uuid,
  chapter_title text,
  book_title text
)
language plpgsql
stable
as $$
begin
  return query
  select
    ne.id,
    ne.note_id,
    ne.chunk_content,
    -- Calculate similarity score (1 - cosine distance = cosine similarity)
    1 - (ne.embedding <=> query_embedding) as similarity,
    b.id as book_id,
    c.id as chapter_id,
    c.title as chapter_title,
    b.title as book_title
  from public.note_embeddings ne
  inner join public.notes n on n.id = ne.note_id
  inner join public.chapters c on c.id = n.chapter_id
  inner join public.books b on b.id = c.book_id
  where
    -- RLS enforcement: Only show results for the authenticated user
    ne.user_id = auth.uid()
    -- Apply similarity threshold
    and 1 - (ne.embedding <=> query_embedding) > match_threshold
    -- Optional: Filter by specific book
    and (filter_book_id is null or b.id = filter_book_id)
  order by
    -- Sort by similarity descending (best matches first)
    ne.embedding <=> query_embedding
  limit match_count;
end;
$$;

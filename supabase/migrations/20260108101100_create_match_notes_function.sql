-- migration: create match_notes function
-- purpose: perform similarity search on note embeddings for RAG queries
-- affected: public.match_notes function
-- note: this function joins across multiple tables to provide rich context with search results

-- match_notes: vector similarity search function for RAG
-- parameters:
--   query_embedding: the vector to search for (1536 dimensions for text-embedding-3-small)
--   match_threshold: minimum similarity score (0-1, where 1 is identical)
--   match_count: maximum number of results to return
--   filter_book_id: optional filter to search within a specific book only
-- returns: matching note embeddings with similarity scores and context (book/chapter titles)
-- security: automatically respects RLS policies on joined tables
create or replace function public.match_notes (
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
as $$
begin
  return query
  select
    ne.id,
    ne.note_id,
    ne.chunk_content,
    1 - (ne.embedding <=> query_embedding) as similarity,
    b.id as book_id,
    c.id as chapter_id,
    c.title as chapter_title,
    b.title as book_title
  from public.note_embeddings ne
  inner join public.notes n on ne.note_id = n.id
  inner join public.chapters c on n.chapter_id = c.id
  inner join public.books b on c.book_id = b.id
  where 
    -- filter by similarity threshold
    1 - (ne.embedding <=> query_embedding) > match_threshold
    -- optionally filter by book_id
    and (filter_book_id is null or b.id = filter_book_id)
    -- RLS automatically filters by user_id on all joined tables
  order by ne.embedding <=> query_embedding
  limit match_count;
end;
$$;

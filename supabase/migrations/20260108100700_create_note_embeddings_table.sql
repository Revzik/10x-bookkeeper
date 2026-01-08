-- migration: create note_embeddings table
-- purpose: store vector embeddings for RAG (Retrieval-Augmented Generation) capabilities
-- affected: public.note_embeddings
-- note: separated from notes table to support 1-to-many chunking and keep notes table lightweight

-- note_embeddings: stores vector data for semantic search
-- each embedding belongs to a note and can represent a chunk of the note's content
-- cascades on note or profile deletion
-- uses vector(1536) for OpenAI text-embedding-3-small model
create table public.note_embeddings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  note_id uuid not null references public.notes(id) on delete cascade,
  chunk_content text not null,
  embedding vector(1536) not null,
  created_at timestamptz not null default now()
);

-- enable row level security
alter table public.note_embeddings enable row level security;

-- rls policy: allow authenticated users to select their own note embeddings
create policy "authenticated users can select their own note embeddings"
on public.note_embeddings
for select
to authenticated
using (user_id = auth.uid());

-- rls policy: allow authenticated users to insert their own note embeddings
create policy "authenticated users can insert their own note embeddings"
on public.note_embeddings
for insert
to authenticated
with check (user_id = auth.uid());

-- rls policy: allow authenticated users to update their own note embeddings
create policy "authenticated users can update their own note embeddings"
on public.note_embeddings
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- rls policy: allow authenticated users to delete their own note embeddings
create policy "authenticated users can delete their own note embeddings"
on public.note_embeddings
for delete
to authenticated
using (user_id = auth.uid());

-- index: speed up queries filtering by user_id
create index idx_note_embeddings_user_id on public.note_embeddings(user_id);

-- index: speed up queries filtering by note_id
create index idx_note_embeddings_note_id on public.note_embeddings(note_id);

-- vector index: accelerate similarity search for RAG queries
-- uses HNSW (Hierarchical Navigable Small World) algorithm for efficient nearest neighbor search
-- vector_cosine_ops operator enables cosine similarity distance calculations
create index idx_note_embeddings_vector on public.note_embeddings 
using hnsw (embedding vector_cosine_ops);

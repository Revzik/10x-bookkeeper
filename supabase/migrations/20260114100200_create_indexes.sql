-- Migration: Create Indexes
-- Purpose: Add indexes for foreign keys and vector similarity search to improve query performance
-- Affected: All tables with foreign keys, note_embeddings (vector index)
-- Special considerations: Vector index uses HNSW algorithm for efficient similarity search

-- Foreign Key Indexes for series table
-- Purpose: Speed up joins and filtering by user_id
create index idx_series_user_id on public.series(user_id);

-- Foreign Key Indexes for books table
-- Purpose: Speed up joins and filtering by user_id and series_id
create index idx_books_user_id on public.books(user_id);
create index idx_books_series_id on public.books(series_id);

-- Foreign Key Indexes for chapters table
-- Purpose: Speed up joins and filtering by user_id and book_id
create index idx_chapters_user_id on public.chapters(user_id);
create index idx_chapters_book_id on public.chapters(book_id);

-- Foreign Key Indexes for notes table
-- Purpose: Speed up joins and filtering by user_id and chapter_id
create index idx_notes_user_id on public.notes(user_id);
create index idx_notes_chapter_id on public.notes(chapter_id);

-- Foreign Key Indexes for note_embeddings table
-- Purpose: Speed up joins and filtering by user_id and note_id
create index idx_note_embeddings_user_id on public.note_embeddings(user_id);
create index idx_note_embeddings_note_id on public.note_embeddings(note_id);

-- Vector Index for note_embeddings table
-- Purpose: Accelerate similarity search for RAG (Retrieval-Augmented Generation) queries
-- Algorithm: HNSW (Hierarchical Navigable Small World) - efficient approximate nearest neighbor search
-- Operator: vector_cosine_ops - uses cosine similarity for vector comparisons
-- Performance: Enables fast semantic search across large collections of note embeddings
create index idx_note_embeddings_vector on public.note_embeddings 
using hnsw (embedding vector_cosine_ops);

-- Foreign Key Indexes for reading_sessions table
-- Purpose: Speed up joins and filtering by user_id and book_id
create index idx_reading_sessions_user_id on public.reading_sessions(user_id);
create index idx_reading_sessions_book_id on public.reading_sessions(book_id);

-- Foreign Key Indexes for search_logs table
-- Purpose: Speed up joins and filtering by user_id
create index idx_search_logs_user_id on public.search_logs(user_id);

-- Foreign Key Indexes for embedding_errors table
-- Purpose: Speed up joins and filtering by user_id and note_id
create index idx_embedding_errors_user_id on public.embedding_errors(user_id);
create index idx_embedding_errors_note_id on public.embedding_errors(note_id);

-- Foreign Key Indexes for search_errors table
-- Purpose: Speed up joins and filtering by user_id and search_log_id
create index idx_search_errors_user_id on public.search_errors(user_id);
create index idx_search_errors_search_log_id on public.search_errors(search_log_id);

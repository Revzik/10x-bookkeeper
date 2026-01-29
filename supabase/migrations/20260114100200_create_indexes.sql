-- Migration: Create Indexes
-- Purpose: Add indexes for foreign keys to improve query performance
-- Affected: All tables with foreign keys
-- Special considerations: Indexes are created for all foreign key relationships

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

-- Foreign Key Indexes for search_logs table
-- Purpose: Speed up joins and filtering by user_id
create index idx_search_logs_user_id on public.search_logs(user_id);

-- Foreign Key Indexes for search_errors table
-- Purpose: Speed up joins and filtering by user_id and search_log_id
create index idx_search_errors_user_id on public.search_errors(user_id);
create index idx_search_errors_search_log_id on public.search_errors(search_log_id);

-- migration: create enum types
-- purpose: define custom enum types for book status and embedding status
-- affected: enum types

-- book_status: tracks the reading state of a book
-- want_to_read: book is on the user's reading list
-- reading: book is currently being read
-- completed: book has been finished
create type book_status as enum ('want_to_read', 'reading', 'completed');

-- embedding_status: tracks the state of vector embedding generation
-- pending: note has been created but embedding not yet generated
-- processing: embedding generation is in progress
-- completed: embedding has been successfully generated and stored
-- failed: embedding generation encountered an error
create type embedding_status as enum ('pending', 'processing', 'completed', 'failed');

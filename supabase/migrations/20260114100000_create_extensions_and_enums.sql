-- Migration: Create Extensions and Enums
-- Purpose: Set up pgvector extension and define custom enum types for the bookkeeper application
-- Affected: Database extensions, custom types
-- Special considerations: This must be the first migration as other tables depend on these types

-- Enable pgvector extension for RAG (Retrieval-Augmented Generation) capabilities
-- This extension provides vector data types and similarity search operations
create extension if not exists vector;

-- Enum: book_status
-- Purpose: Defines the three possible reading states for a book
-- Values:
--   - want_to_read: Book is on the user's reading list but not started
--   - reading: Book is currently being read
--   - completed: Book has been finished
create type book_status as enum ('want_to_read', 'reading', 'completed');

-- Enum: embedding_status
-- Purpose: Tracks the lifecycle of asynchronous embedding generation for notes
-- Values:
--   - pending: Embedding job has been queued but not started
--   - processing: Embedding is currently being generated
--   - completed: Embedding has been successfully created and stored
--   - failed: Embedding generation encountered an error
create type embedding_status as enum ('pending', 'processing', 'completed', 'failed');

-- Enum: error_source
-- Purpose: Categorizes the origin of errors during search/AI operations
-- Values:
--   - embedding: Error occurred during embedding generation (OpenAI API, etc.)
--   - llm: Error occurred during LLM/chat completion operations
--   - database: Error occurred during database operations
--   - unknown: Error source could not be determined
create type error_source as enum ('embedding', 'llm', 'database', 'unknown');

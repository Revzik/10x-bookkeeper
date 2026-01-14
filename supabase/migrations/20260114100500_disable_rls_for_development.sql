-- Migration: Disable RLS for Development
-- Purpose: Disable Row Level Security on all tables for easier development and testing
-- Affected: All tables (series, books, chapters, notes, note_embeddings, reading_sessions, search_logs, embedding_errors, search_errors)
-- ⚠️  WARNING: THIS IS FOR DEVELOPMENT ONLY - DO NOT USE IN PRODUCTION ⚠️
-- Special considerations: This migration should be reverted before deploying to production
-- To re-enable RLS in production, you can either:
--   1. Not apply this migration to production environments
--   2. Create a new migration that re-enables RLS on all tables

-- DESTRUCTIVE OPERATION: Disabling RLS removes all security controls
-- Without RLS, any authenticated user can access ALL data in these tables
-- This is acceptable for local development but DANGEROUS in production

-- Disable RLS on series table
alter table public.series disable row level security;

-- Disable RLS on books table
alter table public.books disable row level security;

-- Disable RLS on chapters table
alter table public.chapters disable row level security;

-- Disable RLS on notes table
alter table public.notes disable row level security;

-- Disable RLS on note_embeddings table
alter table public.note_embeddings disable row level security;

-- Disable RLS on reading_sessions table
alter table public.reading_sessions disable row level security;

-- Disable RLS on search_logs table
alter table public.search_logs disable row level security;

-- Disable RLS on embedding_errors table
alter table public.embedding_errors disable row level security;

-- Disable RLS on search_errors table
alter table public.search_errors disable row level security;

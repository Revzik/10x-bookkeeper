-- migration: enable required extensions
-- purpose: enable pgvector extension for RAG capabilities
-- affected: database extensions

-- enable pgvector for embedding storage and similarity search
create extension if not exists vector;

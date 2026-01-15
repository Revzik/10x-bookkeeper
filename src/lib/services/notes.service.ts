import type { supabaseClient } from "../../db/supabase.client";
import type { CreateNoteCommand, NoteDto, NoteListItemDto, NotesListQueryDto, PaginationMetaDto } from "../../types";
import { verifyChapterExists } from "./chapters.service";
import { applyPaginationConstraints, buildPaginationMeta } from "./shared.service";

export type SupabaseClientType = typeof supabaseClient;

/**
 * Creates a new note under a specific chapter.
 * The note is created with `embedding_status = "pending"` to enqueue embedding generation.
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to associate with the note
 * @param chapterId - Chapter ID to associate with the note
 * @param command - Note creation data
 * @returns The created note as NoteDto
 * @throws NotFoundError if the chapter doesn't exist for the user
 * @throws Error if the insert operation fails
 */
export async function createNote({
  supabase,
  userId,
  chapterId,
  command,
}: {
  supabase: SupabaseClientType;
  userId: string;
  chapterId: string;
  command: CreateNoteCommand;
}): Promise<NoteDto> {
  // Verify the chapter exists and belongs to the user
  await verifyChapterExists({ supabase, userId, chapterId });

  // Insert the note with embedding_status = "pending"
  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: userId,
      chapter_id: chapterId,
      content: command.content,
      embedding_status: "pending",
    })
    .select("id, chapter_id, content, embedding_status, embedding_duration, created_at, updated_at")
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Failed to create note: no data returned");
  }

  return data;
}

/**
 * Lists notes with pagination and filters.
 * Supports filtering by chapter_id, book_id, series_id, and embedding_status.
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to filter notes by
 * @param query - Query parameters (page, size, filters, sort, order)
 * @returns Object containing notes list and pagination metadata
 * @throws Error if the query operation fails
 */
export async function listNotes({
  supabase,
  userId,
  query,
}: {
  supabase: SupabaseClientType;
  userId: string;
  query: NotesListQueryDto;
}): Promise<{ notes: NoteListItemDto[]; meta: PaginationMetaDto }> {
  // Apply pagination constraints
  const { page, size, from, to } = applyPaginationConstraints(query.page, query.size);
  const sort = query.sort ?? "updated_at";
  const order = query.order ?? "desc";

  // Build select clause based on filters
  // If we need to filter by book_id or series_id, we need to include the join in the select
  let selectClause = "id, chapter_id, content, embedding_status, created_at, updated_at";

  if (query.book_id) {
    selectClause = "id, chapter_id, content, embedding_status, created_at, updated_at, chapters!inner(book_id)";
  } else if (query.series_id) {
    selectClause =
      "id, chapter_id, content, embedding_status, created_at, updated_at, chapters!inner(books!inner(series_id))";
  }

  // Build base query with the appropriate select clause
  let dbQuery = supabase.from("notes").select(selectClause, { count: "exact" }).eq("user_id", userId);

  // Apply filters
  if (query.chapter_id) {
    dbQuery = dbQuery.eq("chapter_id", query.chapter_id);
  }

  if (query.embedding_status) {
    dbQuery = dbQuery.eq("embedding_status", query.embedding_status);
  }

  if (query.book_id) {
    dbQuery = dbQuery.eq("chapters.book_id", query.book_id);
  }

  if (query.series_id) {
    dbQuery = dbQuery.eq("chapters.books.series_id", query.series_id);
  }

  // Apply sorting (whitelist only allowed fields)
  const allowedSortFields = ["created_at", "updated_at"] as const;
  if (allowedSortFields.includes(sort as (typeof allowedSortFields)[number])) {
    dbQuery = dbQuery.order(sort, { ascending: order === "asc" });
  }

  // Apply pagination
  dbQuery = dbQuery.range(from, to);

  // Execute query
  const { data, error, count } = await dbQuery;

  if (error) {
    throw error;
  }

  // Map data to ensure we only return NoteListItemDto fields (no embedded data)
  // TypeScript doesn't know the exact shape when joins are involved, so we cast the data
  const rawData = data as unknown as Record<string, unknown>[];
  const notes: NoteListItemDto[] =
    rawData?.map((row) => ({
      id: row.id as string,
      chapter_id: row.chapter_id as string,
      content: row.content as string,
      embedding_status: row.embedding_status as NoteListItemDto["embedding_status"],
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    })) ?? [];

  return {
    notes,
    meta: buildPaginationMeta(page, size, count ?? 0),
  };
}

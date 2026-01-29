import type { supabaseClient } from "../../db/supabase.client";
import type {
  CreateNoteCommand,
  NoteDto,
  NoteListItemDto,
  NotesListQueryDto,
  PaginationMetaDto,
  UpdateNoteCommand,
  NoteContextDto,
} from "../../types";
import { NotFoundError } from "../errors";
import { verifyChapterExists } from "./chapters.service";
import { applyPaginationConstraints, buildPaginationMeta } from "./shared.service";

export type SupabaseClientType = typeof supabaseClient;

/**
 * Creates a new note under a specific chapter.
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

  // Insert the note
  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: userId,
      chapter_id: chapterId,
      content: command.content,
    })
    .select("id, chapter_id, content, created_at, updated_at")
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
 * Supports filtering by chapter_id, book_id, and series_id.
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
  let selectClause = "id, chapter_id, content, created_at, updated_at";

  if (query.book_id) {
    selectClause = "id, chapter_id, content, created_at, updated_at, chapters!inner(book_id)";
  } else if (query.series_id) {
    selectClause = "id, chapter_id, content, created_at, updated_at, chapters!inner(books!inner(series_id))";
  }

  // Build base query with the appropriate select clause
  let dbQuery = supabase.from("notes").select(selectClause, { count: "exact" }).eq("user_id", userId);

  // Apply filters
  if (query.chapter_id) {
    dbQuery = dbQuery.eq("chapter_id", query.chapter_id);
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
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    })) ?? [];

  return {
    notes,
    meta: buildPaginationMeta(page, size, count ?? 0),
  };
}

/**
 * Verifies that a note exists and belongs to the specified user.
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to verify ownership
 * @param noteId - Note ID to verify
 * @throws NotFoundError if the note doesn't exist or doesn't belong to the user
 */
export async function verifyNoteExists({
  supabase,
  userId,
  noteId,
}: {
  supabase: SupabaseClientType;
  userId: string;
  noteId: string;
}): Promise<void> {
  const { data, error } = await supabase
    .from("notes")
    .select("id")
    .eq("id", noteId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new NotFoundError("Note not found");
  }
}

/**
 * Fetches a note without context (simple query).
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to filter by
 * @param noteId - Note ID to retrieve
 * @returns Note data
 * @throws NotFoundError if the note doesn't exist for the user
 * @throws Error if the query operation fails
 */
async function fetchNoteWithoutContext({
  supabase,
  userId,
  noteId,
}: {
  supabase: SupabaseClientType;
  userId: string;
  noteId: string;
}): Promise<NoteDto> {
  const { data, error } = await supabase
    .from("notes")
    .select("id, chapter_id, content, created_at, updated_at")
    .eq("id", noteId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new NotFoundError("Note not found");
  }

  return data;
}

/**
 * Fetches a note with chapter/book context (query with joins).
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to filter by
 * @param noteId - Note ID to retrieve
 * @returns Object containing note and context
 * @throws NotFoundError if the note doesn't exist for the user
 * @throws Error if the query operation fails
 */
async function fetchNoteWithContext({
  supabase,
  userId,
  noteId,
}: {
  supabase: SupabaseClientType;
  userId: string;
  noteId: string;
}): Promise<{ note: NoteDto; context: NoteContextDto }> {
  const { data, error } = await supabase
    .from("notes")
    .select(
      `
      id,
      chapter_id,
      content,
      created_at,
      updated_at,
      chapters!inner(
        id,
        title,
        book_id,
        books!inner(
          id,
          title
        )
      )
    `
    )
    .eq("id", noteId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new NotFoundError("Note not found");
  }

  // Extract note fields
  const note: NoteDto = {
    id: data.id,
    chapter_id: data.chapter_id,
    content: data.content,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };

  // Extract context from joined data
  // TypeScript doesn't know the exact shape of the joined data, so we cast it
  const rawData = data as unknown as {
    chapters: {
      id: string;
      title: string;
      book_id: string;
      books: {
        id: string;
        title: string;
      };
    };
  };

  const context: NoteContextDto = {
    book_id: rawData.chapters.book_id,
    book_title: rawData.chapters.books.title,
    chapter_id: rawData.chapters.id,
    chapter_title: rawData.chapters.title,
  };

  return { note, context };
}

/**
 * Retrieves a single note by ID, optionally including chapter/book context.
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to filter by
 * @param noteId - Note ID to retrieve
 * @param includeContext - Whether to include chapter/book context
 * @returns Object containing note and optional context
 * @throws NotFoundError if the note doesn't exist for the user
 * @throws Error if the query operation fails
 */
export async function getNoteById({
  supabase,
  userId,
  noteId,
  includeContext = false,
}: {
  supabase: SupabaseClientType;
  userId: string;
  noteId: string;
  includeContext?: boolean;
}): Promise<{ note: NoteDto; context?: NoteContextDto }> {
  if (includeContext) {
    return await fetchNoteWithContext({ supabase, userId, noteId });
  } else {
    const note = await fetchNoteWithoutContext({ supabase, userId, noteId });
    return { note };
  }
}

/**
 * Updates a note's content and/or chapter assignment by ID.
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to verify ownership
 * @param noteId - Note ID to update
 * @param command - Update command with new content and/or chapter_id
 * @returns Updated note with id, content, chapter_id, and updated_at
 * @throws NotFoundError if the note or chapter doesn't exist for the user
 * @throws Error if the update operation fails
 */
export async function updateNoteById({
  supabase,
  userId,
  noteId,
  command,
}: {
  supabase: SupabaseClientType;
  userId: string;
  noteId: string;
  command: UpdateNoteCommand;
}): Promise<Pick<NoteDto, "id" | "content" | "chapter_id" | "updated_at">> {
  // If chapter_id is being updated, verify the new chapter exists and belongs to the user
  if (command.chapter_id !== undefined) {
    await verifyChapterExists({ supabase, userId, chapterId: command.chapter_id });
  }

  // Build update object with only provided fields
  const updateData: Record<string, unknown> = {};
  if (command.content !== undefined) {
    updateData.content = command.content;
  }
  if (command.chapter_id !== undefined) {
    updateData.chapter_id = command.chapter_id;
  }

  const { data, error } = await supabase
    .from("notes")
    .update(updateData)
    .eq("id", noteId)
    .eq("user_id", userId)
    .select("id, content, chapter_id, updated_at")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new NotFoundError("Note not found");
  }

  return data;
}

/**
 * Deletes a note by ID.
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to verify ownership
 * @param noteId - Note ID to delete
 * @throws NotFoundError if the note doesn't exist for the user
 * @throws Error if the delete operation fails
 */
export async function deleteNoteById({
  supabase,
  userId,
  noteId,
}: {
  supabase: SupabaseClientType;
  userId: string;
  noteId: string;
}): Promise<void> {
  const { data, error } = await supabase
    .from("notes")
    .delete()
    .eq("id", noteId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new NotFoundError("Note not found");
  }
}

import type { supabaseClient } from "../../db/supabase.client";
import type {
  CreateChapterCommand,
  UpdateChapterCommand,
  ChapterDto,
  ChapterListItemDto,
  ChaptersListQueryDto,
  PaginationMetaDto,
} from "../../types";
import { NotFoundError } from "../errors";
import { verifyBookExists } from "./books.service";
import { applyPaginationConstraints, buildPaginationMeta } from "./shared.service";

export type SupabaseClientType = typeof supabaseClient;

/**
 * Creates a new chapter for a specific book.
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to associate with the chapter
 * @param bookId - Book ID to associate with the chapter
 * @param command - Chapter creation data
 * @returns The created chapter as ChapterDto
 * @throws NotFoundError if the book doesn't exist for the user
 * @throws Error if the insert operation fails
 */
export async function createChapter({
  supabase,
  userId,
  bookId,
  command,
}: {
  supabase: SupabaseClientType;
  userId: string;
  bookId: string;
  command: CreateChapterCommand;
}): Promise<ChapterDto> {
  // Verify the book exists and belongs to the user
  await verifyBookExists({ supabase, userId, bookId });

  // Insert the chapter
  const { data, error } = await supabase
    .from("chapters")
    .insert({
      user_id: userId,
      book_id: bookId,
      title: command.title,
      order: command.order ?? 0,
    })
    .select("id, book_id, title, order, created_at, updated_at")
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Failed to create chapter: no data returned");
  }

  return data;
}

/**
 * Lists chapters for a specific book with pagination and sorting.
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to filter chapters by
 * @param bookId - Book ID to filter chapters by
 * @param query - Query parameters (page, size, sort, order)
 * @returns Object containing chapters list and pagination metadata
 * @throws NotFoundError if the book doesn't exist for the user
 * @throws Error if the query operation fails
 */
export async function listChapters({
  supabase,
  userId,
  bookId,
  query,
}: {
  supabase: SupabaseClientType;
  userId: string;
  bookId: string;
  query: ChaptersListQueryDto;
}): Promise<{ chapters: ChapterListItemDto[]; meta: PaginationMetaDto }> {
  // Verify the book exists and belongs to the user
  await verifyBookExists({ supabase, userId, bookId });

  // Apply pagination constraints
  const { page, size, from, to } = applyPaginationConstraints(query.page, query.size);
  const sort = query.sort ?? "order";
  const order = query.order ?? "asc";

  // Build query
  let dbQuery = supabase
    .from("chapters")
    .select("id, book_id, title, order, updated_at", { count: "exact" })
    .eq("user_id", userId)
    .eq("book_id", bookId);

  // Apply sorting (whitelist only allowed fields)
  const allowedSortFields = ["order", "created_at", "updated_at", "title"] as const;
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

  return {
    chapters: data ?? [],
    meta: buildPaginationMeta(page, size, count ?? 0),
  };
}

/**
 * Retrieves a single chapter by ID.
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to filter by
 * @param chapterId - Chapter ID to retrieve
 * @returns The chapter as ChapterDto
 * @throws NotFoundError if the chapter doesn't exist for the user
 * @throws Error if the query operation fails
 */
export async function getChapter({
  supabase,
  userId,
  chapterId,
}: {
  supabase: SupabaseClientType;
  userId: string;
  chapterId: string;
}): Promise<ChapterDto> {
  const { data, error } = await supabase
    .from("chapters")
    .select("id, book_id, title, order, created_at, updated_at")
    .eq("id", chapterId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new NotFoundError("Chapter not found");
  }

  return data;
}

/**
 * Updates a chapter's title and/or order.
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to filter by
 * @param chapterId - Chapter ID to update
 * @param command - Update data (partial fields)
 * @returns The updated chapter as ChapterDto
 * @throws NotFoundError if the chapter doesn't exist for the user
 * @throws Error if the update operation fails
 */
export async function updateChapter({
  supabase,
  userId,
  chapterId,
  command,
}: {
  supabase: SupabaseClientType;
  userId: string;
  chapterId: string;
  command: UpdateChapterCommand;
}): Promise<ChapterDto> {
  // Build update payload only from provided fields
  const updatePayload: Record<string, unknown> = {};
  if (command.title !== undefined) {
    updatePayload.title = command.title;
  }
  if (command.order !== undefined) {
    updatePayload.order = command.order;
  }

  const { data, error } = await supabase
    .from("chapters")
    .update(updatePayload)
    .eq("id", chapterId)
    .eq("user_id", userId)
    .select("id, book_id, title, order, created_at, updated_at")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new NotFoundError("Chapter not found");
  }

  return data;
}

/**
 * Deletes a chapter by ID.
 * Database cascading will automatically remove dependent notes and embeddings.
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to filter by
 * @param chapterId - Chapter ID to delete
 * @throws NotFoundError if the chapter doesn't exist for the user
 * @throws Error if the delete operation fails
 */
export async function deleteChapter({
  supabase,
  userId,
  chapterId,
}: {
  supabase: SupabaseClientType;
  userId: string;
  chapterId: string;
}): Promise<void> {
  const { data, error } = await supabase
    .from("chapters")
    .delete()
    .eq("id", chapterId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new NotFoundError("Chapter not found");
  }
}

/**
 * Verifies that a chapter exists and belongs to the specified user.
 * This is a lightweight guard function used before creating related entities (e.g., notes).
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to filter by
 * @param chapterId - Chapter ID to verify
 * @throws NotFoundError if the chapter doesn't exist for the user
 * @throws Error if the query operation fails
 */
export async function verifyChapterExists({
  supabase,
  userId,
  chapterId,
}: {
  supabase: SupabaseClientType;
  userId: string;
  chapterId: string;
}): Promise<void> {
  const { data, error } = await supabase
    .from("chapters")
    .select("id")
    .eq("id", chapterId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new NotFoundError("Chapter not found");
  }
}

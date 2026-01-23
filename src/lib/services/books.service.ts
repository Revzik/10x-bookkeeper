import type { supabaseClient } from "../../db/supabase.client";
import type {
  CreateBookCommand,
  BookDto,
  BookListItemDto,
  BooksListQueryDto,
  PaginationMetaDto,
  UpdateBookCommand,
} from "../../types";
import { NotFoundError, ValidationError } from "../errors";
import { applyPaginationConstraints, buildPaginationMeta } from "./shared.service";

export type SupabaseClientType = typeof supabaseClient;

/**
 * Verifies that a book exists and belongs to the specified user.
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to filter by
 * @param bookId - Book ID to verify
 * @throws NotFoundError if the book doesn't exist for the user
 * @throws Error if the query operation fails
 */
export async function verifyBookExists({
  supabase,
  userId,
  bookId,
}: {
  supabase: SupabaseClientType;
  userId: string;
  bookId: string;
}): Promise<void> {
  const { data, error } = await supabase
    .from("books")
    .select("id")
    .eq("id", bookId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new NotFoundError("Book not found");
  }
}

/**
 * Creates a new book in the database.
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to associate with the book
 * @param command - Book creation data
 * @returns The created book as BookDto
 * @throws NotFoundError if series_id is provided but series doesn't exist for the user
 * @throws Error if the insert operation fails
 */
export async function createBook({
  supabase,
  userId,
  command,
}: {
  supabase: SupabaseClientType;
  userId: string;
  command: CreateBookCommand;
}): Promise<BookDto> {
  // If series_id is provided (non-null), verify it exists and belongs to the user
  if (command.series_id) {
    const { data: seriesData, error: seriesError } = await supabase
      .from("series")
      .select("id")
      .eq("id", command.series_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (seriesError) {
      throw seriesError;
    }

    if (!seriesData) {
      throw new NotFoundError("Series not found");
    }
  }

  // Insert the book
  const { data, error } = await supabase
    .from("books")
    .insert({
      user_id: userId,
      title: command.title,
      author: command.author,
      total_pages: command.total_pages,
      series_id: command.series_id ?? null,
      series_order: command.series_order ?? null,
      status: command.status ?? "want_to_read",
      cover_image_url: command.cover_image_url ?? null,
    })
    .select(
      "id, series_id, title, author, total_pages, current_page, status, series_order, cover_image_url, created_at, updated_at"
    )
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Failed to create book: no data returned");
  }

  return data;
}

/**
 * Lists books with pagination, optional filters, search, and sorting.
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to filter books by
 * @param query - Query parameters (page, size, series_id, status, q, sort, order)
 * @returns Object containing books list and pagination metadata
 * @throws Error if the query operation fails
 */
export async function listBooks({
  supabase,
  userId,
  query,
}: {
  supabase: SupabaseClientType;
  userId: string;
  query: BooksListQueryDto;
}): Promise<{ books: BookListItemDto[]; meta: PaginationMetaDto }> {
  // Apply pagination constraints
  const { page, size, from, to } = applyPaginationConstraints(query.page, query.size);
  const sort = query.sort ?? "updated_at";
  const order = query.order ?? "desc";
  const searchQuery = query.q?.trim();

  // Build query
  let dbQuery = supabase
    .from("books")
    .select("id, title, author, status, total_pages, current_page, series_id, series_order, updated_at", {
      count: "exact",
    })
    .eq("user_id", userId);

  // Apply series_id filter if provided
  if (query.series_id) {
    dbQuery = dbQuery.eq("series_id", query.series_id);
  }

  // Apply status filter if provided
  if (query.status) {
    dbQuery = dbQuery.eq("status", query.status);
  }

  // Apply search filter if provided (search in title and author)
  if (searchQuery && searchQuery.length > 0) {
    // Escape special characters for LIKE patterns
    const escapedQuery = searchQuery.replace(/%/g, "\\%").replace(/_/g, "\\_");
    dbQuery = dbQuery.or(`title.ilike.%${escapedQuery}%,author.ilike.%${escapedQuery}%`);
  }

  // Apply sorting (whitelist only allowed fields)
  const allowedSortFields = ["updated_at", "created_at", "title", "author", "status"] as const;
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
    books: data ?? [],
    meta: buildPaginationMeta(page, size, count ?? 0),
  };
}

/**
 * Retrieves a single book by ID with computed metadata (progress, counts, active session).
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to filter by
 * @param bookId - Book ID to retrieve
 * @returns The book as BookDto
 * @throws NotFoundError if the book doesn't exist for the user
 * @throws Error if the query operation fails
 */
export async function getBookById({
  supabase,
  userId,
  bookId,
}: {
  supabase: SupabaseClientType;
  userId: string;
  bookId: string;
}): Promise<BookDto> {
  const { data, error } = await supabase
    .from("books")
    .select(
      "id, series_id, title, author, total_pages, current_page, status, series_order, cover_image_url, created_at, updated_at"
    )
    .eq("id", bookId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new NotFoundError("Book not found");
  }

  return data;
}

/**
 * Updates a book by ID with validation for progress invariants and series references.
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to filter by
 * @param bookId - Book ID to update
 * @param command - Update command with optional fields
 * @returns The updated book as BookDto
 * @throws NotFoundError if the book doesn't exist for the user OR if series_id is provided but series doesn't exist
 * @throws Error if validation fails or the update operation fails
 */
export async function updateBookById({
  supabase,
  userId,
  bookId,
  command,
}: {
  supabase: SupabaseClientType;
  userId: string;
  bookId: string;
  command: UpdateBookCommand;
}): Promise<BookDto> {
  // First, fetch the existing book to validate cross-field constraints
  const { data: existingBook, error: fetchError } = await supabase
    .from("books")
    .select("total_pages, current_page")
    .eq("id", bookId)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) {
    throw fetchError;
  }

  if (!existingBook) {
    throw new NotFoundError("Book not found");
  }

  // If series_id is provided and non-null, verify it exists for the user
  if (command.series_id !== undefined && command.series_id !== null) {
    const { data: seriesData, error: seriesError } = await supabase
      .from("series")
      .select("id")
      .eq("id", command.series_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (seriesError) {
      throw seriesError;
    }

    if (!seriesData) {
      throw new NotFoundError("Series not found");
    }
  }

  // Validate progress invariants when only one of total_pages or current_page is provided
  const finalTotalPages = command.total_pages ?? existingBook.total_pages;
  const finalCurrentPage = command.current_page ?? existingBook.current_page;

  if (finalCurrentPage > finalTotalPages) {
    throw new ValidationError("Current page cannot exceed total pages");
  }

  // Perform the update
  const { data, error } = await supabase
    .from("books")
    .update(command)
    .eq("id", bookId)
    .eq("user_id", userId)
    .select(
      "id, series_id, title, author, total_pages, current_page, status, series_order, cover_image_url, created_at, updated_at"
    )
    .single();

  if (error) {
    // Check if it's a constraint violation from the database
    if (error.code === "23514" && error.message.includes("check_progress")) {
      throw new ValidationError("Current page cannot exceed total pages");
    }
    throw error;
  }

  if (!data) {
    throw new Error("Failed to update book: no data returned");
  }

  return data;
}

/**
 * Deletes a book by ID. Database cascades will remove dependent rows
 * (chapters, notes, note_embeddings, reading_sessions).
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to filter by
 * @param bookId - Book ID to delete
 * @returns void
 * @throws NotFoundError if the book doesn't exist for the user
 * @throws Error if the delete operation fails
 */
export async function deleteBookById({
  supabase,
  userId,
  bookId,
}: {
  supabase: SupabaseClientType;
  userId: string;
  bookId: string;
}): Promise<void> {
  // Attempt to delete and check if a row was affected
  const { data, error } = await supabase
    .from("books")
    .delete()
    .eq("id", bookId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new NotFoundError("Book not found");
  }
}

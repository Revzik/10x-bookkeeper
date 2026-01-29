import type { supabaseClient } from "../../db/supabase.client";
import type {
  CreateSeriesCommand,
  UpdateSeriesCommand,
  SeriesDto,
  SeriesListItemDto,
  SeriesListQueryDto,
  PaginationMetaDto,
} from "../../types";
import { NotFoundError } from "../errors";
import { applyPaginationConstraints, buildPaginationMeta } from "./shared.service";

export type SupabaseClientType = typeof supabaseClient;

/**
 * Verifies that a series exists and belongs to the specified user.
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to filter by
 * @param seriesId - Series ID to verify
 * @throws NotFoundError if the series doesn't exist for the user
 * @throws Error if the query operation fails
 */
export async function verifySeriesExists({
  supabase,
  userId,
  seriesId,
}: {
  supabase: SupabaseClientType;
  userId: string;
  seriesId: string;
}): Promise<void> {
  const { data, error } = await supabase
    .from("series")
    .select("id")
    .eq("id", seriesId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new NotFoundError("Series not found");
  }
}

/**
 * Creates a new series in the database.
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to associate with the series
 * @param command - Series creation data (title, description, cover_image_url)
 * @returns The created series as SeriesDto
 * @throws Error if the insert operation fails
 */
export async function createSeries({
  supabase,
  userId,
  command,
}: {
  supabase: SupabaseClientType;
  userId: string;
  command: CreateSeriesCommand;
}): Promise<SeriesDto> {
  const { data, error } = await supabase
    .from("series")
    .insert({
      user_id: userId,
      title: command.title,
      description: command.description ?? null,
      cover_image_url: command.cover_image_url ?? null,
    })
    .select("id, title, description, cover_image_url, created_at, updated_at")
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Failed to create series: no data returned");
  }

  return data;
}

/**
 * Lists series with pagination, optional search, and sorting.
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to filter series by
 * @param query - Query parameters (page, size, q, sort, order)
 * @returns Object containing series list and pagination metadata
 * @throws Error if the query operation fails
 */
export async function listSeries({
  supabase,
  userId,
  query,
}: {
  supabase: SupabaseClientType;
  userId: string;
  query: SeriesListQueryDto;
}): Promise<{ series: SeriesListItemDto[]; meta: PaginationMetaDto }> {
  // Apply pagination constraints
  const { page, size, from, to } = applyPaginationConstraints(query.page, query.size);
  const sort = query.sort ?? "updated_at";
  const order = query.order ?? "desc";
  const searchQuery = query.q?.trim();

  // Build query
  let dbQuery = supabase
    .from("series")
    .select("id, title, created_at, updated_at", { count: "exact" })
    .eq("user_id", userId);

  // Apply search filter if provided
  if (searchQuery && searchQuery.length > 0) {
    dbQuery = dbQuery.ilike("title", `%${searchQuery}%`);
  }

  // Apply sorting (whitelist only allowed fields)
  const allowedSortFields = ["created_at", "updated_at", "title"] as const;
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
    series: data ?? [],
    meta: buildPaginationMeta(page, size, count ?? 0),
  };
}

/**
 * Retrieves a single series by ID.
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to scope the query
 * @param seriesId - Series ID to retrieve
 * @returns The series as SeriesDto
 * @throws NotFoundError if the series is not found
 * @throws Error if query fails
 */
export async function getSeriesById({
  supabase,
  userId,
  seriesId,
}: {
  supabase: SupabaseClientType;
  userId: string;
  seriesId: string;
}): Promise<SeriesDto> {
  const { data, error } = await supabase
    .from("series")
    .select("id, title, description, cover_image_url, created_at, updated_at")
    .eq("id", seriesId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new NotFoundError("Series not found");
  }

  return data;
}

/**
 * Updates a series by ID.
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to scope the query
 * @param seriesId - Series ID to update
 * @param command - Update data (partial fields)
 * @returns The updated series as SeriesDto
 * @throws NotFoundError if the series is not found
 * @throws Error if update fails
 */
export async function updateSeriesById({
  supabase,
  userId,
  seriesId,
  command,
}: {
  supabase: SupabaseClientType;
  userId: string;
  seriesId: string;
  command: UpdateSeriesCommand;
}): Promise<SeriesDto> {
  // First check if series exists
  const { data: existingData, error: existingError } = await supabase
    .from("series")
    .select("id")
    .eq("id", seriesId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (!existingData) {
    throw new NotFoundError("Series not found");
  }

  // Perform update
  const { data, error } = await supabase
    .from("series")
    .update(command)
    .eq("id", seriesId)
    .eq("user_id", userId)
    .select("id, title, description, cover_image_url, created_at, updated_at")
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Failed to update series: no data returned");
  }

  return data;
}

/**
 * Deletes a series by ID, with optional cascade delete of all books.
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to scope the query
 * @param seriesId - Series ID to delete
 * @param cascade - If true, deletes all books in the series first (dangerous operation)
 * @throws NotFoundError if the series is not found
 * @throws Error if delete fails
 */
export async function deleteSeriesById({
  supabase,
  userId,
  seriesId,
  cascade = false,
}: {
  supabase: SupabaseClientType;
  userId: string;
  seriesId: string;
  cascade?: boolean;
}): Promise<void> {
  // First check if series exists
  const { data: existingData, error: existingError } = await supabase
    .from("series")
    .select("id")
    .eq("id", seriesId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (!existingData) {
    throw new NotFoundError("Series not found");
  }

  // If cascade mode, delete all books in the series first
  if (cascade) {
    const { error: booksDeleteError } = await supabase
      .from("books")
      .delete()
      .eq("user_id", userId)
      .eq("series_id", seriesId);

    if (booksDeleteError) {
      throw new Error(`Failed to cascade delete books: ${booksDeleteError.message}`);
    }
  }

  // Delete the series
  const { error: seriesDeleteError } = await supabase.from("series").delete().eq("id", seriesId).eq("user_id", userId);

  if (seriesDeleteError) {
    throw seriesDeleteError;
  }
}

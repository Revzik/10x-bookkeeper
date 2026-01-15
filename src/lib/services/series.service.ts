import type { supabaseClient } from "../../db/supabase.client";
import type {
  CreateSeriesCommand,
  SeriesDto,
  SeriesListItemDto,
  SeriesListQueryDto,
  PaginationMetaDto,
} from "../../types";

export type SupabaseClientType = typeof supabaseClient;

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
  // Apply defaults and constraints
  const page = Math.max(1, query.page ?? 1);
  const size = Math.min(Math.max(1, query.size ?? 10), 100);
  const sort = query.sort ?? "updated_at";
  const order = query.order ?? "desc";
  const searchQuery = query.q?.trim();

  // Calculate pagination range
  const from = (page - 1) * size;
  const to = from + size - 1;

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

  const totalItems = count ?? 0;
  const totalPages = size > 0 ? Math.ceil(totalItems / size) : 0;

  return {
    series: data ?? [],
    meta: {
      current_page: page,
      page_size: size,
      total_items: totalItems,
      total_pages: totalPages,
    },
  };
}

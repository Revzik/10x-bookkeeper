import type { supabaseClient } from "../../db/supabase.client";
import type { AiQuerySimpleCommand, AiQueryResponseDtoSimple, NoteEntity, ErrorSource } from "../../types";
import { NotFoundError } from "../errors";
import { verifyBookExists } from "./books.service";
import { verifySeriesExists } from "./series.service";

export type SupabaseClientType = typeof supabaseClient;

/**
 * Creates a search log entry in the database.
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to associate with the search log
 * @param queryText - The query text to log
 * @returns The created search log ID
 * @throws Error if the insert operation fails
 */
export async function createSearchLog({
  supabase,
  userId,
  queryText,
}: {
  supabase: SupabaseClientType;
  userId: string;
  queryText: string;
}): Promise<string> {
  const { data, error } = await supabase
    .from("search_logs")
    .insert({
      user_id: userId,
      query_text: queryText,
    })
    .select("id")
    .single();

  if (error) {
    throw error;
  }

  return data.id;
}

/**
 * Logs a search error to the database.
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to associate with the error
 * @param searchLogId - Optional search log ID to link the error to
 * @param source - Error source (e.g., "database", "llm", "unknown")
 * @param errorMessage - Error message to log (should be safe/truncated)
 */
export async function logSearchError({
  supabase,
  userId,
  searchLogId,
  source,
  errorMessage,
}: {
  supabase: SupabaseClientType;
  userId: string;
  searchLogId: string | null;
  source: ErrorSource;
  errorMessage: string;
}): Promise<void> {
  try {
    // Truncate error message to prevent extremely long messages
    const truncatedMessage = errorMessage.slice(0, 500);

    await supabase.from("search_errors").insert({
      user_id: userId,
      search_log_id: searchLogId,
      source,
      error_message: truncatedMessage,
    });
  } catch (error) {
    // Log to console if we can't write to the database
    console.error("Failed to log search error to database:", {
      userId,
      searchLogId,
      source,
      originalError: errorMessage,
      loggingError: error,
    });
  }
}

/**
 * Fetches notes for AI context based on the provided scope.
 * Applies user filtering and optional book/series scoping.
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to filter by
 * @param scope - Optional scope with book_id or series_id
 * @returns Array of notes matching the scope
 * @throws Error if the query operation fails
 */
export async function fetchNotesForAiContext({
  supabase,
  userId,
  scope,
}: {
  supabase: SupabaseClientType;
  userId: string;
  scope?: { book_id?: string | null; series_id?: string | null };
}): Promise<NoteEntity[]> {
  // Base query: select notes with chapter and book information
  let query = supabase
    .from("notes")
    .select("*, chapters!inner(id, title, book_id, books!inner(id, title, series_id))")
    .eq("user_id", userId);

  // Apply scope filters
  if (scope?.book_id) {
    query = query.eq("chapters.book_id", scope.book_id);
  } else if (scope?.series_id) {
    query = query.eq("chapters.books.series_id", scope.series_id);
  }

  // Limit to prevent excessive context (can be adjusted)
  query = query.limit(100);

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data || [];
}

/**
 * Executes an AI query using a simple chat approach (PoC version with mocked response).
 * Creates a search log, fetches relevant notes, and returns a mocked AI response.
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to scope the query
 * @param command - AI query command with query text and scope
 * @returns AI query response with answer and usage metadata
 * @throws NotFoundError if book_id or series_id doesn't exist for the user
 * @throws Error for other failures
 */
export async function queryAiSimpleChat({
  supabase,
  userId,
  command,
}: {
  supabase: SupabaseClientType;
  userId: string;
  command: AiQuerySimpleCommand;
}): Promise<AiQueryResponseDtoSimple> {
  let searchLogId: string | null = null;

  try {
    // Step 1: Create search log
    searchLogId = await createSearchLog({
      supabase,
      userId,
      queryText: command.query_text,
    });

    // Step 2: Verify scope if provided
    if (command.scope.book_id) {
      await verifyBookExists({
        supabase,
        userId,
        bookId: command.scope.book_id,
      });
    } else if (command.scope.series_id) {
      await verifySeriesExists({
        supabase,
        userId,
        seriesId: command.scope.series_id,
      });
    }

    // Step 3: Fetch notes for context
    const startTime = Date.now();
    const notes = await fetchNotesForAiContext({
      supabase,
      userId,
      scope: command.scope,
    });

    // Step 4: Build prompt (for future LLM integration)
    // For now, we'll just use the notes count in the mocked response
    const noteCount = notes.length;

    // Step 5: Mocked chat completion
    const endTime = Date.now();
    const latencyMs = endTime - startTime;

    // Mocked response based on the query
    const mockedAnswer = `Based on your ${noteCount} note${noteCount !== 1 ? "s" : ""}, here's what I found regarding "${command.query_text}": This is a mocked response for the PoC implementation. In production, this would be replaced with an actual LLM response generated from your notes.`;

    // Step 6: Return response
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return {
      answer: {
        text: mockedAnswer,
        low_confidence: false,
      },
      usage: {
        model: "mock-model-v1",
        latency_ms: latencyMs,
      },
    };
  } catch (error) {
    // Log error to search_errors table
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    const errorSource: ErrorSource = error instanceof NotFoundError ? "unknown" : "database";

    await logSearchError({
      supabase,
      userId,
      searchLogId,
      source: errorSource,
      errorMessage,
    });

    // Re-throw the error to be handled by the route
    throw error;
  }
}

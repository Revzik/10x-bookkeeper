import type { supabaseClient } from "../../db/supabase.client";
import type { AiQuerySimpleCommand, AiQueryResponseDtoSimple, NoteListItemDto, ErrorSource } from "../../types";
import { NotFoundError } from "../errors";
import { verifyBookExists } from "./books.service";
import { verifySeriesExists } from "./series.service";
import { listNotes } from "./notes.service";
import { OpenRouterService } from "../openrouter/openrouter.service";
import { aiAnswerJsonSchema, aiAnswerZodSchema, type AiAnswer } from "../openrouter/schemas";
import {
  OpenRouterAuthError,
  OpenRouterRateLimitError,
  OpenRouterTimeoutError,
  OpenRouterUpstreamError,
} from "../openrouter/openrouter.errors";

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
 * Builds a formatted context string from notes for LLM prompts.
 * Groups notes by chapter and includes metadata for better context.
 *
 * @param notes - Array of note items to format
 * @returns Formatted string with note content suitable for LLM context
 */
function buildNotesContext(notes: NoteListItemDto[]): string {
  if (notes.length === 0) {
    return "No notes available for this query scope.";
  }

  // Group notes by chapter_id
  const notesByChapter = new Map<string, NoteListItemDto[]>();
  for (const note of notes) {
    const existing = notesByChapter.get(note.chapter_id) || [];
    existing.push(note);
    notesByChapter.set(note.chapter_id, existing);
  }

  // Build formatted context
  const contextParts: string[] = [];
  let noteIndex = 1;

  for (const [, chapterNotes] of notesByChapter) {
    for (const note of chapterNotes) {
      contextParts.push(`[Note ${noteIndex}] (ID: ${note.id})`);
      contextParts.push(note.content);
      contextParts.push(""); // Empty line between notes
      noteIndex++;
    }
  }

  return contextParts.join("\n");
}

/**
 * Initializes OpenRouter service for AI queries.
 *
 * @returns Configured OpenRouterService instance
 * @throws Error if OPENROUTER_API_KEY is not configured
 */
function initializeOpenRouterService(): OpenRouterService {
  const apiKey = import.meta.env.OPENROUTER_API_KEY;

  if (!apiKey || apiKey.trim().length === 0) {
    throw new Error("OPENROUTER_API_KEY environment variable is not configured");
  }

  return new OpenRouterService({
    apiKey,
    model: "openai/gpt-4o-mini",
    schemaName: "AiAnswer",
    params: {
      temperature: 0.2,
      max_tokens: 800,
    },
    appName: "10x-bookkeeper",
    timeoutMs: 60000,
  });
}

/**
 * Executes an AI query using OpenRouter LLM service.
 * Creates a search log, fetches relevant notes, calls the LLM, and returns the AI response.
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
  const startTime = Date.now();

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

    // Step 3: Fetch notes for context using listNotes service
    const notesQuery = {
      page: 1,
      size: 100, // Limit context size to prevent token overflow
      ...(command.scope.book_id && { book_id: command.scope.book_id }),
      ...(command.scope.series_id && { series_id: command.scope.series_id }),
    };

    const { notes } = await listNotes({
      supabase,
      userId,
      query: notesQuery,
    });

    // Step 4: Build context from notes
    const notesContext = buildNotesContext(notes);

    // Step 5: Initialize OpenRouter service
    const openRouterService = initializeOpenRouterService();

    // Step 6: Build prompts for LLM
    const systemPrompt = `You are a helpful reading assistant for the 10x Bookkeeper application. Your role is to answer questions based ONLY on the user's reading notes provided in the context.

Guidelines:
- Base your answer exclusively on the notes context provided
- If you cannot find relevant information in the notes, clearly state that you don't have enough information
- Set low_confidence to true if:
  * The notes don't contain sufficient information to answer confidently
  * The answer requires speculation or assumptions
  * The relevant information is ambiguous or contradictory
- Set low_confidence to false if:
  * You can answer directly from the notes with high certainty
  * The information is clear and unambiguous
- Be concise but thorough
- Use natural, conversational language`;

    const userPrompt = `Context from reading notes:
${notesContext}

User's question: ${command.query_text}

Please answer the question based on the notes context above. Remember to set low_confidence appropriately based on the quality and relevance of the available information.`;

    // Step 7: Call OpenRouter LLM
    const result = await openRouterService.chatJson<AiAnswer>({
      system: systemPrompt,
      user: userPrompt,
      jsonSchema: aiAnswerJsonSchema,
      zodSchema: aiAnswerZodSchema,
    });

    // Step 8: Calculate latency and return response
    const endTime = Date.now();
    const latencyMs = endTime - startTime;

    return {
      answer: result.data,
      usage: {
        model: result.model,
        latency_ms: latencyMs,
      },
    };
  } catch (error) {
    // Determine error source for logging
    let errorSource: ErrorSource = "unknown";
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";

    if (error instanceof NotFoundError) {
      errorSource = "unknown";
    } else if (
      error instanceof OpenRouterAuthError ||
      error instanceof OpenRouterRateLimitError ||
      error instanceof OpenRouterTimeoutError ||
      error instanceof OpenRouterUpstreamError
    ) {
      errorSource = "llm";
    } else {
      errorSource = "database";
    }

    // Log error to search_errors table
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

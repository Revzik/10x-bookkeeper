/**
 * Shared types for backend and frontend (Entities, DTOs, Command Models)
 *
 * Design goals:
 * - DTOs are derived from database row types (`Tables<...>`) so they stay in sync with schema.
 * - Command Models represent request payloads (and some query models) from `.ai/api-plan.md`.
 * - API never accepts `user_id` from clients; DTOs generally omit `user_id`.
 */

import type { Database, Enums, Tables } from "./db/database.types";

// -------------------------------------------------------------------------------------------------
// DB entity aliases (Row types)
// -------------------------------------------------------------------------------------------------

export type ProfileEntity = Tables<"profiles">;
export type SeriesEntity = Tables<"series">;
export type BookEntity = Tables<"books">;
export type ChapterEntity = Tables<"chapters">;
export type NoteEntity = Tables<"notes">;
export type NoteEmbeddingEntity = Tables<"note_embeddings">;
export type ReadingSessionEntity = Tables<"reading_sessions">;
export type SearchLogEntity = Tables<"search_logs">;

export type BookStatus = Enums<"book_status">;
export type EmbeddingStatus = Enums<"embedding_status">;

// -------------------------------------------------------------------------------------------------
// Common API shapes
// -------------------------------------------------------------------------------------------------

export type IsoTimestamp = string;
export type Uuid = string;

export type ApiErrorCode =
  | "AUTH_REQUIRED"
  | "NOT_ALLOWED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  // reading session specific (per plan)
  | "ACTIVE_SESSION_EXISTS"
  | "SESSION_ALREADY_ENDED";

export interface ApiErrorDto {
  error: {
    code: ApiErrorCode | (string & {});
    message: string;
    details?: Record<string, unknown> | null;
  };
}

export interface PageDto {
  limit: number;
  next_cursor: string | null;
}

export type SortOrder = "asc" | "desc";

// -------------------------------------------------------------------------------------------------
// Profiles
// -------------------------------------------------------------------------------------------------

// Minimal profile DTO (schema is just `id`)
export type ProfileDto = Pick<ProfileEntity, "id">;

// -------------------------------------------------------------------------------------------------
// Series
// -------------------------------------------------------------------------------------------------

export type SeriesDto = Omit<SeriesEntity, "user_id">;

export type SeriesListItemDto = Pick<SeriesDto, "id" | "title" | "created_at" | "updated_at">;

export interface SeriesMetaDto {
  books_count?: number;
}

export type CreateSeriesCommand = Pick<SeriesEntity, "title"> &
  Partial<Pick<SeriesEntity, "description" | "cover_image_url">>;

export type UpdateSeriesCommand = Partial<Pick<SeriesEntity, "title" | "description" | "cover_image_url">>;

export interface ListSeriesQuery {
  limit?: number;
  cursor?: string;
  q?: string;
  sort?: "created_at" | "updated_at" | "title";
  order?: SortOrder;
}

export interface GetSeriesQuery {
  include?: "books_count";
}

export interface DeleteSeriesQuery {
  /** If true/1, deletes all books/chapters/notes/note_embeddings/reading_sessions under this series (dangerous). */
  cascade?: boolean;
}

export interface CreateSeriesResponseDto {
  series: SeriesDto;
}
export interface ListSeriesResponseDto {
  series: SeriesListItemDto[];
  page: PageDto;
}
export interface GetSeriesResponseDto {
  series: SeriesDto;
  meta?: SeriesMetaDto;
}
export interface UpdateSeriesResponseDto {
  series: SeriesDto;
}

// -------------------------------------------------------------------------------------------------
// Books
// -------------------------------------------------------------------------------------------------

export type BookDto = Omit<BookEntity, "user_id">;

export type BookListItemDto = Pick<
  BookDto,
  "id" | "series_id" | "title" | "author" | "status" | "total_pages" | "current_page" | "updated_at"
>;

export interface BookProgressMetaDto {
  /** Percent is typically computed server-side: floor(current_page / total_pages * 100) */
  percent: number;
}

export interface BookActiveSessionMetaDto {
  id: ReadingSessionEntity["id"];
  started_at: ReadingSessionEntity["started_at"];
}

export interface BookMetaDto {
  progress?: BookProgressMetaDto;
  chapters_count?: number;
  notes_count?: number;
  active_session?: BookActiveSessionMetaDto;
}

export type CreateBookCommand = Pick<BookEntity, "title" | "author" | "total_pages"> &
  Partial<Pick<BookEntity, "series_id" | "series_order" | "status" | "cover_image_url">>;

export type UpdateBookCommand = Partial<
  Pick<
    BookEntity,
    "title" | "author" | "total_pages" | "current_page" | "status" | "series_id" | "series_order" | "cover_image_url"
  >
>;

/** Purpose-built endpoint command: POST `/books/:bookId/progress` */
export type UpdateBookProgressCommand = Pick<BookEntity, "current_page"> & Partial<Pick<BookEntity, "status">>;

export interface ListBooksQuery {
  limit?: number;
  cursor?: string;
  series_id?: BookEntity["series_id"];
  status?: BookStatus;
  q?: string;
  sort?: "updated_at" | "created_at" | "title" | "author" | "status";
  order?: SortOrder;
}

export interface CreateBookResponseDto {
  book: BookDto;
}
export interface ListBooksResponseDto {
  books: BookListItemDto[];
  page: PageDto;
}
export interface GetBookResponseDto {
  book: BookDto;
  meta?: BookMetaDto;
}
export interface UpdateBookResponseDto {
  book: BookDto;
}
export interface UpdateBookProgressResponseDto {
  book: Pick<BookDto, "id" | "current_page" | "total_pages" | "status" | "updated_at">;
}

// -------------------------------------------------------------------------------------------------
// Chapters
// -------------------------------------------------------------------------------------------------

export type ChapterDto = Omit<ChapterEntity, "user_id">;

export type ChapterListItemDto = Pick<ChapterDto, "id" | "book_id" | "title" | "book_order" | "updated_at">;

export interface CreateChapterCommand {
  title: ChapterEntity["title"];
  book_order?: ChapterEntity["book_order"];
}

export type UpdateChapterCommand = Partial<{
  title: ChapterEntity["title"];
  book_order: ChapterEntity["book_order"];
}>;

export interface ListChaptersQuery {
  limit?: number;
  cursor?: string;
  sort?: "book_order" | "created_at" | "updated_at" | "title";
  order?: SortOrder;
}

export interface CreateChapterResponseDto {
  chapter: ChapterDto;
}
export interface ListChaptersResponseDto {
  chapters: ChapterListItemDto[];
  page: PageDto;
}
export interface GetChapterResponseDto {
  chapter: ChapterDto;
}
export interface UpdateChapterResponseDto {
  chapter: ChapterDto;
}

// -------------------------------------------------------------------------------------------------
// Notes
// -------------------------------------------------------------------------------------------------

export type NoteDto = Omit<NoteEntity, "user_id">;

export type NoteListItemDto = Pick<
  NoteDto,
  "id" | "chapter_id" | "content" | "embedding_status" | "created_at" | "updated_at"
>;

export type CreateNoteCommand = Pick<NoteEntity, "content">;
export type UpdateNoteCommand = Pick<NoteEntity, "content">;

export interface NotesContextDto {
  book_id: BookEntity["id"];
  book_title: BookEntity["title"];
  chapter_id: ChapterEntity["id"];
  chapter_title: ChapterEntity["title"];
}

export interface ListNotesQuery {
  limit?: number;
  cursor?: string;
  book_id?: BookEntity["id"];
  chapter_id?: ChapterEntity["id"];
  series_id?: SeriesEntity["id"];
  embedding_status?: EmbeddingStatus;
  sort?: "created_at" | "updated_at";
  order?: SortOrder;
}

export interface GetNoteQuery {
  include?: "context";
}

export interface CreateNoteResponseDto {
  note: NoteDto;
}
export interface ListNotesResponseDto {
  notes: NoteListItemDto[];
  page: PageDto;
}
export interface GetNoteResponseDto {
  note: NoteDto;
  context?: NotesContextDto;
}
export interface UpdateNoteResponseDto {
  note: Pick<NoteDto, "id" | "content" | "embedding_status" | "updated_at">;
}

// -------------------------------------------------------------------------------------------------
// Reading sessions
// -------------------------------------------------------------------------------------------------

export type ReadingSessionDto = Omit<ReadingSessionEntity, "user_id">;

export type ReadingSessionListItemDto = Pick<
  ReadingSessionDto,
  "id" | "book_id" | "started_at" | "ended_at" | "end_page"
>;

/** Start session: POST `/books/:bookId/reading-sessions` (empty JSON body in plan). */
export type StartReadingSessionCommand = Record<never, never>;

export interface StopReadingSessionCommand {
  ended_at?: IsoTimestamp;
  end_page?: number;
  update_book_progress?: boolean;
}

export interface ListReadingSessionsQuery {
  limit?: number;
  cursor?: string;
  book_id?: BookEntity["id"];
  started_after?: IsoTimestamp;
  started_before?: IsoTimestamp;
  sort?: "started_at" | "ended_at";
  order?: SortOrder;
}

export interface StartReadingSessionResponseDto {
  reading_session: ReadingSessionDto;
}
export interface StopReadingSessionResponseDto {
  reading_session: Pick<ReadingSessionDto, "id" | "ended_at" | "end_page">;
  book?: Pick<BookDto, "id" | "current_page" | "status">;
}
export interface ListReadingSessionsResponseDto {
  reading_sessions: ReadingSessionListItemDto[];
  page: PageDto;
}
export interface GetReadingSessionResponseDto {
  reading_session: ReadingSessionDto;
}

// -------------------------------------------------------------------------------------------------
// Search logs (metrics)
// -------------------------------------------------------------------------------------------------

export type SearchLogDto = Omit<SearchLogEntity, "user_id">;

export interface ListSearchLogsQuery {
  limit?: number;
  cursor?: string;
  started_after?: IsoTimestamp;
  started_before?: IsoTimestamp;
}

export interface ListSearchLogsResponseDto {
  search_logs: SearchLogDto[];
  page: PageDto;
}

// -------------------------------------------------------------------------------------------------
// AI Search (RAG Chat)
// -------------------------------------------------------------------------------------------------

export interface AiQueryScopeDto {
  book_id?: BookEntity["id"] | null;
  series_id?: SeriesEntity["id"] | null;
}

export interface AiQueryRetrievalDto {
  match_threshold?: number;
  match_count?: number;
}

export interface AiQueryCommand {
  query_text: string;
  scope?: AiQueryScopeDto;
  retrieval?: AiQueryRetrievalDto;
}

/**
 * Source rows for citations come from the DB RPC `match_notes`.
 * We re-shape `id` → `note_embedding_id` to match the API plan response.
 */
export type MatchNotesRow = Database["public"]["Functions"]["match_notes"]["Returns"][number];

export interface AiCitationDto {
  note_embedding_id: MatchNotesRow["id"];
  note_id: MatchNotesRow["note_id"];
  book_id: MatchNotesRow["book_id"];
  book_title: MatchNotesRow["book_title"];
  chapter_id: MatchNotesRow["chapter_id"];
  chapter_title: MatchNotesRow["chapter_title"];
  chunk_content: MatchNotesRow["chunk_content"];
  similarity: MatchNotesRow["similarity"];
}

export interface AiAnswerDto {
  text: string;
  low_confidence: boolean;
}

export interface AiUsageDto {
  retrieved_chunks: number;
  model: string;
  latency_ms: number;
}

export interface AiQueryResponseDto {
  answer: AiAnswerDto;
  citations: AiCitationDto[];
  usage: AiUsageDto;
}

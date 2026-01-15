import type { Database, Enums, Tables, TablesInsert, TablesUpdate } from "./db/database.types";

/**
 * Shared primitives
 * Note: Supabase generated types model UUIDs + timestamps as `string`.
 */
export type Uuid = string;
export type IsoDateTimeString = string;

/**
 * Shared API shapes
 */
export interface PaginationMetaDto {
  current_page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

export type SortOrderDto = "asc" | "desc";

export type ApiErrorCode =
  | "NOT_ALLOWED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  // endpoint-specific conflicts (documented in the API plan)
  | "ACTIVE_SESSION_EXISTS"
  | "SESSION_ALREADY_ENDED";

export interface ApiErrorDto {
  code: ApiErrorCode;
  message: string;
  details?: unknown;
}

export interface ApiErrorResponseDto {
  error: ApiErrorDto;
}

/**
 * Database-derived entity aliases
 * These keep DTOs “connected” to the underlying schema without re-declaring fields.
 */
export type SeriesEntity = Tables<"series">;
export type BookEntity = Tables<"books">;
export type ChapterEntity = Tables<"chapters">;
export type NoteEntity = Tables<"notes">;
export type ReadingSessionEntity = Tables<"reading_sessions">;
export type SearchLogEntity = Tables<"search_logs">;
export type EmbeddingErrorEntity = Tables<"embedding_errors">;
export type SearchErrorEntity = Tables<"search_errors">;
export type NoteEmbeddingEntity = Tables<"note_embeddings">;

/**
 * Enums (derived from DB enums)
 */
export type BookStatus = Enums<"book_status">;
export type EmbeddingStatus = Enums<"embedding_status">;
export type ErrorSource = Enums<"error_source">;

/**
 * SERIES
 */
export type SeriesDto = Pick<
  SeriesEntity,
  "id" | "title" | "description" | "cover_image_url" | "book_count" | "created_at" | "updated_at"
>;

export type SeriesListItemDto = Pick<SeriesEntity, "id" | "title" | "book_count" | "created_at" | "updated_at">;

export type CreateSeriesCommand = Pick<TablesInsert<"series">, "title"> &
  Partial<Pick<TablesInsert<"series">, "description" | "cover_image_url">>;

export type UpdateSeriesCommand = Partial<Pick<TablesUpdate<"series">, "title" | "description" | "cover_image_url">>;

export interface SeriesListQueryDto {
  page?: number;
  size?: number;
  q?: string;
  sort?: "created_at" | "updated_at" | "title";
  order?: SortOrderDto;
}

export interface CreateSeriesResponseDto {
  series: SeriesDto;
}
export interface ListSeriesResponseDto {
  series: SeriesListItemDto[];
  meta: PaginationMetaDto;
}
export interface GetSeriesResponseDto {
  series: SeriesDto;
}
export interface UpdateSeriesResponseDto {
  series: SeriesDto;
}

/**
 * BOOKS
 */
export type BookDto = Pick<
  BookEntity,
  | "id"
  | "series_id"
  | "title"
  | "author"
  | "total_pages"
  | "current_page"
  | "status"
  | "series_order"
  | "cover_image_url"
  | "created_at"
  | "updated_at"
>;

export type BookListItemDto = Pick<
  BookEntity,
  "id" | "series_id" | "title" | "author" | "status" | "total_pages" | "current_page" | "updated_at"
>;

export type CreateBookCommand = Pick<TablesInsert<"books">, "title" | "author" | "total_pages"> &
  Partial<Pick<TablesInsert<"books">, "series_id" | "series_order" | "status" | "cover_image_url">>;

export type UpdateBookCommand = Partial<
  Pick<
    TablesUpdate<"books">,
    "title" | "author" | "total_pages" | "current_page" | "status" | "series_id" | "series_order" | "cover_image_url"
  >
>;

export type UpdateBookProgressCommand = Pick<BookEntity, "current_page"> & Partial<Pick<BookEntity, "status">>;

export interface BooksListQueryDto {
  page?: number;
  size?: number;
  series_id?: BookEntity["series_id"];
  status?: BookStatus;
  q?: string;
  sort?: "updated_at" | "created_at" | "title" | "author" | "status";
  order?: SortOrderDto;
}

export interface CreateBookResponseDto {
  book: BookDto;
}
export interface ListBooksResponseDto {
  books: BookListItemDto[];
  meta: PaginationMetaDto;
}
export interface GetBookResponseDto {
  book: BookDto;
}
export interface UpdateBookResponseDto {
  book: BookDto;
}
export interface UpdateBookProgressResponseDto {
  book: Pick<BookEntity, "id" | "current_page" | "total_pages" | "status" | "updated_at">;
}

/**
 * CHAPTERS
 */
export type ChapterDto = Pick<ChapterEntity, "id" | "book_id" | "title" | "order" | "created_at" | "updated_at">;

export type ChapterListItemDto = Pick<ChapterEntity, "id" | "book_id" | "title" | "order" | "updated_at">;

export type CreateChapterCommand = Pick<TablesInsert<"chapters">, "title"> &
  Partial<Pick<TablesInsert<"chapters">, "order">>;

export type UpdateChapterCommand = Partial<Pick<TablesUpdate<"chapters">, "title" | "order">>;

export interface ChaptersListQueryDto {
  page?: number;
  size?: number;
  sort?: "order" | "created_at" | "updated_at" | "title";
  order?: SortOrderDto;
}

export interface CreateChapterResponseDto {
  chapter: ChapterDto;
}
export interface ListChaptersResponseDto {
  chapters: ChapterListItemDto[];
  meta: PaginationMetaDto;
}
export interface GetChapterResponseDto {
  chapter: ChapterDto;
}
export interface UpdateChapterResponseDto {
  chapter: ChapterDto;
}

/**
 * NOTES
 */
export type NoteDto = Pick<
  NoteEntity,
  "id" | "chapter_id" | "content" | "embedding_status" | "embedding_duration" | "created_at" | "updated_at"
>;

export type NoteListItemDto = Pick<
  NoteEntity,
  "id" | "chapter_id" | "content" | "embedding_status" | "created_at" | "updated_at"
>;

export type CreateNoteCommand = Pick<TablesInsert<"notes">, "content">;
export type UpdateNoteCommand = Pick<TablesUpdate<"notes">, "content">;

export interface NotesListQueryDto {
  page?: number;
  size?: number;
  book_id?: Uuid;
  chapter_id?: NoteEntity["chapter_id"];
  series_id?: Uuid;
  embedding_status?: EmbeddingStatus;
  sort?: "created_at" | "updated_at";
  order?: SortOrderDto;
}

export interface NoteGetQueryDto {
  include?: "context";
}

export interface NoteContextDto {
  book_id: Uuid;
  book_title: BookEntity["title"];
  chapter_title: ChapterEntity["title"];
}

export interface CreateNoteResponseDto {
  note: NoteDto;
}
export interface ListNotesResponseDto {
  notes: NoteListItemDto[];
  meta: PaginationMetaDto;
}
export interface GetNoteResponseDto {
  note: NoteDto;
  context?: NoteContextDto;
}
export interface UpdateNoteResponseDto {
  note: Pick<NoteEntity, "id" | "content" | "embedding_status" | "updated_at">;
}

/**
 * READING SESSIONS
 */
export type ReadingSessionDto = Pick<ReadingSessionEntity, "id" | "book_id" | "started_at" | "ended_at" | "end_page">;

export type StartReadingSessionCommand = Record<never, never>;

export interface StopReadingSessionCommand {
  ended_at?: IsoDateTimeString;
  // DB column is `number | null`; client payload should be a concrete number when provided.
  end_page?: Exclude<ReadingSessionEntity["end_page"], null>;
  update_book_progress?: boolean;
}

export interface ReadingSessionsListQueryDto {
  page?: number;
  size?: number;
  book_id?: ReadingSessionEntity["book_id"];
  started_after?: IsoDateTimeString;
  started_before?: IsoDateTimeString;
  sort?: "started_at" | "ended_at";
  order?: SortOrderDto;
}

export interface StartReadingSessionResponseDto {
  reading_session: ReadingSessionDto;
}

export interface StopReadingSessionResponseDto {
  reading_session: Pick<ReadingSessionEntity, "id" | "ended_at" | "end_page">;
  book: Pick<BookEntity, "id" | "current_page" | "status">;
}

export interface ListReadingSessionsResponseDto {
  reading_sessions: ReadingSessionDto[];
  meta: PaginationMetaDto;
}
export interface GetReadingSessionResponseDto {
  reading_session: ReadingSessionDto;
}

/**
 * AI SEARCH (RAG)
 */
export type MatchNotesRpcRow = Database["public"]["Functions"]["match_notes"]["Returns"][number];

/**
 * API plan calls this field `note_embedding_id`, but the RPC returns `id`.
 * This type performs a “rename” while still being fully derived from the RPC return type.
 */
export type AiCitationDto = Omit<MatchNotesRpcRow, "id"> & { note_embedding_id: MatchNotesRpcRow["id"] };

export interface AiAnswerDto {
  text: string;
  low_confidence: boolean;
}

export interface AiUsageDto {
  retrieved_chunks: number;
  model: string;
  latency_ms: number;
}

export interface AiQueryScopeDto {
  book_id?: Uuid | null;
  series_id?: Uuid | null;
}

export type AiQueryRetrievalDto = Pick<
  Database["public"]["Functions"]["match_notes"]["Args"],
  "match_threshold" | "match_count"
>;

export interface AiQueryCommand {
  query_text: SearchLogEntity["query_text"];
  scope: AiQueryScopeDto;
  retrieval: AiQueryRetrievalDto;
}

export interface AiQueryResponseDto {
  answer: AiAnswerDto;
  citations: AiCitationDto[];
  usage: AiUsageDto;
}

/**
 * SEARCH LOGS (optional exposure)
 */
export type SearchLogDto = Pick<SearchLogEntity, "id" | "query_text" | "created_at">;

export interface SearchLogsListQueryDto {
  page?: number;
  size?: number;
  started_after?: IsoDateTimeString;
  started_before?: IsoDateTimeString;
}

export interface ListSearchLogsResponseDto {
  search_logs: SearchLogDto[];
  meta: PaginationMetaDto;
}

/**
 * EMBEDDING ERRORS (optional exposure)
 */
export type EmbeddingErrorDto = Pick<EmbeddingErrorEntity, "id" | "note_id" | "error_message" | "created_at">;

export interface EmbeddingErrorsListQueryDto {
  page?: number;
  size?: number;
  note_id?: EmbeddingErrorEntity["note_id"];
  sort?: "created_at";
  order?: SortOrderDto;
}

export interface ListEmbeddingErrorsResponseDto {
  embedding_errors: EmbeddingErrorDto[];
  meta: PaginationMetaDto;
}
export interface GetEmbeddingErrorResponseDto {
  embedding_error: EmbeddingErrorDto;
}

/**
 * SEARCH ERRORS (optional exposure)
 */
export type SearchErrorDto = Pick<
  SearchErrorEntity,
  "id" | "search_log_id" | "source" | "error_message" | "created_at"
>;

export interface SearchErrorsListQueryDto {
  page?: number;
  size?: number;
  source?: ErrorSource;
  search_log_id?: SearchErrorEntity["search_log_id"];
  sort?: "created_at";
  order?: SortOrderDto;
}

export interface ListSearchErrorsResponseDto {
  search_errors: SearchErrorDto[];
  meta: PaginationMetaDto;
}
export interface GetSearchErrorResponseDto {
  search_error: SearchErrorDto;
}

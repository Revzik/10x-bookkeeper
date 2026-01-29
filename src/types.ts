import type { Enums, Tables, TablesInsert, TablesUpdate } from "./db/database.types";
import type { ZodIssue } from "zod";

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
  details?: ZodIssue[];
}

export interface ApiErrorResponseDto {
  error: ApiErrorDto;
}

/**
 * AUTH
 */
export interface AuthUserDto {
  id: string;
  email: string;
}

export interface LoginResponseDto {
  user: AuthUserDto;
}

export interface SignupResponseDto {
  user: AuthUserDto;
}

/**
 * Database-derived entity aliases
 * These keep DTOs “connected” to the underlying schema without re-declaring fields.
 */
export type SeriesEntity = Tables<"series">;
export type BookEntity = Tables<"books">;
export type ChapterEntity = Tables<"chapters">;
export type NoteEntity = Tables<"notes">;
export type SearchLogEntity = Tables<"search_logs">;
export type SearchErrorEntity = Tables<"search_errors">;

/**
 * Enums (derived from DB enums)
 */
export type BookStatus = Enums<"book_status">;
export type ErrorSource = Enums<"error_source">;

/**
 * SERIES
 */
export type SeriesDto = Pick<
  SeriesEntity,
  "id" | "title" | "description" | "cover_image_url" | "created_at" | "updated_at"
>;

export type SeriesListItemDto = Pick<SeriesEntity, "id" | "title" | "created_at" | "updated_at">;

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
  "id" | "title" | "author" | "status" | "total_pages" | "current_page" | "series_id" | "series_order" | "updated_at"
>;

export type CreateBookCommand = Pick<TablesInsert<"books">, "title" | "author" | "total_pages"> &
  Partial<Pick<TablesInsert<"books">, "series_id" | "series_order" | "status" | "cover_image_url">>;

export type UpdateBookCommand = Partial<
  Pick<
    TablesUpdate<"books">,
    "title" | "author" | "total_pages" | "current_page" | "status" | "series_id" | "series_order" | "cover_image_url"
  >
>;

/**
 * NOTE: The API plan previously included `POST /books/:bookId/progress`.
 * That endpoint is not part of the current PoC plan; prefer `PATCH /books/:bookId` instead.
 * This type remains for forward-compatibility and to keep DB-coupling intact.
 */
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
export type NoteDto = Pick<NoteEntity, "id" | "chapter_id" | "content" | "created_at" | "updated_at">;

export type NoteListItemDto = Pick<NoteEntity, "id" | "chapter_id" | "content" | "created_at" | "updated_at">;

export type CreateNoteCommand = Pick<TablesInsert<"notes">, "content">;
export type UpdateNoteCommand = Partial<Pick<TablesUpdate<"notes">, "content" | "chapter_id">>;

export interface NotesListQueryDto {
  page?: number;
  size?: number;
  book_id?: Uuid;
  chapter_id?: NoteEntity["chapter_id"];
  series_id?: Uuid;
  sort?: "created_at" | "updated_at";
  order?: SortOrderDto;
}

export interface NoteGetQueryDto {
  include?: "context";
}

export interface NoteContextDto {
  book_id: Uuid;
  book_title: BookEntity["title"];
  chapter_id: ChapterEntity["id"];
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
  note: Pick<NoteEntity, "id" | "content" | "chapter_id" | "updated_at">;
}

/**
 * AI SEARCH
 */
export interface AiAnswerDto {
  text: string;
  low_confidence: boolean;
}

export interface AiUsageDto {
  model: string;
  latency_ms: number;
}

export interface AiQueryScopeDto {
  book_id?: Uuid | null;
  series_id?: Uuid | null;
}

/**
 * Simplified command for AI query (PoC version without retrieval parameters).
 * Used for the "simple chat" implementation.
 */
export interface AiQuerySimpleCommand {
  query_text: SearchLogEntity["query_text"];
  scope: AiQueryScopeDto;
}

/**
 * Simplified response DTO for AI query endpoint (PoC version).
 * Does not include citations or retrieved_chunks.
 */
export interface AiQueryResponseDtoSimple {
  answer: AiAnswerDto;
  usage: {
    model: string;
    latency_ms: number;
  };
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

/**
 * VIEW MODELS (Library View)
 * These types are specific to the Library view and derived from DTOs for UI rendering.
 */

/**
 * Active tab identifier for Library view
 */
export type LibraryTabViewModel = "books" | "series";

/**
 * URL-backed query state for Books tab
 */
export interface LibraryBooksQueryViewModel {
  q?: string;
  status?: BookStatus;
  series_id?: string;
  sort: "updated_at" | "created_at" | "title" | "author" | "status";
  order: SortOrderDto;
  page: number;
  size: number;
}

/**
 * URL-backed query state for Series tab
 */
export interface LibrarySeriesQueryViewModel {
  q?: string;
  sort: "created_at" | "updated_at" | "title";
  order: SortOrderDto;
  page: number;
  size: number;
}

/**
 * UI-ready book row model derived from BookListItemDto
 */
export interface BookListItemViewModel {
  id: string;
  title: string;
  author: string;
  status: BookStatus;
  progressLabel: string;
  progressPercent: number;
  updatedAtIso: string;
  updatedAtLabel: string;
  seriesId: string | null;
  seriesOrder: number | null;
}

/**
 * UI-ready series row model derived from SeriesListItemDto
 */
export interface SeriesListItemViewModel {
  id: string;
  title: string;
  bookCount: number;
  createdAtIso: string;
  createdAtLabel: string;
  updatedAtIso: string;
  updatedAtLabel: string;
}

/**
 * Series option for dropdowns (filter + create book)
 */
export interface SeriesSelectOptionViewModel {
  value: string;
  label: string;
}

/**
 * VIEW MODELS (Series Detail View)
 * These types are specific to the Series Detail view and derived from DTOs for UI rendering.
 */

/**
 * Active tab identifier for Series Detail view
 */
export type SeriesTabViewModel = "books" | "ask";

/**
 * UI-ready series header model derived from SeriesDto
 */
export interface SeriesHeaderViewModel {
  id: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  bookCount: number;
  createdAtIso: string;
  createdAtLabel: string;
  updatedAtIso: string;
  updatedAtLabel: string;
}

/**
 * UI-ready book row for series books with reorder metadata
 * Extends BookListItemViewModel with position and move controls state
 */
export interface SeriesBookRowViewModel extends BookListItemViewModel {
  position: number;
  isMoveUpDisabled: boolean;
  isMoveDownDisabled: boolean;
}

/**
 * SHARED AI CHAT VIEW MODELS
 * These types are shared between Series Ask and Book Ask tabs to avoid duplication.
 */

/**
 * Chat message role - who authored the message
 */
export type AiChatRoleViewModel = "user" | "assistant";

/**
 * Chat message lifecycle status
 */
export type AiChatMessageStatusViewModel = "sent" | "pending" | "failed";

/**
 * Single chat message in the transcript (shared across book/series)
 */
export interface AiChatMessageViewModel {
  id: string;
  role: AiChatRoleViewModel;
  content: string;
  createdAtMs: number;
  status: AiChatMessageStatusViewModel;
  lowConfidence?: boolean; // assistant-only
}

/**
 * Aggregated state for the Ask tab chat interface (shared)
 */
export interface AiChatStateViewModel {
  messages: AiChatMessageViewModel[];
  draftText: string;
  isSubmitting: boolean;
  lastError: ApiErrorDto | null;
  lastSubmittedQueryText: string | null;
}

/**
 * Derived state for the composer (input) component (shared)
 */
export interface AiChatComposerViewModel {
  trimmedLength: number;
  isEmpty: boolean;
  isTooLong: boolean;
  validationError: string | null;
  charCountLabel: string; // `${trimmedLength} / 500`
}

/**
 * VIEW MODELS (Book Detail View)
 * These types are specific to the Book Detail view and derived from DTOs for UI rendering.
 */

/**
 * Active tab identifier for Book Detail view
 */
export type BookTabViewModel = "chapters" | "notes" | "ask";

/**
 * Ask tab scope identifier
 */
export type BookAskScopeViewModel = "book" | "series";

/**
 * Optional series display data for the header when book.series_id is present
 */
export interface BookSeriesSummaryViewModel {
  id: string;
  title: string;
}

/**
 * UI-ready book header model derived from BookDto (+ optional series info)
 * Includes both raw fields (for edit dialog) and computed fields (for display)
 */
export interface BookHeaderViewModel {
  // Raw fields (for edit dialog and other operations)
  id: string;
  title: string;
  author: string;
  status: BookStatus;
  totalPages: number;
  currentPage: number;
  seriesId: string | null;
  seriesOrder: number | null;
  coverImageUrl: string | null;

  // Computed/formatted fields (for display)
  progressLabel: string;
  progressPercent: number;
  series: BookSeriesSummaryViewModel | null;
  createdAtIso: string;
  createdAtLabel: string;
  updatedAtIso: string;
  updatedAtLabel: string;
}

/**
 * UI-ready chapter list item derived from ChapterListItemDto
 */
export interface ChapterListItemViewModel {
  id: string;
  bookId: string;
  title: string;
  order: number;
  updatedAtIso: string;
  updatedAtLabel: string;
}

/**
 * Reorder state for chapters tab
 */
export interface BookChaptersReorderStateViewModel {
  isEditing: boolean;
  isDirty: boolean;
  isSaving: boolean;
  serverOrderIds: string[];
  draftOrderIds: string[];
  saveError: ApiErrorDto | null;
}

/**
 * URL-backed query state for Notes tab
 */
export interface BookNotesQueryViewModel {
  chapter_id?: string;
  page: number;
  size: number;
}

/**
 * Chapter option for Notes tab filter dropdown
 */
export interface ChapterSelectOptionViewModel {
  value: string;
  label: string;
  chapterId?: string;
}

/**
 * UI-ready note list item derived from NoteListItemDto
 * Note: No separate title field - use chapter title in dialogs
 */
export interface NoteListItemViewModel {
  id: string;
  chapterId: string;
  content: string;
  createdAtIso: string;
  createdAtLabel: string;
  updatedAtIso: string;
  updatedAtLabel: string;
}

/**
 * Notes grouped by chapter ID
 */
export type NotesByChapterViewModel = Record<string, NoteListItemViewModel[]>;

/**
 * Existing note dialog mode - view or editing
 */
export type ExistingNoteDialogModeViewModel = "view" | "editing";

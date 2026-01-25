# View Implementation Plan — Book Notes (Tab)

## 1. Overview
The **Book Notes** tab is part of the Book Detail workspace and lets users **review, create, edit, and delete notes** scoped to a book (optionally filtered to a single chapter). The view is **URL-driven** (filters/sort/pagination in query params) and uses server-backed pagination via `GET /api/v1/notes`.

This plan implements PRD user stories **US-006, US-007, US-008** and follows existing patterns in the repo (Book Detail shell, hooks/services, shadcn/ui, Tailwind).

## 2. View Routing
- **Astro page**: `src/pages/books/[bookId].astro` (already exists, renders `BookDetailPage`)
- **Tab route** (query-param driven):
  - `/books/:bookId?tab=notes&chapter_id=:chapterId?&sort=updated_at|created_at&order=asc|desc&page=&size=`

### URL defaults (when missing/invalid)
- `tab`: handled by `useBookUrlState()` (already supports `notes`)
- `sort`: `"updated_at"`
- `order`: `"desc"`
- `page`: `1`
- `size`: `20` (match Library defaults) or `10` (match API default). Choose **20** for consistency with Library.
- `chapter_id`: undefined (means “All chapters”)

## 3. Component Structure
The Notes tab is rendered by `BookDetailPage` when `activeTab === "notes"`.

High-level component tree:

```
BookDetailPage
└─ BookNotesTabPanel
   ├─ BookNotesHeaderRow
   │  ├─ ChapterFilterSelect
   │  ├─ SortSelect (created_at/updated_at)
   │  ├─ OrderToggleButton (asc/desc)
   │  └─ AddNoteButton
   ├─ InlineBanner (error states)
   ├─ BookNotesList
   │  ├─ (loading) EntrySkeleton
   │  ├─ (empty) EmptyStateCard (+ Add Note CTA)
   │  └─ BookNotesGroupedList
   │     ├─ NotesChapterGroupSection (repeat)
   │     │  ├─ ChapterHeading (title)
   │     │  └─ NotesCardsWrap
   │     │     └─ NoteCard (repeat, clickable)
   ├─ PaginationControls
   └─ NoteDialog (create + view/edit + delete)
```

## 4. Component Details

### BookNotesTabPanel (`src/components/book/BookNotesTabPanel.tsx`)
- **Purpose**: Orchestrates Notes tab: URL state, data fetching, derived grouping, dialog state, and refetch after mutations.
- **Main elements**:
  - Wrapper `<div className="space-y-4">`
  - `BookNotesHeaderRow`
  - Conditional banners (`InlineBanner`) for list errors and mutation errors (if tracked)
  - `BookNotesList`
  - `PaginationControls` (reuse existing `src/components/library/PaginationControls.tsx`)
  - `NoteDialog`
- **Handled events**:
  - **Filter/sort/pagination changes**: update URL-backed query state (see “State Management”).
  - **Add note**: open create dialog (preselect chapter from current filter).
  - **Open note**: clicking a `NoteCard` opens the `NoteDialog` in **view mode** for that note.
  - **Edit note**: from within `NoteDialog`, enter edit mode; save triggers update; discard restores original content.
  - **Delete note**: from within `NoteDialog`, confirm and delete.
  - **After create/edit/delete**: close dialog and `refetch()` notes list; optionally keep current pagination, but if create/delete might invalidate page, reset page to `1`.
- **Validation conditions**:
  - **URL params**:
    - `chapter_id` must be a UUID if present; invalid values are ignored (fallback to “All chapters”).
    - `sort` must be `"created_at"` or `"updated_at"`, else default `"updated_at"`.
    - `order` must be `"asc"` or `"desc"`, else default `"desc"`.
    - `page` must be >= 1, else default `1`.
    - `size` must be clamped to [1, 100] (API constraint); default `20`.
  - **Create/Edit**: handled in `NoteDialog` (content required, max length, etc.).
- **Types (DTO & ViewModel)**:
  - DTOs: `NotesListQueryDto`, `ListNotesResponseDto`, `NoteListItemDto`, `CreateNoteCommand`, `CreateNoteResponseDto`, `UpdateNoteCommand`, `UpdateNoteResponseDto`, `ApiErrorDto`
  - ViewModels (new): `BookNotesQueryViewModel`, `NoteListItemViewModel`, `NotesByChapterViewModel`, `ChapterSelectOptionViewModel`
- **Props**:
  - `bookId: string`

### BookNotesHeaderRow (new, recommended: `src/components/book/BookNotesHeaderRow.tsx`)
- **Purpose**: Top “controls panel” for filtering/sorting and primary CTA.
- **Main elements**:
  - `<div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">`
  - Left: `ChapterFilterSelect`, `SortSelect`, `OrderToggleButton`
  - Right: `Add note` button
- **Handled events**:
  - `onChapterChange(chapterIdOrEmpty)`
  - `onSortChange(sort)`
  - `onOrderToggle()`
  - `onAdd()`
- **Validation conditions**:
  - Chapter select value is either `""` (All) or a valid chapter UUID from `useChaptersList(bookId)`.
  - When chapter/sort/order changes: reset pagination to `page=1`.
- **Types**:
  - `BookNotesQueryViewModel`
  - `ChapterSelectOptionViewModel[]`
- **Props**:
  - `query: BookNotesQueryViewModel`
  - `chapterOptions: ChapterSelectOptionViewModel[]` (includes “All chapters” option)
  - `isAddDisabled: boolean`
  - `addDisabledReason?: string`
  - `onQueryChange(next: BookNotesQueryViewModel): void`
  - `onAdd(): void`

### ChapterFilterSelect (inline in header row or separate component)
- **Purpose**: Filter notes to one chapter or all chapters.
- **Main elements**: shadcn `Select` (`src/components/ui/select.tsx`)
- **Handled events**: `onValueChange(value)`
- **Validation**: only allow values from `chapterOptions`
- **Types**:
  - `ChapterSelectOptionViewModel` `{ value: string; label: string; chapterId?: string }`
- **Props**:
  - `value: string` (empty string means “All chapters”)
  - `options: ChapterSelectOptionViewModel[]`
  - `disabled?: boolean`
  - `onChange(value: string): void`

### SortSelect + OrderToggleButton
- **Purpose**: Control server sort (`created_at|updated_at`) and order (`asc|desc`).
- **Main elements**:
  - Sort: `Select` with two items (“Updated” → `updated_at`, “Created” → `created_at`)
  - Order toggle: `Button variant="outline" size="sm"` that flips `asc`/`desc` with accessible label
- **Handled events**:
  - Sort change: `onQueryChange({ ...query, sort, page: 1 })`
  - Order toggle: `onQueryChange({ ...query, order: nextOrder, page: 1 })`
- **Validation**:
  - Only allow whitelisted sort/order values (same as API).

### BookNotesList (new, recommended: `src/components/book/BookNotesList.tsx`)
- **Purpose**: Render notes list with loading/empty states and grouped display.
- **Main elements**:
  - Loading: `EntrySkeleton`
  - Empty: card with CTA (“Add note”) and optional guidance (“Add chapters first” if none exist)
  - Non-empty: grouped list sections
- **Handled events**:
  - `onOpen(noteId)` forwarded from cards
- **Validation**:
  - No direct validation; render-only component.
- **Types**:
  - `NoteListItemViewModel`
  - `NotesByChapterViewModel`
- **Props**:
  - `loading: boolean`
  - `notes: NoteListItemViewModel[]`
  - `chaptersById: Record<string, ChapterListItemViewModel>` (from `useChaptersList`)
  - `chapterOrderIds: string[]` (chapter ids sorted by chapter.order)
  - `onOpen(noteId: string): void`
  - `onAdd(): void`

### NotesChapterGroupSection (new, recommended: `src/components/book/NotesChapterGroupSection.tsx`)
- **Purpose**: Display a chapter heading and the notes belonging to that chapter.
- **Main elements**:
  - Heading row: chapter title + “Updated …” optional; optional “Go to Chapters tab” link (deep-link)
  - Notes layout: a responsive wrap layout containing clickable `NoteCard`s
    - Recommended: `div` with `flex flex-wrap gap-3` (wrap behavior) or `grid` (structured columns). Use **wrap** per requirement.
    - Card sizing recommendation (so cards sit side-by-side and wrap cleanly):
      - Container: `flex flex-wrap gap-3`
      - Card: `w-full sm:w-[calc(50%-0.375rem)] lg:w-[calc(33.333%-0.5rem)]` (or `min-w-[240px] flex-1` if you prefer fluid widths)
- **Handled events**:
  - `onOpen(noteId)` forwarded from cards
  - Optional “View chapter” link:
    - Navigate to `/books/:bookId?tab=chapters` (or keep on notes and set `chapter_id=`; choose one)
    - Recommended: “View chapter” sets `tab=chapters` while preserving `chapter_id` to support the user journey.
- **Types**:
  - `ChapterListItemViewModel`
  - `NoteListItemViewModel`
- **Props**:
  - `bookId: string`
  - `chapter: ChapterListItemViewModel`
  - `notes: NoteListItemViewModel[]`
  - `onOpen(noteId: string): void`

### NoteCard (new, recommended: `src/components/book/NoteCard.tsx`)
- **Purpose**: Render a compact, clickable card for a note. Cards are displayed **side-by-side** and **wrap** within `NotesChapterGroupSection` when they overflow.
- **Main elements**:
  - Container: `button` (or `div` with `role="button"`) styled like a card:
    - `rounded-lg border border-border bg-card p-4 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
    - Width classes should be applied by the parent wrap container (see `NotesChapterGroupSection`) to ensure wrapping behavior is consistent.
  - Title: `h3` (derived from note content; see types/transformers)
  - Trimmed content preview (clamped):
    - Use CSS line clamp or fixed max chars; keep plain text rendering
- **Handled events**:
  - `onClick()` → open `NoteDialog` for this note
- **Validation**:
  - No direct validation; render-only.
  - **Security**: render note content as plain text (no unsafe HTML).
- **Types**:
  - `NoteListItemViewModel`
- **Props**:
  - `note: NoteListItemViewModel` (must contain `title` + `contentPreview`)
  - `onOpen(): void`

### NoteDialog (new, recommended: `src/components/book/NoteDialog.tsx`)
- **Purpose**: Reusable modal for **creating** a note and for **viewing/editing/deleting** an existing note. Clicking a `NoteCard` opens the dialog in **view mode**; users can enter editing mode, save/discard changes, or delete.
- **Main elements** (shadcn `Dialog`):
  - `DialogHeader` with title:
    - Create: “Add note”
    - View: note title (derived) or “Note”
  - Top-right actions for existing notes:
    - View mode: `Edit` (secondary) + `Delete` (destructive)
    - Editing mode: `Discard` (outline) + `Save` (primary)
  - Chapter select:
    - Create mode: required `Select` for chapter
    - Existing notes: show chapter label read-only (optional), no chapter change (API doesn’t support changing chapter_id)
  - Content area:
    - View mode: read-only `<div className="whitespace-pre-wrap">` with full content (plain text)
    - Editing mode: `Textarea` with current content + counter
  - Error surfaces:
    - Field errors (content, chapter)
    - General error banner (non-field errors)
- **Handled events**:
  - `onOpenChange(open)`
  - `onClickEdit()` → enters editing mode (copies current content into editable draft)
  - `onClickDiscard()` → exits editing mode and restores original content in the form
  - `onClickSave()`:
    - Create: `POST /chapters/:chapterId/notes`
    - Existing note: `PATCH /notes/:noteId`
  - `onClickDelete()`:
    - Confirm then `DELETE /notes/:noteId`
    - Recommended confirm approach without adding new UI deps: `window.confirm(...)`
      - Optional enhancement: add shadcn `AlertDialog` via `npx shadcn@latest add alert-dialog` and use it for consistent UX.
- **Validation conditions (must match API)**
  - **Chapter** (create only):
    - Required.
    - Must be one of the chapter IDs from `useChaptersList(bookId)` (prevents accidental 404).
  - **Content**:
    - `trim().length >= 1` (required, non-empty after trimming)
    - `length <= 10000` (hard cap aligned to `notes.schemas.ts`)
  - **No-op save** (existing note):
    - If content unchanged from original, disable Save or show “No changes to save”.
- **Error mapping**:
  - `VALIDATION_ERROR` with `details` (zod issues): map to field errors:
    - `content` → show under textarea
  - `NOT_FOUND`:
    - Create: chapter missing → show “This chapter no longer exists” and prompt to refresh chapters
    - Update/Delete: note missing → treat as success by closing dialog and refetching (it was deleted elsewhere)
  - `RATE_LIMITED`:
    - Disable submit temporarily; show guidance (reuse `InlineBanner` or a compact inline message)
  - `INTERNAL_ERROR`: general error banner with retry suggestion
- **Types (DTO & ViewModel)**:
  - DTOs: `CreateNoteCommand`, `CreateNoteResponseDto`, `UpdateNoteCommand`, `UpdateNoteResponseDto`, `ApiErrorResponseDto`
  - ViewModels (new):
    - `UpsertNoteModeViewModel = "create" | "existing"`
    - `ExistingNoteDialogModeViewModel = "view" | "editing"`
    - `UpsertNoteFormViewModel`:
      - `chapter_id: string` (create only)
      - `content: string`
- **Props**:
  - `open: boolean`
  - `onOpenChange(open: boolean): void`
  - `mode: "create" | "existing"`
  - `bookId: string`
  - `chapterOptions: ChapterSelectOptionViewModel[]` (excluding “All chapters”)
  - `initialChapterId?: string` (create default from current filter)
  - `note?: NoteListItemViewModel` (required for `mode="existing"`)
  - `onSuccess(): void` (refetch and close)

### PaginationControls (existing, reuse)
- **Component**: `src/components/library/PaginationControls.tsx`
- **Purpose**: Server pagination (page navigation + page size selector).
- **Integration**:
  - `onPageChange(page)`: update URL query (keep chapter/sort/order)
  - `onSizeChange(size)`: update URL query and reset `page=1`

## 5. Types

### Existing DTOs (already in `src/types.ts`)
- **List query**: `NotesListQueryDto`
  - `page?: number`
  - `size?: number`
  - `book_id?: Uuid`
  - `chapter_id?: Uuid`
  - `sort?: "created_at" | "updated_at"`
  - `order?: "asc" | "desc"`
- **List response**: `ListNotesResponseDto`
  - `notes: NoteListItemDto[]`
  - `meta: PaginationMetaDto`
- **Create**:
  - `CreateNoteCommand` `{ content: string }`
  - `CreateNoteResponseDto` `{ note: NoteDto }`
- **Update**:
  - `UpdateNoteCommand` `{ content: string }`
  - `UpdateNoteResponseDto` `{ note: { id; content; embedding_status; updated_at } }`
- **Errors**:
  - `ApiErrorDto`, `ApiErrorResponseDto`

### New ViewModel types (to add in `src/types.ts`)
Add these under the “VIEW MODELS (Book Detail View)” section:

- **BookNotesSortViewModel**:
  - `type BookNotesSortViewModel = "created_at" | "updated_at";`
- **BookNotesQueryViewModel** (URL-backed state for Notes tab):
  - `chapter_id?: string` (undefined means “All”)
  - `sort: BookNotesSortViewModel`
  - `order: SortOrderDto`
  - `page: number`
  - `size: number`
- **ChapterSelectOptionViewModel** (Notes tab variant; can reuse `SeriesSelectOptionViewModel` style):
  - `value: string` (empty string for “All chapters”, otherwise chapter UUID)
  - `label: string`
  - Optional: `chapterId?: string` (same as `value` when not empty)
- **NoteListItemViewModel** (UI-ready note row):
  - `id: string`
  - `chapterId: string`
  - `content: string`
  - `title: string` (derived from content; see transformer rules)
  - `contentPreview: string` (derived, trimmed preview)
  - `createdAtIso: string`
  - `createdAtLabel: string`
  - `updatedAtIso: string`
  - `updatedAtLabel: string`
- **NotesByChapterViewModel** (derived grouping):
  - `type NotesByChapterViewModel = Record<string, NoteListItemViewModel[]>;`
- **UpsertNoteModeViewModel**:
  - `type UpsertNoteModeViewModel = "create" | "existing";`
- **ExistingNoteDialogModeViewModel**:
  - `type ExistingNoteDialogModeViewModel = "view" | "editing";`
- **UpsertNoteFormViewModel**:
  - `chapter_id: string` (required in create mode; ignored in `mode="existing"` because chapter reassignment isn’t supported)
  - `content: string`

### Transformers (new)
Create `src/components/book/hooks/notes.transformers.ts` (or extend `transformers.ts`) with:
- `transformNoteListItem(dto: NoteListItemDto): NoteListItemViewModel`
  - Use `formatRelativeTime` for labels.
  - Build `title` + `contentPreview` safely (no HTML):
    - `title`: first non-empty line of `content` (after trim), with common bullet prefixes removed (`•`, `-`, `*`) and truncated to ~60 chars; fallback to `"Note"`.
    - `contentPreview`: trim and truncate to ~200–300 chars (or clamp to 3–5 lines in UI); keep plain text.

## 6. State Management

### URL state
Implement Notes query state as URL-backed state (like Library):

Recommended approach:
- **Extend** `src/components/book/hooks/useBookUrlState.ts` to also parse and manage Notes query params:
  - Add `notesQuery: BookNotesQueryViewModel`
  - Add `setNotesQuery(next: BookNotesQueryViewModel): void`
  - Keep existing `activeTab` + `askScope` behavior unchanged.

Parsing rules (mirror `useLibraryUrlState`):
- `chapter_id`: keep only if it looks like a UUID; else `undefined`
- `sort`: `"created_at" | "updated_at"` else default `"updated_at"`
- `order`: `"asc" | "desc"` else default `"desc"`
- `page`: positive int else `1`
- `size`: clamp positive int to [1, 100] else default `20`

Updating rules:
- When `setNotesQuery` is called:
  - Preserve existing `tab` and `scope` params.
  - Set/remove `chapter_id`, `sort`, `order`, `page`, `size`.

### Local UI state (within `BookNotesTabPanel`)
- **Dialog state**:
  - `isNoteDialogOpen: boolean`
  - `noteDialogMode: "create" | "existing"`
  - `existingDialogMode: "view" | "editing"` (only when `noteDialogMode === "existing"`)
  - `selectedNoteId: string | null` (or selected note object)
- **Derived lookup state**:
  - `chaptersById` and `chapterOrderIds` from `useChaptersList(bookId)` data
  - `notesByChapter` via `useMemo` grouping

### Data fetching hooks (new)
Create `src/components/book/hooks/useNotesList.ts`:
- Inputs: `query: BookNotesQueryViewModel & { book_id: string }`
- Output:
  - `items: NoteListItemViewModel[]`
  - `meta: PaginationMetaDto | null`
  - `loading: boolean`
  - `error: ApiErrorDto | null`
  - `refetch(): void`

Implementation pattern should match `useBooksList`:
- Use `apiClient.getJson<ListNotesResponseDto>("/notes", { book_id, chapter_id, page, size, sort, order })`
- Transform items with `transformNoteListItem`

## 7. API Integration

All API calls use the existing `apiClient` (`src/lib/api/client.ts`) with base URL `/api/v1`.

### List notes (primary view query)
- **Request**: `GET /notes`
- **Params** (send only defined):
  - `book_id` (required for this view)
  - `chapter_id` (optional)
  - `page`, `size`, `sort`, `order`
- **Response type**: `ListNotesResponseDto`
- **Frontend action**: fetch on mount and whenever URL-backed query changes.

### Create note (chapter-scoped)
- **Request**: `POST /chapters/:chapterId/notes`
- **Body type**: `CreateNoteCommand` `{ content: string }`
- **Response type**: `CreateNoteResponseDto`
- **Frontend action**:
  - On success: close dialog and refetch list.
  - If current filter is “All chapters”, keep it (note will appear in list).
  - If current filter is a different chapter than created note’s chapter, consider switching filter to created chapter (optional UX); default to **not** changing filter unexpectedly.

### Update note
- **Request**: `PATCH /notes/:noteId`
- **Body type**: `UpdateNoteCommand` `{ content: string }`
- **Response type**: `UpdateNoteResponseDto`
- **Frontend action**: close dialog and refetch list (keep current page).

### Delete note
- **Request**: `DELETE /notes/:noteId`
- **Response**: `204 No Content`
- **Frontend action**:
  - Close dialog and refetch list.
  - Treat `NOT_FOUND` as success.

## 8. User Interactions
- **Open Notes tab**:
  - Navigating to `/books/:bookId?tab=notes` loads Notes tab with default sort and page settings.
- **Filter by chapter**:
  - User picks a chapter from dropdown.
  - URL updates (`chapter_id=...`, `page=1`).
  - Notes list refetches with `chapter_id`.
- **Change sort / order**:
  - User selects “Created” or “Updated”.
  - User toggles ascending/descending.
  - URL updates and list refetches (reset `page=1`).
- **Paginate**:
  - User clicks Previous/Next or changes page size.
  - URL updates; list refetches.
- **Add note**:
  - User clicks “Add note”.
  - Dialog opens; chapter is preselected if `chapter_id` filter is set.
  - User types content; sees counter and guidance.
  - Save triggers create API call.
- **Open note**:
  - User clicks a note card.
  - Dialog opens in **view mode** showing title and full content.
- **Edit note (inside dialog)**:
  - User clicks **Edit**.
  - Dialog switches to editing mode; buttons change to **Save** / **Discard**.
  - Save triggers update API call; discard restores the original content and returns to view mode.
- **Delete note (inside dialog)**:
  - User clicks **Delete** and confirms.
  - Confirm triggers delete API call.

## 9. Conditions and Validation

### API-driven constraints to enforce in UI
- **IDs**:
  - `bookId` comes from route param; used as `book_id` query param.
  - `chapter_id` must be a UUID; ignore invalid values at parse time.
  - `noteId` must be a UUID; only created from server data, so should be valid.
- **List query constraints**:
  - `sort`: only `created_at|updated_at`
  - `order`: only `asc|desc`
  - `size`: 1–100 (clamp in URL parsing and in UI size selector)
- **Note content** (create/edit):
  - Required after trimming
  - Max 10,000 characters (hard cap)
  - Recommended 500–1000 characters (soft guidance; do not block)

### Component-level verification points
- **`useBookUrlState` parsing**: drops invalid query params instead of sending them to API (prevents `VALIDATION_ERROR` spam).
- **`NoteDialog` submit handler**:
  - Prevent submit if invalid.
  - Disable submit while request in-flight.
  - Map API validation errors to field-level errors.

## 10. Error Handling

### List errors (`useNotesList`)
- Show `InlineBanner` with:
  - Retry (`refetch`)
  - Error details (existing `InlineBanner` prints `error.details` JSON)
- Common cases:
  - `VALIDATION_ERROR`: should be rare if URL parsing is strict; if it occurs, show banner and provide “Reset filters” action (optional: set defaults).
  - `INTERNAL_ERROR`: banner with retry.
  - `RATE_LIMITED`: banner messaging already handles this.

### Mutation errors (create/edit/delete)
- **Create/Edit**:
  - Inline field errors for `VALIDATION_ERROR` (zod issues).
  - General error banner for others.
  - For `RATE_LIMITED`: show message and keep dialog open.
- **Delete**:
  - Treat `NOT_FOUND` as success (already deleted).
  - Otherwise show error in dialog and keep it open.

### Edge cases
- **No chapters exist**:
  - Notes list may still show notes (unlikely), but “Add note” must be disabled because creation requires a chapter.
  - Empty state should guide user to add chapters first (CTA could link to Chapters tab).
- **Chapter deleted while Notes tab open**:
  - Filter `chapter_id` may now refer to missing chapter; list call still works (it filters by chapter_id, returns empty).
  - Creating a note for that chapter would `NOT_FOUND`; handle with dialog message and suggest refreshing chapters.
- **Pagination after delete**:
  - If last item on last page is deleted, the current page may become empty. After refetch, if `meta.total_pages < query.page`, set `page = meta.total_pages` (clamp) and refetch once.

## 11. Implementation Steps
1. **Add new Notes tab URL state**:
   - Extend `useBookUrlState` to parse and expose `notesQuery` + `setNotesQuery` (preserve existing behavior).
2. **Add ViewModel types**:
   - Add `BookNotesQueryViewModel`, `NoteListItemViewModel`, and helper types to `src/types.ts`.
3. **Add transformers**:
   - Implement `transformNoteListItem` (new file or extend existing transformers).
4. **Create `useNotesList` hook**:
   - Fetch `GET /notes` using `apiClient` and URL query state; return items/meta/loading/error/refetch.
5. **Implement Notes tab UI components**:
   - `BookNotesHeaderRow` with chapter filter, sort, order toggle, and Add note CTA.
   - `BookNotesList` + grouping sections + **wrapping `NoteCard`s**.
   - Reuse `EntrySkeleton`, `InlineBanner`, and `PaginationControls`.
6. **Implement dialogs**:
   - `NoteDialog` (create + view/edit/delete) with content validation, counter, and API integration.
7. **Wire `BookNotesTabPanel`**:
   - Use `useChaptersList(bookId)` for chapter options and chapter title mapping.
   - Use `useNotesList({ ...notesQuery, book_id: bookId })` for notes.
   - Manage dialog state and refetch on success.
8. **UX polish & a11y**:
   - Ensure focus is trapped in dialogs and restored on close (shadcn `Dialog` handles basics; verify initial focus on textarea).
   - Ensure buttons/controls have accessible labels (especially order toggle).
   - Keep tab content mounted behavior consistent with BookDetailPage (`hidden` panels).


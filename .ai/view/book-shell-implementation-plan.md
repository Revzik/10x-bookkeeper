# View Implementation Plan — Book Detail (Workspace Shell)

## 1. Overview
The **Book Detail (Workspace Shell)** view is the primary working surface for a single book. It enables a user to:
- View core book metadata (cover, title, author, optional series, timestamps).
- Track reading progress at a glance (current page, total pages, computed percent).
- Perform global book actions from a sticky header menu: **Edit book** and **Delete book**.
- Navigate between sticky tabs: **Chapters**, **Notes**, **Ask** (tab panels can be stubbed initially, but the shell must be ready to host them).

This view is **mobile-first** with:
- A **sticky header** (collapsible on small screens while keeping title + actions visible).
- A **sticky tab bar** so tabs are always reachable while content scrolls underneath.

## 2. View Routing
- **Route**: `/books/:bookId`
- **Query params**:
  - `tab=chapters|notes|ask` (default `chapters`)
  - (Recommended for forward-compatibility, matches `.ai/ui-plan.md`):
    - `scope=book|series` (Ask tab only; default `book`)

**Astro page file**:
- Create `src/pages/books/[bookId].astro` to mount a React island and pass `bookId` from `Astro.params.bookId`.

## 3. Component Structure
High-level component tree (React island mounted from `src/pages/books/[bookId].astro`):

```
BookDetailPage
├─ BookStickyHeader
│  ├─ BookCover (optional)
│  ├─ BookHeaderMeta (title, author, series link, status, progress, timestamps)
│  └─ BookActionsMenu
│     ├─ EditBookDialog (modal)
│     └─ DeleteBookDialog (confirmation modal)
├─ BookTabsBar (sticky)
│  ├─ TabTrigger: Chapters
│  ├─ TabTrigger: Notes
│  └─ TabTrigger: Ask
└─ BookTabContent
   ├─ BookChaptersTabPanel (stub/placeholder initially)
   ├─ BookNotesTabPanel (stub/placeholder initially)
   └─ BookAskTabPanel (stub/placeholder initially)
```

## 4. Component Details

### `src/pages/books/[bookId].astro` (Astro page)
- **Purpose**: Route entrypoint for `/books/:bookId`; provides layout and mounts the React view.
- **Main elements**:
  - Uses `src/layouts/Layout.astro`.
  - Mounts `BookDetailPage` with `client:only="react"` (consistent with existing `/library` and `/series/:seriesId`).
  - Passes `bookId` prop (`Astro.params.bookId`) into React.
- **Handled events**: none (delegated to React).
- **Validation conditions**:
  - Ensure `bookId` exists; if missing, return a `400` response (matches `src/pages/series/[seriesId].astro` pattern).
- **Types**: none.
- **Props**: none.

---

### `BookDetailPage` (React root)
- **Purpose**: Orchestrates URL tab state, fetches book data, resolves optional series metadata for header display, and owns dialog open/close state.
- **Main elements**:
  - `BookStickyHeader` (sticky)
  - `BookTabsBar` (sticky)
  - Conditional tab panels (`Chapters` / `Notes` / `Ask`)
  - Page-level error/not-found states (rendered instead of the normal shell when needed)
- **Handled events**:
  - `onTabChange(nextTab)` updates URL `tab` and switches panels.
  - `onRetryBook()` triggers a refetch of book data.
  - `onBookUpdated(nextBook)` updates local book state (and can refetch).
  - `onBookDeleted()` navigates user back to Library (`/library?tab=books`) after successful delete.
- **Validation conditions**:
  - Parse/validate `tab` from URL; unknown -> `"chapters"`.
  - Treat `bookId` as opaque string but assume it is a UUID; if API returns `VALIDATION_ERROR`, show an “Invalid book link” not-found-like state.
  - Optional: parse/validate `scope` from URL; unknown -> `"book"`. If book has no `series_id`, force `"book"` scope (disable series scope in UI later).
- **Types**:
  - DTOs: `GetBookResponseDto`, `BookDto`, `ApiErrorDto`, `ApiErrorResponseDto`
  - ViewModels (new): `BookTabViewModel`, `BookHeaderViewModel`, `BookDetailStateViewModel`
- **Props**:
  - `bookId: string`

---

### `BookStickyHeader`
- **Purpose**: Displays book identity + key metadata at the top of the workspace with global actions.
- **Main elements**:
  - Root container with `position: sticky` (e.g. `sticky top-0 z-20`) and background to avoid content bleed.
  - Cover image (optional), title, author, optional series link, status badge, progress, timestamps.
  - Actions menu/button group: **Edit book**, **Delete book**.
  - Responsive behavior:
    - On small screens, keep a compact header row always visible (title + actions).
    - Expand/collapse secondary metadata (author/status/progress/timestamps) via a “Details” toggle button (recommended to satisfy “collapsible on small screens”).
- **Handled events**:
  - `onOpenEdit()` opens `EditBookDialog`.
  - `onOpenDelete()` opens `DeleteBookDialog`.
  - `onToggleCollapsed()` for mobile collapse behavior (if implemented).
- **Validation conditions**:
  - If `cover_image_url` is present but image fails to load, fall back to a placeholder.
  - If series metadata is not available yet:
    - If `book.seriesId` is present but title is not resolved, show a neutral placeholder (e.g. “In series”) or omit.
- **Types**:
  - ViewModels: `BookHeaderViewModel`
- **Props**:
  - `book: BookHeaderViewModel`
  - `onEdit: () => void`
  - `onDelete: () => void`

---

### `BookActionsMenu`
- **Purpose**: Accessible “More” menu for global book actions in the header.
- **Main elements**:
  - Trigger button (e.g. “Actions” or icon button).
  - Menu items:
    - “Edit book”
    - “Delete book”
- **Handled events**:
  - `onSelectEdit`
  - `onSelectDelete`
- **Validation conditions**: none.
- **Types**: none.
- **Props**:
  - `onEdit: () => void`
  - `onDelete: () => void`
- **Implementation note**:
  - Prefer existing shadcn `DropdownMenu` (`src/components/ui/dropdown-menu.tsx`).

---

### `BookTabsBar`
- **Purpose**: Sticky tab bar for “Chapters / Notes / Ask” that remains reachable on mobile.
- **Main elements**:
  - `Tabs` component (existing shadcn `src/components/ui/tabs.tsx`) with triggers.
  - Sticky positioning directly beneath the sticky header (e.g. `sticky top-[headerHeight] z-10`).
- **Handled events**:
  - `onValueChange(tab)` updates URL and switches panel.
- **Validation conditions**:
  - Only allow `"chapters" | "notes" | "ask"`; unknown -> `"chapters"`.
- **Types**:
  - `BookTabViewModel`
- **Props**:
  - `activeTab: BookTabViewModel`
  - `onTabChange: (tab: BookTabViewModel) => void`

---

### `BookChaptersTabPanel` (stub)
- **Purpose**: Placeholder for chapter management UI (create/edit/delete/reorder) implemented in a dedicated plan.
- **Main elements**:
  - Informational message - “Chapters will appear here.”
- **Handled events**: none.
- **Validation conditions**: none.
- **Types**: none (for stub).
- **Props**:
  - `bookId: string`

---

### `BookNotesTabPanel` (stub)
- **Purpose**: Placeholder for notes list + note CRUD implemented in a dedicated plan.
- **Main elements**:
  - Informational message - “Notes will appear here.”
- **Handled events**: none.
- **Validation conditions**: none.
- **Types**: none (for stub).
- **Props**:
  - `bookId: string`

---

### `BookAskTabPanel` (stub)
- **Purpose**: Placeholder for book-scoped Q&A UI (Ask tab) implemented in a dedicated plan.
- **Main elements**:
  - Informational message - “Ask will appear here.”
- **Handled events**: none.
- **Validation conditions**: none.
- **Types**: none (for stub).
- **Props**:
  - `bookId: string`
  - (Optional, for future) `defaultScope?: "book" | "series"`

---

### `EditBookDialog`
- **Purpose**: Edit book metadata and progress via `PATCH /api/v1/books/:bookId`.
- **Main elements**:
  - Dialog modal (shadcn `Dialog`) with form fields (prefilled from current book):
    - `title` (optional update; cannot be empty if sent)
    - `author` (optional update; cannot be empty if sent)
    - `total_pages` (optional update; must be integer \(>0\) if sent)
    - `current_page` (optional update; must be integer \(\ge 0\) if sent)
    - `status` (optional update; `want_to_read|reading|completed`)
    - `series_id` (optional update; UUID or null to unlink)
    - `series_order` (optional update; integer \(\ge 1\); only meaningful if `series_id` is set)
    - `cover_image_url` (optional update; URL or null to clear)
  - Submit/Cancel buttons; submit disabled while request is in-flight.
  - Inline field errors + general error block.
- **Handled events**:
  - `onOpenChange(open)`
  - `onChange(field, value)` updates controlled form state
  - `onSubmit()`:
    - Client-validate
    - Build `UpdateBookCommand` containing **only changed fields**
    - Guard: if no fields changed, do not submit; show “No changes to save”.
    - Call PATCH
    - On success: close dialog, call `onUpdated(book)` to refresh header and dependent state.
    - On validation error:
      - If server provides `error.details` (Zod issues): map to fields by `issue.path.join(".")`
      - Else: show `error.message` in general error block.
- **Validation conditions** (mirror backend zod + service invariants):
  - **No-op updates**:
    - API rejects empty body (`VALIDATION_ERROR`: “At least one field must be provided for update”).
    - UI must prevent submitting when nothing changed.
  - **Title / Author**:
    - If included in PATCH, must satisfy `trim().length > 0`.
  - **Total pages**:
    - If included, must be integer \(>0\).
  - **Current page**:
    - If included, must be integer \(\ge 0\).
    - UI should also enforce `current_page <= total_pages` using the latest known total:
      - If user changes both: validate against the new values.
      - If user changes only one: validate against the other value from the current book.
    - This mirrors server behavior (`ValidationError`: “Current page cannot exceed total pages”).
  - **Series assignment**:
    - If user selects “None” and book currently has a series, send `series_id: null`.
    - If user selects a series UUID, send `series_id: <uuid>`.
    - If series_id changes, consider resetting `series_order` UI field (local UX), but do not auto-submit.
    - Server can return `NOT_FOUND` if new series does not exist.
  - **Series order**:
    - If provided, must be integer \(\ge 1\).
  - **Cover image URL**:
    - If non-empty string, must be a valid URL.
    - If user clears the field and a cover existed, send `cover_image_url: null`.
- **Types**:
  - DTOs: `UpdateBookCommand`, `UpdateBookResponseDto`, `BookDto`, `BookStatus`, `ApiErrorResponseDto`
  - ViewModels (new): `UpdateBookFormViewModel`
- **Props**:
  - `open: boolean`
  - `onOpenChange: (open: boolean) => void`
  - `book: BookDto` (preferred; provides raw fields needed for diffing)
  - `seriesOptions: SeriesSelectOptionViewModel[]` (reuse `useSeriesOptions()` from Library)
  - `onUpdated: (book: BookDto) => void`

---

### `DeleteBookDialog`
- **Purpose**: Confirm and execute book deletion via `DELETE /api/v1/books/:bookId`.
- **Main elements**:
  - Dialog modal with:
    - Clear warning text explaining cascade behavior:
      - Deleting a book also deletes its chapters, notes, note embeddings, and reading sessions (DB cascade).
    - Cancel / Delete buttons; Delete uses destructive styling.
- **Handled events**:
  - `onConfirmDelete()` calls DELETE
  - `onDeleted()` navigates back to `/library?tab=books`
- **Validation conditions**:
  - None beyond disabling the confirm button while request is in-flight.
- **Types**:
  - DTOs: `ApiErrorResponseDto`
  - ViewModels (new): `DeleteBookConfirmViewModel` (optional; can be as simple as local `isDeleting` + `error`)
- **Props**:
  - `open: boolean`
  - `onOpenChange: (open: boolean) => void`
  - `bookId: string`
  - `bookTitle: string`
  - `onDeleted: () => void`

---

### `BookNotFoundState`
- **Purpose**: Dedicated state for `404 NOT_FOUND` or invalid UUID (`VALIDATION_ERROR`) when loading the book.
- **Main elements**:
  - Title: “Book not found”
  - Copy: “It may have been deleted or the link is incorrect.”
  - Primary action button: “Back to Library” (navigates to `/library?tab=books`)
- **Handled events**:
  - `onBackToLibrary()`
- **Validation conditions**: none.
- **Types**: none.
- **Props**: none.

## 5. Types
Use existing DTOs from `src/types.ts` where possible and add **Book Detail view-specific ViewModels** (recommended: add to `src/types.ts` under a new “VIEW MODELS (Book Detail View)” section).

### Existing DTOs (from `src/types.ts`)
- **Books**:
  - `BookDto`
  - `GetBookResponseDto`
  - `UpdateBookCommand`
  - `UpdateBookResponseDto`
  - `BookStatus`
  - `SeriesSelectOptionViewModel` (already used by `AddBookDialog`; reuse for Edit dialog)
- **Errors**:
  - `ApiErrorDto`
  - `ApiErrorResponseDto`

### New ViewModel types (to add)
#### `export type BookTabViewModel = "chapters" | "notes" | "ask"`

#### `export type BookAskScopeViewModel = "book" | "series"`
Recommended for forward-compatibility with the Ask tab design.

#### `export interface BookSeriesSummaryViewModel`
Optional series display data for the header when `book.series_id` is present.
- `id: string`
- `title: string`

#### `export interface BookHeaderViewModel`
UI-ready book header model derived from `BookDto` (+ optional series info).
- `id: string`
- `title: string`
- `author: string`
- `status: BookStatus`
- `totalPages: number`
- `currentPage: number`
- `progressLabel: string` (e.g. `"42 / 100"`)
- `progressPercent: number` (0–100)
- `coverImageUrl: string | null`
- `series: BookSeriesSummaryViewModel | null`
- `createdAtIso: string`
- `createdAtLabel: string` (human-friendly; reuse `formatRelativeTime`)
- `updatedAtIso: string`
- `updatedAtLabel: string`

#### `export interface UpdateBookFormViewModel`
Controlled form state for `EditBookDialog` (string fields for inputs; supports diffing).
- `title: string`
- `author: string`
- `total_pages: string`
- `current_page: string`
- `status: BookStatus`
- `series_id: string` (empty string means “None” in UI)
- `series_order: string`
- `cover_image_url: string`

#### `export interface BookDetailStateViewModel`
Optional aggregator for `BookDetailPage` to keep render logic simple.
- `book: BookHeaderViewModel | null`
- `bookLoading: boolean`
- `bookError: ApiErrorDto | null`
- `bookNotFound: boolean`
- `activeTab: BookTabViewModel`
- `askScope: BookAskScopeViewModel` (optional; only relevant for Ask tab)

## 6. State Management
Use **URL query params as the source of truth** for the active tab, plus local React state for dialogs/forms.

### Required state (in `BookDetailPage`)
- **Routing state**:
  - `activeTab: BookTabViewModel` (from URL `tab`)
  - (Optional) `askScope: BookAskScopeViewModel` (from URL `scope`, defaults to `book`)
- **Book fetch state**:
  - `bookDto: BookDto | null` (raw, for Edit dialog + PATCH diff)
  - `bookHeader: BookHeaderViewModel | null` (derived for rendering)
  - `loading: boolean`
  - `error: ApiErrorDto | null`
  - `notFound: boolean` (true when `error.code === "NOT_FOUND"` or `"VALIDATION_ERROR"`)
- **Optional series summary state (header only)**:
  - If `bookDto.series_id` exists, fetch series title for display:
    - `seriesTitle: string | null`
    - `seriesError: ApiErrorDto | null` (non-blocking; header may omit series title on failure)
- **UI state**:
  - `isEditOpen: boolean`
  - `isDeleteOpen: boolean`

### Custom hooks (recommended)
#### `useBookUrlState()`
- **Purpose**: Parse URL query params into `activeTab` (and optionally `askScope`), and provide setters that update URL via `history.pushState` and listen to `popstate`.
- **Key behavior**:
  - Default `tab=chapters`.
  - If parsing `scope`, default `scope=book`.
  - Do not clear other query params by default (future tab-specific params can coexist); only update the keys you own (`tab`, `scope`).

#### `useBookById(bookId)`
- **Purpose**: Fetch book header data via `GET /api/v1/books/:bookId`.
- **Returns**: `{ book: BookDto | null, loading, error, notFound, refetch }`
- **Error mapping**:
  - `NOT_FOUND` -> `notFound = true`
  - `VALIDATION_ERROR` (invalid UUID) -> `notFound = true`
  - Other errors -> `error` for `InlineBanner`

#### `useBookHeaderViewModel(bookDto, seriesTitle?)` (optional helper)
- **Purpose**: Transform `BookDto` to `BookHeaderViewModel` (compute progress percent, format timestamps, attach series summary).

## 7. API Integration
All API calls target the Astro endpoints with base `/api/v1` and use `src/lib/api/client.ts` (`apiClient`) for typed fetch + error parsing.

### Required API calls (primary)
#### Fetch book
- **Request**: `GET /api/v1/books/:bookId`
- **Response type**: `GetBookResponseDto` (`{ book: BookDto }`)
- **Frontend action**:
  - Transform `BookDto` to `BookHeaderViewModel` (progress percent + date labels).
  - If `book.series_id` is present, optionally fetch series title separately for header display (see below).

#### Update book
- **Request**: `PATCH /api/v1/books/:bookId`
- **Request type**: `UpdateBookCommand` (partial; must include at least one field)
- **Response type**: `UpdateBookResponseDto` (`{ book: BookDto }`)
- **Frontend action**:
  - Update local `bookDto` + derived header from response.
  - If `series_id` changed, refresh series title display (or clear it).

#### Delete book
- **Request**: `DELETE /api/v1/books/:bookId`
- **Response**: `204 No Content`
- **Frontend action**:
  - On success, navigate to `/library?tab=books`.

### Optional API call (header enrichment)
#### Fetch series title for header (when book is linked to a series)
- **Request**: `GET /api/v1/series/:seriesId`
- **Response type**: `GetSeriesResponseDto`
- **Frontend action**:
  - Extract `series.title` and attach to `BookHeaderViewModel.series`.
- **Failure behavior**:
  - Non-blocking; render header without series title if this call fails.

## 8. User Interactions

### Load view
- **Action**: User navigates to `/books/:bookId`.
- **Outcome**:
  - Book header loads and renders.
  - Default tab is `chapters`.

### Switch tabs
- **Action**: User clicks “Chapters” / “Notes” / “Ask”.
- **Outcome**:
  - URL updates `tab=...`.
  - Corresponding panel renders (stub for now).

### Edit book
- **Action**: User opens “Edit book”, updates fields, submits.
- **Outcome**:
  - Client validation runs (including progress invariants).
  - PATCH request executes with only changed fields.
  - On success: dialog closes, header updates to reflect changes.
  - On validation error:
    - Field errors shown when possible (Zod `details`)
    - Otherwise, show general validation message.

### Delete book
- **Action**: User opens “Delete book”, confirms.
- **Outcome**:
  - DELETE executes.
  - On success: user is redirected to `/library?tab=books`.

### Not found / invalid link
- **Action**: User navigates to an invalid/deleted `bookId`.
- **Outcome**:
  - Show `BookNotFoundState` with “Back to Library”.

## 9. Conditions and Validation
This section lists **API-imposed conditions** and how the UI verifies them.

### Book fetch (`GET /books/:bookId`)
- Handle `404 NOT_FOUND` as a dedicated “not found” state (not a generic error banner).
- Treat `VALIDATION_ERROR` for the path param as an invalid link; show the same not-found-like state.

### Book update (`PATCH /books/:bookId`)
- At least one field must be provided:
  - UI must prevent “Save” when no fields changed.
- Title/author:
  - If included in the PATCH payload, must be non-empty after trim.
- Progress invariants:
  - `total_pages > 0`
  - `current_page >= 0`
  - `current_page <= total_pages` (validate against the *final* values, including unchanged server values).
- Series invariants:
  - If `series_id` is provided and not null, it must exist; server may return `NOT_FOUND "Series not found"`.
  - If cover image is cleared, send `cover_image_url: null` (server normalizes empty string to null as well).

### Book delete (`DELETE /books/:bookId`)
- Destructive UX requirement:
  - The dialog must explain cascade behavior (chapters, notes, embeddings, sessions).

## 10. Error Handling

### Book fetch errors
- **NOT_FOUND / VALIDATION_ERROR**: render `BookNotFoundState`.
- **RATE_LIMITED / INTERNAL_ERROR**: render `InlineBanner` below the sticky header (or at the top of content) with Retry.

### Edit book errors
- **VALIDATION_ERROR**:
  - If `error.details` exists: map to field errors.
  - If `error.details` is absent (service-layer validation): show `error.message` in the dialog.
- **NOT_FOUND**:
  - Show “This book no longer exists”, close dialog, render not-found state.
- **INTERNAL_ERROR / RATE_LIMITED**:
  - Keep dialog open; show a general error block; allow retry.

### Delete book errors
- **NOT_FOUND**:
  - Assume it was already deleted; redirect back to `/library?tab=books` (optionally show a banner/toast if you later add a global toast system).
- **INTERNAL_ERROR / RATE_LIMITED**:
  - Keep dialog open and show an error block; allow retry.

## 11. Implementation Steps
1. **Add routing page**: create `src/pages/books/[bookId].astro` mounting `BookDetailPage` with `client:only="react"` and pass `bookId` as a prop.
2. **Create view folder + scaffolding**: add `src/components/book/` with `BookDetailPage.tsx`, `BookStickyHeader.tsx`, `BookTabsBar.tsx`, `BookChaptersTabPanel.tsx`, `BookNotesTabPanel.tsx`, `BookAskTabPanel.tsx`, `BookNotFoundState.tsx`, plus dialogs/menus.
3. **Add URL state hook**: implement `useBookUrlState()` to parse/update `tab` (and optionally `scope`) with `pushState` + `popstate` support.
4. **Implement book fetch hook**: create `useBookById(bookId)` using `apiClient.getJson<GetBookResponseDto>(\`/books/${bookId}\`)`, mapping errors into `{ error, notFound }`.
5. **Add Book Detail ViewModels**: extend `src/types.ts` with the “VIEW MODELS (Book Detail View)” section (tab union, header view model, edit form view model).
6. **Implement transformer**: create `src/components/book/transformers.ts` (or `hooks/transformers.ts`) to map `BookDto` → `BookHeaderViewModel` (progress percent + relative timestamps).
7. **Build sticky header**:
   - Implement `BookStickyHeader` with responsive collapse behavior on small screens.
   - Implement `BookActionsMenu` using existing shadcn dropdown.
8. **Implement Edit dialog**:
   - Build `EditBookDialog` by reusing patterns from `src/components/library/AddBookDialog.tsx` (controlled state, client validation, mapping Zod issues).
   - Reuse `useSeriesOptions()` so the user can link/unlink a series.
   - Ensure PATCH only sends changed fields and never submits an empty body.
9. **Implement Delete dialog**:
   - Build `DeleteBookDialog` with explicit cascade warning copy.
   - Wire to DELETE endpoint and redirect to `/library?tab=books` on success.
10. **Implement tab bar + stub panels**:
   - Add `BookTabsBar` with triggers and sticky placement.
   - Add stub `BookChaptersTabPanel`, `BookNotesTabPanel`, `BookAskTabPanel` to validate shell layout and navigation behavior.
11. **Final UX/accessibility pass**:
   - Confirm sticky header + sticky tabs work on small screens (tabs always reachable).
   - Ensure keyboard nav for tabs and action menu; dialogs trap focus and restore focus on close.
   - Ensure not-found state has a clear “Back to Library” action.


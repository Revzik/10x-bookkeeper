# View Implementation Plan — Library (Home)

## 1. Overview
The **Library** view is the primary landing page for Bookkeeper. It lets users:
- Browse **Books** (default tab) with server-backed search, filters, sorting, and pagination.
- Browse **Series** with server-backed search, sorting, and pagination.
- Create new **Books** and **Series** via modal dialogs.
- Navigate into **Book Detail** (`/books/:bookId`) and **Series Detail** (`/series/:seriesId`).

This view must preserve state in the URL (deep-linkable) and additionally preserve each tab’s last-used query params when switching tabs.

## 2. View Routing
- **Route**: `/library`
- **Query params**:
  - **Tab**: `tab=books|series` (default `books`)
  - **Books tab params**: `q`, `status`, `series_id`, `sort`, `order`, `page`, `size`
  - **Series tab params**: `q`, `sort`, `order`, `page`, `size`

**Astro page file**:
- Create `src/pages/library.astro` to render the page shell/layout and mount a React island (the interactive view).

## 3. Component Structure
High-level component tree (React island mounted from `src/pages/library.astro`):

```
LibraryPage
└─ LibraryTabs
   ├─ BooksTabPanel
   │  ├─ BooksToolbar
   │  │  ├─ SearchInput
   │  │  ├─ StatusFilterSelect
   │  │  ├─ SeriesFilterSelect
   │  │  ├─ SortSelect
   │  │  └─ OrderToggle
   │  ├─ InlineBanner (error/rate limit)
   │  ├─ BooksList (loading skeleton / empty / rows)
   │  │  └─ BookRow (repeated)
   │  └─ PaginationControls
   ├─ SeriesTabPanel
   │  ├─ SeriesToolbar
   │  │  ├─ SearchInput
   │  │  ├─ SortSelect
   │  │  └─ OrderToggle
   │  ├─ InlineBanner (error/rate limit)
   │  ├─ SeriesList (loading skeleton / empty / rows)
   │  │  └─ SeriesRow (repeated)
   │  └─ PaginationControls
   ├─ AddBookDialog
   └─ AddSeriesDialog
```

## 4. Component Details

### `src/pages/library.astro` (Astro page)
- **Purpose**: Route entrypoint for `/library`; provides layout and mounts the React view.
- **Main elements**:
  - Uses `src/layouts/Layout.astro` (app shell) and places a container for the React island.
  - Imports `LibraryPage` React component and mounts with a client directive (e.g. `client:load`).
- **Handled events**: none (delegated to React).
- **Validation**: none.
- **Types**: none.
- **Props**: none.

---

### `LibraryPage` (React)
- **Purpose**: Single source of truth for:
  - Current tab, URL query params, per-tab param preservation
  - Data fetching for current tab (and series list for book filter dropdown)
  - Opening/closing create dialogs and updating lists on successful creation
- **Main elements**:
  - Page header: “Library”
  - Primary CTA area:
    - Books tab: “Add Book”
    - Series tab: “Add Series”
  - `LibraryTabs` with two tabs and panels
  - Create dialogs mounted once at root for stable focus management
- **Handled events**:
  - `onTabChange(nextTab)`:
    - Store current tab’s search params snapshot (in `sessionStorage`) and restore last snapshot for the next tab.
    - Update the URL (pushState/replaceState) to the restored search string + `tab=...`.
  - `onCreatedBook(book)`:
    - Close dialog, show toast success, and refetch books list using current Books tab query.
  - `onCreatedSeries(series)`:
    - Close dialog, show toast success, and refetch series list using current Series tab query.
- **Validation conditions**:
  - URL parsing: coerce and validate query params to the allowed shapes (see **Conditions and Validation** section).
  - Search query length: `q` trimmed and max 50 chars (UI should prevent/flag beyond 50).
- **Types**:
  - DTOs: `ListBooksResponseDto`, `ListSeriesResponseDto`, `CreateBookResponseDto`, `CreateSeriesResponseDto`, `ApiErrorResponseDto`
  - ViewModels: `LibraryBooksQueryViewModel`, `LibrarySeriesQueryViewModel`, `BookListItemViewModel`, `SeriesListItemViewModel`, `LibraryTabViewModel`
- **Props (component interface)**: none (root view).

---

### `LibraryTabs`
- **Purpose**: Accessible tab switching between “Books” and “Series”.
- **Main elements**:
  - Tablist with two triggers
  - Tab panels rendered conditionally based on `activeTab`
- **Handled events**:
  - `onValueChange(nextTab)`
- **Validation conditions**:
  - `nextTab` must be `"books"` or `"series"`; unknown values fall back to `"books"`.
- **Types**:
  - `LibraryTabViewModel`
- **Props**:
  - `activeTab: LibraryTabViewModel`
  - `onTabChange: (tab: LibraryTabViewModel) => void`
  - `booksPanel: ReactNode`
  - `seriesPanel: ReactNode`

---

### `BooksTabPanel`
- **Purpose**: Render books list UI + controls for search/filter/sort/pagination, backed by `GET /api/v1/books`.
- **Main elements**:
  - `BooksToolbar`
  - `InlineBanner` for retryable errors (rate limit/internal)
  - `BooksList` (skeleton/empty/rows)
  - `PaginationControls`
- **Handled events**:
  - `onSearchChange(q)`
  - `onStatusChange(status)`
  - `onSeriesChange(series_id)`
  - `onSortChange(sort)`
  - `onOrderChange(order)`
  - `onPageChange(page)`
  - `onSizeChange(size)` (optional UI; size exists in API)
  - `onRowClick(bookId)` → navigate to `/books/${bookId}`
- **Validation conditions** (must match backend schemas):
  - `q`: optional; trimmed; length ≤ 50.
  - `status`: optional enum `"want_to_read" | "reading" | "completed"`.
  - `series_id`: optional UUID string.
  - `sort`: optional enum `"updated_at" | "created_at" | "title" | "author" | "status"` (default `"updated_at"`).
  - `order`: `"asc" | "desc"` (default `"desc"`).
  - `page`: integer ≥ 1 (default 1).
  - `size`: integer 1..100 (default 10).
- **Types**:
  - DTOs: `BooksListQueryDto`, `BookListItemDto`, `ListBooksResponseDto`, `PaginationMetaDto`, `BookStatus`
  - ViewModels: `LibraryBooksQueryViewModel`, `BookListItemViewModel`
- **Props**:
  - `query: LibraryBooksQueryViewModel`
  - `onQueryChange: (next: LibraryBooksQueryViewModel) => void` (should update URL + reset `page` to 1 on filter/search/sort change)
  - `items: BookListItemViewModel[]`
  - `meta: PaginationMetaDto | null`
  - `loading: boolean`
  - `error: ApiErrorResponseDto["error"] | null`
  - `seriesOptions: SeriesSelectOptionViewModel[]` (for filter dropdown)
  - `onRetry: () => void`

---

### `BooksToolbar`
- **Purpose**: All Books tab list controls (URL-backed).
- **Main elements**:
  - Search input (`q`)
  - Status select (`status`)
  - Series select (`series_id`)
  - Sort select (`sort`)
  - Order toggle (`order`)
- **Handled events**:
  - `onChange` for each control, calling `onQueryChange(...)`
  - Search should be **debounced** before committing to URL to avoid excessive fetches.
- **Validation conditions**:
  - Enforce `q.length <= 50` client-side; show inline message if exceeded; do not apply to URL until valid.
  - When changing any of: `q`, `status`, `series_id`, `sort`, `order`, reset `page` to 1.
- **Types**:
  - `LibraryBooksQueryViewModel`, `BookStatus`, `SeriesSelectOptionViewModel`
- **Props**:
  - `query: LibraryBooksQueryViewModel`
  - `seriesOptions: SeriesSelectOptionViewModel[]`
  - `onQueryChange: (next: LibraryBooksQueryViewModel) => void`

---

### `BooksList` and `BookRow`
- **Purpose**: Show the books results list.
- **Main elements**:
  - Loading: skeleton rows (keep header/controls stable).
  - Empty: “No books found” with CTA “Add your first book”.
  - Populated: list of clickable rows/cards.
  - Each row shows:
    - Title, Author
    - Status badge
    - Progress: `current_page/total_pages` + computed %
    - Updated timestamp (and optionally created timestamp if available; API list returns only `updated_at`)
- **Handled events**:
  - Row click → navigate to `/books/:bookId`
- **Validation conditions**:
  - None beyond rendering constraints; progress percent must guard `total_pages > 0`.
- **Types**:
  - DTO: `BookListItemDto`
  - ViewModel: `BookListItemViewModel`
- **Props**:
  - `items: BookListItemViewModel[]`
  - `loading: boolean`
  - `onOpenBook: (id: string) => void`

---

### `SeriesTabPanel`
- **Purpose**: Render series list UI + controls, backed by `GET /api/v1/series`.
- **Main elements**:
  - `SeriesToolbar`
  - `InlineBanner`
  - `SeriesList` (skeleton/empty/rows)
  - `PaginationControls`
- **Handled events**:
  - `onSearchChange(q)`
  - `onSortChange(sort)`
  - `onOrderChange(order)`
  - `onPageChange(page)`
  - `onRowClick(seriesId)` → navigate to `/series/${seriesId}`
- **Validation conditions**:
  - `q`: optional; trimmed; length ≤ 50.
  - `sort`: `"created_at" | "updated_at" | "title"` (default `"updated_at"`).
  - `order`: `"asc" | "desc"` (default `"desc"`).
  - `page`: integer ≥ 1 (default 1).
  - `size`: integer 1..100 (default 10).
- **Types**:
  - DTOs: `SeriesListQueryDto`, `SeriesListItemDto`, `ListSeriesResponseDto`, `PaginationMetaDto`
  - ViewModels: `LibrarySeriesQueryViewModel`, `SeriesListItemViewModel`
- **Props**:
  - `query: LibrarySeriesQueryViewModel`
  - `onQueryChange: (next: LibrarySeriesQueryViewModel) => void`
  - `items: SeriesListItemViewModel[]`
  - `meta: PaginationMetaDto | null`
  - `loading: boolean`
  - `error: ApiErrorResponseDto["error"] | null`
  - `onRetry: () => void`

---

### `SeriesToolbar`
- **Purpose**: All Series tab list controls (URL-backed).
- **Main elements**:
  - Search input (`q`)
  - Sort select (`sort`)
  - Order toggle (`order`)
- **Handled events**:
  - Debounced search commit
  - Changing search/sort/order resets `page` to 1
- **Validation conditions**:
  - Enforce `q.length <= 50` client-side before updating URL.
- **Types**:
  - `LibrarySeriesQueryViewModel`
- **Props**:
  - `query: LibrarySeriesQueryViewModel`
  - `onQueryChange: (next: LibrarySeriesQueryViewModel) => void`

---

### `SeriesList` and `SeriesRow`
- **Purpose**: Show series results list.
- **Main elements**:
  - Loading skeleton
  - Empty state with CTA “Add your first series”
  - Rows/cards show: title, `book_count`, created/updated timestamps (API list includes `created_at` + `updated_at`)
- **Handled events**:
  - Row click → navigate to `/series/:seriesId`
- **Validation conditions**: none.
- **Types**:
  - DTO: `SeriesListItemDto`
  - ViewModel: `SeriesListItemViewModel`
- **Props**:
  - `items: SeriesListItemViewModel[]`
  - `loading: boolean`
  - `onOpenSeries: (id: string) => void`

---

### `PaginationControls` (shared)
- **Purpose**: Server pagination controls used by both tabs.
- **Main elements**:
  - Previous/Next buttons
  - Page indicator `current_page / total_pages`
  - Optional page size selector (10/20/50/100), default 20
- **Handled events**:
  - `onPageChange(page)` and `onSizeChange(size)`
- **Validation conditions**:
  - Disable prev on page 1; disable next on last page.
  - Clamp page between 1 and `total_pages` when applying URL updates.
- **Types**:
  - `PaginationMetaDto`
- **Props**:
  - `meta: PaginationMetaDto`
  - `onPageChange: (page: number) => void`
  - `onSizeChange?: (size: number) => void`

---

### `AddBookDialog`
- **Purpose**: Create book flow (US-005) via `POST /api/v1/books`.
- **Main elements**:
  - Dialog modal with form fields:
    - `title` (required)
    - `author` (required)
    - `total_pages` (required, integer > 0)
    - `status` (optional; default `"want_to_read"`)
    - `series_id` (optional; select; empty → null)
    - `series_order` (optional; integer ≥ 1; only show/enable if `series_id` set)
    - `cover_image_url` (optional; empty → null; must be valid URL if provided)
  - Submit/Cancel buttons; submit disabled while request in flight.
- **Handled events**:
  - `onOpenChange(open)`
  - `onSubmit(formState)`:
    - Client-validate.
    - POST `/api/v1/books`.
    - On success: call `onCreated(book)`; stay in list.
    - On validation error: show per-field messages from server `error.details` (Zod issues).
- **Validation conditions** (mirror `createBookBodySchema`):
  - `title`: `trim().min(1)`
  - `author`: `trim().min(1)`
  - `total_pages`: integer and `> 0`
  - `series_id`: UUID or null/undefined; normalize empty string to null
  - `series_order`: integer and `>= 1` if provided
  - `status`: enum `"want_to_read" | "reading" | "completed"` if provided
  - `cover_image_url`: valid URL if provided; normalize `""` and `null` to null
- **Types**:
  - DTOs: `CreateBookCommand`, `CreateBookResponseDto`, `BookDto`, `ApiErrorResponseDto`, `BookStatus`
  - ViewModels: `CreateBookFormViewModel`
- **Props**:
  - `open: boolean`
  - `onOpenChange: (open: boolean) => void`
  - `seriesOptions: SeriesSelectOptionViewModel[]`
  - `onCreated: (book: BookDto) => void`

---

### `AddSeriesDialog`
- **Purpose**: Create series flow (US-004) via `POST /api/v1/series`.
- **Main elements**:
  - Dialog modal with form fields:
    - `title` (required)
    - `description` (optional)
    - `cover_image_url` (optional; valid URL if provided; backend also allows empty string)
  - Submit/Cancel buttons.
- **Handled events**:
  - `onSubmit(formState)`:
    - Client-validate then POST.
    - On success: call `onCreated(series)`, stay in list.
    - On validation error: show per-field messages from server.
- **Validation conditions** (mirror `createSeriesBodySchema`):
  - `title`: `trim().min(1)`
  - `description`: optional string
  - `cover_image_url`: optional URL; allow empty string in UI, but prefer normalizing empty to `undefined` for clean payloads
- **Types**:
  - DTOs: `CreateSeriesCommand`, `CreateSeriesResponseDto`, `SeriesDto`, `ApiErrorResponseDto`
  - ViewModels: `CreateSeriesFormViewModel`
- **Props**:
  - `open: boolean`
  - `onOpenChange: (open: boolean) => void`
  - `onCreated: (series: SeriesDto) => void`

---

### `InlineBanner` (shared)
- **Purpose**: Consistent surfacing of retryable errors and rate limits without breaking layout.
- **Main elements**:
  - Message + optional details
  - Retry button
- **Handled events**:
  - `onRetry()`
- **Validation conditions**: none.
- **Types**:
  - `ApiErrorCode`, `ApiErrorDto`
- **Props**:
  - `error: ApiErrorDto`
  - `onRetry: () => void`

## 5. Types
Use existing DTOs from `src/types.ts` and add **view-only** types for query state and UI rendering.

### Existing DTOs (from `src/types.ts`)
- **Errors**:
  - `ApiErrorResponseDto`, `ApiErrorDto`, `ApiErrorCode`
- **Pagination**:
  - `PaginationMetaDto`, `SortOrderDto`
- **Series**:
  - `SeriesListItemDto`, `SeriesDto`
  - `SeriesListQueryDto`
  - `CreateSeriesCommand`, `CreateSeriesResponseDto`, `ListSeriesResponseDto`
- **Books**:
  - `BookListItemDto`, `BookDto`
  - `BooksListQueryDto`
  - `CreateBookCommand`, `CreateBookResponseDto`, `ListBooksResponseDto`
  - `BookStatus`

### New ViewModel types (add in e.g. `src/types.ts`)
#### `export type LibraryTabViewModel = "books" | "series"`

#### `export interface LibraryBooksQueryViewModel`
URL-backed query state for Books tab.
- `q?: string`
- `status?: BookStatus`
- `series_id?: string` (UUID)
- `sort: "updated_at" | "created_at" | "title" | "author" | "status"`
- `order: "asc" | "desc"`
- `page: number`
- `size: number`

#### `export interface LibrarySeriesQueryViewModel`
URL-backed query state for Series tab.
- `q?: string`
- `sort: "created_at" | "updated_at" | "title"`
- `order: "asc" | "desc"`
- `page: number`
- `size: number`

#### `export interface BookListItemViewModel`
UI-ready book row model derived from `BookListItemDto`.
- `id: string`
- `title: string`
- `author: string`
- `status: BookStatus`
- `progressLabel: string` (e.g. `"42 / 100"`)
- `progressPercent: number` (0..100; computed as `Math.round(current_page / total_pages * 100)`)
- `createdAtIso: string`
- `createdAtLabel: string`
- `updatedAtIso: string`
- `updatedAtLabel: string` (localized display string)
- `seriesId: string | null`

#### `export interface SeriesListItemViewModel`
UI-ready series row model derived from `SeriesListItemDto`.
- `id: string`
- `title: string`
- `bookCount: number`
- `createdAtIso: string`
- `createdAtLabel: string`
- `updatedAtIso: string`
- `updatedAtLabel: string`

#### `export interface SeriesSelectOptionViewModel`
For the Books tab series filter dropdown or add book series dropdown.
- `value: string` (series UUID)
- `label: string` (series title)

#### `export interface CreateBookFormViewModel`
Controlled form state for `AddBookDialog`.
- `title: string`
- `author: string`
- `total_pages: string` (keep as string in input; parse to integer on submit)
- `status?: BookStatus`
- `series_id: string` (empty string means “none”)
- `series_order: string` (empty string means unset)
- `cover_image_url: string` (empty means unset)

#### `export interface CreateSeriesFormViewModel`
Controlled form state for `AddSeriesDialog`.
- `title: string`
- `description: string`
- `cover_image_url: string`

## 6. State Management
Use **URL query params as the source of truth** for list controls, plus local React state for dialogs/forms.

### Required state
- **Routing/query state**:
  - `activeTab: LibraryTabViewModel` (derived from URL `tab`)
  - `booksQuery: LibraryBooksQueryViewModel` (derived from URL)
  - `seriesQuery: LibrarySeriesQueryViewModel` (derived from URL)
- **Data state**:
  - `books: BookListItemViewModel[]`, `booksMeta: PaginationMetaDto | null`, `booksLoading`, `booksError`
  - `series: SeriesListItemViewModel[]`, `seriesMeta: PaginationMetaDto | null`, `seriesLoading`, `seriesError`
  - `seriesOptions: SeriesSelectOptionViewModel[]` (for books filter + AddBookDialog)
- **UI state**:
  - `isAddBookOpen: boolean`
  - `isAddSeriesOpen: boolean`
  - `createBookForm: CreateBookFormViewModel`, `createBookSubmitting: boolean`, `createBookErrors: Record<string, string>`
  - `createSeriesForm: CreateSeriesFormViewModel`, `createSeriesSubmitting: boolean`, `createSeriesErrors: Record<string, string>`

### Custom hooks (recommended)
#### `useLibraryUrlState()`
- **Purpose**: Parse URL → `activeTab`, `booksQuery`, `seriesQuery`; provide setters that update URL via `history.pushState` and listen to `popstate`.
- **Key behavior**:
  - Defaults: `tab=books`, `page=1`, `size=10`, `order=desc`, and resource-specific `sort` defaults (`updated_at`).
  - When changing filters/search/sort/order, reset `page` to 1.

#### `usePreservedTabSearch(tabKey)`
- **Purpose**: Preserve each tab’s last-used query string when switching tabs.
- **Implementation idea**:
  - Store `sessionStorage["library:tab:books"] = location.search` (without `tab=` or with; but be consistent).
  - On tab switch:
    - Save current tab’s search.
    - Load next tab’s saved search (fallback to minimal defaults) and apply via URL update.

#### `useDebouncedValue(value, delayMs)`
- **Purpose**: Debounce `q` updates so typing doesn’t trigger a fetch per keystroke.
- **Usage**: Only commit to URL when the debounced value changes and is valid (≤ 50 chars).

## 7. API Integration
All API calls target the Astro endpoints:
- Base: `/api/v1`

### Fetch wrapper (recommended)
Create a small typed helper (e.g. `src/lib/api/client.ts`) that:
- Performs `fetch(...)` with JSON headers.
- On non-2xx:
  - Parses body as `ApiErrorResponseDto` and throws/returns structured `ApiErrorDto`.
- On 2xx:
  - Parses JSON into the expected response DTO type.

### Required API calls

#### Books list
- **Request**: `GET /api/v1/books`
- **Query** (from `LibraryBooksQueryViewModel`):
  - `page`, `size`, `q`, `status`, `series_id`, `sort`, `order`
- **Response**: `ListBooksResponseDto`
  - `books: BookListItemDto[]`
  - `meta: PaginationMetaDto`
- **Frontend actions**:
  - Convert `BookListItemDto[]` → `BookListItemViewModel[]` (compute progress + format dates).
  - Render skeleton while loading; render empty state if `books.length === 0`.

#### Series list
- **Request**: `GET /api/v1/series`
- **Query** (from `LibrarySeriesQueryViewModel`):
  - `page`, `size`, `q`, `sort`, `order`
- **Response**: `ListSeriesResponseDto`
  - `series: SeriesListItemDto[]`
  - `meta: PaginationMetaDto`
- **Frontend actions**:
  - Convert `SeriesListItemDto[]` → `SeriesListItemViewModel[]`.
  - Render skeleton while loading; render empty state if `series.length === 0`.

#### Series options for Books filter dropdown
- **Request**: `GET /api/v1/series?page=1&size=100&sort=title&order=asc`
- **Response**: `ListSeriesResponseDto`
- **Notes**:
  - API max `size=100`; if `meta.total_pages > 1`:
  - A “Type to search series” dropdown that uses `q` to narrow options

#### Create series
- **Request**: `POST /api/v1/series`
- **Body type**: `CreateSeriesCommand`
- **Response**: `CreateSeriesResponseDto` (`series: SeriesDto`)
- **Frontend actions**:
  - On success: close dialog, refetch series list and series options.

#### Create book
- **Request**: `POST /api/v1/books`
- **Body type**: `CreateBookCommand`
- **Response**: `CreateBookResponseDto` (`book: BookDto`)
- **Frontend actions**:
  - On success: close dialog, refetch books list (and optionally navigate to created book).

## 8. User Interactions

### Tab switching
- **Action**: User clicks “Books” / “Series”.
- **Outcome**:
  - URL updates to `?tab=...` plus restored last-used params for that tab.
  - Corresponding list fetch runs.
  - Keyboard accessibility: tablist supports arrow navigation and proper focus.

### Books tab controls
- **Search** (`q`):
  - Debounced; updates URL; resets page to 1; triggers fetch.
  - If `q.length > 50`, show inline error and do not commit.
- **Filter by status**:
  - Updates URL; resets page; triggers fetch.
- **Filter by series**:
  - Updates URL; resets page; triggers fetch.
- **Sort + order**:
  - Updates URL; resets page; triggers fetch.
- **Pagination**:
  - Updates `page`/`size` in URL; triggers fetch.

### Series tab controls
Same patterns as Books tab, without `status` and `series_id` filters.

### Create series (US-004)
- **Action**: “Add Series” opens dialog.
- **Outcome**:
  - On submit with valid fields → series created → appears in series list (after refetch) and becomes available in series filter dropdown.
  - Validation errors shown inline; server errors shown in banner/toast.

### Create book (US-005)
- **Action**: “Add Book” opens dialog.
- **Outcome**:
  - On submit with valid fields → book created → appears in books list (after refetch).
  - Optional series link supported via dropdown; invalid/missing series id should surface `NOT_FOUND` from API.

### Row navigation
- **Book row click** → `/books/:bookId`
- **Series row click** → `/series/:seriesId`

## 9. Conditions and Validation
This section lists **API-imposed conditions** and how the UI verifies them before sending requests or updating URL state.

### URL/query param validation (list endpoints)
Enforce and/or coerce before triggering fetch:
- **`page`**: integer ≥ 1 (default 1); if invalid, replace in URL with 1.
- **`size`**: integer 1..100 (default 10); if invalid, replace with 10.
- **`order`**: `"asc" | "desc"` (default `"desc"`).
- **`q`**: optional; trimmed; length ≤ 50; if too long, show inline error and do not commit.
- **Books tab only**:
  - `series_id`: optional UUID; if invalid, clear it from URL and show a non-blocking inline hint.
  - `status`: must be `"want_to_read" | "reading" | "completed"`; else clear.
  - `sort`: must be one of `"updated_at" | "created_at" | "title" | "author" | "status"`; else default `"updated_at"`.
- **Series tab only**:
  - `sort`: must be one of `"created_at" | "updated_at" | "title"`; else default `"updated_at"`.

### Create Series validation (`POST /series`)
- `title`: required, trimmed non-empty.
- `cover_image_url`: if provided, must be a valid URL (UI should allow blank, but normalize blank to `undefined`).

### Create Book validation (`POST /books`)
- `title`, `author`: required, trimmed non-empty.
- `total_pages`: integer > 0 (parse input; reject decimals and non-numeric).
- `series_id`: optional UUID or null; if dropdown “none”, send `null` or omit.
- `series_order`: optional integer ≥ 1; only send when series is selected.
- `status`: optional enum; default to `"want_to_read"` in UI for clarity.
- `cover_image_url`: optional valid URL; normalize empty to null/undefined.

## 10. Error Handling

### List fetch errors
Handle the API error shape `{ error: { code, message, details } }`:
- **`RATE_LIMITED` (429)**:
  - Show inline banner: “You’re doing that too often. Please wait and try again.”
  - Provide Retry button; optionally disable for a short backoff window.
- **`INTERNAL_ERROR` (500)**:
  - Show inline banner with Retry.
- **`VALIDATION_ERROR` (400)** (should be rare for list endpoints if URL validation is correct):
  - Clear invalid params and refetch, and/or show a banner “Some filters were invalid and were reset.”

### Create dialog errors
- **`VALIDATION_ERROR` (400)**:
  - Map `error.details` (Zod issues array) to field-level errors.
  - Keep dialog open and focus the first invalid field.
- **`NOT_FOUND` (404)** on `POST /books`:
  - Likely when `series_id` no longer exists; show a banner and clear the series selection.
- **`INTERNAL_ERROR` (500)**:
  - Show non-field banner inside dialog + Retry.

### Empty states
- Books tab empty:
  - If filters/search active → “No books match your filters.”
  - If no filters → “Add your first book.”
- Series tab empty:
  - Same pattern: “No series match…” vs “Add your first series.”

### Loading
- Use skeleton rows to avoid layout shift when `meta` changes.
- Keep controls visible and stable during loading; disable only the controls that would cause conflicting requests if needed (optional).

## 11. Implementation Steps
1. **Add the route**: create `src/pages/library.astro` under the existing `Layout.astro`, and mount a React `LibraryPage` island.
2. **Create the view folder**: add `src/components/library/` and scaffold `LibraryPage.tsx`, `LibraryTabs.tsx`, `BooksTabPanel.tsx`, `SeriesTabPanel.tsx`.
3. **Add a typed API client helper**: implement `src/lib/api/client.ts` with `getJson<T>()` and `postJson<TReq, TRes>()` that parses `ApiErrorResponseDto` for non-2xx.
4. **Implement URL state parsing + writing**:
   - Add `useLibraryUrlState()` to parse `tab` + per-tab query state with defaults.
   - Add `usePreservedTabSearch()` using `sessionStorage` to preserve each tab’s last-used params on tab switches.
5. **Implement data fetching hooks**:
   - `useBooksList(query)` → calls `GET /api/v1/books` and returns `{ items, meta, loading, error, refetch }`.
   - `useSeriesList(query)` → calls `GET /api/v1/series`.
   - `useSeriesOptions()` → calls `GET /api/v1/series?size=100&sort=title&order=asc`.
6. **Build toolbars and lists**:
   - Implement `BooksToolbar` and `SeriesToolbar` with debounced `q`.
   - Implement `BooksList` and `SeriesList` with skeleton + empty state + row navigation.
7. **Add pagination controls**:
   - Implement shared `PaginationControls` and wire it to URL state updates.
8. **Add Create dialogs**:
   - Implement `AddSeriesDialog` and `AddBookDialog` with controlled forms + client validation mirroring Zod rules.
   - Wire submit to POST endpoints; on success refetch lists and close dialog.
9. **Error + rate limit banners**:
   - Add `InlineBanner` and use it in panels and dialogs for retryable failures.
10. **Accessibility pass**:
   - Ensure tab ARIA pattern (or use shadcn/Radix Tabs).
   - Dialog focus trap + restore focus to CTA button on close.
   - Ensure rows are keyboard-activatable (button/link semantics) and have visible focus styles.
11. **Polish**:
   - Date formatting consistency.
   - Progress formatting (`current_page/total_pages`, percent).
   - Confirm that switching tabs preserves each tab’s last-used filters/search/sort/page.

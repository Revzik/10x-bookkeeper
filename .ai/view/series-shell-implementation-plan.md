# View Implementation Plan — Series Detail (Workspace Shell)

## 1. Overview
The **Series Detail (Workspace Shell)** view is the primary working surface for a single series. It allows a user to:
- View series metadata (title, optional description, optional cover image, book count, timestamps).
- Manage series metadata (edit series fields).
- Perform a destructive action (delete series) with an explicit **cascade delete** toggle.
- Switch between two sticky tabs: **Books** (books in this series) and **Ask** (series-scoped Q&A; **stubbed** in this plan per scope).

This view must be **mobile-first**, with a **sticky header** and **sticky tab bar** so the user can always reach key actions and navigation while content scrolls underneath.

## 2. View Routing
- **Route**: `/series/:seriesId`
- **Query params**:
  - `tab=books|ask` (default `books`)
  - (Optional, recommended) Books tab list params (namespaced to avoid collisions with Ask tab later):
    - `books_q`, `books_sort`, `books_order`, `books_page`, `books_size`, `books_status`

**Astro page file**:
- Create `src/pages/series/[seriesId].astro` to mount a React island and pass `seriesId` from `Astro.params.seriesId`.

## 3. Component Structure
High-level component tree (React island mounted from `src/pages/series/[seriesId].astro`):

```
SeriesDetailPage
├─ SeriesStickyHeader
│  ├─ SeriesCover (optional)
│  ├─ SeriesHeaderMeta
│  └─ SeriesActionsMenu
│     ├─ EditSeriesDialog (modal)
│     └─ DeleteSeriesDialog (confirmation modal)
├─ SeriesTabsBar (sticky)
│  ├─ TabTrigger: Books
│  └─ TabTrigger: Ask
└─ SeriesTabContent
   ├─ SeriesBooksTabPanel
   └─ SeriesAskTabPanel (stub/placeholder; implemented in separate plan)
```

## 4. Component Details

### `src/pages/series/[seriesId].astro` (Astro page)
- **Purpose**: Route entrypoint for `/series/:seriesId`; provides layout and mounts the React view.
- **Main elements**:
  - Uses `src/layouts/Layout.astro`.
  - Mounts `SeriesDetailPage` with `client:only="react"` (consistent with existing `/library`).
  - Passes `seriesId` prop (`Astro.params.seriesId`) into React.
- **Handled events**: none (delegated to React).
- **Validation conditions**:
  - Ensure `seriesId` exists; if missing, render a minimal error boundary message (should be impossible via route).
- **Types**: none.
- **Props**: none.

---

### `SeriesDetailPage` (React root)
- **Purpose**: Orchestrates URL tab state, fetches the series, fetches the books list for the Books tab, and owns dialog open/close state.
- **Main elements**:
  - `SeriesStickyHeader` (sticky)
  - `SeriesTabsBar` (sticky)
  - Conditional tab panels (`Books` / `Ask`)
- **Handled events**:
  - `onTabChange(nextTab)` updates URL `tab` and switches panels.
  - `onRetrySeries()` triggers refetch of series data.
  - `onEditedSeries()` refetches series data (and optionally refetch books list if `book_count` might change indirectly later).
  - `onDeletedSeries()` navigates user back to Library (`/library?tab=series`) after successful delete.
- **Validation conditions**:
  - Parse/validate `tab` from URL; fallback to `"books"`.
  - Treat `seriesId` as opaque string but assume it is a UUID; if API returns `VALIDATION_ERROR`, show an “Invalid series” not-found-like state.
- **Types**:
  - DTOs: `GetSeriesResponseDto`, `SeriesDto`, `ApiErrorResponseDto`, `ApiErrorDto`
  - ViewModels: `SeriesTabViewModel`, `SeriesHeaderViewModel`, `SeriesDetailStateViewModel`
- **Props**:
  - `seriesId: string`

---

### `SeriesStickyHeader`
- **Purpose**: Displays series identity + metadata at the top of the workspace with global actions.
- **Main elements**:
  - Root container with `position: sticky` (e.g. `sticky top-0 z-20`) and background to avoid content bleed.
  - Cover image (optional), title, description (optional), book count, timestamps.
  - Actions menu/button group: **Edit series**, **Delete series**.
  - Responsive behavior:
    - On small screens, keep a compact header row always visible (title + actions).
    - Expand/collapse secondary metadata (description/timestamps) via a “Details” toggle button (optional but recommended for the “collapsible on small screens” requirement).
- **Handled events**:
  - `onOpenEdit()` opens `EditSeriesDialog`.
  - `onOpenDelete()` opens `DeleteSeriesDialog`.
  - `onToggleCollapsed()` for mobile collapse behavior (if implemented).
- **Validation conditions**:
  - None beyond rendering:
    - If `cover_image_url` is present but image fails to load, fall back to a placeholder.
    - If `description` is null/empty, do not render the description block.
- **Types**:
  - ViewModels: `SeriesHeaderViewModel`
- **Props**:
  - `series: SeriesHeaderViewModel`
  - `onEdit: () => void`
  - `onDelete: () => void`

---

### `SeriesActionsMenu`
- **Purpose**: Accessible “More” menu for global series actions in the header.
- **Main elements**:
  - Trigger button (e.g. “Actions” / icon button).
  - Menu items:
    - “Edit series”
    - “Delete series”
- **Handled events**:
  - `onSelectEdit`
  - `onSelectDelete`
- **Validation conditions**: none.
- **Types**: none.
- **Props**:
  - `onEdit: () => void`
  - `onDelete: () => void`
- **Notes**:
  - If `DropdownMenu` is not currently available in `src/components/ui/`, add shadcn/ui `dropdown-menu.tsx` (Radix-based) as part of implementation.

---

### `SeriesTabsBar`
- **Purpose**: Sticky tab bar for “Books / Ask” that remains reachable on mobile.
- **Main elements**:
  - `Tabs` component (existing shadcn `src/components/ui/tabs.tsx`) with triggers.
  - Sticky positioning directly beneath the sticky header (e.g. `sticky top-[headerHeight] z-10`).
- **Handled events**:
  - `onValueChange(tab)` updates URL and switches panel.
- **Validation conditions**:
  - Only allow `"books"` or `"ask"`; unknown -> `"books"`.
- **Types**:
  - `SeriesTabViewModel`
- **Props**:
  - `activeTab: SeriesTabViewModel`
  - `onTabChange: (tab: SeriesTabViewModel) => void`

---

### `SeriesBooksTabPanel`
- **Purpose**: Placeholder for display of books within a series.
- **Main elements**:
  - Informational message - "To be implemented"
- **Handled events**: none.
- **Validation conditions**: none.
- **Types**: none (for now).
- **Props**:
  - `seriesId: string` (keep for future list)

---

### `SeriesAskTabPanel` (stub)
- **Purpose**: Placeholder for series-scoped Q&A UI (US-009–US-011 are planned separately).
- **Main elements**:
  - Informational message - "To be implemented"
- **Handled events**: none.
- **Validation conditions**: none.
- **Types**: none (for now).
- **Props**:
  - `seriesId: string` (keep for future AI scope wiring)

---

### `EditSeriesDialog`
- **Purpose**: Edit series fields via `PATCH /api/v1/series/:seriesId`.
- **Main elements**:
  - Dialog modal (shadcn `Dialog`) with form fields:
    - `title` (required)
    - `description` (optional; allow empty -> send `null` to clear)
    - `cover_image_url` (optional; allow empty -> send `null` to clear)
  - Submit/Cancel buttons; submit disabled while request is in-flight.
  - Inline field errors + general error area.
- **Handled events**:
  - `onOpenChange(open)`
  - `onSubmit()`:
    - Client-validate
    - Build `UpdateSeriesCommand`
    - Call PATCH
    - On success: close dialog, call `onUpdated(series)` to refresh header
    - On validation error: map server `error.details` to fields
- **Validation conditions** (mirror endpoint behavior + backend zod schemas):
  - **Title**:
    - Required in UI and must be `trim().length > 0`
    - If user somehow submits empty title, prevent submit and show `Title is required`
  - **cover_image_url**:
    - If non-empty string, validate as URL (HTML `type="url"` + additional guard).
    - If empty, send `null` to clear on server.
  - **description**:
    - If empty, send `null` to clear on server.
- **Types**:
  - DTOs: `UpdateSeriesCommand`, `UpdateSeriesResponseDto`, `SeriesDto`, `ApiErrorResponseDto`
  - ViewModels: `UpdateSeriesFormViewModel`
- **Props**:
  - `open: boolean`
  - `onOpenChange: (open: boolean) => void`
  - `series: SeriesDto` (or `SeriesHeaderViewModel` plus raw fields)
  - `onUpdated: (series: SeriesDto) => void`

---

### `DeleteSeriesDialog`
- **Purpose**: Confirm and execute series deletion via `DELETE /api/v1/series/:seriesId` with optional `?cascade=true`.
- **Main elements**:
  - Dialog modal with:
    - Clear warning text explaining:
      - Default behavior: series deleted, books remain but are unlinked (`series_id` set to null).
      - Cascade behavior: deletes all books, chapters, and notes in the series (dangerous, cannot be undone).
    - Checkbox/switch: “Also delete all books, chapters, and notes (cascade)” (default off).
  - Cancel / Delete buttons; Delete button uses destructive styling.
- **Handled events**:
  - `onToggleCascade(enabled)`
  - `onConfirmDelete()` calls DELETE with query param:
    - If `cascade` true: `DELETE /api/v1/series/:seriesId?cascade=true`
    - Else: `DELETE /api/v1/series/:seriesId`
  - `onDeleted()` navigates back to `/library?tab=series`.
- **Types**:
  - DTOs: `ApiErrorResponseDto`
  - ViewModels: `DeleteSeriesConfirmViewModel`
- **Props**:
  - `open: boolean`
  - `onOpenChange: (open: boolean) => void`
  - `seriesId: string`
  - `seriesTitle: string`
  - `onDeleted: () => void`

---

### `SeriesNotFoundState`
- **Purpose**: Dedicated state for `404 NOT_FOUND` when loading the series.
- **Main elements**:
  - Title: “Series not found”
  - Copy explaining it may have been deleted or the link is wrong
  - Primary action button: “Back to Library” (navigates to `/library?tab=series`)
- **Handled events**:
  - `onBackToLibrary()`
- **Validation conditions**: none.
- **Types**: none.
- **Props**: none.

## 5. Types
Use existing DTOs from `src/types.ts` where possible and add **Series Detail view-specific ViewModels** (prefer adding to `src/types.ts` under a new “VIEW MODELS (Series Detail)” section).

### Existing DTOs (from `src/types.ts`)
- **Series**:
  - `SeriesDto`
  - `GetSeriesResponseDto`
  - `UpdateSeriesCommand`
  - `UpdateSeriesResponseDto`
- **Errors**:
  - `ApiErrorDto`
  - `ApiErrorResponseDto`

### New ViewModel types
#### `export type SeriesTabViewModel = "books" | "ask"`

#### `export interface SeriesHeaderViewModel`
UI-ready series header model derived from `SeriesDto`.
- `id: string`
- `title: string`
- `description: string | null`
- `coverImageUrl: string | null`
- `bookCount: number`
- `createdAtIso: string`
- `createdAtLabel: string`
- `updatedAtIso: string`
- `updatedAtLabel: string`

#### `export interface SeriesBooksQueryViewModel`
URL-backed state for books list **within a series** (namespaced params recommended).
- `q?: string` (maps to `books_q`)
- `status?: BookStatus` (maps to `books_status`)
- `sort: "updated_at" | "created_at" | "title" | "author" | "status"` (maps to `books_sort`)
- `order: "asc" | "desc"` (maps to `books_order`)
- `page: number` (maps to `books_page`)
- `size: number` (maps to `books_size`)

#### `export interface UpdateSeriesFormViewModel`
Controlled form state for `EditSeriesDialog`.
- `title: string`
- `description: string` (empty string means “clear”)
- `cover_image_url: string` (empty string means “clear”)

#### `export interface DeleteSeriesConfirmViewModel`
Controlled state for `DeleteSeriesDialog`.
- `cascade: boolean`
- `confirmText: string` (optional, only if implementing type-to-confirm)

#### `export interface SeriesDetailStateViewModel`
Optional aggregator to keep the root component simple (recommended).
- `series: SeriesHeaderViewModel | null`
- `seriesLoading: boolean`
- `seriesError: ApiErrorDto | null`
- `seriesNotFound: boolean`
- `activeTab: SeriesTabViewModel`
- `booksQuery: SeriesBooksQueryViewModel`

## 6. State Management
Use **URL query params as the source of truth** for the active tab (and optionally Books tab query state), plus local React state for dialogs/forms.

### Required state (in `SeriesDetailPage`)
- **Routing state**:
  - `activeTab: SeriesTabViewModel` (from URL `tab`)
  - `booksQuery: SeriesBooksQueryViewModel` (from URL, namespaced; optional but recommended)
- **Series fetch state**:
  - `series: SeriesDto | null`
  - `seriesLoading: boolean`
  - `seriesError: ApiErrorDto | null`
  - `seriesNotFound: boolean` (true when `error.code === "NOT_FOUND"` / HTTP 404)
- **Books list state** (Books tab only):
  - Reuse existing `useBooksList(...)` pattern, but with a series-specific query type/hook (see below).
- **UI state**:
  - `isEditOpen: boolean`
  - `isDeleteOpen: boolean`

### Custom hooks (recommended)
#### `useSeriesUrlState()`
- **Purpose**: Parse URL query params into `activeTab` + `booksQuery`, and provide setters that update URL via `history.pushState` and listen to `popstate`.
- **Key behavior**:
  - Default `tab=books`.
  - If implementing namespaced books params, only read/write keys starting with `books_`.
  - When changing any filter/search/sort/order, reset `books_page` to 1.

#### `useSeriesById(seriesId)`
- **Purpose**: Fetch the series header data via `GET /api/v1/series/:seriesId`.
- **Returns**: `{ series, loading, error, notFound, refetch }`
- **Error mapping**:
  - 404 -> `notFound = true`, `error` may still hold `{ code: "NOT_FOUND", ... }`.
  - Other errors -> `error` for `InlineBanner`.

## 7. API Integration
All API calls target the Astro endpoints with base `/api/v1` and use `src/lib/api/client.ts` (`apiClient`) for typed fetch + error parsing.

### Required API calls (primary)
#### Fetch series
- **Request**: `GET /api/v1/series/:seriesId`
- **Response type**: `GetSeriesResponseDto`
- **Frontend action**:
  - Transform `SeriesDto` to `SeriesHeaderViewModel` (format dates, map cover URL field name).

#### Update series
- **Request**: `PATCH /api/v1/series/:seriesId`
- **Request type**: `UpdateSeriesCommand`
  - Send only fields that changed (preferred) or always send `title` plus nullable clears (acceptable).
  - Use `null` explicitly to clear `description` / `cover_image_url`.
- **Response type**: `UpdateSeriesResponseDto`
- **Frontend action**:
  - Update header state immediately from response and close dialog.

#### Delete series
- **Request**:
  - Default: `DELETE /api/v1/series/:seriesId`
  - Cascade: `DELETE /api/v1/series/:seriesId?cascade=true`
- **Response**: `204 No Content`
- **Frontend action**:
  - On success, navigate to `/library?tab=series`.

## 8. User Interactions

### Load view
- **Action**: User navigates to `/series/:seriesId`.
- **Outcome**:
  - Series header loads and renders.
  - Default tab is Books; Books list loads.

### Switch tabs
- **Action**: User clicks “Books” / “Ask”.
- **Outcome**:
  - URL updates `tab=...`.
  - Books tab: placeholder state is shown (until implemented in follow-up plan).
  - Ask tab: placeholder state is shown (until implemented in follow-up plan).

### Edit series
- **Action**: User opens “Edit series”, updates fields, submits.
- **Outcome**:
  - Client validation runs.
  - PATCH request executes.
  - On success: dialog closes, header updates to reflect new values.
  - On validation error: field errors display; dialog remains open.

### Delete series (non-cascade)
- **Action**: User opens “Delete series”, leaves cascade off, confirms.
- **Outcome**:
  - DELETE executes without query params.
  - On success: user is redirected to `/library?tab=series`.

### Delete series (cascade)
- **Action**: User opens "delete series", selects cascade, confirms.
- **Outcome**:
  - DELETE executes with `?cascade=true`.
  - On success: redirect to library.

### Not found
- **Action**: User navigates to a non-existent `seriesId` or deleted series.
- **Outcome**:
  - Show `SeriesNotFoundState` with “Back to Library”.

## 9. Conditions and Validation
This section lists **API-imposed conditions** and how the UI verifies them.

### Series fetch (`GET /series/:seriesId`)
- Handle `404 NOT_FOUND` as a dedicated “not found” state (not a generic error banner).
- If server returns `VALIDATION_ERROR` for the path param, show a similar “Invalid series link” not-found-like state (still with “Back to Library”).

### Series update (`PATCH /series/:seriesId`)
- If `title` is provided, API rejects empty title (`400 VALIDATION_ERROR`).
  - UI must enforce `title.trim().length > 0` before submit.
- Clearing optional fields:
  - `description`: if user clears the field, send `description: null`.
  - `cover_image_url`: if user clears the field, send `cover_image_url: null`.
- `cover_image_url` (when provided and non-empty) must be a valid URL:
  - Validate client-side and show inline error before submit.

### Series delete (`DELETE /series/:seriesId`)
- `cascade` query param must be boolean; UI must only send `cascade=true` or omit it.
- Destructive UX requirements:
  - Explain default non-cascade behavior explicitly.
  - Provide explicit cascade toggle.
  - Recommended extra confirmation when cascade is enabled.

## 10. Error Handling

### Series fetch errors
- **404 NOT_FOUND**: render `SeriesNotFoundState`.
- **RATE_LIMITED / INTERNAL_ERROR**: render `InlineBanner` under the sticky header (or at top of content) with Retry.
- **VALIDATION_ERROR**: treat as invalid link; show not-found-like state.

### Edit series errors
- **VALIDATION_ERROR**:
  - Map `error.details` (Zod issues) to field errors by `path`.
  - Focus the first invalid field and keep dialog open.
- **NOT_FOUND**:
  - Show “This series no longer exists” and close dialog; render not-found state.
- **INTERNAL_ERROR / RATE_LIMITED**:
  - Show a general error block in the dialog and allow retry.

### Delete series errors
- **NOT_FOUND**:
  - Assume it was already deleted; redirect back to `/library?tab=series` and optionally show a toast/banner.
- **INTERNAL_ERROR / RATE_LIMITED**:
  - Keep dialog open and show an error block; allow retry.

## 11. Implementation Steps
1. **Add routing page**: create `src/pages/series/[seriesId].astro` mounting `SeriesDetailPage` with `client:only="react"` and pass `seriesId` as a prop.
2. **Create view folder + scaffolding**: add `src/components/series/` with `SeriesDetailPage.tsx`, `SeriesStickyHeader.tsx`, `SeriesTabsBar.tsx`, `SeriesBooksTabPanel.tsx`, `SeriesAskTabPanel.tsx`, `SeriesNotFoundState.tsx`.
3. **Add URL state hook**: implement `useSeriesUrlState()` to parse and update `tab` (and optionally namespaced `books_*` query params), including `popstate` support.
4. **Implement series fetch hook**: create `useSeriesById(seriesId)` using `apiClient.getJson<GetSeriesResponseDto>(\`/series/${seriesId}\`)`, mapping errors into `{ error, notFound }`.
5. **Implement series header ViewModel**: add `SeriesHeaderViewModel` and a transformer (e.g. `src/components/series/transformers.ts`) to format timestamps and normalize cover URL naming.
6. **Build sticky header**:
   - Implement `SeriesStickyHeader` with responsive collapse behavior on small screens.
   - Implement `SeriesActionsMenu` (add `DropdownMenu` UI component if missing).
7. **Implement edit dialog**: create `EditSeriesDialog` mirroring patterns from `AddSeriesDialog` (client validation + mapping `error.details`), and wire to PATCH.
8. **Implement delete confirmation dialog**:
   - Create `DeleteSeriesDialog` with cascade toggle + warning copy.
   - Wire to DELETE endpoint (with optional `?cascade=true`) and redirect to library on success.
9. **Implement Books tab placeholder**: create a minimal `SeriesBooksTabPanel`
10. **Implement Ask tab placeholder**: create a minimal `SeriesAskTabPanel` stub that accepts `seriesId` and displays a placeholder state.
11. **Final UX/accessibility pass**:
   - Confirm sticky header + sticky tabs work on small screens (tabs always reachable).
   - Ensure keyboard nav for tabs and action menu; dialogs trap focus and restore focus on close.
   - Ensure “Not found” state has a clear “Back to Library” action.


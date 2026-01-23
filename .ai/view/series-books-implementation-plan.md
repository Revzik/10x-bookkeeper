# View Implementation Plan — Series Detail (Books Tab)

## 1. Overview
The **Series Detail — Books Tab** view is the “Books” panel inside the Series Detail workspace. It lets the user:
- **Review** all books belonging to the current series (ordered list with title/author/status/progress/updated time).
- **Navigate** into Book Detail for a selected book.
- **Optionally reorder** books within the series via an explicit **Edit mode** with:
  - Drag handles (pointer-driven reordering)
  - Keyboard-accessible reordering controls (“Move up/down” per row)
  - **Unsaved changes** (dirty) indicator, with **Save** and **Cancel/Discard**
  - **Navigation protection** while dirty (confirm before leaving / refreshing)

This plan is designed to reuse existing **Library Books** patterns/components where possible (toolbar/list/pagination styling, error banner, DTO → ViewModel transforms), while adding series-specific reorder behavior.

---

## 2. View Routing
This tab is rendered inside the existing Series Detail page.

- **Primary route**: `/series/:seriesId`
- **Tab selection**: `?tab=books` (default)
- **No books query params**: this tab always loads and shows **all** books for the series.

---

## 3. Component Structure
High-level component tree (Books tab only; within existing `SeriesDetailPage`):

```
SeriesDetailPage
└─ SeriesTabContent
   └─ SeriesBooksTabPanel
      ├─ SeriesBooksHeaderRow
      │  └─ ReorderModeToggle + (when reordering) DirtyIndicator + Save/Discard buttons
      ├─ InlineBanner (error)
      ├─ SeriesBooksList
      │  └─ SeriesBookRow (reuses BookRow visuals + adds reorder affordances)
```

---

## 4. Component Details

### `SeriesBooksTabPanel`
- **Purpose**: Orchestrates fetching **all** series books, rendering the list, and owning reorder mode state (dirty, draft order, save/discard).
- **Main elements**:
  - Container: `<div className="space-y-4">`
  - `SeriesBooksHeaderRow`
  - Error banner: reuse `InlineBanner` (`src/components/library/InlineBanner.tsx`)
  - List: `SeriesBooksList`
- **Handled events**:
  - `onOpenBook(bookId)` → navigates to `/books/:bookId` (same as Library Books tab)
  - `onEnterReorderMode()` / `onExitReorderMode()`
  - `onReorderDragEnd(activeId, overId)` (pointer DnD)
  - `onMoveUp(bookId)` / `onMoveDown(bookId)` (keyboard+button controls)
  - `onSaveReorder()` / `onDiscardReorder()`
- **Validation conditions (UI-level, aligned to API and UX constraints)**:
  - **Save** enabled only when:
    - `isReordering === true`
    - `isDirty === true` (draft order differs from server order snapshot)
    - `isSaving === false`
  - **Discard**:
    - Always available in edit mode; if dirty, it restores the original server order snapshot.
- **Types**:
  - DTOs: `ListBooksResponseDto`, `UpdateBookCommand`, `UpdateBookResponseDto`, `ApiErrorDto`, `PaginationMetaDto`
  - Existing ViewModels: `BookListItemViewModel`
  - New ViewModels (this plan): `SeriesBookRowViewModel`, `SeriesBooksReorderStateViewModel`
- **Props (component interface)**:
  - `seriesId: string`

---

### `SeriesBooksHeaderRow`
- **Purpose**: Minimal header row for the tab: provides the reorder entry point and save/discard actions.
- **Main elements**:
  - Reorder mode controls:
    - `ReorderModeToggle` button (label “Reorder” when off; label “Done” when on)
    - Dirty indicator text (e.g. “Unsaved changes”)
    - Save button (primary)
    - Discard button (secondary/destructive-ish label: “Discard”)
- **Handled events**:
  - Reorder:
    - `onToggleEdit()`
    - `onSave()`
    - `onDiscard()`
- **Validation conditions**:
  - When `isReordering === true`, Save is enabled only if dirty and not saving.
- **Types**:
  - Uses reorder state flags: `isReordering`, `isDirty`, `isSaving`
- **Props**:
  - `isReordering: boolean`
  - `isDirty: boolean`
  - `isSaving: boolean`
  - `onToggleEdit: () => void`
  - `onSave: () => void`
  - `onDiscard: () => void`

---

### `SeriesBooksList`
- **Purpose**: Renders the books list with appropriate loading/empty states and supports reorder interactions in edit mode.
- **Main elements**:
  - Loading: reuse skeleton pattern from `src/components/library/BooksList.tsx`
  - Empty: “No books found in this series”
  - Non-edit mode: simple list rendering (can reuse `BookRow` directly)
  - Edit mode: sortable list surface with:
    - Drag handle per row
    - Move up/down controls per row
- **Handled events**:
  - `onOpenBook(bookId)` (non-edit mode)
  - `onDragEnd(...)` (edit mode)
  - `onMoveUp(bookId)`, `onMoveDown(bookId)` (edit mode)
- **Validation conditions**:
  - In edit mode:
    - Row click should **not navigate** (to prevent accidental leave); instead, focus the row or the controls.
    - Disable move up on first item; disable move down on last item.
- **Types**:
  - `SeriesBookRowViewModel[]`
  - `BookListItemViewModel[]` (if reusing `BookRow` in non-edit mode)
- **Props**:
  - `items: SeriesBookRowViewModel[]`
  - `loading: boolean`
  - `isEditing: boolean`
  - `onOpenBook: (id: string) => void`
  - `onDragEnd: (activeId: string, overId: string) => void`
  - `onMoveUp: (id: string) => void`
  - `onMoveDown: (id: string) => void`

---

### `SeriesBookRow` (optional wrapper)
- **Purpose**: Provide a single row implementation that can render both view and edit affordances consistently.
- **Main elements**:
  - Base visuals: reuse the layout of `src/components/library/BookRow.tsx` (Card with title/author/status/progress/updated)
  - Edit-only UI:
    - Drag handle button (with `aria-label="Drag to reorder"`)
    - Move up button (`aria-label="Move up"`)
    - Move down button (`aria-label="Move down"`)
    - Optional “Position X of N” SR-only text for accessibility
- **Handled events**:
  - `onClick` (view mode only)
  - `onKeyDown`:
    - In view mode: Enter/Space opens
    - In edit mode: ArrowUp/ArrowDown optionally trigger move actions when row is focused (bonus; still keep explicit buttons)
- **Validation conditions**:
  - Buttons disabled at bounds.
- **Types**:
  - `SeriesBookRowViewModel`
- **Props**:
  - `item: SeriesBookRowViewModel`
  - `isEditing: boolean`
  - `onOpen: (id: string) => void`
  - `onMoveUp: (id: string) => void`
  - `onMoveDown: (id: string) => void`

---

### `InlineBanner` (reuse)
- **Purpose**: Display API errors and allow retry.
- **Usage**:
  - Show above the list when list fetch fails.
  - Show a separate banner or inline alert when reorder save fails (see Error Handling).

---

## 5. Types
Use existing DTOs from `src/types.ts` and introduce minimal view-specific ViewModels for reorder state.

### Existing DTOs / types (already in `src/types.ts`)
- **Books list**:
  - `ListBooksResponseDto`
  - `BookListItemDto`
  - `BookListItemViewModel` (from library transformers)
- **Update book**:
  - `UpdateBookCommand`
  - `UpdateBookResponseDto`
- **Errors**:
  - `ApiErrorDto`
  - `ApiErrorResponseDto`

### New ViewModel types (add under “VIEW MODELS (Series Detail View)” in `src/types.ts` or colocate in a `types.ts` near the Series components)

#### `SeriesBookRowViewModel`
UI-ready row model for the Series Books list, derived from `BookListItemViewModel` plus reorder metadata.
- `id: string`
- `title: string`
- `author: string`
- `status: BookStatus`
- `progressLabel: string`
- `progressPercent: number`
- `updatedAtIso: string`
- `updatedAtLabel: string`
- `seriesId: string | null`
- `position: number` (1-based position in the current rendered order)
- `isMoveUpDisabled: boolean`
- `isMoveDownDisabled: boolean`

#### `SeriesBooksReorderStateViewModel`
Aggregates reorder state owned by `SeriesBooksTabPanel` (or a dedicated hook).
- `isEditing: boolean`
- `isDirty: boolean`
- `isSaving: boolean`
- `serverOrderIds: string[]` (snapshot when entering edit mode or after successful save)
- `draftOrderIds: string[]` (current local draft)
- `saveError: ApiErrorDto | null` (optional; separate from list fetch error)

---

## 6. State Management

### Source of truth
- **URL query state**: Only `tab=books|ask` is needed for Series Detail; the Books tab does not require URL-backed query params.
- **Local UI state** in `SeriesBooksTabPanel`:
  - Edit/reorder mode: `isEditing`
  - Reorder snapshot: `serverOrderIds`
  - Draft order: `draftOrderIds`
  - Save status: `isSaving`
  - Save error: `saveError`

### Recommended hooks

#### `useSeriesBooksList(seriesId)`
- **Purpose**: Fetch **all** series books using the existing `/books` list endpoint filtered by `series_id`.
- **Implementation approach**: Mirror `src/components/library/hooks/useBooksList.ts`, but:
  - Always pass `series_id: seriesId`
  - Do not pass pagination/search/filter/sort params
  - Return `BookListItemViewModel[]` (meta is not required yet)
- **Return shape**:
  - `{ items, loading, error, refetch }`

#### `useSeriesBooksReorder(items, isEditing)`
- **Purpose**: Encapsulate reorder draft + dirty computation + move helpers.
- **Key behavior**:
  - On entering edit mode:
    - Snapshot `serverOrderIds = items.map(i => i.id)`
    - Set `draftOrderIds = serverOrderIds`
  - Dirty detection:
    - `isDirty = !arraysEqual(serverOrderIds, draftOrderIds)`
  - Provide:
    - `moveUp(id)`, `moveDown(id)`
    - `setDraftOrderIds(nextIds)` (from DnD)
    - `discard()` → restore `draftOrderIds = serverOrderIds`, exit edit mode
    - `commitSave()` (delegated to panel for API calls)

#### `useUnsavedChangesProtection(isDirty, opts)`
- **Purpose**: Prevent accidental navigation loss while dirty.
- **Suggested behaviors in this codebase (no router)**:
  - Add `beforeunload` listener to show the native confirm on refresh/close.
  - For in-app navigations controlled by code (tab changes, opening a book, clicking header actions), wrap handlers:
    - If dirty, `window.confirm("You have unsaved changes…")` before continuing.
  - For browser back/forward:
    - Listen to `popstate`; if dirty, re-push the current URL state and show confirm.
    - If user confirms leaving, temporarily disable the guard and re-trigger the navigation.

---

## 7. API Integration

### 7.1 List books in series
- **Endpoint**: `GET /api/v1/books`
- **Request params**:
  - `series_id = seriesId` (required for this view)
  - No other params (for now)
- **Request type**: `BooksListQueryDto` (server)
- **Response type**: `ListBooksResponseDto`

**Important API alignment note (Series order)**:
- The view requirement expects series-scoped lists to be **sorted by `series_order`** when available.
- The current backend `listBooks()` implementation orders only by `updated_at|created_at|title|author|status` and does not expose `series_order` in list responses.
- To support “default series ordering” cleanly, one of these backend changes will be needed:
  1. **Add `sort=series_order`** to `listBooksQuerySchema` + `listBooks()` allowed sorts and order by `series_order` (nulls last), then fallback stable sort (e.g. title).
  2. If `series_id` is present and `sort` is omitted, **default sort to `series_order`**.

Frontend strategy in this plan:
- Always display the list in **series order** (ascending).
- If the backend does not yet support sorting by `series_order`, perform a client-side sort:
  - Primary: `series_order` (nulls last)
  - Secondary: `title` (ascending) and/or `updated_at` (descending) as a stable fallback

### 7.2 Persist reorder
- **Endpoint**: `PATCH /api/v1/books/:bookId`
- **Request type**: `UpdateBookCommand`
- **Response type**: `UpdateBookResponseDto`
- **Frontend behavior**:
  - On Save, compute the new positions from `draftOrderIds`.
  - Submit PATCH calls for books whose position changed.
  - Recommended payload:
    - `{ series_order: newIndex }` (1-based human order).

**Concurrency**:
- Send PATCH requests **sequentially** to reduce load and make error handling deterministic, OR in small parallel batches (2–4) if needed.

---

## 8. User Interactions

### 8.1 View books
- **Action**: User opens Series Detail and is on `tab=books`.
- **Outcome**:
  - Books list loads with `series_id = seriesId`.
  - Each row shows title, author, status badge, progress, updated time.

### 8.2 Open a book
- **Action**: Click a row (or Enter/Space with focus) in view mode.
- **Outcome**: Navigate to `/books/:bookId`.
- **If dirty (edit mode)**: show confirm first; if user cancels, do not navigate.

### 8.3 Enter reorder mode
- **Action**: Click `ReorderModeToggle` (“Reorder”).
- **Outcome**:
  - Toolbar switches to edit controls (Save/Discard + dirty indicator).
  - Drag handles and move up/down controls appear.

### 8.4 Reorder (pointer)
- **Action**: Drag a book using the handle and drop into a new position.
- **Outcome**:
  - Local `draftOrderIds` updates.
  - Dirty indicator appears.

### 8.5 Reorder (keyboard)
- **Action**: Use “Move up” / “Move down” buttons for a row.
- **Outcome**:
  - Local order updates.
  - Focus remains stable (after move, keep focus on the moved item’s controls).

### 8.6 Discard changes
- **Action**: Click “Discard”.
- **Outcome**:
  - Restore `draftOrderIds` back to `serverOrderIds`.
  - Exit reorder mode.

### 8.7 Save changes
- **Action**: Click “Save”.
- **Outcome (success)**:
  - PATCH changed books’ `series_order`.
  - Exit reorder mode.
  - Refresh list (optional but recommended) and snapshot new `serverOrderIds`.
- **Outcome (failure)**:
  - Restore original order (`draftOrderIds = serverOrderIds`).
  - Show error message (banner or inline alert).
  - Keep user on Books tab; recommended to exit reorder mode since draft is now clean (matches requirement “restore original order”).

---

## 9. Conditions and Validation

### 9.1 API-imposed conditions
- **List**:
  - None beyond providing a valid `series_id`.
- **Update book (reorder)**:
  - `UpdateBookCommand.series_order` must be a number (nullable if clearing; not needed here).
  - If the backend enforces additional constraints (e.g. non-negative), ensure UI emits compliant values.

### 9.2 UI-verified conditions
- **Dirty state**:
  - Derived strictly from comparing `draftOrderIds` to `serverOrderIds`.
- **Navigation guard**:
  - Active whenever `isDirty === true`.

---

## 10. Error Handling

### 10.1 List fetch errors (`GET /books`)
- Render `InlineBanner` with:
  - Message from `ApiErrorDto.message`
  - Retry action calling `refetch()`
- Clear list and meta on error (mirror `useBooksList` behavior).

### 10.2 Empty state
- If `items.length === 0` and not loading:
  - Render a friendly empty state: “No books found in this series” + hint to adjust filters.

### 10.3 Save reorder failures (`PATCH /books/:bookId`)
Potential scenarios and handling:
- **NOT_FOUND** (book deleted/unlinked concurrently):
  - Restore original order and show message: “Some books changed; refresh to continue.”
  - Refetch list.
- **VALIDATION_ERROR**:
  - Restore original order and show message from server.
- **CONFLICT** (future):
  - Keep user on tab; show guidance: “This series changed in another session. Refresh to get the latest order.”
  - (Optional) Offer a “Refresh” button that refetches.
- **INTERNAL_ERROR / RATE_LIMITED**:
  - Restore original order and show error banner; allow retry (which re-enters edit mode if desired).

### 10.4 Navigation guard edge cases
- If a protected navigation is attempted (tab switch, opening a book, browser back):
  - Confirm dialog with explicit consequence.
  - If user chooses “Leave”, disable guard for that one action and proceed.

---

## 11. Implementation Steps
1. **Remove now-unneeded Series Books query params (and namespacing)**:
   - Update `src/components/series/hooks/useSeriesUrlState.ts` to remove all `books_*` parsing/writing and only keep `tab`.
   - Update `src/types.ts` to remove `SeriesBooksQueryViewModel` from the “Series Detail view” section.
   - Update `src/components/series/SeriesDetailPage.tsx` (and `SeriesBooksTabPanel.tsx`) to remove `query`/`onQueryChange` props for the Books tab.
2. **Implement the Books tab UI (no list controls, no pagination)**:
   - Update `src/components/series/SeriesBooksTabPanel.tsx` to fetch and render **all** series books.
   - Add `src/components/series/SeriesBooksHeaderRow.tsx` (or similar) containing the `ReorderModeToggle` and Save/Discard actions.
   - Add `src/components/series/SeriesBooksList.tsx` (and optionally `SeriesBookRow.tsx`).
3. **Add a series-specific list hook**:
   - Implement `useSeriesBooksList(seriesId)` by adapting `src/components/library/hooks/useBooksList.ts` (no query params; meta not required yet).
4. **Reuse existing transformations**:
   - Reuse `transformBookListItem` to display progress and relative updated time consistently with the Library view.
5. **Implement reorder state management**:
   - Add `useSeriesBooksReorder()` (or inline state in the panel initially) for `serverOrderIds`, `draftOrderIds`, and `isDirty`.
6. **Add DnD solution (recommended)**:
   - Add `@dnd-kit/core` + `@dnd-kit/sortable` (or a comparable library) and implement sortable list with a drag handle and keyboard support.
   - Ensure the keyboard story still includes explicit “Move up/down” controls (requirement).
7. **Implement Save/Discard flows**:
   - On Save: compute new `series_order` per id and call `apiClient.patchJson<UpdateBookCommand, UpdateBookResponseDto>(\`/books/${id}\`, { series_order })`.
   - On failure: restore `draftOrderIds = serverOrderIds` and show error.
8. **Implement dirty navigation protection**:
   - Add `beforeunload` handling.
   - Wrap local navigation actions (open book, tab switch) with confirm when dirty.
   - Add `popstate` strategy for back/forward while dirty.
9. **Finalize UX/accessibility**:
   - Confirm focus management in edit mode (move buttons keep focus predictable).
   - Confirm draggable controls have proper labels and that non-edit rows remain keyboard-activatable.
10. **Backend alignment follow-up (if needed)**:
   - Coordinate with backend to support “series order” sorting semantics for `GET /books?series_id=...` as described in the API alignment note.


# View Implementation Plan — Book Detail (Chapters Tab)

## 1. Overview
The **Book Detail — Chapters Tab** is the “Chapters” panel inside the existing Book Detail workspace. It lets the user:
- **Review** chapters for the current book in a stable, predictable order.
- **Create** a new chapter.
- **Edit** chapter title and order.
- **Delete** a chapter with a clear cascade warning (notes/embeddings under the chapter are removed by DB cascade).
- **Reorder** chapters via an explicit **Reorder mode** (move up/down), persisting changes through existing `PATCH /chapters/:chapterId` calls.

This plan is designed to reuse existing patterns already present in the repo:
- **Data fetching hooks** (`useBookById`, `useBooksList` patterns)
- **Error banner** (`InlineBanner`)
- **Dialogs** (shadcn/ui + patterns from `EditBookDialog` / `DeleteBookDialog`)
- **URL state**: Book Detail already uses URL-backed `tab` (and `scope` for Ask). Chapters list query state should remain local (not URL-backed) unless/until required.

---

## 2. View Routing
This tab is rendered inside the existing Book Detail page:
- **Primary route**: `/books/:bookId`
- **Tab selection**: `?tab=chapters` (default; see `useBookUrlState`)

Entry point already exists:
- `src/pages/books/[bookId].astro` renders `<BookDetailPage client:only="react" bookId={bookId} />`
- `src/components/book/BookDetailPage.tsx` conditionally renders `BookChaptersTabPanel` when `activeTab === "chapters"`

---

## 3. Component Structure
High-level component tree (Chapters tab only; within existing `BookDetailPage`):

```
BookDetailPage
├─ BookStickyHeader
├─ BookTabsBar
└─ BookChaptersTabPanel
   ├─ BookChaptersHeaderRow
   │  ├─ AddChapterButton
   │  └─ (optional) ReorderModeToggle + DirtyIndicator + Save/Discard buttons
   ├─ InlineBanner (list error)
   ├─ BookChaptersList
   │  └─ BookChapterRow (edit/delete/reorder affordances)
   ├─ AddChapterDialog
   ├─ EditChapterDialog
   └─ DeleteChapterDialog
```

Notes:
- `BookStickyHeader` already handles global book actions (Edit book / Delete book) and is outside the Chapters tab.
- The Chapters tab should not take ownership of the Book header state; it only needs `bookId`.

---

## 4. Component Details

### `BookChaptersTabPanel`
- **Purpose**: Orchestrates chapters data fetching, renders list + empty/error/pagination states, and owns dialog + reorder state.
- **Main elements**:
  - Container: `<div className="space-y-4">`
  - `BookChaptersHeaderRow` (actions row)
  - Error banner: `InlineBanner` (reuse `src/components/library/InlineBanner.tsx`)
  - List: `BookChaptersList`
  - Dialogs: `AddChapterDialog`, `EditChapterDialog`, `DeleteChapterDialog`
- **Handled events**:
  - `onOpenAdd()` → opens `AddChapterDialog`
  - `onOpenEdit(chapter)` → opens `EditChapterDialog`
  - `onOpenDelete(chapter)` → opens `DeleteChapterDialog`
  - `onRetry()` → refetch list
  - Reorder mode:
    - `onEnterReorderMode()` / `onExitReorderMode()`
    - `onMoveUp(chapterId)` / `onMoveDown(chapterId)`
    - `onSaveReorder()` / `onDiscardReorder()`
- **Validation conditions (UI-level, aligned to API constraints)**:
  - Create chapter:
    - `title.trim().length >= 1` (required)
    - `order` (if provided) must be an integer \(>= 0\)
  - Edit chapter:
    - Must send at least one field (`title` or `order`)
    - If editing `title`, `title.trim().length >= 1`
    - If editing `order`, integer \(>= 0\)
  - Reorder:
    - Enable “Save” only when `isEditing && isDirty && !isSaving`
- **Types**:
  - DTOs: `ListChaptersResponseDto`, `ChapterListItemDto`, `CreateChapterCommand`, `CreateChapterResponseDto`, `UpdateChapterCommand`, `UpdateChapterResponseDto`, `ApiErrorDto`, `PaginationMetaDto`
  - ViewModels (new): `ChapterListItemViewModel`, `BookChapterRowViewModel`, `BookChaptersReorderStateViewModel`, `CreateChapterFormViewModel`, `UpdateChapterFormViewModel`
- **Props (component interface)**:
  - `bookId: string`

---

### `BookChaptersHeaderRow`
- **Purpose**: Top action row for the Chapters tab: add chapter and (optionally) reorder mode controls.
- **Main elements**:
  - Right:
    - Primary: “Add chapter” button
    - Optional reorder cluster:
      - `ReorderModeToggle` (label “Reorder” / “Done”)
      - Dirty indicator text “Unsaved changes”
      - Save button (primary)
      - Discard button (outline)
- **Handled events**:
  - `onAdd()`
  - `onToggleReorder()`
  - `onSaveReorder()`
  - `onDiscardReorder()`
- **Validation conditions**:
  - Save enabled only when dirty and not saving.
  - Reorder toggle disabled when list is not showing all chapters (see `BookChaptersTabPanel` rules).
- **Types**:
  - Reorder flags from `BookChaptersReorderStateViewModel`
- **Props**:
  - `onAdd: () => void`
  - `reorder?: { isEditing: boolean; isDirty: boolean; isSaving: boolean; isDisabled: boolean; disabledReason?: string }`
  - `onToggleReorder?: () => void`
  - `onSaveReorder?: () => void`
  - `onDiscardReorder?: () => void`

---

### `BookChaptersList`
- **Purpose**: Render chapters list with loading/empty states; expose row-level actions.
- **Main elements**:
  - Loading: reuse skeleton pattern (`EntrySkeleton` via `src/components/shared/EntrySkeleton` or a lightweight placeholder)
  - Empty: “No chapters yet” + a call-to-action button “Add chapter”
  - List container: `<div className="space-y-3">` of `BookChapterRow`
- **Handled events**:
  - Row actions:
    - `onEdit(chapterId)`
    - `onDelete(chapterId)`
  - Reorder actions (edit mode only):
    - `onMoveUp(chapterId)`
    - `onMoveDown(chapterId)`
    - `onDragEnd(activeId, overId)` (optional)
- **Validation conditions**:
  - In reorder mode, row click should **not** navigate anywhere; it should only focus controls.
  - Move up disabled on first item; move down disabled on last item.
- **Types**:
  - `BookChapterRowViewModel[]`
  - `PaginationMetaDto | null` (optional for showing row numbering like “3 of 12”)
- **Props**:
  - `items: BookChapterRowViewModel[]`
  - `loading: boolean`
  - `isEditing: boolean`
  - `onEdit: (id: string) => void`
  - `onDelete: (id: string) => void`
  - `onMoveUp?: (id: string) => void`
  - `onMoveDown?: (id: string) => void`
  - `onDragEnd?: (activeId: string, overId: string) => void`

---

### `BookChapterRow` (recommended)
- **Purpose**: Single chapter row with title/order display and edit/delete/reorder controls.
- **Main elements**:
  - Container card: `<div className="rounded-lg border bg-card p-4">`
  - Left section:
    - Title (primary): `item.title`
    - Secondary: “Updated {updatedAtLabel}”
  - Right section:
    - View mode: “Edit” (ghost) + “Delete” (ghost/destructive)
    - Reorder mode: drag handle (optional) + Move up/down buttons (always present if reorder is supported)
- **Handled events**:
  - `onEditClick()`
  - `onDeleteClick()`
  - `onMoveUpClick()` / `onMoveDownClick()` (edit mode)
- **Validation conditions**:
  - Disable move controls at bounds.
  - Ensure buttons have `aria-label`s (e.g. “Move chapter up”).
- **Types**:
  - `BookChapterRowViewModel`
- **Props**:
  - `item: BookChapterRowViewModel`
  - `isEditing: boolean`
  - `onEdit: () => void`
  - `onDelete: () => void`
  - `onMoveUp?: () => void`
  - `onMoveDown?: () => void`

---

### `AddChapterDialog`
- **Purpose**: Create a chapter under the current book (`POST /books/:bookId/chapters`).
- **Main elements**:
  - `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`
  - `<form>`
  - Inputs:
    - Title (required): `Input type="text"`
    - Order (optional): `Input type="number" min="0" step="1"`
      - UX recommendation: show placeholder “(auto)” and compute default when omitted.
  - Error surfaces:
    - General error banner (destructive)
    - Field-level errors under inputs
  - Actions:
    - Cancel (outline)
    - Create (primary)
- **Handled events**:
  - `onSubmit`
  - `onClose`
- **Validation conditions**:
  - Title required: `trim().length >= 1`
  - Order (if provided) must parse to integer and be `>= 0`
- **Types**:
  - DTO: `CreateChapterCommand`, `CreateChapterResponseDto`, `ApiErrorResponseDto`
  - VM: `CreateChapterFormViewModel`
- **Props**:
  - `open: boolean`
  - `onOpenChange: (open: boolean) => void`
  - `bookId: string`
  - `suggestedOrder?: number` (computed from current list: `max(order)+1`)
  - `onCreated: () => void` (refetch list and close)

---

### `EditChapterDialog`
- **Purpose**: Edit chapter title and/or order (`PATCH /chapters/:chapterId`).
- **Main elements**:
  - Form with:
    - Title (optional but typically edited): `Input type="text"`
    - Order (optional): `Input type="number" min="0" step="1"`
  - “No changes to save” general message if unchanged.
- **Handled events**:
  - `onSubmit`
  - `onClose`
- **Validation conditions**:
  - Enforce “at least one changed field” before submit (mirrors server refine rule).
  - If changing title: `trim().length >= 1`
  - If changing order: integer `>= 0`
- **Types**:
  - DTO: `UpdateChapterCommand`, `UpdateChapterResponseDto`, `ApiErrorResponseDto`
  - VM: `UpdateChapterFormViewModel`
- **Props**:
  - `open: boolean`
  - `onOpenChange: (open: boolean) => void`
  - `chapter: ChapterListItemViewModel` (or raw `ChapterListItemDto`)
  - `onUpdated: () => void`

---

### `DeleteChapterDialog`
- **Purpose**: Confirm and delete chapter (`DELETE /chapters/:chapterId`).
- **Main elements**:
  - Matches `DeleteBookDialog` pattern:
    - Strong warning about cascade behavior (notes/embeddings under this chapter)
    - Destructive button
  - General error display
- **Handled events**:
  - `onSubmit`
  - `onClose`
- **Validation conditions**:
  - None beyond having a selected chapter id.
- **Types**:
  - DTO: `ApiErrorResponseDto`
- **Props**:
  - `open: boolean`
  - `onOpenChange: (open: boolean) => void`
  - `chapterId: string`
  - `chapterTitle: string`
  - `onDeleted: () => void`

---

## 5. Types
Use existing DTOs from `src/types.ts` and introduce minimal ViewModels for Chapters tab UI.

### Existing DTOs / types (already in `src/types.ts`)
- **Chapters**:
  - `ChapterDto`
  - `ChapterListItemDto`
  - `CreateChapterCommand`
  - `UpdateChapterCommand`
  - `CreateChapterResponseDto`
  - `ListChaptersResponseDto`
  - `UpdateChapterResponseDto`
- **Errors / pagination**:
  - `ApiErrorDto`, `ApiErrorResponseDto`
  - `PaginationMetaDto`
  - `SortOrderDto`

### New ViewModel types (recommended location: under “VIEW MODELS (Book Detail View)” in `src/types.ts`)

#### `ChapterListItemViewModel`
UI-ready chapter list item derived from `ChapterListItemDto`:
- `id: string`
- `bookId: string`
- `title: string`
- `order: number`
- `updatedAtIso: string`
- `updatedAtLabel: string` (via `formatRelativeTime`)

#### `BookChapterRowViewModel`
Extends `ChapterListItemViewModel` with reorder metadata:
- `position: number` (1-based position in the currently rendered order)
- `isMoveUpDisabled: boolean`
- `isMoveDownDisabled: boolean`

#### `BookChaptersReorderStateViewModel`
Aggregated reorder state owned by the tab panel (or a dedicated hook):
- `isEditing: boolean`
- `isDirty: boolean`
- `isSaving: boolean`
- `serverOrderIds: string[]` (snapshot of ids in the server’s last-known order)
- `draftOrderIds: string[]` (current local draft)
- `saveError: ApiErrorDto | null`

#### `CreateChapterFormViewModel`
Controlled form state for `AddChapterDialog`:
- `title: string`
- `order: string` (empty string means “auto”)

#### `UpdateChapterFormViewModel`
Controlled form state for `EditChapterDialog`:
- `title: string`
- `order: string`

---

## 6. State Management

### Source of truth
- **Book header + global state**: already handled by `BookDetailPage` and `useBookById(bookId)`.
- **Chapters tab state**: owned by `BookChaptersTabPanel`.

### Recommended local state in `BookChaptersTabPanel`
- **List fetch state**: via `useChaptersList(bookId)`
  - `items: ChapterListItemViewModel[]`
  - `loading: boolean`
  - `error: ApiErrorDto | null`
  - `refetch: () => void`
- **Dialogs**:
  - `isAddOpen: boolean`
  - `isEditOpen: boolean`
  - `isDeleteOpen: boolean`
  - `selectedChapterId: string | null` (or store full VM)
- **Reorder mode (optional)**:
  - `reorder: BookChaptersReorderStateViewModel`

### Recommended hooks (new)

#### `useChaptersList(bookId)`
- **Purpose**: Fetch chapters for the book.
- **Implementation**: mirror the style of `useBooksList` / `useBookById`:
  - Call `apiClient.getJson<ListChaptersResponseDto>(\`/books/${bookId}/chapters\`)`
  - Map to ViewModels via transformer
  - Store `items`, `loading`, `error`, `refetch`

#### `useChaptersReorder(items)`
- **Purpose**: Encapsulate reorder draft and dirty computation.
- **Key behavior**:
  - On enter edit mode:
    - `serverOrderIds = items.map(i => i.id)`
    - `draftOrderIds = serverOrderIds`
  - Dirty detection:
    - `isDirty = !arraysEqual(serverOrderIds, draftOrderIds)`
  - Helpers:
    - `moveUp(id)` / `moveDown(id)`
    - `setDraftOrderIds(nextIds)` (for DnD)
    - `discard()` → restore `draftOrderIds = serverOrderIds` and exit edit mode

---

## 7. API Integration

### 7.1 List chapters
- **Endpoint**: `GET /api/v1/books/:bookId/chapters`
- **Frontend request typing**:
  - Use `apiClient.getJson<ListChaptersResponseDto>(\`/books/${bookId}/chapters\`, params)`
- **Frontend response typing**:
  - `ListChaptersResponseDto` → `chapters: ChapterListItemDto[]`, `meta: PaginationMetaDto`

### 7.2 Create chapter
- **Endpoint**: `POST /api/v1/books/:bookId/chapters`
- **Request type**: `CreateChapterCommand`
  - `{ title: string, order?: number }`
- **Response type**: `CreateChapterResponseDto` (`{ chapter: ChapterDto }`)
- **Frontend behavior**:
  - Prefer `order` default to `(maxOrder + 1)` when user leaves it empty.
  - After success: close dialog and `refetch()`.

### 7.3 Update chapter
- **Endpoint**: `PATCH /api/v1/chapters/:chapterId`
- **Request type**: `UpdateChapterCommand` (partial)
  - `{ title?: string, order?: number }` (must include at least one)
- **Response type**: `UpdateChapterResponseDto` (`{ chapter: ChapterDto }`)
- **Frontend behavior**:
  - Build command with only changed fields (mirror `EditBookDialog`).
  - After success: close dialog and `refetch()`.

### 7.4 Delete chapter
- **Endpoint**: `DELETE /api/v1/chapters/:chapterId`
- **Response**: `204 No Content`
- **Frontend behavior**:
  - Treat `NOT_FOUND` as success (matches `DeleteBookDialog` behavior).
  - After success: close dialog and `refetch()`.

### 7.5 Persist reorder (optional)
- **Mechanism**: For each chapter whose position changed, call:
  - `PATCH /api/v1/chapters/:chapterId` with `{ order: nextOrder }`
- **Order assignment strategy**:
  - Use contiguous integers for stability after reorder:
    - `nextOrder = index + 1` (1-based)

---

## 8. User Interactions

### 8.1 View chapters
- **Action**: User navigates to `/books/:bookId?tab=chapters`.
- **Outcome**:
  - Book header + tabs are visible and sticky.
  - Chapters list loads under the sticky tab bar.

### 8.3 Create chapter
- **Action**: Click “Add chapter”.
- **Outcome**:
  - Dialog opens.
  - On submit:
    - Validates title and order.
    - Calls `POST /books/:bookId/chapters`.
    - On success: close and refresh list.

### 8.4 Edit chapter
- **Action**: Click “Edit” on a row.
- **Outcome**:
  - Dialog opens prefilled.
  - On submit:
    - Validates changed fields.
    - Calls `PATCH /chapters/:chapterId`.
    - On success: close and refresh list.

### 8.5 Delete chapter
- **Action**: Click “Delete” on a row.
- **Outcome**:
  - Confirmation dialog appears with explicit cascade warning.
  - On confirm: `DELETE /chapters/:chapterId`.
  - On success: close and refresh list.

### 8.6 Reorder chapters (optional)
- **Action**: Enter reorder mode.
- **Outcome**:
  - Move up/down buttons become available.
  - Save enabled when order differs from the server snapshot.
  - On Save: patch changed chapters’ `order`.
  - On failure: restore original order snapshot and show error message.

---

## 9. Conditions and Validation

### 9.1 API-imposed conditions (must be reflected in UI)
- **Create** (`POST /books/:bookId/chapters`):
  - `title`: required, trimmed, non-empty.
  - `order`: optional; if present, integer and `>= 0`.
  - No unknown fields (server uses `.strict()` zod schema).
- **List** (`GET /books/:bookId/chapters`):
  - No pagination, fetch all chapters for the book
- **Update** (`PATCH /chapters/:chapterId`):
  - Must include at least one of `title` or `order`.
  - If present, same validation rules as create.
  - No unknown fields.
- **Delete** (`DELETE /chapters/:chapterId`):
  - Valid UUID in path; else server returns `VALIDATION_ERROR`.

### 9.2 Component-level validation mapping
- `AddChapterDialog`:
  - Prevent submit when title is blank.
  - Parse `order` string only if non-empty; ensure integer and `>= 0`.
- `EditChapterDialog`:
  - Compute changed fields; block submit with message if none changed.
  - Validate title/order only if being changed.
- `BookChaptersTabPanel`:
  - Enforce reorder availability only when not paginated.

---

## 10. Error Handling

### 10.1 List fetch errors
Potential responses and handling:
- `NOT_FOUND` / `VALIDATION_ERROR` (invalid or missing book):
  - In practice `BookDetailPage` already handles book not found, but if the chapters list fetch returns these, show `InlineBanner` with message and a “Back to Library” suggestion (optional).
- `INTERNAL_ERROR`, `RATE_LIMITED`, others:
  - Show `InlineBanner` with retry.

### 10.2 Create/update validation errors
- If server responds with `VALIDATION_ERROR` and includes `details`:
  - Map zod issue paths to field errors (mirror `EditBookDialog` mapping).
  - Keep dialog open and show field errors.
- Otherwise:
  - Show general error message in the dialog.

### 10.3 Delete errors
- `NOT_FOUND`:
  - Treat as success (chapter already deleted).
- Others:
  - Show dialog-level general error; allow retry.

### 10.4 Reorder save failures (optional)
Failure scenarios:
- `NOT_FOUND` (chapter deleted concurrently):
  - Exit reorder mode, refetch list, show banner: “Chapters changed; refreshed.”
- `VALIDATION_ERROR`:
  - Exit reorder mode, restore original order snapshot, show message.
- `RATE_LIMITED` / `INTERNAL_ERROR`:
  - Restore original order snapshot, show banner, allow retry.

---

## 11. Implementation Steps
1. **Add Chapter tab types (ViewModels)**:
   - Extend `src/types.ts` under “VIEW MODELS (Book Detail View)” with the new Chapter tab types:
     - `ChapterListItemViewModel`, `BookChapterRowViewModel`,
       `BookChaptersReorderStateViewModel`, `CreateChapterFormViewModel`, `UpdateChapterFormViewModel`.
2. **Add chapter transformers**:
   - Update `src/components/book/hooks/transformers.ts`:
     - Add `transformChapterListItem(dto: ChapterListItemDto): ChapterListItemViewModel`
     - Use `formatRelativeTime` for `updatedAtLabel`.
3. **Create chapters list hook**:
   - Add `src/components/book/hooks/useChaptersList.ts` (and export from `src/components/book/hooks/index.ts`):
     - Mirror `useBooksList` style.
     - Call `GET /books/${bookId}/chapters`.
4. **Backend: ensure chapters can be loaded without pagination params**:
   - Update `src/pages/api/v1/books/[bookId]/chapters.ts` GET handler so a request with **no** `page/size/sort/order` query params returns **all chapters** for the book (sorted by `order asc`).
   - Recommended approach:
     - Detect when no pagination params are provided (e.g. `url.searchParams.size === 0` or all of `page/size/sort/order` are absent).
     - In that case, bypass `listChaptersQuerySchema` defaults and call the service with a “fetch all” query (e.g. `{ page: 1, size: 100, sort: "order", order: "asc" }`), or introduce a dedicated `listAllChapters` service path.
   - Goal: the frontend can simply call `apiClient.getJson<ListChaptersResponseDto>(\`/books/${bookId}/chapters\`)` and receive the full list without needing pagination UI yet.
5. **Implement `BookChaptersTabPanel`**:
   - Replace placeholder UI in `src/components/book/BookChaptersTabPanel.tsx` with:
     - Data fetch via `useChaptersList`
     - `BookChaptersHeaderRow`, `BookChaptersList`, optional `PaginationControls`, and `InlineBanner`.
6. **Implement row + list components**:
   - Add:
     - `src/components/book/BookChaptersHeaderRow.tsx`
     - `src/components/book/BookChaptersList.tsx`
     - `src/components/book/BookChapterRow.tsx`
   - Reuse styling conventions from `BooksList`/`BookRow` and dialogs in Book Detail.
7. **Add dialogs**:
   - Add:
     - `src/components/book/AddChapterDialog.tsx`
     - `src/components/book/EditChapterDialog.tsx`
     - `src/components/book/DeleteChapterDialog.tsx`
   - Follow patterns in `EditBookDialog` / `DeleteBookDialog`:
     - Controlled inputs
     - Client-side validation
     - Map server `VALIDATION_ERROR.details` to field errors
     - `NOT_FOUND` delete treated as success
8. **Wire CRUD into the tab panel**:
   - Add state for open/close + selected chapter.
   - On create/update/delete success: close dialog and call `refetch()`.
9. **(Optional) Implement reorder mode**:
   - Add `useChaptersReorder` helper (or inline state in panel first).
   - Enforce “single-page only” reorder.
   - Implement move up/down.
   - Persist reorder by PATCHing changed chapters’ `order`.
   - Handle save errors by restoring `serverOrderIds` snapshot and showing `InlineBanner`.
10. **Final pass on accessibility + UX**:
   - Ensure all icon-only buttons have `aria-label`.
   - Ensure dialogs use proper `DialogTitle` and (where helpful) `DialogDescription`.
   - Verify sticky header + tabs behavior on mobile (content scrolls under sticky tab bar).


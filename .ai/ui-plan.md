# UI Architecture for Bookkeeper

## 1. UI Structure Overview

Bookkeeper is a responsive, personal library + recall workspace organized around the hierarchy **Series → Books → Chapters → Notes**, with an **AI chat (RAG) experience** that answers questions grounded in the user’s notes.

**Primary IA (information architecture)**
- **Library (home)**: two tabs (**Books** default, **Series**) to discover, filter, and create core entities.
- **Series detail**: manage a series and see/reorder its books, with an **Ask** view.
- **Book detail (workspace)**: the main working surface for a single book, with three tabs: **Chapters**, **Notes**, **Ask**.

**Routing principles (Astro-compatible, deep-linkable, shareable)**
- **Entity detail pages** use path params: `/books/:bookId`, `/series/:seriesId`.
- **Tabs + filters + pagination** use query params (not separate routes) to preserve state and enable back/forward navigation:
  - Tabs: `?tab=...`
  - Filters: `?q=...&status=...&series_id=...&chapter_id=...`
  - List controls: `?page=...&size=...&sort=...&order=...`

**API compatibility principles (from API plan)**
- Lists always model **server-pagination** using `meta` and avoid client-only filtering that would desync pagination.
- Sorting uses API `sort` + `order` whitelists per resource.
- Errors map from `{ error: { code, message, details } }` to UI states (inline validation vs. page-level errors vs. retryable transient errors).

**Accessibility baseline**
- All key interactions are keyboard-accessible: tabs, dialogs/modals, menus, list actions, drag-and-drop reordering (keyboard reordering in Edit mode).
- Focus management is explicit: initial focus, focus trap in dialogs, restore focus on close, and predictable tab order.

**Security baseline (design-time, even if auth UI is deferred)**
- Assume per-user data isolation (RLS) is eventually enforced; UI avoids exposing internal IDs unnecessarily and handles 404/403-like cases as “Not found / no access.”
- All AI/embedding secrets remain server-side; UI treats AI responses as untrusted text and renders safely.

---

## 2. View List

> Conventions used below:
> - **Path**: client URL path (Astro pages)
> - **Primary endpoints**: API calls needed for the view
> - **Key states**: loading / empty / error / validation / destructive confirm / low-confidence

### 2.1 Library (Home)
- **View name**: Library
- **View path**: `/library?tab=books|series`
- **Main purpose**: Primary landing to browse and create Books/Series; entry point to Series Detail and Book Workspace.
- **Key information to display**:
  - **Books tab**: list of books with title, author, status, progress (`current_page/total_pages`), updated/created time.
  - **Series tab**: list of series with title, book count, updated/created time.
- **Key view components**:
  - **Tab bar**: “Books” (default), “Series”.
  - **Books list controls** (persisted in URL): search `q`, filter `status`, filter `series_id`, sort (`updated_at|created_at|title|author|status`), pagination controls.
  - **Series list controls**: search `q` (title), sort (`created_at|updated_at|title`), pagination controls.
  - **Primary CTAs**:
    - Books tab: **Add Book** (and empty-state CTA).
    - Series tab: **Add Series** (and empty-state CTA).
  - **Row actions**:
    - Book row: open Book Detail
    - Series row: open Series Detail
- **Primary endpoints**:
  - Books tab: `GET /books` (filters: `status`, `series_id`, `q`; pagination/sort)
  - Series tab: `GET /series` (search `q`; pagination/sort)
  - Create actions: `POST /books`, `POST /series`
- **UX, accessibility, and security considerations**:
  - **State preservation**: switching tabs preserves each tab’s last-used query params (so users don’t “lose” their filters).
  - **Loading**: skeleton rows; avoid layout shift when `meta` updates.
  - **Empty states**: tailored CTAs (“Add your first book/series”).
  - **Keyboard**: tabs ARIA pattern, roving focus for lists where appropriate, visible focus rings.
  - **Error mapping**:
    - `RATE_LIMITED`: inline banner with retry/backoff.
    - `INTERNAL_ERROR`: retry CTA + diagnostic-friendly message.
  - **User stories**: US-004, US-005 (and navigation foundation for US-006+).

### 2.2 Series Detail (Workspace Shell)
- **View name**: Series Detail
- **View path**: `/series/:seriesId?tab=books|ask`
- **Main purpose**: Primary working surface for a single series: manage series metadata and the books in the series, and ask questions scoped to the series.
- **Key information to display**:
  - Series header: cover image (optional), title, description (optional), book count, updated/created timestamps.
- **Key view components**:
  - **Sticky header (responsive)**: collapsible on small screens; retains title + key actions.
  - **Sticky tab bar**: Books / Ask.
  - **Global series actions** (in header menu): Edit series, Delete series.
- **Primary endpoints**:
  - Fetch series: `GET /series/:seriesId`
  - Edit series: `PATCH /series/:seriesId`
  - Delete series: `DELETE /series/:seriesId` (optional `?cascade=true`)
- **UX, accessibility, and security considerations**:
  - **Mobile-first navigation**: tabs always reachable; content scrolls under sticky tab bar.
  - **Not found**: `NOT_FOUND` shows a clear state with a “Back to Library” action.
  - **Destructive delete**: confirmation dialog explaining default non-cascade behavior, with an explicit cascade toggle.
  - **User stories**: US-004 (view/manage series), supports series-scoped recall (US-009–US-011).

### 2.3 Series Detail — Books Tab
- **View name**: Series Books (tab)
- **View path**: `/series/:seriesId?tab=books&page=&size=&sort=&order=`
- **Main purpose**: Review and manage the list of books in the series, including optional reordering.
- **Key information to display**:
  - Books in series: ordered list with title/author/status/progress and updated time.
- **Key view components**:
  - **Books list**: navigates into Book Detail on selection.
  - **Edit mode toggle**:
    - Enter Edit mode → drag handles appear; keyboard reorder controls enabled.
    - **Unsaved changes indicator** while order differs from server order.
    - **Save** and **Cancel/Discard** actions.
- **Primary endpoints**:
  - List books in series: `GET /books?series_id=:seriesId` (sorted by `series_order` if available; otherwise by title/updated)
  - Persist reorder: `PATCH /books/:bookId` (update `series_order` for changed books)
- **UX, accessibility, and security considerations**:
  - **Reorder save semantics**: staged locally; on Save failure restore original order and show error.
  - **Navigation protection**: when dirty, confirm on leaving (back, link click, refresh).
  - **Keyboard DnD**: provide explicit “Move up/down” controls in Edit mode (not only pointer drag).
  - **Error mapping**:
    - `NOT_FOUND`: show Not Found page-level state (series missing or inaccessible).
    - `CONFLICT` (if introduced later): keep user in Edit mode with guidance to refresh.
  - **User stories**: Supports organization needed for series-scoped Ask (US-009–US-011).

### 2.4 Series Detail — Ask Tab (AI Chat)
- **View name**: Ask (tab)
- **View path**: `/series/:seriesId?tab=ask`
- **Main purpose**: Chat-driven Q&A over the user’s notes, scoped to the series.
- **Key information to display**:
  - Chat transcript (non-persisted), loading/typing state, answer text.
  - Low-confidence state guidance (not an error).
- **Key view components**:
  - **Composer**: multi-line input with submit on Enter (and Shift+Enter for newline); disabled while request in flight.
  - **Message actions**: Copy answer; Clear chat.
  - **Low-confidence panel**: suggests next steps (add notes, verify scope, try different phrasing).
- **Primary endpoints**:
  - Query: `POST /ai/query` with `{ query_text, scope: { book_id: null, series_id } }`
- **UX, accessibility, and security considerations**:
  - **Low confidence ≠ error**: distinct visual/semantic state; no “failed” tone; provides guidance.
  - **Rate limiting**: `RATE_LIMITED` shows retry/backoff; keep prior messages.
  - **Safe rendering**: treat answer text as untrusted; render as plain text (or sanitized markdown if enabled later).
  - **User stories**: US-009, US-010, US-011 (citations planned; UI placeholder).

### 2.5 Book Detail (Workspace Shell)
- **View name**: Book Detail
- **View path**: `/books/:bookId?tab=chapters|notes|ask`
- **Main purpose**: Primary working surface for a single book: manage chapters/notes and ask questions.
- **Key information to display**:
  - Book header: cover image, title, author, optional series name, status, progress, updated/created timestamps.
- **Key view components**:
  - **Sticky header (responsive)**: collapsible on small screens; retains title + key actions.
  - **Sticky tab bar**: Chapters / Notes / Ask.
  - **Global book actions** (in header menu): Edit book, Delete book.
  - **Progress editing (PRD)**:
    - Current milestone: allow manual update of `current_page` and `status` via Edit Book.
- **Primary endpoints**:
  - Fetch book: `GET /books/:bookId`
  - Update book/progress: `PATCH /books/:bookId`
  - Delete book: `DELETE /books/:bookId`
- **UX, accessibility, and security considerations**:
  - **Mobile-first navigation**: tabs always reachable; content scrolls under sticky tab bar.
  - **Not found**: `NOT_FOUND` shows a clear state with a “Back to Library” action.
  - **Destructive delete**: confirmation dialog explaining cascade behavior (chapters, notes, embeddings/sessions).
  - **User stories**: US-005 (view/manage), supports all book-scoped stories (US-006–US-013).

### 2.6 Book Detail — Chapters Tab
- **View name**: Book Chapters (tab)
- **View path**: `/books/:bookId?tab=chapters`
- **Main purpose**: Create, edit, delete, and reorder chapters within the book.
- **Key information to display**:
  - Chapter list ordered by `order`, with title and updated time (optional note count if available later).
- **Key view components**:
  - **Add Chapter** button and modal (title, optional order).
  - **Chapter row actions**:
    - Edit (modal)
    - Delete (confirmation dialog; warns that notes under chapter will be deleted)
    - View notes for chapter (switches to Notes tab with `chapter_id`)
    - Add note to chapter (opens Note modal pre-scoped to chapter)
  - **Edit mode** for reordering chapters (staged; Save/Discard; dirty protection).
- **Primary endpoints**:
  - List chapters: `GET /books/:bookId/chapters` (default sort: `order asc`)
  - Create chapter: `POST /books/:bookId/chapters`
  - Update chapter: `PATCH /chapters/:chapterId` (including `order`)
  - Delete chapter: `DELETE /chapters/:chapterId`
- **UX, accessibility, and security considerations**:
  - **Reorder gating**: drag handles and keyboard reorder controls only in Edit mode.
  - **Validation**: inline errors for `VALIDATION_ERROR` (e.g., missing title).
  - **Error mapping**:
    - `NOT_FOUND` on mutate: show “This chapter no longer exists” and refresh list.
  - **User stories**: Enables US-006 (chapter selection), supports organization for US-008/US-011.

### 2.7 Book Detail — Notes Tab
- **View name**: Book Notes (tab)
- **View path**: `/books/:bookId?tab=notes&chapter_id=:chapterId?&sort=updated_at|created_at&order=asc|desc&page=&size=`
- **Main purpose**: Review and manage notes for the book, with filtering and sorting.
- **Key information to display**:
  - Notes list scoped to the book (and optionally chapter), default sorted by `updated_at desc`.
  - Each note: content preview/full, associated chapter title (or chapter link), updated time.
- **Key view components**:
  - **Notes controls panel**:
    - Chapter filter (dropdown; “All chapters” default)
    - Sort selector (created vs updated) + order toggle
  - **Add note** button (opens reusable Note modal)
  - **Note row actions**: Edit (modal), Delete (confirm)
  - **Pagination controls** (server-backed)
- **Primary endpoints**:
  - List notes: `GET /notes?book_id=:bookId&chapter_id?&page&size&sort&order`
  - Create note (chapter-scoped): `POST /chapters/:chapterId/notes`
  - Update note: `PATCH /notes/:noteId`
  - Delete note: `DELETE /notes/:noteId`
- **UX, accessibility, and security considerations**:
  - **Note modal reuse**: same component for create/edit with consistent validation and focus handling.
  - **Character guidance**: soft guidance 500–1000 chars with a visible counter; enforce a hard cap in UI aligned to API max length.
  - **No embedding status UI**: `embedding_status` is not shown for MVP
  - **Error mapping**:
    - `VALIDATION_ERROR`: inline field errors (e.g., empty content).
    - `RATE_LIMITED`: disable submit temporarily; show retry guidance.
  - **User stories**: US-006, US-007, US-008.

### 2.8 Book Detail — Ask Tab (AI Chat)
- **View name**: Ask (tab)
- **View path**: `/books/:bookId?tab=ask&scope=book|series`
- **Main purpose**: Chat-driven Q&A over the user’s notes, scoped to the current book or its series.
- **Key information to display**:
  - Chat transcript (non-persisted), loading/typing state, answer text.
  - Low-confidence state guidance (not an error).
  - Optional citations UI is designed but hidden until API provides citations.
- **Key view components**:
  - **Scope switch**:
    - “This book” (default)
    - “This series” (enabled only if book has `series_id`; otherwise disabled with explanatory hint and fallback to book scope)
  - **Composer**: multi-line input with submit on Enter (and Shift+Enter for newline); disabled while request in flight.
  - **Message actions**: Copy answer; Clear chat.
  - **Low-confidence panel**: suggests next steps (add a note, broaden scope, try different phrasing).
- **Primary endpoints**:
  - Query: `POST /ai/query` with `{ query_text, scope: { book_id|null, series_id|null } }`
- **UX, accessibility, and security considerations**:
  - **Low confidence ≠ error**: distinct visual/semantic state; no “failed” tone; provides guidance.
  - **Rate limiting**: `RATE_LIMITED` shows retry/backoff; keep prior messages.
  - **Safe rendering**: treat answer text as untrusted; render as plain text (or sanitized markdown if enabled later).
  - **User stories**: US-009, US-010, US-011 (citations planned; UI placeholder).

---

### 2.9 Shared / System Views (Cross-cutting)

#### Not Found
- **View name**: Not Found
- **View path**: `/*` (fallback)
- **Main purpose**: Handle `NOT_FOUND` resources and unknown routes with a safe recovery path.
- **Key components**: explanation, “Back to Library” link.

#### Error Boundary (App-level)
- **View name**: Something went wrong
- **View path**: N/A (boundary state)
- **Main purpose**: Catch unexpected UI errors and provide reload/retry navigation.
- **Key components**: friendly message, reload button, link to Library.

---

## 3. User Journey Map

### 3.1 Main use case (retain + recall while reading a book)
1. **Open Library** at `/library?tab=books`.
2. **Find a book** using search `q` and filters (`status`, `series_id`), then open it → `/books/:bookId`.
3. On **Chapters tab**:
   - Create a chapter if needed (Add Chapter).
   - After finishing a chapter, choose **Add note to chapter**.
4. In the **Note modal**:
   - Enter concise bullet/paragraph note content; observe character counter; save.
   - On success: modal closes; note appears in Notes tab (or in current context).
5. Switch to **Ask tab**:
   - Ask a question in “This book” scope.
   - If answer is **low confidence**, follow guidance to add missing notes or broaden scope.
6. Optional: switch Ask scope to **This series** (if series exists) and ask a cross-book question.

### 3.2 Library management flow (create series, add books)
1. From Library → **Series tab** → Add Series.
2. Open Series Detail → review books in the series.
3. From Library → **Books tab** → Add Book and optionally assign to a series.
4. Open Book Detail to start chapters/notes.

### 3.3 Reordering flow (Edit mode + Save)
1. Enter **Edit mode** (Series Detail for books-in-series, or Chapters tab for chapters).
2. Reorder items using drag handles or keyboard “Move up/down”.
3. Observe **Unsaved changes** indicator.
4. Click **Save**:
   - Persist changes with required PATCH requests.
   - On failure: restore original order and present Retry/Discard.
5. Exit Edit mode only when Save succeeds or changes are discarded.

---

## 4. Layout and Navigation Structure

### 4.1 Global navigation
- **Primary nav**: a single “Library” link (top-left) visible on all non-auth views.
- **Contextual breadcrumbs** (optional, non-essential):
  - From Series Detail: “Library / Series / {Series title}”
  - From Book Detail: “Library / Books / {Book title}” (and optionally show series if present)

### 4.2 URL patterns (deep linking + state)
- **Library tabs**:
  - Books: `/library?tab=books&status=&series_id=&q=&sort=&order=&page=&size=`
  - Series: `/library?tab=series&q=&sort=&order=&page=&size=`
- **Series detail**:
  - Books: `/series/:seriesId?tab=books&page=&size=&sort=&order=`
  - Ask: `/series/:seriesId?tab=ask`
- **Book workspace tabs**:
  - Chapters: `/books/:bookId?tab=chapters`
  - Notes: `/books/:bookId?tab=notes&chapter_id=&sort=updated_at&order=desc&page=&size=`
  - Ask: `/books/:bookId?tab=ask&scope=book|series`

### 4.3 Navigation safeguards
- When staged reorder changes are present (dirty Edit mode), **block navigation** with a confirm dialog offering:
  - Save changes
  - Discard changes
  - Stay on page

---

## 5. Key Components

- **App shell**: shared header (Library link), responsive container, error boundary integration.
- **Tabs system**: accessible tablist/tabpanel used for Library tabs and Book workspace tabs.
- **Standard list pattern**: consistent list header (controls), list body (rows/cards), pagination footer, and shared loading/empty/error states.
- **Entity cards/rows**:
  - `BookListItem`: title/author/status/progress + quick actions
  - `SeriesListItem`: title/book count + quick actions
  - `ChapterListItem`: title/order + actions (view notes, add note, edit, delete)
  - `NoteListItem`: content + chapter label + actions (edit/delete)
- **Forms & modals**:
  - `BookFormModal` (create/edit) mapped to `POST /books` and `PATCH /books/:bookId`
  - `SeriesFormModal` (create/edit) mapped to `POST /series` and `PATCH /series/:seriesId`
  - `ChapterFormModal` (create/edit) mapped to `POST /books/:bookId/chapters` and `PATCH /chapters/:chapterId`
  - `NoteModal` (create/edit, reusable) mapped to `POST /chapters/:chapterId/notes` and `PATCH /notes/:noteId`, with character counter + hard cap
- **Confirm dialogs**: standardized destructive confirmation with cascade warnings (book/series/chapter/note).
- **Edit mode reorder scaffold**:
  - drag handles + keyboard reorder controls
  - dirty tracking + Save/Discard bar
  - failure recovery restoring original order
- **AI chat module**:
  - transcript, composer, scope selector, low-confidence panel
  - copy/clear actions
- **Error/notice surfaces**:
  - inline field errors (validation)
  - inline banners (rate limit, transient failures)
  - page-level “Not found” and “Something went wrong”


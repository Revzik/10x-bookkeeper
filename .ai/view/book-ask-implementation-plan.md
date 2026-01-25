# View Implementation Plan — Book Detail (Ask Tab)

## 1. Overview
The **Book Detail — Ask Tab** view is a chat-driven Q&A interface that lets the user ask natural-language questions grounded in **their own notes**. The chat is **non-persisted** (in-memory only) and supports two scopes:

- **This book** (default): answers grounded in notes for the current book.
- **This series**: answers grounded in notes across the book’s series (only available if the book is linked to a series).

Key UX points:
- **Low confidence is not an error**: show the answer normally and render a distinct guidance panel.
- **Rate limiting is an error**: show an error banner, keep the transcript intact, allow retry/backoff.
- **Safe rendering**: treat AI text as untrusted; render as plain text only (no HTML).

## 2. View Routing
- **View path**: `/books/:bookId?tab=ask&scope=book|series`
- **Where it renders**: inside `BookDetailPage` (`src/components/book/BookDetailPage.tsx`) when `activeTab === "ask"`.
- **Astro page**: already mounted at `src/pages/books/[bookId].astro` as a React island.

URL state constraints (already implemented by `useBookUrlState`):
- `tab=notes|chapters|ask` (default `chapters`)
- `scope=book|series` (default `book`)

## 3. Component Structure
High-level component tree (Ask tab only; within existing `BookDetailPage`):

```
BookDetailPage
└─ BookAskTabPanel
   ├─ BookAskScopeBar
   │  ├─ ScopeSwitch (Tabs: "This book" / "This series")
   │  └─ ScopeHint (only when series is unavailable and user attempts series scope)
   ├─ InlineBanner (error; retryable for RATE_LIMITED/INTERNAL_ERROR)
   ├─ AiChatTranscript
   │  ├─ AiChatMessageBubble (user)
   │  ├─ AiChatMessageBubble (assistant)
   │  └─ AiChatTypingBubble (assistant, while pending)
   ├─ AiChatLowConfidencePanel (contextual copy based on current scope)
   └─ AiChatComposer
      ├─ Textarea (multiline)
      ├─ Options dropdown (Copy last answer, Clear chat)
      └─ Submit button
```

To minimize duplication with the existing Series Ask view, implement the “AiChat*” pieces as **shared, scope-agnostic** components/hooks and reuse them from:
- `src/components/series/SeriesAskTabPanel.tsx`
- `src/components/book/BookAskTabPanel.tsx`

## 4. Component Details

### `BookAskTabPanel`
- **Purpose**: Orchestrates the Ask tab for a book: wires the scope switch, delegates chat behavior to a hook, and renders transcript/composer/error/low-confidence states.
- **Location**: `src/components/book/BookAskTabPanel.tsx` (currently a placeholder).
- **Main elements**:
  - Root container: `<div className="space-y-4">`
  - `BookAskScopeBar`
  - Optional `InlineBanner` (only for real errors; not for low confidence)
  - `AiChatTranscript`
  - Optional `AiChatLowConfidencePanel`
  - `AiChatComposer`
- **Handled events**:
  - `onScopeChange(nextScope)`:
    - If `nextScope === "series"` and `book.seriesId` is null → ignore change, keep scope as `"book"`, and show an explanatory hint.
    - Else update URL state via `setAskScope(nextScope)` and switch transcript to the chosen scope (see State Management).
  - `onSubmit()`:
    - validate draft (trim + length)
    - call `submitQuestion()` in the chat hook
  - `onRetry()`:
    - call `retry()` in the chat hook (only for retryable errors)
  - `onClearChat()`:
    - confirm destructive action; call `clearChat()` for the current scope
- **Validation conditions (UI-level, aligned to API)**:
  - `query_text` must satisfy:
    - `trim().length >= 1`
    - `trim().length <= 500`
  - Disable submit if:
    - `isSubmitting === true`
    - OR `trim().length === 0`
    - OR `trim().length > 500`
  - Scope must satisfy **mutual exclusion**:
    - Book scope request: `scope = { book_id: bookId, series_id: null }`
    - Series scope request: `scope = { book_id: null, series_id: seriesId }`
- **Types (DTO + ViewModel)**:
  - DTO request: `AiQueryBody` (zod-inferred type) or client alias (see Types section)
  - DTO response: `AiQueryResponseDtoSimple`
  - Errors: `ApiErrorDto`
  - View models: `BookAskScopeViewModel` and shared “AiChat*” view models (see Types section)
- **Props (component interface)**:
  - Recommended to avoid refetching book data and to enable series availability logic:

```ts
interface BookAskTabPanelProps {
  book: BookHeaderViewModel; // includes book.id and book.seriesId/series (optional)
  askScope: BookAskScopeViewModel; // URL-backed
  setAskScope: (scope: BookAskScopeViewModel) => void; // URL-backed setter
}
```

Implementation note:
- Update `BookDetailPage` to pass `book`, `askScope`, and `setAskScope` (it already has `book` and `askScope`; it currently does not pass `setAskScope`).

### `BookAskScopeBar`
- **Purpose**: Scope selection UI and guidance for series availability.
- **Main elements**:
  - Container: `<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">`
  - `ScopeSwitch` (shadcn `Tabs` used as a segmented control)
  - Optional hint text (small, muted)
- **Handled events**:
  - `onScopeChange("book"|"series")`
- **Validation conditions**:
  - Series option disabled if `book.seriesId === null`
  - If URL requests `scope=series` but series is unavailable:
    - Immediately fall back to `"book"` and call `setAskScope("book")` on mount
    - Display a hint: “This book isn’t in a series yet. Link it to a series to enable series-wide questions.”
- **Types**:
  - `BookAskScopeViewModel`
  - (Optional) `BookAskScopeOptionViewModel` for UI labels/disabled reason (can be derived inline)
- **Props**:

```ts
interface BookAskScopeBarProps {
  scope: BookAskScopeViewModel;
  canUseSeriesScope: boolean;
  seriesTitle?: string | null;
  onScopeChange: (scope: BookAskScopeViewModel) => void;
  showSeriesDisabledHint: boolean;
}
```

### `ScopeSwitch`
- **Purpose**: Accessible, compact book/series scope toggle.
- **Implementation**: Use `src/components/ui/tabs.tsx` as a 2-option segmented control.
- **Main elements**:
  - `Tabs` with `TabsList` and two `TabsTrigger`s:
    - value `"book"` label “This book”
    - value `"series"` label “This series” (disabled when unavailable)
- **Handled events**:
  - `onValueChange(next)` → propagate via `onScopeChange`
- **Validation conditions**:
  - Do not allow selection of `"series"` if disabled (guard clause even if UI disables)
- **Types**:
  - `BookAskScopeViewModel`
- **Props**:

```ts
interface ScopeSwitchProps {
  value: BookAskScopeViewModel;
  seriesEnabled: boolean;
  onChange: (value: BookAskScopeViewModel) => void;
}
```

### `AiChatTranscript` (shared)
- **Purpose**: Renders the transcript, pending/typing state, and safe text rendering.
- **Main elements**:
  - Scroll container: `<div className="max-h-[55vh] overflow-auto rounded-lg border p-3">`
  - Message list: `<div className="space-y-3">`
  - Empty state copy varies by scope:
    - Book scope: “Ask a question about this book to get started”
    - Series scope: “Ask a question about this series to get started”
- **Handled events**:
  - Optional “Copy” action per assistant message bubble (recommended, matches Series Ask)
- **Validation conditions**:
  - Render assistant answer as plain text:
    - `<p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>`
    - Never use `dangerouslySetInnerHTML`
- **Types**:
  - `AiChatMessageViewModel[]` (shared)
- **Props**:

```ts
interface AiChatTranscriptProps {
  messages: AiChatMessageViewModel[];
  emptyStateText: string;
  copiedMessageId: string | null;
  onCopyMessage: (content: string, messageId: string) => void;
}
```

### `AiChatMessageBubble` (shared)
- **Purpose**: Shows one message with role-based styling and message status (sent/pending/failed).
- **Main elements**:
  - Wrapper: `<div role="group" aria-label="Chat message" className="flex ...">`
  - Bubble with role/status styling:
    - user: primary background
    - assistant pending: muted + “Thinking …”
    - assistant failed: destructive tint + fallback text
  - Copy button for assistant messages (only when `status === "sent"` and `content` non-empty)
- **Types**: `AiChatMessageViewModel`
- **Props**:

```ts
interface AiChatMessageBubbleProps {
  message: AiChatMessageViewModel;
  isCopied: boolean;
  onCopy: () => void;
}
```

### `AiChatLowConfidencePanel` (shared; copy depends on scope)
- **Purpose**: Guidance UI when `answer.low_confidence === true` for the **latest assistant message**.
- **Main elements**:
  - Bordered, non-destructive panel (warning/info palette)
  - Title: “Not enough in your notes (yet)”
  - Guidance bullets (scope-aware):
    - Always:
      - Add notes to the relevant chapter(s)
      - Try a more specific phrasing (names, places, chapter number)
    - If current scope is `"book"` and series is available:
      - Suggest broadening: “Try switching to ‘This series’”
    - If current scope is `"series"`:
      - Suggest narrowing or adding missing notes
- **Types**: no new DTOs required; can be derived from last assistant message + scope.
- **Props**:

```ts
interface AiChatLowConfidencePanelProps {
  visible: boolean;
  scope: BookAskScopeViewModel;
  canUseSeriesScope: boolean;
}
```

### `AiChatComposer` (shared)
- **Purpose**: Multi-line question input + submit + options (copy last answer, clear chat). Disabled while request is in flight.
- **Main elements**:
  - `<form>` wrapper
  - `Textarea` (`src/components/ui/textarea.tsx`)
  - Helper row:
    - character count “\(n\) / 500”
    - hint: “Enter to send • Shift+Enter for newline”
  - Options dropdown (`DropdownMenu`) with:
    - “Copy last answer”
    - “Clear chat” (opens confirm dialog)
  - `Button` submit
- **Handled events**:
  - `onChange` updates draft text
  - `onKeyDown`:
    - Enter (no shift) → prevent default and submit
    - Shift+Enter → newline
  - `onSubmit` calls parent handler
  - Options actions: copy last answer, open clear confirm dialog
- **Validation conditions**:
  - compute `trimmedLength`
  - show validation message when invalid and not submitting
  - disable textarea + buttons while submitting
- **Types**:
  - `AiChatComposerViewModel` (shared derived view model; see Types section)
- **Props**:

```ts
interface AiChatComposerProps {
  value: string;
  disabled: boolean;
  placeholder: string;
  composer: AiChatComposerViewModel;
  canCopyLastAnswer: boolean;
  canClear: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCopyLastAnswer: () => void;
  onClearChatClick: () => void; // opens confirm dialog in parent
}
```

### `ClearChatConfirmDialog` (shared)
- **Purpose**: Destructive confirmation for clearing transcript (per scope).
- **Implementation**: reuse shadcn `Dialog` components (as in `SeriesAskTabPanel`).
- **Props**:

```ts
interface ClearChatConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}
```

## 5. Types
Prefer using existing DTOs from `src/types.ts` and introducing a **shared** set of chat view models that both Series Ask and Book Ask can use.

### Existing types to reuse (already in `src/types.ts`)
- `ApiErrorDto`, `ApiErrorResponseDto`
- `AiQueryScopeDto`
- `AiAnswerDto`
- `AiQueryResponseDtoSimple`
- `BookAskScopeViewModel`
- `BookHeaderViewModel`

### Existing validation schema (server-side; reuse shape client-side)
- `AiQueryBody` from `src/lib/validation/ai.schemas.ts` (zod schema + inferred type)

### New shared ViewModel types (recommended additions in `src/types.ts`)
Add these under a new section near AI types (or near existing Ask tab view models), to avoid duplicating “SeriesAiChat*” for Book:

#### `AiChatRoleViewModel`
```ts
export type AiChatRoleViewModel = "user" | "assistant";
```

#### `AiChatMessageStatusViewModel`
```ts
export type AiChatMessageStatusViewModel = "sent" | "pending" | "failed";
```

#### `AiChatMessageViewModel`
```ts
export interface AiChatMessageViewModel {
  id: string;
  role: AiChatRoleViewModel;
  content: string;
  createdAtMs: number;
  status: AiChatMessageStatusViewModel;
  lowConfidence?: boolean; // assistant-only
}
```

#### `AiChatStateViewModel`
```ts
export interface AiChatStateViewModel {
  messages: AiChatMessageViewModel[];
  draftText: string;
  isSubmitting: boolean;
  lastError: ApiErrorDto | null;
  lastSubmittedQueryText: string | null;
}
```

#### `AiChatComposerViewModel`
```ts
export interface AiChatComposerViewModel {
  trimmedLength: number;
  isEmpty: boolean;
  isTooLong: boolean;
  validationError: string | null;
  charCountLabel: string; // `${trimmedLength} / 500`
}
```

### Backwards-compatible aliases (optional but recommended)
To minimize churn in the existing Series Ask implementation, optionally alias existing types:

- `export type SeriesAiChatMessageViewModel = AiChatMessageViewModel;`
- `export type SeriesAiChatStateViewModel = AiChatStateViewModel;`
- `export type SeriesAskComposerViewModel = AiChatComposerViewModel;`

This lets `useSeriesAiChat` and `SeriesAskTabPanel` migrate gradually without duplicating logic for Book.

### View-specific helper types (optional)
If you want explicit scoping inputs for the chat hook:

```ts
export type AiChatScopeKindViewModel = "book" | "series";
export interface AiChatScopeInputViewModel {
  kind: AiChatScopeKindViewModel;
  bookId?: string;   // required when kind === "book"
  seriesId?: string; // required when kind === "series"
}
```

## 6. State Management
State should be local to the Ask tab (no global store).

### Recommended hooks

#### `useAiChat(scope: AiQueryScopeDto)` (shared)
- **Location**: `src/components/ai/hooks/useAiChat.ts` (new)
- **Responsibilities**:
  - Hold `AiChatStateViewModel`
  - Implement `submitQuestion()`:
    - validate `draftText`
    - append user message
    - append pending assistant message
    - call `POST /ai/query` with scope
    - replace pending assistant message with final answer (`lowConfidence` flag)
  - Implement `retry()` using `lastSubmittedQueryText`
  - Implement `clearChat()` and abort in-flight request
  - Provide derived values:
    - `lastAssistantMessage`
    - `canCopyLastAnswer`
    - `canClear`
    - `showLowConfidencePanel` (based on latest assistant message `lowConfidence === true`)
  - Cancellation:
    - Use `AbortController`, abort on unmount and on new request

Return shape (example):

```ts
interface UseAiChatReturn {
  messages: AiChatMessageViewModel[];
  draftText: string;
  isSubmitting: boolean;
  lastError: ApiErrorDto | null;
  canCopyLastAnswer: boolean;
  canClear: boolean;
  showLowConfidencePanel: boolean;
  lastAssistantMessage: AiChatMessageViewModel | null;
  setDraftText: (text: string) => void;
  submitQuestion: () => Promise<void>;
  retry: () => Promise<void>;
  clearChat: () => void;
}
```

#### `useBookAskChat(book, askScope)` (book-specific wrapper; optional)
If you want to keep `BookAskTabPanel` simple, add a thin wrapper hook:
- **Location**: `src/components/book/hooks/useBookAskChat.ts` (new)
- **Responsibilities**:
  - Decide the correct `AiQueryScopeDto` based on `askScope`:
    - book scope → `{ book_id: book.id, series_id: null }`
    - series scope → `{ book_id: null, series_id: book.seriesId }`
  - Manage transcripts per scope (recommended UX):
    - Keep separate in-memory transcripts for `"book"` and `"series"` so switching scope doesn’t mix messages.
    - Minimal structure:

```ts
type BookAskTranscriptsViewModel = Record<BookAskScopeViewModel, AiChatStateViewModel>;
```

  - Expose the “active” transcript based on current scope and forward actions to the shared `useAiChat` for that scope.

### Scope switching behavior (recommended)
- **Do not merge transcripts across scopes**.
- When switching scope:
  - preserve transcript for each scope in memory
  - keep `draftText` per scope (optional; nicer) or clear it on switch (simpler)
- When series scope becomes unavailable (book unlinked from series):
  - force scope back to `"book"` and show hint

## 7. API Integration

### Endpoint
- **Method**: `POST`
- **Client path**: `apiClient.postJson("/ai/query", body)` (base URL is `/api/v1`)

### Request type (frontend)
Use `AiQueryBody` shape:

```json
{
  "query_text": "string (trimmed, 1..500 chars)",
  "scope": {
    "book_id": "uuid|null",
    "series_id": "uuid|null"
  }
}
```

Mutual exclusion requirement (must satisfy `aiQueryBodySchema.refine`):
- Book scope: `book_id` non-null, `series_id` null
- Series scope: `series_id` non-null, `book_id` null

### Response type
Use `AiQueryResponseDtoSimple`:
- `answer.text: string`
- `answer.low_confidence: boolean`
- `usage.model: string`
- `usage.latency_ms: number`

### Error handling contract
`ApiClient` throws an `ApiErrorResponseDto` object; existing code casts errors as `{ error: ApiErrorDto }`.

Handle codes:
- `400 VALIDATION_ERROR`: show `InlineBanner`; should be prevented by UI validation.
- `404 NOT_FOUND`: show `InlineBanner`; scope references not found.
- `429 RATE_LIMITED`: show `InlineBanner` with retry/backoff guidance; keep transcript; allow manual retry.
- `500 INTERNAL_ERROR`: show `InlineBanner`; allow retry.

## 8. User Interactions

### Select scope
- **Action**: User toggles “This book” / “This series”.
- **Outcome**:
  - If series available: updates URL `scope=...` and switches transcript to that scope.
  - If series unavailable: series option is disabled; if still triggered (edge case), keep scope as `"book"` and show hint.

### Ask a question
- **Action**: Type in composer and press Enter (or click Send).
- **Outcome**:
  - Append user message immediately.
  - Append pending assistant bubble / typing indicator.
  - Disable composer during request.
  - On success: replace pending message with assistant answer.
  - On error: mark assistant bubble failed, show `InlineBanner`, keep transcript intact.

### Newline vs submit
- **Action**: Shift+Enter.
- **Outcome**: Insert newline; no submit.

### Copy answer
- **Action**: Click “Copy” on an assistant message or choose “Copy last answer” in Options.
- **Outcome**: Copy to clipboard; show transient “Copied!” state for that message.

### Clear chat
- **Action**: Options → “Clear chat”.
- **Outcome**: Confirm dialog; on confirm, clears transcript for the **current scope** only.

### Retry after rate limit / internal error
- **Action**: Click “Retry” on banner.
- **Outcome**: Re-submits the last submitted question for the current scope; transcript remains.

## 9. Conditions and Validation

### API-driven conditions to verify in UI
- **`query_text` required**:
  - Block submit if `trim().length === 0`
- **`query_text` max 500**:
  - Block submit if `trim().length > 500`
  - Display counter and validation message before calling API
- **Scope mutual exclusion**:
  - Ensure request body never sets both `book_id` and `series_id` to non-null
- **Series scope availability**:
  - If `book.seriesId === null`, “This series” must be disabled

### Low confidence vs error
- **Low confidence** (`answer.low_confidence === true`):
  - Render answer normally
  - Show `AiChatLowConfidencePanel` (non-error tone)
  - Do not show `InlineBanner` for low confidence
- **Error** (`ApiErrorDto` present):
  - Show `InlineBanner`
  - Keep transcript visible
  - Allow retry for retryable codes

## 10. Error Handling

### Client-side validation
- Empty input → show “Type a question to send”
- Too long → show “Max 500 characters”
- Never call API when invalid

### Server-side errors
- `RATE_LIMITED`:
  - Show `InlineBanner` (it already uses a friendly message)
  - Keep transcript and allow retry
- `NOT_FOUND`:
  - Show `InlineBanner`
  - Consider disabling composer if scope is invalid and cannot be recovered
- `VALIDATION_ERROR`:
  - Show `InlineBanner`
  - Treat as bug signal; UI should prevent it
- `INTERNAL_ERROR`:
  - Show `InlineBanner`
  - Allow retry

### Clipboard failures
- If `navigator.clipboard.writeText` fails: silently no-op (match existing Series Ask behavior) or add a small non-blocking hint (optional).

### In-flight cancellation
- Abort in-flight request on:
  - component unmount
  - clear chat
  - subsequent submit

## 11. Implementation Steps
1. **Confirm routing + URL contract**:
   - Ensure Book Ask is reachable at `/books/:bookId?tab=ask&scope=book|series` (routing already exists).
2. **Introduce shared “AiChat” view models (recommended)**:
   - Add `AiChatMessageViewModel`, `AiChatStateViewModel`, and `AiChatComposerViewModel` to `src/types.ts`.
   - Optionally alias existing Series Ask types to these to reduce duplication.
3. **Extract shared chat hook**:
   - Create `src/components/ai/hooks/useAiChat.ts` by generalizing `useSeriesAiChat`:
     - Accept `AiQueryScopeDto` input
     - Keep the exact behavior (pending assistant message, retry, clear, abort controller)
4. **Extract shared presentational components** (recommended for reuse):
   - Create:
     - `src/components/ai/chat/AiChatTranscript.tsx`
     - `src/components/ai/chat/AiChatMessageBubble.tsx`
     - `src/components/ai/chat/AiChatLowConfidencePanel.tsx`
     - `src/components/ai/chat/AiChatComposer.tsx`
     - `src/components/ai/chat/ClearChatConfirmDialog.tsx`
5. **Implement `BookAskScopeBar` + `ScopeSwitch`**:
   - Add `src/components/book/ask/BookAskScopeBar.tsx` (or keep it colocated in `BookAskTabPanel.tsx`).
   - Use shadcn `Tabs` for the scope of the Ask tab.
6. **Update `BookDetailPage` prop wiring**:
   - Pass `book`, `askScope`, and `setAskScope` into `BookAskTabPanel`.
7. **Implement `BookAskTabPanel`**:
   - Replace placeholder UI with the shared transcript/composer components and the scope bar.
   - Drive chat via shared `useAiChat` + book-specific scope selection.
   - Keep transcript per scope (recommended) to avoid mixing book/series conversations.
8. **Align error + retry behavior**:
   - Use `InlineBanner` and only pass `onRetry` for retryable codes (`RATE_LIMITED`, `INTERNAL_ERROR`).
9. **Implement low-confidence guidance**:
   - Show the panel only when the latest assistant message is flagged `lowConfidence === true`.
   - Use scope-aware guidance (suggest broadening to series only when possible).
10. **Citations placeholder (hidden)**:
   - Add a stub UI location in assistant bubble (e.g., under the answer) gated behind `false` or presence of `citations`.
11. **Polish UX + a11y**:
   - Ensure Enter/Shift+Enter behavior matches requirements.
   - Ensure disabled states are correct while submitting.
   - Keep rendering safe (plain text only).


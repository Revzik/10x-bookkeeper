# View Implementation Plan — Series Detail (Ask Tab)

## 1. Overview
The **Series Detail — Ask Tab** view is a chat-like Q&A interface scoped to a **single series**. It allows a user to type a question and receive an AI-generated answer grounded in the user’s notes for that series.

Key UX points:
- **Transcript is not persisted** (clears on refresh by default; optional in-memory only).
- **Low confidence is not an error**: it is a distinct, helpful state with guidance.
- **Rate limited is an error**: show retry/backoff guidance while keeping prior messages.
- **Safe rendering**: treat AI answer text as untrusted; render as plain text.
- **Citations are planned but postponed**: show a UI placeholder (“Sources coming soon”).

## 2. View Routing
- **View path**: `/series/:seriesId?tab=ask`
- **Where it renders**: inside `SeriesDetailPage` (already switches between `books` and `ask` based on `useSeriesUrlState()`).

Routing/URL state constraints:
- Only `tab` is URL-backed for Series Detail.
- Ask tab does **not** require additional URL query params.

## 3. Component Structure
High-level component tree (Ask tab only; within existing `SeriesDetailPage`):

```
SeriesDetailPage
└─ SeriesAskTabPanel
   ├─ SeriesAskHeaderBar
   │  ├─ CopyLastAnswerButton
   │  └─ ClearChatButton (confirm)
   ├─ InlineBanner (error: RATE_LIMITED / INTERNAL_ERROR / VALIDATION_ERROR / NOT_FOUND)
   ├─ SeriesChatTranscript
   │  ├─ ChatMessageBubble (user)
   │  ├─ ChatMessageBubble (assistant)
   │  └─ TypingIndicatorBubble (assistant, while request in flight)
   ├─ LowConfidencePanel (only when last answer is low_confidence)
   └─ SeriesAskComposer
      ├─ Textarea (multiline)
      └─ SubmitButton (disabled while in flight)
```

Notes:
- `InlineBanner` should be shown for real API failures (especially `RATE_LIMITED`), but **must not clear** or hide the transcript.
- `LowConfidencePanel` is **separate** from `InlineBanner` and only depends on the last assistant answer’s `low_confidence` flag.

## 4. Component Details

### `SeriesAskTabPanel`
- **Purpose**: Orchestrates the Ask tab: owns chat state, integrates with `POST /ai/query`, renders transcript/composer, and handles error/low-confidence states.
- **Main elements**:
  - Root container: `<div className="space-y-4">`
  - `SeriesAskHeaderBar`
  - Optional error banner: `InlineBanner`
  - `SeriesChatTranscript`
  - Optional `LowConfidencePanel`
  - `SeriesAskComposer`
- **Handled events**:
  - `onSubmitQuestion(text)`:
    - validates input
    - appends user message
    - triggers API call
    - appends assistant message (or shows typing indicator until response arrives)
  - `onCopyLastAnswer()`:
    - copies last assistant message text to clipboard
  - `onClearChat()`:
    - confirm destructive action
    - clears transcript and resets related state
  - `onRetry()` (from `InlineBanner`):
    - retries the last failed request (if there is a stored “pending question”)
- **Validation conditions (UI-level, aligned to API)**:
  - Disable submit if:
    - `isSubmitting === true`
    - OR `draftText.trim().length === 0`
    - OR `draftText.trim().length > 500`
  - On submit:
    - Use `trim()` for the request `query_text` (match server schema).
    - Enforce max 500 characters before calling the API (avoid round-trip validation error).
  - Ensure scope sets **only** `series_id` (do not set `book_id` to a non-null value).
- **Types**:
  - Request DTO: `AiQueryBody` (from `src/lib/validation/ai.schemas.ts`) or `AiQueryRequestDto` (new client-only alias, see Types section).
  - Response DTO: `AiQueryResponseDtoSimple` (from `src/types.ts`).
  - Errors: `ApiErrorDto` / `ApiErrorResponseDto` (from `src/types.ts`).
  - ViewModels (new): `SeriesAiChatMessageViewModel`, `SeriesAiChatStateViewModel`, `SeriesAskComposerViewModel`.
- **Props (component interface)**:
  - `seriesId: string`

### `SeriesAskHeaderBar`
- **Purpose**: Provides message-level actions that apply to the whole transcript (copy last answer, clear chat).
- **Main elements**:
  - Container: `<div className="flex items-center justify-end gap-2">`
  - `Button` (outline): “Copy answer”
  - `Button` (outline/destructive-ish): “Clear chat”
- **Handled events**:
  - `onCopyLastAnswer()`
  - `onClearChat()`
- **Validation conditions**:
  - Copy disabled if there is no assistant answer yet.
  - Clear disabled if transcript is already empty (optional).
- **Types**:
  - Uses derived booleans from chat state: `hasAnswer`, `isEmpty`, `isSubmitting`.
- **Props**:
  - `canCopy: boolean`
  - `canClear: boolean`
  - `isSubmitting: boolean`
  - `onCopyLastAnswer: () => void`
  - `onClearChat: () => void`

### `SeriesChatTranscript`
- **Purpose**: Renders the chat transcript, including loading/typing state, and ensures safe answer rendering.
- **Main elements**:
  - Scroll container: `<div className="max-h-[55vh] overflow-auto rounded-lg border p-3">`
  - List container: `<div className="space-y-3">`
  - `ChatMessageBubble` for each message
  - `TypingIndicatorBubble` while `isSubmitting` is true (or while assistant message is pending)
- **Handled events**:
  - None required for MVP (transcript is display-only).
  - Optional: per-message copy in the future; for now keep “Copy answer” in the header.
- **Validation conditions**:
  - Render assistant text as plain text:
    - Use `<p className="whitespace-pre-wrap break-words">` (no HTML injection).
  - If answer contains “markdown-like” content, still render as plain text for now.
- **Types**:
  - `SeriesAiChatMessageViewModel[]`
- **Props**:
  - `messages: SeriesAiChatMessageViewModel[]`
  - `showTyping: boolean`

### `ChatMessageBubble`
- **Purpose**: Displays one message (user or assistant) with distinct styling and accessible semantics.
- **Main elements**:
  - Wrapper: `<div role="group" aria-label="Chat message">`
  - Bubble: `<div className="rounded-lg px-3 py-2 ...">`
  - Optional meta row (small text): “You”, “Assistant”, timestamp (optional for MVP)
- **Handled events**:
  - None required for MVP.
- **Validation conditions**:
  - Always render `content` via text nodes (no `dangerouslySetInnerHTML`).
- **Types**:
  - `SeriesAiChatMessageViewModel`
- **Props**:
  - `message: SeriesAiChatMessageViewModel`

### `TypingIndicatorBubble`
- **Purpose**: Shows a non-blocking “Assistant is typing…” state while a request is in flight.
- **Main elements**:
  - Minimal skeleton/ellipsis animation using Tailwind utility classes.
- **Handled events**: none
- **Validation conditions**: none
- **Types**: none
- **Props**:
  - `visible: boolean`

### `LowConfidencePanel`
- **Purpose**: Friendly guidance when the AI response indicates insufficient grounding in the user’s notes.
- **Main elements**:
  - `Card` (or bordered panel) with:
    - Title: “Not enough in your notes (yet)”
    - Guidance bullets:
      - Add notes to the relevant chapter(s)
      - Confirm you’re on the right series
      - Try a more specific phrasing (names, places, chapter number)
    - Optional CTA: link/button “Go to Books tab” (switches tab) or “Add notes” (future)
- **Handled events**:
  - Optional: `onGoToBooks()` -> `setActiveTab("books")` via parent handler (requires a callback from `SeriesDetailPage` or access to `useSeriesUrlState` in the Ask tab; prefer using the existing hook in the Ask tab if needed).
- **Validation conditions**:
  - Shown only when the **latest assistant message** is flagged `lowConfidence === true`.
  - Must not be styled as destructive error; distinct color palette (info/warning) and gentle tone.
- **Types**:
  - `SeriesLowConfidenceViewModel` (optional; can be derived inline).
- **Props**:
  - `visible: boolean`
  - `onGoToBooks?: () => void`

### `SeriesAskComposer`
- **Purpose**: Multi-line input for questions, with Enter-to-submit and Shift+Enter newline behavior; disabled while request is in flight.
- **Main elements**:
  - `<form>` wrapper to support Enter submission
  - `Textarea` (`src/components/ui/textarea.tsx`)
  - Helper text row:
    - Character count \(e.g. “42 / 500”\)
    - Hint: “Enter to send • Shift+Enter for newline”
  - `Button` submit
- **Handled events**:
  - `onChange` -> update `draftText`
  - `onKeyDown`:
    - `Enter` without `Shift` -> prevent default and submit
    - `Shift+Enter` -> allow newline
  - `onSubmit` -> call parent `onSubmitQuestion(draftText)`
- **Validation conditions (detailed)**:
  - `query_text`:
    - `trim().length >= 1`
    - `trim().length <= 500`
  - When invalid:
    - Show inline validation message (non-destructive): “Type a question to send” / “Max 500 characters”
    - Keep user text; do not clear.
  - When request in flight:
    - Disable textarea and submit button
    - Keep the current transcript visible
- **Types**:
  - `SeriesAskComposerViewModel`
- **Props**:
  - `value: string`
  - `onChange: (value: string) => void`
  - `onSubmit: () => void`
  - `disabled: boolean`
  - `validationError: string | null`
  - `charCountLabel: string`

## 5. Types
Use existing shared DTOs from `src/types.ts` and introduce minimal view-specific ViewModels for the Ask tab. Prefer colocating Ask tab view models under the “VIEW MODELS (Series Detail View)” section in `src/types.ts` to match existing organization.

### Existing DTOs / types (already in `src/types.ts`)
- `Uuid`
- `ApiErrorDto`, `ApiErrorResponseDto`
- `AiQueryScopeDto`
- `AiAnswerDto`
- `AiQueryResponseDtoSimple`

### Existing validation schema (already in `src/lib/validation/ai.schemas.ts`)
- `AiQueryBody` (Zod-inferred type; includes `query_text` and optional `scope` with UUID validation and mutual exclusion)

### New ViewModel types (recommended additions)

#### `SeriesAiChatRoleViewModel`
Represents who authored a message.
- `type SeriesAiChatRoleViewModel = "user" | "assistant"`

#### `SeriesAiChatMessageStatusViewModel`
Represents lifecycle of a message in the UI.
- `type SeriesAiChatMessageStatusViewModel = "sent" | "pending" | "failed"`

#### `SeriesAiChatMessageViewModel`
Represents one transcript item.
- `id: string` (client-generated; e.g. `crypto.randomUUID()` when available)
- `role: SeriesAiChatRoleViewModel`
- `content: string` (plain text)
- `createdAtMs: number` (for ordering and optional timestamps)
- `status: SeriesAiChatMessageStatusViewModel`
- `lowConfidence?: boolean` (only relevant for assistant messages; derived from API response)

#### `SeriesAiChatStateViewModel`
Aggregated local state owned by `SeriesAskTabPanel` / hook.
- `messages: SeriesAiChatMessageViewModel[]`
- `draftText: string`
- `isSubmitting: boolean`
- `lastError: ApiErrorDto | null` (represents the most recent API error; do not clear transcript)
- `lastSubmittedQueryText: string | null` (for retry)
- `lastResponseLowConfidence: boolean` (derived: last assistant’s `lowConfidence === true`)

#### `SeriesAskComposerViewModel`
Derived state for input rendering.
- `trimmedLength: number`
- `isEmpty: boolean`
- `isTooLong: boolean`
- `validationError: string | null`
- `charCountLabel: string` (e.g. `${trimmedLength} / 500`)

### Client request/response aliases (optional, for readability)
If you prefer not to rely on Zod-inferred types in UI components:
- `type AiQueryRequestDto = { query_text: string; scope: { book_id: null; series_id: string } }`
- `type AiQueryResponseDto = AiQueryResponseDtoSimple` (PoC contract)

## 6. State Management
State is local to the Ask tab (no global store needed).

### Recommended hook: `useSeriesAiChat(seriesId: string)`
- **Location**: `src/components/series/hooks/useSeriesAiChat.ts`
- **Responsibilities**:
  - Hold `SeriesAiChatStateViewModel`:
    - `messages`, `draftText`, `isSubmitting`, `lastError`, `lastSubmittedQueryText`
  - Handle submit:
    - validate `draftText`
    - append user message
    - append “pending” assistant message (or enable typing indicator)
    - call API
    - replace pending assistant message with final answer
  - Handle retry:
    - re-submit `lastSubmittedQueryText` without modifying transcript history beyond adding a new attempt (recommended) or by updating the failed assistant message (optional)
  - Handle clear:
    - abort inflight request (via `AbortController`)
    - reset state
  - Provide derived booleans:
    - `canCopyLastAnswer`, `canClear`, `showLowConfidencePanel`
- **Abort/cancellation**:
  - Use an `AbortController` per request.
  - Abort on unmount to avoid setting state after unmount.

### Why a hook
Keeping this logic in a hook mirrors existing patterns (e.g., `useBooksList`, `useSeriesById`) and keeps `SeriesAskTabPanel` focused on layout/props wiring.

## 7. API Integration

### Endpoint
- **Method**: `POST`
- **Path**: `/api/v1/ai/query` (client calls via `apiClient.postJson` using base `/api/v1`)

### Request (frontend)
- **Body shape** (must satisfy server `aiQueryBodySchema`):

```json
{
  "query_text": "string (trimmed, 1..500 chars)",
  "scope": {
    "book_id": null,
    "series_id": "uuid"
  }
}
```

Frontend notes:
- Always scope by series for this view: `series_id = seriesId`.
- Ensure `book_id` is `null` (or omit entirely). Do not set both to non-null.

### Response (PoC)
- Use `AiQueryResponseDtoSimple`:
  - `answer.text: string`
  - `answer.low_confidence: boolean`
  - `usage.model: string`
  - `usage.latency_ms: number`

### Error handling contract
`ApiClient` throws an `ApiErrorResponseDto`-shaped object. Existing hooks cast `err as { error: ApiErrorDto }`.

Handle error codes:
- `400 VALIDATION_ERROR`: show inline error (banner) but keep transcript; likely indicates a client bug (should be prevented by UI validation).
- `404 NOT_FOUND`: series scope missing/invalid; show banner and consider disabling the composer until user navigates away.
- `429 RATE_LIMITED`: show banner with backoff guidance; keep transcript and input text; allow retry.
- `500 INTERNAL_ERROR`: show banner and allow retry.

## 8. User Interactions

### Ask a question
- **Action**: User types in the composer and presses Enter.
- **Outcome**:
  - User message appears immediately in transcript.
  - Composer disables.
  - Typing indicator appears (or pending assistant message).
  - On success, assistant answer appears and composer re-enables.

### Newline vs submit
- **Action**: Shift+Enter in textarea.
- **Outcome**: Inserts newline; does not submit.

### Copy answer
- **Action**: Click “Copy answer”.
- **Outcome**:
  - Copies latest assistant answer to clipboard.
  - Optional: transient UI feedback (e.g., button label changes to “Copied” for 1–2 seconds).
  - If clipboard API is unavailable, fallback to a hidden textarea copy method (optional).

### Clear chat
- **Action**: Click “Clear chat”.
- **Outcome**:
  - Confirm dialog (“This will clear the current chat transcript. This cannot be undone.”).
  - On confirm, clears transcript and resets errors/low-confidence panel; abort in-flight request if needed.

### Rate limited retry
- **Action**: User clicks “Retry” on the banner.
- **Outcome**:
  - Re-submits last question (or prompts the user to retry manually by re-enabling the composer and keeping the draft).
  - Transcript remains intact.

## 9. Conditions and Validation

### API-level conditions to satisfy (and how UI verifies them)
- **`query_text` required**:
  - UI blocks submission if `trim().length === 0`.
- **`query_text` max length 500**:
  - UI blocks submission if `trim().length > 500`.
  - UI shows counter and validation message before calling API.
- **Scope mutual exclusion**:
  - Ask tab always uses series scope only.
  - UI never sets both `book_id` and `series_id` to non-null.
- **UUID validity**:
  - `seriesId` comes from route; still treat as untrusted:
    - If API returns `VALIDATION_ERROR`, show banner; do not crash.

### Low confidence vs error conditions
- **Low confidence** (`answer.low_confidence === true`):
  - Render assistant answer normally.
  - Show `LowConfidencePanel` with guidance (non-error tone).
  - Do not show `InlineBanner` for low confidence.
- **Error** (`ApiErrorDto` present):
  - Show `InlineBanner`.
  - Keep prior transcript visible.
  - Keep user’s last question text available for retry.

## 10. Error Handling

### Validation errors (client-side)
- Empty input: show inline message under composer; do not call API.
- Too long: show inline message; do not call API.

### Server-side errors (from API)
Keep transcript; do not discard messages.

- **RATE_LIMITED**:
  - Use `InlineBanner` (it already special-cases “Rate Limited”).
  - Keep input text; allow retry.
  - Consider disabling auto-retry; user-initiated retry only.
- **NOT_FOUND**:
  - Use `InlineBanner`.
  - Suggest navigating back to Library or refreshing.
  - Optional: disable composer since the scope is invalid.
- **VALIDATION_ERROR**:
  - Use `InlineBanner`.
  - Should be rare if UI validation is correct; treat as a bug signal.
- **INTERNAL_ERROR / unknown**:
  - Use `InlineBanner`.
  - Allow retry.

### Clipboard failures
- If `navigator.clipboard.writeText` fails:
  - Show a non-blocking fallback (optional) or silently no-op; do not crash.

### In-flight cancellation / race conditions
- If user clears chat while a request is in flight:
  - Abort the request and reset state.
- If multiple submits are attempted:
  - Prevent by disabling submit while `isSubmitting`.

## 11. Implementation Steps
1. **Add Ask tab view models to shared types**:
   - Add `SeriesAiChatMessageViewModel` and related union types under “VIEW MODELS (Series Detail View)” in `src/types.ts`.
2. **Create the chat hook**:
   - Implement `src/components/series/hooks/useSeriesAiChat.ts`.
   - Export it from `src/components/series/hooks/index.ts`.
3. **Implement `SeriesAskTabPanel`**:
   - Replace the current stub in `src/components/series/SeriesAskTabPanel.tsx`.
   - Wire `useSeriesAiChat(seriesId)` and render the component tree described above.
4. **Add UI subcomponents (optional but recommended for clarity/testability)**:
   - Create:
     - `src/components/series/ask/SeriesAskHeaderBar.tsx`
     - `src/components/series/ask/SeriesChatTranscript.tsx`
     - `src/components/series/ask/ChatMessageBubble.tsx`
     - `src/components/series/ask/LowConfidencePanel.tsx`
     - `src/components/series/ask/SeriesAskComposer.tsx`
   - Keep them purely presentational; logic stays in the hook/panel.
5. **Implement safe rendering**:
   - Ensure assistant message uses plain text rendering (no HTML injection).
6. **Implement Enter/Shift+Enter behavior**:
   - In `SeriesAskComposer`, handle `onKeyDown` with preventDefault for Enter without Shift.
7. **Integrate API call**:
   - Use `apiClient.postJson<AiQueryBody, AiQueryResponseDtoSimple>("/ai/query", body)`.
   - On success, append assistant message with `lowConfidence` flag.
8. **Add error + retry behavior**:
   - Store `lastSubmittedQueryText`.
   - On error, set `lastError` and mark assistant pending/failed message appropriately.
   - Use `InlineBanner` with `onRetry` to re-submit.
9. **Add Copy/Clear actions**:
   - Copy last assistant answer.
   - Clear transcript with confirm and abort.
10. **Add low-confidence panel**:
   - Detect `lastResponseLowConfidence` and show guidance panel (non-error styling).
11. **Polish UX and a11y**:
   - Focus management: after submit, keep focus in composer when it re-enables.
   - `aria-label` for buttons (Copy answer, Clear chat, Submit).
   - Ensure scroll container auto-scrolls to newest message (optional but recommended).


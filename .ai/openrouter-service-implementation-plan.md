# OpenRouter Service — Implementation Plan

## 1. Service description

The **OpenRouter service** is a server-side TypeScript module responsible for making **LLM chat completion** requests to the **OpenRouter API** and returning:

- **Plain text** completions, or
- **Structured JSON** completions using `response_format` with a JSON Schema (strict), suitable for deterministic parsing.

This service must be used **only on the server** (Astro API routes or Supabase Edge Functions) to keep the **OpenRouter API key** off the client. It should be placed under `src/lib/` (e.g., `src/lib/openrouter/openrouter.service.ts`) and use **Zod** to validate inputs/outputs.

### Key components (and purpose)

1. **Configuration + defaults**
   - Centralizes `baseUrl`, `apiKey`, default model, and default model parameters.
2. **Message builder**
   - Converts app-level inputs into OpenRouter `messages[]` (system/user/assistant/tool if needed).
3. **Request builder**
   - Builds a valid OpenRouter Chat Completions payload including `model`, `messages`, `response_format`, and model parameters.
4. **HTTP client wrapper**
   - Executes `fetch` with required headers, timeout, retries/backoff (safe), and captures request/response metadata for debugging.
5. **Response parser**
   - Extracts the assistant message content (text or JSON string), and normalizes the output format.
6. **Structured-output validator**
   - When using `response_format`, validates returned JSON with Zod (and/or a JSON schema validator if desired).
7. **Error model**
   - Defines typed errors (auth, validation, rate limit, upstream, timeout) with safe messages for UI and richer server logs.

### Component details, challenges, and solutions

1. **Configuration + defaults**
   - **Functionality**: Provide a single place to define OpenRouter base URL, API key, default model, default parameters, and optional attribution headers (app title + referer). Enforce “server-only” usage by reading configuration only in server contexts (Astro endpoints / edge functions).
   - **Challenges**
     1. Misconfiguration (missing key, wrong base URL, unsupported model).
     2. Accidentally bundling secrets into client code.
     3. Parameter drift (different call sites pass inconsistent defaults).
   - **Solutions**
     1. Validate config at construction time and throw a typed `OpenRouterConfigError` with actionable message (server-side).
     2. Keep the service in `src/lib/` but only import it from server entry points (`src/pages/api/*`, edge functions); do not export it through client bundles.
     3. Centralize defaults in `defaultParams` and merge per-call overrides; document recommended defaults for “text” vs “json”.

2. **Message builder**
   - **Functionality**: Build `messages[]` in the required order, enforce roles, and normalize whitespace. Optionally truncate history to keep token usage bounded.
   - **Challenges**
     1. Incorrect role ordering causing worse model behavior.
     2. Unbounded history leading to high latency/cost.
     3. Empty/duplicate content reducing completion quality.
   - **Solutions**
     1. Always prepend optional `system`, then `history`, then final `user`.
     2. Apply a “max turns” cap (and/or approximate token cap) before calling OpenRouter.
     3. Trim strings and filter empty messages; optionally dedupe consecutive identical user messages.

3. **Request builder**
   - **Functionality**: Assemble the chat completion payload: `model`, `messages`, optional `response_format`, and model parameters. Ensure only supported parameters are included and remove `undefined` values.
   - **Challenges**
     1. Passing invalid parameter names/values that the upstream rejects.
     2. Incorrect `response_format` shape leading to non-structured responses.
     3. Model-specific incompatibilities (some models may not honor all params).
   - **Solutions**
     1. Define a `ModelParams` allowlist and validate with Zod before sending.
     2. Generate `response_format` via a dedicated helper that enforces the exact object shape.
     3. Keep parameters minimal for cross-model compatibility.

4. **HTTP client wrapper**
   - **Functionality**: Execute `fetch` with correct headers, timeout, safe retry/backoff, and structured logging context (model, timing, request id).
   - **Challenges**
     1. Transient network failures causing flakiness.
     2. Hanging requests degrading UX (no timeout).
     3. Over-retrying amplifies load/cost during incidents.
   - **Solutions**
     1. Retry only transient scenarios (network, 429, 5xx) with low max attempts.
     2. Use `AbortController` for a hard timeout; treat abort as `OpenRouterTimeoutError`.
     3. Cap retries (e.g., 2–3), use exponential backoff + jitter, and respect `Retry-After` headers.

5. **Response parser**
   - **Functionality**: Convert the OpenRouter response into a stable internal shape: assistant content text, usage, model id, request id. Guard against missing `choices` and unexpected payloads.
   - **Challenges**
     1. Upstream response shape changes or partial/malformed JSON.
     2. Missing assistant content (empty completion).
     3. Losing observability (no request id / usage captured).
   - **Solutions**
     1. Validate critical paths with Zod; on mismatch throw `OpenRouterUpstreamError` with safe snippet.
     2. Return a specific “empty completion” error so callers can retry/fallback.
     3. Capture and return `usage` and any request identifiers to callers for logging/diagnostics.

6. **Structured-output validator**
   - **Functionality**: When `response_format` is used, parse returned content as JSON and validate with Zod (and optionally with a JSON schema validator for additional guarantees).
   - **Challenges**
     1. Model returns non-JSON (or JSON wrapped in prose/code fences).
     2. JSON parses but doesn’t match the schema (missing fields, wrong types).
     3. Silent partial compliance (extra properties) undermines consumers.
   - **Solutions**
     1. Attempt `JSON.parse`, then optionally extract the first JSON object/array substring; throw `OpenRouterParseError` if still invalid.
     2. Validate with Zod and throw `OpenRouterSchemaMismatchError` including Zod issues.
     3. Use strict schemas (`additionalProperties: false` + explicit `required`) and keep `strict: true` in `response_format`.

7. **Error model**
   - **Functionality**: Provide typed, actionable errors for callers (API routes) and ensure safe user-facing messages while keeping rich server-side logs.
   - **Challenges**
     1. Conflating user errors (400) with upstream errors (5xx), leading to wrong status codes.
     2. Leaking secrets or sensitive prompts into logs or client responses.
     3. Inconsistent error handling across routes.
   - **Solutions**
     1. Map typed errors to HTTP status codes deterministically.
     2. Redact API key and large prompt content; log only bounded snippets and metadata.
     3. Provide a single helper to translate `unknown` → typed error → `{ status, body }` response shape.

## 2. Constructor description

Create a class that accepts a config object and optionally injected dependencies (recommended for testing).

### Constructor parameters (recommended)

- **`apiKey: string`**: OpenRouter API key (required).
- **`baseUrl?: string`**: Defaults to `https://openrouter.ai/api/v1`.
- **`defaultModel?: string`**: E.g. `openai/gpt-4o-mini` or another OpenRouter model ID.
- **`defaultParams?: ModelParams`**: Defaults for temperature, top_p, max_tokens, etc.
- **`appName?: string`** / **`appUrl?: string`**: Optional but recommended for OpenRouter headers.
- **`fetchImpl?: typeof fetch`**: Inject for testing.
- **`timeoutMs?: number`**: Defaults to 30–60s depending on UX.
- **`retry?: RetryPolicy`**: Retry/backoff policy for transient errors (429/5xx/timeouts).

### Example config shape (technology-agnostic)

- Read from environment (server-only):
  - `OPENROUTER_API_KEY`

## 3. Public methods and fields

### Public fields (minimal)

- **`defaultModel: string`**
- **`baseUrl: string`**

### Public methods (recommended)

1. **`chatJson<T>(input): Promise<ChatJsonResult<T>>`**
   - **Purpose**: Run a completion using OpenRouter `response_format` (JSON schema strict) and return **validated JSON**.
   - **Input (recommended)**:
     - `system?: string`
     - `user: string`
     - `history?: ChatMessage[]`
     - `schemaName: string`
     - `jsonSchema: object` (JSON Schema Draft-compatible object)
     - `zodSchema: z.ZodType<T>` (validation after parse)
     - `model?: string`
     - `params?: ModelParams`
   - **Output**:
     - `data: T`
     - `rawText?: string` (the model’s raw message content for debugging)
     - `model: string`
     - `usage?: ...`

## 4. Private methods and fields

### Private fields (recommended)

- **`apiKey: string`** (never exposed to client)
- **`fetchImpl: typeof fetch`**
- **`timeoutMs: number`**
- **`retryPolicy: RetryPolicy`**
- **`defaultParams: ModelParams`**

### Private methods (recommended)

1. **`buildMessages({ system, history, user }): OpenRouterMessage[]`**
   - Ensures correct ordering:
     - optional `system`
     - optional `history` (already role-tagged)
     - required final `user`
   - Guardrails:
     - Trim empty strings
     - Enforce max history length if needed

2. **`buildRequestBody({ model, messages, params, responseFormat? }): object`**
   - Merges `params` over defaults, removes `undefined` fields.
   - Adds `response_format` only when needed.

3. **`request(path, body): Promise<Response>`**
   - Adds headers:
     - `Authorization: Bearer <OPENROUTER_API_KEY>`
     - `Content-Type: application/json`
     - `HTTP-Referer: <appUrl>` (recommended by OpenRouter)
     - `X-Title: <appName>` (recommended)
   - Implements timeout via `AbortController`.
   - Implements retry/backoff for selected status codes.

4. **`parseChatResponse(responseJson): { contentText: string; usage?; model?; requestId? }`**
   - Extracts `choices[0].message.content` (and guards against missing fields).

5. **`parseJsonFromModel(contentText): unknown`**
   - Strategy:
     - First attempt `JSON.parse(contentText)`
     - If it fails, attempt to extract the first top-level JSON object/array substring, then parse
   - If still invalid, throw a typed parse error that includes safe diagnostics (length, snippet).

## 5. Error handling

### Error scenarios (service-wide)

1. **Missing configuration**
   - `OPENROUTER_API_KEY` not set, base URL invalid, etc.
2. **Invalid input**
   - Empty user prompt, invalid model name format, invalid schema object.
3. **Network errors**
   - DNS failures, connection reset, fetch throws.
4. **Timeout**
   - Request exceeds `timeoutMs` and is aborted.
5. **Authentication/authorization**
   - 401/403 from OpenRouter (bad key, revoked key, or restricted model access).
6. **Rate limiting**
   - 429 from OpenRouter; may include retry-after headers.
7. **Upstream/server errors**
   - 5xx errors, malformed JSON responses.
8. **Structured output violations**
   - Model returns non-JSON or JSON that does not match schema (`strict: true` still can fail).

### Recommended error model

Create error classes (or a discriminated union) such as:

- `OpenRouterConfigError`
- `OpenRouterValidationError`
- `OpenRouterAuthError`
- `OpenRouterRateLimitError` (include `retryAfterMs?`)
- `OpenRouterTimeoutError`
- `OpenRouterUpstreamError` (include `status`, `bodySnippet?`, `requestId?`)
- `OpenRouterParseError`
- `OpenRouterSchemaMismatchError` (include Zod issues)

### Mapping to API route responses (Astro)

- 400: validation/config (if request-dependent)
- 401/403: auth errors
- 429: rate limit errors (surface `Retry-After` when available)
- 502/503: upstream failures
- 504: timeouts

Log **full diagnostics server-side** (status, requestId, model, timing), but return **safe, user-friendly messages** to clients.

## 6. Security considerations

- **Server-only key handling**
  - Never expose `OPENROUTER_API_KEY` to the browser.
  - Only call OpenRouter from Astro API routes (`src/pages/api/*`) or Supabase Edge Functions.
- **Input constraints**
  - Apply max length limits for `system`, `user`, and `history` to prevent abuse and runaway token costs.
- **Data privacy**
  - Avoid sending sensitive user data unless required; redact secrets in logs.
  - If sending note content, ensure user authorization is verified in the API route before calling the service.
- **SSRF / URL safety**
  - Base URL should be fixed/configured, not user-controlled.
- **Replay / abuse**
  - Consider per-user rate limiting in API routes (e.g., by user id).
- **Dependency safety**
  - Prefer native `fetch` and small utilities; validate all externally-sourced JSON with Zod.

## 7. Step-by-step implementation plan

### Step 1 — Define types and schemas

- Create `src/lib/openrouter/openrouter.types.ts`:
  - `ChatMessage` (app-level): `{ role: 'system'|'user'|'assistant'; content: string }`
  - `ModelParams`: `temperature?`, `top_p?`, `max_tokens?`, `frequency_penalty?`, `presence_penalty?`, `seed?`, etc.
  - Zod schemas for inputs (user prompt required, non-empty).

### Step 2 — Define error types

- Create `src/lib/openrouter/openrouter.errors.ts`:
  - Implement typed errors listed above.
  - Add helpers to map unknown errors → typed errors.

### Step 3 — Implement the service class

- Create `src/lib/openrouter/openrouter.service.ts`:
  - Constructor validates config early (guard clauses).
  - Implement `chatText` and `chatJson` using:
    - `buildMessages`
    - `buildRequestBody`
    - `request`
    - `parseChatResponse`
    - `parseJsonFromModel` (for structured)
    - Zod validation for structured outputs

### Step 4 — Incorporate OpenRouter API expectations (message + formatting)

#### A) System message

**Approach**
- Include as the first message in `messages[]` with role `system`.
- Keep it stable; avoid user-specific secrets.

**Example**
1. `system`: “You are a helpful reading assistant. Use only the data provided in user notes; if unsure, say you don’t know.”

#### B) User message

**Approach**
- Append as the last message with role `user`.
- Include retrieved context (RAG) inside the user message (or as system, depending on your prompting strategy).

**Example**
2. `user`: “How did Bilbo get the ring?”

#### C) Structured responses via `response_format` (JSON schema)

**Approach options**
- **Method 1 (recommended)**: `chatJson` requires:
  - `schemaName`
  - `jsonSchema` object
  - `zodSchema` for runtime validation
- Always pass the `response_format` exactly in this shape:

3. Example `response_format` (exact required pattern)

```js
{
  type: "json_schema",
  json_schema: {
    name: "AnswerWithCitations",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        answer: { type: "string" },
        citations: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              noteId: { type: "string" },
              quote: { type: "string" }
            },
            required: ["noteId", "quote"]
          }
        }
      },
      required: ["answer", "citations"]
    }
  }
}
```

**Implementation notes**
- Ensure `additionalProperties: false` and `required` are set to keep outputs tight.
- Still validate with Zod because models may occasionally return invalid JSON or mismatched shape.

#### D) Model name

**Approach**
- Default model from config.

**Example**
4. `model`: `"openai/gpt-4o-mini"` (or a chosen OpenRouter model id)

#### E) Model parameters

**Approach**
- Support a limited, explicit set of parameters and merge with defaults.
- Avoid passing `undefined` fields to reduce payload noise.

**Example**
5. `params` (example)
- `temperature: 0.2` (lower for deterministic JSON)
- `top_p: 0.9`
- `max_tokens: 600`
- `seed: 1234` (if supported by selected model)

### Step 5 — Implement retries/backoff safely

- Retry only when it makes sense:
  - Network errors, timeouts (limited), 429, 5xx
- Use exponential backoff with jitter; cap attempts (e.g., 2–3 tries).
- Respect `Retry-After` on 429 when present.

### Step 6 — Integrate into Astro API routes

- Create/extend an endpoint in `src/pages/api/*` that:
  - Authenticates the user via Supabase (`context.locals.supabase`) per backend rules.
  - Validates request body with Zod.
  - Calls `OpenRouterService.chatText` or `chatJson`.
  - Returns safe errors and appropriate status codes.

### Step 7 — Observability and cost controls

- Log (server-only):
  - model, latency, status, requestId, token usage (if present)
- Add guardrails:
  - prompt size caps
  - max history turns
  - max tokens defaults

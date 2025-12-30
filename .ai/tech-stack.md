# Tech Stack - Bookkeeper

This document captures the current technology choices for the Bookkeeper MVP and why each is used.

## Frontend

- **Astro 5**
  - **What it is**: A web framework that builds fast pages using a server-first model with optional “islands” of interactivity.
  - **Why here**: Provides routing/layouts and a performance-oriented baseline, while still allowing React for interactive parts of the app (notes editor, chat UI, timers).

- **React 19**
  - **What it is**: A component-based UI library for building interactive user interfaces.
  - **Why here**: Powers the interactive “app” surfaces (CRUD forms, note editor, chat experience) that benefit from rich client-side state.

- **TypeScript 5**
  - **What it is**: JavaScript with static typing.
  - **Why here**: Reduces runtime bugs and improves developer velocity/maintainability as the schema-heavy app grows (Series/Book/Chapter/Notes/Session models).

- **Tailwind CSS 4**
  - **What it is**: Utility-first CSS framework.
  - **Why here**: Enables rapid UI iteration and consistent styling across the responsive app without maintaining lots of bespoke CSS.

- **shadcn/ui**
  - **What it is**: A set of accessible UI component patterns built on Radix primitives and Tailwind.
  - **Why here**: Accelerates building a polished MVP UI (forms, dialogs, navigation, toast states, chat layout) with good accessibility defaults.

## Backend (Supabase)

- **Supabase**
  - **What it is**: Hosted platform built on Postgres that provides Auth, Database, Storage, and serverless functions.
  - **Why here**: Fastest path to the PRD’s core needs: secure auth, multi-tenant data isolation, CRUD, and minimal ops overhead.

- **PostgreSQL (via Supabase)**
  - **What it is**: Relational database.
  - **Why here**: Stores all core entities (users, series, books, chapters, notes, reading sessions) with strong consistency and query capabilities.

- **Row Level Security (RLS)**
  - **What it is**: Postgres policies that restrict rows based on the authenticated user context.
  - **Why here**: Directly supports the PRD requirement for strict per-user data isolation using `user_id`.

- **pgvector (Postgres extension)**
  - **What it is**: Vector data type + indexing/search in Postgres.
  - **Why here**: Enables vector similarity search for RAG without introducing a separate vector database for MVP.

- **Supabase Edge Functions (recommended)**
  - **What it is**: Server-side functions that run close to users.
  - **Why here**: Keeps secrets off the client (OpenRouter keys), orchestrates embedding generation, and can implement GDPR export/deletion workflows safely.

## AI (RAG)

- **OpenRouter**
  - **What it is**: A unified API to access multiple LLM providers/models.
  - **Why here**: Speeds up experimentation and lets us choose cost/performance tradeoffs for:
    - **Embeddings**: embedding note chunks and queries for retrieval
    - **Chat completions**: generating answers with citations from retrieved notes

## CI/CD and Hosting

- **GitHub Actions**
  - **What it is**: CI/CD automation for builds, checks, and deployments.
  - **Why here**: Automates lint/typecheck/build and deploys the frontend reliably on every merge/release.

- **Static App Hosting (Cloudflare Pages)**
  - **What it is**: Global static site hosting with Git integration and CDN distribution.
  - **Why here**: The frontend can be deployed as static assets while Supabase provides the backend; removes Docker image hosting/ops from the MVP.



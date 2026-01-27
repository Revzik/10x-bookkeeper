# Bookkeeper

![Node](https://img.shields.io/badge/node-22.14.0-339933?logo=node.js&logoColor=white)
![Astro](https://img.shields.io/badge/Astro-5-FF5D01?logo=astro&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=111827)

Bookkeeper is a responsive web application designed to help readers retain and recall plot details, character arcs, and key events from the books they read. It pairs a focused, structured note-taking workflow (Series → Book → Chapter) with an **Ask** interface that answers questions **grounded in your own notes**.

**Docs:**
- PRD: `.ai/prd.md`
- API plan: `.ai/api-plan.md`
- DB plan: `.ai/db-plan.md`
- UI plan: `.ai/ui-plan.md`
- Test plan: `.ai/test-plan.md`
- Tech stack rationale: `.ai/tech-stack.md`

## Table of contents

- [Project description](#project-description)
- [Tech stack](#tech-stack)
- [Getting started locally](#getting-started-locally)
- [Available scripts](#available-scripts)
- [Testing](#testing)
- [Project scope](#project-scope)
- [Project status](#project-status)
- [License](#license)

## Project description

Readers often “forget earlier chapters” in dense books and long series. Bookkeeper aims to reduce that memory leak by combining:

- **Structured library**: Series → Book → Chapter organization
- **Notes designed for recall**: short, manual entries that can be reviewed later
- **Ask (AI Q&A) over your notes**: ask natural-language questions and get answers based only on your notes (with low-confidence handling)
- **Progress tracking**: update book status and current page to see completion percentage

## Tech stack

- **Astro 5**: routing/layouts with an “islands” model for interactive UI
- **React 19**: interactive app surfaces (CRUD forms, note editor, Ask chat UI)
- **TypeScript 5**: type safety for schema-heavy entities and UI logic
- **Tailwind CSS 4**: consistent, responsive styling
- **shadcn/ui**: accessible component primitives/patterns (Radix + Tailwind)
- **Supabase (Postgres)**: Auth + database (with **Row Level Security (RLS)** for per-user isolation)
- **OpenRouter**: chat completions for the Ask experience
- **Testing**:
  - **Unit tests**: **Vitest** (TypeScript-native), with **nock** (or MSW in node mode) for deterministic OpenRouter mocks
  - **UI/component tests**: **React Testing Library** + **@testing-library/user-event** (with **happy-dom** or **jsdom**)
  - **E2E tests**: **Playwright**
- **GitHub Actions / Cloudflare Pages**: recommended CI/CD + hosting approach (see `.ai/tech-stack.md`)

## Getting started locally

### Prerequisites

- **Node.js**: `22.14.0` (see `.nvmrc`)
- **npm**: comes with Node.js (this repo includes a `package-lock.json`)

### Install

```bash
npm install
```

### Configure environment variables

This project declares the following required environment variables in `src/env.d.ts`:

- `SUPABASE_URL`
- `SUPABASE_KEY`
- `OPENROUTER_API_KEY`

Create a `.env` file (or provide these variables via your shell/hosting provider) before running the app.

### Set up the database (Supabase)

You’ll need a Supabase project with the migrations applied (see `supabase/migrations/`).

Common approaches:

- **Using Supabase CLI (recommended for development)**:
  - Link to your project and push migrations.
- **Using Supabase dashboard**:
  - Apply the SQL migrations to your database.

### Run the dev server

```bash
npm run dev
```

### Build and preview

```bash
npm run build
npm run preview
```

## Available scripts

- **`npm run dev`**: start the Astro dev server
- **`npm run build`**: build the production site
- **`npm run preview`**: preview the production build locally
- **`npm run astro`**: run the Astro CLI
- **`npm run lint`**: run ESLint across the repo
- **`npm run lint:fix`**: run ESLint and auto-fix where possible
- **`npm run format`**: format files with Prettier
- **`npm run supabase`**: run the Supabase CLI
- **`npm run test`**: run application tests (more in the section below)

## Testing

This project uses **Vitest** for unit/component tests and **Playwright** for E2E tests.

### Test structure

```
src/
├── test/              # Test utilities and setup
│   ├── setup.ts       # Vitest configuration
│   ├── utils/         # Custom render helpers
│   └── mocks/         # MSW API mocks
├── lib/               # Unit tests co-located with code
│   └── *.test.ts
└── components/        # Component tests co-located
    └── *.test.tsx

e2e/
├── page-objects/      # Page Object Model classes
├── fixtures/          # Test data
└── *.spec.ts          # E2E test files
```

### Running tests

**Unit & Component Tests:**

```bash
npm run test              # Run tests once
npm run test:watch        # Watch mode (recommended during development)
npm run test:ui           # Visual test interface
npm run test:coverage     # Generate coverage report
```

**E2E Tests:**

```bash
npm run test:e2e          # Run E2E tests
npm run test:e2e:ui       # Interactive UI mode
npm run test:e2e:debug    # Debug mode (step through tests)
npm run test:e2e:report   # View HTML report
```

### Documentation

- **Unit/component testing guide**: `src/test/README.md`
- **E2E testing guide**: `e2e/README.md`
- **Test plan**: `.ai/test-plan.md`

## Project scope

### In scope (MVP)

- **User account system**: email/password sign-up, login, logout, and password reset
- **Private data isolation**: per-user `user_id` with Row Level Security (RLS)
- **Library management**: CRUD for Series, Books, Chapters, and Notes
- **Ask (AI Q&A)**: chat interface over your notes (book- or series-scoped when applicable)
- **Low-confidence handling**: the assistant explicitly says when it can’t answer from the notes
- **Progress tracking**: manual book status + current page tracking with percentage visualization

### Out of scope (MVP)

- Social sharing / public profiles
- Audiobook tracking or playback
- Audio voice notes (transcription)
- OCR/scanning physical pages
- Automated book metadata fetching from external APIs (manual entry for MVP)
- “Test Book” / onboarding interactive tutorial
- Reading session timer / time tracking
- Vector search / embeddings / citations

## Project status

**MVP scope is defined and implemented.** The PRD, API plan, and DB plan describe the current product and its backend contracts.

## License

This project is licensed under MIT license.

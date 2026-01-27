# Product Requirements Document (PRD) - Bookkeeper

## 1. Product Overview
Bookkeeper is a responsive web application designed to help readers retain and recall plot details, character arcs, and specific events from the books they read. The core value proposition is a focused, structured note-taking experience (Series → Book → Chapter), paired with an “Ask” interface that lets users ask natural-language questions and get answers grounded in their own notes.

The MVP focuses on private, personal use and intentionally excludes social and community features.

## 2. User Problem
Readers often face significant challenges in remembering the plot of a book after they have finished it, or even recalling minute details about events or characters while they are still reading. This "memory leak" diminishes the long-term value and enjoyment of reading.

Key pain points include:
- Difficulty recalling details from earlier chapters in a dense book.
- Forgetting character backstories or motivations in long-running series.
- The friction of traditional note-taking methods which are often disorganized or hard to search.
- Lack of a centralized tool that combines progress tracking with quick recall from personal notes.

## 3. Functional Requirements

### 3.1. User Authentication & Security
- *Authentication:* Secure email/password sign-up, login, and logout.
- *Password reset:* Users can request a password reset email and set a new password via a secure flow.
- *Data privacy:* User content is private by default and visible only to the account owner via RLS.

### 3.2. Library Management
- *Hierarchical structure:* Users can organize reading material by Series → Book → Chapter.
- *Series (optional):* A book may belong to a series, but can also exist standalone.
- *Book metadata:* Books track title, author, total pages, and optional cover image URL.
- *Reading status and progress:* Books track reading status (e.g., want to read / reading / completed) and current page.
- *Chapters:* Users can create, update, reorder, and delete chapters within a book.

### 3.3. Note Taking
- *Format:* Manual text entry optimized for short bullet points or paragraph chunks.
- *Organization:* Notes are created under a chapter and displayed grouped by chapter for review.
- *CRUD:* Users can create, edit, and delete notes.

### 3.4. Ask (AI Q&A)
- *Interface:* Chat-driven Q&A interface (not a traditional search results list).
- *Scope:* Users can ask within a specific book or across an entire series (when a book belongs to a series).
- *Grounding:* Answers must be based only on the user’s notes within the selected scope.
- *Low confidence handling:* If there is not enough information in the notes to answer confidently, the system should say so and mark the response as low confidence.

### 3.5. Progress Tracking
- *Progress:* Manual entry of current page number and total pages to compute completion percentage.
- *Status:* Manual updates to reading status.

## 4. Product Boundaries

### 4.1. In Scope (MVP)
- User Account System.
- CRUD operations for Series, Books, Chapters, and Notes.
- Ask (AI Q&A) interface for querying notes within book/series scope.
- Page progress and reading status tracking.
- Responsive Web Interface.

### 4.2. Out of Scope (MVP)
- Audiobook tracking or playback.
- Audio voice notes (transcription).
- Social sharing or public profiles.
- "Test Book" / Onboarding interactive tutorial.
- OCR or scanning of physical book pages.
- Automated fetching of book metadata from external APIs (users enter details manually for MVP).
- Reading session timer / time tracking.
- AI answers that use external knowledge beyond the user’s notes.
- Source citations and semantic/vector retrieval.
- Data export tooling and self-serve account deletion.

## 5. User Stories

### Authentication & Account Management

#### US-001: User Sign Up
- *Title:* User Sign Up
- *Description:* As a new user, I want to create an account using my email and password so that I can save my reading notes privately.
- *Acceptance Criteria:*
  1. User can enter email and password.
  2. Input validation ensures valid email format and password strength.
  3. Upon success, user is authenticated and redirected to the dashboard.
  4. A new user record is created in the database.

#### US-002: User Log In
- *Title:* User Log In
- *Description:* As a returning user, I want to log in with my credentials so that I can access my previously saved notes.
- *Acceptance Criteria:*
  1. User can enter email and password.
  2. Incorrect credentials display a clear error message.
  3. Successful login grants access to the user's private data.

#### US-003: User Password Reset
- *Title:* User Password Reset
- *Description:* As a returning user, I want to have possibility to reset my password so that I can access my account even after I forgot it.
- *Acceptance Criteria:*
  1. User can click "Forgot password?" button on the login form
  2. User enters their email on displayed form and submits it.
  3. User receives an e-mail with a password reset link.
  4. User enters a new password after clicking the link.
  5. Entering new password grants access to the user's private data.

### Library & Book Management

#### US-004: Create Series
- *Title:* Create Book Series
- *Description:* As a user reading a trilogy, I want to create a Series entry so that I can group related books together.
- *Acceptance Criteria:*
  1. User can enter a Series Title.
  2. Series appears in the library view.

#### US-005: Add Book to Library
- *Title:* Add New Book
- *Description:* As a user starting a new book, I want to add it to my library with its metadata so that I can start tracking it.
- *Acceptance Criteria:*
  1. User can enter Title, Author, and Total Page Count.
  2. User can optionally link the book to an existing Series.
  3. Book is saved and displayed in the library.

#### US-006: Update Book Progress
- *Title:* Update Reading Progress
- *Description:* As a user, I want to update my current page and reading status so that I can track my progress and completion percentage.
- *Acceptance Criteria:*
  1. User can enter/update total pages and current page.
  2. System prevents current page from exceeding total pages.
  3. System shows an updated completion percentage.
  4. User can update reading status (want to read / reading / completed).

### Chapter Management

#### US-007: Manage Chapters
- *Title:* Create and Organize Chapters
- *Description:* As a user, I want to create and reorder chapters within a book so that my notes remain organized.
- *Acceptance Criteria:*
  1. User can create a chapter with a title.
  2. User can rename and delete a chapter.
  3. User can change chapter order.

### Note Taking

#### US-008: Create Chapter Note
- *Title:* Add Chapter Note
- *Description:* As a user who just finished a chapter, I want to write down key events as bullet points so that I can remember them later.
- *Acceptance Criteria:*
  1. User navigates to a specific book.
  2. User selects a chapter.
  3. User enters text content (limit approx. 1000 chars recommended/enforced).
  4. User clicks save.
  5. System saves the note and it is visible in the notes list.

#### US-009: Edit Note
- *Title:* Edit Existing Note
- *Description:* As a user who noticed a typo or missed a detail, I want to edit an existing note so that my records are accurate.
- *Acceptance Criteria:*
  1. User can select an existing note to edit.
  2. Upon saving changes, the system updates the text content.

#### US-010: View Notes
- *Title:* View Book Notes
- *Description:* As a user, I want to scroll through my notes for a specific book so that I can manually review what I have read.
- *Acceptance Criteria:*
  1. User can view a chronological list of notes for a selected book.
  2. Notes are grouped by chapter.

### Ask (AI Q&A)

#### US-011: Ask a Question
- *Title:* Ask a Question About My Notes
- *Description:* As a user, I want to ask a natural language question about a book so that I can quickly recall specific details.
- *Acceptance Criteria:*
  1. User enters a text question in the chat interface.
  2. System generates an answer based only on the user’s notes in the selected scope (book or series).
  3. The answer is displayed in the chat window.

#### US-012: Low Confidence Handling
- *Title:* Handle Missing Information
- *Description:* As a user asking about something I haven't noted, I want the system to tell me it doesn't know, rather than making things up.
- *Acceptance Criteria:*
  1. If the notes do not contain enough information to answer confidently, the system returns a response that clearly communicates the uncertainty.
  2. The system does not attempt to provide facts not present in the user’s notes.

## 6. Success Metrics
To evaluate the success of the Bookkeeper MVP, the following metrics will be tracked:

### 6.1. Adoption & Engagement
- *Note-Taking Activity:* 50% of registered users record at least one note during their first week.
- *Ask Usage:* 75% of active users utilize the Ask feature at least once.
- *Value Ratio:* A target ratio of 1:3 for Ask-to-Note actions (validating that for every 3 notes taken, users find value in asking at least once).

### 6.3. System Performance
- *Ask Latency:* Average time to generate an Ask response is under 3 seconds.


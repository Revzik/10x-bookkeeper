# Product Requirements Document (PRD) - Bookkeeper

## 1. Product Overview
Bookkeeper is a responsive web application designed to assist readers in retaining and recalling plot details, character arcs, and specific events from the books they read. The core value proposition centers on a focused note-taking experience specifically designed for "short lists" of key events, combined with a Retrieval-Augmented Generation (RAG) powered search engine. This allows users to ask natural language questions about their own notes to retrieve specific details they may have forgotten.

The MVP includes reading session tracking (time and progress) but strictly excludes social features to focus on the personal reading experience.

## 2. User Problem
Readers often face significant challenges in remembering the plot of a book after they have finished it, or even recalling minute details about events or characters while they are still reading. This "memory leak" diminishes the long-term value and enjoyment of reading.

Key pain points include:
- Difficulty recalling details from earlier chapters in a dense book.
- Forgetting character backstories or motivations in long-running series.
- The friction of traditional note-taking methods which are often disorganized or hard to search.
- Lack of a centralized tool that combines progress tracking with intelligent recall.

## 3. Functional Requirements

### 3.1. User Authentication & Security
- *Authentication:* Secure email/password sign-up and login.
- *Data Privacy:* Strict data isolation using `user_id` Row Level Security (RLS).
- *GDPR Compliance:* Mechanisms for users to export their data or request full account deletion (Right to be Forgotten).

### 3.2. Library Management
- *Hierarchical Structure:* Ability to organize notes by Series > Book > Chapter.
- *Metadata:* Books track title, author, total pages, sections/chapters (optional section/chapter structure).

### 3.3. Note Taking
- *Format:* Restricted to manual text entry, optimized for short bullet points or paragraph chunks (approx. 500-1000 characters).
- *Chunking:* Notes are automatically chunked and embedded upon saving to ensure optimal retrieval granularity.
- *Embedding:* Generates and stores vector embeddings immediately when notes are created or updated.

### 3.4. AI & Search (RAG)
- *Interface:* Chat-driven Q&A interface (not a traditional search results list).
- *Scope:* Users can search within a specific book or across an entire series.
- *Logic:* Vector similarity search retrieves relevant note chunks. A "Low Confidence" threshold triggers a specific UI state if no relevant notes are found.
- *Citations:* Responses should reference the specific book and chapter where the information was found.

### 3.5. Progress & Session Tracking
- *Session Timer:* Manual Start/Stop functionality to track time spent reading.
- *Progress:* Manual entry of current page number, visualized as a percentage bar.

## 4. Product Boundaries

### 4.1. In Scope (MVP)
- User Account System.
- CRUD operations for Series, Books, Chapters, and Notes.
- RAG-powered Chat Interface for querying notes.
- Reading Session Timer and Page Progress Tracking.
- Responsive Web Interface.

### 4.2. Out of Scope (MVP)
- Audiobook tracking or playback.
- Audio voice notes (transcription).
- Social sharing or public profiles.
- "Test Book" / Onboarding interactive tutorial.
- OCR or scanning of physical book pages.
- Automated fetching of book metadata from external APIs (users enter details manually for MVP).

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

#### US-003: GDPR Account Deletion
- *Title:* Delete Account
- *Description:* As a privacy-conscious user, I want to permanently delete my account and all associated data so that my information is removed from the system.
- *Acceptance Criteria:*
  1. User can request account deletion from settings.
  2. System prompts for confirmation.
  3. Upon confirmation, all user records (auth, notes, vectors, books) are permanently deleted from the database.
  4. User is logged out and redirected to the landing page.

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

### Note Taking

#### US-006: Create Chapter Note
- *Title:* Add Chapter Note
- *Description:* As a user who just finished a chapter, I want to write down key events as bullet points so that I can remember them later.
- *Acceptance Criteria:*
  1. User navigates to a specific book.
  2. User selects or enters a Chapter Number/Title.
  3. User enters text content (limit approx. 1000 chars recommended/enforced).
  4. User clicks save.
  5. System saves the note and triggers the embedding generation process in the background.

#### US-007: Edit Note
- *Title:* Edit Existing Note
- *Description:* As a user who noticed a typo or missed a detail, I want to edit an existing note so that my records are accurate.
- *Acceptance Criteria:*
  1. User can select an existing note to edit.
  2. Upon saving changes, the system updates the text content.
  3. The system automatically recalculates and updates the vector embedding for the modified note.

#### US-008: View Notes
- *Title:* View Book Notes
- *Description:* As a user, I want to scroll through my notes for a specific book so that I can manually review what I have read.
- *Acceptance Criteria:*
  1. User can view a chronological list of notes for a selected book.
  2. Notes are grouped by chapter.

### AI Search & Retrieval

#### US-009: Ask Question (RAG)
- *Title:* Query Notes via Chat
- *Description:* As a user, I want to ask a natural language question about a book so that I can quickly recall specific details.
- *Acceptance Criteria:*
  1. User enters a text question in the chat interface.
  2. System converts the question to a vector and searches the user's notes (filtered by current book or series).
  3. System retrieves relevant chunks and generates a natural language answer.
  4. The answer is displayed in the chat window.

#### US-010: Low Confidence Handling
- *Title:* Handle Missing Information
- *Description:* As a user asking about something I haven't noted, I want the system to tell me it doesn't know, rather than making things up.
- *Acceptance Criteria:*
  1. If vector similarity scores for retrieved chunks are below the defined threshold, the system returns a specific fallback response (e.g., "I'm not quite sure based on your notes...").
  2. The system does not attempt to hallucinate an answer from outside knowledge.

#### US-011: Source Citations
- *Title:* View Answer Sources
- *Description:* As a user, I want to know which chapter the answer came from so I can verify the context.
- *Acceptance Criteria:*
  1. The AI response includes references to the specific Chapter(s) where the information was found.

### Progress Tracking

#### US-012: Start/Stop Session
- *Title:* Track Reading Time
- *Description:* As a user sitting down to read, I want to start a timer so that I can track how long I spend reading.
- *Acceptance Criteria:*
  1. User can click a "Start Session" button.
  2. A timer is visible showing elapsed time.
  3. User can click "Stop Session" to end the timer and log the duration.

#### US-013: Update Page Progress
- *Title:* Update Page Progress
- *Description:* As a user finishing a session, I want to update my current page number so that I can see my completion percentage.
- *Acceptance Criteria:*
  1. User enters the current page number.
  2. System calculates percentage based on the book's total pages.
  3. A visual progress bar updates to reflect the new status.

## 6. Success Metrics
To evaluate the success of the Bookkeeper MVP, the following metrics will be tracked:

### 6.1. Adoption & Engagement
- *Note-Taking Activity:* 50% of registered users record at least one note during their first week.
- *Search Usage:* 75% of active users utilize the AI search feature to query their notes at least once.
- *Value Ratio:* A target ratio of 1:3 for Search-to-Note actions (validating that for every 3 notes taken, users find value in searching at least once).

### 6.3. System Performance
- *Search Latency:* Average time to generate a chat response is under 3 seconds.
- *Embedding Success Rate:* 99.9% of saved notes are successfully embedded and indexed within 5 seconds of creation.


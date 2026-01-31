/**
 * E2E Tests for Library Books Tab
 * Tests book creation and display using Page Object Model
 *
 * Authentication: Uses shared authenticated state from auth.setup.ts
 * All tests start already authenticated via storageState
 *
 * Note: Tests run in serial mode to avoid race conditions with shared test data
 */

import { test, expect } from "@playwright/test";
import { LibraryPage } from "./page-objects";
import { createAuthenticatedTestClient, signOutTestClient } from "./fixtures/supabase-test-client";
import { createBook, deleteBookById } from "../src/lib/services/books.service";

test.describe.configure({ mode: "serial" });

test.describe("Library - Books Tab", () => {
  test("should create a new book without series", async ({ page }) => {
    // Initialize page objects for this test
    const libraryPage = new LibraryPage(page);
    const addBookDialog = libraryPage.addBookDialog;
    const booksPanel = libraryPage.booksPanel;

    // 1. Navigate to library and ensure on Books tab
    await libraryPage.gotoBooks();
    await expect(libraryPage.booksTab).toHaveAttribute("data-state", "active");

    // 2. Open Add Book dialog
    await libraryPage.openAddBookDialog();
    await expect(addBookDialog.dialog).toBeVisible();

    // 3. Fill out required fields (no series) - use unique title to avoid conflicts
    const bookData = {
      title: `Test Book E2E ${Date.now()}`,
      author: "Test Author",
      totalPages: 300,
    };

    await addBookDialog.fillRequiredFields(bookData);

    // 4. Submit form
    await addBookDialog.clickCreate();

    // 5. Wait for dialog to close
    await addBookDialog.waitForDialogToClose();

    // 6. Verify book appears in the list
    await booksPanel.waitForLoaded();
    const titles = await booksPanel.getBookTitles();
    expect(titles).toContain(bookData.title);

    // Alternative: Wait for specific book by title
    await booksPanel.waitForBookByTitle(bookData.title);

    // 7. Verify book card content
    const bookCard = await booksPanel.getBookCardByTitle(bookData.title);
    await expect(bookCard.card).toBeVisible();
    expect(await bookCard.getTitle()).toBe(bookData.title);
    expect(await bookCard.getAuthor()).toBe(bookData.author);
  });

  test("should create a book with all fields", async ({ page }) => {
    const libraryPage = new LibraryPage(page);
    const addBookDialog = libraryPage.addBookDialog;
    const booksPanel = libraryPage.booksPanel;

    await libraryPage.gotoBooks();

    await libraryPage.openAddBookDialog();

    const bookData = {
      title: `Complete Book Test ${Date.now()}`,
      author: "Complete Author",
      totalPages: 500,
      status: "reading" as const,
      coverImageUrl: "https://example.com/cover.jpg",
    };

    await addBookDialog.fillForm(bookData);
    await addBookDialog.clickCreate();
    await addBookDialog.waitForDialogToClose();

    // Verify book in list
    await booksPanel.waitForBookByTitle(bookData.title);
    const bookCard = await booksPanel.getBookCardByTitle(bookData.title);

    expect(await bookCard.hasStatus("Reading")).toBe(true);
  });

  test("should validate required fields", async ({ page }) => {
    const libraryPage = new LibraryPage(page);
    const addBookDialog = libraryPage.addBookDialog;

    await libraryPage.gotoBooks();
    await libraryPage.openAddBookDialog();

    // Try to submit without filling fields
    await addBookDialog.clickCreate();

    // Dialog should still be visible (validation failed)
    await expect(addBookDialog.dialog).toBeVisible();

    // Should show validation errors
    expect(await addBookDialog.hasValidationError()).toBe(true);
  });

  test("should cancel book creation", async ({ page }) => {
    const libraryPage = new LibraryPage(page);
    const addBookDialog = libraryPage.addBookDialog;
    const booksPanel = libraryPage.booksPanel;

    await libraryPage.gotoBooks();

    // Wait for books to load before getting initial count
    await booksPanel.waitForLoaded();

    const initialCount = await booksPanel.getBooksCount();

    await libraryPage.openAddBookDialog();
    await addBookDialog.fillTitle("Book to Cancel");
    await addBookDialog.fillAuthor("Cancel Author");
    await addBookDialog.fillTotalPages(200);

    // Cancel instead of create
    await addBookDialog.clickCancel();
    await addBookDialog.waitForDialogToClose();

    // Wait for UI to settle after dialog closes
    await booksPanel.waitForLoaded();

    // Verify book was not added
    const finalCount = await booksPanel.getBooksCount();
    expect(finalCount).toBe(initialCount);
  });

  test("should search for books", async ({ page }) => {
    const libraryPage = new LibraryPage(page);
    const addBookDialog = libraryPage.addBookDialog;
    const booksPanel = libraryPage.booksPanel;

    await libraryPage.gotoBooks();

    // Create a book with unique title
    const uniqueTitle = `Searchable Book ${Date.now()}`;
    await libraryPage.openAddBookDialog();
    await addBookDialog.createQuickBook(uniqueTitle, "Search Author", 250);
    await addBookDialog.waitForDialogToClose();
    await booksPanel.waitForLoaded();

    // Wait for the book to appear in the list (ensures successful load)
    await booksPanel.waitForBookByTitle(uniqueTitle);

    // Search for the book
    await booksPanel.search(uniqueTitle);
    await booksPanel.waitForLoaded();

    const titles = await booksPanel.getBookTitles();
    expect(titles).toContain(uniqueTitle);
    expect(titles.length).toBeGreaterThan(0);

    // Clear search
    await booksPanel.clearSearch();
    await booksPanel.waitForLoaded();
  });

  test("should filter books by status", async ({ page }) => {
    const libraryPage = new LibraryPage(page);
    const addBookDialog = libraryPage.addBookDialog;
    const booksPanel = libraryPage.booksPanel;

    await libraryPage.gotoBooks();

    // Create books with different statuses - use unique titles
    const timestamp = Date.now();

    // Create first book with "Reading" status
    await libraryPage.openAddBookDialog();
    await addBookDialog.fillTitle(`Reading Status Book ${timestamp}`);
    await addBookDialog.fillAuthor("Test Author");
    await addBookDialog.fillTotalPages(300);
    await addBookDialog.selectStatus("reading");
    await addBookDialog.clickCreate();
    await addBookDialog.waitForDialogToClose();

    // Wait for the first book to appear before creating second book
    await booksPanel.waitForBookByTitle(`Reading Status Book ${timestamp}`);

    // Create second book with default "Want to Read" status (don't change status)
    await libraryPage.openAddBookDialog();
    await addBookDialog.fillTitle(`Want to Read Book ${timestamp}`);
    await addBookDialog.fillAuthor("Test Author");
    await addBookDialog.fillTotalPages(250);
    // Don't set status - it defaults to "want_to_read"
    await addBookDialog.clickCreate();
    await addBookDialog.waitForDialogToClose();

    // Wait for books to load
    await booksPanel.waitForLoaded();

    // Filter by "Reading"
    await booksPanel.filterByStatus("Reading");
    await booksPanel.waitForLoaded();

    // Verify only "Reading" status books are shown
    const titles = await booksPanel.getBookTitles();
    expect(titles).toContain(`Reading Status Book ${timestamp}`);
    expect(titles).not.toContain(`Want to Read Book ${timestamp}`);

    // Verify all visible books have "Reading" status
    for (const title of titles) {
      const card = await booksPanel.getBookCardByTitle(title);
      expect(await card.hasStatus("Reading")).toBe(true);
    }
  });

  test("should sort books", async ({ page }) => {
    const libraryPage = new LibraryPage(page);
    const booksPanel = libraryPage.booksPanel;

    const { supabase, userId } = await createAuthenticatedTestClient();
    const timestamp = Date.now();
    const prefix = `Sort Test ${timestamp}`;
    const bookTitles = [`${prefix} A`, `${prefix} B`, `${prefix} C`];

    const createdBooks = await Promise.all(
      bookTitles.map((title) =>
        createBook({
          supabase,
          userId,
          command: {
            title,
            author: "Sort Author",
            total_pages: 123,
            status: "want_to_read",
          },
        })
      )
    );

    try {
      await libraryPage.gotoBooks();

      await booksPanel.search(prefix);
      await booksPanel.waitForLoaded();
      await booksPanel.waitForBookByTitle(bookTitles[0]);

      // Sort by title
      await booksPanel.sortBy("Title");
      await booksPanel.waitForLoaded();

      const titlesAsc = await booksPanel.getBookTitles();

      // Toggle to descending
      await booksPanel.toggleSortOrder();
      await booksPanel.waitForLoaded();

      const titlesDesc = await booksPanel.getBookTitles();

      // Verify order changed (if there are multiple books)
      if (titlesAsc.length > 1) {
        expect(titlesAsc).not.toEqual(titlesDesc);
        expect(titlesDesc).toEqual([...titlesAsc].reverse());
      }
    } finally {
      await Promise.all(
        createdBooks.map((book) =>
          deleteBookById({
            supabase,
            userId,
            bookId: book.id,
          })
        )
      );

      await signOutTestClient(supabase);
    }
  });

  test("should click book card to navigate to detail page", async ({ page }) => {
    const libraryPage = new LibraryPage(page);
    const booksPanel = libraryPage.booksPanel;

    // Setup: Create authenticated test client and test book
    const { supabase, userId } = await createAuthenticatedTestClient();

    // Create a test book
    const testBook = await createBook({
      supabase,
      userId,
      command: {
        title: "Navigation Test Book",
        author: "Test Author",
        total_pages: 300,
        status: "reading",
      },
    });

    try {
      // Navigate to library books tab
      await libraryPage.gotoBooks();
      await booksPanel.waitForLoaded();

      // Find and click the test book card
      const bookCard = await booksPanel.getBookCardByTitle(testBook.title);
      await bookCard.click();

      // Should navigate to book detail page with the correct book ID
      await expect(page).toHaveURL(new RegExp(`/books/${testBook.id}`));
    } finally {
      // Cleanup: Delete the test book
      await deleteBookById({
        supabase,
        userId,
        bookId: testBook.id,
      });

      await signOutTestClient(supabase);
    }
  });
});

/**
 * E2E Tests for Library Books Tab
 * Tests book creation and display using Page Object Model
 *
 * Authentication: Uses shared authenticated state from auth.setup.ts
 * All tests start already authenticated via storageState
 */

import { test, expect } from "@playwright/test";
import { LibraryPage } from "./page-objects";

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

    // 3. Fill out required fields (no series)
    const bookData = {
      title: "Test Book E2E",
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
      title: "Complete Book Test",
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

    const initialCount = await booksPanel.getBooksCount();

    await libraryPage.openAddBookDialog();
    await addBookDialog.fillTitle("Book to Cancel");
    await addBookDialog.fillAuthor("Cancel Author");
    await addBookDialog.fillTotalPages(200);

    // Cancel instead of create
    await addBookDialog.clickCancel();
    await addBookDialog.waitForDialogToClose();

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
    const booksPanel = libraryPage.booksPanel;

    await libraryPage.gotoBooks();

    // Filter by "Reading"
    await booksPanel.filterByStatus("Reading");
    await booksPanel.waitForLoaded();

    // If there are books, verify they all have "Reading" status
    const count = await booksPanel.getBooksCount();
    if (count > 0) {
      const titles = await booksPanel.getBookTitles();
      for (const title of titles) {
        const card = await booksPanel.getBookCardByTitle(title);
        expect(await card.hasStatus("Reading")).toBe(true);
      }
    }
  });

  test("should sort books", async ({ page }) => {
    const libraryPage = new LibraryPage(page);
    const booksPanel = libraryPage.booksPanel;

    await libraryPage.gotoBooks();

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
  });

  test("should click book card to navigate to detail page", async ({ page }) => {
    const libraryPage = new LibraryPage(page);
    const booksPanel = libraryPage.booksPanel;

    await libraryPage.gotoBooks();

    const count = await booksPanel.getBooksCount();

    if (count > 0) {
      const titles = await booksPanel.getBookTitles();
      const firstBookCard = await booksPanel.getBookCardByTitle(titles[0]);

      // Click card
      await firstBookCard.click();

      // Should navigate to book detail page
      await expect(page).toHaveURL(/\/books\/.+/);
    } else {
      test.skip();
    }
  });
});

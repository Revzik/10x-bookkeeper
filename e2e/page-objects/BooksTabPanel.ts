/**
 * Page Object Model for Books Tab Panel
 * Handles books list, search, filters, and pagination
 */

import { type Page, type Locator } from "@playwright/test";
import { BookCard } from "./BookCard";

export class BooksTabPanel {
  readonly page: Page;
  readonly tabPanel: Locator;
  readonly searchInput: Locator;
  readonly statusFilter: Locator;
  readonly seriesFilter: Locator;
  readonly sortSelect: Locator;
  readonly sortOrderButton: Locator;
  readonly booksList: Locator;
  readonly booksListLoading: Locator;
  readonly booksListEmpty: Locator;
  readonly errorBanner: Locator;
  readonly retryButton: Locator;
  readonly paginationInfo: Locator;
  readonly previousPageButton: Locator;
  readonly nextPageButton: Locator;
  readonly pageSizeSelect: Locator;

  constructor(page: Page) {
    this.page = page;

    // Tab panel
    this.tabPanel = page.getByTestId("tab-panel-books");

    // Toolbar controls - using data-test-id for resilience
    this.searchInput = page.getByTestId("input-books-search");
    this.statusFilter = page.getByTestId("select-books-status-filter");
    this.seriesFilter = page.getByTestId("select-books-series-filter");
    this.sortSelect = page.getByTestId("select-books-sort");
    this.sortOrderButton = page.getByTestId("btn-books-sort-order");

    // Books list states
    this.booksList = page.getByTestId("books-list");
    this.booksListLoading = page.getByTestId("books-list-loading");
    this.booksListEmpty = page.getByTestId("books-list-empty");

    // Error handling
    this.errorBanner = page.getByTestId("error-banner");
    this.retryButton = page.getByTestId("btn-error-retry");

    // Pagination
    this.paginationInfo = page.getByTestId("pagination-info");
    this.previousPageButton = page.getByTestId("btn-pagination-previous");
    this.nextPageButton = page.getByTestId("btn-pagination-next");
    this.pageSizeSelect = page.getByTestId("select-page-size");
  }

  /**
   * Check if tab panel is visible
   */
  async isVisible() {
    return await this.tabPanel.isVisible();
  }

  /**
   * Wait for tab panel to be visible
   */
  async waitForVisible() {
    await this.tabPanel.waitFor({ state: "visible" });
  }

  /**
   * Search for books
   */
  async search(query: string) {
    await this.searchInput.fill(query);
    // Wait for debounced search (300ms debounce + buffer)
    await this.page.waitForTimeout(500);
  }

  /**
   * Clear search
   */
  async clearSearch() {
    await this.searchInput.clear();
    await this.page.waitForTimeout(500);
  }

  /**
   * Filter by status
   */
  async filterByStatus(status: "All Status" | "Want to Read" | "Reading" | "Completed") {
    await this.statusFilter.click();
    const statusMap = {
      "All Status": "option-status-all",
      "Want to Read": "option-status-want-to-read",
      Reading: "option-status-reading",
      Completed: "option-status-completed",
    };
    await this.page.getByTestId(statusMap[status]).click();
  }

  /**
   * Filter by series (use series ID for dynamic series, or "all" for All Series)
   */
  async filterBySeries(seriesIdOrAll: string) {
    await this.seriesFilter.click();
    const testId = seriesIdOrAll === "all" ? "option-series-all" : `option-series-${seriesIdOrAll}`;
    await this.page.getByTestId(testId).click();
  }

  /**
   * Clear series filter (select "All Series")
   */
  async clearSeriesFilter() {
    await this.seriesFilter.click();
    await this.page.getByTestId("option-series-all").click();
  }

  /**
   * Change sort field
   */
  async sortBy(field: "Updated" | "Created" | "Title" | "Author" | "Status") {
    await this.sortSelect.click();
    const fieldMap = {
      Updated: "option-sort-updated",
      Created: "option-sort-created",
      Title: "option-sort-title",
      Author: "option-sort-author",
      Status: "option-sort-status",
    };
    await this.page.getByTestId(fieldMap[field]).click();
  }

  /**
   * Toggle sort order (asc/desc)
   */
  async toggleSortOrder() {
    await this.sortOrderButton.click();
  }

  /**
   * Check if books list is loading
   */
  async isLoading() {
    return await this.booksListLoading.isVisible();
  }

  /**
   * Wait for loading to complete
   */
  async waitForLoaded() {
    await this.booksListLoading.waitFor({ state: "hidden", timeout: 10000 });
  }

  /**
   * Check if empty state is shown
   */
  async isEmpty() {
    return await this.booksListEmpty.isVisible();
  }

  /**
   * Check if error banner is shown
   */
  async hasError() {
    return await this.errorBanner.isVisible();
  }

  /**
   * Click retry button on error banner
   */
  async retry() {
    await this.retryButton.click();
  }

  /**
   * Get count of book cards displayed
   */
  async getBooksCount() {
    return await this.page.getByTestId(/^book-card-/).count();
  }

  /**
   * Get all book titles currently displayed
   */
  async getBookTitles() {
    const titles = await this.page.getByTestId("book-card-title").allTextContents();
    return titles;
  }

  /**
   * Get a specific book card by ID
   */
  getBookCard(bookId: string) {
    return new BookCard(this.page, bookId);
  }

  /**
   * Get a book card by title (first match)
   */
  async getBookCardByTitle(title: string) {
    const titleLocator = this.page.getByTestId("book-card-title").filter({ hasText: title });
    const card = titleLocator.locator("..").locator("..");
    const cardId = await card.getAttribute("data-test-id");

    if (!cardId) {
      throw new Error(`Book card with title "${title}" not found`);
    }

    const bookId = cardId.replace("book-card-", "");
    return new BookCard(this.page, bookId);
  }

  /**
   * Wait for a specific book to appear in the list
   */
  async waitForBook(bookId: string, timeout = 5000) {
    await this.page.getByTestId(`book-card-${bookId}`).waitFor({ state: "visible", timeout });
  }

  /**
   * Wait for a book with specific title to appear
   */
  async waitForBookByTitle(title: string, timeout = 5000) {
    await this.page.getByTestId("book-card-title").filter({ hasText: title }).waitFor({ state: "visible", timeout });
  }

  /**
   * Pagination: Go to next page
   */
  async goToNextPage() {
    await this.nextPageButton.click();
    await this.waitForLoaded();
  }

  /**
   * Pagination: Go to previous page
   */
  async goToPreviousPage() {
    await this.previousPageButton.click();
    await this.waitForLoaded();
  }

  /**
   * Pagination: Change page size
   */
  async changePageSize(size: 10 | 20 | 50 | 100) {
    await this.pageSizeSelect.click();
    await this.page.getByTestId(`option-page-size-${size}`).click();
    await this.waitForLoaded();
  }

  /**
   * Get pagination info text
   */
  async getPaginationInfo() {
    return await this.paginationInfo.textContent();
  }

  /**
   * Check if next page button is enabled
   */
  async canGoToNextPage() {
    return !(await this.nextPageButton.isDisabled());
  }

  /**
   * Check if previous page button is enabled
   */
  async canGoToPreviousPage() {
    return !(await this.previousPageButton.isDisabled());
  }
}

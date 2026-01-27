/**
 * Page Object Model for Library page
 * Main library view with books and series tabs
 */

import { type Page, type Locator } from "@playwright/test";

export class LibraryPage {
  readonly page: Page;
  readonly booksTab: Locator;
  readonly seriesTab: Locator;
  readonly addBookButton: Locator;
  readonly addSeriesButton: Locator;
  readonly searchInput: Locator;
  readonly pageHeading: Locator;

  constructor(page: Page) {
    this.page = page;

    this.booksTab = page.getByRole("tab", { name: /books/i });
    this.seriesTab = page.getByRole("tab", { name: /series/i });
    this.addBookButton = page.getByRole("button", { name: /add book/i });
    this.addSeriesButton = page.getByRole("button", { name: /add series/i });
    this.searchInput = page.getByPlaceholder(/search/i);
    this.pageHeading = page.getByRole("heading", { level: 1 });
  }

  async goto() {
    await this.page.goto("/library");
  }

  async switchToBooksTab() {
    await this.booksTab.click();
  }

  async switchToSeriesTab() {
    await this.seriesTab.click();
  }

  async openAddBookDialog() {
    await this.addBookButton.click();
  }

  async openAddSeriesDialog() {
    await this.addSeriesButton.click();
  }

  async searchFor(query: string) {
    await this.searchInput.fill(query);
    // Wait for search to trigger (debounced typically)
    await this.page.waitForTimeout(500);
  }
}

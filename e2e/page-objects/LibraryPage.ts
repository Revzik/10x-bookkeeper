/**
 * Page Object Model for Library page
 * Main library view with books and series tabs
 */

import { type Page, type Locator } from "@playwright/test";
import { AddBookDialog } from "./AddBookDialog";
import { BooksTabPanel } from "./BooksTabPanel";

export class LibraryPage {
  readonly page: Page;
  readonly booksTab: Locator;
  readonly seriesTab: Locator;
  readonly booksTabPanel: Locator;
  readonly seriesTabPanel: Locator;
  readonly addBookButton: Locator;
  readonly addSeriesButton: Locator;
  readonly pageHeading: Locator;

  // Composed page objects
  readonly addBookDialog: AddBookDialog;
  readonly booksPanel: BooksTabPanel;

  constructor(page: Page) {
    this.page = page;

    // Use data-testid for resilient selection
    this.booksTab = page.getByTestId("tab-books");
    this.seriesTab = page.getByTestId("tab-series");
    this.booksTabPanel = page.getByTestId("tab-panel-books");
    this.seriesTabPanel = page.getByTestId("tab-panel-series");
    this.addBookButton = page.getByTestId("btn-add-book");
    this.addSeriesButton = page.getByTestId("btn-add-series");
    this.pageHeading = page.getByTestId("library-heading");

    // Initialize composed page objects
    this.addBookDialog = new AddBookDialog(page);
    this.booksPanel = new BooksTabPanel(page);
  }

  async goto() {
    await this.page.goto("/library");
  }

  async waitForLoad() {
    await this.pageHeading.waitFor({ state: "visible" });
  }

  async isOnBooksTab() {
    return (await this.booksTab.getAttribute("aria-selected")) === "true";
  }

  async isOnSeriesTab() {
    return (await this.seriesTab.getAttribute("aria-selected")) === "true";
  }

  async switchToBooksTab() {
    await this.booksTab.click();
    await this.booksTabPanel.waitFor({ state: "visible" });
  }

  async switchToSeriesTab() {
    await this.seriesTab.click();
    await this.seriesTabPanel.waitFor({ state: "visible" });
  }

  async openAddBookDialog() {
    await this.addBookButton.click();
    await this.addBookDialog.waitForDialog();
  }

  async openAddSeriesDialog() {
    await this.addSeriesButton.click();
  }

  /**
   * Complete flow: Navigate to library and ensure on Books tab
   */
  async gotoBooks() {
    await this.goto();
    await this.waitForLoad();

    if (!(await this.isOnBooksTab())) {
      await this.switchToBooksTab();
    }
  }

  /**
   * Complete flow: Navigate to library and ensure on Series tab
   */
  async gotoSeries() {
    await this.goto();
    await this.waitForLoad();

    if (!(await this.isOnSeriesTab())) {
      await this.switchToSeriesTab();
    }
  }
}

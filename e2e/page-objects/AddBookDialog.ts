/**
 * Page Object Model for Add Book Dialog
 * Handles book creation flow with form validation
 */

import { type Page, type Locator } from "@playwright/test";

export interface BookFormData {
  title: string;
  author: string;
  totalPages: number;
  status?: "want_to_read" | "reading" | "completed";
  seriesId?: string;
  seriesOrder?: number;
  coverImageUrl?: string;
}

export class AddBookDialog {
  readonly page: Page;
  readonly dialog: Locator;
  readonly titleInput: Locator;
  readonly authorInput: Locator;
  readonly totalPagesInput: Locator;
  readonly statusSelect: Locator;
  readonly seriesSelect: Locator;
  readonly seriesOrderInput: Locator;
  readonly coverImageUrlInput: Locator;
  readonly createButton: Locator;
  readonly cancelButton: Locator;
  readonly validationErrors: Locator;

  constructor(page: Page) {
    this.page = page;

    // Use data-testid for resilient selection
    this.dialog = page.getByTestId("dialog-add-book");
    this.titleInput = page.getByTestId("input-book-title");
    this.authorInput = page.getByTestId("input-book-author");
    this.totalPagesInput = page.getByTestId("input-book-total-pages");
    this.statusSelect = page.getByTestId("select-book-status");
    this.seriesSelect = page.getByTestId("select-book-series");
    this.seriesOrderInput = page.getByTestId("input-book-series-order");
    this.coverImageUrlInput = page.getByTestId("input-book-cover-image-url");
    this.createButton = page.getByTestId("btn-create-book");
    this.cancelButton = page.getByTestId("btn-cancel-add-book");
    this.validationErrors = page.locator(".text-destructive");
  }

  async waitForDialog() {
    await this.dialog.waitFor({ state: "visible" });
  }

  async isVisible() {
    return await this.dialog.isVisible();
  }

  async fillTitle(title: string) {
    await this.titleInput.fill(title);
  }

  async fillAuthor(author: string) {
    await this.authorInput.fill(author);
  }

  async fillTotalPages(pages: number) {
    await this.totalPagesInput.fill(pages.toString());
  }

  async selectStatus(status: "want_to_read" | "reading" | "completed") {
    await this.statusSelect.click();

    const statusTestIds = {
      want_to_read: "option-book-status-want-to-read",
      reading: "option-book-status-reading",
      completed: "option-book-status-completed",
    };

    await this.page.getByTestId(statusTestIds[status]).click();
  }

  async selectSeries(seriesId: string) {
    await this.seriesSelect.click();
    await this.page.getByTestId(`option-book-series-${seriesId}`).click();
  }

  async selectNoSeries() {
    await this.seriesSelect.click();
    await this.page.getByTestId("option-book-series-none").click();
  }

  async fillSeriesOrder(order: number) {
    await this.seriesOrderInput.fill(order.toString());
  }

  async fillCoverImageUrl(url: string) {
    await this.coverImageUrlInput.fill(url);
  }

  /**
   * Fill required fields only (title, author, total pages)
   */
  async fillRequiredFields(data: Pick<BookFormData, "title" | "author" | "totalPages">) {
    await this.fillTitle(data.title);
    await this.fillAuthor(data.author);
    await this.fillTotalPages(data.totalPages);
  }

  /**
   * Fill all provided form fields
   */
  async fillForm(data: BookFormData) {
    await this.fillTitle(data.title);
    await this.fillAuthor(data.author);
    await this.fillTotalPages(data.totalPages);

    if (data.status) {
      await this.selectStatus(data.status);
    }

    if (data.seriesId !== undefined) {
      if (data.seriesId === "") {
        await this.selectNoSeries();
      } else {
        await this.selectSeries(data.seriesId);
      }
    }

    if (data.seriesOrder !== undefined) {
      await this.fillSeriesOrder(data.seriesOrder);
    }

    if (data.coverImageUrl) {
      await this.fillCoverImageUrl(data.coverImageUrl);
    }
  }

  async clickCreate() {
    await this.createButton.click();
  }

  async clickCancel() {
    await this.cancelButton.click();
  }

  async isCreateButtonDisabled() {
    return await this.createButton.isDisabled();
  }

  async waitForDialogToClose() {
    await this.dialog.waitFor({ state: "hidden" });
  }

  async getValidationErrors() {
    return await this.validationErrors.allTextContents();
  }

  async hasValidationError() {
    return (await this.validationErrors.count()) > 0;
  }

  /**
   * Complete flow: fill form and submit
   */
  async createBook(data: BookFormData) {
    await this.waitForDialog();
    await this.fillForm(data);
    await this.clickCreate();
  }

  /**
   * Quick create with only required fields
   */
  async createQuickBook(title: string, author: string, totalPages: number) {
    await this.waitForDialog();
    await this.fillRequiredFields({ title, author, totalPages });
    await this.clickCreate();
  }
}

/**
 * Page Object Model for Book Card
 * Represents a single book item in the books list
 */

import { type Page, type Locator } from "@playwright/test";

export class BookCard {
  readonly page: Page;
  readonly bookId: string;
  readonly card: Locator;
  readonly title: Locator;
  readonly author: Locator;
  readonly statusBadge: Locator;
  readonly progressLabel: Locator;
  readonly progressPercent: Locator;
  readonly updatedAt: Locator;

  constructor(page: Page, bookId: string) {
    this.page = page;
    this.bookId = bookId;

    // Card container
    this.card = page.getByTestId(`book-card-${bookId}`);

    // Card elements (scoped to this specific card) - using data-test-id for resilience
    this.title = this.card.getByTestId("book-card-title");
    this.author = this.card.getByTestId("book-card-author");
    this.statusBadge = this.card.getByTestId("book-card-status");
    this.progressLabel = this.card.getByTestId("book-card-progress-label");
    this.progressPercent = this.card.getByTestId("book-card-progress-percent");
    this.updatedAt = this.card.getByTestId("book-card-updated-label");
  }

  /**
   * Check if card is visible
   */
  async isVisible() {
    return await this.card.isVisible();
  }

  /**
   * Wait for card to be visible
   */
  async waitForVisible(timeout = 5000) {
    await this.card.waitFor({ state: "visible", timeout });
  }

  /**
   * Click the card to open book details
   */
  async click() {
    await this.card.click();
  }

  /**
   * Get book title
   */
  async getTitle() {
    return await this.title.textContent();
  }

  /**
   * Get book author
   */
  async getAuthor() {
    return await this.author.textContent();
  }

  /**
   * Get status badge text
   */
  async getStatus() {
    return await this.statusBadge.textContent();
  }

  /**
   * Get progress label (e.g., "0 of 300", "150 of 300")
   */
  async getProgressLabel() {
    return await this.progressLabel.textContent();
  }

  /**
   * Get progress percentage
   */
  async getProgressPercent() {
    const text = await this.progressPercent.textContent();
    return text ? parseInt(text.replace("%", "").trim(), 10) : 0;
  }

  /**
   * Get updated timestamp label
   */
  async getUpdatedAt() {
    return (await this.updatedAt.textContent())?.trim() || "";
  }

  /**
   * Check if status matches expected value
   */
  async hasStatus(status: "Want to Read" | "Reading" | "Completed") {
    const actualStatus = await this.getStatus();
    return actualStatus === status;
  }

  /**
   * Check if title matches
   */
  async hasTitle(expectedTitle: string) {
    const actualTitle = await this.getTitle();
    return actualTitle === expectedTitle;
  }

  /**
   * Check if author matches
   */
  async hasAuthor(expectedAuthor: string) {
    const actualAuthor = await this.getAuthor();
    return actualAuthor === expectedAuthor;
  }

  /**
   * Wait for card to be removed from DOM
   */
  async waitForRemoved(timeout = 5000) {
    await this.card.waitFor({ state: "hidden", timeout });
  }

  /**
   * Get all card information as an object
   */
  async getCardInfo() {
    return {
      title: await this.getTitle(),
      author: await this.getAuthor(),
      status: await this.getStatus(),
      progressLabel: await this.getProgressLabel(),
      progressPercent: await this.getProgressPercent(),
      updatedAt: await this.getUpdatedAt(),
    };
  }
}

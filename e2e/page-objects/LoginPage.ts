/**
 * Page Object Model for Login page
 * Demonstrates the Page Object pattern for maintainable E2E tests
 */

import { type Page, type Locator } from "@playwright/test";

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorBanner: Locator;
  readonly signupLink: Locator;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // Use resilient locators (role, label, test-id)
    this.emailInput = page.getByLabel("Email");
    this.passwordInput = page.getByLabel("Password");
    this.loginButton = page.getByRole("button", { name: /log in|sign in/i });
    this.errorBanner = page.getByRole("alert");
    this.signupLink = page.getByRole("link", { name: /sign up|create account/i });
    this.forgotPasswordLink = page.getByRole("link", { name: /forgot password/i });
  }

  async goto() {
    await this.page.goto("/login");
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async waitForNavigation() {
    await this.page.waitForURL(/\/(library|books|series)/);
  }

  async getErrorMessage() {
    return await this.errorBanner.textContent();
  }
}

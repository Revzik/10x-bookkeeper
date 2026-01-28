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

    // Use data-testid for resilient selection
    this.emailInput = page.getByTestId("login-email");
    this.passwordInput = page.getByTestId("login-password");
    this.loginButton = page.getByTestId("login-submit");
    this.errorBanner = page.getByTestId("auth-error-banner");
    this.signupLink = page.getByTestId("link-signup");
    this.forgotPasswordLink = page.getByTestId("link-forgot-password");
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

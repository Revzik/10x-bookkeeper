/**
 * Example E2E test for authentication flow
 * Demonstrates Playwright patterns and Page Object Model
 */

import { test, expect } from "@playwright/test";
import { LoginPage } from "./page-objects/LoginPage";
import { LibraryPage } from "./page-objects/LibraryPage";
import { testUsers } from "./fixtures/test-users";

test.describe("Authentication", () => {
  test.describe("Login", () => {
    test("should redirect unauthenticated users to login page", async ({ page }) => {
      await page.goto("/library");

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });

    test("should login successfully with valid credentials", async ({ page }) => {
      const loginPage = new LoginPage(page);
      const libraryPage = new LibraryPage(page);

      await loginPage.goto();
      await loginPage.login(testUsers.validUser.email, testUsers.validUser.password);

      // Should navigate to library after successful login
      await loginPage.waitForNavigation();
      await expect(libraryPage.pageHeading).toBeVisible();
    });

    test("should show error message with invalid credentials", async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.goto();
      await loginPage.login(testUsers.invalidUser.email, testUsers.invalidUser.password);

      // Should display error message
      await expect(loginPage.errorBanner).toBeVisible();
      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage).toContain("Incorrect email or password");
    });

    test("should validate email format", async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.goto();
      await loginPage.login("invalid-email", "password123");

      // Browser validation or custom validation should trigger
      const isValid = await loginPage.emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
      expect(isValid).toBe(false);
    });
  });

  test.describe("Navigation", () => {
    test("should navigate to signup page from login", async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.goto();
      await loginPage.signupLink.click();

      await expect(page).toHaveURL(/\/signup/);
    });

    test("should navigate to forgot password page from login", async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.goto();
      await loginPage.forgotPasswordLink.click();

      await expect(page).toHaveURL(/\/forgot-password/);
    });
  });
});

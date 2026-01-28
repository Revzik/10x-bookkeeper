/**
 * Authentication setup for E2E tests
 * This setup authenticates once and saves the browser state for all tests
 *
 * Following Playwright's recommended approach:
 * - Authenticates once in the setup project
 * - Saves authenticated state to playwright/.auth/user.json
 * - All tests reuse this state to start already authenticated
 */

import { test as setup, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";
import { testUsers } from "./fixtures/test-users";
import { LoginPage } from "./page-objects/LoginPage";

// Path to store authenticated browser state
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const authFile = path.join(__dirname, "../playwright/.auth/user.json");

setup("authenticate", async ({ page }) => {
  // Use LoginPage page object for authentication
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.login(testUsers.validUser.email, testUsers.validUser.password);

  // Wait for navigation to complete (should redirect to library)
  await loginPage.waitForNavigation();

  // Verify authentication was successful by checking for library page heading
  await expect(page.getByRole("heading", { level: 1, name: "Library" })).toBeVisible();

  // Save authenticated state to file
  await page.context().storageState({ path: authFile });
});

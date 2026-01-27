# E2E Testing Guide

This directory contains end-to-end tests using Playwright.

## Directory Structure

```
e2e/
├── page-objects/      # Page Object Model classes
│   ├── LoginPage.ts
│   └── LibraryPage.ts
├── fixtures/          # Test data and fixtures
│   └── test-users.ts
└── *.spec.ts          # Test files
```

## Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run in UI mode (interactive)
npm run test:e2e:ui

# Run in debug mode (step through tests)
npm run test:e2e:debug

# Show HTML report
npm run test:e2e:report
```

## Writing E2E Tests

### Basic Test Structure

```typescript
import { test, expect } from "@playwright/test";

test("should do something", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Bookkeeper/);
});
```

### Using Page Objects

```typescript
import { test, expect } from "@playwright/test";
import { LoginPage } from "./page-objects/LoginPage";

test("should login", async ({ page }) => {
  const loginPage = new LoginPage(page);

  await loginPage.goto();
  await loginPage.login("user@example.com", "password");
  await loginPage.waitForNavigation();

  await expect(page).toHaveURL(/\/library/);
});
```

### Test Isolation with Browser Contexts

```typescript
test.describe("User Flow", () => {
  test.use({
    // Each test gets a fresh browser context
    storageState: undefined,
  });

  test("test 1", async ({ page }) => {
    // Isolated from other tests
  });
});
```

## Page Object Model

### Creating Page Objects

```typescript
import { Page, Locator } from "@playwright/test";

export class MyPage {
  readonly page: Page;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // Use resilient locators
    this.submitButton = page.getByRole("button", { name: /submit/i });
  }

  async goto() {
    await this.page.goto("/my-page");
  }

  async submitForm(data: FormData) {
    // Encapsulate interactions
    await this.page.fill('[name="email"]', data.email);
    await this.submitButton.click();
  }
}
```

### Locator Best Practices

Prefer accessible locators (in order of priority):

1. **Role**: `page.getByRole('button', { name: 'Submit' })`
2. **Label**: `page.getByLabel('Email')`
3. **Placeholder**: `page.getByPlaceholder('Enter email')`
4. **Text**: `page.getByText('Welcome')`
5. **Test ID**: `page.getByTestId('submit-btn')` (last resort)

Avoid:

- CSS selectors (`.class-name`)
- XPath (fragile)

## Configuration

Edit `playwright.config.ts` to customize:

- Base URL
- Timeouts
- Browsers
- Screenshots/videos
- Trace settings

## Debugging

### Visual Debugging

```bash
# Open UI mode
npm run test:e2e:ui

# Debug mode (step through)
npm run test:e2e:debug
```

### Trace Viewer

When a test fails, check the trace:

```bash
# Show HTML report with traces
npm run test:e2e:report
```

Or view a specific trace:

```bash
npx playwright show-trace trace.zip
```

### Screenshots and Videos

Configured to capture on failure:

- Screenshots: `playwright-report/screenshots/`
- Videos: `playwright-report/videos/`

## Test Data

### Using Fixtures

```typescript
import { testUsers } from "./fixtures/test-users";

test("login", async ({ page }) => {
  await loginPage.login(testUsers.validUser.email, testUsers.validUser.password);
});
```

### Database Setup/Teardown

For tests requiring specific database state:

```typescript
test.beforeEach(async () => {
  // Set up test data
  await seedDatabase();
});

test.afterEach(async () => {
  // Clean up
  await cleanDatabase();
});
```

## Guidelines

### Test Organization

- Group related tests with `test.describe()`
- Use descriptive test names
- One test per user scenario
- Keep tests independent (no shared state)

### Performance

- Run tests in parallel (enabled by default)
- Use `fullyParallel: true` for faster runs
- Reuse browser contexts when safe
- Mock external services (OpenRouter) to avoid rate limits

### Reliability

- Use `waitForLoadState()` for navigation
- Use `waitForSelector()` for dynamic content
- Add explicit waits for animations/transitions
- Handle flaky tests with retries (CI only)

## Best Practices

1. **Use Page Objects** - Encapsulate page interactions
2. **Resilient Locators** - Prefer role/label over CSS
3. **Independent Tests** - No test should depend on another
4. **Visual Regression** - Use `toHaveScreenshot()` for critical UI
5. **API Testing** - Test backend directly when UI isn't needed
6. **Trace on Failure** - Keep traces enabled for debugging

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Trace Viewer](https://playwright.dev/docs/trace-viewer)
- [Page Object Model](https://playwright.dev/docs/pom)

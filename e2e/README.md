# E2E Testing Guide

This directory contains end-to-end tests using Playwright.

## Environment Setup

E2E tests run against a **dedicated Supabase cloud project** separate from development and production environments. This ensures test isolation and prevents test data from polluting your development database.

### Prerequisites

1. **Create E2E Supabase Project**
   - Create a dedicated Supabase project for E2E testing
   - Apply all database migrations from `supabase/migrations/`
   - Enable RLS policies as in production

2. **Create Test User**
   - Manually create a test user in the E2E Supabase project
   - Use Supabase dashboard or Auth API
   - Save the user ID, email, and password securely

3. **Configure Environment Variables**
   
   Add these variables to `.env.local` (or your CI secrets):
   
   ```bash
   # E2E Testing Cloud Environment
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-public-key
   
   # Predefined Test User
   E2E_TEST_USER_ID=uuid-of-test-user
   E2E_TEST_USER_EMAIL=test@example.com
   E2E_TEST_USER_PASSWORD=your-secure-password
   ```
   
   **Important:** Never commit `.env.local` with real credentials to version control.

4. **Run Tests Against E2E Environment**
   
   Configure your test run to use the E2E Supabase instance:
   
   ```bash
   # Use E2E environment for tests
   npm run test:e2e
   ```

### CI/CD Configuration

For CI/CD pipelines, store E2E credentials as secrets:

**GitHub Actions example:**
```yaml
- name: Run E2E tests
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
    SUPABASE_PUBLIC_KEY: ${{ secrets.SUPABASE_PUBLIC_KEY }}
    E2E_TEST_USER_ID: ${{ secrets.E2E_TEST_USER_ID }}
    E2E_TEST_USER_EMAIL: ${{ secrets.E2E_TEST_USER_EMAIL }}
    E2E_TEST_USER_PASSWORD: ${{ secrets.E2E_TEST_USER_PASSWORD }}
  run: npm run test:e2e
```

## Authentication Setup

E2E tests use Playwright's recommended **shared authentication** approach:

1. **Setup Project**: `auth.setup.ts` authenticates once before all tests
2. **Storage State**: Authentication state is saved to `playwright/.auth/user.json`
3. **Test Projects**: All tests reuse the saved state and start already authenticated

### How It Works

```typescript
// auth.setup.ts - runs once before all tests
setup("authenticate", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(testUsers.validUser.email);
  await page.getByLabel("Password").fill(testUsers.validUser.password);
  await page.getByRole("button", { name: "Sign In" }).click();
  await page.waitForURL(/\/library/);
  
  // Save authenticated state
  await page.context().storageState({ path: authFile });
});
```

### Configuration

The setup project is configured in `playwright.config.ts`:

```typescript
projects: [
  // Setup project runs first
  { name: "setup", testMatch: /.*\.setup\.ts/ },
  
  // Tests use saved auth state
  {
    name: "chromium",
    use: { storageState: "playwright/.auth/user.json" },
    dependencies: ["setup"],
  },
]
```

### Writing Tests

Tests automatically start authenticated - no login code needed:

```typescript
test("should create a book", async ({ page }) => {
  // Page is already authenticated!
  await page.goto("/library");
  // ... test continues
});
```

### Testing Unauthenticated Flows

To test login/signup flows, reset the storage state:

```typescript
test.use({ storageState: { cookies: [], origins: [] } });

test("should login", async ({ page }) => {
  // Test starts unauthenticated
  await page.goto("/login");
  // ... perform login
});
```

### Security Note

The `playwright/.auth/` directory contains sensitive session data and is excluded from version control via `.gitignore`.

## Directory Structure

```
e2e/
├── auth.setup.ts      # Authentication setup (runs once)
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

The `testUsers` fixture automatically loads credentials from environment variables:

```typescript
import { testUsers } from "./fixtures/test-users";

test("login", async ({ page }) => {
  // Uses E2E_TEST_USER_EMAIL and E2E_TEST_USER_PASSWORD from environment
  await loginPage.login(testUsers.validUser.email, testUsers.validUser.password);
});
```

### Test Data Strategy

**Option A (Recommended): Create and Clean Up Test Data**

Tests create their own test data during setup and clean up after completion:

```typescript
test.beforeEach(async () => {
  // Create test-specific data (series, books, etc.)
  testSeriesId = await createTestSeries();
  testBookId = await createTestBook(testSeriesId);
});

test.afterEach(async () => {
  // Clean up test data
  await deleteTestBook(testBookId);
  await deleteTestSeries(testSeriesId);
});
```

**Benefits:**
- Test isolation (no interference between tests)
- Clean state for each test
- Prevents data accumulation in E2E database

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
4. **Clean Up Test Data** - Always clean up created entities
5. **Use Predefined Test User** - Load credentials from environment variables
6. **Visual Regression** - Use `toHaveScreenshot()` for critical UI
7. **API Testing** - Test backend directly when UI isn't needed
8. **Trace on Failure** - Keep traces enabled for debugging
9. **Isolate E2E Environment** - Never run E2E tests against production

## Troubleshooting

### Test User Authentication Issues

**Problem:** Tests fail with "Incorrect email or password"

**Solutions:**
- Verify `E2E_TEST_USER_EMAIL` and `E2E_TEST_USER_PASSWORD` are set correctly
- Check that the test user exists in the E2E Supabase project
- Ensure the user's email is confirmed in Supabase Auth

### Environment Variable Not Found

**Problem:** `E2E_TEST_USER_PASSWORD not set` warning appears

**Solutions:**
- Create `.env.local` file with E2E environment variables
- Verify environment variables are loaded (check `process.env` in test)
- For CI, ensure secrets are configured in your CI platform

### RLS Policy Errors

**Problem:** Tests fail with "permission denied" or similar RLS errors

**Solutions:**
- Verify RLS policies are enabled in E2E Supabase project
- Check that policies match production policies
- Ensure test user has proper permissions

### Test Data Conflicts

**Problem:** Tests fail due to existing data (e.g., duplicate series names)

**Solutions:**
- Implement test data cleanup in `afterEach` hooks
- Use unique identifiers (timestamps, UUIDs) in test data
- Manually clean up E2E database if necessary

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Trace Viewer](https://playwright.dev/docs/trace-viewer)
- [Page Object Model](https://playwright.dev/docs/pom)

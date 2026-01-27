# Testing Guide

This directory contains testing utilities, mocks, and setup files for unit and component tests.

## Directory Structure

```
src/test/
├── setup.ts           # Vitest setup file (runs before all tests)
├── utils/
│   └── test-utils.tsx # Custom render function with providers
└── mocks/
    ├── handlers.ts    # MSW request handlers for API mocking
    └── server.ts      # MSW server configuration
```

## Running Tests

### Unit & Component Tests (Vitest)

```bash
# Run all tests once
npm run test

# Run tests in watch mode (recommended during development)
npm run test:watch

# Run tests with UI (visual test runner)
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

### E2E Tests (Playwright)

```bash
# Run E2E tests
npm run test:e2e

# Run E2E tests with UI mode
npm run test:e2e:ui

# Run E2E tests in debug mode
npm run test:e2e:debug

# Show E2E test report
npm run test:e2e:report
```

## Writing Tests

### Unit Tests (Pure Logic)

Test pure functions, validation schemas, and utilities:

```typescript
import { describe, it, expect } from "vitest";
import { myFunction } from "./myFunction";

describe("myFunction", () => {
  it("should return expected result", () => {
    expect(myFunction("input")).toBe("output");
  });
});
```

See: `src/lib/validation/shared.schemas.test.ts`

### Component Tests (React)

Test UI components with React Testing Library:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, userEvent } from '@/test/utils/test-utils';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should handle user interactions', async () => {
    const user = userEvent.setup();
    render(<MyComponent />);

    await user.click(screen.getByRole('button'));
    expect(screen.getByText('Clicked')).toBeInTheDocument();
  });
});
```

See: `src/components/shared/BookStatusBadge.test.tsx`

### Mocking APIs with MSW

Add handlers to `src/test/mocks/handlers.ts`:

```typescript
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/v1/books", () => {
    return HttpResponse.json({ data: [], meta: {} });
  }),
];
```

Then enable the server in your test setup if needed.

### Testing with OpenRouter Mocks

Use `nock` for mocking HTTP requests to OpenRouter:

```typescript
import nock from "nock";

describe("AI Service", () => {
  it("should call OpenRouter API", async () => {
    nock("https://openrouter.ai")
      .post("/api/v1/chat/completions")
      .reply(200, { choices: [{ message: { content: "Answer" } }] });

    // Your test here
  });
});
```

## Guidelines

### Unit Tests (Vitest)

- Use `vi.fn()` for function mocks
- Use `vi.spyOn()` to monitor existing functions
- Use `vi.mock()` for module mocking (place at top level)
- Enable `globals: true` to use `describe`, `it`, `expect` without imports
- Use `happy-dom` environment for DOM testing (configured)
- Structure tests with Arrange-Act-Assert pattern

### Component Tests (RTL)

- Query by role/label/text (accessible queries)
- Use `userEvent` for realistic user interactions
- Test behavior, not implementation details
- Use custom `render()` from `test-utils.tsx` for providers

### E2E Tests (Playwright)

- Use Page Object Model for maintainable tests
- Use resilient locators (role, label, test-id)
- Isolate tests with browser contexts
- Enable parallel execution for speed
- Use trace viewer for debugging failures

## Best Practices

1. **Test file naming**: Use `.test.ts` or `.test.tsx` suffix
2. **Co-location**: Place test files next to the code they test
3. **Descriptive names**: Use clear `describe` and `it` descriptions
4. **Arrange-Act-Assert**: Structure tests clearly
5. **One assertion per test**: Keep tests focused (when possible)
6. **Mock external dependencies**: Use MSW for APIs, nock for HTTP
7. **Clean up**: Use `afterEach` to reset state (configured in setup.ts)

## Configuration Files

- `vitest.config.ts` - Vitest configuration
- `playwright.config.ts` - Playwright configuration
- `src/test/setup.ts` - Vitest setup file

## Resources

- [Vitest Documentation](https://vitest.dev)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev)
- [MSW Documentation](https://mswjs.io)

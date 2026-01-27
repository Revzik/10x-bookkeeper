/**
 * Vitest setup file
 * Runs before each test file to configure the testing environment
 */

import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

// Automatically cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// Mock environment variables for tests
process.env.SUPABASE_URL = "http://localhost:54321";
process.env.SUPABASE_KEY = "test-anon-key";
process.env.OPENROUTER_API_KEY = "test-openrouter-key";

// Suppress console warnings in tests (optional - remove if you want to see warnings)
// vi.spyOn(console, 'warn').mockImplementation(() => {});
// vi.spyOn(console, 'error').mockImplementation(() => {});

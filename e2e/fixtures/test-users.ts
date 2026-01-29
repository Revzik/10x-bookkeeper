/**
 * Test user fixtures for E2E tests
 * Centralized test data management
 *
 * For E2E testing, the validUser credentials MUST be loaded from environment variables.
 * The test user must be created manually in the E2E Supabase project.
 *
 * Required environment variables:
 * - E2E_TEST_USER_ID: UUID of the test user
 * - E2E_TEST_USER_EMAIL: Email of the test user
 * - E2E_TEST_USER_PASSWORD: Password of the test user
 *
 * NO DEFAULT VALUES are provided. All variables must be set explicitly.
 * Tests will fail fast if any required variable is missing.
 */

import { validateE2EEnvironment } from "./validate-env";

export interface TestUser {
  id: string;
  email: string;
  password: string;
  name?: string;
}

// Validate environment and load test user from environment variables
// This will throw an error if any required variable is missing
const getValidUser = (): TestUser => {
  const env = validateE2EEnvironment();

  return {
    id: env.E2E_TEST_USER_ID,
    email: env.E2E_TEST_USER_EMAIL,
    password: env.E2E_TEST_USER_PASSWORD,
    name: "Test User",
  };
};

export const testUsers = {
  // Predefined test user from E2E environment variables
  // Will throw error if any required environment variable is missing
  validUser: getValidUser(),

  // User for testing signup flow (will be created during test)
  newUser: {
    email: "newuser@example.com",
    password: "NewUser1234!",
    name: "New User",
  },

  // Invalid credentials for negative test cases
  invalidUser: {
    email: "invalid@example.com",
    password: "wrongpassword",
  },
} as const;

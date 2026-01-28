/**
 * Test user fixtures for E2E tests
 * Centralized test data management
 *
 * For cloud E2E testing, the validUser credentials are loaded from environment variables.
 * The test user must be created manually in the E2E Supabase project.
 *
 * Required environment variables:
 * - E2E_TEST_USER_ID: UUID of the test user
 * - E2E_TEST_USER_EMAIL: Email of the test user
 * - E2E_TEST_USER_PASSWORD: Password of the test user
 */

export interface TestUser {
  id?: string;
  email: string;
  password: string;
  name?: string;
}

// Load test user from environment variables for cloud E2E testing
const getValidUser = (): TestUser => {
  const id = process.env.E2E_TEST_USER_ID;
  const email = process.env.E2E_TEST_USER_EMAIL || "test@example.com";
  const password = process.env.E2E_TEST_USER_PASSWORD;

  if (!password) {
    console.warn("E2E_TEST_USER_PASSWORD not set. Using default password for local testing.");
  }

  return {
    id,
    email,
    password: password || "Test1234!",
    name: "Test User",
  };
};

export const testUsers = {
  // Predefined test user from E2E cloud environment
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

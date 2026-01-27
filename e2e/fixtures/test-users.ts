/**
 * Test user fixtures for E2E tests
 * Centralized test data management
 */

export interface TestUser {
  email: string;
  password: string;
  name?: string;
}

export const testUsers = {
  validUser: {
    email: "test@example.com",
    password: "Test1234!",
    name: "Test User",
  },

  newUser: {
    email: "newuser@example.com",
    password: "NewUser1234!",
    name: "New User",
  },

  invalidUser: {
    email: "invalid@example.com",
    password: "wrongpassword",
  },
} as const;

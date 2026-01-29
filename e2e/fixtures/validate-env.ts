/**
 * Environment validation for E2E tests
 * Ensures all required environment variables are set before tests run
 */

interface E2EEnvironmentConfig {
  E2E_TEST_USER_ID: string;
  E2E_TEST_USER_EMAIL: string;
  E2E_TEST_USER_PASSWORD: string;
  SUPABASE_URL: string;
  SUPABASE_KEY: string;
}

/**
 * Validates that all required E2E environment variables are set
 * @throws Error if any required variable is missing or empty
 */
export function validateE2EEnvironment(): E2EEnvironmentConfig {
  const requiredVars = [
    "E2E_TEST_USER_ID",
    "E2E_TEST_USER_EMAIL",
    "E2E_TEST_USER_PASSWORD",
    "SUPABASE_URL",
    "SUPABASE_KEY",
  ] as const;

  const missing: string[] = [];
  const empty: string[] = [];

  for (const varName of requiredVars) {
    const value = process.env[varName];

    if (value === undefined) {
      missing.push(varName);
    } else if (value.trim() === "") {
      empty.push(varName);
    }
  }

  if (missing.length > 0 || empty.length > 0) {
    const errorMessages: string[] = ["E2E test environment validation failed:", ""];

    if (missing.length > 0) {
      errorMessages.push("Missing environment variables:");
      missing.forEach((varName) => {
        errorMessages.push(`  - ${varName}`);
      });
      errorMessages.push("");
    }

    if (empty.length > 0) {
      errorMessages.push("Empty environment variables:");
      empty.forEach((varName) => {
        errorMessages.push(`  - ${varName}`);
      });
      errorMessages.push("");
    }

    errorMessages.push("Please ensure all required E2E environment variables are set in .env.test");
    errorMessages.push("See .env.example for the required variables.");

    throw new Error(errorMessages.join("\n"));
  }

  return {
    E2E_TEST_USER_ID: process.env.E2E_TEST_USER_ID as string,
    E2E_TEST_USER_EMAIL: process.env.E2E_TEST_USER_EMAIL as string,
    E2E_TEST_USER_PASSWORD: process.env.E2E_TEST_USER_PASSWORD as string,
    SUPABASE_URL: process.env.SUPABASE_URL as string,
    SUPABASE_KEY: process.env.SUPABASE_KEY as string,
  };
}

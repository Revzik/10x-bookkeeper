/**
 * Global teardown for E2E tests
 * This teardown cleans up test data after all tests have completed
 *
 * Following Playwright's recommended approach:
 * - Runs after all dependent projects complete
 * - Cleans series and books tables for the test user
 * - Uses Supabase client with authentication to respect RLS policies
 *
 * SAFETY:
 * - Uses public key (respects RLS policies)
 * - Requires authentication as test user
 * - Validates environment to prevent production deletions
 */

/* eslint-disable no-console */
import { test as teardown } from "@playwright/test";
import { createAuthenticatedTestClient, signOutTestClient } from "./fixtures/supabase-test-client";

teardown("cleanup database", async () => {
  let supabase;
  let userId;

  try {
    // Create authenticated test client
    const testClient = await createAuthenticatedTestClient();
    supabase = testClient.supabase;
    userId = testClient.userId;

    console.log("Starting database cleanup for test user:", userId);
    console.log("Successfully authenticated as test user");

    // Delete all books for the test user
    // Note: Related chapters, notes, and other dependent records will be cascade deleted
    const { error: booksError, count: booksCount } = await supabase
      .from("books")
      .delete({ count: "exact" })
      .eq("user_id", userId);

    if (booksError) {
      console.error("Error deleting books:", booksError);
      throw booksError;
    }

    console.log(`Deleted ${booksCount ?? 0} book(s)`);

    // Delete all series for the test user
    const { error: seriesError, count: seriesCount } = await supabase
      .from("series")
      .delete({ count: "exact" })
      .eq("user_id", userId);

    if (seriesError) {
      console.error("Error deleting series:", seriesError);
      throw seriesError;
    }

    console.log(`Deleted ${seriesCount ?? 0} series`);

    console.log("Database cleanup completed successfully");
  } catch (error) {
    // Handle authentication errors (e.g., missing environment variables)
    if (error instanceof Error && error.message.includes("environment variable")) {
      console.warn(`Skipping database cleanup: ${error.message}`);
      return;
    }

    console.error("Database cleanup failed:", error);
    throw error;
  } finally {
    // Sign out after cleanup
    if (supabase) {
      await signOutTestClient(supabase);
    }
  }
});

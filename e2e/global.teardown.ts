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
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/db/database.types";

// Get Supabase credentials from environment
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const testUserId = process.env.E2E_TEST_USER_ID;
const testUserEmail = process.env.E2E_TEST_USER_EMAIL;
const testUserPassword = process.env.E2E_TEST_USER_PASSWORD;

teardown("cleanup database", async () => {
  // Validate required environment variables
  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL environment variable is not set");
  }
  if (!supabaseKey) {
    throw new Error("SUPABASE_KEY environment variable is not set");
  }
  if (!testUserId) {
    console.warn("E2E_TEST_USER_ID not set. Skipping database cleanup.");
    return;
  }
  if (!testUserEmail || !testUserPassword) {
    console.warn("E2E_TEST_USER_EMAIL or E2E_TEST_USER_PASSWORD not set. Skipping database cleanup.");
    return;
  }

  console.log("Starting database cleanup for test user:", testUserId);
  console.log("Environment:", supabaseUrl);

  // Create Supabase client for database access
  const supabase = createClient<Database>(supabaseUrl, supabaseKey);

  // Authenticate as the test user to pass RLS policies
  // When using public key, RLS policies require authentication
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: testUserEmail,
    password: testUserPassword,
  });

  if (signInError) {
    console.error("Failed to authenticate test user:", signInError);
    throw signInError;
  }

  console.log("Successfully authenticated as test user");

  try {
    // Delete all books for the test user
    // Note: Related chapters, notes, and other dependent records will be cascade deleted
    const { error: booksError, count: booksCount } = await supabase
      .from("books")
      .delete({ count: "exact" })
      .eq("user_id", testUserId);

    if (booksError) {
      console.error("Error deleting books:", booksError);
      throw booksError;
    }

    console.log(`Deleted ${booksCount ?? 0} book(s)`);

    // Delete all series for the test user
    const { error: seriesError, count: seriesCount } = await supabase
      .from("series")
      .delete({ count: "exact" })
      .eq("user_id", testUserId);

    if (seriesError) {
      console.error("Error deleting series:", seriesError);
      throw seriesError;
    }

    console.log(`Deleted ${seriesCount ?? 0} series`);

    console.log("Database cleanup completed successfully");

    // Sign out after cleanup
    await supabase.auth.signOut();
  } catch (error) {
    console.error("Database cleanup failed:", error);
    throw error;
  }
});

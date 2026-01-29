/**
 * Supabase test client utilities for E2E tests
 * Provides authenticated Supabase client for test setup and teardown
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/db/database.types";
import { testUsers } from "./test-users";

export interface AuthenticatedTestClient {
  supabase: ReturnType<typeof createClient<Database>>;
  userId: string;
}

/**
 * Creates and authenticates a Supabase client for E2E tests
 *
 * @returns Authenticated Supabase client and user ID
 * @throws Error if required environment variables are not set
 */
export async function createAuthenticatedTestClient(): Promise<AuthenticatedTestClient> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  const testUserId = process.env.E2E_TEST_USER_ID;
  const testUserEmail = testUsers.validUser.email;
  const testUserPassword = testUsers.validUser.password;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("SUPABASE_URL and SUPABASE_KEY environment variables must be set");
  }

  if (!testUserId) {
    throw new Error("E2E_TEST_USER_ID environment variable must be set");
  }

  const supabase = createClient<Database>(supabaseUrl, supabaseKey);

  // Authenticate as test user to pass RLS policies
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: testUserEmail,
    password: testUserPassword,
  });

  if (signInError) {
    throw new Error(`Failed to authenticate test user: ${signInError.message}`);
  }

  return {
    supabase,
    userId: testUserId,
  };
}

/**
 * Signs out the authenticated Supabase client
 *
 * @param supabase - Authenticated Supabase client
 */
export async function signOutTestClient(supabase: ReturnType<typeof createClient<Database>>): Promise<void> {
  await supabase.auth.signOut();
}

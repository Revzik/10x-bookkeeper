/**
 * Supabase test client utilities for E2E tests
 * Provides authenticated Supabase client for test setup and teardown
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/db/database.types";
import { validateE2EEnvironment } from "./validate-env";
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
  // Validate all required environment variables
  const env = validateE2EEnvironment();

  const supabase = createClient<Database>(env.SUPABASE_URL, env.SUPABASE_KEY);

  // Authenticate as test user to pass RLS policies
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: testUsers.validUser.email,
    password: testUsers.validUser.password,
  });

  if (signInError) {
    throw new Error(`Failed to authenticate test user: ${signInError.message}`);
  }

  return {
    supabase,
    userId: testUsers.validUser.id,
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

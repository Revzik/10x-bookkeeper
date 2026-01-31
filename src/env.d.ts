/// <reference types="astro/client" />

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./db/database.types.ts";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_KEY: string;
  OPENROUTER_API_KEY: string;
}

type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare global {
  namespace App {
    interface Locals extends Runtime {
      supabase: SupabaseClient<Database>;
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

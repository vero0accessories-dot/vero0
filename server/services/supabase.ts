import dotenv from "dotenv";
dotenv.config({ path: ".env.local", override: true });
dotenv.config({ override: true });

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const rawKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const SUPABASE_URL = rawUrl.replace(/^['"]|['"]$/g, "").trim();
export const SUPABASE_ANON_KEY = rawKey.replace(/^['"]|['"]$/g, "").trim();
export const SUPABASE_SERVICE_ROLE_KEY = rawServiceKey.replace(/^['"]|['"]$/g, "").trim();

export function isSupabaseConfigured(): boolean {
  return (
    !!SUPABASE_URL &&
    SUPABASE_URL.startsWith("https://") &&
    SUPABASE_URL !== "https://your-project.supabase.co" &&
    !!SUPABASE_ANON_KEY &&
    SUPABASE_ANON_KEY !== "your-anon-key" &&
    SUPABASE_ANON_KEY !== "1"
  );
}

let supabaseInstance: SupabaseClient | null = null;
let supabaseAdminInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!supabaseInstance) {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseInstance;
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  const keyToUse = SUPABASE_SERVICE_ROLE_KEY || SUPABASE_ANON_KEY;
  if (!supabaseAdminInstance) {
    supabaseAdminInstance = createClient(SUPABASE_URL, keyToUse, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return supabaseAdminInstance;
}

import { createServerClient } from '@supabase/ssr';
import { normalizeSupabaseUrl } from './client';

function getServerEnv() {
  const rawUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
  const rawKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";

  const supabaseUrl = normalizeSupabaseUrl(rawUrl);
  const supabaseAnonKey = (rawKey || "").replace(/^['"]|['"]$/g, "").trim();

  return { supabaseUrl, supabaseAnonKey };
}

/**
 * Creates a server-side Supabase client using @supabase/ssr.
 */
export function createClient(cookieStore?: any) {
  const { supabaseUrl, supabaseAnonKey } = getServerEnv();

  if (cookieStore) {
    return createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          if (typeof cookieStore.getAll === 'function') {
            return cookieStore.getAll().map((cookie: any) => ({
              name: cookie.name,
              value: cookie.value,
            }));
          }
          return [];
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              if (typeof cookieStore.set === 'function') {
                cookieStore.set(name, value, options);
              }
            });
          } catch {
            // Ignore if environment prevents header modifications
          }
        },
      },
    });
  }

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        // No-op
      },
    },
  });
}

/**
 * Creates an Express-specific Supabase client.
 */
export function createExpressClient(req: any, res: any) {
  const { supabaseUrl, supabaseAnonKey } = getServerEnv();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        const cookieHeader = req.headers.cookie || "";
        return cookieHeader
          .split(";")
          .map((v: string) => v.split("="))
          .reduce((acc: any[], [k, v]: any) => {
            if (k) acc.push({ name: k.trim(), value: decodeURIComponent(v || "") });
            return acc;
          }, []);
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          if (typeof res.cookie === 'function') {
            res.cookie(name, value, {
              ...options,
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
            });
          }
        });
      },
    },
  });
}

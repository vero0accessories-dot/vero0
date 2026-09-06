import { createBrowserClient } from '@supabase/ssr';

/**
 * Normalizes any Supabase URL variant (project ref, domain, or full URL)
 */
export function normalizeSupabaseUrl(urlRaw?: string): string {
  if (!urlRaw) return "";
  let trimmed = urlRaw.replace(/^['"]|['"]$/g, "").trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  if (trimmed.includes(".")) {
    return `https://${trimmed}`;
  }
  return `https://${trimmed}.supabase.co`;
}

/**
 * Retrieves Supabase environment variables from import.meta.env or process.env safely
 */
export function getSupabaseEnv() {
  let rawUrl = "";
  let rawKey = "";

  if (typeof window !== 'undefined' || (typeof import.meta !== 'undefined' && (import.meta as any).env)) {
    rawUrl = 
      (import.meta as any).env?.VITE_SUPABASE_URL || 
      (import.meta as any).env?.SUPABASE_URL || 
      "";
    rawKey = 
      (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 
      (import.meta as any).env?.SUPABASE_ANON_KEY || 
      "";
  }

  if (!rawUrl && typeof process !== 'undefined' && process.env) {
    rawUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  }
  if (!rawKey && typeof process !== 'undefined' && process.env) {
    rawKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
  }

  const url = normalizeSupabaseUrl(rawUrl);
  const key = (rawKey || "").replace(/^['"]|['"]$/g, "").trim();

  return { url, key, rawUrl, rawKey };
}

/**
 * Evaluates whether Supabase credentials are valid and active
 */
export function isSupabaseConfigured(): boolean {
  const { url, key } = getSupabaseEnv();

  if (!url) return false;
  if (!key) return false;
  if (url === "https://your-project.supabase.co" || url.includes("your-project")) return false;
  if (key === "your-anon-key" || key === "your-service-role-key" || key === "1") return false;

  return url.startsWith("http://") || url.startsWith("https://");
}

/**
 * Diagnostics helper for debugging Demo Mode activation causes
 */
export function getSupabaseDiagnostic() {
  const { url, key, rawUrl, rawKey } = getSupabaseEnv();
  const configured = isSupabaseConfigured();

  const missing: string[] = [];
  if (!rawUrl) missing.push("VITE_SUPABASE_URL / SUPABASE_URL");
  if (!rawKey) missing.push("VITE_SUPABASE_ANON_KEY / SUPABASE_ANON_KEY");

  const reasons: string[] = [];
  if (missing.length > 0) {
    reasons.push(`Missing environment variables: ${missing.join(", ")}.`);
  }
  if (url && (url === "https://your-project.supabase.co" || url.includes("your-project"))) {
    reasons.push("URL is configured to placeholder ('your-project.supabase.co').");
  }
  if (key && (key === "your-anon-key" || key === "1")) {
    reasons.push("Anon key is set to placeholder value.");
  }

  return {
    isConfigured: configured,
    url,
    rawUrl,
    keyConfigured: !!key,
    missingVars: missing,
    reasons: reasons.length > 0 ? reasons : ["Supabase environment is properly configured."],
    summary: configured
      ? `Successfully connected to Supabase at ${url}`
      : `Demo Mode Active - ${reasons.join(" ")}`
  };
}

/**
 * Creates a browser-safe Supabase client using @supabase/ssr.
 */
export const createClient = () => {
  const { url, key } = getSupabaseEnv();

  if (!url || !key) {
    console.warn("[Supabase Client] Cannot initialize createBrowserClient: missing URL or Key.", getSupabaseDiagnostic());
  }

  return createBrowserClient(url, key);
};

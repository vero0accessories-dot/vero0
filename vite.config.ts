import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { defineConfig } from 'vite';

// Helper to normalize Supabase URL cleanly
function normalizeSupabaseUrl(urlRaw?: string): string {
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

export default defineConfig(() => {
  // Load environment variables in order
  const envFiles = [".env.local", ".env", ".env.example"];
  for (const file of envFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      dotenv.config({ path: fullPath, override: false });
    }
  }

  const rawUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const rawKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

  const supabaseUrl = normalizeSupabaseUrl(rawUrl);
  const supabaseAnonKey = (rawKey || "").replace(/^['"]|['"]$/g, "").trim();

  console.log(`[Vite Config] Supabase URL resolved: ${supabaseUrl || "NONE"}`);
  console.log(`[Vite Config] Supabase Key resolved: ${supabaseAnonKey ? "PRESENT (Length " + supabaseAnonKey.length + ")" : "MISSING"}`);

  return {
    base: '/',
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
      'process.env.SUPABASE_URL': JSON.stringify(supabaseUrl),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
      'import.meta.env.SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

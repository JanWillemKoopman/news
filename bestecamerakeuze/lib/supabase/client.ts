"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Browser-side Supabase client (publishable key) — gebruikt door de inlogpagina. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}

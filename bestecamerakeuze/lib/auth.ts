import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseGeconfigureerd } from "@/lib/config";

export interface Gebruiker {
  id: string;
  email: string | null;
}

/**
 * De ingelogde gebruiker, of null.
 *
 * Geeft ook null terug zolang Supabase niet geconfigureerd is, zodat de app in die
 * toestand blijft draaien in plaats van te crashen op ontbrekende omgevingsvariabelen.
 * Gewrapt in React's `cache()` zodat meerdere aanroepen binnen één request samen één
 * `auth.getUser()` doen.
 */
export const getGebruiker = cache(async (): Promise<Gebruiker | null> => {
  if (!isSupabaseGeconfigureerd()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email ?? null };
});

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Server-side Supabase client, gebonden aan de request-cookies.
 *
 * Let op het verschil met de MMM-app: die draait op Next 14 waar `cookies()` synchroon
 * is. Deze app draait op Next 15, waar `cookies()` een promise teruggeeft — vandaar dat
 * deze functie async is en elke aanroeper hem moet awaiten.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }: CookieToSet) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Aangeroepen vanuit een Server Component — mag genegeerd worden; de
            // middleware ververst de sessie.
          }
        },
      },
    },
  );
}

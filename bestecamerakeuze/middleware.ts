import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Ververst de Supabase-sessie zodat server components een geldige gebruiker zien.
 *
 * De matcher onderaan bepaalt wát er langs de middleware komt. Nu staat hij op de
 * chatroutes: het bestaande campagnedashboard blijft publiek bereikbaar zoals het nu
 * is. Wil je later de héle app achter de inlog zetten, dan vervang je de matcher door
 * `["/((?!_next/static|_next/image|favicon.ico|auth).*)"]` — verder verandert er niets.
 */
export async function middleware(request: NextRequest) {
  // Zonder Supabase-config valt er niets te verversen; laat het verzoek ongemoeid door
  // zodat de app blijft werken voordat alles is aangesloten.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }: CookieToSet) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }: CookieToSet) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/api/chat", "/login", "/"],
};

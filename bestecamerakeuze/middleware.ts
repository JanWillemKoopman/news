import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Ververst de Supabase-sessie zodat server components en API-routes een geldige
 * gebruiker zien.
 *
 * **Waarom de matcher alles dekt.** Hij stond eerder op `["/api/chat", "/login", "/"]`.
 * Het verversen van een sessie is echter niet iets wat je per pagina aan- of uitzet: een
 * toegangstoken is een uur geldig, en de plek die hem ververst rouleert meteen ook het
 * verversingstoken. Gebeurt dat op de ene route wél en op de andere niet, dan kan een
 * API-aanroep die vlak na een paginaverzoek vertrekt nog met het net vervangen token op
 * pad zijn — en dan krijgt hij een 401 terug terwijl de pagina eromheen gewoon is
 * ingelogd. Dat was precies wat er gebeurde op Scores en Kennis en acties: die halen hun
 * data op het moment van laden op, dus die liepen als eerste tegen dat gat aan.
 *
 * Hier zet niets iemand achter de inlog: deze middleware ververst alleen en stuurt nooit
 * door. Elke route bepaalt zelf of hij een gebruiker eist.
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
  // Alles behalve de statische bestanden en de auth-routes zelf. Die laatste schrijven
  // hun eigen cookies (de callback wisselt een code in voor een sessie, signout gooit hem
  // weg); daar moet de middleware niet doorheen fietsen.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

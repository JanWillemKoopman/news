import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { bepaalToegang } from "@/lib/toegang";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Ververst de Supabase-sessie en zet het hele dashboard achter de inlog.
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
 * **Waarom hier ook de deur zit.** Het dashboard stond half open: Campagnes en Tijdlijn
 * lazen mee zonder sessie, de rest niet. Elk paneel besliste dat zelf, dus een nieuw
 * paneel stond standaard open tot iemand eraan dacht. Sinds die beslissing hier ligt,
 * geldt hij voor elke route tegelijk: welke uitzonderingen er zijn, staat in
 * `lib/toegang.ts` en is daar nagerekend.
 *
 * De middleware is niet de énige slotgracht: `app/page.tsx` controleert zelf ook of er
 * een gebruiker is en elke API-route houdt zijn eigen controle. Een fout in de matcher
 * mag geen open deur worden.
 */
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Zonder Supabase-config valt er niets te verversen en kan niemand inloggen. Dan is
  // iedereen uitgelogd en stuurt de gate hieronder alles naar /login, waar precies staat
  // wat er ontbreekt — beter dan een dashboard dat in die toestand open blijft staan.
  const geconfigureerd = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  let response = NextResponse.next({ request });
  let ingelogd = false;

  if (geconfigureerd) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
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

    const {
      data: { user },
    } = await supabase.auth.getUser();
    ingelogd = Boolean(user);
  }

  const besluit = bepaalToegang({ pad: pathname, zoek: search, ingelogd });

  if (besluit.soort === "door") return response;

  if (besluit.soort === "weiger") {
    return metCookies(
      NextResponse.json({ fout: "Niet ingelogd." }, { status: 401 }),
      response,
    );
  }

  const doel = request.nextUrl.clone();
  doel.search = "";

  if (besluit.soort === "naar-dashboard") {
    doel.pathname = "/";
  } else {
    doel.pathname = "/login";
    // Waar je heen wilde, zodat een gedeelde link naar bijvoorbeeld Kosten na het
    // inloggen alsnog op Kosten uitkomt in plaats van op Campagnes.
    if (besluit.verder) doel.searchParams.set("verder", besluit.verder);
  }

  return metCookies(NextResponse.redirect(doel), response);
}

/**
 * Neemt de ververste sessiecookies mee naar een ander antwoord.
 *
 * Zonder dit gooit een omleiding of een 401 het net gerouleerde verversingstoken weg,
 * en is de gebruiker bij het volgende verzoek alsnog uitgelogd.
 */
function metCookies(doel: NextResponse, bron: NextResponse): NextResponse {
  bron.cookies.getAll().forEach((cookie) => doel.cookies.set(cookie));
  return doel;
}

export const config = {
  // Alles behalve de statische bestanden en de auth-routes zelf. Die laatste schrijven
  // hun eigen cookies (de callback wisselt een code in voor een sessie, signout gooit hem
  // weg); daar moet de middleware niet doorheen fietsen.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

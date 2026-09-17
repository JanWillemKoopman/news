/**
 * Wie mag welk verzoek zien?
 *
 * Het dashboard stond tot nu toe half open: Campagnes en Tijdlijn lazen gewoon mee
 * zonder sessie, terwijl Scores, Chat en Kennis wél om een inlog vroegen. Dat verschil
 * zat verspreid over ruim twintig componenten, dus wie een nieuw paneel bouwde moest er
 * zelf aan denken. Nu ligt het besluit op één plek: alles achter de inlog, met hier de
 * paar uitzonderingen die er per se buiten moeten.
 *
 * Deze module is expres puur — geen `next/server`, geen cookies — zodat de regels in
 * `lib/toegang.test.ts` na te rekenen zijn zonder een request na te bouwen.
 */

/**
 * Routes die Vercel Cron aanroept. Die verzoeken komen zonder sessie binnen en
 * legitimeren zich met `CRON_SECRET` in de Authorization-header, wat de route zelf
 * controleert (`app/api/sync/route.ts`, `app/api/windsor-sync/route.ts`). Zou de inlog
 * ze tegenhouden, dan stopt de nachtelijke sync zonder dat iemand het merkt.
 */
export const CRON_PADEN = ["/api/sync", "/api/windsor-sync"] as const;

export type Toegangsbesluit =
  /** Laat het verzoek door. */
  | { soort: "door" }
  /** Geen sessie op een pagina: naar het inlogscherm, met de plek om naar terug te keren. */
  | { soort: "naar-login"; verder: string | null }
  /** Al ingelogd en toch het inlogscherm opgevraagd: terug naar het dashboard. */
  | { soort: "naar-dashboard" }
  /** Geen sessie op een API-route: 401, geen omleiding — een fetch heeft niets aan HTML. */
  | { soort: "weiger" };

export interface Verzoek {
  /** Het pad zonder querystring, bijvoorbeeld `/` of `/api/kosten`. */
  pad: string;
  /** De querystring inclusief vraagteken, of leeg. */
  zoek: string;
  ingelogd: boolean;
}

function isCronPad(pad: string): boolean {
  return (CRON_PADEN as readonly string[]).includes(pad);
}

export function bepaalToegang({ pad, zoek, ingelogd }: Verzoek): Toegangsbesluit {
  // De auth-routes schrijven hun eigen cookies (de callback wisselt een code in voor een
  // sessie, uitloggen gooit hem weg). Die mogen nooit achter de inlog staan, anders kan
  // niemand er nog doorheen.
  if (pad === "/auth" || pad.startsWith("/auth/")) return { soort: "door" };
  if (isCronPad(pad)) return { soort: "door" };

  if (ingelogd) {
    return pad === "/login" ? { soort: "naar-dashboard" } : { soort: "door" };
  }

  if (pad === "/login") return { soort: "door" };
  if (pad === "/api" || pad.startsWith("/api/")) return { soort: "weiger" };

  return { soort: "naar-login", verder: verderWaarde(pad, zoek) };
}

/**
 * Wat er als `?verder=` aan het inlogscherm wordt meegegeven.
 *
 * Het dashboard is één pagina waarop het open tabblad in de URL staat (`/?tab=kosten`),
 * dus een link naar Kosten is een link naar `/` met een querystring. Zonder dit zou je
 * na het inloggen altijd op Campagnes uitkomen en de gedeelde link kwijt zijn. Voor `/`
 * zonder querystring valt er niets te onthouden.
 */
function verderWaarde(pad: string, zoek: string): string | null {
  const volledig = `${pad}${zoek}`;
  return volledig === "/" ? null : volledig;
}

/**
 * De bestemming ná het inloggen, gefilterd.
 *
 * Alleen een pad binnen deze app is goed genoeg. `//kwaadaardig.nl` en
 * `https://kwaadaardig.nl` zien er als waarde van `?verder=` uit als een pad, maar een
 * browser leest ze als een ander domein — dan zou het inlogscherm iemand naar buiten
 * sturen. Alles wat niet met precies één schuine streep begint, valt terug op het
 * dashboard.
 */
export function veiligVerder(waarde: string | null | undefined): string {
  if (!waarde) return "/";
  if (!waarde.startsWith("/")) return "/";
  if (waarde.startsWith("//") || waarde.startsWith("/\\")) return "/";
  return waarde;
}

/**
 * Waar het tabblad Leads over gaat: één bedrijf, één website, dertig dagen.
 *
 * Dit bestand is de enige plek die dat afbakent, en zowel de sync (die de leads uit GA4
 * haalt) als de route (die de uitgaven erbij zoekt) lezen het hier. Zo kan het ene niet
 * stilletjes iets anders meten dan het andere.
 *
 * ## Waarom deze accounts
 *
 * Van den Udenhout / udenhout.nl, en niets anders. Windsor kent van dit concern veel meer
 * accounts (Porsche Centrum Brabant, Veloo, Bentley, een leasesite…), maar die horen niet
 * bij deze leads: een lead op porschecentrumbrabant.nl is geen lead van udenhout.nl, en
 * zou je er alleen in terugvinden als je hem zelf wegfiltert.
 *
 *  - GA4: de property van udenhout.nl. Alleen deze property vuurt `generate_lead_*`; de
 *    andere properties van het concern leverden in de meting nul lead-events.
 *  - Google Ads: het account "Udenhout". Het aparte account "Van den Udenhout Lease"
 *    staat niet in de Windsor-sync en dus ook niet in de database.
 *  - Meta Ads: het account "Van den Udenhout".
 *
 * ## Waarom precies dertig dagen
 *
 * De leadtabel is bewust een rollend venster en geen archief: de uitgaven blijven in
 * `windsor_advertenties` zoals altijd, maar de leads zelf worden elke nacht vervangen
 * door de laatste dertig dagen. Het venster loopt tot en met **gisteren**, net als
 * `periodeGrenzen` op de andere Kanalen-pagina's: de sync draait 's nachts, dus vandaag
 * is nog niet af.
 */

/** De GA4-property van udenhout.nl. */
export const LEADS_GA4_PROPERTY = "255949462";

/** Google Ads-account "Udenhout" in `windsor_advertenties.account_id`. */
export const LEADS_GOOGLE_ACCOUNT = "210-769-6929";

/** Meta Ads-account "Van den Udenhout" in `windsor_advertenties.account_id`. */
export const LEADS_META_ACCOUNT = "69324444";

/** Hoeveel dagen de leadtabel bevat. */
export const LEADS_DAGEN = 30;

export interface LeadsVenster {
  van: string;
  tot: string;
}

function datumTekst(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * De dertig dagen tot en met gisteren, gerekend vanaf `nu`.
 *
 * Op 17 november is dat 18 oktober t/m 16 november: dertig dagen inclusief beide
 * grenzen, niet eenendertig.
 */
export function leadsVenster(nu: Date = new Date(), dagen: number = LEADS_DAGEN): LeadsVenster {
  const tot = new Date(nu);
  tot.setUTCDate(tot.getUTCDate() - 1);
  const van = new Date(tot);
  van.setUTCDate(van.getUTCDate() - (dagen - 1));
  return { van: datumTekst(van), tot: datumTekst(tot) };
}

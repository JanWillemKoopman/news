/**
 * Waar het tabblad Leads over gaat: één bedrijf, één website, vanaf 1 juni 2026.
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
 *  - LinkedIn Ads: het account "Van den Udenhout Groep" (klein, een paar campagnes).
 *
 * ## Vanaf 1 juni 2026, de laatste dertig dagen elke nacht opnieuw
 *
 * Tot november 2026 was de leadtabel een rollend venster van dertig dagen. Op verzoek van de
 * eigenaar bewaart hij nu alles vanaf **1 juni 2026** (`LEADS_VANAF`; na de trackingwissel van
 * eind maart, dus alleen de nieuwe eventnamen). De nachtelijke sync vervangt alleen de
 * laatste dertig dagen (`leadsVenster`): GA4 schrijft een lead soms een paar dagen later aan
 * een kanaal toe, en die late toeschrijving hoort mee te komen. Wat ouder is blijft staan.
 * Ontbreekt het begin (de eerste keer, of na een lege tabel), dan vult de sync eenmalig aan
 * vanaf 1 juni. Alles loopt tot en met **gisteren**, net als `periodeGrenzen` op de andere
 * Kanalen-pagina's: de sync draait 's nachts, dus vandaag is nog niet af.
 */

/** De GA4-property van udenhout.nl. */
export const LEADS_GA4_PROPERTY = "255949462";

/** Google Ads-account "Udenhout" in `windsor_advertenties.account_id`. */
export const LEADS_GOOGLE_ACCOUNT = "210-769-6929";

/** Meta Ads-account "Van den Udenhout" in `windsor_advertenties.account_id`. */
export const LEADS_META_ACCOUNT = "69324444";

/** LinkedIn Ads-account "Van den Udenhout Groep" in `windsor_advertenties.account_id`. */
export const LEADS_LINKEDIN_ACCOUNT = "500669928";

/** Hoeveel dagen de nachtelijke sync opnieuw ophaalt en vervangt. */
export const LEADS_DAGEN = 30;

/** De eerste dag die de leadtabel bewaart (verzoek van de eigenaar, november 2026). */
export const LEADS_VANAF = "2026-06-01";

/**
 * Events die ook als lead tellen, hoewel er "lead" niet in de naam staat.
 *
 * Het uitgangspunt is "alles met 'lead' in de naam" (`isLeadEvent`); dit zijn de
 * uitzonderingen die het team zelf aanwees. Een event hoort hier pas bij als iemand heeft
 * besloten dat hij een lead is: ze lijken op leads, maar een bedankpagina kan bijvoorbeeld
 * ook bij een verversing opnieuw vuren.
 *
 * **Meten wat er daadwerkelijk vuurt.** Bij het toevoegen (november 2026, over de laatste
 * drie maanden en alle zestien GA4-properties) vuurde alleen
 * `bedanktpagina_werkplaatsplanner`: 65–270 keer per dag, ruim 4.400 per dertig dagen en
 * daarmee meer dan alle andere leads samen. De overige vier stonden er niet. Ze staan hier
 * toch, zodat ze meetellen zodra ze gaan vuren; zolang ze dat niet doen leveren ze niets
 * op. Klopt een naam niet, dan is dat in GA4 (DebugView) te controleren — een verkeerd
 * gespelde naam levert geen foutmelding maar ook nooit een rij.
 */
export const LEADS_EXTRA_EVENTS: readonly string[] = [
  "bedanktpagina_werkplaatsplanner",
  "verhuur_aanvraag",
  "verhuuractie_verzonden",
  "verhuur_losse_formulieren",
  "offerte_onderhoud",
];

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

/** Alles wat de leadtabel beslaat: 1 juni 2026 t/m gisteren. */
export function leadsBereik(nu: Date = new Date()): LeadsVenster {
  return { van: LEADS_VANAF, tot: leadsVenster(nu).tot };
}

/** Een datum `JJJJ-MM-DD` plus (of min) een aantal dagen. */
export function verschuifDatum(datum: string, dagen: number): string {
  const d = new Date(`${datum}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dagen);
  return datumTekst(d);
}

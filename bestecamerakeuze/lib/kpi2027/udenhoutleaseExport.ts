/**
 * Zakelijke leaseaanvragen via udenhoutlease.nl, januari t/m maart 2026.
 *
 * Waarom dit bestand bestaat: tot en met maart 2026 kwamen de zakelijke leads van Van den
 * Udenhout binnen via de aparte website udenhoutlease.nl. Die site meet in een eigen
 * GA4-property (344604643, "Udenhoutlease.nl - GA4"), niet in die van udenhout.nl
 * (255949462). Begin april is udenhoutlease.nl gestopt en zijn de zakelijke leads naar
 * udenhout.nl verhuisd (`generate_lead_zakelijk_offerte`, `generate_lead_leasecontact`).
 * Zonder dit bestand telde de KPI Zakelijke lease van udenhout.nl voor januari t/m maart
 * alleen de 2 aanvragen die op udenhout.nl zelf binnenkwamen, en vielen verwachting 2026 en
 * target 2027 te laag uit. Besluit van de eigenaar van het dashboard, 19 november 2026.
 *
 * Wat geteld wordt: de twee key events van udenhoutlease.nl, `event_count` per dag:
 *   - `offerte_aanvraag`  — formulier op /contact/vrijblijvende-offerte (100×)
 *   - `contact_verzonden` — contactformulier op /contact (9×)
 * Bewust níet meegeteld (keuze van de eigenaar): het proefritformulier
 * (/contact/proefrit-aanvraag, 6×) en de actieformulieren op /acties/… (VW, Audi, Seat,
 * Skoda, VW Bedrijfswagens; 20×). Die vuren alleen een algemeen `form_submit` en zijn op
 * udenhout.nl geen zakelijke lease, dus optellen zou soorten leads mengen.
 *
 * Hoe het meetelt: `optellen: true` op de externe bron (`definities.ts`). Deze aantallen
 * komen bovenop wat udenhout.nl zelf in die maanden mat — de twee sites zijn verschillende
 * formulieren, dus niets telt dubbel — en ze vervangen geen GA4-cijfers.
 *
 * De meting van udenhoutlease.nl stopt na 31 maart (daarna nog een handvol losse
 * paginabezoeken t/m 17 augustus, geen aanvragen). De property wordt daarom niet wekelijks
 * opgehaald: deze cijfers liggen vast. Opgehaald via Windsor op 19 november 2026.
 *
 * Per maand (controle):
 *   maand    offerte  contact  totaal
 *   2026-01       38        2      40
 *   2026-02       29        6      35
 *   2026-03       33        1      34
 *   totaal       100        9     109
 */

/** T/m deze dag tellen de aanvragen van udenhoutlease.nl mee; daarna stopte die site. */
export const UDENHOUTLEASE_TOT = "2026-03-31";

/** `offerte_aanvraag` + `contact_verzonden` per dag, property 344604643. */
export const UDENHOUTLEASE_AANVRAGEN: Readonly<Record<string, number>> = {
  "2026-01-02": 2, "2026-01-03": 2, "2026-01-08": 2, "2026-01-09": 4, "2026-01-15": 4, "2026-01-16": 1,
  "2026-01-18": 2, "2026-01-20": 1, "2026-01-21": 2, "2026-01-22": 2, "2026-01-25": 3, "2026-01-26": 5,
  "2026-01-27": 6, "2026-01-29": 1, "2026-01-30": 2, "2026-01-31": 1, "2026-02-02": 1, "2026-02-03": 3,
  "2026-02-04": 1, "2026-02-06": 2, "2026-02-07": 4, "2026-02-12": 1, "2026-02-13": 1, "2026-02-15": 1,
  "2026-02-16": 4, "2026-02-18": 1, "2026-02-19": 4, "2026-02-20": 1, "2026-02-25": 5, "2026-02-26": 6,
  "2026-03-02": 1, "2026-03-09": 9, "2026-03-10": 1, "2026-03-11": 1, "2026-03-12": 2, "2026-03-13": 2,
  "2026-03-16": 1, "2026-03-17": 1, "2026-03-18": 4, "2026-03-22": 2, "2026-03-23": 1, "2026-03-24": 1,
  "2026-03-25": 2, "2026-03-27": 1, "2026-03-28": 2, "2026-03-29": 2, "2026-03-30": 1,
};

/**
 * Zakelijke leaseaanvragen via udenhoutlease.nl: heel 2025 en januari t/m maart 2026.
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
 * **2025, voor de lijn 2025 in de grafiek.** In 2025 liepen de zakelijke leads volledig via
 * udenhoutlease.nl; udenhout.nl mat er dat jaar maar 5 (augustus t/m oktober). Dezelfde twee
 * events, dezelfde formulieren, en heel 2025 had de property elke maand aanvragen. Deze
 * cijfers tellen alleen in de vergelijkingslijn, niet in de verwachting of het target
 * (die rekenen alleen met 2026). Besluit van de eigenaar, 19 november 2026.
 *
 * De meting van udenhoutlease.nl stopt na 31 maart (daarna nog een handvol losse
 * paginabezoeken t/m 17 augustus, geen aanvragen). De property wordt daarom niet wekelijks
 * opgehaald: deze cijfers liggen vast. Opgehaald via Windsor op 19 november 2026.
 *
 * 2025 per maand (controle; offerte_aanvraag 324 + contact_verzonden 22):
 *   jan 27, feb 32, mrt 29, apr 29, mei 25, jun 18, jul 43, aug 28, sep 29, okt 38,
 *   nov 21, dec 27 — totaal 346
 *
 * 2026 per maand (controle):
 *   maand    offerte  contact  totaal
 *   2026-01       38        2      40
 *   2026-02       29        6      35
 *   2026-03       33        1      34
 *   totaal       100        9     109
 */

/** T/m deze dag tellen de aanvragen van udenhoutlease.nl mee; daarna stopte die site. */
export const UDENHOUTLEASE_TOT = "2026-03-31";

/** `offerte_aanvraag` + `contact_verzonden` per dag, property 344604643, 2025 en 2026. */
export const UDENHOUTLEASE_AANVRAGEN: Readonly<Record<string, number>> = {
  "2025-01-02": 1, "2025-01-04": 1, "2025-01-07": 1, "2025-01-08": 4, "2025-01-10": 2, "2025-01-13": 1,
  "2025-01-15": 2, "2025-01-16": 3, "2025-01-17": 2, "2025-01-20": 1, "2025-01-21": 2, "2025-01-24": 1,
  "2025-01-25": 3, "2025-01-26": 1, "2025-01-28": 1, "2025-01-30": 1, "2025-02-02": 1, "2025-02-03": 2,
  "2025-02-04": 1, "2025-02-06": 1, "2025-02-07": 3, "2025-02-09": 1, "2025-02-10": 2, "2025-02-14": 3,
  "2025-02-15": 2, "2025-02-16": 1, "2025-02-17": 1, "2025-02-19": 1, "2025-02-21": 2, "2025-02-22": 1,
  "2025-02-24": 1, "2025-02-25": 6, "2025-02-26": 1, "2025-02-27": 2, "2025-03-05": 2, "2025-03-08": 2,
  "2025-03-11": 2, "2025-03-12": 1, "2025-03-13": 2, "2025-03-14": 1, "2025-03-15": 1, "2025-03-18": 1,
  "2025-03-19": 2, "2025-03-20": 1, "2025-03-24": 1, "2025-03-26": 3, "2025-03-27": 4, "2025-03-28": 2,
  "2025-03-29": 2, "2025-03-31": 2, "2025-04-01": 1, "2025-04-02": 1, "2025-04-03": 3, "2025-04-04": 1,
  "2025-04-05": 1, "2025-04-07": 2, "2025-04-08": 1, "2025-04-09": 1, "2025-04-10": 3, "2025-04-11": 1,
  "2025-04-14": 2, "2025-04-15": 1, "2025-04-16": 1, "2025-04-18": 2, "2025-04-19": 1, "2025-04-21": 1,
  "2025-04-24": 2, "2025-04-25": 2, "2025-04-30": 2, "2025-05-01": 3, "2025-05-07": 2, "2025-05-09": 1,
  "2025-05-11": 1, "2025-05-13": 1, "2025-05-17": 1, "2025-05-18": 1, "2025-05-20": 5, "2025-05-23": 2,
  "2025-05-28": 4, "2025-05-29": 2, "2025-05-31": 2, "2025-06-02": 1, "2025-06-05": 2, "2025-06-10": 3,
  "2025-06-12": 2, "2025-06-20": 1, "2025-06-21": 1, "2025-06-23": 2, "2025-06-25": 1, "2025-06-26": 1,
  "2025-06-27": 3, "2025-06-30": 1, "2025-07-01": 1, "2025-07-03": 3, "2025-07-04": 1, "2025-07-06": 1,
  "2025-07-08": 2, "2025-07-12": 1, "2025-07-14": 4, "2025-07-15": 1, "2025-07-16": 2, "2025-07-17": 2,
  "2025-07-19": 7, "2025-07-21": 4, "2025-07-23": 3, "2025-07-24": 1, "2025-07-25": 1, "2025-07-27": 2,
  "2025-07-30": 1, "2025-07-31": 6, "2025-08-03": 1, "2025-08-06": 3, "2025-08-07": 1, "2025-08-09": 2,
  "2025-08-11": 2, "2025-08-13": 3, "2025-08-14": 1, "2025-08-16": 1, "2025-08-17": 3, "2025-08-18": 3,
  "2025-08-19": 3, "2025-08-20": 1, "2025-08-21": 2, "2025-08-22": 2, "2025-09-01": 2, "2025-09-02": 1,
  "2025-09-03": 1, "2025-09-05": 2, "2025-09-09": 2, "2025-09-11": 4, "2025-09-13": 1, "2025-09-16": 1,
  "2025-09-17": 1, "2025-09-24": 1, "2025-09-25": 3, "2025-09-26": 2, "2025-09-27": 2, "2025-09-29": 3,
  "2025-09-30": 3, "2025-10-01": 1, "2025-10-02": 1, "2025-10-06": 5, "2025-10-07": 3, "2025-10-08": 4,
  "2025-10-09": 1, "2025-10-10": 1, "2025-10-17": 2, "2025-10-19": 3, "2025-10-21": 3, "2025-10-22": 1,
  "2025-10-23": 1, "2025-10-25": 1, "2025-10-27": 2, "2025-10-28": 5, "2025-10-30": 2, "2025-10-31": 2,
  "2025-11-02": 1, "2025-11-03": 3, "2025-11-05": 1, "2025-11-09": 1, "2025-11-13": 1, "2025-11-14": 1,
  "2025-11-16": 1, "2025-11-20": 1, "2025-11-21": 1, "2025-11-22": 1, "2025-11-23": 2, "2025-11-25": 6,
  "2025-11-28": 1, "2025-12-01": 1, "2025-12-02": 5, "2025-12-03": 4, "2025-12-05": 2, "2025-12-06": 1,
  "2025-12-09": 1, "2025-12-11": 2, "2025-12-12": 1, "2025-12-13": 2, "2025-12-18": 2, "2025-12-21": 2,
  "2025-12-27": 2, "2025-12-28": 2,
  "2026-01-02": 2, "2026-01-03": 2, "2026-01-08": 2, "2026-01-09": 4, "2026-01-15": 4, "2026-01-16": 1,
  "2026-01-18": 2, "2026-01-20": 1, "2026-01-21": 2, "2026-01-22": 2, "2026-01-25": 3, "2026-01-26": 5,
  "2026-01-27": 6, "2026-01-29": 1, "2026-01-30": 2, "2026-01-31": 1, "2026-02-02": 1, "2026-02-03": 3,
  "2026-02-04": 1, "2026-02-06": 2, "2026-02-07": 4, "2026-02-12": 1, "2026-02-13": 1, "2026-02-15": 1,
  "2026-02-16": 4, "2026-02-18": 1, "2026-02-19": 4, "2026-02-20": 1, "2026-02-25": 5, "2026-02-26": 6,
  "2026-03-02": 1, "2026-03-09": 9, "2026-03-10": 1, "2026-03-11": 1, "2026-03-12": 2, "2026-03-13": 2,
  "2026-03-16": 1, "2026-03-17": 1, "2026-03-18": 4, "2026-03-22": 2, "2026-03-23": 1, "2026-03-24": 1,
  "2026-03-25": 2, "2026-03-27": 1, "2026-03-28": 2, "2026-03-29": 2, "2026-03-30": 1,
};

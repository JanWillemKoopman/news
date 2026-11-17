import { getal, tekst, type WindsorRij } from "@/lib/windsor/api";

/**
 * Van GA4-rijen naar de rijen van `windsor_ga4_leads`.
 *
 * Eén plek voor de opschoning, gedeeld door de nachtelijke sync en de eerste vulling van
 * de tabel: wat daar wordt weggeschreven moet op de byte overeenkomen met wat de sync
 * morgen schrijft, anders verspringt de telling na de eerste nacht.
 *
 * Geen databasekennis en geen netwerk hierin — pure functies, getest in
 * `normaliseer.test.ts`.
 */

/** Eén rij zoals hij in `windsor_ga4_leads` staat. */
export interface LeadRij {
  datum: string;
  event: string;
  bronMedium: string;
  campagne: string;
  merk: string;
  model: string;
  formulier: string;
  aantal: number;
}

/**
 * Het grootste aantal dat de kolom kan dragen: `aantal` is een `smallint`.
 *
 * Eén rij is één dag × event × bron/medium × campagne × merk × model × formulier; de
 * grootste in de meting was 15. Een rij van 32.767 kan daarom niet voorkomen, maar de
 * grens staat er toch: een overschrijding zou anders niet die ene rij maar de hele
 * nachtelijke batch laten omvallen, en met hem de lead-cijfers van de volgende ochtend.
 */
export const MAX_AANTAL = 32767;

/** Langer dan dit is geen merk, model of campagne meer maar een misvormde waarde. */
const MAX_TEKST = 200;

/**
 * Waarden die een website invult wanneer een sjabloonvariabele niet werd vervangen.
 *
 * `model_titel` staat in de meting bij 99 van de 400 leads mét merk: het formulier
 * stuurt de naam van het sjabloonveld mee in plaats van het model. Als model telt dat
 * als "onbekend", want een tabel met "model_titel" als populairste model liegt over wat
 * mensen willen. Het merk ernaast blijft wél bewaard — dat klopt gewoon.
 */
const SJABLOON_WAARDEN = new Set(["model_titel", "merk_titel", "undefined", "null", "nan"]);

/**
 * Een dimensiewaarde, schoon.
 *
 * Leeg en "(not set)" worden allebei een lege string: het is dezelfde toestand, en twee
 * schrijfwijzen voor "onbekend" leveren twee regels op die niemand uit elkaar kan
 * houden. Witruimte wordt platgeslagen, want "Tiguan " en "Tiguan" zijn voor een mens
 * één model en voor een `group by` twee.
 */
export function schoonWaarde(waarde: unknown): string {
  const t = tekst(waarde);
  if (!t) return "";
  const schoon = t.replace(/\s+/g, " ").trim();
  if (schoon === "" || schoon === "(not set)") return "";
  return schoon.length > MAX_TEKST ? schoon.slice(0, MAX_TEKST) : schoon;
}

/** Een event-parameter (merk, model, formulier): schoon, én geen onvervangen sjabloon. */
export function schoonParameter(waarde: unknown): string {
  const schoon = schoonWaarde(waarde);
  return SJABLOON_WAARDEN.has(schoon.toLowerCase()) ? "" : schoon;
}

/** Een event telt mee zodra "lead" ergens in de naam staat, in welke schrijfwijze ook. */
export function isLeadEvent(naam: string): boolean {
  return /lead/i.test(naam);
}

function sleutelVan(r: LeadRij): string {
  return [r.datum, r.event, r.bronMedium, r.campagne, r.merk, r.model, r.formulier].join("\u0000");
}

/**
 * Windsor-rijen → leadrijen, één per unieke sleutel.
 *
 * Twee rijen met dezelfde sleutel zijn twee stukjes van hetzelfde cijfer en worden
 * opgeteld (dat gebeurt zodra "(not set)" en een lege waarde op dezelfde lege string
 * landen). Wie de laatste liet winnen, gooide het eerste stuk weg zonder dat iets dat
 * meldde. De uitvoer staat op datum en event, zodat twee runs over dezelfde data
 * dezelfde volgorde schrijven.
 */
export function leadRijenUitWindsor(rijen: WindsorRij[]): LeadRij[] {
  const samen = new Map<string, LeadRij>();

  for (const r of rijen) {
    const datum = tekst(r.date);
    const event = schoonWaarde(r.event_name);
    const aantal = Math.round(getal(r.event_count));
    if (!datum || !event || !isLeadEvent(event) || aantal <= 0) continue;

    const rij: LeadRij = {
      datum,
      event,
      bronMedium: schoonWaarde(r.session_source_medium),
      campagne: schoonWaarde(r.campaign),
      merk: schoonParameter(r.customevent_car_brand),
      model: schoonParameter(r.customevent_car_model),
      formulier: schoonParameter(r.customevent_form_location),
      aantal,
    };
    const sleutel = sleutelVan(rij);
    const bestaand = samen.get(sleutel);
    if (bestaand) bestaand.aantal += aantal;
    else samen.set(sleutel, rij);
  }

  return [...samen.values()]
    .map((r) => ({ ...r, aantal: Math.min(r.aantal, MAX_AANTAL) }))
    .sort((a, b) => a.datum.localeCompare(b.datum) || a.event.localeCompare(b.event));
}

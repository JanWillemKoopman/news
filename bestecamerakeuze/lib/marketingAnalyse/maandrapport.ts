import type {
  MaMaandrapport,
  MrBedrijf,
  MrCampagne,
  MrKanaal,
  MrSocialKanaal,
  MrTegel,
  MrTopContent,
  MrUitgaven,
  MrUitsplitsing,
  MrWaarde,
} from "./types";

/**
 * Rekenwerk en opschoning van het Maandrapport (formaat 4, opzet "Maandrapport Jana").
 *
 * Het rapport is door een model geschreven; een veld dat ontbreekt of onzin is, mag de pagina niet
 * breken. Alles wat het dashboard zelf uitrekent (forecast, aandelen, verschillen) staat hier, zodat
 * het te testen is en een lezer het kan narekenen.
 */

const NL = "nl-NL";

function getal(x: unknown): number | null {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}

function tekst(x: unknown): string {
  return typeof x === "string" ? x.trim() : "";
}

function lijst<T>(x: T[] | undefined | null): T[] {
  return Array.isArray(x) ? x : [];
}

function waarde(ruw: unknown): MrWaarde {
  const r = (ruw ?? {}) as Partial<MrWaarde>;
  return { waarde: getal(r.waarde), vorige: getal(r.vorige) };
}

function uitsplitsing(ruw: unknown): MrUitsplitsing[] {
  return lijst(ruw as MrUitsplitsing[])
    .filter((u) => u && typeof u === "object" && tekst(u.label))
    .map((u) => ({ label: tekst(u.label), ...waarde(u) }));
}

function tegel(ruw: unknown): MrTegel {
  const r = (ruw ?? {}) as Partial<MrTegel>;
  const x = lijst(r.reeks?.x).map(String);
  const reeks = x.length > 0 ? { x, waarden: x.map((_, i) => getal(r.reeks?.waarden?.[i])) } : undefined;
  const nietGemeten = tekst(r.nietGemeten);
  return {
    ...waarde(r),
    ...(reeks ? { reeks } : {}),
    uitsplitsing: uitsplitsing(r.uitsplitsing),
    ...(tekst(r.toelichting) ? { toelichting: tekst(r.toelichting) } : {}),
    ...(nietGemeten ? { nietGemeten } : {}),
  };
}

function uitgaven(ruw: unknown): MrUitgaven {
  const r = (ruw ?? {}) as Partial<MrUitgaven>;
  const nietGemeten = tekst(r.nietGemeten);
  return {
    ...waarde(r),
    jaarTotaal: getal(r.jaarTotaal),
    jaarbudget: getal(r.jaarbudget),
    uitsplitsing: uitsplitsing(r.uitsplitsing),
    ...(nietGemeten ? { nietGemeten } : {}),
  };
}

function kanalen(ruw: unknown): MrKanaal[] {
  return lijst(ruw as MrKanaal[])
    .filter((k) => k && typeof k === "object" && tekst(k.kanaal))
    .map((k) => ({ kanaal: tekst(k.kanaal), ...waarde(k) }));
}

function topContent(ruw: unknown): MrTopContent | null {
  const r = ruw as Partial<MrTopContent> | null | undefined;
  if (!r || typeof r !== "object" || (!tekst(r.titel) && !tekst(r.kanaal))) return null;
  const m = (r.metriek ?? {}) as Partial<MrTopContent["metriek"]>;
  const afbeelding = tekst(r.afbeelding);
  return {
    kanaal: tekst(r.kanaal),
    account: tekst(r.account),
    datum: tekst(r.datum) || null,
    titel: tekst(r.titel),
    url: tekst(r.url) || null,
    // Alleen een data-URL of een https-adres: een model mag geen script of vreemd schema in een <img> zetten.
    afbeelding: /^(data:image\/(png|jpe?g|webp);base64,|https:\/\/)/i.test(afbeelding) ? afbeelding : null,
    metriek: {
      label: tekst(m.label),
      waarde: getal(m.waarde),
      eenheid: m.eenheid === "euro" || m.eenheid === "aantal" || m.eenheid === "seconden" ? m.eenheid : "procent",
    },
    waarom: tekst(r.waarom),
  };
}

function campagnes(ruw: unknown): MrCampagne[] {
  return lijst(ruw as MrCampagne[])
    .filter((c) => c && typeof c === "object" && tekst(c.campagne))
    .map((c) => ({
      campagne: tekst(c.campagne),
      platform: tekst(c.platform),
      uitgaven: waarde(c.uitgaven),
      leads: waarde(c.leads),
      cpl: waarde(c.cpl),
    }));
}

function socialKanalen(ruw: unknown): MrSocialKanaal[] {
  return lijst(ruw as MrSocialKanaal[])
    .filter((k) => k && typeof k === "object" && tekst(k.kanaal))
    .map((k) => ({
      kanaal: tekst(k.kanaal),
      account: tekst(k.account),
      volgers: waarde(k.volgers),
      bereik: waarde(k.bereik),
      vertoningen: waarde(k.vertoningen),
      likes: waarde(k.likes),
      reacties: waarde(k.reacties),
      posts: waarde(k.posts),
    }));
}

function bedrijf(ruw: unknown): MrBedrijf | null {
  const r = ruw as Partial<MrBedrijf> | null | undefined;
  if (!r || typeof r !== "object" || !tekst(r.naam)) return null;
  const top = topContent(r.topContent);
  return {
    naam: tekst(r.naam),
    leads: tegel(r.leads),
    sessies: tegel(r.sessies),
    bereik: tegel(r.bereik),
    uitgaven: uitgaven(r.uitgaven),
    kanalen: kanalen(r.kanalen),
    topContent: top,
    ...(tekst(r.topContentReden) ? { topContentReden: tekst(r.topContentReden) } : {}),
    campagnes: campagnes(r.campagnes),
    socialKanalen: socialKanalen(r.socialKanalen),
    ...(tekst(r.socialReden) ? { socialReden: tekst(r.socialReden) } : {}),
  };
}

/** Het maandrapport uit een opgeslagen resultaat, opgeschoond; undefined als er geen bedrijf in zit. */
export function leesMaandrapport(ruw: unknown): MaMaandrapport | undefined {
  const r = ruw as Partial<MaMaandrapport> | null | undefined;
  if (!r || typeof r !== "object") return undefined;
  const bedrijven = lijst(r.bedrijven)
    .map(bedrijf)
    .filter((b): b is MrBedrijf => b !== null);
  if (bedrijven.length === 0) return undefined;
  return { maand: tekst(r.maand), vorigeMaand: tekst(r.vorigeMaand), bedrijven };
}

// ---------------------------------------------------------------------------
// Maandnamen
// ---------------------------------------------------------------------------

/** "2026-10" → "oktober 2026"; wat niet past blijft zoals het is. */
export function maandNaam(maand: string, metJaar = true): string {
  if (!/^\d{4}-\d{2}$/.test(maand)) return maand;
  return new Intl.DateTimeFormat(NL, { month: "long", ...(metJaar ? { year: "numeric" } : {}), timeZone: "UTC" }).format(
    new Date(`${maand}-01T00:00:00Z`),
  );
}

/** "2026-10" → "okt"; voor de as van een grafiek. */
export function maandKort(maand: string): string {
  if (!/^\d{4}-\d{2}$/.test(maand)) return maand;
  return new Intl.DateTimeFormat(NL, { month: "short", timeZone: "UTC" }).format(new Date(`${maand}-01T00:00:00Z`)).replace(".", "");
}

/** De maand na `maand`: "2026-12" → "2027-01". */
export function volgendeMaand(maand: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(maand);
  if (!m) return maand;
  const j = Number(m[1]);
  const n = Number(m[2]);
  return n >= 12 ? `${j + 1}-01` : `${j}-${String(n + 1).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Forecast
// ---------------------------------------------------------------------------

export interface Forecast {
  /** De verwachting voor de maand na de laatste, afgerond op een heel getal en niet onder nul. */
  verwachting: number;
  /** ± de standaardafwijking van de afwijkingen rond de trendlijn, afgerond. */
  marge: number;
  /** Hoeveel maanden de trend bevat. */
  gebruikt: number;
}

/**
 * "Wat wordt het naar verwachting als deze trend zich zo voortzet": een rechte lijn door de
 * laatste `venster` maanden (kleinste kwadraten), doorgetrokken naar de volgende maand. De marge is de
 * standaardafwijking van de maanden rond die lijn (n − 2 vrijheidsgraden). Bewust een rechte lijn zonder
 * seizoen: zo is hij na te rekenen. Minder dan drie maanden met een cijfer: geen forecast.
 * `waarden` zijn de opeenvolgende kalendermaanden t/m de laatste volle maand (null = niet gemeten).
 */
export function maandrapportForecast(waarden: readonly (number | null)[], venster = 6): Forecast | null {
  const punten = waarden
    .map((w, i) => ({ x: i, y: w }))
    .filter((p): p is { x: number; y: number } => typeof p.y === "number" && Number.isFinite(p.y))
    .slice(-venster);
  const n = punten.length;
  if (n < 3) return null;
  const gemX = punten.reduce((t, p) => t + p.x, 0) / n;
  const gemY = punten.reduce((t, p) => t + p.y, 0) / n;
  const sxx = punten.reduce((t, p) => t + (p.x - gemX) ** 2, 0);
  if (sxx === 0) return null;
  const helling = punten.reduce((t, p) => t + (p.x - gemX) * (p.y - gemY), 0) / sxx;
  const begin = gemY - helling * gemX;
  const sse = punten.reduce((t, p) => t + (p.y - (begin + helling * p.x)) ** 2, 0);
  const sd = Math.sqrt(sse / (n - 2));
  return {
    verwachting: Math.max(0, Math.round(begin + helling * waarden.length)),
    marge: Math.round(sd),
    gebruikt: n,
  };
}

/** De punten van de trendgrafiek: de werkelijke maanden en een gestippelde lijn naar de forecast. */
export function trendPunten(
  x: readonly string[],
  waarden: readonly (number | null)[],
  forecast: Forecast | null,
): { x: string; werkelijk: number | null; forecast: number | null }[] {
  const punten = x.map((m, i) => ({ x: m, werkelijk: waarden[i] ?? null, forecast: null as number | null }));
  if (!forecast || x.length === 0) return punten;
  // De stippellijn begint bij de laatste werkelijke maand, zodat hij aansluit op de doorgetrokken lijn.
  punten[punten.length - 1].forecast = punten[punten.length - 1].werkelijk;
  punten.push({ x: volgendeMaand(x[x.length - 1]), werkelijk: null, forecast: forecast.verwachting });
  return punten;
}

// ---------------------------------------------------------------------------
// Kanalen, campagnes, budget
// ---------------------------------------------------------------------------

export interface KanaalAandeel {
  kanaal: string;
  sessies: number;
  /** Aandeel in procenten (0–100) van alle sessies van de maand. */
  aandeel: number;
  /** Aandeel in de maand ervoor; null als die ontbreekt. */
  vorigAandeel: number | null;
  /** Verschil in procentpunten; null zonder vorige maand. */
  verschilPunten: number | null;
}

/**
 * Het cirkeldiagram "prestaties per online kanaal": sessies per kanaal als aandeel van het totaal, met het
 * verschil in procentpunten tegen de maand ervoor. Kanalen zonder sessies deze maand vallen weg; hoog naar laag.
 */
export function kanaalAandelen(kanalenLijst: readonly MrKanaal[]): KanaalAandeel[] {
  const nu = kanalenLijst.filter((k) => (k.waarde ?? 0) > 0);
  const totaal = nu.reduce((t, k) => t + (k.waarde ?? 0), 0);
  const vorigTotaal = kanalenLijst.reduce((t, k) => t + (k.vorige ?? 0), 0);
  return nu
    .map((k) => {
      const aandeel = totaal > 0 ? ((k.waarde ?? 0) / totaal) * 100 : 0;
      const vorigAandeel = vorigTotaal > 0 && k.vorige != null ? (k.vorige / vorigTotaal) * 100 : null;
      return {
        kanaal: k.kanaal,
        sessies: k.waarde ?? 0,
        aandeel,
        vorigAandeel,
        verschilPunten: vorigAandeel === null ? null : aandeel - vorigAandeel,
      };
    })
    .sort((a, b) => b.sessies - a.sessies);
}

/** De campagnetabel: alle campagnes, hoogste uitgaven bovenaan (besluit van de eigenaar, 27 november 2026). */
export function sorteerCampagnes(rijen: readonly MrCampagne[]): MrCampagne[] {
  return [...rijen].sort((a, b) => (b.uitgaven.waarde ?? -1) - (a.uitgaven.waarde ?? -1));
}

/** De totaalregel van de campagnetabel: uitgaven en leads opgeteld, kosten per lead daaruit. */
export function campagnesTotaal(rijen: readonly MrCampagne[]): { uitgaven: MrWaarde; leads: MrWaarde; cpl: MrWaarde } {
  const som = (sleutel: "uitgaven" | "leads", veld: "waarde" | "vorige") => {
    const w = rijen.map((r) => r[sleutel][veld]).filter((x): x is number => typeof x === "number");
    return w.length > 0 ? w.reduce((t, x) => t + x, 0) : null;
  };
  const verhouding = (u: number | null, l: number | null) => (u !== null && l !== null && l > 0 ? u / l : null);
  const uitgavenNu = som("uitgaven", "waarde");
  const uitgavenToen = som("uitgaven", "vorige");
  const leadsNu = som("leads", "waarde");
  const leadsToen = som("leads", "vorige");
  return {
    uitgaven: { waarde: uitgavenNu, vorige: uitgavenToen },
    leads: { waarde: leadsNu, vorige: leadsToen },
    cpl: { waarde: verhouding(uitgavenNu, leadsNu), vorige: verhouding(uitgavenToen, leadsToen) },
  };
}

/** Het tijdelijke jaarbudget: uitgaven sinds 1 januari plus 22% (besluit van de eigenaar, 27 november 2026). */
export const JAARBUDGET_OPSLAG = 1.22;

export function tijdelijkJaarbudget(jaarTotaal: number | null): number | null {
  return jaarTotaal === null ? null : Math.round(jaarTotaal * JAARBUDGET_OPSLAG * 100) / 100;
}

/** Het aandeel van het jaarbudget dat is uitgegeven (0–100+); null zonder budget. */
export function budgetAandeel(jaarTotaal: number | null, jaarbudget: number | null): number | null {
  if (jaarTotaal === null || jaarbudget === null || jaarbudget <= 0) return null;
  return (jaarTotaal / jaarbudget) * 100;
}

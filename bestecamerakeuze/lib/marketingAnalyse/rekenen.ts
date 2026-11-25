/**
 * Marketing analyse — pure functies voor formulier, semantic layer en weergave. Zonder
 * React of database, zodat ze zonder bundler te testen zijn (`rekenen.test.ts`).
 */
import {
  ANALYSE_TABBLADEN,
  SEMANTIEK_BLOKKEN,
  type Aanbeveling,
  type Eenheid,
  type Kerncijfer,
  type Prioriteit,
  type Sectie,
  type TabOordeel,
  BEDRIJF_MET_SYNTEC,
  type FunnelStap,
  type Formulier,
  type MaKerncijfers,
  type MaCampagneInvoer,
  type MaResultaat,
  type SemantiekInhoud,
  type SemantiekSleutel,
} from "./types";

// ---------------------------------------------------------------------------
// Briefing
// ---------------------------------------------------------------------------

const MAX_KORT = 200;
const MAX_LANG = 10_000;

function tekstOfNull(waarde: unknown, max: number): string | null {
  if (typeof waarde !== "string") return null;
  const s = waarde.trim();
  return s ? s.slice(0, max) : null;
}

function datumOfNull(waarde: unknown): string | null {
  if (typeof waarde !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(waarde.trim())) return null;
  const d = new Date(`${waarde.trim()}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : waarde.trim();
}

/**
 * Een bedrag zoals een collega het typt: "5000", "5.000", "5.000,50", "€ 5000" of "5000.5".
 * Een punt gevolgd door precies drie cijfers is een duizendtal (Nederlandse notatie).
 */
export function leesBedrag(waarde: unknown): number | null {
  if (typeof waarde === "number") return Number.isFinite(waarde) && waarde >= 0 ? waarde : null;
  if (typeof waarde !== "string") return null;
  let s = waarde.replace(/[€\s]/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const getal = Number(s);
  return Number.isFinite(getal) && getal >= 0 ? getal : null;
}

/** Modellen uit een lijst of uit tekst ("A2, Q4" of één per regel), zonder dubbele. */
export function leesModellen(waarde: unknown): string[] {
  const ruw = Array.isArray(waarde) ? waarde : typeof waarde === "string" ? waarde.split(/[,\n;]/) : [];
  const gezien = new Set<string>();
  const uit: string[] = [];
  for (const m of ruw) {
    if (typeof m !== "string") continue;
    const s = m.trim().slice(0, MAX_KORT);
    if (s && !gezien.has(s.toLowerCase())) {
      gezien.add(s.toLowerCase());
      uit.push(s);
    }
  }
  return uit.slice(0, 20);
}

/**
 * Eén vorm van een URL om op te vergelijken: host zonder www, pad, kleine letters, zonder
 * protocol, query, hash of slash aan het eind. Dezelfde regel als
 * `dataloket.marketing_analyse_pagina_sleutel` (migratie 0046).
 */
export function paginaSleutel(url: string): string | null {
  const s = url
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/[?#].*$/, "")
    .replace(/^www\.|\/+$/g, "");
  return s || null;
}

// ---------------------------------------------------------------------------
// E-mailadressen per merk
// ---------------------------------------------------------------------------

/**
 * De merken die standaard in E-mail settings staan. Merken die al adressen hebben of in een
 * briefing voorkomen, komen erbij (`merkenVoorMail`).
 */
export const STANDAARD_MERKEN = [
  "Volkswagen",
  "Volkswagen Bedrijfswagens",
  "Audi",
  "Škoda",
  "SEAT",
  "CUPRA",
  "Porsche",
  "Bentley",
] as const;

const ACCENT_VAN = "áàäâãåéèëêíìïîóòöôõúùüûýÿšžčřńñçłđ";
const ACCENT_NAAR = "aaaaaaeeeeiiiiooooouuuuyyszcrnncld";

/**
 * De vergelijkingssleutel van één merk: kleine letters, zonder accenten, alleen letters en
 * cijfers met één spatie ertussen ("Škoda" → "skoda"). Dezelfde regel als
 * `dataloket.marketing_analyse_merk_sleutel` (migratie 0047).
 */
export function merkSleutel(merk: string | null | undefined): string | null {
  const klein = [...(merk ?? "").toLowerCase()]
    .map((t) => {
      const i = ACCENT_VAN.indexOf(t);
      return i >= 0 ? ACCENT_NAAR[i] : t;
    })
    .join("");
  const s = klein.replace(/[^a-z0-9]+/g, " ").trim();
  return s || null;
}

/**
 * Alle merksleutels in een merkveld uit de briefing: gesplitst op komma, puntkomma, slash, plus,
 * & en " en " ("Volkswagen, Audi" → volkswagen en audi). Zelfde regel als
 * `dataloket.marketing_analyse_merk_sleutels`.
 */
export function merkSleutels(merk: string | null | undefined): string[] {
  const delen = (merk ?? "").split(/\s*(?:,|;|\/|\+|&|\s+en\s+)\s*/i);
  return [...new Set(delen.map(merkSleutel).filter((s): s is string => s !== null))];
}

/**
 * De merken voor E-mail settings: de standaardmerken, dan merken met adressen en merken uit de
 * briefings die daar nog niet tussen staan (op sleutel), alfabetisch. Een merkveld met meer
 * merken telt als die losse merken.
 */
export function merkenVoorMail(opgeslagen: readonly string[], uitBriefings: readonly (string | null)[]): string[] {
  const gezien = new Set<string>();
  const uit: string[] = [];
  const voegToe = (naam: string) => {
    const sleutel = merkSleutel(naam);
    if (!sleutel || gezien.has(sleutel)) return;
    gezien.add(sleutel);
    uit.push(naam.trim());
  };
  STANDAARD_MERKEN.forEach(voegToe);
  const extra: string[] = [...opgeslagen];
  for (const veld of uitBriefings) {
    for (const deel of (veld ?? "").split(/\s*(?:,|;|\/|\+|&|\s+en\s+)\s*/i)) extra.push(deel);
  }
  const rest = extra.filter((n) => n.trim()).sort((a, b) => a.localeCompare(b, "nl"));
  rest.forEach(voegToe);
  return uit;
}

/**
 * Campagnepagina's uit een lijst of tekst (één per regel of met komma's). Zonder protocol komt
 * er https:// voor; query en hash gaan eraf (trackingparameters horen niet bij de pagina).
 * Dubbele (zelfde paginasleutel) en wat geen webadres is, vallen weg.
 */
export function leesPaginas(waarde: unknown): string[] {
  const ruw = Array.isArray(waarde) ? waarde : typeof waarde === "string" ? waarde.split(/[\s,;]+/) : [];
  const gezien = new Set<string>();
  const uit: string[] = [];
  for (const p of ruw) {
    if (typeof p !== "string") continue;
    let s = p.trim().replace(/[?#].*$/, "");
    if (!s) continue;
    if (!/^[a-z]+:\/\//i.test(s)) s = `https://${s}`;
    let url: URL;
    try {
      url = new URL(s);
    } catch {
      continue;
    }
    if (!/^https?:$/.test(url.protocol) || !url.hostname.includes(".")) continue;
    const schoon = `${url.protocol}//${url.hostname.toLowerCase()}${url.pathname.replace(/\/+$/, "")}`.slice(0, 500);
    const sleutel = paginaSleutel(schoon);
    if (sleutel && !gezien.has(sleutel)) {
      gezien.add(sleutel);
      uit.push(schoon);
    }
  }
  return uit.slice(0, 20);
}

/** Een campagnepagina kort voor op het scherm: "udenhout.nl/acties/a2-e-tron". */
export function paginaKort(url: string): string {
  return (url.trim().replace(/^[a-z]+:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "") || url).slice(0, 80);
}

/**
 * Voorgestelde analyses op Live sinds, nieuw naar oud (verzoek van de eigenaar). Zonder
 * startdatum achteraan; bij gelijke datum op naam.
 */
export function sorteerVoorstellen<T extends { startdatum: string | null; naam: string }>(lijst: readonly T[]): T[] {
  return [...lijst].sort(
    (a, b) =>
      (b.startdatum ?? "").localeCompare(a.startdatum ?? "") || a.naam.localeCompare(b.naam, "nl"),
  );
}

export type InvoerUitkomst = { ok: true; invoer: MaCampagneInvoer } | { ok: false; fout: string };

/** Wat de invoercontrole van de gekozen opzet moet weten. */
export interface OpzetVoorInvoer {
  id: string;
  formulier: Formulier;
  bedrijven: readonly string[];
}

/** Bedrijven uit een lijst of tekst ("PGZ, VELOO"), opgeschoond en zonder dubbele. */
export function leesBedrijven(waarde: unknown): string[] {
  return leesModellen(waarde);
}

/** "PGZ", "PGZ en VELOO", "PGZ, VELOO en Instra". */
export function bedrijvenLabel(bedrijven: readonly string[] | null | undefined): string {
  const lijst = (bedrijven ?? []).filter(Boolean);
  if (lijst.length === 0) return "Geen bedrijf";
  if (lijst.length === 1) return lijst[0];
  return `${lijst.slice(0, -1).join(", ")} en ${lijst[lijst.length - 1]}`;
}

/**
 * De invoer uit het briefingformulier, gecontroleerd tegen de gekozen opzet. Naam en minstens
 * één bedrijf zijn verplicht; vaste bedrijven van de opzet gaan vóór wat er is ingevuld. Bij een
 * rapportage is de periode verplicht en vallen merk, modellen, looptijd, budget en doel weg.
 */
export function leesCampagneInvoer(body: unknown, opzet: OpzetVoorInvoer): InvoerUitkomst {
  const b = (body ?? {}) as Record<string, unknown>;
  const naam = tekstOfNull(b.naam, MAX_KORT);
  if (!naam) return { ok: false, fout: "Geef de analyse een naam." };
  // `bedrijf` (één tekst) is de oude vorm; die blijft geldig.
  const bedrijven = opzet.bedrijven.length > 0 ? [...opzet.bedrijven] : leesBedrijven(b.bedrijven ?? b.bedrijf);
  if (bedrijven.length === 0) return { ok: false, fout: "Kies voor welk bedrijf of welke bedrijven de analyse is." };
  const omschrijving = tekstOfNull(b.omschrijving, MAX_LANG);
  const dataCorrectie = tekstOfNull(b.dataCorrectie, MAX_LANG);

  if (opzet.formulier === "rapportage") {
    const periodeTekst = tekstOfNull(b.periodeTekst, MAX_KORT);
    if (!periodeTekst) return { ok: false, fout: "Vul de periode in, bijvoorbeeld “Afgelopen 3 maanden” of “1 januari t/m 10 februari 2026”." };
    return {
      ok: true,
      invoer: {
        opzetId: opzet.id,
        naam,
        bedrijven,
        merk: null,
        modellen: [],
        startdatum: null,
        einddatum: null,
        periodeTekst,
        doel: null,
        budget: null,
        omschrijving,
        campagnePaginas: [],
        dataCorrectie,
      },
    };
  }

  const startdatum = datumOfNull(b.startdatum);
  const einddatum = datumOfNull(b.einddatum);
  if (startdatum && einddatum && einddatum < startdatum) {
    return { ok: false, fout: "De einddatum ligt vóór de startdatum." };
  }

  const budget = leesBedrag(b.budget);
  if (budget === null && typeof b.budget === "string" && b.budget.trim() !== "") {
    return { ok: false, fout: "Vul het budget in als bedrag, bijvoorbeeld 5000 of 5.000." };
  }

  return {
    ok: true,
    invoer: {
      opzetId: opzet.id,
      naam,
      bedrijven,
      merk: tekstOfNull(b.merk, MAX_KORT),
      modellen: leesModellen(b.modellen),
      startdatum,
      einddatum,
      periodeTekst: null,
      doel: tekstOfNull(b.doel, MAX_LANG),
      budget,
      omschrijving,
      campagnePaginas: leesPaginas(b.campagnePaginas),
      dataCorrectie,
    },
  };
}

/** De voorgestelde naam van een rapportage: "VDU maandrapportage november 2026". */
export function rapportageNaam(opzetNaam: string, periodeTekst: string): string {
  const periode = periodeTekst.trim();
  return periode ? `${opzetNaam} ${periode}` : opzetNaam;
}

/** Opzetten in de volgorde van het menu: actief eerst, dan op volgorde en naam. */
export function sorteerOpzetten<T extends { volgorde: number; naam: string; actief: boolean }>(opzetten: readonly T[]): T[] {
  return [...opzetten].sort(
    (a, b) => Number(b.actief) - Number(a.actief) || a.volgorde - b.volgorde || a.naam.localeCompare(b.naam, "nl"),
  );
}

export type OpzetInvoerUitkomst =
  | { ok: true; invoer: { naam: string; formulier: Formulier; bedrijven: string[]; actief: boolean } }
  | { ok: false; fout: string };

/** Een nieuwe of gewijzigde opzet uit het dashboard, gecontroleerd. */
export function leesOpzetInvoer(body: unknown): OpzetInvoerUitkomst {
  const b = (body ?? {}) as Record<string, unknown>;
  const naam = tekstOfNull(b.naam, 80);
  if (!naam) return { ok: false, fout: "Geef de opzet een naam." };
  if (b.formulier !== "campagne" && b.formulier !== "rapportage") return { ok: false, fout: "Kies een formulier." };
  return {
    ok: true,
    invoer: { naam, formulier: b.formulier, bedrijven: leesBedrijven(b.bedrijven ?? b.bedrijf), actief: b.actief !== false },
  };
}

/** De datum van vandaag in Nederland, als "JJJJ-MM-DD". */
export function vandaagNL(nu: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(nu);
}

/** Afgelopen = de einddatum ligt vóór vandaag. Zonder einddatum loopt een campagne nog. */
export function isAfgelopen(einddatum: string | null | undefined, vandaag: string): boolean {
  return Boolean(einddatum && einddatum < vandaag);
}

/**
 * Lopend bovenaan op startdatum (nieuwste eerst, zonder startdatum achteraan); afgelopen
 * apart, op einddatum (meest recent eerst).
 */
export function deelOpInLopendEnAfgelopen<T extends { startdatum: string | null; einddatum: string | null }>(
  campagnes: readonly T[],
  vandaag: string,
): { lopend: T[]; afgelopen: T[] } {
  const lopend = campagnes
    .filter((c) => !isAfgelopen(c.einddatum, vandaag))
    .sort((a, b) => (b.startdatum ?? "").localeCompare(a.startdatum ?? ""));
  const afgelopen = campagnes
    .filter((c) => isAfgelopen(c.einddatum, vandaag))
    .sort((a, b) => (b.einddatum ?? "").localeCompare(a.einddatum ?? ""));
  return { lopend, afgelopen };
}

// ---------------------------------------------------------------------------
// Semantic layer
// ---------------------------------------------------------------------------

const MAX_BLOK = 50_000;

/** Een semantic layer uit de database of de editor, compleet en opgeschoond. */
export function leesSemantiek(ruw: unknown, terugval?: SemantiekInhoud): SemantiekInhoud {
  const r = (ruw ?? {}) as { bedrijven?: unknown; blokken?: Record<string, unknown> };
  const bedrijven = leesModellen(r.bedrijven);
  const blokken = {} as Record<SemantiekSleutel, string>;
  for (const { sleutel } of SEMANTIEK_BLOKKEN) {
    const waarde = r.blokken?.[sleutel];
    blokken[sleutel] =
      typeof waarde === "string" ? waarde.replace(/\r\n/g, "\n").slice(0, MAX_BLOK) : (terugval?.blokken[sleutel] ?? "");
  }
  return { bedrijven: bedrijven.length > 0 ? bedrijven : (terugval?.bedrijven ?? []), blokken };
}

// ---------------------------------------------------------------------------
// Weergave
// ---------------------------------------------------------------------------

const NL = "nl-NL";

export function formatWaarde(waarde: number | string | null | undefined, eenheid: Eenheid = "aantal"): string {
  if (waarde === null || waarde === undefined || waarde === "") return "—";
  if (typeof waarde === "string") return waarde;
  if (!Number.isFinite(waarde)) return "—";
  switch (eenheid) {
    case "euro":
      return new Intl.NumberFormat(NL, {
        style: "currency",
        currency: "EUR",
        // Onder de € 100 (kosten per klik, per lead) doen de centen ertoe.
        maximumFractionDigits: Math.abs(waarde) < 100 ? 2 : 0,
        minimumFractionDigits: Math.abs(waarde) < 100 && waarde % 1 !== 0 ? 2 : 0,
      }).format(waarde);
    case "procent":
      return `${new Intl.NumberFormat(NL, { maximumFractionDigits: Math.abs(waarde) < 10 ? 1 : 0 }).format(waarde)}%`;
    case "seconden": {
      const s = Math.round(waarde);
      if (s < 60) return `${s} s`;
      return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")} min`;
    }
    case "tekst":
      return String(waarde);
    default:
      return new Intl.NumberFormat(NL, { maximumFractionDigits: Math.abs(waarde) < 10 ? 1 : 0 }).format(waarde);
  }
}

/**
 * Het percentage dat van de ene funnelstap naar de volgende doorgaat. Alleen tussen twee
 * aantallen, en niet boven de 100%: dan is de volgende stap geen deel van de vorige.
 */
export function doorstroom(stappen: FunnelStap[]): (number | null)[] {
  return stappen.map((stap, i) => {
    if (i === 0) return null;
    const vorige = stappen[i - 1];
    if (stap.eenheid !== "aantal" || vorige.eenheid !== "aantal") return null;
    if (stap.waarde === null || vorige.waarde === null || vorige.waarde <= 0) return null;
    const pct = (stap.waarde / vorige.waarde) * 100;
    return pct > 100 ? null : pct;
  });
}

export function datumKort(op: string): string {
  const d = new Date(op);
  return Number.isNaN(d.getTime())
    ? op
    : new Intl.DateTimeFormat(NL, { day: "numeric", month: "short", year: "numeric" }).format(d);
}

/** "v2 · 23 nov 2026" */
export function versieLabel(versie: number, op: string): string {
  return `v${versie} · ${datumKort(op)}`;
}

/** De looptijd als "18 sep – 31 dec 2026", of wat er van bekend is. */
export function looptijdLabel(start: string | null | undefined, eind: string | null | undefined): string {
  const fmt = (s: string, metJaar: boolean) =>
    new Intl.DateTimeFormat(NL, { day: "numeric", month: "short", ...(metJaar ? { year: "numeric" } : {}) }).format(
      new Date(`${s}T00:00:00Z`),
    );
  if (start && eind) return `${fmt(start, start.slice(0, 4) !== eind.slice(0, 4))} – ${fmt(eind, true)}`;
  if (start) return `vanaf ${fmt(start, true)}`;
  if (eind) return `t/m ${fmt(eind, true)}`;
  return "Geen looptijd";
}

/**
 * Een resultaat uit de database zo neerzetten dat de weergave er niet op kan vastlopen. Een
 * analyse is door een model geschreven; een veld dat ontbreekt mag de pagina niet breken.
 */
const PRIORITEITEN: readonly Prioriteit[] = ["hoog", "middel", "laag"];
const OORDELEN: readonly TabOordeel[] = ["goed", "aandacht", "probleem", "geen-data"];
const TAB_SLEUTELS = new Set<string>(ANALYSE_TABBLADEN.map((t) => t.sleutel));

function lijst<T>(x: T[] | undefined | null): T[] {
  return Array.isArray(x) ? x : [];
}

/** Een aanbeveling zonder geldige prioriteit telt als laag; zonder titel valt hij weg. */
function leesAanbevelingen(ruw: unknown): Aanbeveling[] {
  return lijst(ruw as Aanbeveling[])
    .filter((a) => a && typeof a.titel === "string" && a.titel.trim())
    .map((a) => ({
      titel: a.titel,
      toelichting: typeof a.toelichting === "string" ? a.toelichting : "",
      prioriteit: PRIORITEITEN.includes(a.prioriteit) ? a.prioriteit : "laag",
      ...(Array.isArray(a.tabs) ? { tabs: a.tabs.filter((t) => TAB_SLEUTELS.has(t)) } : {}),
    }));
}

/**
 * Een resultaat zoals de pagina het kan tonen, ook als er velden ontbreken of het een versie in
 * formaat 1 is. Wat niet klopt, valt weg in plaats van de pagina te breken.
 */
export function normaliseerResultaat(ruw: unknown): MaResultaat {
  const r = (ruw ?? {}) as Partial<MaResultaat>;
  return {
    formaat: r.formaat === 2 ? 2 : 1,
    samenvatting: {
      kop: r.samenvatting?.kop ?? "",
      regels: lijst(r.samenvatting?.regels).filter((x) => typeof x === "string").slice(0, 5),
      tekst: r.samenvatting?.tekst ?? "",
    },
    doel: r.doel,
    funnel: lijst(r.funnel),
    secties: lijst(r.secties)
      .filter((s) => s && typeof s === "object")
      .map((s, i) => ({
        ...s,
        stap: typeof s.stap === "number" ? s.stap : i + 1,
        titel: typeof s.titel === "string" ? s.titel : "",
        oordeel: s.oordeel && OORDELEN.includes(s.oordeel) ? s.oordeel : undefined,
        bevindingen: lijst(s.bevindingen).filter((b) => typeof b === "string" && b.trim()).slice(0, 5),
        acties: leesAanbevelingen(s.acties),
      }))
      .sort((a, b) => a.stap - b.stap),
    inzichten: lijst(r.inzichten),
    aanbevelingen: leesAanbevelingen(r.aanbevelingen),
    herkenning: lijst(r.herkenning),
    bronnen: lijst(r.bronnen),
    correcties: lijst(r.correcties),
    semantiekVoorstellen: lijst(r.semantiekVoorstellen),
    datakwaliteit: lijst(r.datakwaliteit),
  };
}

// ---------------------------------------------------------------------------
// Tabbladen van de analysepagina
// ---------------------------------------------------------------------------

/** Eén tabblad op de analysepagina. */
export interface AnalyseTab {
  /** Een vaste sleutel (`bereik` …) of, bij een sectie zonder vaste plek, `sectie-<n>`. */
  sleutel: string;
  naam: string;
  /** De groep boven de tabbalk; null bij een sectie zonder vaste plek. */
  groep: string | null;
  secties: Sectie[];
  /** Het hoofdgetal in de tabbalk: het eerste kerncijfer van de eerste sectie. */
  hoofdcijfer: Kerncijfer | null;
  oordeel: TabOordeel | null;
  /** Grijs in de tabbalk: geen sectie, of de analyse zegt zelf dat er geen data is. */
  leeg: boolean;
  /** Waarom er niets staat (alleen bij een tabblad zonder sectie). */
  reden: string | null;
}

/** Syntec-leads gelden alleen als de analyse uitsluitend over Van den Udenhout gaat. */
export function syntecVanToepassing(bedrijven: readonly string[] | null | undefined): boolean {
  const lijst = (bedrijven ?? []).filter(Boolean);
  return lijst.length > 0 && lijst.every((b) => b === BEDRIJF_MET_SYNTEC);
}

function tabUitSecties(sleutel: string, naam: string, groep: string | null, secties: Sectie[], reden: string | null): AnalyseTab {
  const oordeel = secties.find((s) => s.oordeel)?.oordeel ?? null;
  return {
    sleutel,
    naam,
    groep,
    secties,
    hoofdcijfer: secties.find((s) => (s.kerncijfers?.length ?? 0) > 0)?.kerncijfers?.[0] ?? null,
    oordeel,
    leeg: secties.length === 0 || oordeel === "geen-data",
    reden: secties.length === 0 ? reden : null,
  };
}

/**
 * De tabbladen van een analyse. Een campagne-analyse in formaat 2 krijgt altijd de vaste
 * tabbladen in vaste volgorde (een tabblad zonder sectie staat grijs met de reden), en daarachter
 * een eigen tabblad voor elke sectie zonder geldige `tab`. Een versie in formaat 1 en een
 * rapportage krijgen één tabblad per sectie, in de volgorde van de secties.
 */
export function tabbladenVoor(
  resultaat: Pick<MaResultaat, "formaat" | "secties">,
  opties: { rapportage: boolean; bedrijven: readonly string[] | null | undefined },
): AnalyseTab[] {
  const losse = (secties: Sectie[]) =>
    secties.map((s, i) => tabUitSecties(`sectie-${i + 1}`, s.titel || `Onderdeel ${i + 1}`, null, [s], null));
  if (resultaat.formaat !== 2 || opties.rapportage) return losse(resultaat.secties);

  const vast = ANALYSE_TABBLADEN.map((t) => {
    const secties = resultaat.secties.filter((s) => s.tab === t.sleutel);
    const reden =
      t.sleutel === "syntec" && !syntecVanToepassing(opties.bedrijven)
        ? `Niet van toepassing. Leads uit Syntec gelden alleen voor een analyse die uitsluitend over ${BEDRIJF_MET_SYNTEC} gaat; de leads staan bij Lead-events.`
        : "Deze analyse heeft hier geen onderdeel voor.";
    return tabUitSecties(t.sleutel, t.naam, t.groep, secties, reden);
  });
  const zonderPlek = resultaat.secties.filter((s) => !s.tab || !TAB_SLEUTELS.has(s.tab));
  return [...vast, ...losse(zonderPlek)];
}

/** Een actie uit een tabblad, met het tabblad erbij voor de lijst bovenaan. */
export interface TabActie {
  actie: Aanbeveling;
  tabSleutel: string;
  tabNaam: string;
}

/** Alle acties uit de tabbladen, op prioriteit (hoog, middel, laag) en verder in tabvolgorde. */
export function actiesUitTabbladen(tabs: readonly AnalyseTab[]): TabActie[] {
  const alle: TabActie[] = [];
  for (const tab of tabs) {
    for (const sectie of tab.secties) {
      for (const actie of sectie.acties ?? []) alle.push({ actie, tabSleutel: tab.sleutel, tabNaam: tab.naam });
    }
  }
  return sorteerOpPrioriteit(alle, (a) => a.actie.prioriteit);
}

/** Stabiel sorteren op prioriteit: hoog, middel, laag. */
export function sorteerOpPrioriteit<T>(items: readonly T[], prioriteit: (item: T) => Prioriteit): T[] {
  const rang = (p: Prioriteit) => {
    const i = PRIORITEITEN.indexOf(p);
    return i < 0 ? PRIORITEITEN.length : i;
  };
  return items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => rang(prioriteit(a.item)) - rang(prioriteit(b.item)) || a.i - b.i)
    .map((x) => x.item);
}

// ---------------------------------------------------------------------------
// Overzicht van een campagne-analyse: uitgaven, leads en doel
// ---------------------------------------------------------------------------

/**
 * Het eerste aantal in een doel in vrije tekst: "20 proefritten" → 20, "1.000 leads" → 1000.
 * Null zonder getal. Alleen een terugval: de analyse zet het gelezen doel in `doelLeads`.
 */
export function leesDoelGetal(doel: string | null | undefined): number | null {
  if (!doel) return null;
  const m = doel.match(/\d{1,3}(?:\.\d{3})+(?!\d)|\d+/);
  if (!m) return null;
  const n = Number(m[0].replace(/\./g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export type LeadBron = "syntec" | "ga4";

/**
 * Waar de leads van een campagne-analyse vandaan komen. Syntec alleen als de analyse
 * uitsluitend over Van den Udenhout gaat én er modellen zijn opgegeven (de leads-kopie is te
 * filteren op merk en model, en Syntec bestaat alleen voor Van den Udenhout); anders de
 * lead-events in GA4 (sessies die op de campagnepagina begonnen).
 */
export function leadBron(c: { bedrijven: readonly string[]; modellen: readonly string[] }): LeadBron {
  return c.bedrijven.length === 1 && c.bedrijven[0] === BEDRIJF_MET_SYNTEC && c.modellen.length > 0 ? "syntec" : "ga4";
}

export interface OverzichtCijfers {
  kosten: number | null;
  budget: number | null;
  /** Deel van het budget dat is uitgegeven, in procenten; null zonder budget of kosten. */
  besteedPct: number | null;
  /** Gezamenlijke CTR van de advertentiekanalen in procenten: alle klikken ÷ alle advertentievertoningen. */
  ctr: number | null;
  /** Sessies die op de campagnepagina('s) begonnen, uit elk kanaal. */
  bezoekers: number | null;
  leads: number | null;
  bron: LeadBron;
  doelLeads: number | null;
  /** Deel van het leaddoel dat is gehaald, in procenten; null zonder doel of leads. */
  gehaaldPct: number | null;
}

/** De cijfers voor één regel in het overzicht van campagne-analyses. */
export function overzichtCijfers(
  c: { bedrijven: readonly string[]; modellen: readonly string[]; budget: number | null; doel: string | null },
  k: MaKerncijfers | null | undefined,
): OverzichtCijfers {
  const kosten = k?.kosten ?? null;
  const bron = leadBron(c);
  const leads = (bron === "syntec" ? k?.leadsSyntec : k?.leadEvents) ?? null;
  const doelLeads = k?.doelLeads ?? leesDoelGetal(c.doel);
  return {
    kosten,
    budget: c.budget,
    besteedPct: kosten !== null && c.budget ? (kosten / c.budget) * 100 : null,
    // Gewogen: klikken en vertoningen eerst optellen, dan delen. Nooit de vertoningen inclusief
    // organisch (`vertoningen`) als noemer: dan komt de CTR veel te laag uit.
    ctr: k?.klikken != null && k?.vertoningenAds ? (k.klikken / k.vertoningenAds) * 100 : null,
    bezoekers: k?.sessies ?? null,
    leads,
    bron,
    doelLeads,
    gehaaldPct: leads !== null && doelLeads ? (leads / doelLeads) * 100 : null,
  };
}

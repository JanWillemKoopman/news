"use client";

import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import FilterBar from "@/components/FilterBar";
import FilterSelect from "@/components/FilterSelect";
import Inlogprompt from "@/components/Inlogprompt";
import { getBrandLogo } from "@/components/brandLogos";
import { IconArrowDown, IconArrowRight, IconArrowUp, IconCheck } from "@/components/icons";
import HoverKaart from "@/components/campagneAnalyse/HoverKaart";
import {
  analyseDatumLabel,
  kaartBezoekers,
  kaartCtr,
  kaartDoel,
  kaartKostenPerKlik,
  kaartKostenPerLead,
  kaartLeadsGa4,
  kaartSyntecLeads,
  kaartSyntecOrders,
  kaartUitgaven,
  type Kaart,
  type KaartBron,
} from "@/components/campagneAnalyse/hoverKaarten";
import { LabelBadge } from "@/components/marketingAnalyse/onderdelen";
import {
  filterOpOnline,
  isCampagneAnalyse,
  ONLINE_FILTERS,
  telOnline,
  tijdVoortgang,
  type OnlineFilter,
  type TijdVoortgang,
} from "@/lib/campagneAnalyseOverzicht";
import { bedrijfOpties, filterTimeline, merkOpties } from "@/lib/campagneTimeline";
import {
  bedrijvenLabel,
  budgetTempo,
  formatWaarde,
  isLive,
  looptijdLabel,
  overzichtCijfers,
  sorteerOpStatus,
  vandaagNL,
  versieLabel,
  type BudgetTempo,
  type OverzichtCijfers,
} from "@/lib/marketingAnalyse/rekenen";
import type { MaOpzet, MaOverzichtRegel } from "@/lib/marketingAnalyse/types";
import { kostenPer, leesUitsplitsing } from "@/lib/marketingAnalyse/uitsplitsing";
import { SkeletTabel } from "@/components/Skelet";

const LABELKOLOM = 196;
const KOLOM_MIN = 280;

type Toon = "neutraal" | "positief" | "negatief" | "waarschuwing";

const TOON_TEKST: Record<Toon, string> = {
  neutraal: "text-ink-faint",
  positief: "text-positive",
  negatief: "text-negative",
  waarschuwing: "text-orange-dark",
};

const TEMPO: Record<BudgetTempo, { naam: string; toon: Toon }> = {
  "op-schema": { naam: "Op schema", toon: "positief" },
  "te-snel": { naam: "Sneller dan de looptijd", toon: "negatief" },
  "te-langzaam": { naam: "Achter op de looptijd", toon: "waarschuwing" },
};

/**
 * A2: het budgettempo als klein label met icoon, in dezelfde vorm als het Online-label in de kop,
 * in plaats van losse gekleurde tekst. Groen = op schema, oranje = achter, rood = te snel.
 */
const PIL: Record<BudgetTempo, { vlak: string; icoon: ReactNode }> = {
  "op-schema": { vlak: "bg-positive/10 text-positive", icoon: <IconCheck className="h-3 w-3" /> },
  "te-snel": { vlak: "bg-negative/10 text-negative", icoon: <IconArrowUp className="h-3 w-3" /> },
  "te-langzaam": { vlak: "bg-orange/12 text-orange-dark", icoon: <IconArrowDown className="h-3 w-3" /> },
};

function TempoPil({ tempo }: { tempo: BudgetTempo }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-meta font-semibold leading-snug ${PIL[tempo].vlak}`}>
      <span aria-hidden="true">{PIL[tempo].icoon}</span>
      {TEMPO[tempo].naam}
    </span>
  );
}

/** Alles wat één kolom nodig heeft, één keer uitgerekend. */
type Kolom = {
  c: MaOverzichtRegel;
  o: OverzichtCijfers;
  geanalyseerd: boolean;
  online: boolean;
  tijd: TijdVoortgang | null;
  /** Wat de kaartjes bij het hoveren nodig hebben. */
  kaartBron: KaartBron;
};

/** "JJJJ-MM-DD" van de dag vóór een tijdstip; een analyse telt tot en met gisteren. */
function dagErvoor(tijdstip: string): string {
  const d = new Date(`${tijdstip.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** De link naar de analyse zelf: Marketing analyse opent hem uit de URL. */
function analyseHref(id: string): string {
  return `/?tab=marketing-analyse&analyse=${encodeURIComponent(id)}`;
}

// ---------------------------------------------------------------------------
// Kleine bouwstenen
// ---------------------------------------------------------------------------

/** Het grote getal van een cel. Zonder waarde een rustig streepje. */
function Groot({ children, toon = "neutraal" }: { children: ReactNode; toon?: Toon }) {
  const kleur = toon === "positief" ? "text-positive" : toon === "negatief" ? "text-negative" : "text-ink";
  return (
    <span className={`groot font-sans-w7 text-[22px] font-bold leading-none tabular-nums tracking-tight ${kleur}`}>
      {children}
    </span>
  );
}

function Leeg() {
  return <span className="font-sans-w7 text-[22px] font-bold leading-none text-ink-faint/60">—</span>;
}

function Meta({ children, toon = "neutraal" }: { children: ReactNode; toon?: Toon }) {
  return <span className={`text-meta ${TOON_TEKST[toon]}`}>{children}</span>;
}

/**
 * Een balk met wat er bereikt is, en optioneel een streepje voor het verstreken deel van de
 * looptijd (zoals op de analysepagina): zo zie je in één blik of het budget gelijk loopt met de tijd.
 */
function Meter({ pct, tijdPct, toon = "neutraal" }: { pct: number; tijdPct?: number | null; toon?: Toon }) {
  // A4: één kleurlogica voor elke balk: groen = gehaald, donker = op koers, oranje = achter, rood = over.
  const vul =
    toon === "negatief" ? "bg-negative" : toon === "positief" ? "bg-positive" : toon === "waarschuwing" ? "bg-orange" : "bg-progress-fill";
  const klem = (n: number) => Math.min(100, Math.max(0, n));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className="relative h-1.5 w-full rounded-pill bg-progress-track"
    >
      <div
        className={`h-full rounded-pill ${vul} transition-[width] duration-[var(--duur-traag)] ease-merk`}
        style={{ width: `${klem(pct)}%` }}
      />
      {/* A5: waar de balk nu "hoort" te staan (verstreken deel van de looptijd): een driehoekje
          boven de balk met een lijntje erdoor, uitgelegd in de regel eronder ("▾ verwacht 35%"). */}
      {tijdPct != null && (
        <span aria-hidden="true" className="absolute -top-[7px] bottom-[-3px] flex -translate-x-1/2 flex-col items-center" style={{ left: `${klem(tijdPct)}%` }}>
          <span className="h-0 w-0 border-x-[4px] border-t-[5px] border-x-transparent border-t-ink/60" />
          <span className="w-px flex-1 bg-ink/45" />
        </span>
      )}
    </div>
  );
}

/**
 * Een cel. Heeft hij een kaart, dan opent die bij de muis erboven en krijgt het grote getal een
 * stippellijntje: zo zie je welke cijfers meer te vertellen hebben (`HoverKaart`).
 */
function Cel({ children, kaart }: { children: ReactNode; kaart?: Kaart | null }) {
  const inhoud = <div className="flex flex-col items-start gap-2">{children}</div>;
  if (!kaart) return inhoud;
  return (
    <HoverKaart
      titel={kaart.titel}
      kaart={kaart.inhoud}
      // A3: geen stippellijn meer onder elk getal (te druk); de cel krijgt bij hover een zacht vlak.
      className="-m-2 cursor-default rounded-control p-2 transition-colors duration-[var(--duur-snel)] ease-merk hover:bg-ink/[0.04]"
    >
      {inhoud}
    </HoverKaart>
  );
}

function StatusChip({ online }: { online: boolean }) {
  return online ? (
    <span
      data-tip="Online: vandaag valt binnen de looptijd"
      className="inline-flex items-center gap-1.5 rounded-pill bg-open-light px-2.5 py-1 text-meta font-semibold leading-none text-positive"
    >
      <span aria-hidden="true" className="live-stip h-1.5 w-1.5 rounded-full bg-open" />
      Online
    </span>
  ) : (
    <span
      data-tip="Offline: vandaag valt buiten de looptijd"
      className="inline-flex items-center gap-1.5 rounded-pill bg-closed-light px-2.5 py-1 text-meta font-semibold leading-none text-ink-muted"
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-closed" />
      Offline
    </span>
  );
}

function MerkRegel({ merk }: { merk: string | null }) {
  if (!merk) return null;
  const Logo = getBrandLogo(merk);
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      {Logo && <Logo role="img" aria-label={merk} className="h-[18px] w-[18px] shrink-0 text-ink" />}
      <span className="truncate">{merk}</span>
    </span>
  );
}

// ---------------------------------------------------------------------------
// De kop van een kolom: de hele kop is een link naar de analyse
// ---------------------------------------------------------------------------

function KolomKop({ k }: { k: Kolom }) {
  const { c, geanalyseerd, online, tijd } = k;
  const a = c.laatsteAnalyse;
  return (
    <a
      href={analyseHref(c.id)}
      data-tip={`Open de analyse van ${c.naam}`}
      className="group/kop flex h-full flex-col gap-3 px-5 pb-5 pt-5 text-left transition-colors duration-[var(--duur-snel)] hover:bg-surface-tint"
    >
      <div className="flex items-center justify-between gap-2">
        <StatusChip online={online} />
        <IconArrowRight className="h-4 w-4 -translate-x-1 text-primary opacity-0 transition-all duration-[var(--duur-snel)] ease-merk group-hover/kop:translate-x-0 group-hover/kop:opacity-100" />
      </div>

      <div className="min-w-0">
        <h3 className="line-clamp-2 min-h-[2.75em] text-[18px] font-semibold leading-snug text-ink transition-colors duration-[var(--duur-snel)] group-hover/kop:text-primary">
          {c.naam}
        </h3>
        <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-meta text-ink-muted">
          <MerkRegel merk={c.merk} />
          {c.merk && <span aria-hidden="true" className="text-ink-faint">·</span>}
          <span className="truncate">{bedrijvenLabel(c.bedrijven)}</span>
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2 text-meta">
          <span className="text-ink-muted">{looptijdLabel(c.startdatum, c.einddatum)}</span>
          {tijd && online && (
            <span className="shrink-0 tabular-nums text-ink-faint">
              dag {tijd.dag} van {tijd.dagen}
            </span>
          )}
        </div>
        {tijd && <Meter pct={tijd.pct} toon="neutraal" />}
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-meta text-ink-faint">
        {a ? (
          // A6: "tussentijds" als tekst in de regel (staat bij bijna elke campagne, dus geen label
          // waard); alleen een eindevaluatie krijgt een label, want die wijkt af.
          <>
            <span>
              Analyse {versieLabel(a.versie, a.geanalyseerdOp)}
              {a.label === "tussentijds" && " · tussentijds"}
            </span>
            {a.label === "eind" && <LabelBadge label={a.label} />}
          </>
        ) : (
          <span>{geanalyseerd ? "" : "Nog niet geanalyseerd"}</span>
        )}
      </div>
    </a>
  );
}

// ---------------------------------------------------------------------------
// De rijen
// ---------------------------------------------------------------------------

type Rij = {
  label: string;
  uitleg: string;
  render: (k: Kolom) => ReactNode;
};

type Groep = {
  titel: string;
  rijen: Rij[];
};

const BRON_UITLEG = {
  syntec:
    "Syntec, omdat het doel dat zegt: alleen leads met kanaalgroep Internet en udenhout.nl in Kanaal of Onderwerp, van de soort uit het doel",
  ga4: "Google Analytics (standaard): lead-events van de soort uit het doel, in sessies die op de campagnepagina('s) begonnen",
} as const;

function SyntecCel({
  k,
  soort,
}: {
  k: Kolom;
  soort: "leads" | "orders";
}) {
  const s = k.o.syntec;
  if (s.stand !== "cijfers") {
    return (
      <Cel>
        <span className="text-sm text-ink-faint">n.v.t.</span>
        <Meta>
          {s.stand === "briefing" ? `${s.mist[0].toUpperCase()}${s.mist.slice(1)} ontbreekt in de briefing` : "Geen Syntec-data voor dit bedrijf"}
        </Meta>
      </Cel>
    );
  }
  const waarde = soort === "leads" ? s.leads : s.orders;
  const toelichting = soort === "leads" ? s.leadsSoort : s.ordersSoort;
  const vdu = s.alleenVdu ? " · alleen Van den Udenhout" : "";
  return (
    <Cel kaart={soort === "leads" ? kaartSyntecLeads(k.kaartBron) : kaartSyntecOrders(k.kaartBron)}>
      {!k.geanalyseerd ? <Leeg /> : waarde === null ? <Leeg /> : <Groot>{formatWaarde(waarde)}</Groot>}
      <Meta>
        {k.geanalyseerd && waarde === null
          ? "Bij de volgende analyse"
          : `${toelichting ?? (soort === "leads" ? "Internetleads" : "Orders")}${vdu}`}
      </Meta>
    </Cel>
  );
}

const GROEPEN: Groep[] = [
  {
    titel: "Budget",
    rijen: [
      {
        label: "Uitgaven",
        uitleg: "Mediakosten uit Google Ads, Meta Ads en LinkedIn Ads, tegen het totaalbudget. Het driehoekje (▾) op de balk is waar de besteding nu zou staan als hij gelijk opliep met de looptijd.",
        render: ({ o, geanalyseerd, tijd, kaartBron }) => {
          const tempo = budgetTempo(o.besteedPct, tijd?.pct ?? null);
          const boven = o.besteedPct !== null && o.besteedPct > 100;
          const balk: Toon = boven || tempo === "te-snel" ? "negatief" : tempo === "te-langzaam" ? "waarschuwing" : "neutraal";
          return (
            <Cel kaart={kaartUitgaven(kaartBron)}>
              {geanalyseerd && o.kosten !== null ? <Groot toon={boven ? "negatief" : "neutraal"}>{formatWaarde(o.kosten, "euro")}</Groot> : <Leeg />}
              {o.besteedPct !== null && <Meter pct={o.besteedPct} tijdPct={tijd?.pct} toon={balk} />}
              <Meta toon={boven ? "negatief" : "neutraal"}>
                {o.budget === null
                  ? "Geen budget opgegeven"
                  : o.besteedPct === null
                    ? `Budget ${formatWaarde(o.budget, "euro")}`
                    : `${formatWaarde(o.besteedPct, "procent")} van ${formatWaarde(o.budget, "euro")}`}
                {o.besteedPct !== null && tijd && (
                  <span className="text-ink-faint">
                    {" · "}
                    <span aria-hidden="true">▾</span> verwacht {formatWaarde(Math.round(tijd.pct), "procent")}
                  </span>
                )}
              </Meta>
              {tempo && <TempoPil tempo={boven ? "te-snel" : tempo} />}
            </Cel>
          );
        },
      },
    ],
  },
  {
    titel: "Bereik",
    rijen: [
      {
        label: "CTR",
        uitleg: "Alle klikken ÷ alle vertoningen van Google Ads, Meta Ads en LinkedIn Ads samen.",
        render: ({ o, geanalyseerd, kaartBron }) => (
          <Cel kaart={kaartCtr(kaartBron)}>
            {geanalyseerd && o.ctr !== null ? <Groot>{formatWaarde(o.ctr, "procent")}</Groot> : <Leeg />}
            <Meta>{geanalyseerd && o.ctr === null ? "Bij de volgende analyse" : "Google, Meta en LinkedIn"}</Meta>
          </Cel>
        ),
      },
      {
        label: "Bezoekers",
        uitleg: "Sessies die op de campagnepagina('s) begonnen, uit elk kanaal (GA4).",
        render: ({ o, geanalyseerd, kaartBron }) => (
          <Cel kaart={kaartBezoekers(kaartBron)}>
            {geanalyseerd && o.bezoekers !== null ? <Groot>{formatWaarde(o.bezoekers)}</Groot> : <Leeg />}
            <Meta>Op de campagnepagina</Meta>
          </Cel>
        ),
      },
    ],
  },
  {
    titel: "Leads en orders",
    rijen: [
      {
        label: "Google Analytics",
        uitleg: "Leads in Google Analytics: lead-events van de soort uit het doel, in sessies die op de campagnepagina('s) begonnen.",
        render: ({ o, geanalyseerd, kaartBron }) => (
          <Cel kaart={kaartLeadsGa4(kaartBron)}>
            {geanalyseerd && o.ga4Leads !== null ? <Groot>{formatWaarde(o.ga4Leads)}</Groot> : <Leeg />}
            <Meta>{o.oudeTelling ? "Alle lead-events" : (o.ga4Soort ?? (geanalyseerd && o.ga4Leads === null ? "Bij de volgende analyse" : "Leads"))}</Meta>
          </Cel>
        ),
      },
      {
        label: "Syntec internet",
        uitleg: "Leads in Syntec met kanaalgroep Internet, voor merk en model in de periode. Alleen voor Van den Udenhout.",
        render: (k) => <SyntecCel k={k} soort="leads" />,
      },
      {
        label: "Syntec orders",
        uitleg: "Orders in Syntec voor merk en model in de periode. Alleen voor Van den Udenhout.",
        render: (k) => <SyntecCel k={k} soort="orders" />,
      },
    ],
  },
  {
    titel: "Efficiëntie",
    rijen: [
      {
        label: "Kosten per klik",
        uitleg: "Mediakosten ÷ klikken op de advertenties (Google Ads, Meta Ads en LinkedIn Ads samen).",
        render: (kol) => {
          const { o, k } = kol.kaartBron;
          const { geanalyseerd } = kol;
          const waarde = kostenPer(o.kosten, k?.klikken);
          return (
            <Cel kaart={kaartKostenPerKlik(kol.kaartBron)}>
              {geanalyseerd && waarde !== null ? <Groot>{formatWaarde(waarde, "euro")}</Groot> : <Leeg />}
              <Meta>{geanalyseerd && waarde === null ? "Nog geen klikken" : "Mediakosten ÷ klikken"}</Meta>
            </Cel>
          );
        },
      },
      {
        label: "Kosten per lead",
        uitleg: "Mediakosten ÷ leads in Google Analytics (de soort uit het doel). Geen extra kanaalkosten.",
        render: (kol) => {
          const { o } = kol.kaartBron;
          const { geanalyseerd } = kol;
          const waarde = kostenPer(o.kosten, o.ga4Leads);
          return (
            <Cel kaart={kaartKostenPerLead(kol.kaartBron)}>
              {geanalyseerd && waarde !== null ? <Groot>{formatWaarde(waarde, "euro")}</Groot> : <Leeg />}
              <Meta>
                {!geanalyseerd
                  ? "Mediakosten ÷ leads"
                  : waarde !== null
                    ? `Per lead · ${o.ga4Soort ?? "Google Analytics"}`
                    : o.ga4Leads === 0
                      ? "Nog geen leads"
                      : "Bij de volgende analyse"}
              </Meta>
            </Cel>
          );
        },
      },
    ],
  },
  {
    titel: "Doel",
    rijen: [
      {
        label: "Doel leads",
        uitleg: "Hoeveel van het leaddoel uit de briefing is gehaald, en uit welke bron dat gemeten is.",
        render: ({ o, geanalyseerd, tijd, kaartBron }) => {
          const gehaald = o.gehaaldPct !== null && o.gehaaldPct >= 100;
          const achter = !gehaald && budgetTempo(o.gehaaldPct, tijd?.pct ?? null) === "te-langzaam";
          return (
            <Cel kaart={kaartDoel(kaartBron)}>
              {geanalyseerd && o.gehaaldPct !== null ? (
                <Groot toon={gehaald ? "positief" : "neutraal"}>{formatWaarde(o.gehaaldPct, "procent")}</Groot>
              ) : (
                <Leeg />
              )}
              {o.gehaaldPct !== null && <Meter pct={o.gehaaldPct} toon={gehaald ? "positief" : achter ? "waarschuwing" : "neutraal"} />}
              <span data-tip={o.syntecNietMogelijk ? "Het doel noemt Syntec, maar Syntec geldt alleen voor een analyse die uitsluitend over Van den Udenhout gaat. Daarom gemeten in Google Analytics." : BRON_UITLEG[o.bron]}>
                <Meta toon={gehaald ? "positief" : "neutraal"}>
                  {o.doelLeads === null
                    ? "Geen aantal in het doel"
                    : o.gehaaldPct === null
                      ? `Doel ${formatWaarde(o.doelLeads)} leads · nog niet gemeten`
                      : `${formatWaarde(o.leads)} van ${formatWaarde(o.doelLeads)} leads · ${o.bron === "syntec" ? "Syntec" : "GA4"}`}
                </Meta>
              </span>
            </Cel>
          );
        },
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Samenvatting en filters
// ---------------------------------------------------------------------------

function OnlineSchakelaar({
  waarde,
  onChange,
  aantallen,
}: {
  waarde: OnlineFilter | null;
  onChange: (w: OnlineFilter | null) => void;
  aantallen: { alle: number; online: number; offline: number };
}) {
  return (
    <div className="flex flex-col items-start gap-1 px-3 py-1.5">
      <span className="label-theme text-label text-ink-faint">Status</span>
      <div
        role="group"
        aria-label="Online of offline"
        data-tip="Online = de campagne loopt nu; offline = nog niet begonnen of afgelopen"
        className="flex items-center gap-0.5 rounded-control bg-surface p-0.5"
      >
        {ONLINE_FILTERS.map((f) => {
          const actief = f.id === waarde;
          const aantal = f.id === null ? aantallen.alle : aantallen[f.id];
          return (
            <button
              key={f.naam}
              type="button"
              onClick={() => onChange(f.id)}
              aria-pressed={actief}
              className={`flex items-center gap-1.5 rounded-[8px] px-2.5 py-0.5 text-sm transition-colors duration-[var(--duur-snel)] ${
                actief ? "bg-card vdu:bg-ink font-medium text-ink shadow-subtle vdu:text-card" : "text-ink-muted hover:text-ink"
              }`}
            >
              {f.id === "online" && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-open" />}
              {f.id === "offline" && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-closed" />}
              {f.naam}
              <span className="text-meta tabular-nums text-ink-faint">{aantal}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// De pagina
// ---------------------------------------------------------------------------

/**
 * Campagnes → Campagne analyse: de Campagne analyses uit Marketing analyse als campagnes
 * naast elkaar (kolommen) met de cijfers uit de laatste analyse als rijen, zoals het tabblad
 * Campagnes. Alleen lezen: geen briefing bewerken, geen planning, e-mailinstellingen of nieuwe
 * analyse — dat blijft in Marketing analyse. Een klik op de kop van een campagne opent de
 * volledige analyse. Dezelfde bron en dezelfde cijfers (`overzichtCijfers`) als het overzicht
 * in Marketing analyse.
 */
export default function CampagneAnalyse({ ingelogd }: { ingelogd: boolean }) {
  const [regels, setRegels] = useState<MaOverzichtRegel[] | null>(null);
  const [opzetten, setOpzetten] = useState<MaOpzet[]>([]);
  const [fout, setFout] = useState<string | null>(null);
  const [bedrijfFilter, setBedrijfFilter] = useState<string[]>([]);
  const [merkFilter, setMerkFilter] = useState<string[]>([]);
  const [onlineFilter, setOnlineFilter] = useState<OnlineFilter | null>(null);
  // A10: de kolom onder de muis licht zacht op, zodat je één campagne makkelijk van boven naar
  // beneden leest.
  const [kolomHover, setKolomHover] = useState<string | null>(null);
  const vandaag = useMemo(() => vandaagNL(), []);

  useEffect(() => {
    if (!ingelogd) return;
    fetch("/api/marketing-analyse")
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          campagnes?: MaOverzichtRegel[];
          opzetten?: MaOpzet[];
          fout?: string;
        };
        if (!res.ok) throw new Error(data.fout ?? "Kon de campagne-analyses niet laden.");
        setRegels(data.campagnes ?? []);
        setOpzetten(data.opzetten ?? []);
        setFout(null);
      })
      .catch((err) => setFout(err instanceof Error ? err.message : String(err)));
  }, [ingelogd]);

  const campagnes = useMemo(() => {
    const opzetPerId = new Map(opzetten.map((o) => [o.id, o]));
    return (regels ?? []).filter((c) => isCampagneAnalyse(c, opzetPerId));
  }, [regels, opzetten]);

  // Bedrijf en merk eerst; de aantallen op de statusknoppen tellen daarbinnen.
  const vanBedrijfMerk = useMemo(
    () => filterTimeline(campagnes, { bedrijven: bedrijfFilter, merken: merkFilter }),
    [campagnes, bedrijfFilter, merkFilter],
  );
  const aantallen = useMemo(() => {
    const t = telOnline(vanBedrijfMerk, vandaag);
    return { alle: vanBedrijfMerk.length, ...t };
  }, [vanBedrijfMerk, vandaag]);

  const zichtbaar = useMemo(
    () => sorteerOpStatus(filterOpOnline(vanBedrijfMerk, onlineFilter, vandaag), vandaag),
    [vanBedrijfMerk, onlineFilter, vandaag],
  );

  const kolommen: Kolom[] = useMemo(
    () =>
      zichtbaar.map((c) => {
        const k = c.laatsteAnalyse?.kerncijfers ?? null;
        const o = overzichtCijfers(c, k);
        const op = c.laatsteAnalyse?.geanalyseerdOp ?? null;
        return {
          c,
          o,
          geanalyseerd: Boolean(c.laatsteAnalyse),
          online: isLive(c, vandaag),
          tijd: tijdVoortgang(c.startdatum, c.einddatum, vandaag),
          kaartBron: {
            c,
            o,
            k,
            u: leesUitsplitsing(k),
            // De analyse heeft cijfers tot en met de dag vóór haar eigen dag, net als de rest van het dashboard.
            dataTot: op ? tijdVoortgang(c.startdatum, c.einddatum, dagErvoor(op)) : null,
            analyseDatum: analyseDatumLabel(op),
          },
        };
      }),
    [zichtbaar, vandaag],
  );

  if (!ingelogd) return <Inlogprompt tekst="Log in om de campagne-analyses te bekijken." />;

  if (fout) {
    return (
      <div className="rounded-panel border border-line bg-card px-5 py-4 text-sm text-ink-muted shadow-subtle">{fout}</div>
    );
  }

  if (regels === null) {
    return (
      <div className="flex flex-col gap-5">
        <div className="h-[86px] rounded-panel border border-line bg-card" />
        <div className="rounded-panel border border-line bg-card">
          <SkeletTabel rijen={5} kolommen={4} />
        </div>
      </div>
    );
  }

  if (campagnes.length === 0) {
    return (
      <div className="rounded-panel border border-line bg-card px-5 py-6 shadow-subtle">
        <p className="text-sm text-ink-muted">Er zijn nog geen campagne-analyses.</p>
        <a href="/?tab=marketing-analyse" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
          Naar Marketing analyse
        </a>
      </div>
    );
  }

  const filterAantal = (bedrijfFilter.length > 0 ? 1 : 0) + (merkFilter.length > 0 ? 1 : 0) + (onlineFilter ? 1 : 0);
  const wisFilters = () => {
    setBedrijfFilter([]);
    setMerkFilter([]);
    setOnlineFilter(null);
  };
  const licht = (k: Kolom) => (kolomHover === k.c.id ? "bg-ink/[0.022]" : "");
  const toonSyntec = kolommen.some((k) => k.o.syntec.stand === "cijfers");
  const groepen = GROEPEN.map((g) =>
    g.titel === "Leads en orders" && !toonSyntec ? { ...g, rijen: g.rijen.filter((r) => r.label === "Google Analytics") } : g,
  );

  return (
    <div className="flex flex-col gap-5">
      <FilterBar
        totalCount={campagnes.length}
        filteredCount={kolommen.length}
        activeFilterCount={filterAantal}
        onClearAll={wisFilters}
      >
        <FilterSelect label="Bedrijf" options={bedrijfOpties(campagnes)} selected={bedrijfFilter} onChange={setBedrijfFilter} />
        <FilterSelect label="Merk" options={merkOpties(campagnes)} selected={merkFilter} onChange={setMerkFilter} />
        <OnlineSchakelaar waarde={onlineFilter} onChange={setOnlineFilter} aantallen={aantallen} />
      </FilterBar>

      <section className="kaart-accent overflow-hidden rounded-panel border border-line bg-card shadow-card">
        {kolommen.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="font-semibold text-ink">Geen campagnes voor deze filters</p>
            <button
              type="button"
              onClick={wisFilters}
              className="mt-2 text-sm text-ink underline underline-offset-2 hover:text-primary"
            >
              Wis filters
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Campagnes zijn kolommen, cijfers rijen (zoals de campagnetabel): border-separate
                en geen collapse, anders schemeren gescrollde cellen door de sticky kolom heen. */}
            <table
              onMouseLeave={() => setKolomHover(null)}
              className="w-full table-fixed border-separate border-spacing-0 text-left"
              style={{ minWidth: LABELKOLOM + kolommen.length * KOLOM_MIN }}
            >
              <colgroup>
                <col style={{ width: LABELKOLOM }} />
                {kolommen.map((k) => (
                  <col key={k.c.id} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="label-theme sticky left-0 z-20 border-b border-r border-line bg-card px-5 py-5 align-top text-label text-ink-faint"
                  >
                    Campagne
                  </th>
                  {kolommen.map((k) => (
                    <th
                      key={k.c.id}
                      scope="col"
                      onMouseEnter={() => setKolomHover(k.c.id)}
                      className={`border-b border-line p-0 align-top font-normal [border-left:1px_dashed_var(--color-line-soft)] ${licht(k)}`}
                    >
                      <KolomKop k={k} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groepen.map((groep) => (
                  <Fragment key={groep.titel}>
                    {/* A8: de sectiekop is alleen een klein label boven de rijen, geen grijze band
                        meer over de volle breedte. */}
                    <tr>
                      <th
                        scope="colgroup"
                        className="label-theme sticky left-0 z-10 border-r border-line-soft bg-card px-5 pb-1 pt-6 text-left text-label text-ink-faint"
                      >
                        {groep.titel}
                      </th>
                      {kolommen.map((k) => (
                        <td
                          key={k.c.id}
                          onMouseEnter={() => setKolomHover(k.c.id)}
                          className={`[border-left:1px_dashed_var(--color-line-soft)] ${licht(k)}`}
                        />
                      ))}
                    </tr>
                    {groep.rijen.map((rij) => (
                      <tr key={rij.label}>
                        <th
                          scope="row"
                          data-tip={rij.uitleg}
                          className="sticky left-0 z-10 border-b border-r border-line-soft bg-card px-5 py-5 text-left align-top text-sm font-medium text-ink-muted"
                        >
                          {rij.label}
                        </th>
                        {kolommen.map((k) => (
                          <td
                            key={k.c.id}
                            onMouseEnter={() => setKolomHover(k.c.id)}
                            className={`border-b border-line-soft px-5 py-5 align-top [border-left:1px_dashed_var(--color-line-soft)] ${licht(k)}`}
                          >
                            {rij.render(k)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
                <tr>
                  <th scope="row" className="sticky left-0 z-10 border-r border-line-soft bg-card px-5 py-4 text-left align-middle">
                    <span className="sr-only">Analyse</span>
                  </th>
                  {kolommen.map((k) => (
                    <td
                      key={k.c.id}
                      onMouseEnter={() => setKolomHover(k.c.id)}
                      className={`px-5 py-4 [border-left:1px_dashed_var(--color-line-soft)] ${licht(k)}`}
                    >
                      {/* A12: een rustige tekstlink in plaats van vier gelijke knoppen; hij kleurt
                          mee als je in zijn kolom bent. De kolomkop opent de analyse ook. */}
                      <a
                        href={analyseHref(k.c.id)}
                        className={`inline-flex items-center gap-1.5 text-sm font-medium transition-colors duration-[var(--duur-snel)] ease-merk hover:text-primary ${
                          kolomHover === k.c.id ? "text-primary" : "text-ink-muted"
                        }`}
                      >
                        Bekijk analyse
                        <IconArrowRight className="h-3.5 w-3.5" />
                      </a>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

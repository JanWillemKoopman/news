"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Modal from "@/components/Modal";
import { IconCheck, IconClose, IconDownload, IconRefresh } from "@/components/icons";

/**
 * "Data ophalen": de nachtelijke Windsor-sync met de hand starten, vanuit de browser.
 *
 * Waarom dit bestaat: de cron beschermt zich met `CRON_SECRET`, en dat geheim hoort niet
 * in een browser. Zonder deze knop had je een terminal nodig om de eerste vulling te
 * starten of om bij te trekken na een nacht waarin er iets misging — en dat is precies
 * wat een marketeer niet heeft.
 *
 * ## Waarom deze component het ophalen niet meer aanstuurt
 *
 * Dat deed hij wel. Een lange periode gaat in stukken van dertig dagen, en deze component
 * riep de route net zo vaak opnieuw aan tot het restant leeg was — met dat restant in een
 * gewone variabele in de lus hieronder. Daarmee was dit tabblad het enige geheugen van de
 * opdracht: wegklikken brak de import af, en een wegvallende verbinding ook.
 *
 * Op 14 september 2026 leverde dat een Google Ads-jaargrafiek op met uitgaven in september
 * 2025 en vanaf juni 2026, en acht maanden niets daartussen. De lopende ronde had zichzelf
 * netjes afgemaakt tot 18 januari en daarna hield het op, zonder dat iets in beeld zei dat
 * de rest nooit was opgehaald.
 *
 * De opdracht staat nu op de server (`dataloket.sync_opdrachten`) en de server schakelt
 * zichzelf door naar het volgende stuk (`lib/windsor/keten.ts`). Deze component doet nog
 * twee dingen: de opdracht klaarzetten, en laten zien hoe ver hij staat. Sluiten mag.
 */

type Stap = {
  deel: "advertenties" | "organisch" | "account" | "website";
  label: string;
  toelichting: string;
};

const STAPPEN: Stap[] = [
  {
    deel: "advertenties",
    label: "Advertenties",
    toelichting: "Meta, Google en LinkedIn Ads",
  },
  {
    deel: "organisch",
    label: "Organische posts",
    toelichting: "Facebook, Instagram en LinkedIn, plus de koppeling met de advertenties",
  },
  {
    deel: "account",
    label: "Accountcijfers",
    toelichting: "volgers, vertoningen en interactie per account",
  },
  {
    deel: "website",
    label: "Website",
    toelichting: "Google Analytics 4: verkeer, landingspagina's, pagina's en events",
  },
];

const PERIODES = [
  { dagen: 30, label: "30 dagen", hint: "de gewone nachtelijke ronde" },
  { dagen: 90, label: "90 dagen", hint: "aan te raden bij de eerste keer" },
  { dagen: 365, label: "12 maanden", hint: "gaat in ronden; reken op een kwartier" },
];

/** Hoe vaak we bij de server vragen hoe ver de opdracht staat. */
const VOLG_INTERVAL_MS = 5000;

/**
 * Hoe lang een openstaande opdracht stil mag staan voordat we hem als vastgelopen tonen.
 *
 * Een schakel duurt hooguit vijf minuten. Staat de teller daarna nóg niets verder, dan is
 * de ketting gebroken — meestal een schakel die door Vercel is afgekapt vóórdat hij de
 * volgende had aangeroepen. De cron pakt hem vannacht op, maar dat hoort te lezen te zijn
 * in plaats van als een spinner die nergens meer heen gaat.
 */
const STIL_NA_MS = 10 * 60 * 1000;

/** Eén opdracht zoals `/api/kanalen/ophalen` hem teruggeeft. */
interface Opdracht {
  deel: string;
  /** Het stuk dat nog te doen is. */
  van: string;
  tot: string;
  gevraagdVan: string;
  gevraagdTot: string;
  schakels: number;
  rijen: number;
  bijgewerktOp: string;
  afgerondOp: string | null;
  fout: string | null;
  /** Open, maar de schakels zijn op — dit loopt niet vanzelf verder. */
  vastgelopen: boolean;
}

function kortDatum(datum: string): string {
  return new Date(`${datum}T00:00:00Z`).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Vanaf welke dag de historie binnen is.
 *
 * De stukken gaan nieuwste eerst, dus `tot` van het restant is de laatste dag die nog
 * míst. Alles vanaf de dag daarna staat er.
 */
function historieVanaf(opdracht: Opdracht): string {
  const d = new Date(`${opdracht.tot}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Staat een openstaande opdracht al te lang stil om nog te geloven dat hij loopt? */
function staatStil(opdracht: Opdracht): boolean {
  if (opdracht.afgerondOp || opdracht.vastgelopen) return false;
  return Date.now() - Date.parse(opdracht.bijgewerktOp) > STIL_NA_MS;
}

type Stand =
  | { soort: "wacht" }
  | { soort: "bezig"; voortgang?: string }
  | { soort: "klaar"; rijen: number; vanaf: string; waarschuwing?: string }
  | { soort: "fout"; bericht: string };

function standVan(opdracht: Opdracht | undefined): Stand {
  if (!opdracht) return { soort: "wacht" };
  if (opdracht.afgerondOp) {
    // Een afgeronde opdracht mét een foutregel is niet hetzelfde als een schone ronde:
    // één platform dat eruit lag is geen reden om de stap te laten mislukken, maar het
    // hoort wel te blijven staan. Stil "klaar" melden is precies hoe een halve import
    // eerder onopgemerkt bleef.
    return {
      soort: "klaar",
      rijen: opdracht.rijen,
      vanaf: opdracht.gevraagdVan,
      waarschuwing: opdracht.fout ?? undefined,
    };
  }
  if (opdracht.vastgelopen) {
    return {
      soort: "fout",
      bericht:
        opdracht.fout ??
        `De import is gestopt bij ${kortDatum(opdracht.tot)}; de periode daarvóór is niet opgehaald. Start hem nog eens om die erbij te halen.`,
    };
  }
  if (staatStil(opdracht)) {
    return {
      soort: "fout",
      bericht: `De import staat stil bij ${kortDatum(opdracht.tot)} — de periode daarvóór is nog niet opgehaald. Vannacht pakt de sync hem vanzelf op; opnieuw starten mag ook.${opdracht.fout ? ` (${opdracht.fout})` : ""}`,
    };
  }
  return {
    soort: "bezig",
    voortgang:
      opdracht.schakels > 0
        ? `historie binnen vanaf ${kortDatum(historieVanaf(opdracht))} — ${opdracht.rijen.toLocaleString("nl-NL")} rijen`
        : undefined,
  };
}

export default function DataOphalen({
  onKlaar,
  laatsteSync,
  loopt,
}: {
  onKlaar: () => void;
  /** Wanneer de laatste geslaagde sync eindigde. */
  laatsteSync: string | null;
  /** Loopt er al een sync (door de cron of door een collega)? */
  loopt: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [dagen, setDagen] = useState(90);
  const [starten, setStarten] = useState(false);
  const [opdrachten, setOpdrachten] = useState<Opdracht[] | null>(null);
  const [startfout, setStartfout] = useState<string | null>(null);
  const [alleenCron, setAlleenCron] = useState(false);

  // Om `onKlaar` precies één keer aan te roepen op het moment dat de laatste opdracht
  // afrondt, en niet bij elke peiling daarna opnieuw.
  const liepNog = useRef(false);

  // Een opdracht die stilstaat telt niet als bezig: anders blijft de knop voorgoed op
  // "Bezig…" staan en is opnieuw starten precies wat je niet kunt.
  const bezig = (opdrachten ?? []).some(
    (o) => !o.afgerondOp && !o.vastgelopen && !staatStil(o),
  );
  const afgerond =
    opdrachten !== null && opdrachten.length > 0 && opdrachten.every((o) => o.afgerondOp);

  const peil = useCallback(async () => {
    try {
      const res = await fetch("/api/kanalen/ophalen", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { opdrachten?: Opdracht[] };
      setOpdrachten(data.opdrachten ?? []);
    } catch {
      // Een netwerkhik tijdens het volgen is geen uitkomst; de volgende peiling komt zo.
    }
  }, []);

  // Zolang het venster openstaat: kijken hoe het ervoor staat. Ook zonder zelf geklikt te
  // hebben — een import die een collega of de cron gestart heeft, hoort hier gewoon in
  // beeld te staan.
  useEffect(() => {
    if (!open) return;
    void peil();
    const tijd = setInterval(() => void peil(), VOLG_INTERVAL_MS);
    return () => clearInterval(tijd);
  }, [open, peil]);

  // De cijfers op de pagina eronder verversen zodra de laatste opdracht klaar is.
  useEffect(() => {
    if (bezig) {
      liepNog.current = true;
      return;
    }
    if (liepNog.current) {
      liepNog.current = false;
      onKlaar();
    }
  }, [bezig, onKlaar]);

  async function start() {
    setStarten(true);
    setStartfout(null);
    try {
      const res = await fetch("/api/kanalen/ophalen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dagen }),
      });
      const data = (await res.json()) as { fout?: string; achtergrond?: boolean };
      if (!res.ok) throw new Error(data.fout ?? `Mislukt (${res.status}).`);
      setAlleenCron(data.achtergrond === false);
      await peil();
    } catch (err) {
      setStartfout(err instanceof Error ? err.message : String(err));
    } finally {
      setStarten(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex shrink-0 items-center gap-1.5 rounded-control px-2 py-1.5 text-sm font-medium text-ink-muted transition-colors duration-[var(--duur-snel)] hover:bg-surface hover:text-ink"
      >
        <IconDownload className="h-4 w-4" />
        Data ophalen
      </button>

      {open && (
        <Modal title="Data ophalen bij Windsor.ai" onClose={() => setOpen(false)}>
          <p className="text-sm text-ink-muted">
            Normaal gebeurt dit elke nacht vanzelf. Gebruik dit voor de eerste vulling, of
            als er een nacht is overgeslagen. Twee keer draaien kan geen kwaad — de cijfers
            worden overschreven, niet opgeteld.
          </p>

          <p className="mt-3 text-meta text-ink-faint">
            {laatsteSync
              ? `Laatst geslaagd op ${new Date(laatsteSync).toLocaleString("nl-NL", {
                  dateStyle: "long",
                  timeStyle: "short",
                })}.`
              : "Er is nog geen geslaagde sync geweest."}
          </p>

          {loopt && !bezig && (
            <p className="mt-3 flex items-start gap-2 rounded-control border border-line bg-surface-tint px-3 py-2 text-meta text-ink-muted">
              <IconRefresh className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Er lijkt al een sync te draaien — door de nachtelijke cron of door een collega.
              Wachten tot die klaar is scheelt jullie allebei een paar minuten; starten kan wel,
              het overschrijft alleen dezelfde rijen.
            </p>
          )}

          <div className="mt-5">
            <p className="label-theme mb-2 text-label text-ink-faint">Hoeveel historie</p>
            <div className="flex flex-wrap gap-2">
              {PERIODES.map((p) => (
                <button
                  key={p.dagen}
                  type="button"
                  disabled={starten}
                  onClick={() => setDagen(p.dagen)}
                  className={`rounded-control border px-3 py-2 text-left transition-colors duration-[var(--duur-snel)] disabled:opacity-50 ${
                    p.dagen === dagen
                      ? "border-primary bg-primary-light"
                      : "border-line hover:bg-surface"
                  }`}
                >
                  <span className="block text-sm font-medium text-ink">{p.label}</span>
                  <span className="block text-meta text-ink-faint">{p.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <ol className="mt-5 flex flex-col gap-0 border-t border-line">
            {STAPPEN.map((stap, i) => {
              const stand = standVan((opdrachten ?? []).find((o) => o.deel === stap.deel));
              return (
                <li
                  key={stap.deel}
                  className="flex items-start gap-3 border-b border-line py-3"
                >
                  <Merkteken stand={stand} nummer={i + 1} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{stap.label}</p>
                    <p className="text-meta text-ink-faint">{stap.toelichting}</p>
                    {stand.soort === "bezig" && stand.voortgang && (
                      <p className="mt-1 text-meta text-ink-muted">{stand.voortgang}</p>
                    )}
                    {stand.soort === "klaar" && (
                      <p className="mt-1 text-meta text-positive">
                        historie opgehaald vanaf {kortDatum(stand.vanaf)} —{" "}
                        {stand.rijen.toLocaleString("nl-NL")} rijen
                      </p>
                    )}
                    {stand.soort === "klaar" && stand.waarschuwing && (
                      <p className="mt-1 text-meta text-ink-muted">{stand.waarschuwing}</p>
                    )}
                    {stand.soort === "fout" && (
                      <p className="mt-1 text-meta text-negative">{stand.bericht}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          {startfout && <p className="mt-4 text-sm text-negative">{startfout}</p>}

          {alleenCron && (
            <p className="mt-4 text-meta text-ink-muted">
              De opdracht staat klaar, maar deze omgeving kan zichzelf niet doorschakelen
              (<code>CRON_SECRET</code> ontbreekt). Hij wordt vannacht door de cron
              afgemaakt.
            </p>
          )}

          {afgerond && !bezig && (
            <p className="mt-4 text-sm text-positive">
              Klaar. De pagina&apos;s tonen nu de nieuwe cijfers.
            </p>
          )}

          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-button px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface"
            >
              Sluiten
            </button>
            <button
              type="button"
              onClick={start}
              disabled={starten || bezig}
              className="flex items-center gap-2 rounded-button bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-opacity disabled:cursor-wait disabled:opacity-70"
            >
              {(starten || bezig) && <IconRefresh className="h-4 w-4 animate-spin" />}
              {starten ? "Starten…" : bezig ? "Bezig…" : afgerond ? "Opnieuw ophalen" : "Starten"}
            </button>
          </div>

          <p className="mt-3 text-meta text-ink-faint">
            {bezig
              ? "Je kunt dit venster sluiten — het ophalen loopt op de server door. Twaalf maanden wordt in stukken van een maand opgehaald; reken op een kwartier."
              : "Het ophalen gebeurt op de server, dus je kunt dit venster sluiten zodra het gestart is."}
          </p>
        </Modal>
      )}
    </>
  );
}

function Merkteken({ stand, nummer }: { stand: Stand; nummer: number }) {
  const basis =
    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-pill text-meta";
  if (stand.soort === "bezig") {
    return (
      <span className={`${basis} bg-primary-light text-primary`}>
        <IconRefresh className="h-3.5 w-3.5 animate-spin" />
      </span>
    );
  }
  if (stand.soort === "klaar") {
    return (
      <span className={`${basis} bg-open-light text-positive`}>
        <IconCheck className="h-3.5 w-3.5" />
      </span>
    );
  }
  if (stand.soort === "fout") {
    return (
      <span className={`${basis} bg-surface text-negative`}>
        <IconClose className="h-3.5 w-3.5" />
      </span>
    );
  }
  return <span className={`${basis} bg-surface text-ink-faint`}>{nummer}</span>;
}

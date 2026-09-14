"use client";

import { useState } from "react";
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
 * Wie hem opent ziet eerst wanneer hij voor het laatst draaide, en of er op dit moment al
 * één loopt. Dat laatste is geen formaliteit: de knop staat voor iedereen open, hij duurt
 * minuten, en twee collega's die hem tegelijk starten zitten allebei te wachten op
 * dezelfde upserts.
 *
 * De drie delen gaan ná elkaar, niet tegelijk. Twee redenen: één request per deel blijft
 * binnen de vijf minuten die een functie krijgt, en `organisch` koppelt aan het eind de
 * posts aan de advertenties, dus het moet ná `advertenties` draaien. Per stap zie je wat
 * er gebeurde; gaat er één mis, dan stopt de rij daar en blijft staan wat al gelukt is.
 *
 * ## Waarom een lange periode in ronden gaat
 *
 * Twaalf maanden past niet in één aanroep — niet in de vijf minuten van een functie, en
 * bij Meta zelfs niet in één antwoord. De server haalt zo'n periode daarom in stukken van
 * dertig dagen op, nieuwste eerst, en stopt uit zichzelf voordat hij wordt afgekapt. Wat
 * er dan nog te doen is staat als `restant` in het antwoord; deze component roept de
 * route daarmee net zo vaak opnieuw aan tot dat leeg is, en laat ondertussen zien tot
 * welke datum de historie binnen is.
 *
 * Dat is precies het gat waar het eerder op stukliep: een jaarronde werd na vijf minuten
 * afgekapt, er stonden drieduizend rijen in de database, en niets in beeld zei dat de
 * andere elf maanden er nooit waren gekomen.
 */

type Stap = {
  deel: "advertenties" | "organisch" | "account";
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
];

const PERIODES = [
  { dagen: 30, label: "30 dagen", hint: "de gewone nachtelijke ronde" },
  { dagen: 90, label: "90 dagen", hint: "aan te raden bij de eerste keer" },
  { dagen: 365, label: "12 maanden", hint: "gaat in ronden; reken op een kwartier" },
];

/**
 * Hoe vaak we per stap doorgaan met wat er van de periode overblijft.
 *
 * Twaalf maanden zijn dertien stukken van dertig dagen, en in het slechtste geval haalt
 * één aanroep er maar één. Ruim erboven, zodat de grens nooit de reden is dat een import
 * stopt — maar niet oneindig, want een server die telkens hetzelfde restant teruggeeft
 * hoort niet eindeloos opnieuw aangeroepen te worden.
 */
const MAX_RONDEN = 20;

type Stand =
  | { soort: "wacht" }
  | { soort: "bezig"; voortgang?: string }
  | { soort: "klaar"; gelezen: number; geschreven: number; seconden: number; waarschuwing?: string }
  | { soort: "fout"; bericht: string };

interface Periode {
  van: string;
  tot: string;
}

interface RunStand {
  gestartOp: string;
  geeindigdOp: string | null;
  geschreven: number | null;
  gelukt: boolean;
  fout: string | null;
}

/** Hoe vaak en hoe lang we een doorlopende run blijven volgen. */
const VOLG_INTERVAL_MS = 5000;
const VOLG_MAX_MS = 10 * 60 * 1000;

interface Onderdeel {
  onderdeel: string;
  gelezen: number;
  geschreven: number;
  fout?: string;
}

interface Antwoord {
  fout?: string;
  duurMs?: number;
  resultaten?: Onderdeel[];
  gedaan?: Periode | null;
  restant?: Periode | null;
}

function kortDatum(datum: string): string {
  return new Date(`${datum}T00:00:00Z`).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Wacht tot de run van dit onderdeel een eindtijd heeft.
 *
 * Nodig omdat een browser een verbinding korter openhoudt dan een sync duurt: de POST
 * valt weg met "Load failed" terwijl de sync op de server gewoon doordraait. Gemeten: een
 * organische ronde die als mislukt in beeld kwam en ondertussen 196 posts wegschreef. In
 * plaats van dat als fout te tonen, kijken we hier elke vijf seconden in `sync_runs` hoe
 * het écht met die run staat.
 *
 * `sinds` houdt oude runs buiten beeld — anders leest hij de vorige ronde van gisteren
 * als uitkomst van deze klik.
 */
async function volgRun(deel: string, sinds: number): Promise<RunStand> {
  const einde = Date.now() + VOLG_MAX_MS;
  while (Date.now() < einde) {
    await new Promise((klaar) => setTimeout(klaar, VOLG_INTERVAL_MS));
    try {
      const res = await fetch(`/api/kanalen/ophalen?deel=${deel}`, { cache: "no-store" });
      if (!res.ok) continue;
      const { run } = (await res.json()) as { run: RunStand | null };
      if (!run || new Date(run.gestartOp).getTime() < sinds - 5000) continue;
      if (run.geeindigdOp) return run;
    } catch {
      // Netwerkhik tijdens het volgen is geen uitkomst; gewoon nog eens kijken.
    }
  }
  throw new Error(
    "De ophaalactie draait nog steeds op de server. Sluit dit venster gerust — kijk over een paar minuten bij Verversen of de cijfers er staan.",
  );
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
  const [bezig, setBezig] = useState(false);
  const [standen, setStanden] = useState<Record<string, Stand>>({});
  const [afgerond, setAfgerond] = useState(false);

  function zet(deel: string, stand: Stand) {
    setStanden((huidig) => ({ ...huidig, [deel]: stand }));
  }

  async function start() {
    setBezig(true);
    setAfgerond(false);
    setStanden(Object.fromEntries(STAPPEN.map((s) => [s.deel, { soort: "wacht" } as Stand])));

    for (const stap of STAPPEN) {
      zet(stap.deel, { soort: "bezig" });

      // Wat er van de gevraagde periode nog te doen is. Leeg bij de eerste aanroep — dan
      // rekent de server zelf terug vanaf vandaag — en daarna precies wat hij teruggaf.
      let restant: Periode | null = null;
      let gelezen = 0;
      let geschreven = 0;
      let seconden = 0;
      const waarschuwingen = new Set<string>();
      let vroegste = "";

      for (let ronde = 1; ronde <= MAX_RONDEN; ronde++) {
        const gestart = Date.now();
        try {
          const res = await fetch("/api/kanalen/ophalen", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deel: stap.deel, dagen, ...(restant ?? {}) }),
          });
          const data = (await res.json()) as Antwoord;

          if (!res.ok) throw new Error(data.fout ?? `Mislukt (${res.status}).`);

          const resultaten = data.resultaten ?? [];
          gelezen += resultaten.reduce((t, r) => t + r.gelezen, 0);
          geschreven += resultaten.reduce((t, r) => t + r.geschreven, 0);
          seconden += Math.round((data.duurMs ?? 0) / 1000);
          for (const r of resultaten) {
            if (r.fout) waarschuwingen.add(`${r.onderdeel} — ${r.fout}`);
          }
          if (data.gedaan) vroegste = data.gedaan.van;

          restant = data.restant ?? null;
          if (!restant) break;

          // Nog een ronde te gaan: laat zien hoe ver de historie inmiddels terugloopt, zodat
          // een import van een kwartier niet als een bevroren venster aanvoelt.
          zet(stap.deel, {
            soort: "bezig",
            voortgang: vroegste ? `historie teruggehaald tot ${kortDatum(vroegste)}…` : undefined,
          });
          if (ronde === MAX_RONDEN) {
            waarschuwingen.add(
              `De periode vóór ${kortDatum(restant.tot)} is niet meer opgehaald; start de import nog eens om die erbij te halen.`,
            );
          }
        } catch (err) {
          // De verbinding is weggevallen, niet de sync. Kijk in sync_runs hoe deze ronde
          // werkelijk afloopt in plaats van hem als mislukt te tonen.
          try {
            const run = await volgRun(stap.deel, gestart);
            geschreven += run.geschreven ?? 0;
            seconden += Math.round(
              (new Date(run.geeindigdOp ?? run.gestartOp).getTime() -
                new Date(run.gestartOp).getTime()) /
                1000,
            );
            waarschuwingen.add(
              run.fout ??
                "De verbinding met de browser viel weg; deze ronde is op de server afgemaakt. Of de hele periode binnen is, is van hier niet te zien — start de import nog eens als er historie mist.",
            );
            // Zonder antwoord weten we niet wat er nog te doen was, dus verdergaan met een
            // gokperiode zou stukken kunnen overslaan. Deze stap stopt hier.
            break;
          } catch (volgFout) {
            zet(stap.deel, {
              soort: "fout",
              bericht:
                volgFout instanceof Error
                  ? volgFout.message
                  : err instanceof Error
                    ? err.message
                    : String(err),
            });
            setBezig(false);
            return; // de volgende stap leunt op deze; doorgaan levert halve cijfers op
          }
        }
      }

      // Eén platform dat eruit ligt is geen reden om de stap als mislukt te tonen, maar het
      // hoort ook niet als een schone ronde te voelen.
      const waarschuwing =
        waarschuwingen.size > 0 ? [...waarschuwingen].join(" · ") : undefined;

      zet(stap.deel, {
        soort: "klaar",
        gelezen,
        geschreven,
        seconden,
        waarschuwing:
          vroegste && !waarschuwing
            ? `historie opgehaald vanaf ${kortDatum(vroegste)}`
            : waarschuwing,
      });
    }

    setBezig(false);
    setAfgerond(true);
    onKlaar();
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
        <Modal
          title="Data ophalen bij Windsor.ai"
          onClose={() => {
            // Tijdens het ophalen niet sluiten: de verzoeken lopen via deze pagina, en
            // wegklikken breekt de lopende stap af halverwege het wegschrijven.
            if (!bezig) setOpen(false);
          }}
        >
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
                  disabled={bezig}
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
              const stand = standen[stap.deel] ?? { soort: "wacht" as const };
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
                        {stand.geschreven.toLocaleString("nl-NL")} rijen weggeschreven in{" "}
                        {stand.seconden} seconden
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

          {afgerond && (
            <p className="mt-4 text-sm text-positive">
              Klaar. De pagina&apos;s tonen nu de nieuwe cijfers.
            </p>
          )}

          <div className="mt-5 flex items-center justify-end gap-2">
            {!bezig && (
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-button px-4 py-2 text-sm font-medium text-ink-muted hover:bg-surface"
              >
                Sluiten
              </button>
            )}
            <button
              type="button"
              onClick={start}
              disabled={bezig}
              className="flex items-center gap-2 rounded-button bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-opacity disabled:cursor-wait disabled:opacity-70"
            >
              {bezig && <IconRefresh className="h-4 w-4 animate-spin" />}
              {bezig ? "Bezig…" : afgerond ? "Opnieuw ophalen" : "Starten"}
            </button>
          </div>

          {bezig && (
            <p className="mt-3 text-meta text-ink-faint">
              Laat dit venster open staan tot het klaar is. Twaalf maanden wordt in stukken
              van een maand opgehaald; reken op een kwartier voor alle drie de stappen.
            </p>
          )}
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

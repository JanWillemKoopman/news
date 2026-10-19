"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Drawer from "@/components/Drawer";
import { IconChevronDown, IconClose, IconPlus, IconSearch, IconTrash } from "@/components/icons";
import { formatDate, formatNumber } from "@/lib/format";
import {
  OPERATOREN,
  OPERATOR_LABELS,
  VELD_LABELS,
  VOORWAARDE_VELDEN,
  controleerRegels,
  gisteren,
  telPeriode,
  zoekEvents,
  type Ga4Telling,
  type Operator,
  type Regel,
  type Voorwaarde,
  type VoorwaardeVeld,
} from "@/lib/ga4Koppeling";
import { useGa4Koppelingen } from "@/lib/ga4KoppelingContext";
import type { Campagne } from "@/lib/sheet";

type EventOptie = { event: string; aantal: number; keyEvent: boolean };
type Opties = { events: EventOptie[]; websites: string[]; kanaalgroepen: string[] };

/**
 * De keuzelijsten veranderen hooguit één keer per nacht (de sync), dus één keer ophalen
 * per periode per paginabezoek is genoeg — ook als iemand tien campagnes achter elkaar
 * koppelt. De periode is de looptijd van de campagne: campagnes met dezelfde looptijd
 * delen hun lijst.
 */
const optiesBeloftes = new Map<string, Promise<Opties>>();
function haalOpties(periode: { van: string; tot: string } | null): Promise<Opties> {
  const sleutel = periode ? `${periode.van}|${periode.tot}` : "";
  let belofte = optiesBeloftes.get(sleutel);
  if (!belofte) {
    const zoek = periode ? `?${new URLSearchParams(periode)}` : "";
    belofte = fetch(`/api/campagne-ga4/opties${zoek}`).then(async (res) => {
      const data = (await res.json().catch(() => ({}))) as Partial<Opties> & { fout?: string };
      if (!res.ok) {
        optiesBeloftes.delete(sleutel);
        throw new Error(data.fout ?? "Kon de GA4-events niet ophalen.");
      }
      return { events: data.events ?? [], websites: data.websites ?? [], kanaalgroepen: data.kanaalgroepen ?? [] };
    });
    optiesBeloftes.set(sleutel, belofte);
  }
  return belofte;
}

const LEGE_REGEL: Regel = { events: [], voorwaarden: [] };

/**
 * De zijbalk waarin een campagne aan GA4-events wordt gekoppeld.
 *
 * Een campagne heeft één of meer regels (onderling "of"); een regel heeft events
 * (onderling "of") en voorwaarden (onderling "en"). Onderaan staat wat het concept nú
 * oplevert over de looptijd van de campagne, vóórdat er iets is opgeslagen: een
 * koppeling die je pas na het opslaan kunt controleren, controleert niemand.
 */
export default function Ga4KoppelZijbalk({ campagne, onClose }: { campagne: Campagne; onClose: () => void }) {
  const { koppelingen, slaOp, telTot } = useGa4Koppelingen();
  const opgeslagen = koppelingen[campagne.naam]?.regels ?? [];
  const [regels, setRegels] = useState<Regel[]>(() =>
    opgeslagen.length > 0 ? structuredClone(opgeslagen) : [structuredClone(LEGE_REGEL)],
  );
  const [opties, setOpties] = useState<Opties | null>(null);
  const [optiesFout, setOptiesFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  // `onClose` wordt door de tabel als nieuwe functie meegegeven; vastzetten voorkomt dat
  // de Drawer bij elke render zijn effect opnieuw draait.
  const sluitRef = useRef(onClose);
  sluitRef.current = onClose;
  const [sluit] = useState(() => () => sluitRef.current());

  // De eventlijst telt standaard over de looptijd van de campagne, net als de telling zelf
  // (tot en met gisteren). Begint de campagne nog, of heeft hij geen startdatum, dan over
  // de laatste negentig dagen.
  const looptijd = useMemo(() => {
    const p = telPeriode(campagne.startdatum, campagne.einddatum, gisteren());
    return p && p.van <= p.tot ? p : null;
  }, [campagne.startdatum, campagne.einddatum]);

  useEffect(() => {
    haalOpties(looptijd).then(setOpties, (err) => setOptiesFout(err instanceof Error ? err.message : String(err)));
  }, [looptijd]);

  // Lege regels (nog geen event gekozen) tellen niet mee in het voorbeeld en worden bij
  // het opslaan weggelaten — één lege regel staat er standaard, als uitnodiging.
  const ingevuld = useMemo(() => regels.filter((r) => r.events.length > 0), [regels]);
  const controle = useMemo(() => controleerRegels(ingevuld), [ingevuld]);
  const voorbeeld = useVoorbeeld(campagne, controle.ok ? controle.waarde : null);

  function werkRegelBij(index: number, regel: Regel) {
    setRegels((huidig) => huidig.map((r, i) => (i === index ? regel : r)));
  }

  async function opslaan() {
    if (!controle.ok) {
      setFout(controle.fout);
      return;
    }
    setBezig(true);
    setFout(null);
    try {
      await slaOp(campagne.naam, { regels: controle.waarde });
      sluit();
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Opslaan mislukt.");
    } finally {
      setBezig(false);
    }
  }

  async function ontkoppel() {
    setBezig(true);
    setFout(null);
    try {
      await slaOp(campagne.naam, { regels: [] });
      sluit();
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Opslaan mislukt.");
    } finally {
      setBezig(false);
    }
  }

  return (
    <Drawer title={`GA-koppeling · ${campagne.naam}`} onClose={sluit}>
      <div className="flex flex-col gap-5">
        <p className="text-sm leading-relaxed text-ink-muted">
          Kies welke GA4-events voor deze campagne als conversie tellen. Binnen een regel tellen de
          events als <span className="font-medium text-ink">of</span> en de voorwaarden als{" "}
          <span className="font-medium text-ink">en</span>; een event dat aan meerdere regels voldoet
          telt één keer. Er telt alles tussen{" "}
          <span className="text-ink">{formatDate(campagne.startdatum)}</span> en{" "}
          <span className="text-ink">{formatDate(campagne.einddatum)}</span>, tot en met gisteren.
        </p>

        {optiesFout && <p className="text-sm text-negative">{optiesFout}</p>}

        {regels.map((regel, i) => (
          <div key={i} className="flex flex-col gap-2">
            {i > 0 && <p className="label-theme text-label text-ink-faint">of</p>}
            <RegelBlok
              nummer={i + 1}
              regel={regel}
              opties={opties}
              looptijd={looptijd}
              onChange={(r) => werkRegelBij(i, r)}
              onVerwijder={
                regels.length > 1 ? () => setRegels((huidig) => huidig.filter((_, j) => j !== i)) : undefined
              }
            />
          </div>
        ))}

        <button
          type="button"
          onClick={() => setRegels((huidig) => [...huidig, structuredClone(LEGE_REGEL)])}
          className="inline-flex items-center gap-1.5 self-start rounded-control px-2 py-1 text-sm font-medium text-primary transition-colors duration-[var(--duur-snel)] hover:bg-surface"
        >
          <IconPlus className="h-4 w-4" />
          Regel toevoegen
        </button>

        <VoorbeeldBlok
          heeftRegels={ingevuld.length > 0}
          fout={controle.ok ? voorbeeld.fout : controle.fout}
          telling={controle.ok ? voorbeeld.telling : null}
          laden={voorbeeld.laden}
          heeftStartdatum={Boolean(campagne.startdatum)}
          tot={voorbeeld.tot ?? telTot}
        />

        {fout && <p className="text-sm text-negative">{fout}</p>}

        <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
          {opgeslagen.length > 0 ? (
            <button
              type="button"
              onClick={ontkoppel}
              disabled={bezig}
              className="inline-flex items-center gap-1.5 rounded-control px-2 py-1 text-sm text-ink-muted transition-colors duration-[var(--duur-snel)] hover:text-negative disabled:opacity-50"
            >
              <IconTrash className="h-4 w-4" />
              Ontkoppelen
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={sluit}
              className="rounded-button px-4 py-2 text-sm text-ink-muted transition-colors duration-[var(--duur-snel)] hover:bg-surface hover:text-ink"
            >
              Annuleren
            </button>
            <button
              type="button"
              onClick={opslaan}
              disabled={bezig || ingevuld.length === 0}
              className="rounded-button bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors duration-[var(--duur-snel)] hover:bg-primary-dark disabled:opacity-50"
            >
              {bezig ? "Opslaan…" : "Opslaan"}
            </button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

function RegelBlok({
  nummer,
  regel,
  opties,
  looptijd,
  onChange,
  onVerwijder,
}: {
  nummer: number;
  regel: Regel;
  opties: Opties | null;
  looptijd: { van: string; tot: string } | null;
  onChange: (regel: Regel) => void;
  onVerwijder?: () => void;
}) {
  function werkVoorwaardeBij(index: number, voorwaarde: Voorwaarde) {
    onChange({ ...regel, voorwaarden: regel.voorwaarden.map((v, i) => (i === index ? voorwaarde : v)) });
  }

  return (
    <div className="flex flex-col gap-3 rounded-card border border-line bg-surface px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="label-theme text-label text-ink-faint">Regel {nummer}</p>
        {onVerwijder && (
          <button
            type="button"
            onClick={onVerwijder}
            aria-label={`Regel ${nummer} verwijderen`}
            className="flex h-6 w-6 items-center justify-center rounded-control text-ink-faint transition-colors duration-[var(--duur-snel)] hover:bg-card hover:text-negative"
          >
            <IconTrash className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-ink-muted">Events</p>
        <EventKiezer
          gekozen={regel.events}
          opties={opties?.events ?? null}
          looptijd={looptijd}
          onChange={(events) => onChange({ ...regel, events })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium text-ink-muted">
          Voorwaarden <span className="font-normal text-ink-faint">(optioneel — allemaal waar)</span>
        </p>
        {regel.voorwaarden.map((v, i) => (
          <VoorwaardeRij
            key={i}
            voorwaarde={v}
            opties={opties}
            onChange={(nieuw) => werkVoorwaardeBij(i, nieuw)}
            onVerwijder={() => onChange({ ...regel, voorwaarden: regel.voorwaarden.filter((_, j) => j !== i) })}
          />
        ))}
        <button
          type="button"
          onClick={() =>
            onChange({ ...regel, voorwaarden: [...regel.voorwaarden, { veld: "pagina", operator: "bevat", waarde: "" }] })
          }
          className="inline-flex items-center gap-1 self-start rounded-control px-1.5 py-0.5 text-xs font-medium text-primary transition-colors duration-[var(--duur-snel)] hover:bg-card"
        >
          <IconPlus className="h-3.5 w-3.5" />
          Voorwaarde
        </button>
      </div>
    </div>
  );
}

const SELECT_KLASSE =
  "rounded-control border border-line bg-card px-2 py-1.5 text-xs text-ink outline-none focus:border-primary";

/** Voorbeelden in het invoerveld, zodat duidelijk is wat er in elk veld staat. */
const PLACEHOLDER: Record<VoorwaardeVeld, string> = {
  pagina: "/audi",
  querystring: "merk=audi",
  url: "/auto?merk=audi",
  website: "",
  kanaalgroep: "",
  campagne: "naam van de utm-campagne",
};

function VoorwaardeRij({
  voorwaarde,
  opties,
  onChange,
  onVerwijder,
}: {
  voorwaarde: Voorwaarde;
  opties: Opties | null;
  onChange: (v: Voorwaarde) => void;
  onVerwijder: () => void;
}) {
  // Bij website en kanaalgroep is de lijst eindig en bekend; een datalist laat kiezen én
  // zelf typen toe (voor "bevat" is een stukje genoeg).
  const lijst =
    voorwaarde.veld === "website" ? opties?.websites : voorwaarde.veld === "kanaalgroep" ? opties?.kanaalgroepen : null;
  const lijstId = `ga4-lijst-${voorwaarde.veld}`;

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={voorwaarde.veld}
        onChange={(e) => onChange({ ...voorwaarde, veld: e.target.value as VoorwaardeVeld })}
        className={`${SELECT_KLASSE} w-36 shrink-0`}
        aria-label="Veld"
      >
        {VOORWAARDE_VELDEN.map((veld) => (
          <option key={veld} value={veld}>
            {VELD_LABELS[veld]}
          </option>
        ))}
      </select>
      <select
        value={voorwaarde.operator}
        onChange={(e) => onChange({ ...voorwaarde, operator: e.target.value as Operator })}
        className={`${SELECT_KLASSE} w-28 shrink-0`}
        aria-label="Vergelijking"
      >
        {OPERATOREN.map((op) => (
          <option key={op} value={op}>
            {OPERATOR_LABELS[op]}
          </option>
        ))}
      </select>
      <input
        type="text"
        value={voorwaarde.waarde}
        list={lijst ? lijstId : undefined}
        placeholder={PLACEHOLDER[voorwaarde.veld]}
        onChange={(e) => onChange({ ...voorwaarde, waarde: e.target.value })}
        className={`${SELECT_KLASSE} min-w-0 flex-1 placeholder:text-ink-faint`}
        aria-label="Waarde"
      />
      {lijst && (
        <datalist id={lijstId}>
          {lijst.map((w) => (
            <option key={w} value={w} />
          ))}
        </datalist>
      )}
      <button
        type="button"
        onClick={onVerwijder}
        aria-label="Voorwaarde verwijderen"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-control text-ink-faint transition-colors duration-[var(--duur-snel)] hover:bg-card hover:text-negative"
      >
        <IconClose className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/**
 * Meerkeuzelijst van GA4-events met zoekveld. De gekozen events staan als chips boven de
 * knop. Gesorteerd op volume (zo staan de events die ertoe doen bovenaan), met de key
 * events gemarkeerd. Een event dat de laatste negentig dagen niet vuurde staat niet in
 * de lijst maar is wél in te typen — een campagne kan koppelen aan een formulier dat nog
 * live moet.
 */
function EventKiezer({
  gekozen,
  opties,
  looptijd,
  onChange,
}: {
  gekozen: string[];
  opties: EventOptie[] | null;
  looptijd: { van: string; tot: string } | null;
  onChange: (events: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [zoek, setZoek] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function klikBuiten(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", klikBuiten);
    return () => document.removeEventListener("mousedown", klikBuiten);
  }, [open]);

  // Altijd de top 10, ook zonder zoekterm: een lege lijst met "begin maar te typen" helpt
  // niemand die de technische eventnaam nog niet kent. Gekozen events staan als chips
  // boven de knop, dus die hoeven hier niet buiten de top om terug te komen.
  const { top: zichtbaar, meer } = useMemo(() => zoekEvents(opties ?? [], zoek), [opties, zoek]);
  const eigenEvent = opties !== null && zichtbaar.length === 0 && zoek.trim() ? zoek.trim() : null;
  // Zelf een naam toevoegen alleen als er niets gevonden is: anders staat "“lead
  // proefrit” toevoegen" naast het echte `generate_lead_proefrit`, en dat leidt af.

  function toggle(event: string) {
    onChange(gekozen.includes(event) ? gekozen.filter((e) => e !== event) : [...gekozen, event]);
  }

  return (
    <div ref={ref} className="relative flex flex-col gap-1.5">
      {gekozen.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {gekozen.map((event) => (
            <span
              key={event}
              className="inline-flex items-center gap-1 rounded-control border border-line bg-card py-0.5 pl-2 pr-1 text-xs text-ink"
            >
              {event}
              <button
                type="button"
                onClick={() => toggle(event)}
                aria-label={`${event} weghalen`}
                className="flex h-4 w-4 items-center justify-center rounded-control text-ink-faint hover:text-negative"
              >
                <IconClose className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`${SELECT_KLASSE} flex items-center justify-between text-left text-ink-muted`}
      >
        {gekozen.length === 0 ? "Kies één of meer events" : "Events toevoegen of weghalen"}
        <IconChevronDown className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-10 mt-1 flex max-h-120 flex-col rounded-control border border-line bg-card shadow-dropdown">
          <div className="flex items-center gap-2 border-b border-line px-3 py-2">
            <IconSearch className="h-3.5 w-3.5 text-ink-faint" />
            <input
              autoFocus
              type="text"
              value={zoek}
              onChange={(e) => setZoek(e.target.value)}
              placeholder="Zoek een event"
              className="min-w-0 flex-1 bg-transparent text-xs text-ink outline-none placeholder:text-ink-faint"
            />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto py-1">
            {opties === null && <p className="px-3 py-2 text-xs text-ink-faint">Events laden…</p>}
            {zichtbaar.map((o) => (
              <label
                key={o.event}
                className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-xs text-ink hover:bg-surface"
              >
                <input type="checkbox" checked={gekozen.includes(o.event)} onChange={() => toggle(o.event)} />
                <span className="min-w-0 flex-1 truncate">{o.event}</span>
                {o.keyEvent && (
                  <span className="shrink-0 rounded-control border border-line px-1 text-meta text-ink-muted">
                    key event
                  </span>
                )}
                <span className="shrink-0 tabular-nums text-ink-faint">{formatNumber(o.aantal)}</span>
              </label>
            ))}
            {opties !== null && zichtbaar.length === 0 && !eigenEvent && (
              <p className="px-3 py-2 text-xs text-ink-faint">Geen events gevonden.</p>
            )}
            {meer > 0 && (
              <p className="px-3 py-1.5 text-meta text-ink-faint">
                Nog {formatNumber(meer)} {meer === 1 ? "event" : "events"} — typ verder om te zoeken.
              </p>
            )}
            {eigenEvent && !gekozen.includes(eigenEvent) && (
              <button
                type="button"
                onClick={() => {
                  toggle(eigenEvent);
                  setZoek("");
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-primary hover:bg-surface"
              >
                <IconPlus className="h-3.5 w-3.5" />
                “{eigenEvent}” toevoegen
              </button>
            )}
          </div>
          <p className="border-t border-line px-3 py-1.5 text-meta text-ink-faint">
            {zoek.trim() ? "Beste treffers" : "Top 10"} op aantal{" "}
            {looptijd
              ? `tussen ${formatDate(looptijd.van)} en ${formatDate(looptijd.tot)} (looptijd van de campagne)`
              : "over de laatste 90 dagen"}
            , alle websites samen.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Telt het concept na een korte pauze in het typen: niet bij elke toetsaanslag een
 * query, wel binnen een halve seconde na de laatste wijziging een getal.
 */
function useVoorbeeld(campagne: Campagne, regels: Regel[] | null) {
  const [telling, setTelling] = useState<Ga4Telling | null>(null);
  const [tot, setTot] = useState<string | null>(null);
  const [laden, setLaden] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const sleutel = regels && regels.length > 0 ? JSON.stringify(regels) : null;

  useEffect(() => {
    setTelling(null);
    setFout(null);
    if (!sleutel || !campagne.startdatum) {
      setLaden(false);
      return;
    }
    setLaden(true);
    let actief = true;
    const timer = setTimeout(() => {
      fetch("/api/campagne-ga4/tellen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campagnes: [
            {
              naam: campagne.naam,
              startdatum: campagne.startdatum,
              einddatum: campagne.einddatum,
              regels: JSON.parse(sleutel),
            },
          ],
        }),
      })
        .then(async (res) => {
          const data = (await res.json().catch(() => ({}))) as {
            tellingen?: Record<string, Ga4Telling>;
            tot?: string;
            fout?: string;
          };
          if (!res.ok) throw new Error(data.fout ?? "Kon niet tellen.");
          if (!actief) return;
          setTelling(data.tellingen?.[campagne.naam] ?? { totaal: 0, perEvent: [] });
          setTot(data.tot ?? null);
        })
        .catch((err) => actief && setFout(err instanceof Error ? err.message : String(err)))
        .finally(() => actief && setLaden(false));
    }, 500);
    return () => {
      actief = false;
      clearTimeout(timer);
    };
  }, [sleutel, campagne.naam, campagne.startdatum, campagne.einddatum]);

  return { telling, tot, laden, fout };
}

function VoorbeeldBlok({
  heeftRegels,
  heeftStartdatum,
  telling,
  laden,
  fout,
  tot,
}: {
  heeftRegels: boolean;
  heeftStartdatum: boolean;
  telling: Ga4Telling | null;
  laden: boolean;
  fout: string | null;
  tot: string | null;
}) {
  let inhoud: React.ReactNode;
  if (!heeftRegels) {
    inhoud = <p className="text-sm text-ink-faint">Kies een event om te zien wat deze koppeling oplevert.</p>;
  } else if (!heeftStartdatum) {
    inhoud = <p className="text-sm text-ink-faint">Deze campagne heeft nog geen startdatum, dus er valt niets te tellen.</p>;
  } else if (fout) {
    inhoud = <p className="text-sm text-negative">{fout}</p>;
  } else if (laden || !telling) {
    inhoud = <p className="text-sm text-ink-faint">Tellen…</p>;
  } else {
    inhoud = (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-ink">
          <span className="text-lg font-semibold tabular-nums">{formatNumber(telling.totaal)}</span>{" "}
          <span className="text-ink-muted">
            GA conversies{tot ? ` t/m ${formatDate(tot)}` : ""}
          </span>
        </p>
        {telling.perEvent.length > 1 && (
          <ul className="flex flex-col gap-0.5 text-xs text-ink-muted">
            {telling.perEvent.map((e) => (
              <li key={e.event} className="flex justify-between gap-3">
                <span className="truncate">{e.event}</span>
                <span className="tabular-nums">{formatNumber(e.aantal)}</span>
              </li>
            ))}
          </ul>
        )}
        {telling.totaal === 0 && (
          <p className="text-xs text-ink-faint">
            Nul treffers. Controleer de schrijfwijze van het pad of de querystring — dat is meestal de oorzaak.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-card border border-line bg-card px-4 py-3">
      <p className="label-theme mb-1.5 text-label text-ink-faint">Voorbeeld</p>
      {inhoud}
    </div>
  );
}

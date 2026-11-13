"use client";

import ProgressBar from "@/components/ProgressBar";
import type { Optin } from "@/lib/selligent/stand";

/**
 * De cijferkoppen van het tabblad: twee grote metrics, en de opt-ins eronder.
 *
 * ## Waarom Contacten en Auto's naast elkaar, en het aantal rijen nergens
 *
 * Dat zijn de twee dingen die je in dit bestand kunt tellen, en het zijn er allebei
 * minder dan er rijen zijn: 169.290 rijen is 137.424 contacten met 108.470 auto's, want
 * een rij is een contact mét een voertuig. Het aantal rijen staat daarom niet als derde
 * tegel maar als kleine regel eronder — het is de teller van het bestand, niet een cijfer
 * waarop je stuurt.
 *
 * ## De opt-ins zijn klikbaar, en dat is het punt
 *
 * Elke tegel is tegelijk het filter dat erbij hoort: klikken zet `PREFERENCES_VDU` op
 * `True` en de hele pagina rekent mee. Zo is de rij tegels een ingang tot de cijfers en
 * geen los overzichtje dat je daarna met de hand in de filterbalk moet naspelen.
 *
 * ## Twee getallen per opt-in, want één liegt
 *
 * Bij deze export is "nog niets ingevuld" vaak de grootste groep: `PREFERENCES_VDU` is
 * voor 40% gevuld. "47.084 van 137.424 contacten" leest dan als een schamele opt-in,
 * terwijl het "47.084 van de 68.533 die antwoord gaven" is. De tegel toont daarom het
 * aantal, en daaronder het aandeel van wie een antwoord gaf — met de balk op dát aandeel.
 *
 * ## Welke kolommen hier staan, bepaalt het bestand
 *
 * Nergens staat een lijst met voorkeuren. Het zijn de kolommen die als booleaans uit de
 * data komen (`lib/selligent/stand.ts`). Komt er een merk bij in de export, dan verschijnt
 * de tegel vanzelf.
 */

function getal(n: number): string {
  return n.toLocaleString("nl-NL");
}

export function GroteMetrics({
  contacten,
  contactenTotaal,
  contactKolom,
  autos,
  autosTotaal,
  autoKolom,
  rijen,
  gefilterd,
  bezig,
}: {
  contacten: number;
  contactenTotaal: number;
  contactKolom: string | null;
  autos: number;
  autosTotaal: number;
  autoKolom: string | null;
  rijen: number;
  gefilterd: boolean;
  bezig: boolean;
}) {
  return (
    <div className={`grid grid-cols-2 gap-6 transition-opacity ${bezig ? "opacity-60" : ""}`}>
      <GroteTegel
        label="Contacten"
        waarde={contacten}
        totaal={contactenTotaal}
        kolom={contactKolom}
        gefilterd={gefilterd}
        onder={`uit ${getal(rijen)} rijen`}
      />
      <GroteTegel
        label="Auto's"
        waarde={autos}
        totaal={autosTotaal}
        kolom={autoKolom}
        gefilterd={gefilterd}
        onder={
          contacten > 0
            ? `${(autos / contacten).toLocaleString("nl-NL", { maximumFractionDigits: 2 })} per contact`
            : undefined
        }
      />
    </div>
  );
}

function GroteTegel({
  label,
  waarde,
  totaal,
  kolom,
  gefilterd,
  onder,
}: {
  label: string;
  waarde: number;
  totaal: number;
  kolom: string | null;
  gefilterd: boolean;
  onder?: string;
}) {
  return (
    <section className="kaart-omlijst kaart-accent rounded-panel border border-line bg-card p-5 shadow-card">
      <p className="label-theme text-label text-ink-faint">{label}</p>
      <p className="titel-theme mt-1 font-sans-w7 text-title font-semibold text-ink">
        {getal(waarde)}
      </p>
      <p className="mt-1 text-meta text-ink-muted">
        {gefilterd ? `van ${getal(totaal)} in het hele bestand` : "in het hele bestand"}
        {onder && <> · {onder}</>}
      </p>
      {kolom ? (
        <p className="mt-0.5 text-meta text-ink-faint">
          verschillende waarden in <code>{kolom}</code>
        </p>
      ) : (
        <p className="mt-0.5 text-meta text-ink-faint">
          Deze export heeft geen kolom om dit te tellen.
        </p>
      )}
    </section>
  );
}

export function OptinStrip({
  optins,
  actief,
  onKies,
  bezig,
}: {
  optins: Optin[];
  /** De kolomnamen waarop nu op `True` gefilterd wordt. */
  actief: string[];
  onKies: (kolom: string, aan: boolean) => void;
  bezig: boolean;
}) {
  if (optins.length === 0) return null;

  return (
    <section
      className={`rounded-panel border border-line bg-card px-5 py-4 shadow-subtle transition-opacity ${
        bezig ? "opacity-60" : ""
      }`}
    >
      <h2 className="font-sans-w7 text-cell font-semibold text-ink">Opt-ins</h2>
      <p className="mt-0.5 max-w-prose text-meta text-ink-faint">
        Contacten die op <code>True</code> staan, per voorkeur. Het percentage is het
        aandeel van de contacten die hier een antwoord gaven — leeg telt niet als
        &ldquo;nee&rdquo;. Klik een tegel om erop te filteren.
      </p>

      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3 xl:grid-cols-5">
        {optins.map((optin) => (
          <OptinTegel
            key={optin.kolom}
            optin={optin}
            aan={actief.includes(optin.kolom)}
            onKies={(aan) => onKies(optin.kolom, aan)}
          />
        ))}
      </ul>
    </section>
  );
}

function OptinTegel({
  optin,
  aan,
  onKies,
}: {
  optin: Optin;
  aan: boolean;
  onKies: (aan: boolean) => void;
}) {
  const aandeel = optin.ingevuld > 0 ? optin.contacten / optin.ingevuld : 0;
  return (
    <li>
      <button
        type="button"
        onClick={() => onKies(!aan)}
        aria-pressed={aan}
        className={`w-full rounded-card border px-3 py-2.5 text-left transition-colors duration-[var(--duur-snel)] ease-merk ${
          aan ? "border-primary bg-primary-light" : "border-line hover:bg-surface"
        }`}
      >
        <span
          className="label-theme block truncate text-label text-ink-faint"
          title={optin.kolom}
        >
          {optin.kolom}
        </span>
        <span className="mt-0.5 block font-sans-w7 text-cell font-semibold text-ink">
          {getal(optin.contacten)}
        </span>
        <span className="mt-1.5 block">
          <ProgressBar percent={aandeel * 100} className="h-1 w-full" />
        </span>
        <span className="mt-1 block text-meta text-ink-faint">
          {Math.round(aandeel * 100)}% van {getal(optin.ingevuld)} ingevuld
        </span>
      </button>
    </li>
  );
}

"use client";

import ProgressBar from "@/components/ProgressBar";
import { LEEG_OPTIE, type Optin, type OptinStand } from "@/lib/selligent/stand";

/**
 * De cijferkoppen van het tabblad: twee grote metrics, en de opt-ins eronder.
 *
 * ## Drie tellingen, en het aantal rijen nergens
 *
 * Contacten, e-mailadressen en auto's zijn de drie dingen die je in dit bestand kunt
 * tellen, en het zijn er alle drie minder dan er rijen zijn: 169.290 rijen is 137.424
 * contacten met 125.369 adressen en 108.470 auto's, want een rij is een contact mét een
 * voertuig. Het aantal rijen staat daarom niet als vierde tegel maar als kleine regel
 * eronder — het is de teller van het bestand, niet een cijfer waarop je stuurt.
 *
 * Dat er minder adressen dan contacten zijn is op zichzelf een signaal: contacten die
 * hetzelfde adres delen, of er geen hebben.
 *
 * ## Wat er bij de e-mailtegel staat, en wat er niet staat
 *
 * Er staat dat de adressen zelf de server niet verlaten, en dat is letterlijk zo: alleen
 * dit aantal gaat over de lijn. Er staat **niet** dat ze gehasht of geanonimiseerd zijn,
 * want dat zijn ze niet — in de CSV op Azure staan ze gewoon leesbaar. Een geruststelling
 * op een dashboard moet waar zijn, anders is hij schadelijker dan geen geruststelling.
 *
 * ## De opt-ins zijn klikbaar, en dat is het punt
 *
 * Elke tegel is tegelijk het filter dat erbij hoort: klikken zet `PREFERENCES_VDU` op de
 * gekozen stand en de hele pagina rekent mee. Zo is de rij tegels een ingang tot de
 * cijfers en geen los overzichtje dat je daarna met de hand in de filterbalk moet
 * naspelen. Het filter gebruikt de ruwe waarden die de server meestuurt, niet een
 * verzonnen `"True"` — anders zou een tegel van 24.273 een filter van 24.270 kunnen
 * opleveren zodra er ergens `"true "` in het bestand staat.
 *
 * ## Drie standen, en waarom ze naast elkaar bestaan
 *
 * `True` is wie zich heeft aangemeld, `False` wie bewust nee zei, en **Onbekend** wie
 * nooit iets heeft ingevuld — en dat laatste is bij deze export vaak de grootste groep.
 * Die drie zijn drie verschillende doelgroepen: je mailt niet naar `False`, maar
 * `Onbekend` is juist waar een opt-in-campagne begint. Ze sluiten elkaar uit en tellen
 * samen op tot alle contacten in de selectie, dus de schakelaar bovenaan verdeelt steeds
 * dezelfde taart opnieuw.
 *
 * ## Eén noemer voor alle tegels: alle contacten
 *
 * Het percentage is het aandeel van álle contacten in de selectie, niet van de contacten
 * die in die kolom iets hadden ingevuld. Dat laatste stond er eerst, en het leverde
 * percentages op die niet te plaatsen waren: "48% van 50.054" bij een teller van 24.273,
 * terwijl het bestand 137.424 contacten heeft. Met één noemer zijn de tegels onderling te
 * vergelijken, en dat is waar een rij tegels voor bedoeld is.
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
  emails,
  emailsTotaal,
  emailKolom,
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
  emails: number;
  emailsTotaal: number;
  emailKolom: string | null;
  autos: number;
  autosTotaal: number;
  autoKolom: string | null;
  rijen: number;
  gefilterd: boolean;
  bezig: boolean;
}) {
  return (
    <div className={`grid grid-cols-3 gap-6 transition-opacity ${bezig ? "opacity-60" : ""}`}>
      <GroteTegel
        label="Contacten"
        waarde={contacten}
        totaal={contactenTotaal}
        kolom={contactKolom}
        gefilterd={gefilterd}
        onder={`uit ${getal(rijen)} rijen`}
      />
      <GroteTegel
        label="E-mailadressen"
        waarde={emails}
        totaal={emailsTotaal}
        kolom={emailKolom}
        gefilterd={gefilterd}
        onder={
          contacten > 0 && emails < contacten
            ? `${getal(contacten - emails)} contacten delen er een of hebben er geen`
            : undefined
        }
        noot="Alleen geteld, nooit getoond: geen enkel adres verlaat de server."
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
  noot,
}: {
  label: string;
  waarde: number;
  totaal: number;
  kolom: string | null;
  gefilterd: boolean;
  onder?: string;
  /** Een extra regel onder de tegel, bijvoorbeeld over wat er met de waarden gebeurt. */
  noot?: string;
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
      {noot && <p className="mt-2 text-meta text-ink-faint">{noot}</p>}
    </section>
  );
}

const STANDEN: { id: OptinStand; label: string; uitleg: string }[] = [
  { id: "waar", label: "True", uitleg: "contacten die zich hebben aangemeld" },
  { id: "onwaar", label: "False", uitleg: "contacten die bewust nee zeiden" },
  { id: "onbekend", label: "Onbekend", uitleg: "contacten die hier nooit iets invulden" },
];

/** Het aantal en de waarden die bij de gekozen stand horen. */
function standVanOptin(optin: Optin, stand: OptinStand): { aantal: number; waarden: string[] } {
  if (stand === "waar") return { aantal: optin.waar, waarden: optin.waarWaarden };
  if (stand === "onwaar") return { aantal: optin.onwaar, waarden: optin.onwaarWaarden };
  return { aantal: optin.onbekend, waarden: [LEEG_OPTIE] };
}

export function OptinStrip({
  optins,
  contacten,
  stand,
  onStand,
  actief,
  onKies,
  minstensEen,
  onMinstensEen,
  bezig,
}: {
  /** Staat het filter "minstens één opt-in op True" aan? */
  minstensEen: boolean;
  onMinstensEen: (aan: boolean) => void;
  optins: Optin[];
  /** Alle contacten in de selectie — de noemer van elke tegel. */
  contacten: number;
  stand: OptinStand;
  onStand: (stand: OptinStand) => void;
  /** De kolomnamen waarop nu op de gekozen stand gefilterd wordt. */
  actief: string[];
  onKies: (kolom: string, waarden: string[] | null) => void;
  bezig: boolean;
}) {
  if (optins.length === 0) return null;

  const gekozen = STANDEN.find((s) => s.id === stand) ?? STANDEN[0];

  return (
    <section
      className={`rounded-panel border border-line bg-card px-5 py-4 shadow-subtle transition-opacity ${
        bezig ? "opacity-60" : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          <h2 className="font-sans-w7 text-cell font-semibold text-ink">Opt-ins</h2>
          <p className="mt-0.5 max-w-prose text-meta text-ink-faint">
            Per voorkeur het aantal {gekozen.uitleg}, als aandeel van alle{" "}
            {getal(contacten)} contacten in deze selectie. De drie standen sluiten elkaar
            uit en tellen samen op tot dat aantal. Klik een tegel om erop te filteren.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onMinstensEen(!minstensEen)}
          aria-pressed={minstensEen}
          title={`Selecteer alle contacten die op minstens één van de ${optins.length} opt-ins True hebben`}
          className={`shrink-0 rounded-control border px-3 py-1.5 text-sm transition-colors duration-[var(--duur-snel)] ease-merk ${
            minstensEen
              ? "border-primary bg-primary text-on-primary"
              : "border-line text-ink-muted hover:bg-surface"
          }`}
        >
          Minimaal 1 opt-in
        </button>
        <div className="flex shrink-0 rounded-control border border-line p-0.5">
          {STANDEN.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onStand(s.id)}
              aria-pressed={s.id === stand}
              className={`rounded-control px-2.5 py-1 text-sm transition-colors duration-[var(--duur-snel)] ease-merk ${
                s.id === stand ? "bg-primary text-on-primary" : "text-ink-muted hover:bg-surface"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3 xl:grid-cols-5">
        {optins.map((optin) => {
          const { aantal, waarden } = standVanOptin(optin, stand);
          return (
            <OptinTegel
              key={optin.kolom}
              kolom={optin.kolom}
              aantal={aantal}
              noemer={contacten}
              aan={actief.includes(optin.kolom)}
              onKies={(aan: boolean) => onKies(optin.kolom, aan ? waarden : null)}
            />
          );
        })}
      </ul>
    </section>
  );
}

function OptinTegel({
  kolom,
  aantal,
  noemer,
  aan,
  onKies,
}: {
  kolom: string;
  aantal: number;
  noemer: number;
  aan: boolean;
  onKies: (aan: boolean) => void;
}) {
  const aandeel = noemer > 0 ? aantal / noemer : 0;
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
        <span className="label-theme block truncate text-label text-ink-faint" title={kolom}>
          {kolom}
        </span>
        <span className="mt-0.5 block font-sans-w7 text-cell font-semibold text-ink">
          {getal(aantal)}
        </span>
        <span className="mt-1.5 block">
          <ProgressBar percent={aandeel * 100} className="h-1 w-full" />
        </span>
        <span className="mt-1 block text-meta text-ink-faint">
          {Math.round(aandeel * 100)}% van alle contacten
        </span>
      </button>
    </li>
  );
}

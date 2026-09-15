"use client";

import { useEffect, useRef, useState } from "react";
import FilterSelect from "@/components/FilterSelect";
import DataOphalen from "@/components/kanalen/DataOphalen";
import Laadbalk from "@/components/kanalen/Laadbalk";
import { IconCalendarRange, IconClose, IconInfo, IconRefresh } from "@/components/icons";
import {
  eigenPeriode,
  kortDatum,
  type Periode,
  type PeriodeKeuze,
} from "@/lib/kanalen/gebruik";
import { beschikbareWaarden, filter, type Kubus, type Selectie } from "@/lib/kanalen/kubus";

/**
 * De filterbalk boven elke Kanalen-pagina.
 *
 * **Plakt bovenaan** (`sticky top-0`): bij een lange tabel wil je tijdens het scrollen
 * kunnen zien — en wijzigen — op welke selectie je kijkt, zonder eerst terug omhoog te
 * moeten. Dat is ook de reden dat het aantal regels hier staat en niet alleen boven de
 * tabel.
 *
 * Twee rijen, met een reden. Boven staat **waar je naar kijkt** (periode, versheid,
 * filters) en de acties; onder staat **hoe je ernaar kijkt** (vergelijken met de vorige
 * periode) plus de actieve filters als losse chips. Zonder
 * die chips zie je alleen "1 geselecteerd" in een dichtgeklapte dropdown, en dan kijk je
 * zonder het te merken naar een deel van de cijfers.
 *
 * De keuzelijsten tonen alleen waarden die in de huidige selectie nog voorkomen: heb je
 * op Instagram gefilterd, dan verdwijnen de campagnes die alleen op Facebook liepen uit
 * de campagnelijst. Een filter aanbieden dat nul rijen oplevert is een doodlopende weg.
 * Ze zijn hier allemaal **doorzoekbaar** (`zoekbaar` op `FilterSelect`), want een
 * campagnelijst uit een advertentieplatform loopt in de honderden — anders dan de vier
 * korte lijstjes boven de campagnetabel.
 */

export interface FilterDimensie {
  id: string;
  label: string;
}

type Props = {
  kubus: Kubus;
  selectie: Selectie;
  dimensies: FilterDimensie[];
  periodes: PeriodeKeuze[];
  periode: PeriodeKeuze;
  onPeriode: (periode: PeriodeKeuze) => void;
  onFilter: (dimensie: string, waarden: string[]) => void;
  onWis: () => void;
  aantalActief: number;
  aantalRijen: number;
  aantalTotaal: number;
  uitlegAan: boolean;
  onUitleg: () => void;
  bezig: boolean;
  onHerlaad: () => void;
  /** Wanneer de nachtelijke Windsor-sync voor het laatst slaagde. */
  laatsteSync: string | null;
  /** Draait er op dit moment al een sync? */
  syncLoopt: boolean;
  vergelijk: boolean;
  onVergelijk: () => void;
  vergelijkBezig: boolean;
  vorigeGrenzen: Periode;
};

export default function KanalenFilterBalk({
  kubus,
  selectie,
  dimensies,
  periodes,
  periode,
  onPeriode,
  onFilter,
  onWis,
  aantalActief,
  aantalRijen,
  aantalTotaal,
  uitlegAan,
  onUitleg,
  bezig,
  onHerlaad,
  laatsteSync,
  syncLoopt,
  vergelijk,
  onVergelijk,
  vergelijkBezig,
  vorigeGrenzen,
}: Props) {
  const chips = dimensies.flatMap((dim) =>
    (selectie[dim.id] ?? []).map((waarde) => ({ dim, waarde })),
  );

  return (
    <div className="sticky top-0 z-30 -mx-1 mb-5 px-1 pt-1">
      <div className="kaart-omlijst relative rounded-panel border border-line bg-card px-4 py-3 shadow-card">
        {/* Ook de vergelijking telt mee: die is een tweede ophaalactie, en zolang die
            loopt staan de verschilcijfers er nog niet. */}
        <Laadbalk actief={bezig || vergelijkBezig} />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div>
              <p className="font-sans-w7 text-sm font-semibold text-ink">
                {bezig ? "Laden…" : `${aantalRijen.toLocaleString("nl-NL")} regels`}
              </p>
              <p className="text-meta text-ink-faint">
                {aantalActief > 0 && aantalRijen !== aantalTotaal
                  ? "Gefilterde selectie"
                  : "Alles in deze periode"}
              </p>
            </div>

            <span aria-hidden="true" className="h-8 w-px bg-line" />

            <div className="flex items-center gap-1">
              <div className="flex rounded-control border border-line p-0.5">
                {periodes.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onPeriode(p)}
                    className={`whitespace-nowrap rounded-control px-2.5 py-1 text-sm transition-colors duration-[var(--duur-snel)] ease-merk ${
                      p.id === periode.id
                        ? "bg-primary text-on-primary"
                        : "text-ink-muted hover:bg-surface"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <EigenPeriode periode={periode} onKies={onPeriode} />
            </div>

            {/* Hoe vers zijn deze cijfers? Stond eerder alleen in de lege staat, dus zodra
                er íets in beeld was wist je niet meer of je naar vannacht of naar vorige
                week keek — en dat is precies het moment waarop je erop gaat vertrouwen. */}
            <Versheid laatsteSync={laatsteSync} totDatum={kubus.periode.tot} />
          </div>

          <div className="flex flex-wrap items-center divide-x divide-line">
            {dimensies.map((dim) => {
              // Wat is er nog te kiezen als de ándere filters al toegepast zijn? Het eigen
              // filter telt daarbij niet mee — anders kun je na één keuze geen tweede
              // waarde meer aanvinken.
              const zonderEigen: Selectie = { ...selectie, [dim.id]: [] };
              const opties = beschikbareWaarden(kubus, filter(kubus, zonderEigen), dim.id);
              return (
                <FilterSelect
                  key={dim.id}
                  label={dim.label}
                  options={opties}
                  selected={selectie[dim.id] ?? []}
                  onChange={(waarden) => onFilter(dim.id, waarden)}
                  zoekbaar
                />
              );
            })}

          </div>
        </div>

        {/* Onderste rij: hoe je kijkt (vergelijken, alle kanalen), wat er actief is, en de
            acties. De acties stonden eerst achter de filters, maar met negen filters op de
            advertentiepagina's brak die rij en belandden ze halverwege het scherm. */}
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 border-t border-line-soft pt-3">
          <Schakelaar
            aan={vergelijk}
            onKlik={onVergelijk}
            bezig={vergelijkBezig}
            titel={`Zet het verschil erbij met ${kortDatum(vorigeGrenzen.van)} – ${kortDatum(vorigeGrenzen.tot)}`}
          >
            Vergelijk met vorige periode
          </Schakelaar>

          {chips.length > 0 && (
            <>
              <span aria-hidden="true" className="mx-1 h-6 w-px bg-line" />
              {chips.map(({ dim, waarde }) => (
                <button
                  key={`${dim.id}:${waarde}`}
                  type="button"
                  onClick={() =>
                    onFilter(
                      dim.id,
                      (selectie[dim.id] ?? []).filter((v) => v !== waarde),
                    )
                  }
                  title={`${dim.label}: ${waarde} — klik om te verwijderen`}
                  className="flex max-w-xs items-center gap-1.5 rounded-control border border-line bg-surface-tint py-1 pl-2.5 pr-1.5 text-sm text-ink transition-colors duration-[var(--duur-snel)] hover:border-ink-faint"
                >
                  <span className="text-ink-faint">{dim.label}</span>
                  <span className="truncate">{waarde}</span>
                  <IconClose className="h-3 w-3 shrink-0 text-ink-faint" />
                </button>
              ))}
              <button
                type="button"
                onClick={onWis}
                className="rounded-control px-2 py-1 text-sm font-medium text-primary hover:bg-primary-light"
              >
                Wis alles
              </button>
            </>
          )}

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={onUitleg}
              aria-pressed={uitlegAan}
              className={`flex items-center gap-1.5 rounded-control px-2 py-1.5 text-sm font-medium transition-colors duration-[var(--duur-snel)] ${
                uitlegAan
                  ? "bg-primary-light text-primary"
                  : "text-ink-muted hover:bg-surface hover:text-ink"
              }`}
            >
              <IconInfo className="h-4 w-4" />
              Zo lees je dit
            </button>

            {/* Twee verschillende acties die makkelijk door elkaar lopen, dus allebei met
                hun eigen woord erbij: "Verversen" leest de database opnieuw (een seconde),
                "Data ophalen" haalt nieuwe cijfers bij Windsor (minuten). Een kaal pijltje
                naast een knop mét tekst leest als dezelfde handeling. */}
            <button
              type="button"
              onClick={onHerlaad}
              disabled={bezig}
              title="Leest de al opgehaalde cijfers opnieuw uit de database"
              className="flex items-center gap-1.5 rounded-control px-2 py-1.5 text-sm font-medium text-ink-muted transition-colors duration-[var(--duur-snel)] hover:bg-surface hover:text-ink disabled:opacity-50"
            >
              <IconRefresh className={`h-4 w-4 ${bezig ? "animate-spin" : ""}`} />
              Verversen
            </button>

            <DataOphalen onKlaar={onHerlaad} laatsteSync={laatsteSync} loopt={syncLoopt} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Eén aan/uit-knop in de onderste rij; dezelfde vorm als "Zo lees je dit". */
function Schakelaar({
  aan,
  onKlik,
  bezig = false,
  titel,
  children,
}: {
  aan: boolean;
  onKlik: () => void;
  bezig?: boolean;
  titel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onKlik}
      aria-pressed={aan}
      title={titel}
      className={`flex items-center gap-1.5 rounded-control border px-2.5 py-1 text-sm font-medium transition-colors duration-[var(--duur-snel)] ${
        aan
          ? "border-primary bg-primary-light text-primary"
          : "border-line text-ink-muted hover:bg-surface hover:text-ink"
      }`}
    >
      {bezig && <IconRefresh className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  );
}

/**
 * De eigen periode: twee datums in een klein paneel.
 *
 * Staat naast de vaste knoppen en niet in plaats ervan. Negen van de tien keer is "de
 * afgelopen maand" het antwoord en dan is één klik het juiste aantal handelingen; maar
 * "van de start van de campagne tot nu" bestond tot nu toe helemaal niet.
 */
function EigenPeriode({
  periode,
  onKies,
}: {
  periode: PeriodeKeuze;
  onKies: (periode: PeriodeKeuze) => void;
}) {
  const [open, setOpen] = useState(false);
  const [van, setVan] = useState(periode.van);
  const [tot, setTot] = useState(periode.tot);
  const ref = useRef<HTMLDivElement>(null);
  const eigen = periode.id === "eigen";

  useEffect(() => {
    setVan(periode.van);
    setTot(periode.tot);
  }, [periode.van, periode.tot]);

  useEffect(() => {
    function buiten(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function escape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", buiten);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", buiten);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  // De sync loopt 's nachts, dus verder dan gisteren is er niets te kiezen.
  const gisteren = new Date();
  gisteren.setUTCDate(gisteren.getUTCDate() - 1);
  const maximum = gisteren.toISOString().slice(0, 10);

  function toepassen() {
    if (!van || !tot) return;
    onKies(eigenPeriode(van, tot));
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title="Een eigen periode kiezen"
        className={`flex items-center gap-1.5 whitespace-nowrap rounded-control border px-2.5 py-1.5 text-sm transition-colors duration-[var(--duur-snel)] ${
          eigen
            ? "border-primary bg-primary-light font-medium text-primary"
            : "border-line text-ink-muted hover:bg-surface hover:text-ink"
        }`}
      >
        <IconCalendarRange className="h-4 w-4" />
        {eigen ? periode.label : "Eigen periode"}
      </button>

      {open && (
        <div className="absolute left-0 z-40 mt-1 w-72 rounded-card border border-line bg-card p-3 shadow-dropdown">
          <div className="flex flex-col gap-2">
            <label className="flex flex-col gap-1">
              <span className="label-theme text-label text-ink-faint">Van</span>
              <input
                id="kanalen-periode-van"
                type="date"
                value={van}
                max={tot || maximum}
                onChange={(e) => setVan(e.target.value)}
                className="rounded-control border border-line bg-card px-2 py-1.5 text-sm text-ink focus:border-primary focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="label-theme text-label text-ink-faint">Tot en met</span>
              <input
                id="kanalen-periode-tot"
                type="date"
                value={tot}
                min={van}
                max={maximum}
                onChange={(e) => setTot(e.target.value)}
                className="rounded-control border border-line bg-card px-2 py-1.5 text-sm text-ink focus:border-primary focus:outline-none"
              />
            </label>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-button px-3 py-1.5 text-sm text-ink-muted hover:bg-surface"
            >
              Annuleren
            </button>
            <button
              type="button"
              onClick={toepassen}
              disabled={!van || !tot}
              className="rounded-button bg-primary px-3 py-1.5 text-sm font-medium text-on-primary disabled:opacity-50"
            >
              Toepassen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * "Bijgewerkt … · data t/m …" — twee dingen die vaak verward worden en allebei nodig
 * zijn: wanneer de sync draaide, en tot welke dag er dus cijfers zijn. De periode loopt
 * bewust tot gisteren (zie `periodeGrenzen`), en dat hoort zichtbaar te zijn in plaats
 * van als een ingezakte laatste dag in de grafiek.
 */
function Versheid({ laatsteSync, totDatum }: { laatsteSync: string | null; totDatum: string }) {
  if (!laatsteSync && !totDatum) return null;

  const moment = laatsteSync ? new Date(laatsteSync) : null;
  const geldig = moment && !Number.isNaN(moment.getTime());
  const urenGeleden = geldig ? (Date.now() - moment.getTime()) / 3600000 : null;
  // Meer dan anderhalve dag stil betekent dat er een nacht is overgeslagen; dat is geen
  // detail maar een reden om "Data ophalen" te gebruiken.
  const verouderd = urenGeleden !== null && urenGeleden > 36;

  return (
    <div>
      <p className={`text-sm ${verouderd ? "font-sans-w7 font-semibold text-negative" : "text-ink-muted"}`}>
        {geldig
          ? `Bijgewerkt ${moment.toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
          : "Nog niet gesynchroniseerd"}
      </p>
      <p className="text-meta text-ink-faint">
        {totDatum
          ? `data t/m ${new Date(`${totDatum}T00:00:00Z`).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}`
          : "—"}
      </p>
    </div>
  );
}

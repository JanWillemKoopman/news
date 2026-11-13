"use client";

import { useMemo, useState } from "react";
import FilterSelect from "@/components/FilterSelect";
import { IconChevronDown, IconClose, IconRefresh } from "@/components/icons";
import { groepeerVelden, type Filter, type Veld } from "@/lib/selligent/stand";
import { toonWaarde, weergaveNamen } from "@/lib/selligent/weergave";

/**
 * De filterbalk van het tabblad Selligent: één control per kolom van de export.
 *
 * ## Hij staat bovenaan en dicht
 *
 * Dicht, omdat vijfentwintig controls uitgeklapt het halve scherm vullen en de cijfers
 * waar je voor komt dan onder de vouw duwen. Bovenaan, omdat filteren het eerste is wat
 * je doet en een filterbalk onder de cijfers je laat scrollen voor elke aanpassing.
 * Dichtgeklapt blijft staan wát er aanstaat — de chips met de actieve filters — zodat de
 * balk ook gesloten vertelt waar je naar kijkt.
 *
 * ## Waarom het een raster is, en in groepen
 *
 * De gewone filterbalk van het dashboard (`FilterBar`) heeft er vier of vijf. Hier zijn
 * het er vijfentwintig, en dat is geen tekortkoming maar de opdracht: elke kolom van de
 * export is te filteren. Vijfentwintig controls op één rij wordt een horizontale
 * scrollbalk, en vijfentwintig op één hoop in een raster is een muur waarin je het filter
 * dat je zoekt niet terugvindt.
 *
 * Ze staan daarom in een raster van vier, onder kopjes die uit de kolomnamen zelf komen:
 * de losse velden eerst, dan `PREFERENCES`, dan `VDUVEHICLES` (zie `groepeerVelden` in
 * `lib/selligent/stand.ts`). Daarmee is de balk een inhoudsopgave in plaats van een lijst.
 * Binnen een groep blijft de volgorde van het bestand staan, dezelfde als in het
 * kolomoverzicht onderaan de pagina, zodat de twee naast elkaar te leggen zijn.
 *
 * Merk staat hier niet tussen: dat filter heeft zijn eigen balk boven de pagina
 * (`SelligentMerkBalk`). Twee controls op één filterwaarde zouden elkaar niet
 * tegenspreken — het is dezelfde waarde — maar het is wel twee plekken om te kijken.
 *
 * ## Drie soorten control, en waarom niet één
 *
 * De soort komt van de server mee (`Veld.soort`) en volgt uit de data, niet uit een lijst
 * die iemand heeft bijgehouden:
 *
 * - **lijst** — aanvinken wat je wil zien. Vanaf dertien opties met een zoekveld erboven
 *   (`FilterSelect`'s `zoekbaar`), want modellen zijn er 557.
 * - **datum** — van/tot, met de grenzen van de kolom als `min`/`max` zodat je niet buiten
 *   de data kunt kiezen.
 * - **tekst** — een zoekveld, voor een kolom met te veel verschillende waarden om aan te
 *   vinken. Dat zijn in de praktijk de identificerende velden (mailadres, kenteken, de
 *   id's), en dat is precies de reden dat er nooit een lijst met zulke waarden naar de
 *   browser gaat: honderdduizend opties is geen keuzelijst.
 *
 * Boven het raster staan de actieve filters als chips. Bij zesentwintig controls is "wat
 * staat er eigenlijk aan" een echte vraag, en het antwoord hoort niet te zijn dat je alle
 * zesentwintig langsloopt.
 */

type Props = {
  velden: Veld[];
  filters: Record<string, Filter>;
  onFilter: (kolom: string, filter: Filter | null) => void;
  onWisAlles: () => void;
  /** Hoe vers het bestand is, in één regel; `null` zolang dat nog niet bekend is. */
  bijgewerkt: string | null;
  onVerversen: () => void;
  verversBezig: boolean;
};

/**
 * Een leesbare kop per groep, met het voorvoegsel erbij.
 *
 * `PREFERENCES` en `VDUVEHICLES` zijn de namen die de export zelf gebruikt, en als kop
 * boven een blok filters lezen ze als geschreeuw. Een Nederlandse naam ervóór maakt in
 * één oogopslag duidelijk waar een blok over gaat; het voorvoegsel blijft er grijs
 * achter staan, zodat de koppeling met de kolomnamen eronder — en met het
 * kolomoverzicht onderaan de pagina — zichtbaar blijft.
 *
 * Een voorvoegsel dat hier niet in staat, draagt gewoon zichzelf als kop. Deze lijst is
 * dus een verfraaiing en nooit een voorwaarde: een nieuw voorvoegsel in de export levert
 * vanzelf een blok op, alleen zonder Nederlandse naam.
 */
const GROEP_NAMEN: Record<string, string> = {
  PREFERENCES: "Voorkeuren",
  VDUVEHICLES: "Voertuig",
};

/** De kop boven het blok met de kolommen die geen voorvoegsel delen. */
const LOSSE_GROEP = "Algemeen";

/** Hoe een actief filter in één regel leest, voor de chip erboven. */
function chipTekst(veld: Veld, filter: Filter): string | null {
  if (filter.waarden && filter.waarden.length > 0) {
    return filter.waarden.length === 1
      ? `${veld.naam}: ${toonWaarde(filter.waarden[0])}`
      : `${veld.naam}: ${filter.waarden.length} waarden`;
  }
  if (filter.bevat) return `${veld.naam} bevat "${filter.bevat}"`;
  if (filter.van && filter.tot) return `${veld.naam}: ${filter.van} t/m ${filter.tot}`;
  if (filter.van) return `${veld.naam}: vanaf ${filter.van}`;
  if (filter.tot) return `${veld.naam}: tot en met ${filter.tot}`;
  return null;
}

export default function SelligentFilters({
  velden,
  filters,
  onFilter,
  onWisAlles,
  bijgewerkt,
  onVerversen,
  verversBezig,
}: Props) {
  const [open, setOpen] = useState(false);
  const groepen = useMemo(() => groepeerVelden(velden), [velden]);
  const chips = velden
    .map((veld) => {
      const filter = filters[veld.naam];
      if (!filter) return null;
      const tekst = chipTekst(veld, filter);
      return tekst ? { veld, tekst } : null;
    })
    .filter((c): c is { veld: Veld; tekst: string } => c !== null);

  return (
    <section className="rounded-panel border border-line bg-card px-5 py-3 shadow-subtle">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-2 rounded-control px-2 py-1.5 text-left transition-colors duration-[var(--duur-snel)] hover:bg-surface"
        >
          <IconChevronDown
            className={`h-4 w-4 shrink-0 text-ink-muted transition-transform duration-[var(--duur-snel)] ease-merk ${
              open ? "rotate-180" : ""
            }`}
          />
          <span className="font-sans-w7 text-cell font-semibold text-ink">Filters</span>
          <span className="text-meta text-ink-faint">
            {chips.length === 0
              ? `${velden.length} kolommen`
              : `${chips.length} actief van ${velden.length}`}
          </span>
        </button>

        <div className="flex items-center gap-2">
          {bijgewerkt && <span className="text-meta text-ink-faint">{bijgewerkt}</span>}
          {chips.length > 0 && (
            <button
              type="button"
              onClick={onWisAlles}
              className="rounded-control px-2 py-1 text-sm font-medium text-ink-muted transition-colors duration-[var(--duur-snel)] hover:bg-surface hover:text-ink"
            >
              Alles wissen
            </button>
          )}
          <button
            type="button"
            onClick={onVerversen}
            disabled={verversBezig}
            className="flex shrink-0 items-center gap-1.5 rounded-control px-2 py-1.5 text-sm font-medium text-ink-muted transition-colors duration-[var(--duur-snel)] hover:bg-surface hover:text-ink disabled:cursor-wait disabled:opacity-60"
          >
            <IconRefresh className={`h-4 w-4 ${verversBezig ? "animate-spin" : ""}`} />
            {verversBezig ? "Ophalen…" : "Opnieuw ophalen"}
          </button>
        </div>
      </div>

      {/* De chips blijven staan als de balk dicht is: ook gesloten hoort hij te vertellen
          waar je naar kijkt. */}
      {chips.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {chips.map(({ veld, tekst }) => (
            <li key={veld.naam}>
              <button
                type="button"
                onClick={() => onFilter(veld.naam, null)}
                title="Dit filter wissen"
                className="flex items-center gap-1 rounded-control bg-primary-light px-2 py-0.5 text-meta text-primary transition-opacity duration-[var(--duur-snel)] hover:opacity-80"
              >
                {tekst}
                <IconClose className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <>
          <p className="mt-3 border-t border-line pt-3 text-meta text-ink-faint">
            Eén filter per kolom. Meerdere waarden binnen één filter is &ldquo;of&rdquo;,
            meerdere filters samen is &ldquo;en&rdquo;.
          </p>
          {/* Elk blok met een eigen omlijning en een streep onder de kop: bij
              vijfentwintig controls is "waar hoort dit filter bij" de eerste vraag, en
              die hoort het scherm te beantwoorden voordat iemand de kolomnamen gaat
              lezen. */}
          <div className="mt-3 flex flex-col gap-3">
            {groepen.map((groep) => {
              const actief = groep.velden.filter((v) => filters[v.naam]).length;
              const naam = groep.voorvoegsel
                ? (GROEP_NAMEN[groep.voorvoegsel] ?? groep.voorvoegsel)
                : LOSSE_GROEP;
              const toonVoorvoegsel =
                groep.voorvoegsel && GROEP_NAMEN[groep.voorvoegsel] ? groep.voorvoegsel : null;

              return (
                <section
                  key={groep.voorvoegsel ?? "los"}
                  className="rounded-card border border-line bg-surface-tint px-4 py-3"
                >
                  <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-line pb-2">
                    <h3 className="flex items-baseline gap-2">
                      <span className="font-sans-w7 text-sm font-semibold text-ink">
                        {naam}
                      </span>
                      {toonVoorvoegsel && (
                        <code className="text-meta text-ink-faint">{toonVoorvoegsel}</code>
                      )}
                    </h3>
                    <span className="text-meta text-ink-faint">
                      {groep.velden.length} {groep.velden.length === 1 ? "kolom" : "kolommen"}
                      {actief > 0 && ` · ${actief} actief`}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 items-start gap-x-2 gap-y-1 xl:grid-cols-4">
                    {groep.velden.map((veld) => (
                      <VeldControl
                        key={veld.naam}
                        veld={veld}
                        filter={filters[veld.naam]}
                        onFilter={(f) => onFilter(veld.naam, f)}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

function VeldControl({
  veld,
  filter,
  onFilter,
}: {
  veld: Veld;
  filter: Filter | undefined;
  onFilter: (filter: Filter | null) => void;
}) {
  if (veld.soort === "lijst") {
    return (
      <div className="min-w-0">
        <FilterSelect
          label={veld.naam}
          options={veld.opties ?? []}
          selected={filter?.waarden ?? []}
          zoekbaar={veld.zoekbaar}
          labels={weergaveNamen(veld.opties ?? [])}
          onChange={(waarden) =>
            onFilter(waarden.length > 0 ? { kolom: veld.naam, waarden } : null)
          }
        />
      </div>
    );
  }

  if (veld.soort === "datum") {
    return (
      // Dezelfde binnenmarge als de knop van FilterSelect (px-3 py-1.5), zodat de labels
      // van alle drie de soorten in het raster op één lijn staan.
      <div className="min-w-0 px-3 py-1.5">
        <p className="label-theme mb-0.5 truncate text-label text-ink-faint" title={veld.naam}>
          {veld.naam}
        </p>
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            aria-label={`${veld.naam} vanaf`}
            value={filter?.van ?? ""}
            min={veld.bereik?.van}
            max={veld.bereik?.tot}
            onChange={(e) => {
              const van = e.target.value;
              const tot = filter?.tot;
              onFilter(van || tot ? { kolom: veld.naam, van: van || undefined, tot } : null);
            }}
            className="min-w-0 flex-1 rounded-control border border-line bg-card px-2 py-1 text-sm text-ink"
          />
          <span className="text-meta text-ink-faint">t/m</span>
          <input
            type="date"
            aria-label={`${veld.naam} tot en met`}
            value={filter?.tot ?? ""}
            min={veld.bereik?.van}
            max={veld.bereik?.tot}
            onChange={(e) => {
              const tot = e.target.value;
              const van = filter?.van;
              onFilter(van || tot ? { kolom: veld.naam, van, tot: tot || undefined } : null);
            }}
            className="min-w-0 flex-1 rounded-control border border-line bg-card px-2 py-1 text-sm text-ink"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 px-3 py-1.5">
      <p className="label-theme mb-0.5 truncate text-label text-ink-faint" title={veld.naam}>
        {veld.naam}
      </p>
      <input
        type="search"
        value={filter?.bevat ?? ""}
        placeholder={`Zoeken in ${(veld.verschillend ?? 0).toLocaleString("nl-NL")} waarden`}
        onChange={(e) => {
          const bevat = e.target.value;
          onFilter(bevat.trim() ? { kolom: veld.naam, bevat } : null);
        }}
        className="w-full rounded-control border border-line bg-card px-2 py-1 text-sm text-ink placeholder:text-ink-faint"
      />
    </div>
  );
}

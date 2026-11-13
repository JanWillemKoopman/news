"use client";

import FilterSelect from "@/components/FilterSelect";
import { IconClose } from "@/components/icons";
import type { Filter, Veld } from "@/lib/selligent/stand";

/**
 * De filterbalk van het tabblad Selligent: één control per kolom van de export.
 *
 * ## Waarom het een raster is en geen rij
 *
 * De gewone filterbalk van het dashboard (`FilterBar`) heeft er vier of vijf. Hier zijn
 * het er zesentwintig, en dat is geen tekortkoming maar de opdracht: de export heeft
 * zesentwintig kolommen en je moet op elke kolom kunnen filteren. Zesentwintig controls
 * op één rij wordt een horizontale scrollbalk waarin je het filter dat je zoekt niet meer
 * vindt, dus ze staan in een raster van vier, in de volgorde van het bestand — dezelfde
 * volgorde als het kolomoverzicht onderaan de pagina, zodat de twee naast elkaar te
 * leggen zijn.
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
};

/** Hoe een actief filter in één regel leest, voor de chip erboven. */
function chipTekst(veld: Veld, filter: Filter): string | null {
  if (filter.waarden && filter.waarden.length > 0) {
    return filter.waarden.length === 1
      ? `${veld.naam}: ${filter.waarden[0]}`
      : `${veld.naam}: ${filter.waarden.length} waarden`;
  }
  if (filter.bevat) return `${veld.naam} bevat "${filter.bevat}"`;
  if (filter.van && filter.tot) return `${veld.naam}: ${filter.van} t/m ${filter.tot}`;
  if (filter.van) return `${veld.naam}: vanaf ${filter.van}`;
  if (filter.tot) return `${veld.naam}: tot en met ${filter.tot}`;
  return null;
}

export default function SelligentFilters({ velden, filters, onFilter, onWisAlles }: Props) {
  const chips = velden
    .map((veld) => {
      const filter = filters[veld.naam];
      if (!filter) return null;
      const tekst = chipTekst(veld, filter);
      return tekst ? { veld, tekst } : null;
    })
    .filter((c): c is { veld: Veld; tekst: string } => c !== null);

  return (
    <section className="rounded-panel border border-line bg-card px-5 py-4 shadow-subtle">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="font-sans-w7 text-cell font-semibold text-ink">Filters</h2>
          <p className="mt-0.5 text-meta text-ink-faint">
            Eén filter per kolom, {velden.length} in totaal. Meerdere waarden binnen één
            filter is &ldquo;of&rdquo;, meerdere filters samen is &ldquo;en&rdquo;.
          </p>
        </div>
        {chips.length > 0 && (
          <button
            type="button"
            onClick={onWisAlles}
            className="rounded-control px-2 py-1 text-sm font-medium text-ink-muted transition-colors duration-[var(--duur-snel)] hover:bg-surface hover:text-ink"
          >
            Alles wissen
          </button>
        )}
      </div>

      {chips.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1.5">
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

      <div className="mt-3 grid grid-cols-2 items-start gap-x-2 gap-y-1 xl:grid-cols-4">
        {velden.map((veld) => (
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

"use client";

import { Fragment, useState, type ReactNode } from "react";
import { formatteer } from "@/components/chat/chartTheme";
import { IconChevronDown, IconDownload } from "@/components/icons";
import { downloadCsv } from "@/lib/csv";
import type { Groep, Telling } from "@/lib/leadsSyntec/samenvatting";

/**
 * Eén tabel van het tabblad Leads Syntec: per rij het totaal, het aandeel, en dat totaal
 * uitgesplitst naar online en offline — op verzoek "overal het totaal, uitgesplitst".
 *
 * - **De totaalregel telt álle rijen**, ook die achter "Toon alle" en de vastgezette
 *   ("Onbekend" onderaan). Het totaal komt van buiten (`totaal`), niet uit de zichtbare
 *   rijen: een totaal dat verandert als je een tabel uitklapt, is geen totaal.
 * - **"Onbekend" staat vast onderaan** (`vastgezet`) en niet tussen de rest: hij zou de
 *   echte merken of modellen wegduwen, maar moet zichtbaar blijven, anders telt de tabel
 *   niet op.
 * - **Een rij kan uitklappen** (`uitklap`): bij "Overige merken" staan daaronder de merken
 *   zelf. De onderliggende regels tellen niet nog een keer mee.
 * - **CSV** rechtsboven zet precies deze tabel (alle rijen) in een bestand voor Excel.
 */

const STANDAARD_RIJEN = 10;

export interface ExtraKolom {
  kop: string;
  waarde: (g: Groep) => ReactNode;
  /** Wat er in de CSV komt. */
  tekst: (g: Groep) => string;
}

type Props = {
  titel: string;
  toelichting?: ReactNode;
  /** De kop van de eerste kolom: "Merk", "Model", … */
  labelKop: string;
  groepen: Groep[];
  vastgezet?: Groep[];
  totaal: Telling;
  /** Leesbare naam voor de sleutel. */
  labelVan?: (g: Groep) => ReactNode;
  /** Platte tekst voor de CSV en de tooltip. */
  tekstVan?: (g: Groep) => string;
  /** Een kleine regel onder de naam. */
  metaVan?: (g: Groep) => string | null;
  /** Tekst als je met de muis op de naam staat (bv. de schrijfwijzen die zijn samengevoegd). */
  tooltipVan?: (g: Groep) => string | null;
  /** Een kolom tussen de naam en de cijfers (bv. het merk bij een model). */
  extraKolom?: ExtraKolom;
  /** Onderliggende regels van een rij, uit te klappen. */
  uitklap?: (g: Groep) => Groep[] | null;
  maxRijen?: number;
  /** Bestandsnaam van de CSV, zonder extensie. */
  csvNaam: string;
};

const CEL = "border-b border-line-soft px-4 py-2.5 align-top";
const VOET = "border-t border-line bg-surface-tint px-4 py-2.5 align-top";

function Getal({ nu, sterk = false }: { nu: number; sterk?: boolean }) {
  return <span className={sterk ? "font-medium text-ink" : "text-ink"}>{formatteer(nu, "aantal")}</span>;
}

function pctOnline(t: Telling): string {
  return t.totaal > 0 ? formatteer((t.online / t.totaal) * 100, "procent") : "—";
}

export default function SyntecTabel({
  titel,
  toelichting,
  labelKop,
  groepen,
  vastgezet = [],
  totaal,
  labelVan,
  tekstVan,
  metaVan,
  tooltipVan,
  extraKolom,
  uitklap,
  maxRijen = STANDAARD_RIJEN,
  csvNaam,
}: Props) {
  const [alles, setAlles] = useState(false);
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const zichtbaar = alles ? groepen : groepen.slice(0, maxRijen);
  const verborgen = groepen.length - zichtbaar.length;
  const leeg = groepen.length === 0 && vastgezet.length === 0;
  const tekst = (g: Groep) => tekstVan?.(g) ?? g.sleutel;

  const koppen = [
    labelKop,
    ...(extraKolom ? [extraKolom.kop] : []),
    "Totaal",
    "Aandeel",
    "Online",
    "Offline",
    "% online",
  ];

  function exporteer() {
    const kolommen = [
      labelKop,
      ...(extraKolom ? [extraKolom.kop] : []),
      "Totaal",
      "Online",
      "Offline",
    ];
    const rij = (g: Groep, label: string) => ({
      [labelKop]: label,
      ...(extraKolom ? { [extraKolom.kop]: extraKolom.tekst(g) } : {}),
      Totaal: g.totaal,
      Online: g.online,
      Offline: g.offline,
    });
    const rijen = [...groepen, ...vastgezet].map((g) => rij(g, tekst(g)));
    rijen.push({
      [labelKop]: "Totaal",
      ...(extraKolom ? { [extraKolom.kop]: "" } : {}),
      Totaal: totaal.totaal,
      Online: totaal.online,
      Offline: totaal.offline,
    });
    downloadCsv(kolommen, rijen, csvNaam);
  }

  const rij = (g: Groep, ingesprongen = false): ReactNode => {
    const onderliggend = !ingesprongen ? uitklap?.(g) ?? null : null;
    const isOpen = open.has(g.sleutel);
    const meta = metaVan?.(g) ?? null;
    return (
      <Fragment key={`${ingesprongen ? "sub:" : ""}${g.sleutel}`}>
        <tr>
          <td className={`${CEL} ${ingesprongen ? "pl-10 text-ink-muted" : "text-ink"}`}>
            <span className="flex items-start gap-1.5">
              {onderliggend && onderliggend.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setOpen((o) => {
                      const nieuw = new Set(o);
                      if (nieuw.has(g.sleutel)) nieuw.delete(g.sleutel);
                      else nieuw.add(g.sleutel);
                      return nieuw;
                    })
                  }
                  aria-expanded={isOpen}
                  aria-label={isOpen ? "Inklappen" : "Uitklappen"}
                  className="mt-0.5 -ml-1 rounded-control p-0.5 text-ink-faint hover:bg-surface hover:text-ink"
                >
                  <IconChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-[var(--duur-snel)] ${isOpen ? "" : "-rotate-90"}`}
                  />
                </button>
              )}
              <span className="min-w-0">
                <span className="block max-w-72 truncate" title={tooltipVan?.(g) ?? tekst(g)}>
                  {labelVan?.(g) ?? g.sleutel}
                </span>
                {meta && (
                  <span className="block max-w-72 truncate text-meta text-ink-faint" title={meta}>
                    {meta}
                  </span>
                )}
              </span>
            </span>
          </td>
          {extraKolom && <td className={`${CEL} text-ink-muted`}>{extraKolom.waarde(g)}</td>}
          <td className={`${CEL} text-right`}>
            <Getal nu={g.totaal} sterk={!ingesprongen} />
          </td>
          <td className={`${CEL} text-right text-ink-muted`}>
            {totaal.totaal > 0 ? formatteer((g.totaal / totaal.totaal) * 100, "procent") : "—"}
          </td>
          <td className={`${CEL} text-right`}>
            <Getal nu={g.online} />
          </td>
          <td className={`${CEL} text-right`}>
            <Getal nu={g.offline} />
          </td>
          <td className={`${CEL} text-right text-ink-muted`}>{pctOnline(g)}</td>
        </tr>
        {isOpen && onderliggend?.map((o) => rij(o, true))}
      </Fragment>
    );
  };

  return (
    <section className="kaart-omlijst rounded-panel border border-line bg-card shadow-subtle">
      <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="font-sans-w7 text-cell font-semibold text-ink">{titel}</h2>
          {toelichting && <p className="mt-0.5 text-meta text-ink-muted">{toelichting}</p>}
        </div>
        {!leeg && (
          <button
            type="button"
            onClick={exporteer}
            title="Deze tabel als CSV downloaden (voor Excel)"
            className="flex shrink-0 items-center gap-1 rounded-control px-2 py-1 text-meta text-ink-muted hover:bg-surface hover:text-ink"
          >
            <IconDownload className="h-3.5 w-3.5" />
            CSV
          </button>
        )}
      </header>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {koppen.map((kop, i) => (
                <th
                  key={kop}
                  className={`whitespace-nowrap border-b border-line bg-surface-tint px-4 py-2.5 ${
                    i === 0 || (extraKolom && i === 1) ? "text-left" : "text-right"
                  }`}
                >
                  <span className="label-theme text-label text-ink-faint">{kop}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {leeg ? (
              <tr>
                <td colSpan={koppen.length} className="px-4 py-8 text-center text-ink-muted">
                  Geen leads in deze selectie.
                </td>
              </tr>
            ) : (
              <>
                {zichtbaar.map((g) => rij(g))}
                {vastgezet.map((g) => rij(g))}
              </>
            )}
          </tbody>
          {!leeg && (
            <tfoot>
              <tr>
                <td className={`${VOET} font-semibold text-ink`}>Totaal</td>
                {extraKolom && <td className={VOET} />}
                <td className={`${VOET} text-right font-semibold`}>
                  <Getal nu={totaal.totaal} sterk />
                </td>
                <td className={`${VOET} text-right text-ink-muted`}>
                  {totaal.totaal > 0 ? formatteer(100, "procent") : "—"}
                </td>
                <td className={`${VOET} text-right font-semibold`}>
                  <Getal nu={totaal.online} />
                </td>
                <td className={`${VOET} text-right font-semibold`}>
                  <Getal nu={totaal.offline} />
                </td>
                <td className={`${VOET} text-right text-ink-muted`}>{pctOnline(totaal)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {groepen.length > maxRijen && (
        <button
          type="button"
          onClick={() => setAlles((a) => !a)}
          className="w-full rounded-b-panel border-t border-line px-5 py-2.5 text-left text-sm font-medium text-primary hover:bg-surface"
        >
          {alles ? "Toon minder" : `Toon alle ${groepen.length + vastgezet.length} (nog ${verborgen})`}
        </button>
      )}
    </section>
  );
}

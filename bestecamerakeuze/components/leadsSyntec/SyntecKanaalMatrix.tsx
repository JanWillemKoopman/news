"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
import { formatteer } from "@/components/chat/chartTheme";
import { IconDownload } from "@/components/icons";
import { downloadCsv } from "@/lib/csv";
import { KANAALGROEP_VOLGORDE, ONLINE } from "@/lib/leadsSyntec/indeling";
import { groepeer, type Groep, type SyntecRegel } from "@/lib/leadsSyntec/samenvatting";

/**
 * Kanalen × merk: per kanaal hoeveel leads er binnenkwamen, in totaal en per merk.
 *
 * De rijen staan in twee blokken, **Online** en **Offline**, elk met een eigen
 * subtotaal; binnen Offline nog eens per kanaalgroep (Showroom, Acquisitie, Mail,
 * Telefoon). Zo staat de splitsing online/offline in de tabel zelf en niet in een extra
 * kolom — de kolommen zijn voor de merken.
 *
 * Een merkkolom verschijnt alleen als er in de selectie leads voor dat merk zijn: met het
 * filter Merk op Audi staat er geen rij nullen voor de andere merken.
 */

const RIJEN_PER_GROEP = 8;

const MERK_KOP: Record<string, string> = {
  Volkswagen: "Volkswagen",
  "Volkswagen Bedrijfswagens": "VW Bedrijfsw.",
  "Overige merken": "Overig",
};

type Props = {
  regels: SyntecRegel[];
  /** De merkkolommen in vaste volgorde. */
  merken: string[];
  toelichting?: ReactNode;
};

interface Blok {
  sleutel: string;
  label: string;
  /** Subtotaal van het blok. */
  totaal: Groep;
  /** Kanaalgroepen binnen het blok (Offline), of één groep zonder kop (Online). */
  groepen: { naam: string | null; totaal: Groep; kanalen: Groep[] }[];
}

const CEL = "border-b border-line-soft px-3 py-2 text-right";

export default function SyntecKanaalMatrix({ regels, merken, toelichting }: Props) {
  const [open, setOpen] = useState<Set<string>>(() => new Set());

  const { blokken, totaal, kolommen } = useMemo(() => {
    const alles = groepeer(regels, () => "Totaal")[0];
    const kolommen = merken.filter((m) => (alles?.perMerk[m] ?? 0) > 0);
    const volgorde = (groep: string) => {
      const i = KANAALGROEP_VOLGORDE.indexOf(groep);
      return i === -1 ? KANAALGROEP_VOLGORDE.length : i;
    };
    const maakBlok = (sleutel: "online" | "offline", label: string): Blok | null => {
      const eigen = regels.filter((r) => r.herkomst === sleutel);
      const subtotaal = groepeer(eigen, () => label)[0];
      if (!subtotaal) return null;
      const perGroep = groepeer(eigen, (r) => r.kanaalgroep).sort(
        (a, b) => volgorde(a.sleutel) - volgorde(b.sleutel) || b.totaal - a.totaal,
      );
      return {
        sleutel,
        label,
        totaal: subtotaal,
        groepen: perGroep.map((g) => ({
          naam: sleutel === "online" && g.sleutel === ONLINE ? null : g.sleutel,
          totaal: g,
          kanalen: groepeer(
            eigen.filter((r) => r.kanaalgroep === g.sleutel),
            (r) => r.kanaal,
          ),
        })),
      };
    };
    return {
      blokken: [maakBlok("online", ONLINE), maakBlok("offline", "Offline")].filter(
        (b): b is Blok => b !== null,
      ),
      totaal: alles ?? null,
      kolommen,
    };
  }, [regels, merken]);

  function exporteer() {
    const koppen = ["Herkomst", "Kanaalgroep", "Kanaal", "Totaal", ...kolommen];
    const rijen: Record<string, unknown>[] = [];
    for (const b of blokken) {
      for (const g of b.groepen) {
        for (const k of g.kanalen) {
          rijen.push({
            Herkomst: b.label,
            Kanaalgroep: g.totaal.sleutel,
            Kanaal: k.sleutel,
            Totaal: k.totaal,
            ...Object.fromEntries(kolommen.map((m) => [m, k.perMerk[m] ?? 0])),
          });
        }
      }
    }
    if (totaal) {
      rijen.push({
        Herkomst: "Totaal",
        Kanaalgroep: "",
        Kanaal: "",
        Totaal: totaal.totaal,
        ...Object.fromEntries(kolommen.map((m) => [m, totaal.perMerk[m] ?? 0])),
      });
    }
    downloadCsv(koppen, rijen, "leads-syntec-kanalen-per-merk");
  }

  const cijfers = (g: Groep, stijl: string) => (
    <>
      <td className={`${CEL} ${stijl}`}>{formatteer(g.totaal, "aantal")}</td>
      {kolommen.map((m) => (
        <td key={m} className={`${CEL} ${stijl}`}>
          {(g.perMerk[m] ?? 0) > 0 ? (
            formatteer(g.perMerk[m], "aantal")
          ) : (
            <span className="text-ink-faint">·</span>
          )}
        </td>
      ))}
    </>
  );

  if (!totaal) {
    return (
      <section className="kaart-omlijst rounded-panel border border-line bg-card px-5 py-6 shadow-subtle">
        <p className="text-sm text-ink-muted">Geen leads in deze selectie.</p>
      </section>
    );
  }

  return (
    <section className="kaart-omlijst rounded-panel border border-line bg-card shadow-subtle">
      <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="font-sans-w7 text-cell font-semibold text-ink">Kanalen per merk</h2>
          {toelichting && <p className="mt-0.5 text-meta text-ink-muted">{toelichting}</p>}
        </div>
        <button
          type="button"
          onClick={exporteer}
          title="Deze tabel als CSV downloaden (voor Excel)"
          className="flex shrink-0 items-center gap-1 rounded-control px-2 py-1 text-meta text-ink-muted hover:bg-surface hover:text-ink"
        >
          <IconDownload className="h-3.5 w-3.5" />
          CSV
        </button>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 whitespace-nowrap border-b border-line bg-surface-tint px-4 py-2.5 text-left">
                <span className="label-theme text-label text-ink-faint">Kanaal</span>
              </th>
              <th className="whitespace-nowrap border-b border-line bg-surface-tint px-3 py-2.5 text-right">
                <span className="label-theme text-label text-ink-faint">Totaal</span>
              </th>
              {kolommen.map((m) => (
                <th
                  key={m}
                  className="whitespace-nowrap border-b border-line bg-surface-tint px-3 py-2.5 text-right"
                  title={m}
                >
                  <span className="label-theme text-label text-ink-faint">{MERK_KOP[m] ?? m}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {blokken.map((b) => (
              <Fragment key={b.sleutel}>
                <tr>
                  <td className="sticky left-0 z-10 border-b border-line bg-surface px-4 py-2.5 font-semibold text-ink">
                    {b.label}
                    <span className="ml-2 font-normal text-meta text-ink-faint">
                      {formatteer((b.totaal.totaal / totaal.totaal) * 100, "procent")}
                    </span>
                  </td>
                  {cijfers(b.totaal, "bg-surface font-semibold text-ink")}
                </tr>
                {b.groepen.map((g) => {
                  const sleutel = `${b.sleutel}:${g.totaal.sleutel}`;
                  const alles = open.has(sleutel);
                  const zichtbaar = alles ? g.kanalen : g.kanalen.slice(0, RIJEN_PER_GROEP);
                  const verborgen = g.kanalen.length - zichtbaar.length;
                  return (
                    <Fragment key={sleutel}>
                      {g.naam !== null && (
                        <tr>
                          <td className="sticky left-0 z-10 border-b border-line-soft bg-card py-2 pl-7 pr-4 font-medium text-ink">
                            {g.naam}
                          </td>
                          {cijfers(g.totaal, "font-medium text-ink")}
                        </tr>
                      )}
                      {zichtbaar.map((k) => (
                        <tr key={k.sleutel}>
                          <td
                            className={`sticky left-0 z-10 border-b border-line-soft bg-card py-2 pr-4 text-ink-muted ${
                              g.naam !== null ? "pl-12" : "pl-7"
                            }`}
                          >
                            <span className="block max-w-72 truncate" title={k.sleutel}>
                              {k.sleutel}
                            </span>
                          </td>
                          {cijfers(k, "text-ink")}
                        </tr>
                      ))}
                      {g.kanalen.length > RIJEN_PER_GROEP && (
                        <tr>
                          <td
                            colSpan={kolommen.length + 2}
                            className={`border-b border-line-soft py-1.5 ${g.naam !== null ? "pl-12" : "pl-7"}`}
                          >
                            <button
                              type="button"
                              onClick={() =>
                                setOpen((o) => {
                                  const nieuw = new Set(o);
                                  if (nieuw.has(sleutel)) nieuw.delete(sleutel);
                                  else nieuw.add(sleutel);
                                  return nieuw;
                                })
                              }
                              className="rounded-control px-1.5 py-0.5 text-meta font-medium text-primary hover:bg-surface"
                            >
                              {alles ? "Toon minder" : `Toon alle ${g.kanalen.length} kanalen (nog ${verborgen})`}
                            </button>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="sticky left-0 z-10 border-t border-line bg-surface-tint px-4 py-2.5 font-semibold text-ink">
                Totaal
              </td>
              <td className="border-t border-line bg-surface-tint px-3 py-2.5 text-right font-semibold text-ink">
                {formatteer(totaal.totaal, "aantal")}
              </td>
              {kolommen.map((m) => (
                <td
                  key={m}
                  className="border-t border-line bg-surface-tint px-3 py-2.5 text-right font-semibold text-ink"
                >
                  {formatteer(totaal.perMerk[m] ?? 0, "aantal")}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

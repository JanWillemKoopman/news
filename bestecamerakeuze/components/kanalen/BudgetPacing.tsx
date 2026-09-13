"use client";

import { useMemo } from "react";
import ProgressBar from "@/components/ProgressBar";
import { formatteer } from "@/components/chat/chartTheme";
import type { CampagneBudget } from "@/lib/kanalen/budget";
import { pacingVan } from "@/lib/kanalen/budget";

/**
 * Ligt het budget op schema?
 *
 * **Waarom dit hier hoort.** De sheet weet wat een campagne mag kosten en wat hij moet
 * opleveren; de advertentieplatforms weten wat hij daadwerkelijk kost. Die twee stonden
 * in dit dashboard naast elkaar zonder elkaar ooit te raken, en daardoor was elk bedrag
 * op deze pagina een absoluut getal zonder maat. Nu staat er hoever de campagne is in
 * zijn looptijd naast hoever hij is door zijn budget — dat verschil is de hele vraag.
 *
 * **Wat er niet in zit.** Alleen campagnes die op de Koppeltabel aan een sheet-campagne
 * zijn gekoppeld én daar een start- en einddatum hebben. Zonder looptijd valt er niets te
 * peilen, en dat is eerlijker dan een balkje dat doet alsof.
 *
 * De uitgaven hier lopen over de **eigen looptijd** van de campagne en niet over de
 * gekozen periode — een budget is geen periodecijfer. De rest van de pagina doet dat wel;
 * daarom staat het hier apart en niet als kolom in de campagnetabel.
 */

type Props = {
  budgetten: CampagneBudget[];
  /** Alleen campagnes die in de huidige selectie voorkomen. */
  zichtbareCampagnes: Set<string>;
};

export default function BudgetPacing({ budgetten, zichtbareCampagnes }: Props) {
  const regels = useMemo(
    () =>
      budgetten
        .filter((b) => zichtbareCampagnes.has(b.campagne))
        .map((budget) => ({ budget, pacing: pacingVan(budget) }))
        // De campagne die het verst uit de pas loopt bovenaan; loopt alles op schema, dan
        // staat de grootste vooraan.
        .sort((a, b) => Math.abs(b.pacing.afwijking ?? 0) - Math.abs(a.pacing.afwijking ?? 0)),
    [budgetten, zichtbareCampagnes],
  );

  if (regels.length === 0) return null;

  return (
    <section className="kaart-omlijst rounded-panel border border-line bg-card shadow-subtle">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-4">
        <div>
          <h2 className="font-sans-w7 text-cell font-semibold text-ink">Budget en doelen</h2>
          <p className="mt-0.5 text-meta text-ink-muted">
            {regels.length} {regels.length === 1 ? "campagne" : "campagnes"} met een budget uit de
            sheet · over hun eigen looptijd, niet over de gekozen periode
          </p>
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {["Campagne", "Looptijd", "Budget", "Uitgegeven", "Leads"].map((kop, i) => (
                <th
                  key={kop}
                  className={`whitespace-nowrap border-b border-line bg-surface-tint px-4 py-2.5 ${
                    i >= 2 ? "text-right" : "text-left"
                  }`}
                >
                  <span className="label-theme text-label text-ink-faint">{kop}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {regels.map(({ budget, pacing }) => (
              <tr key={budget.campagne}>
                <td className="border-b border-line-soft px-4 py-3 align-top">
                  <p className="line-clamp-1 text-ink">{budget.campagne}</p>
                  <p className="text-meta text-ink-faint">via {budget.sheetCampagne}</p>
                </td>

                <td className="w-56 border-b border-line-soft px-4 py-3 align-top">
                  <ProgressBar percent={pacing.verstreken * 100} className="h-1 w-full" />
                  <p className="mt-1 text-meta text-ink-muted">
                    {pacing.afgelopen
                      ? "afgelopen"
                      : pacing.begonnen
                        ? `dag ${pacing.dagVan} van ${pacing.dagen}`
                        : "nog niet begonnen"}
                  </p>
                </td>

                <td className="whitespace-nowrap border-b border-line-soft px-4 py-3 text-right align-top text-ink">
                  {budget.budget === null ? "—" : formatteer(budget.budget, "euro-heel")}
                </td>

                <td className="w-56 border-b border-line-soft px-4 py-3 align-top">
                  {budget.budget === null ? (
                    <p className="text-right text-ink">{formatteer(budget.uitgaven, "euro-heel")}</p>
                  ) : (
                    <>
                      <p className="text-right text-ink">
                        {formatteer(budget.uitgaven, "euro-heel")}
                        <span className="ml-1.5 text-ink-faint">
                          {Math.round(pacing.benut * 100)}%
                        </span>
                      </p>
                      <div className="mt-1">
                        <ProgressBar percent={pacing.benut * 100} className="h-1 w-full" />
                      </div>
                      <p className={`mt-1 text-right text-meta ${pacingKleur(pacing.oordeel)}`}>
                        {pacingTekst(pacing)}
                      </p>
                    </>
                  )}
                </td>

                <td className="whitespace-nowrap border-b border-line-soft px-4 py-3 text-right align-top text-ink">
                  {budget.leads.toLocaleString("nl-NL")}
                  {budget.doelLeads !== null && budget.doelLeads > 0 && (
                    <span className="block text-meta text-ink-faint">
                      van {budget.doelLeads.toLocaleString("nl-NL")} ·{" "}
                      {Math.round((budget.leads / budget.doelLeads) * 100)}%
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function pacingKleur(oordeel: "voor" | "achter" | "op-schema" | "onbekend"): string {
  if (oordeel === "voor") return "text-negative";
  if (oordeel === "achter") return "text-ink-muted";
  return "text-ink-faint";
}

function pacingTekst(pacing: ReturnType<typeof pacingVan>): string {
  if (pacing.oordeel === "onbekend") return "geen looptijd bekend";
  if (!pacing.begonnen) return "start nog";
  const punten = Math.round(Math.abs(pacing.afwijking ?? 0) * 100);
  if (pacing.oordeel === "op-schema") return "op schema";
  return pacing.oordeel === "voor"
    ? `${punten} punten vóór op de looptijd`
    : `${punten} punten achter op de looptijd`;
}

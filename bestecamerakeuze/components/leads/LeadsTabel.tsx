"use client";

import { useState } from "react";
import { formatteer } from "@/components/chat/chartTheme";
import { kostenPerLead, type Groep } from "@/lib/leads/samenvatting";

/**
 * Eén tabel van het tabblad Leads: een rij per groep, met leads, aandeel, uitgaven en kosten
 * per lead. Dezelfde vorm voor kanalen, soorten, merken, modellen en formulieren, zodat je
 * ze naast elkaar kunt lezen zonder per tabel te moeten uitzoeken wat een kolom betekent.
 *
 * ## Wat er in de kostenkolommen staat, en wat niet
 *
 * - **"onbekend"** voor een groep die wél betaald verkeer heeft maar waarvan geen enkele lead
 *   een kostenbron heeft (Bing, LinkedIn, of een campagne die niet te vinden is). Een streepje
 *   zou zeggen "niet van toepassing"; nul zou zeggen "gratis". Geen van beide klopt.
 * - **"—"** voor een groep zonder betaalde leads: daar valt niets uit te geven.
 * - Een **sterretje** achter het bedrag als er in de groep óók betaalde leads zitten
 *   waarvan de kosten onbekend zijn: het bedrag klopt dan voor de leads waarvan we het weten,
 *   en de kosten per lead delen alleen door die leads.
 */

const STANDAARD_RIJEN = 10;

type Props = {
  titel: string;
  toelichting?: string;
  /** De kop van de eerste kolom: "Kanaal", "Merk", … */
  labelKop: string;
  groepen: Groep[];
  /** Alle leads in de selectie: de noemer van "aandeel". */
  totaalLeads: number;
  /** Toon de kolom "Betaald" — niet zinvol bij kanalen, waar een rij ofwel betaald is of niet. */
  toonBetaald?: boolean;
  /** Een leesbare naam voor de sleutel van een groep (bv. een event naar "Proefrit"). */
  labelVan?: (g: Groep) => string;
  maxRijen?: number;
};

function Uitgaven({ g }: { g: Groep }) {
  if (g.betaald === 0) return <span className="text-ink-faint">—</span>;
  if (g.metKosten === 0) {
    return (
      <span
        className="text-ink-faint"
        title="Betaald verkeer, maar de kosten zijn niet te herleiden (Bing of LinkedIn Ads, of een campagne die niet bij Google Ads of Meta te vinden is)."
      >
        onbekend
      </span>
    );
  }
  return (
    <span>
      {formatteer(g.kosten, "euro-heel")}
      {g.zonderKosten > 0 && (
        <span
          className="text-ink-faint"
          title={`${g.zonderKosten} betaalde ${g.zonderKosten === 1 ? "lead" : "leads"} in deze rij ${g.zonderKosten === 1 ? "heeft" : "hebben"} geen bekende kosten en tellen hier niet mee.`}
        >
          *
        </span>
      )}
    </span>
  );
}

export default function LeadsTabel({
  titel,
  toelichting,
  labelKop,
  groepen,
  totaalLeads,
  toonBetaald = true,
  labelVan,
  maxRijen = STANDAARD_RIJEN,
}: Props) {
  const [alles, setAlles] = useState(false);
  const zichtbaar = alles ? groepen : groepen.slice(0, maxRijen);
  const verborgen = groepen.length - zichtbaar.length;

  const kopken = [
    labelKop,
    "Leads",
    "Aandeel",
    ...(toonBetaald ? ["Betaald"] : []),
    "Uitgaven",
    "Per lead",
  ];

  return (
    <section className="kaart-omlijst rounded-panel border border-line bg-card shadow-subtle">
      <header className="border-b border-line px-5 py-4">
        <h2 className="font-sans-w7 text-cell font-semibold text-ink">{titel}</h2>
        {toelichting && <p className="mt-0.5 text-meta text-ink-muted">{toelichting}</p>}
      </header>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {kopken.map((kop, i) => (
                <th
                  key={kop}
                  className={`whitespace-nowrap border-b border-line bg-surface-tint px-4 py-2.5 ${
                    i === 0 ? "text-left" : "text-right"
                  }`}
                >
                  <span className="label-theme text-label text-ink-faint">{kop}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {zichtbaar.length === 0 ? (
              <tr>
                <td colSpan={kopken.length} className="px-4 py-8 text-center text-ink-muted">
                  Geen leads in deze selectie.
                </td>
              </tr>
            ) : (
              zichtbaar.map((g) => {
                const perLead = kostenPerLead(g);
                return (
                  <tr key={g.sleutel}>
                    <td className="border-b border-line-soft px-4 py-2.5 text-ink">
                      <span className="block max-w-72 truncate" title={labelVan?.(g) ?? g.sleutel}>
                        {labelVan?.(g) ?? g.sleutel}
                      </span>
                      {g.toelichting && (
                        <span className="block max-w-72 truncate text-meta text-ink-faint">{g.toelichting}</span>
                      )}
                    </td>
                    <td className="border-b border-line-soft px-4 py-2.5 text-right font-medium text-ink">
                      {formatteer(g.leads, "aantal")}
                    </td>
                    <td className="border-b border-line-soft px-4 py-2.5 text-right text-ink-muted">
                      {totaalLeads > 0 ? formatteer((g.leads / totaalLeads) * 100, "procent") : "—"}
                    </td>
                    {toonBetaald && (
                      <td className="border-b border-line-soft px-4 py-2.5 text-right text-ink-muted">
                        {g.betaald > 0 ? formatteer(g.betaald, "aantal") : "—"}
                      </td>
                    )}
                    <td className="border-b border-line-soft px-4 py-2.5 text-right text-ink">
                      <Uitgaven g={g} />
                    </td>
                    <td className="border-b border-line-soft px-4 py-2.5 text-right text-ink">
                      {perLead === null ? <span className="text-ink-faint">—</span> : formatteer(perLead, "euro-exact")}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {groepen.length > maxRijen && (
        <button
          type="button"
          onClick={() => setAlles((a) => !a)}
          className="w-full rounded-b-panel border-t border-line px-5 py-2.5 text-left text-sm font-medium text-primary hover:bg-surface"
        >
          {alles ? "Toon minder" : `Toon alle ${groepen.length} (nog ${verborgen})`}
        </button>
      )}
    </section>
  );
}

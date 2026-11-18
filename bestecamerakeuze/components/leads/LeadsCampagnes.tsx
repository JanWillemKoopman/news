"use client";

import { useState } from "react";
import { formatteer } from "@/components/chat/chartTheme";
import type { CampagneRij } from "@/lib/leads/campagnes";
import { PLATFORM_LABEL } from "@/lib/leads/kanaal";

/**
 * De betaalde campagnes: wat elke campagne kostte en hoeveel leads ze opleverde.
 *
 * Dit is de plek waar de koppeling zichtbaar wordt. Elke regel is één campagne bij één
 * platform; de kosten zijn wat Google Ads of Meta voor die campagne rapporteert, de leads
 * zijn wat GA4 aan dezelfde naam toeschrijft.
 *
 * Drie soorten regels, en geen ervan mag wegvallen:
 *
 *  - **Gekoppeld**: kosten en leads, met kosten per lead.
 *  - **Zonder kosten**: betaald verkeer in GA4 waarvan de kosten niet te vinden zijn — Bing
 *    of LinkedIn (geen kostenbron), of een campagnenaam die bij Google Ads of Meta niet
 *    bestaat. De reden staat erbij; "onbekend" zonder reden is een raadsel.
 *  - **Zonder lead**: een campagne met uitgaven en geen enkele lead in de periode. Alleen
 *    zichtbaar zonder filters: met een filter op merk of soort zegt "geen leads" niets
 *    meer over de campagne.
 */

const STANDAARD_RIJEN = 12;

type Props = {
  rijen: CampagneRij[];
  /** De totalen over álle campagnes, ook de verborgen rijen achter "Toon alle". */
  totaal: { leads: number; uitgaven: number; perLead: number | null };
};

export default function LeadsCampagnes({ rijen, totaal }: Props) {
  const [alles, setAlles] = useState(false);
  const zichtbaar = alles ? rijen : rijen.slice(0, STANDAARD_RIJEN);

  const kopken = ["Campagne", "Platform", "Leads", "Uitgaven", "Per betaalde lead"];

  return (
    <section className="kaart-omlijst rounded-panel border border-line bg-card shadow-subtle">
      <header className="border-b border-line px-5 py-4">
        <h2 className="font-sans-w7 text-cell font-semibold text-ink">Betaalde campagnes</h2>
        <p className="mt-0.5 text-meta text-ink-muted">
          Elke campagne van Google Ads en Meta Ads met zijn echte uitgaven, gekoppeld aan de leads
          uit GA4 op platform en campagnenaam. Campagnes zonder leads staan er ook in. Bij een
          filter op de leads staan hier alleen de toegerekende kosten van de leads binnen het filter.
        </p>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {kopken.map((kop, i) => (
                <th
                  key={kop}
                  className={`whitespace-nowrap border-b border-line bg-surface-tint px-4 py-2.5 ${
                    i < 2 ? "text-left" : "text-right"
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
                  Geen betaalde campagnes in deze selectie.
                </td>
              </tr>
            ) : (
              zichtbaar.map((r) => (
                <tr key={r.sleutel}>
                  <td className="border-b border-line-soft px-4 py-2.5 text-ink">
                    <span className="block max-w-96 truncate" title={r.campagne}>
                      {r.campagne}
                    </span>
                  </td>
                  <td className="whitespace-nowrap border-b border-line-soft px-4 py-2.5 text-ink-muted">
                    {PLATFORM_LABEL[r.platform]}
                  </td>
                  <td className="border-b border-line-soft px-4 py-2.5 text-right font-medium text-ink">
                    {r.leads === 0 ? (
                      <span className="text-ink-faint">geen leads</span>
                    ) : (
                      formatteer(r.leads, "aantal")
                    )}
                  </td>
                  <td className="border-b border-line-soft px-4 py-2.5 text-right text-ink">
                    {r.kosten === null ? (
                      <span className="text-ink-faint" title={r.reden ?? undefined}>
                        onbekend
                      </span>
                    ) : (
                      formatteer(r.kosten, "euro-heel")
                    )}
                    {r.reden && (
                      <span className="block text-meta text-ink-faint">{r.reden}</span>
                    )}
                  </td>
                  <td className="border-b border-line-soft px-4 py-2.5 text-right text-ink">
                    {r.perLead === null ? (
                      <span className="text-ink-faint">—</span>
                    ) : (
                      formatteer(r.perLead, "euro-exact")
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {rijen.length > 0 && (
            <tfoot>
              <tr>
                <td className="border-t border-line bg-surface-tint px-4 py-2.5 font-semibold text-ink">
                  Totaal ({rijen.length} {rijen.length === 1 ? "campagne" : "campagnes"})
                </td>
                <td className="border-t border-line bg-surface-tint px-4 py-2.5" />
                <td className="border-t border-line bg-surface-tint px-4 py-2.5 text-right font-semibold text-ink">
                  {formatteer(totaal.leads, "aantal")}
                </td>
                <td className="border-t border-line bg-surface-tint px-4 py-2.5 text-right font-semibold text-ink">
                  {formatteer(totaal.uitgaven, "euro-heel")}
                </td>
                <td className="border-t border-line bg-surface-tint px-4 py-2.5 text-right font-semibold text-ink">
                  {totaal.perLead === null ? "—" : formatteer(totaal.perLead, "euro-exact")}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {rijen.length > STANDAARD_RIJEN && (
        <button
          type="button"
          onClick={() => setAlles((a) => !a)}
          className="w-full rounded-b-panel border-t border-line px-5 py-2.5 text-left text-sm font-medium text-primary hover:bg-surface"
        >
          {alles ? "Toon minder" : `Toon alle ${rijen.length} campagnes`}
        </button>
      )}
    </section>
  );
}

"use client";

import { useState } from "react";
import { formatteer } from "@/components/chat/chartTheme";
import { kostenPerLead, type Groep, type Totalen } from "@/lib/leads/samenvatting";

/**
 * Eén tabel van het tabblad Leads: een rij per groep, met leads, aandeel, uitgaven en kosten
 * per lead (kosten ÷ alle leads van de rij, betaald en onbetaald), en onderaan altijd een
 * totaalregel (uitgaven ÷ alle leads).
 *
 * ## De tabel telt op tot de totale uitgaven
 *
 * Uitgaven bestaan per campagne, leads per lead. Onder het campagneniveau (merk, model,
 * soort, formulier) zijn de uitgaven dus een **indicatie**: de kosten van elke campagne zijn
 * gelijk verdeeld over zijn leads. Een campagne zonder lead heeft geen merk of model om aan
 * te hangen; haar uitgaven staan daarom op een eigen regel ("Campagnes zonder lead"), zodat
 * de rijen samen met die regel precies de totale uitgaven zijn. Zonder die regel telt een
 * tabel op tot minder dan er is uitgegeven, en dat is waar collega's over struikelen.
 *
 * ## Wat er in de uitgavenkolom staat
 *
 * - **"onbekend"** voor een groep met betaald verkeer waarvan geen enkele lead een kostenbron
 *   heeft (Bing, LinkedIn, of een campagne die niet te vinden is). Een streepje zegt "niet
 *   van toepassing"; nul zegt "gratis". Geen van beide klopt.
 * - **"—"** voor een groep zonder betaalde leads: daar valt niets uit te geven.
 * - Een **sterretje** achter het bedrag als er in de groep óók betaalde leads zitten waarvan
 *   de kosten onbekend zijn: het bedrag klopt dan voor de leads waarvan we het weten.
 *
 * ## De totaalregel telt álle groepen
 *
 * Ook de rijen die achter "Toon alle" zitten. Het totaal komt van buiten (`totaal`), niet uit
 * de zichtbare rijen: een totaal dat verandert als je een tabel uitklapt, is geen totaal.
 */

const STANDAARD_RIJEN = 10;

type Props = {
  titel: string;
  toelichting?: string;
  /** De kop van de eerste kolom: "Kanaal", "Merk", … */
  labelKop: string;
  groepen: Groep[];
  /** Rijen die altijd zichtbaar zijn, onder de uitklapbare lijst (bv. "Onbekend"). */
  vastgezet?: Groep[];
  /** De totalen over álle rijen van deze tabel, ook de verborgen en vastgezette. */
  totaal: Totalen;
  /** Wat er in de totaalregel bij Uitgaven staat: de basis, niet de som van de zichtbare rijen. */
  totaalUitgaven: number;
  /** Kosten per lead voor de totaalregel. */
  totaalPerLead: number | null;
  /**
   * Uitgaven van campagnes zonder lead, als eigen regel onder de rijen. Alleen zonder filters:
   * met een filter zijn ze geen onderdeel van de selectie.
   */
  zonderLead?: { uitgaven: number; campagnes: number } | null;
  /** Toon de kolom "Betaald" — niet zinvol bij kanalen, waar een rij ofwel betaald is of niet. */
  toonBetaald?: boolean;
  /** Een leesbare naam voor de sleutel van een groep (bv. een event naar "Proefrit"). */
  labelVan?: (g: Groep) => string;
  maxRijen?: number;
};

function Uitgaven({ g }: { g: Groep }) {
  if (g.kosten > 0) {
    return (
      <span>
        {formatteer(g.kosten, "euro-heel")}
        {g.zonderKosten > 0 && (
          <span
            className="text-ink-faint"
            title={`${g.zonderKosten} betaalde ${g.zonderKosten === 1 ? "lead" : "leads"} in deze rij ${g.zonderKosten === 1 ? "heeft" : "hebben"} geen bekende kosten: niet in dit bedrag, wel in het aantal leads waardoor de kosten per lead worden gedeeld.`}
          >
            *
          </span>
        )}
      </span>
    );
  }
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
  return <span>{formatteer(0, "euro-heel")}</span>;
}

const CEL = "border-b border-line-soft px-4 py-2.5";

export default function LeadsTabel({
  titel,
  toelichting,
  labelKop,
  groepen,
  vastgezet = [],
  totaal,
  totaalUitgaven,
  totaalPerLead,
  zonderLead = null,
  toonBetaald = true,
  labelVan,
  maxRijen = STANDAARD_RIJEN,
}: Props) {
  const [alles, setAlles] = useState(false);
  const zichtbaar = alles ? groepen : groepen.slice(0, maxRijen);
  const verborgen = groepen.length - zichtbaar.length;
  const leeg = groepen.length === 0 && vastgezet.length === 0;

  const kopken = [
    labelKop,
    "Leads",
    "Aandeel",
    ...(toonBetaald ? ["Betaald"] : []),
    "Uitgaven",
    "Per lead",
  ];

  const rij = (g: Groep) => {
    const perLead = kostenPerLead(g);
    return (
      <tr key={g.sleutel}>
        <td className={`${CEL} text-ink`}>
          <span className="block max-w-72 truncate" title={labelVan?.(g) ?? g.sleutel}>
            {labelVan?.(g) ?? g.sleutel}
          </span>
          {g.toelichting && (
            <span className="block max-w-72 truncate text-meta text-ink-faint">{g.toelichting}</span>
          )}
        </td>
        <td className={`${CEL} text-right font-medium text-ink`}>{formatteer(g.leads, "aantal")}</td>
        <td className={`${CEL} text-right text-ink-muted`}>
          {totaal.leads > 0 ? formatteer((g.leads / totaal.leads) * 100, "procent") : "—"}
        </td>
        {toonBetaald && (
          <td className={`${CEL} text-right text-ink-muted`}>
            {g.betaald > 0 ? formatteer(g.betaald, "aantal") : "—"}
          </td>
        )}
        <td className={`${CEL} text-right text-ink`}>
          <Uitgaven g={g} />
        </td>
        <td className={`${CEL} text-right text-ink`}>
          {perLead === null ? <span className="text-ink-faint">—</span> : formatteer(perLead, "euro-exact")}
        </td>
      </tr>
    );
  };

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
            {leeg ? (
              <tr>
                <td colSpan={kopken.length} className="px-4 py-8 text-center text-ink-muted">
                  Geen leads in deze selectie.
                </td>
              </tr>
            ) : (
              <>
                {zichtbaar.map(rij)}
                {vastgezet.map(rij)}
                {zonderLead && zonderLead.uitgaven > 0 && (
                  <tr>
                    <td className={`${CEL} text-ink-muted`}>
                      <span
                        title="Uitgaven van campagnes waarvoor in deze periode geen enkele lead is gevonden. Ze zijn aan geen merk, model, soort of formulier toe te rekenen, maar horen wel bij het totaal."
                      >
                        Campagnes zonder lead ({zonderLead.campagnes})
                      </span>
                    </td>
                    <td className={`${CEL} text-right text-ink-faint`}>0</td>
                    <td className={`${CEL} text-right text-ink-faint`}>—</td>
                    {toonBetaald && <td className={`${CEL} text-right text-ink-faint`}>—</td>}
                    <td className={`${CEL} text-right text-ink-muted`}>
                      {formatteer(zonderLead.uitgaven, "euro-heel")}
                    </td>
                    <td className={`${CEL} text-right text-ink-faint`}>—</td>
                  </tr>
                )}
              </>
            )}
          </tbody>
          {!leeg && (
            <tfoot>
              <tr>
                <td className="border-t border-line bg-surface-tint px-4 py-2.5 font-semibold text-ink">
                  Totaal
                </td>
                <td className="border-t border-line bg-surface-tint px-4 py-2.5 text-right font-semibold text-ink">
                  {formatteer(totaal.leads, "aantal")}
                </td>
                <td className="border-t border-line bg-surface-tint px-4 py-2.5 text-right text-ink-muted">
                  {totaal.leads > 0 ? formatteer(100, "procent") : "—"}
                </td>
                {toonBetaald && (
                  <td className="border-t border-line bg-surface-tint px-4 py-2.5 text-right font-semibold text-ink">
                    {formatteer(totaal.betaald, "aantal")}
                  </td>
                )}
                <td className="border-t border-line bg-surface-tint px-4 py-2.5 text-right font-semibold text-ink">
                  {formatteer(totaalUitgaven, "euro-heel")}
                </td>
                <td className="border-t border-line bg-surface-tint px-4 py-2.5 text-right font-semibold text-ink">
                  {totaalPerLead === null ? "—" : formatteer(totaalPerLead, "euro-exact")}
                </td>
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

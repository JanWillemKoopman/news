"use client";

import { formatteer } from "@/components/chat/chartTheme";
import { aantal, datumKort } from "@/components/kpi/KpiKaart";
import { KPI_DOELJAAR, KPI_JAAR } from "@/lib/kpi2027/definities";
import { voortgang, type SyntecKpiRegel, type SyntecOverzicht } from "@/lib/kpi2027syntec/rekenen";

/**
 * De overzichtstabel bovenaan KPI's 2027 Syntec: alle KPI's van de kaarten eronder in één
 * blik, in dezelfde indeling als de doelentabel van het team (eigen website, PAH,
 * portals, elk met een totaal).
 *
 * Elk getal komt uit dezelfde uitkomst als de kaart van die KPI (`SyntecKpiRegel`), dus
 * tabel en kaarten kunnen niet uit elkaar lopen. Alleen Voortgang is nieuw: de
 * realisatie van 2027 tegen het deel van het jaartarget dat er vandaag had moeten zijn
 * (`voortgang` in `lib/kpi2027syntec/rekenen.ts`).
 *
 * De definities staan direct onder de tabel en niet achter een knop: wie de tabel in het
 * overleg laat zien, moet in één scherm kunnen uitleggen wat er staat.
 */

function procent(waarde: number, metTeken = false): string {
  const teken = metTeken ? (waarde > 0 ? "+" : waarde < 0 ? "−" : "") : waarde < 0 ? "−" : "";
  return `${teken}${formatteer(Math.abs(waarde) * 100, "procent")}`;
}

function Regel({ kpi, soort }: { kpi: SyntecKpiRegel; soort: "kpi" | "combinatie" | "totaal" | "eindtotaal" }) {
  const u = kpi.uitkomst;
  const v = voortgang(u.target, kpi.realisatie);
  const vet = soort === "totaal" || soort === "eindtotaal";
  const rand =
    soort === "eindtotaal" ? "border-t-2 border-ink" : soort === "totaal" ? "border-t border-line" : "border-t border-line-soft";
  const cel = `${rand} px-3 py-1.5 text-right ${vet ? "font-sans-w7 font-semibold text-ink" : "text-ink"}`;

  return (
    <tr>
      <th
        scope="row"
        className={`${rand} px-3 py-1.5 text-left font-normal ${
          vet ? "font-sans-w7 font-semibold text-ink" : soort === "combinatie" ? "italic text-ink-muted" : "text-ink"
        }`}
      >
        {kpi.naam}
        {soort === "combinatie" && <span className="ml-1.5 text-meta not-italic text-ink-faint">(niet in het totaal)</span>}
      </th>
      <td className={cel}>{aantal(u.verwacht)}</td>
      <td className={`${cel} bg-primary-light/60`}>{aantal(u.target)}</td>
      <td className={cel}>{procent(u.groei)}</td>
      <td className={cel}>{aantal(kpi.realisatie.waarde)}</td>
      <td className={cel}>
        {v ? (
          <span
            className={v.afwijking >= 0 ? "text-positive" : "text-negative"}
            title={`${aantal(kpi.realisatie.waarde)} gerealiseerd, ${aantal(v.targetTotNu)} hoorde er op dag ${v.dagen} te zijn`}
          >
            {procent(v.afwijking, true)}
          </span>
        ) : (
          <span className="text-ink-faint">—</span>
        )}
      </td>
    </tr>
  );
}

export default function SyntecOverzichtTabel({ overzicht }: { overzicht: SyntecOverzicht }) {
  const peildatum2027 = overzicht.totaal.realisatie.peildatum;
  const kop = "px-3 py-2 text-right label-theme text-label text-ink-faint font-normal";

  return (
    <section className="kaart-omlijst flex flex-col gap-3 rounded-panel border border-line bg-card px-5 py-4 shadow-subtle">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-sans-w7 text-cell font-semibold text-ink">Overzicht</h2>
        <p className="text-meta text-ink-muted">
          {peildatum2027
            ? `Realisatie en voortgang t/m ${datumKort(peildatum2027)} ${KPI_DOELJAAR}`
            : `Realisatie en voortgang tellen vanaf 1 januari ${KPI_DOELJAAR}`}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="px-3 py-2 text-left label-theme text-label font-normal text-ink-faint">KPI</th>
              <th className={kop}>{KPI_JAAR}</th>
              <th className={kop}>Target {KPI_DOELJAAR}</th>
              <th className={kop}>Target %</th>
              <th className={kop}>Realisatie</th>
              <th className={kop}>Voortgang</th>
            </tr>
          </thead>
          {overzicht.groepen.map((groep) => (
            <tbody key={groep.sleutel}>
              <tr>
                <th
                  colSpan={6}
                  scope="rowgroup"
                  className="px-3 pb-1 pt-4 text-left label-theme text-label font-normal text-ink-muted"
                >
                  {groep.naam}
                </th>
              </tr>
              {groep.kpis.map((kpi) => (
                <Regel key={kpi.sleutel} kpi={kpi} soort="kpi" />
              ))}
              {groep.combinaties.map((kpi) => (
                <Regel key={kpi.sleutel} kpi={kpi} soort="combinatie" />
              ))}
              <Regel kpi={groep.totaal} soort="totaal" />
            </tbody>
          ))}
          <tbody>
            <tr>
              <td colSpan={6} className="pt-4" />
            </tr>
            <Regel kpi={overzicht.totaal} soort="eindtotaal" />
          </tbody>
        </table>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t border-line-soft pt-3 text-meta text-ink-muted">
        <dt className="font-semibold text-ink">{KPI_JAAR}</dt>
        <dd>
          Wat {KPI_JAAR} naar verwachting wordt: de leads t/m de peildatum, plus het gemiddelde per dag × de resterende
          dagen van het jaar. Inruilvoorstel en contact rekenen met het gemiddelde vanaf 1 april {KPI_JAAR}.
        </dd>
        <dt className="font-semibold text-ink">Target {KPI_DOELJAAR}</dt>
        <dd>
          Het doel voor {KPI_DOELJAAR}: de verwachting voor {KPI_JAAR} plus het Target %.
        </dd>
        <dt className="font-semibold text-ink">Target %</dt>
        <dd>Hoeveel procent het Target {KPI_DOELJAAR} boven de verwachting voor {KPI_JAAR} ligt.</dd>
        <dt className="font-semibold text-ink">Realisatie</dt>
        <dd>
          Wat er in {KPI_DOELJAAR} werkelijk is binnengekomen, t/m de laatste zaterdag. Tot 1 januari {KPI_DOELJAAR} staat
          hier 0.
        </dd>
        <dt className="font-semibold text-ink">Voortgang</dt>
        <dd>
          Ligt de KPI vandaag op schema? Het jaartarget gaat gelijk over de 365 dagen van {KPI_DOELJAAR}: op dag 40 hoort
          er target × 40 ÷ 365 binnen te zijn. Voortgang is de realisatie ten opzichte daarvan: <span className="text-positive">+10%</span>{" "}
          is 10% vóór op schema, <span className="text-negative">−10%</span> 10% erachter. Ga met de muis over het getal
          voor de berekening. Tot 1 januari {KPI_DOELJAAR} staat hier een streepje.
        </dd>
        <dt className="font-semibold text-ink">Totalen</dt>
        <dd>
          De optelsom van de KPI&apos;s erboven. &quot;Offerte + private lease&quot; staat er ter vergelijking bij, maar telt
          niet mee in het totaal: die leads zitten er al in via de twee losse KPI&apos;s.
        </dd>
      </dl>
    </section>
  );
}

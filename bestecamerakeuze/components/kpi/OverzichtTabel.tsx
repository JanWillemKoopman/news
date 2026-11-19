"use client";

import type { ReactNode } from "react";
import { formatteer } from "@/components/chat/chartTheme";
import { STANDAARD_GROEI_TEKST, useGroeiBewerken } from "@/components/kpi/GroeiBewerken";
import { IconRefresh } from "@/components/icons";
import { Definitie, aantal, datumKort } from "@/components/kpi/KpiKaart";
import { KPI_DOELJAAR, KPI_JAAR } from "@/lib/kpi2027/definities";
import { voortgang, type KpiUitkomst } from "@/lib/kpi2027/rekenen";

/**
 * De overzichtstabel bovenaan KPI's 2027 GA en KPI's 2027 Syntec: kader, kolomkoppen,
 * regels en definities. Beide tabbladen gebruiken precies deze onderdelen; alleen welke
 * regels erin staan en de uitleg van de kolom {KPI_JAAR} verschillen
 * (`GaOverzichtTabel.tsx`, `SyntecOverzichtTabel.tsx`).
 *
 * Elk getal komt uit dezelfde uitkomst als de kaart van die KPI, dus tabel en kaarten
 * kunnen niet uit elkaar lopen. Alleen Voortgang is nieuw: de realisatie van 2027 tegen
 * het deel van het jaartarget dat er vandaag had moeten zijn (`voortgang` in
 * `lib/kpi2027/rekenen.ts`).
 *
 * De definities staan direct onder de tabel en niet achter een knop: wie de tabel in het
 * overleg laat zien, moet in één scherm kunnen uitleggen wat er staat.
 */

export const KOLOMMEN = 6;

export type RegelSoort = "kpi" | "combinatie" | "totaal" | "eindtotaal";

function procent(waarde: number, metTeken = false): string {
  const teken = metTeken ? (waarde > 0 ? "+" : waarde < 0 ? "−" : "") : waarde < 0 ? "−" : "";
  return `${teken}${formatteer(Math.abs(waarde) * 100, "procent")}`;
}

export function OverzichtRegel({
  naam,
  uitkomst: u,
  realisatie,
  soort,
  groei,
}: {
  naam: string;
  /** Null als er voor deze KPI nog niets te rekenen valt: dan streepjes. */
  uitkomst: KpiUitkomst | null;
  realisatie: { waarde: number; peildatum: string | null };
  soort: RegelSoort;
  /**
   * Alleen bij een gewone KPI: dan is Target % aan te klikken en aan te passen, precies
   * zoals het kaartje Groei. Een totaal of combinatie volgt uit zijn KPI's.
   */
  groei?: { aangepast: boolean; opslaan: (groei: number | null) => Promise<void> };
}) {
  const v = u ? voortgang(u.target, realisatie) : null;
  const vet = soort === "totaal" || soort === "eindtotaal";
  const rand =
    soort === "eindtotaal" ? "border-t-2 border-ink" : soort === "totaal" ? "border-t border-line" : "border-t border-line-soft";
  const cel = `${rand} px-3 py-1.5 text-right ${vet ? "font-sans-w7 font-semibold text-ink" : "text-ink"}`;
  const streepje = <span className="text-ink-faint">—</span>;

  return (
    <tr>
      <th
        scope="row"
        className={`${rand} px-3 py-1.5 text-left font-normal ${
          vet ? "font-sans-w7 font-semibold text-ink" : soort === "combinatie" ? "italic text-ink-muted" : "text-ink"
        }`}
      >
        {naam}
        {soort === "combinatie" && <span className="ml-1.5 text-meta not-italic text-ink-faint">(niet in het totaal)</span>}
      </th>
      <td className={cel}>{u ? aantal(u.verwacht) : streepje}</td>
      <td className={`${cel} bg-primary-light/60`}>{u ? aantal(u.target) : streepje}</td>
      <td className={cel}>
        {u && groei ? <GroeiCel groei={u.groei} {...groei} /> : u ? procent(u.groei) : streepje}
      </td>
      <td className={cel}>{aantal(realisatie.waarde)}</td>
      <td className={cel}>
        {v ? (
          <span
            className={v.afwijking >= 0 ? "text-positive" : "text-negative"}
            title={`${aantal(realisatie.waarde)} gerealiseerd, ${aantal(v.targetTotNu)} hoorde er op dag ${v.dagen} te zijn`}
          >
            {procent(v.afwijking, true)}
          </span>
        ) : (
          streepje
        )}
      </td>
    </tr>
  );
}

/**
 * Target % als aan te klikken getal: dezelfde invoer als op de kaart (`useGroeiBewerken`).
 * Een aangepast percentage krijgt een stip en een knopje om terug te gaan naar de standaard.
 */
function GroeiCel({
  groei,
  aangepast,
  opslaan,
}: {
  groei: number;
  aangepast: boolean;
  opslaan: (groei: number | null) => Promise<void>;
}) {
  const { bewerken, bezig, fout, begin, terugzetten, invoerProps } = useGroeiBewerken(groei, opslaan);

  return (
    <span className="inline-flex flex-col items-end">
      <span className="inline-flex items-center justify-end gap-1">
        {bewerken ? (
          <>
            <input
              {...invoerProps}
              className="w-14 rounded-control border border-primary bg-card px-1.5 py-0.5 text-right text-sm text-ink outline-none"
            />
            <span>%</span>
          </>
        ) : (
          <>
            {aangepast && !bezig && (
              <button
                type="button"
                onClick={terugzetten}
                title={`Aangepast — klik om terug te gaan naar ${STANDAARD_GROEI_TEKST}`}
                aria-label={`Terug naar ${STANDAARD_GROEI_TEKST}`}
                className="rounded-control p-0.5 text-ink-faint transition-colors duration-[var(--duur-snel)] ease-merk hover:text-ink"
              >
                <IconRefresh className="h-3 w-3" />
              </button>
            )}
            <button
              type="button"
              onClick={begin}
              disabled={bezig}
              title="Klik om het groeipercentage aan te passen"
              className={`rounded-control px-1 underline decoration-dotted underline-offset-4 transition-colors duration-[var(--duur-snel)] ease-merk hover:bg-surface-tint disabled:cursor-wait ${
                aangepast ? "decoration-primary" : "decoration-ink-faint"
              }`}
            >
              {bezig ? "…" : procent(groei)}
            </button>
          </>
        )}
      </span>
      {fout && <span className="mt-0.5 max-w-48 text-right text-meta font-normal text-negative">{fout}</span>}
    </span>
  );
}

export function OverzichtGroepKop({ naam }: { naam: string }) {
  return (
    <tr>
      <th
        colSpan={KOLOMMEN}
        scope="rowgroup"
        className="px-3 pb-1 pt-4 text-left label-theme text-label font-normal text-ink-muted"
      >
        {naam}
      </th>
    </tr>
  );
}

/**
 * Het kader met kop, kolomkoppen en definities. `children` zijn de `<tbody>`'s;
 * `uitlegJaar` is de definitie van de kolom {KPI_JAAR}, die per bron verschilt, en
 * `uitlegTotalen` (optioneel) die van de totaalregels.
 */
export function OverzichtTabel({
  peildatum2027,
  uitlegJaar,
  uitlegTotalen,
  children,
}: {
  peildatum2027: string | null;
  uitlegJaar: ReactNode;
  uitlegTotalen?: ReactNode;
  children: ReactNode;
}) {
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
          {children}
        </table>
      </div>

      <Definitie>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-meta text-ink-muted">
        <dt className="font-semibold text-ink">{KPI_JAAR}</dt>
        <dd>{uitlegJaar}</dd>
        <dt className="font-semibold text-ink">Target {KPI_DOELJAAR}</dt>
        <dd>
          Het doel voor {KPI_DOELJAAR}: de verwachting voor {KPI_JAAR} plus het Target %.
        </dd>
        <dt className="font-semibold text-ink">Target %</dt>
        <dd>
          Hoeveel procent het Target {KPI_DOELJAAR} boven de verwachting voor {KPI_JAAR} ligt; standaard{" "}
          {STANDAARD_GROEI_TEKST}. Klik op het percentage van een KPI om het aan te passen (Enter om op te slaan, Escape om
          te annuleren): het target, de voortgang en de kaart eronder rekenen meteen mee, en het geldt voor iedereen. Het
          pijltje ervoor zet een aangepast percentage terug naar {STANDAARD_GROEI_TEKST}.
        </dd>
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
        {uitlegTotalen && (
          <>
            <dt className="font-semibold text-ink">Totalen</dt>
            <dd>{uitlegTotalen}</dd>
          </>
        )}
      </dl>
      </Definitie>
    </section>
  );
}

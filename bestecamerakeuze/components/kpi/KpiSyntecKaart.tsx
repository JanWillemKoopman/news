"use client";

import { KpiKaartOpmaak, aantal, datumKort, type GroeiInstelling } from "@/components/kpi/KpiKaart";
import { KPI_JAAR } from "@/lib/kpi2027/definities";
import type { SyntecKpiRegel } from "@/lib/kpi2027syntec/rekenen";

/**
 * Eén KPI op het tabblad KPI's 2027 Syntec: dezelfde kaart als op KPI's 2027
 * (`KpiKaartOpmaak`), met daaronder in drie delen waar je naar kijkt:
 *
 *  1. **Bron**: welke Syntec-leads er geteld worden, per regel met de periode en het aantal;
 *  2. **Keuzes**: de beslissingen die tot deze definitie leidden, in gewone taal;
 *  3. **Controle**: wat de definitie over 2025 telt, × 1,2, naast het doel 2026 — zo waren
 *     de doelen gesteld, dus komt dat in de buurt, dan klopt de definitie.
 *
 * Net als bij KPI's 2027 staat dit onder elke grafiek en niet één keer onderaan de pagina:
 * een target is pas bruikbaar als iedereen weet wat er geteld wordt, en hier verschilt dat
 * per KPI én per periode (zie `lib/kpi2027syntec/definities.ts`).
 */

const VORIG_JAAR = KPI_JAAR - 1;
/** De factor waarmee het team de doelen voor 2026 uit de telling van 2025 afleidde. */
const DOELFACTOR = 1.2;

export default function KpiSyntecKaart({
  kpi,
  opslaanGroei,
}: {
  kpi: SyntecKpiRegel;
  /** Alleen bij een gewone KPI: een totaal of combinatie volgt uit zijn kaarten. */
  opslaanGroei?: (groei: number | null) => Promise<void>;
}) {
  const peildatum = datumKort(kpi.uitkomst.peildatum);
  const groei: GroeiInstelling =
    opslaanGroei && kpi.onderdeelSleutels.length === 0
      ? { soort: "bewerkbaar", aangepast: kpi.groeiAangepast, opslaan: opslaanGroei }
      : { soort: "afgeleid" };

  return (
    <KpiKaartOpmaak naam={kpi.naam} uitkomst={kpi.uitkomst} realisatie={kpi.realisatie} groei={groei}>
      <p>
        <span className="text-ink-muted">Bron:</span> Syntec, sheet-tabblad Data leads. Alleen leads met kanaalgroep
        Internet, geteld op de datum Aangelegd ({KPI_JAAR} t/m {peildatum}).
      </p>

      <p className="mt-2 text-ink-muted">Wat telt mee</p>
      {kpi.onderdelen.length > 0 ? (
        <p className="mt-0.5">De som van {kpi.onderdelen.join(", ")}.</p>
      ) : (
        <ul className="mt-0.5 flex flex-col gap-0.5">
          {kpi.bron.map((b) => (
            <li key={b.tekst} className="flex gap-1.5">
              <span aria-hidden="true">•</span>
              <span>
                {b.tekst}
                {b.periode ? ` — ${b.periode}` : ""} ({aantal(b.aantal)}×)
              </span>
            </li>
          ))}
        </ul>
      )}

      {kpi.keuzes.length > 0 && (
        <>
          <p className="mt-2 text-ink-muted">Keuzes in de definitie</p>
          <ul className="mt-0.5 flex flex-col gap-0.5">
            {kpi.keuzes.map((k) => (
              <li key={k} className="flex gap-1.5">
                <span aria-hidden="true">•</span>
                <span>{k}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="mt-2">
        <span className="text-ink-muted">Controle:</span>{" "}
        {kpi.vorigJaar !== null ? (
          <>
            met deze definitie telde {VORIG_JAAR} {aantal(kpi.vorigJaar)} leads; × {String(DOELFACTOR).replace(".", ",")}{" "}
            = {aantal(kpi.vorigJaar * DOELFACTOR)}. Het doel {KPI_JAAR} was {aantal(kpi.doel2026)} (de doelen waren de
            telling van {VORIG_JAAR} + 20%).
          </>
        ) : (
          <>het doel {KPI_JAAR} was {aantal(kpi.doel2026)}.</>
        )}
      </p>
    </KpiKaartOpmaak>
  );
}

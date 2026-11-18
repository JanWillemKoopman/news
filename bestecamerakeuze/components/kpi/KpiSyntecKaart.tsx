"use client";

import { KpiKaartOpmaak, aantal, datumKort } from "@/components/kpi/KpiKaart";
import { KPI_JAAR } from "@/lib/kpi2027/definities";
import type { SyntecKpiRegel } from "@/lib/kpi2027syntec/rekenen";

/**
 * Eén KPI op het tabblad KPI's 2027 Syntec: dezelfde kaart als op KPI's 2027
 * (`KpiKaartOpmaak`), met daaronder welke Syntec-leads erin zitten en het doel dat het team
 * voor 2026 had gesteld.
 *
 * Net als bij KPI's 2027 staat de bron onder elke grafiek: een target is pas bruikbaar als
 * iedereen weet wat er geteld wordt, en hier verschilt dat per KPI én per periode (het
 * nieuwe kanaal Udenhout.nl sinds april 2026, zie `lib/kpi2027syntec/definities.ts`).
 */
export default function KpiSyntecKaart({ kpi }: { kpi: SyntecKpiRegel }) {
  const peildatum = datumKort(kpi.uitkomst.peildatum);

  return (
    <KpiKaartOpmaak naam={kpi.naam} uitkomst={kpi.uitkomst}>
      <p>
        <span className="text-ink-muted">Bron:</span> Syntec, tabblad Data leads, kanaalgroep Internet, op datum
        Aangelegd.{" "}
        {kpi.onderdelen.length > 0 ? (
          <>De som van {kpi.onderdelen.join(", ")}.</>
        ) : (
          <>
            Leads {KPI_JAAR} t/m {peildatum}:{" "}
            {kpi.bron.map((b, i) => (
              <span key={b.tekst}>
                {i > 0 && " + "}
                {b.tekst} ({aantal(b.aantal)}×)
              </span>
            ))}
            .
          </>
        )}
      </p>
      <p className="mt-1">
        Doel {KPI_JAAR} was {aantal(kpi.doel2026)}.{kpi.opmerking ? ` ${kpi.opmerking}` : ""}
      </p>
    </KpiKaartOpmaak>
  );
}

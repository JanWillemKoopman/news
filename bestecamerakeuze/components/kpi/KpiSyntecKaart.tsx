"use client";

import { KpiKaartOpmaak, aantal, datumKort, type GroeiInstelling } from "@/components/kpi/KpiKaart";
import { KPI_DOELJAAR, KPI_JAAR } from "@/lib/kpi2027/definities";
import type { SyntecKpiRegel } from "@/lib/kpi2027syntec/rekenen";
import { SYNTEC_KPIS } from "@/lib/kpi2027syntec/definities";

/**
 * Eén KPI op het tabblad KPI's 2027 Syntec: dezelfde kaart als op KPI's 2027
 * (`KpiKaartOpmaak`), met daaronder volledig uitgeschreven waar je naar kijkt:
 *
 *  1. **Grafiek**: wat de lijnen zijn (2026 geteld/verwachting/bijgeschat, het maandtarget);
 *  2. **Bron**: uit welk systeem, welke leads (kanaalgroep Internet) en op welke datum geteld;
 *  3. **Wat telt mee**: per regel kanaal + onderwerp, met de periode en het aantal — bij een
 *     totaal of combinatie welke KPI's erin zitten;
 *  4. **Keuzes**: de beslissingen die tot deze definitie leidden, in gewone taal;
 *  5. **Controle**: wat de definitie over 2025 telt, × 1,2, naast het doel 2026 — zo waren
 *     de doelen gesteld, dus komt dat in de buurt, dan klopt de definitie.
 *
 * Net als bij KPI's 2027 staat dit onder elke grafiek en niet één keer onderaan de pagina:
 * een target is pas bruikbaar als iedereen weet wat er geteld wordt, en hier verschilt dat
 * per KPI én per periode (zie `lib/kpi2027syntec/definities.ts`).
 */

const VORIG_JAAR = KPI_JAAR - 1;
/** De factor waarmee het team de doelen voor 2026 uit de telling van 2025 afleidde. */
const DOELFACTOR = 1.2;

/** "2026-04-01" → "1 april 2026". */
function datumLang(datum: string): string {
  return new Date(`${datum}T00:00:00Z`).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function KpiSyntecKaart({
  kpi,
  toonEerdereJaren = false,
  opslaanGroei,
}: {
  kpi: SyntecKpiRegel;
  /** De schakelaar "Eerdere jaren" (`EerdereJaren.tsx`): zonder staan 2024 en 2025 er niet in. */
  toonEerdereJaren?: boolean;
  /** Alleen bij een gewone KPI: een totaal of combinatie volgt uit zijn kaarten. */
  opslaanGroei?: (groei: number | null) => Promise<void>;
}) {
  const peildatum = datumKort(kpi.uitkomst.peildatum);
  /** Een totaal of combinatie: de som van andere kaarten, zonder eigen regels. */
  const isSom = kpi.onderdeelSleutels.length > 0;
  /** Rekent deze KPI (of een KPI in dit totaal) pas vanaf een latere datum? Dan "1 april 2026". */
  const meetVanaf = SYNTEC_KPIS.find(
    (k) => k.meetVanaf && (k.sleutel === kpi.sleutel || kpi.onderdeelSleutels.includes(k.sleutel)),
  )?.meetVanaf;
  const vanafApril = meetVanaf ? datumLang(meetVanaf) : null;
  const groei: GroeiInstelling =
    opslaanGroei && kpi.onderdeelSleutels.length === 0
      ? { soort: "bewerkbaar", aangepast: kpi.groeiAangepast, opslaan: opslaanGroei }
      : { soort: "afgeleid" };

  return (
    <KpiKaartOpmaak
      naam={kpi.naam}
      uitkomst={kpi.uitkomst}
      realisatie={kpi.realisatie}
      groei={groei}
      vergelijking={toonEerdereJaren ? kpi.eerdereJaren : null}
    >
      <p>
        <span className="text-ink-muted">Grafiek:</span>{" "}
        {isSom ? `de optelsom van ${kpi.onderdelen.length} KPI's (zie hieronder): ` : ""}per maand het aantal leads uit
        Syntec in {KPI_JAAR}. De doorgetrokken lijn is volledig geteld; de gestippelde lijn is (deels) verwachting
        {vanafApril ? ` of bijgeschat (januari t/m maart, met het gemiddelde vanaf ${vanafApril})` : ""}. De vlakke lijn
        is het maandtarget {KPI_DOELJAAR} (het jaartarget ÷ 12). De realisatie van {KPI_DOELJAAR} staat in het vierde
        kaartje, niet in de grafiek.
      </p>

      <p className="mt-1">
        <span className="text-ink-muted">Bron:</span> Syntec, via de Google Sheet (tabblad Data leads, elke nacht
        ingelezen). Alleen leads met Kanaalgroep ‘Internet’, per maand geteld op de datum waarop de lead in Syntec is
        aangelegd (kolom Aangelegd). Elke lead telt bij hoogstens één KPI; Kanaal en Onderwerp hieronder zijn de
        kolommen uit Syntec.
      </p>

      <p className="mt-2 text-ink-muted">
        Wat telt mee — leads {vanafApril && !isSom ? `vanaf ${vanafApril}` : KPI_JAAR} t/m {peildatum}
      </p>
      {isSom ? (
        <p className="mt-0.5">
          De leads van {kpi.onderdelen.join(", ")} bij elkaar opgeteld, elk met de definitie die onder zijn eigen kaart
          staat. Verwachting, target en realisatie zijn de som van die kaarten.
        </p>
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
        <span className="text-ink-muted">Controle op de definitie:</span>{" "}
        {kpi.vorigJaar !== null ? (
          <>
            met deze definitie telde heel {VORIG_JAAR} {aantal(kpi.vorigJaar)} leads; ×{" "}
            {String(DOELFACTOR).replace(".", ",")} = {aantal(kpi.vorigJaar * DOELFACTOR)}. Het doel {KPI_JAAR} was{" "}
            {aantal(kpi.doel2026)}: de doelen voor {KPI_JAAR} zijn destijds gesteld als de telling van {VORIG_JAAR} + 20%.
            Liggen die twee getallen dicht bij elkaar, dan telt deze definitie hetzelfde als waarop het doel is
            gebaseerd; een groot verschil wordt bij de keuzes{isSom ? " van de losse KPI's" : ""} verklaard. Dit is
            alleen een controle en telt niet mee in de verwachting of het target.
          </>
        ) : (
          <>het doel {KPI_JAAR} was {aantal(kpi.doel2026)}. Dit telt niet mee in de verwachting of het target.</>
        )}
      </p>
      {toonEerdereJaren && kpi.eerdereJaren.length > 0 && (
        <p className="mt-1">
          <span className="text-ink-muted">Dunne lijnen {kpi.eerdereJaren.map((j) => j.jaar).join(" en ")}:</span>{" "}
          dezelfde definitie over het hele jaar, per maand zoals gemeten (zonder bijschatting) ({kpi.eerdereJaren.map((j) => `${j.jaar}: ${aantal(j.totaal)}`).join(", ")}).
          Ze tellen nergens mee: ze staan er om {KPI_JAAR} naast te leggen.
        </p>
      )}
    </KpiKaartOpmaak>
  );
}

"use client";

import type { ReactNode } from "react";
import KpiJaarGrafiek, { type VergelijkLijn } from "@/components/kpi/KpiJaarGrafiek";
import { formatteer } from "@/components/chat/chartTheme";
import { STANDAARD_GROEI_TEKST, groeiTekst, useGroeiBewerken } from "@/components/kpi/GroeiBewerken";
import { KPI_DOELJAAR, KPI_JAAR } from "@/lib/kpi2027/definities";
import type { KpiOverzichtRegel, KpiUitkomst, WebsiteOverzicht } from "@/lib/kpi2027/rekenen";

/**
 * Eén KPI: bovenaan de vier getallen waar het overleg om draait (2026 inclusief
 * verwachting, het target voor 2027, de groei in procenten en de realisatie van 2027),
 * daaronder de jaargrafiek en in kleine letters welke GA4-cijfers erin zitten.
 *
 * De bron staat onder elke grafiek en niet één keer onderaan de pagina: een target is pas
 * bruikbaar als iedereen weet wat er precies geteld wordt, en de events verschillen per
 * KPI, per website en per periode — zie `lib/kpi2027/definities.ts`.
 */

export function datumKort(datum: string): string {
  return new Date(`${datum}T00:00:00Z`).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** De dag na `datum` (YYYY-MM-DD). */
function dagNa(datum: string): string {
  const d = new Date(`${datum}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function aantal(waarde: number): string {
  return formatteer(Math.round(waarde), "aantal");
}

/** Hoe kleiner het getal, hoe meer decimalen: "0,04 per dag" zegt meer dan "0,0 per dag". */
function perDagTekst(waarde: number): string {
  const decimalen = waarde < 1 ? 2 : waarde < 10 ? 1 : 0;
  return waarde.toLocaleString("nl-NL", { minimumFractionDigits: decimalen, maximumFractionDigits: decimalen });
}

/** Een maandtarget onder de tien op één decimaal: 1,3 per maand is geen 1 per maand. */
function perMaandTekst(waarde: number): string {
  return waarde < 10
    ? waarde.toLocaleString("nl-NL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    : aantal(waarde);
}

/**
 * Hoe de groei op een kaart aan te passen is:
 *  - `bewerkbaar`: klikken en een ander percentage typen; `opslaan(null)` = terug naar +5%;
 *  - `afgeleid`: een totaal, waarvan het percentage volgt uit de kaarten erin.
 */
export type GroeiInstelling =
  | { soort: "bewerkbaar"; aangepast: boolean; opslaan: (groei: number | null) => Promise<void> }
  | { soort: "afgeleid" };

export default function KpiKaart({
  kpi,
  website,
  opslaanGroei,
}: {
  kpi: KpiOverzichtRegel;
  website: WebsiteOverzicht;
  opslaanGroei: (groei: number | null) => Promise<void>;
}) {
  const u = kpi.uitkomst;
  // Een andere bron vervangt GA4 (Porsche-werkplaats) of telt erbij op (udenhoutlease.nl).
  const vervangend = kpi.externeBron && !kpi.externeBron.optellen ? kpi.externeBron : null;
  const opgeteld = kpi.externeBron?.optellen ? kpi.externeBron : null;

  return (
    <KpiKaartOpmaak
      naam={kpi.naam}
      uitkomst={u}
      realisatie={kpi.realisatie}
      groei={{ soort: "bewerkbaar", aangepast: kpi.groeiAangepast, opslaan: opslaanGroei }}
      vergelijking={kpi.vergelijking}
    >
      {vervangend && (
        <p className="mb-1">
          <span className="text-ink-muted">Bron t/m {datumKort(vervangend.tot)}:</span> {vervangend.omschrijving}{" "}
          ({aantal(vervangend.aantal)} {vervangend.eenheid} in {KPI_JAAR}). Die dagen zijn gemeten, ook waar de website niets mat.
        </p>
      )}
      {opgeteld && (
        <p className="mb-1">
          <span className="text-ink-muted">Opgeteld t/m {datumKort(opgeteld.tot)}:</span> {opgeteld.omschrijving}{" "}
          ({aantal(opgeteld.aantal)} {opgeteld.eenheid} in {KPI_JAAR}, vaste cijfers). Komt bovenop de bron hieronder, niet in
          plaats ervan.
        </p>
      )}
      <p>
        <span className="text-ink-muted">{vervangend ? `Bron vanaf ${datumKort(dagNa(vervangend.tot))}:` : "Bron:"}</span>{" "}
        Google Analytics 4, {website.domein} (property {website.property}
        {website.uitgeslotenHosts.length > 0 ? `, zonder ${website.uitgeslotenHosts.join(" en ")}` : ""}).{" "}
        {kpi.events.length > 0 ? (
          <>
            Events (aantal keer gevuurd, event_count, {vervangend ? `vanaf ${datumKort(dagNa(vervangend.tot))}` : KPI_JAAR}
            {u ? ` t/m ${datumKort(u.peildatum)}` : ""}):{" "}
            {kpi.events.map((e, i) => (
              <span key={`${e.naam}${e.paginaBevat ?? ""}`}>
                {i > 0 && " + "}
                <code className="font-mono text-ink-muted">{e.naam}</code>
                {` (${e.toelichting ? `${e.toelichting}, ` : ""}${aantal(e.aantal)}×)`}
              </span>
            ))}
            .
          </>
        ) : (
          kpi.bronTekst
        )}
      </p>
      {kpi.opmerking && <p className="mt-1">{kpi.opmerking}</p>}
      {kpi.vergelijking && (
        <p className="mt-1">
          <span className="text-ink-muted">Lijn {kpi.vergelijking.jaar}:</span> dezelfde bron over heel{" "}
          {kpi.vergelijking.jaar}, zoals gemeten: {aantal(kpi.vergelijking.totaal)}
          {(kpi.vergelijking.events.length > 0 || kpi.vergelijking.extern) && (
            <>
              {" "}(
              {kpi.vergelijking.extern && (
                <>
                  {kpi.vergelijking.extern.naam} {aantal(kpi.vergelijking.extern.aantal)}
                  {kpi.vergelijking.events.length > 0 && " + "}
                </>
              )}
              {kpi.vergelijking.events.map((e, i) => (
                <span key={`${e.naam}${e.paginaBevat ?? ""}`}>
                  {i > 0 && " + "}
                  <code className="font-mono text-ink-muted">{e.naam}</code> {aantal(e.aantal)}×
                </span>
              ))}
              )
            </>
          )}
          . Telt niet mee in het target.
        </p>
      )}
      {kpi.zonderVergelijking && <p className="mt-1">{kpi.zonderVergelijking}</p>}
    </KpiKaartOpmaak>
  );
}

/**
 * De kaart zelf — kop, de vier kaartjes en de jaargrafiek — met de bronregel als
 * `children`. Ook gebruikt door KPI's 2027 Syntec (`KpiSyntecKaart.tsx`), zodat beide
 * tabbladen er precies hetzelfde uitzien en alleen de bron eronder verschilt.
 */
export function KpiKaartOpmaak({
  naam,
  uitkomst: u,
  realisatie,
  groei,
  vergelijking = null,
  children,
}: {
  naam: string;
  /** Null als er voor 2026 nog niets te rekenen valt. */
  uitkomst: KpiUitkomst | null;
  /** De realisatie van 2027: 0 met `peildatum: null` zolang 2027 niet begonnen is. */
  realisatie: { waarde: number; peildatum: string | null };
  /** Zonder: het percentage staat er alleen. */
  groei?: GroeiInstelling;
  /** Optioneel: een eerder jaar als extra lijn in de grafiek (udenhout.nl: 2025). */
  vergelijking?: VergelijkLijn | null;
  children: ReactNode;
}) {
  return (
    <section className="kaart-omlijst flex flex-col rounded-panel border border-line bg-card px-5 py-4 shadow-subtle">
      <header className="flex items-baseline justify-between gap-4">
        <h2 className="font-sans-w7 text-cell font-semibold text-ink">{naam}</h2>
        {u && (
          <p className="text-right text-meta text-ink-muted">
            gemiddeld {perDagTekst(u.perDag)} per dag
            {u.dagenNietGemeten > 0 ? ` (over ${u.dagenGemeten} gemeten dagen)` : ""}
          </p>
        )}
      </header>

      {u ? (
        <>
          <div className="mt-3 grid grid-cols-4 gap-2.5">
            <Statistiek
              label={u.definitief ? `${KPI_JAAR}` : `${KPI_JAAR} incl. verwachting`}
              waarde={aantal(u.verwacht)}
              toelichting={
                u.definitief && u.dagenBijgeschat === 0
                  ? "volledig gemeten"
                  : `${aantal(u.gerealiseerd)} gemeten${u.definitief ? "" : ` t/m ${datumKort(u.peildatum)}`} · ${aantal(u.bijgeschat)} ${u.dagenNietGemeten > 0 ? "bijgeschat" : "verwacht"}`
              }
            />
            <Statistiek
              label={`Target ${KPI_DOELJAAR}`}
              waarde={aantal(u.target)}
              toelichting={`${perMaandTekst(u.targetPerMaand)} per maand`}
              nadruk
            />
            <GroeiStatistiek uitkomst={u} instelling={groei} />
            <Statistiek
              label={`Realisatie ${KPI_DOELJAAR}`}
              waarde={aantal(realisatie.waarde)}
              toelichting={
                realisatie.peildatum
                  ? `t/m ${datumKort(realisatie.peildatum)} · ${u.target > 0 ? formatteer((realisatie.waarde / u.target) * 100, "procent") : "—"} van het target`
                  : `${KPI_DOELJAAR} is nog niet begonnen`
              }
            />
          </div>

          <div className="mt-4 h-56">
            <KpiJaarGrafiek
              maanden={u.maanden}
              targetPerMaand={u.targetPerMaand}
              peildatumTekst={datumKort(u.peildatum)}
              vergelijking={vergelijking}
            />
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-ink-muted">Nog geen stand voor deze website.</p>
      )}

      <footer className="mt-3 border-t border-line-soft pt-2.5 text-meta text-ink-faint">{children}</footer>
    </section>
  );
}

function Statistiek({
  label,
  waarde,
  toelichting,
  nadruk = false,
}: {
  label: string;
  waarde: string;
  toelichting: string;
  nadruk?: boolean;
}) {
  return (
    <div
      className={`flex flex-col gap-1 rounded-card border px-3 py-2.5 ${
        nadruk ? "border-primary bg-primary-light" : "border-line bg-surface-tint"
      }`}
    >
      <span className="label-theme text-label text-ink-faint">{label}</span>
      <span className="font-sans-w7 text-cell font-bold text-ink">{waarde}</span>
      <span className="text-meta text-ink-muted">{toelichting}</span>
    </div>
  );
}

/**
 * Het kaartje Groei. Bij een gewone KPI klik je op het percentage en typ je een ander
 * getal (`useGroeiBewerken`, hetzelfde gedrag als in de overzichtstabel). Het target, het
 * maandtarget en de lijn in de grafiek rekenen meteen mee (de ouder past de uitkomst aan
 * met `metGroei`).
 */
function GroeiStatistiek({ uitkomst: u, instelling }: { uitkomst: KpiUitkomst; instelling?: GroeiInstelling }) {
  const verschil = `${u.target - u.verwacht >= 0 ? "+" : "−"}${aantal(Math.abs(u.target - u.verwacht))} t.o.v. ${KPI_JAAR}`;

  if (instelling?.soort !== "bewerkbaar") {
    return (
      <Statistiek
        label="Groei"
        waarde={groeiTekst(u.groei)}
        toelichting={instelling?.soort === "afgeleid" ? `${verschil} · som van de kaarten` : verschil}
      />
    );
  }
  return <BewerkbareGroei uitkomst={u} instelling={instelling} verschil={verschil} />;
}

function BewerkbareGroei({
  uitkomst: u,
  instelling,
  verschil,
}: {
  uitkomst: KpiUitkomst;
  instelling: Extract<GroeiInstelling, { soort: "bewerkbaar" }>;
  verschil: string;
}) {
  const { bewerken, bezig, fout, begin, terugzetten, invoerProps } = useGroeiBewerken(u.groei, instelling.opslaan);

  return (
    <div
      className={`flex flex-col gap-1 rounded-card border px-3 py-2.5 ${
        instelling.aangepast ? "border-primary bg-surface-tint" : "border-line bg-surface-tint"
      }`}
    >
      <span className="label-theme text-label text-ink-faint">
        Groei{instelling.aangepast ? " · aangepast" : ""}
      </span>
      {bewerken ? (
        <span className="flex items-center gap-1">
          <input
            {...invoerProps}
            className="w-16 rounded-control border border-primary bg-card px-1.5 py-0.5 font-sans-w7 text-cell font-bold text-ink outline-none"
          />
          <span className="font-sans-w7 text-cell font-bold text-ink">%</span>
        </span>
      ) : (
        <button
          type="button"
          onClick={begin}
          title="Klik om het groeipercentage aan te passen"
          className="-mx-1 w-fit rounded-control px-1 text-left font-sans-w7 text-cell font-bold text-ink underline decoration-dotted decoration-ink-faint underline-offset-4 transition-colors duration-[var(--duur-snel)] ease-merk hover:bg-card"
        >
          {groeiTekst(u.groei)}
        </button>
      )}
      <span className={`text-meta ${fout ? "text-negative" : "text-ink-muted"}`}>
        {fout ?? (bezig ? "Opslaan…" : verschil)}
      </span>
      {instelling.aangepast && !bewerken && !bezig && (
        <button
          type="button"
          onClick={terugzetten}
          className="w-fit text-meta text-ink-muted underline underline-offset-2 hover:text-ink"
        >
          terug naar {STANDAARD_GROEI_TEKST}
        </button>
      )}
    </div>
  );
}

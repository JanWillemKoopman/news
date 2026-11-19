"use client";

import { useState, type ReactNode } from "react";
import KpiJaarGrafiek, { type VergelijkLijn } from "@/components/kpi/KpiJaarGrafiek";
import KanaalGrafiek from "@/components/kpi/KanaalGrafiek";
import type { KanalenAntwoord } from "@/lib/kpi2027/kanalen";
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

/** De kanaalverdeling van de hele website, één keer opgehaald voor alle kaarten. */
export interface KanalenStand {
  status: "leeg" | "laden" | "klaar" | "fout";
  antwoord: KanalenAntwoord | null;
  /** Haalt de verdeling op als dat nog niet gebeurd is; meteen terug als hij er al is. */
  laad: () => void;
}

export default function KpiKaart({
  kpi,
  website,
  opslaanGroei,
  kanalen,
}: {
  kpi: KpiOverzichtRegel;
  website: WebsiteOverzicht;
  opslaanGroei: (groei: number | null) => Promise<void>;
  /** Alleen bij een website met `kanaalverdeling`: dan staat het knopje "Kanalen" erop. */
  kanalen?: KanalenStand;
}) {
  const u = kpi.uitkomst;
  const kanaalReeks = kanalen?.antwoord?.kpis?.[kpi.sleutel];
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
      wissel={
        kanalen
          ? {
              label: "Kanalen",
              titel: "Wissel naar het aandeel per kanaal per maand, vanaf januari 2025",
              bijOpenen: kanalen.laad,
              inhoud:
                kanalen.status === "klaar" && kanaalReeks && kanalen.antwoord?.peildatum ? (
                  <KanaalGrafiek
                    kanalen={kanaalReeks}
                    peildatum={kanalen.antwoord.peildatum}
                    peildatumTekst={datumKort(kanalen.antwoord.peildatum)}
                    eenheid={kpi.naam.toLowerCase()}
                  />
                ) : kanalen.status === "fout" ? (
                  <p className="flex h-full items-center justify-center px-6 text-center text-sm text-negative">
                    De kanaalverdeling kon niet worden opgehaald: {kanalen.antwoord?.fout ?? "onbekende fout"}
                  </p>
                ) : (
                  <p className="flex h-full items-center justify-center px-6 text-center text-sm text-ink-muted">
                    Kanaalverdeling ophalen… De allereerste keer haalt het dashboard hem bij Google Analytics op; dat
                    kan een minuut duren.
                  </p>
                ),
              toelichting: (
                <p className="mb-1">
                  <span className="text-ink-muted">Kanalen:</span> per maand het aandeel per kanaal, op GA4&apos;s
                  sessiebron/medium, januari 2025 t/m{" "}
                  {kanalen.antwoord?.peildatum ? datumKort(kanalen.antwoord.peildatum) : "de laatste zaterdag"} (de lopende maand
                  lichter). Ga met de muis over een kanaal in de legenda voor wat erin zit.
                  {kpi.sleutel === "gebruikers"
                    ? " Een gebruiker die in dezelfde maand via twee kanalen kwam, telt in allebei."
                    : ""}
                  {opgeteld
                    ? ` De aanvragen uit ${opgeteld.naam} zitten er niet in: dat is een andere GA4-property, de verdeling gaat alleen over ${website.domein}.`
                    : ""}
                </p>
              ),
            }
          : undefined
      }
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
  wissel,
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
  /**
   * Optioneel: een klein knopje rechtsboven dat de grafiek op dezelfde plek vervangt door
   * een andere (de kanaalverdeling op KPI's 2027 GA). De rest van de kaart blijft staan.
   */
  wissel?: GrafiekWissel;
  children: ReactNode;
}) {
  const [toonWissel, setToonWissel] = useState(false);
  return (
    <section className="kaart-omlijst flex flex-col rounded-panel border border-line bg-card px-5 py-4 shadow-subtle">
      <header className="flex items-baseline justify-between gap-4">
        <h2 className="font-sans-w7 text-cell font-semibold text-ink">{naam}</h2>
        <div className="flex items-center gap-3">
          {u && !toonWissel && (
            <p className="text-right text-meta text-ink-muted">
              gemiddeld {perDagTekst(u.perDag)} per dag
              {u.dagenNietGemeten > 0 ? ` (over ${u.dagenGemeten} gemeten dagen)` : ""}
            </p>
          )}
          {u && wissel && (
            <WisselKnop
              label={wissel.label}
              titel={wissel.titel}
              aan={toonWissel}
              zet={(aan) => {
                setToonWissel(aan);
                if (aan) wissel.bijOpenen?.();
              }}
            />
          )}
        </div>
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
            {toonWissel && wissel ? (
              wissel.inhoud
            ) : (
              <KpiJaarGrafiek
                maanden={u.maanden}
                targetPerMaand={u.targetPerMaand}
                peildatumTekst={datumKort(u.peildatum)}
                vergelijking={vergelijking}
              />
            )}
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-ink-muted">Nog geen stand voor deze website.</p>
      )}

      <footer className="mt-3 border-t border-line-soft pt-2.5 text-meta text-ink-faint">
        {toonWissel && wissel?.toelichting}
        {children}
      </footer>
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

/** Een andere grafiek op dezelfde plek, achter een klein knopje rechtsboven in de kaart. */
export interface GrafiekWissel {
  /** Naast het knopje: "Kanalen". */
  label: string;
  /** Uitleg bij de muis. */
  titel: string;
  /** Bij het aanzetten, bijvoorbeeld om de data op te halen. */
  bijOpenen?: () => void;
  inhoud: ReactNode;
  /** Bovenaan de voetregel zolang de andere grafiek in beeld is. */
  toelichting?: ReactNode;
}

/** Een klein schuifje met een label ervoor; bewust onopvallend, het is een tweede blik. */
function WisselKnop({
  label,
  titel,
  aan,
  zet,
}: {
  label: string;
  titel: string;
  aan: boolean;
  zet: (aan: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={aan}
      title={titel}
      onClick={() => zet(!aan)}
      className="flex shrink-0 items-center gap-1.5 rounded-control px-1 py-0.5 text-meta text-ink-muted transition-colors duration-[var(--duur-snel)] ease-merk hover:text-ink"
    >
      {label}
      <span
        aria-hidden="true"
        className={`relative inline-block h-3.5 w-6 rounded-pill transition-colors duration-[var(--duur-snel)] ease-merk ${
          aan ? "bg-primary" : "bg-line"
        }`}
      >
        <span
          className={`absolute top-0.5 h-2.5 w-2.5 rounded-pill bg-card shadow-subtle transition-transform duration-[var(--duur-snel)] ease-merk ${
            aan ? "translate-x-3" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}

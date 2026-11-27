"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { useGrafiekKleuren } from "@/components/ThemeProvider";
import { AS_GROOTTE } from "@/components/chat/chartTheme";
import ProgressBar from "@/components/ProgressBar";
import {
  budgetAandeel,
  campagnesTotaal,
  kanaalAandelen,
  maandKort,
  maandNaam,
  maandrapportForecast,
  sorteerCampagnes,
  trendPunten,
  volgendeMaand,
} from "@/lib/marketingAnalyse/maandrapport";
import { formatWaarde, vergelijkingVerschil, type VergelijkingOordeel } from "@/lib/marketingAnalyse/rekenen";
import type { Eenheid, MaMaandrapport, MrBedrijf, MrCampagne, MrSocialKanaal, MrTegel, MrUitsplitsing, MrWaarde } from "@/lib/marketingAnalyse/types";

/**
 * Het Maandrapport (formaat 4, opzet "Maandrapport Jana"): een tabblad per bedrijf met precies
 * dezelfde opzet, alleen resultaten. Geen samenvatting, oordeel of advies; elk cijfer staat naast dat van
 * de maand ervoor. Het eerste bedrijf staat open.
 */

const VERSCHIL_KLEUR: Record<VergelijkingOordeel, string> = {
  gunstig: "text-positive",
  ongunstig: "text-negative",
  neutraal: "text-ink-muted",
};

/** Het verschil met de vorige maand: pijl, percentage (procentpunt bij een percentage) en de maand. */
function Verschil({
  w,
  eenheid,
  vorigeMaand,
  hogerIsBeter,
  kort = false,
}: {
  w: MrWaarde;
  eenheid: Eenheid;
  vorigeMaand: string;
  /** true = stijging is goed (leads), false = daling is goed (kosten per lead), weglaten = neutraal (uitgaven). */
  hogerIsBeter?: boolean;
  kort?: boolean;
}) {
  const v = vergelijkingVerschil(w.waarde, { label: vorigeMaand, waarde: w.vorige ?? null, hogerIsBeter }, eenheid);
  if (!v) return <span className="text-meta text-ink-faint">{kort ? "—" : `geen cijfer voor ${vorigeMaand}`}</span>;
  const pijl = v.richting === "hoger" ? "↑" : v.richting === "lager" ? "↓" : "→";
  return (
    <span className={`whitespace-nowrap text-meta tabular-nums ${VERSCHIL_KLEUR[v.oordeel]}`}>
      {pijl} {v.tekst === "gelijk" ? "gelijk" : v.tekst}
      {!kort && <span className="text-ink-faint"> t.o.v. {vorigeMaand}</span>}
    </span>
  );
}

/** Een kleine lijn zonder assen: de maandreeks onder een tegel. */
function Sparkline({ x, waarden }: { x: string[]; waarden: (number | null)[] }) {
  const kleuren = useGrafiekKleuren();
  if (waarden.filter((w) => w !== null).length < 2) return <div className="h-10" />;
  const data = x.map((m, i) => ({ m, w: waarden[i] }));
  return (
    <div className="h-10" aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 2, bottom: 2, left: 2 }}>
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Line
            dataKey="w"
            type={kleuren.lijnvorm}
            stroke={kleuren.categorieen[0]}
            strokeWidth={kleuren.lijndikte}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** De uitsplitsing als lijstje: label, waarde en het verschil met de vorige maand. */
function UitsplitsingLijst({ regels, eenheid, vorigeMaand }: { regels: MrUitsplitsing[]; eenheid: Eenheid; vorigeMaand: string }) {
  return (
    <ul className="flex flex-col gap-1">
      {regels.map((u) => (
        <li key={u.label} className="flex items-baseline justify-between gap-4 text-meta">
          <span className="text-ink-muted">{u.label}</span>
          <span className="flex items-baseline gap-2 tabular-nums">
            <span className="font-semibold text-ink">{formatWaarde(u.waarde, eenheid)}</span>
            <Verschil w={u} eenheid={eenheid} vorigeMaand={vorigeMaand} kort />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Een popover die opent bij hover of toetsenbordfocus; de inhoud staat altijd in de DOM (screenreader). */
function HoverUitleg({ titel, children, popover }: { titel: string; children: ReactNode; popover: ReactNode }) {
  return (
    <div className="group relative outline-none" tabIndex={0} aria-label={titel}>
      {children}
      <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 hidden w-72 rounded-card border border-line bg-card p-3 shadow-dropdown group-hover:block group-focus-visible:block group-focus-within:block">
        <p className="label-theme mb-2 text-label text-ink-faint">{titel}</p>
        {popover}
      </div>
    </div>
  );
}

function Tegel({
  titel,
  eenheid = "aantal",
  tegel,
  vorigeMaand,
  hogerIsBeter,
  uitsplitsing,
  uitsplitsingTitel,
}: {
  titel: string;
  eenheid?: Eenheid;
  tegel: MrTegel;
  vorigeMaand: string;
  hogerIsBeter?: boolean;
  /** `hover`: de uitsplitsing verschijnt bij een muis erover; `zichtbaar`: klein onder het cijfer. */
  uitsplitsing: "hover" | "zichtbaar" | "geen";
  uitsplitsingTitel?: string;
}) {
  const heeftUitsplitsing = (tegel.uitsplitsing?.length ?? 0) > 0;
  const kern = (
    <div className="flex flex-col gap-1">
      <p className="label-theme text-label text-ink-faint">{titel}</p>
      {tegel.nietGemeten ? (
        <p className="py-2 text-sm text-ink-muted">{tegel.nietGemeten}</p>
      ) : (
        <>
          <p className="font-sans-w7 text-title font-bold tabular-nums text-ink">{formatWaarde(tegel.waarde, eenheid)}</p>
          <Verschil w={tegel} eenheid={eenheid} vorigeMaand={vorigeMaand} hogerIsBeter={hogerIsBeter} />
          {tegel.reeks && <Sparkline x={tegel.reeks.x} waarden={tegel.reeks.waarden} />}
        </>
      )}
    </div>
  );
  return (
    <section className="flex flex-col gap-2 rounded-card border border-line bg-card px-5 py-4 shadow-subtle">
      {uitsplitsing === "hover" && heeftUitsplitsing && !tegel.nietGemeten ? (
        <HoverUitleg
          titel={uitsplitsingTitel ?? "Uitsplitsing"}
          popover={<UitsplitsingLijst regels={tegel.uitsplitsing ?? []} eenheid={eenheid} vorigeMaand={vorigeMaand} />}
        >
          {kern}
          <p className="mt-1 text-meta text-ink-faint underline decoration-dotted underline-offset-2">Beweeg erover voor de uitsplitsing</p>
        </HoverUitleg>
      ) : (
        kern
      )}
      {uitsplitsing === "zichtbaar" && heeftUitsplitsing && !tegel.nietGemeten && (
        <div className="border-t border-line-soft pt-2">
          <UitsplitsingLijst regels={tegel.uitsplitsing ?? []} eenheid={eenheid} vorigeMaand={vorigeMaand} />
        </div>
      )}
      {tegel.toelichting && <p className="text-meta text-ink-faint">{tegel.toelichting}</p>}
    </section>
  );
}

function UitgavenTegel({ b, vorigeMaand, maand }: { b: MrBedrijf; vorigeMaand: string; maand: string }) {
  const u = b.uitgaven;
  const aandeel = budgetAandeel(u.jaarTotaal, u.jaarbudget);
  const jaar = maand.slice(0, 4);
  const kern = (
    <div className="flex flex-col gap-1">
      <p className="label-theme text-label text-ink-faint">Uitgaven advertentiecampagnes</p>
      {u.nietGemeten ? (
        <p className="py-2 text-sm text-ink-muted">{u.nietGemeten}</p>
      ) : (
        <>
          <p className="font-sans-w7 text-title font-bold tabular-nums text-ink">{formatWaarde(u.waarde, "euro")}</p>
          <Verschil w={u} eenheid="euro" vorigeMaand={vorigeMaand} />
        </>
      )}
    </div>
  );
  return (
    <section className="flex flex-col gap-3 rounded-card border border-line bg-card px-5 py-4 shadow-subtle">
      {(u.uitsplitsing?.length ?? 0) > 0 && !u.nietGemeten ? (
        <HoverUitleg
          titel="Uitgaven per platform"
          popover={<UitsplitsingLijst regels={u.uitsplitsing ?? []} eenheid="euro" vorigeMaand={vorigeMaand} />}
        >
          {kern}
          <p className="mt-1 text-meta text-ink-faint underline decoration-dotted underline-offset-2">Beweeg erover voor de platforms</p>
        </HoverUitleg>
      ) : (
        kern
      )}
      {!u.nietGemeten && (
        <div className="mt-auto flex flex-col gap-1.5 border-t border-line-soft pt-3">
          <div className="flex items-baseline justify-between gap-2 text-meta">
            <span className="text-ink-muted">Uitgegeven in {jaar}</span>
            <span className="tabular-nums text-ink-muted">
              {aandeel === null ? formatWaarde(u.jaarTotaal, "euro") : `${formatWaarde(aandeel, "procent")} van het jaarbudget`}
            </span>
          </div>
          {aandeel !== null ? (
            <>
              <ProgressBar percent={aandeel} className="h-2" />
              <p className="text-meta tabular-nums text-ink-faint">
                {formatWaarde(u.jaarTotaal, "euro")} van {formatWaarde(u.jaarbudget, "euro")} (voorlopig: uitgaven + 22%)
              </p>
            </>
          ) : (
            <p className="text-meta text-ink-faint">Nog geen jaarbudget.</p>
          )}
        </div>
      )}
    </section>
  );
}

function Kaart({ titel, children, className = "" }: { titel: string; children: ReactNode; className?: string }) {
  return (
    <section className={`flex flex-col gap-4 rounded-card border border-line bg-card px-5 py-4 shadow-subtle ${className}`}>
      <h3 className="label-theme text-label text-ink-faint">{titel}</h3>
      {children}
    </section>
  );
}

function Leeg({ children }: { children: ReactNode }) {
  return <p className="rounded-control border border-dashed border-line px-4 py-6 text-center text-sm text-ink-muted">{children}</p>;
}

/** Leads per maand met de forecast: de trend zo doorgetrokken (rechte lijn door de laatste maanden). */
function TrendForecast({ b, maand, vorigeMaand }: { b: MrBedrijf; maand: string; vorigeMaand: string }) {
  const kleuren = useGrafiekKleuren();
  const reeks = b.leads.reeks;
  const forecast = useMemo(() => (reeks ? maandrapportForecast(reeks.waarden) : null), [reeks]);
  const punten = useMemo(() => (reeks ? trendPunten(reeks.x, reeks.waarden, forecast) : []), [reeks, forecast]);
  const volgende = volgendeMaand(maand);
  const as = { fontSize: AS_GROOTTE, fill: kleuren.as };
  if (!reeks || b.leads.nietGemeten) return <Kaart titel="Trend en forecast leads"><Leeg>Geen maandcijfers om een trend te tonen.</Leeg></Kaart>;
  return (
    <Kaart titel="Trend en forecast leads">
      <div className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="h-full min-h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={punten} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={kleuren.raster} vertical={false} />
              <XAxis dataKey="x" tick={as} tickFormatter={maandKort} tickLine={false} axisLine={{ stroke: kleuren.raster }} interval="preserveStartEnd" />
              <YAxis tick={as} tickLine={false} axisLine={false} width={44} domain={[0, "auto"]} allowDecimals={false} />
              <Tooltip
                labelFormatter={(x) => maandNaam(String(x))}
                formatter={(w, naam) => [formatWaarde(w as number, "aantal"), naam === "forecast" ? "Forecast" : "Leads"]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Line dataKey="werkelijk" name="werkelijk" type="linear" stroke={kleuren.categorieen[0]} strokeWidth={kleuren.lijndikte} dot isAnimationActive={false} connectNulls />
              <Line
                dataKey="forecast"
                name="forecast"
                type="linear"
                stroke={kleuren.categorieen[0]}
                strokeWidth={kleuren.lijndikte}
                strokeDasharray="5 5"
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col justify-center gap-4">
          <div>
            <p className="text-meta text-ink-faint">Leads in {maandNaam(maand, false)}</p>
            <p className="font-sans-w7 text-title font-bold tabular-nums text-ink">{formatWaarde(b.leads.waarde, "aantal")}</p>
            <Verschil w={b.leads} eenheid="aantal" vorigeMaand={vorigeMaand} hogerIsBeter />
          </div>
          <div className="border-t border-line-soft pt-3">
            <p className="text-meta text-ink-faint">Forecast {maandNaam(volgende, false)}</p>
            {forecast ? (
              <>
                <p className="font-sans-w7 text-xl font-bold tabular-nums text-ink">
                  ± {formatWaarde(forecast.verwachting, "aantal")} <span className="text-sm font-normal text-ink-muted">leads</span>
                </p>
                <p className="mt-1 text-meta text-ink-faint">
                  Als de trend van de laatste {forecast.gebruikt} maanden zich zo voortzet (marge ± {formatWaarde(forecast.marge, "aantal")}).
                </p>
              </>
            ) : (
              <p className="text-sm text-ink-muted">Te weinig maanden voor een forecast (minstens drie).</p>
            )}
          </div>
        </div>
      </div>
    </Kaart>
  );
}

/** Cirkeldiagram: sessies per online kanaal, met het aandeel en het verschil in procentpunten. */
function Kanalen({ b, vorigeMaand }: { b: MrBedrijf; vorigeMaand: string }) {
  const kleuren = useGrafiekKleuren();
  const aandelen = useMemo(() => kanaalAandelen(b.kanalen), [b.kanalen]);
  if (aandelen.length === 0) return <Kaart titel="Prestaties per online kanaal"><Leeg>Geen sessies per kanaal.</Leeg></Kaart>;
  // Zes kleuren in het palet: de vijf grootste kanalen apart, de rest als "Overig".
  const top = aandelen.slice(0, 5);
  const rest = aandelen.slice(5);
  const regels = [
    ...top,
    ...(rest.length > 0
      ? [
          {
            kanaal: "Overig",
            sessies: rest.reduce((t, k) => t + k.sessies, 0),
            aandeel: rest.reduce((t, k) => t + k.aandeel, 0),
            vorigAandeel: rest.every((k) => k.vorigAandeel !== null) ? rest.reduce((t, k) => t + (k.vorigAandeel ?? 0), 0) : null,
            verschilPunten: null as number | null,
          },
        ]
      : []),
  ].map((k) => (k.kanaal === "Overig" && k.vorigAandeel !== null ? { ...k, verschilPunten: k.aandeel - k.vorigAandeel } : k));
  const kleurVan = (i: number, kanaal: string) => (kanaal === "Overig" ? kleuren.context : kleuren.categorieen[i % kleuren.categorieen.length]);
  const totaal = aandelen.reduce((t, k) => t + k.sessies, 0);
  return (
    <Kaart titel="Prestaties per online kanaal">
      <div className="grid items-center gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
        <div className="relative mx-auto h-44 w-44">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={regels} dataKey="sessies" nameKey="kanaal" innerRadius="64%" outerRadius="100%" stroke="none" paddingAngle={1} isAnimationActive={false}>
                {regels.map((k, i) => (
                  <Cell key={k.kanaal} fill={kleurVan(i, k.kanaal)} />
                ))}
              </Pie>
              <Tooltip formatter={(w, naam) => [`${formatWaarde(w as number, "aantal")} sessies`, String(naam)]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-sans-w7 text-lg font-bold tabular-nums text-ink">{formatWaarde(totaal, "aantal")}</span>
            <span className="text-meta text-ink-faint">sessies</span>
          </div>
        </div>
        <ul className="flex flex-col gap-1.5">
          {regels.map((k, i) => {
            const v = k.verschilPunten === null ? null : vergelijkingVerschil(k.aandeel, { label: vorigeMaand, waarde: k.vorigAandeel }, "procent");
            return (
              <li key={k.kanaal} className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: kleurVan(i, k.kanaal) }} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-ink">{k.kanaal}</span>
                <span className="tabular-nums text-ink">{formatWaarde(k.aandeel, "procent")}</span>
                <span className={`w-20 shrink-0 whitespace-nowrap text-right text-meta tabular-nums ${v ? VERSCHIL_KLEUR.neutraal : "text-ink-faint"}`}>
                  {v ? `${v.richting === "hoger" ? "↑" : v.richting === "lager" ? "↓" : "→"} ${v.tekst.replace(" procentpunt", " pp")}` : "—"}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="text-meta text-ink-faint">Aandeel van alle sessies. Het verschil is in procentpunten (pp) ten opzichte van {vorigeMaand}.</p>
    </Kaart>
  );
}

function TopContent({ b }: { b: MrBedrijf }) {
  const t = b.topContent;
  if (!t) return <Kaart titel="Toppresterende content"><Leeg>{b.topContentReden ?? "Geen organische content om uit te kiezen."}</Leeg></Kaart>;
  const datum = t.datum ? new Date(`${t.datum.slice(0, 10)}T00:00:00Z`) : null;
  return (
    <Kaart titel="Toppresterende content">
      {t.afbeelding ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={t.afbeelding} alt={t.titel} className="aspect-[4/3] w-full rounded-control border border-line-soft object-cover" />
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center rounded-control border border-dashed border-line text-meta text-ink-faint">Geen beeld beschikbaar</div>
      )}
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="font-sans-w7 text-title font-bold tabular-nums text-ink">{formatWaarde(t.metriek.waarde, t.metriek.eenheid)}</p>
          <p className="text-meta text-ink-faint">{t.metriek.label}</p>
        </div>
        <div className="text-right text-meta text-ink-muted">
          <p>{t.kanaal}</p>
          {datum && <p>{new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", timeZone: "UTC" }).format(datum)}</p>}
        </div>
      </div>
      <p className="text-sm font-medium text-ink">{t.url ? <a href={t.url} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">“{t.titel}”</a> : `“${t.titel}”`}</p>
      {t.waarom && <p className="border-t border-line-soft pt-3 text-sm text-ink-muted">{t.waarom}</p>}
    </Kaart>
  );
}

/** Een getal met het verschil eronder; voor de tabellen. */
function Cel({ w, eenheid, vorigeMaand, hogerIsBeter, nvt }: { w: MrWaarde; eenheid: Eenheid; vorigeMaand: string; hogerIsBeter?: boolean; nvt?: string }) {
  if (w.waarde === null) return <span className="text-ink-faint">{nvt ?? "—"}</span>;
  return (
    <div className="flex flex-col items-end">
      <span className="tabular-nums text-ink">{formatWaarde(w.waarde, eenheid)}</span>
      <Verschil w={w} eenheid={eenheid} vorigeMaand={vorigeMaand} hogerIsBeter={hogerIsBeter} kort />
    </div>
  );
}

const TH = "label-theme border-b border-line-soft bg-surface-tint px-3 py-2 text-label font-normal text-ink-faint";

function Campagnes({ rijen, vorigeMaand }: { rijen: MrCampagne[]; vorigeMaand: string }) {
  const gesorteerd = useMemo(() => sorteerCampagnes(rijen), [rijen]);
  const totaal = useMemo(() => campagnesTotaal(rijen), [rijen]);
  if (rijen.length === 0) return <Kaart titel="Campagneprestaties"><Leeg>Geen advertentiecampagnes met uitgaven in deze maand.</Leeg></Kaart>;
  return (
    <Kaart titel="Campagneprestaties">
      <div className="overflow-x-auto rounded-card border border-line-soft">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className={`${TH} text-left`}>Campagne</th>
              <th className={`${TH} text-left`}>Platform</th>
              <th className={`${TH} text-right`}>Uitgaven</th>
              <th className={`${TH} text-right`}>Leads</th>
              <th className={`${TH} text-right`}>Kosten per lead</th>
            </tr>
          </thead>
          <tbody className="[&_tr:not(:last-child)_td]:border-b [&_td]:border-line-soft">
            {gesorteerd.map((c, i) => (
              <tr key={`${c.platform}-${c.campagne}-${i}`}>
                <td className="px-3 py-2 font-medium text-ink">{c.campagne}</td>
                <td className="px-3 py-2 text-ink-muted">{c.platform}</td>
                <td className="px-3 py-2 text-right"><Cel w={c.uitgaven} eenheid="euro" vorigeMaand={vorigeMaand} /></td>
                <td className="px-3 py-2 text-right"><Cel w={c.leads} eenheid="aantal" vorigeMaand={vorigeMaand} hogerIsBeter nvt="n.v.t." /></td>
                <td className="px-3 py-2 text-right"><Cel w={c.cpl} eenheid="euro" vorigeMaand={vorigeMaand} hogerIsBeter={false} nvt="n.v.t." /></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="font-semibold [&_td]:border-t [&_td]:border-line">
              <td className="px-3 py-2 text-ink">Totaal</td>
              <td className="px-3 py-2" />
              <td className="px-3 py-2 text-right"><Cel w={totaal.uitgaven} eenheid="euro" vorigeMaand={vorigeMaand} /></td>
              <td className="px-3 py-2 text-right"><Cel w={totaal.leads} eenheid="aantal" vorigeMaand={vorigeMaand} hogerIsBeter nvt="n.v.t." /></td>
              <td className="px-3 py-2 text-right"><Cel w={totaal.cpl} eenheid="euro" vorigeMaand={vorigeMaand} hogerIsBeter={false} nvt="n.v.t." /></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-meta text-ink-faint">Leads zijn wat het advertentieplatform zelf als lead telt; “n.v.t.” betekent dat het platform geen leads levert. Gesorteerd op uitgaven, hoog naar laag.</p>
    </Kaart>
  );
}

function SocialKanalen({ b, vorigeMaand }: { b: MrBedrijf; vorigeMaand: string }) {
  const rijen: MrSocialKanaal[] = b.socialKanalen;
  if (rijen.length === 0) return <Kaart titel="Social media kanalen"><Leeg>{b.socialReden ?? "Geen organische social media accounts gekoppeld."}</Leeg></Kaart>;
  return (
    <Kaart titel="Social media kanalen">
      <div className="overflow-x-auto rounded-card border border-line-soft">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className={`${TH} text-left`}>Kanaal</th>
              <th className={`${TH} text-right`}>Volgers</th>
              <th className={`${TH} text-right`}>Bereik</th>
              <th className={`${TH} text-right`}>Vertoningen</th>
              <th className={`${TH} text-right`}>Likes</th>
              <th className={`${TH} text-right`}>Reacties</th>
              <th className={`${TH} text-right`}>Posts</th>
            </tr>
          </thead>
          <tbody className="[&_tr:not(:last-child)_td]:border-b [&_td]:border-line-soft">
            {rijen.map((k, i) => (
              <tr key={`${k.kanaal}-${k.account}-${i}`}>
                <td className="px-3 py-2">
                  <p className="font-medium text-ink">{k.kanaal}</p>
                  {k.account && <p className="text-meta text-ink-faint">{k.account}</p>}
                </td>
                {([k.volgers, k.bereik, k.vertoningen ?? { waarde: null }, k.likes, k.reacties, k.posts ?? { waarde: null }] as MrWaarde[]).map((w, j) => (
                  <td key={j} className="px-3 py-2 text-right">
                    <Cel w={w} eenheid="aantal" vorigeMaand={vorigeMaand} hogerIsBeter nvt="n.v.t." />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-meta text-ink-faint">Volgers zijn de stand op het moment van opvragen (Instagram levert geen historie, dus daar geen vergelijking); de andere cijfers gaan over de hele maand. “n.v.t.” betekent dat het kanaal dat cijfer niet levert.</p>
    </Kaart>
  );
}

function BedrijfTab({ b, maand, vorigeMaand }: { b: MrBedrijf; maand: string; vorigeMaand: string }) {
  const vorigNaam = maandNaam(vorigeMaand, false);
  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Tegel titel="Totaal online leads" tegel={b.leads} vorigeMaand={vorigNaam} hogerIsBeter uitsplitsing="hover" uitsplitsingTitel="Leads per soort" />
        <Tegel titel="Websitebezoeken (sessies)" tegel={b.sessies} vorigeMaand={vorigNaam} hogerIsBeter uitsplitsing="geen" />
        <Tegel titel="Social media bereik" tegel={b.bereik} vorigeMaand={vorigNaam} hogerIsBeter uitsplitsing="zichtbaar" />
        <UitgavenTegel b={b} vorigeMaand={vorigNaam} maand={maand} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <TrendForecast b={b} maand={maand} vorigeMaand={vorigNaam} />
        <TopContent b={b} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Kanalen b={b} vorigeMaand={vorigNaam} />
        <SocialKanalen b={b} vorigeMaand={vorigNaam} />
      </div>
      <Campagnes rijen={b.campagnes} vorigeMaand={vorigNaam} />
    </div>
  );
}

export default function MaandrapportWeergave({
  rapport,
  bronnen,
  datakwaliteit,
}: {
  rapport: MaMaandrapport;
  bronnen: string[];
  datakwaliteit: string[];
}) {
  const [actief, setActief] = useState(0);
  const b = rapport.bedrijven[Math.min(actief, rapport.bedrijven.length - 1)];
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div role="tablist" aria-label="Bedrijven" className="flex flex-wrap gap-1.5 rounded-panel border border-line bg-card p-1.5 shadow-subtle">
          {rapport.bedrijven.map((x, i) => (
            <button
              key={x.naam}
              type="button"
              role="tab"
              aria-selected={i === actief}
              onClick={() => setActief(i)}
              className={`rounded-button px-4 py-2 text-sm transition-colors ${
                i === actief ? "bg-primary font-semibold text-on-primary" : "text-ink-muted hover:bg-surface hover:text-ink"
              }`}
            >
              {x.naam}
            </button>
          ))}
        </div>
        <p className="text-sm text-ink-muted">
          <span className="font-semibold text-ink">{maandNaam(rapport.maand)}</span> · vergeleken met {maandNaam(rapport.vorigeMaand)}
        </p>
      </div>
      <div role="tabpanel" key={b.naam}>
        <BedrijfTab b={b} maand={rapport.maand} vorigeMaand={rapport.vorigeMaand} />
      </div>
      {(bronnen.length > 0 || datakwaliteit.length > 0) && (
        <details className="rounded-card border border-line-soft bg-card px-5 py-3 text-sm text-ink-muted">
          <summary className="cursor-pointer text-ink">Bronnen en meetnotities</summary>
          {bronnen.length > 0 && (
            <ul className="mt-3 list-disc pl-5">
              {bronnen.map((x, i) => <li key={i}>{x}</li>)}
            </ul>
          )}
          {datakwaliteit.length > 0 && (
            <ul className="mt-3 list-disc pl-5">
              {datakwaliteit.map((x, i) => <li key={i}>{x}</li>)}
            </ul>
          )}
        </details>
      )}
    </div>
  );
}

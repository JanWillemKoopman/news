"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconClose, IconPhoto } from "@/components/icons";
import BeoordelingUitleg from "@/components/monitoren/BeoordelingUitleg";
import Inlogprompt from "@/components/Inlogprompt";
import LandingspaginaRapport, {
  formatCijfer,
  scoreKleur,
} from "@/components/monitoren/LandingspaginaRapport";
import OntwerpVoorstel from "@/components/monitoren/OntwerpVoorstel";
import type { Analyse, AnalyseItem, Ontwerp } from "@/lib/landingspagina";
import { CRITERIA, VERKEERSBRONNEN } from "@/lib/landingspaginaCriteria";
import { deelScreenshot, type GedeeldeScreenshot } from "@/lib/screenshotDelen";

/**
 * Landingspagina: vul een URL in en klik op Analyseer — ChatGPT (GPT-6 Sol) beoordeelt de pagina als
 * campagne-landingspagina (zie app/api/landingspagina). Onder de zoekbalk staat elke
 * pagina die ooit is geanalyseerd, met datum en eindcijfer; een klik opent het rapport.
 * Dezelfde pagina opnieuw analyseren vervangt het rapport, dus elke pagina staat er één
 * keer in.
 *
 * Analyses lopen naast elkaar: het formulier blijft bruikbaar terwijl er een analyse loopt,
 * en elke lopende analyse staat als eigen regel onder het formulier tot hij klaar is. Het
 * tabpaneel blijft gemount als je een ander tabblad opent (AppShell), dus een analyse loopt
 * ook door als je even weg klikt.
 *
 * Is er een screenshot meegestuurd, dan start na de analyse vanzelf het ontwerpvoorstel
 * (app/api/landingspagina/ontwerp): de pagina opnieuw getekend met de verbeterpunten
 * verwerkt. Dat staat onder het rapport (OntwerpVoorstel.tsx) en loopt ook door als je
 * het rapport al opent.
 */

interface LopendeAnalyse {
  sleutel: number;
  url: string;
  gestart: Date;
  status: "bezig" | "klaar" | "fout";
  fout?: string;
  analyse?: Analyse;
}

let volgnummer = 0;
export default function Landingspagina({ ingelogd }: { ingelogd: boolean }) {
  const [url, setUrl] = useState("");
  const [campagne, setCampagne] = useState("");
  const [verkeersbron, setVerkeersbron] = useState<string>(VERKEERSBRONNEN[0]);
  const [screenshot, setScreenshot] = useState<(GedeeldeScreenshot & { naam: string }) | null>(null);
  const [leestScreenshot, setLeestScreenshot] = useState(false);
  const bestandInvoer = useRef<HTMLInputElement>(null);
  const [lopend, setLopend] = useState<LopendeAnalyse[]>([]);
  const [fout, setFout] = useState<string | null>(null);
  const [lijst, setLijst] = useState<AnalyseItem[] | null>(null);
  const [lijstFout, setLijstFout] = useState<string | null>(null);
  const [open, setOpen] = useState<Analyse | null>(null);
  const [laadtRapport, setLaadtRapport] = useState<string | null>(null);
  /** Per analyse-id: wordt er een ontwerp gemaakt, of ging dat mis. */
  const [ontwerpStatus, setOntwerpStatus] = useState<Record<string, { bezig: boolean; fout?: string }>>({});

  const haalLijst = useCallback(() => {
    fetch("/api/landingspagina")
      .then(async (res) => {
        const antwoord = (await res.json()) as { analyses?: AnalyseItem[]; fout?: string };
        if (!res.ok) throw new Error(antwoord.fout ?? `Ophalen mislukt (${res.status}).`);
        setLijst(antwoord.analyses ?? []);
        setLijstFout(null);
      })
      .catch((err: unknown) => setLijstFout(err instanceof Error ? err.message : String(err)));
  }, []);

  useEffect(() => {
    if (ingelogd) haalLijst();
  }, [ingelogd, haalLijst]);

  if (!ingelogd) return <Inlogprompt tekst="Log in om een landingspagina te analyseren." />;

  function toon(analyse: Analyse) {
    setOpen(analyse);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function werkBij(sleutel: number, wijziging: Partial<LopendeAnalyse>) {
    setLopend((huidig) => huidig.map((l) => (l.sleutel === sleutel ? { ...l, ...wijziging } : l)));
  }

  /** Start een analyse naast eventuele andere; het formulier is meteen weer vrij. */
  async function analyseer(
    teAnalyseren: string,
    instellingen: { campagnecontext: string; verkeersbron: string; screenshot: string[] },
  ) {
    const adres = teAnalyseren.trim();
    if (!adres) return;
    if (lopend.some((l) => l.status === "bezig" && l.url === adres)) {
      setFout("Deze pagina wordt al geanalyseerd.");
      return;
    }
    setFout(null);
    const sleutel = ++volgnummer;
    setLopend((huidig) => [{ sleutel, url: adres, gestart: new Date(), status: "bezig" }, ...huidig]);
    try {
      const res = await fetch("/api/landingspagina", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: adres,
          campagnecontext: instellingen.campagnecontext.trim(),
          verkeersbron: instellingen.verkeersbron,
          screenshot: instellingen.screenshot,
        }),
      });
      const antwoord = (await res.json().catch(() => ({}))) as { analyse?: Analyse; fout?: string };
      if (!res.ok || !antwoord.analyse) {
        throw new Error(antwoord.fout ?? `Analyse mislukt (${res.status}).`);
      }
      werkBij(sleutel, { status: "klaar", analyse: antwoord.analyse });
      haalLijst();
      // Met screenshot meteen door naar het ontwerpvoorstel; zonder kan het beeldmodel het design niet zien.
      if (instellingen.screenshot.length) void maakOntwerp(antwoord.analyse.id, instellingen.screenshot);
    } catch (err) {
      werkBij(sleutel, { status: "fout", fout: err instanceof Error ? err.message : String(err) });
    }
  }

  /** Laat de pagina opnieuw tekenen met de verbeterpunten verwerkt; het resultaat komt in het rapport. */
  async function maakOntwerp(analyseId: string, stukken: string[]) {
    setOntwerpStatus((s) => ({ ...s, [analyseId]: { bezig: true } }));
    try {
      const res = await fetch("/api/landingspagina/ontwerp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: analyseId, screenshot: stukken }),
      });
      const antwoord = (await res.json().catch(() => ({}))) as { ontwerp?: Ontwerp; fout?: string };
      if (!res.ok || !antwoord.ontwerp) throw new Error(antwoord.fout ?? `Ontwerp maken mislukt (${res.status}).`);
      const ontwerp = antwoord.ontwerp;
      setOpen((o) => (o?.id === analyseId ? { ...o, ontwerp } : o));
      setLopend((huidig) =>
        huidig.map((l) => (l.analyse?.id === analyseId ? { ...l, analyse: { ...l.analyse, ontwerp } } : l)),
      );
      setOntwerpStatus((s) => ({ ...s, [analyseId]: { bezig: false } }));
    } catch (err) {
      setOntwerpStatus((s) => ({
        ...s,
        [analyseId]: { bezig: false, fout: err instanceof Error ? err.message : String(err) },
      }));
    }
  }

  function verbergLopend(sleutel: number) {
    setLopend((huidig) => huidig.filter((l) => l.sleutel !== sleutel));
  }

  async function kiesScreenshot(bestand: File | undefined) {
    if (!bestand) return;
    setFout(null);
    setLeestScreenshot(true);
    try {
      setScreenshot({ ...(await deelScreenshot(bestand)), naam: bestand.name });
    } catch (err) {
      setFout(err instanceof Error ? err.message : String(err));
    } finally {
      setLeestScreenshot(false);
      // Zelfde bestand opnieuw kiezen moet weer een change-event geven.
      if (bestandInvoer.current) bestandInvoer.current.value = "";
    }
  }

  async function verwijder(id: string) {
    setFout(null);
    try {
      const res = await fetch(`/api/landingspagina?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const antwoord = (await res.json().catch(() => ({}))) as { fout?: string };
      if (!res.ok) throw new Error(antwoord.fout ?? `Verwijderen mislukt (${res.status}).`);
      setLijst((huidig) => huidig?.filter((a) => a.id !== id) ?? null);
    } catch (err) {
      setFout(err instanceof Error ? err.message : String(err));
    }
  }

  async function openRapport(id: string) {
    setLaadtRapport(id);
    setFout(null);
    try {
      const res = await fetch(`/api/landingspagina?id=${encodeURIComponent(id)}`);
      const antwoord = (await res.json()) as { analyse?: Analyse; fout?: string };
      if (!res.ok || !antwoord.analyse) throw new Error(antwoord.fout ?? `Ophalen mislukt (${res.status}).`);
      toon(antwoord.analyse);
    } catch (err) {
      setFout(err instanceof Error ? err.message : String(err));
    } finally {
      setLaadtRapport(null);
    }
  }

  return (
    <>
      {/* Buiten de space-y-wrapper: een marge op een fixed knop verschuift hem. */}
      <BeoordelingUitleg />
      <div className="space-y-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void analyseer(url, {
              campagnecontext: campagne,
              verkeersbron,
              screenshot: screenshot?.stukken ?? [],
            });
            // Meteen leeg: de volgende pagina kan al worden ingevuld terwijl deze loopt.
            setUrl("");
            setCampagne("");
            setScreenshot(null);
          }}
          className="space-y-3 rounded-panel border border-line bg-card px-5 py-5 shadow-subtle"
        >
          <div className="flex gap-3">
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.udenhout.nl/acties/…"
              className="w-full rounded-card border border-line bg-card px-4 py-2.5 text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              className="shrink-0 rounded-button bg-primary px-5 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary-dark disabled:opacity-60"
            >
              Analyseer
            </button>
          </div>
          {/* De bron bepaalt wat de bezoeker al weet; het doel waar de pagina op wordt
              afgerekend. Zonder doel leidt het model het af van de pagina. */}
          <label className="block text-meta text-ink-muted">
            Bezoekers komen via
            <select
              value={verkeersbron}
              onChange={(e) => setVerkeersbron(e.target.value)}
              className="mt-1 block w-80 rounded-card border border-line bg-card px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none disabled:opacity-60"
            >
              {VERKEERSBRONNEN.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </label>
          <label className="block text-meta text-ink-muted">
            Doel en doelgroep van de campagne
            <textarea
              value={campagne}
              onChange={(e) => setCampagne(e.target.value)}
              rows={3}
              placeholder="Optioneel, maar sterk aangeraden: wat moet deze pagina opleveren, en voor wie is hij bedoeld?"
              className="mt-1 block w-full resize-y rounded-card border border-line bg-card px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none disabled:opacity-60"
            />
          </label>

          {/* Screenshot van de volledige pagina: wordt in de browser in leesbare stukken
              geknipt (lib/screenshotDelen.ts) en speelt in de prompt een hoofdrol. */}
          <input
            ref={bestandInvoer}
            type="file"
            accept="image/jpeg,image/png"
            className="hidden"
            onChange={(e) => void kiesScreenshot(e.target.files?.[0])}
          />
          {screenshot ? (
            <div className="flex items-start gap-4 rounded-card border border-positive/40 bg-positive/5 px-4 py-3">
              <div className="h-24 w-16 shrink-0 overflow-hidden rounded-control border border-line bg-card">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={screenshot.voorbeeld} alt="Voorvertoning van de screenshot" className="w-full" />
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium text-positive">Screenshot geüpload</p>
                <p className="truncate text-ink" title={screenshot.naam}>
                  {screenshot.naam}
                </p>
                <p className="text-meta text-ink-muted">
                  {screenshot.breedte} × {screenshot.hoogte} px · gaat mee als {screenshot.stukken.length}{" "}
                  {screenshot.stukken.length === 1 ? "deel" : "delen"}
                </p>
                {screenshot.afgekapt && (
                  <p className="text-meta text-orange">
                    De pagina is erg lang; alleen het bovenste deel wordt meegestuurd.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setScreenshot(null)}
                title="Screenshot verwijderen"
                aria-label="Screenshot verwijderen"
                className="rounded-control p-1.5 text-ink-faint transition-colors hover:bg-negative/10 hover:text-negative disabled:opacity-60"
              >
                <IconClose className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => bestandInvoer.current?.click()}
                disabled={leestScreenshot}
                className="inline-flex items-center gap-2 rounded-button border border-line bg-card px-4 py-2 text-sm text-ink transition-colors hover:border-primary disabled:opacity-60"
              >
                <IconPhoto className="h-4 w-4 text-ink-muted" />
                {leestScreenshot ? "Screenshot verwerken…" : "Screenshot uploaden"}
              </button>
              <span className="text-meta text-ink-faint">
                Optioneel, maar sterk aangeraden: een JPEG van de volledige pagina, zodat ook het
                beeld wordt beoordeeld.
              </span>
            </div>
          )}
        </form>

        {lopend.length > 0 && (
          <LopendeAnalyses
            lopend={lopend}
            ontwerpBezig={(id) => ontwerpStatus[id]?.bezig ?? false}
            onBekijk={(l) => {
              if (l.analyse) toon(l.analyse);
              verbergLopend(l.sleutel);
            }}
            onVerberg={verbergLopend}
          />
        )}

        {fout && (
          <div className="rounded-panel border border-negative/30 bg-card px-5 py-4 text-sm text-negative shadow-subtle">
            {fout}
          </div>
        )}

        {open ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="text-sm text-ink-muted transition-colors hover:text-ink"
              >
                ← Alle geanalyseerde pagina&apos;s
              </button>
              <button
                type="button"
                disabled={lopend.some((l) => l.status === "bezig" && l.url === open.url)}
                onClick={() =>
                  void analyseer(open.url, {
                    campagnecontext: open.rapport.campagnecontext ?? "",
                    verkeersbron: open.rapport.verkeersbron ?? "Onbekend of gemengd",
                    screenshot: [],
                  })
                }
                className="rounded-button border border-line bg-card px-4 py-1.5 text-sm text-ink transition-colors hover:border-primary disabled:opacity-60"
              >
                Opnieuw analyseren
              </button>
            </div>
            <LandingspaginaRapport
              rapport={open.rapport}
              geanalyseerdOp={open.geanalyseerdOp}
            />
            <OntwerpVoorstel
              ontwerp={open.ontwerp}
              verbeterpunten={open.rapport.top_verbeterpunten}
              bezig={ontwerpStatus[open.id]?.bezig ?? false}
              fout={ontwerpStatus[open.id]?.fout ?? null}
              onMaak={(stukken) => void maakOntwerp(open.id, stukken)}
            />
          </div>
        ) : (
          <AnalyseLijst
            lijst={lijst}
            fout={lijstFout}
            laadt={laadtRapport}
            onOpen={openRapport}
            onVerwijder={verwijder}
          />
        )}
      </div>
    </>
  );
}

function tijd(d: Date) {
  return d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

function padVan(url: string) {
  try {
    const adres = new URL(url);
    return adres.pathname === "/" ? adres.hostname : adres.pathname + adres.search;
  } catch {
    return url;
  }
}

function hostVan(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function LopendeAnalyses({
  lopend,
  ontwerpBezig,
  onBekijk,
  onVerberg,
}: {
  lopend: LopendeAnalyse[];
  ontwerpBezig: (analyseId: string) => boolean;
  onBekijk: (l: LopendeAnalyse) => void;
  onVerberg: (sleutel: number) => void;
}) {
  const aantalBezig = lopend.filter((l) => l.status === "bezig").length;
  return (
    <section className="rounded-panel border border-line bg-card shadow-subtle">
      <header className="flex items-baseline justify-between border-b border-line-soft px-6 py-3">
        <h2 className="label-theme text-label text-ink-muted">Analyses</h2>
        {aantalBezig > 0 && (
          <span className="text-meta text-ink-faint">
            {aantalBezig} bezig · duurt meestal één tot drie minuten per pagina
          </span>
        )}
      </header>
      <ul className="divide-y divide-line-soft">
        {lopend.map((l) => (
          <li
            key={l.sleutel}
            className={`flex items-center gap-4 px-6 py-3 text-sm ${l.status === "bezig" ? "laadvlak" : ""}`}
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-ink" title={l.url}>
                {padVan(l.url)}
              </p>
              <p className={`truncate text-meta ${l.status === "fout" ? "text-negative" : "text-ink-faint"}`}>
                {l.status === "bezig" && `Wordt beoordeeld · gestart om ${tijd(l.gestart)}`}
                {l.status === "klaar" &&
                  (l.analyse && ontwerpBezig(l.analyse.id)
                    ? "Klaar · ontwerpvoorstel wordt gemaakt"
                    : l.analyse?.ontwerp
                      ? "Klaar · met ontwerpvoorstel"
                      : "Klaar")}
                {l.status === "fout" && l.fout}
              </p>
            </div>
            {l.status === "klaar" && l.analyse && <Cijfer score={l.analyse.eindcijfer} />}
            {l.status === "klaar" && (
              <button
                type="button"
                onClick={() => onBekijk(l)}
                className="rounded-button border border-line bg-card px-3 py-1 text-sm text-ink transition-colors hover:border-primary"
              >
                Bekijk rapport
              </button>
            )}
            {l.status !== "bezig" && (
              <button
                type="button"
                onClick={() => onVerberg(l.sleutel)}
                title="Verbergen"
                aria-label="Verbergen"
                className="rounded-control p-1.5 text-ink-faint transition-colors hover:bg-surface hover:text-ink"
              >
                <IconClose className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Korte kolomkoppen voor de criteria; de volledige naam staat in de tooltip. */
const KORT: Record<string, string> = {
  "Doel & doelgroep": "Doel",
  "Eerste scherm": "1e scherm",
  "Informatie & bezwaren": "Info",
  "Duidelijkheid & consistentie": "Duidelijk",
  "Focus & opbouw": "Focus",
  "Actie & formulier": "Actie",
  Beeld: "Beeld",
};

/** Zelfde kleurgebruik als het eindcijfer: rood onvoldoende, oranje 5,5–7, groen daarboven. */
function Cijfer({ score }: { score: number | null | undefined }) {
  if (score === null || score === undefined || !Number.isFinite(score)) {
    return <span className="text-ink-faint">—</span>;
  }
  const kleur = scoreKleur(score);
  return (
    <span
      className={`inline-block min-w-10 rounded-control px-2 py-1 text-center font-sans-w7 font-semibold tabular-nums ${kleur.zacht} ${kleur.tekst}`}
    >
      {formatCijfer(score)}
    </span>
  );
}

function korteDatum(iso: string) {
  return new Date(iso).toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AnalyseLijst({
  lijst,
  fout,
  laadt,
  onOpen,
  onVerwijder,
}: {
  lijst: AnalyseItem[] | null;
  fout: string | null;
  laadt: string | null;
  onOpen: (id: string) => void;
  onVerwijder: (id: string) => void;
}) {
  // Twee klikken om te verwijderen: het kruisje wordt eerst "Weg?", net als bij de
  // berichten op Kennis en acties. Een analyse terughalen kan niet.
  const [bevestig, setBevestig] = useState<string | null>(null);

  return (
    <section className="rounded-panel border border-line bg-card shadow-subtle">
      <header className="flex items-baseline justify-between border-b border-line-soft px-6 py-4">
        <h2 className="label-theme text-label text-ink-muted">Geanalyseerde pagina&apos;s</h2>
        {lijst && <span className="text-meta text-ink-faint">{lijst.length} pagina&apos;s</span>}
      </header>

      {fout ? (
        <p className="px-6 py-5 text-sm text-negative">{fout}</p>
      ) : !lijst ? (
        <p className="px-6 py-5 text-sm text-ink-muted">Laden…</p>
      ) : lijst.length === 0 ? (
        <p className="px-6 py-5 text-sm text-ink-muted">
          Nog geen pagina&apos;s geanalyseerd. Vul hierboven een URL in om te beginnen.
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-label text-ink-faint">
              <th className="label-theme px-6 py-2.5 font-normal">Pagina</th>
              <th className="label-theme w-44 whitespace-nowrap px-4 py-2.5 font-normal">Geanalyseerd</th>
              {CRITERIA.map((naam) => (
                <th
                  key={naam}
                  title={naam}
                  className="label-theme w-16 whitespace-nowrap px-1 py-2.5 text-center font-normal"
                >
                  {KORT[naam] ?? naam}
                </th>
              ))}
              <th className="label-theme w-24 whitespace-nowrap px-4 py-2.5 text-right font-normal">Eindcijfer</th>
              <th className="w-20 px-4 py-2.5">
                <span className="sr-only">Verwijderen</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft border-t border-line-soft">
            {lijst.map((a) => {
              return (
                <tr
                  key={a.id}
                  onClick={() => onOpen(a.id)}
                  className={`cursor-pointer transition-colors hover:bg-surface ${laadt === a.id ? "opacity-60" : ""}`}
                >
                  <td className="max-w-0 px-6 py-3">
                    <p className="truncate font-medium text-ink" title={a.url}>
                      {padVan(a.url)}
                    </p>
                    <p className="truncate text-meta text-ink-faint">{hostVan(a.url)}</p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-muted">{korteDatum(a.geanalyseerdOp)}</td>
                  {/* Oudere rapporten hadden andere criteria: die cellen blijven leeg. */}
                  {CRITERIA.map((naam) => (
                    <td key={naam} className="px-1 py-3 text-center">
                      <Cijfer score={a.criteria?.find((c) => c.naam === naam)?.score} />
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right">
                    <Cijfer score={a.eindcijfer} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (bevestig === a.id) {
                          setBevestig(null);
                          onVerwijder(a.id);
                        } else {
                          setBevestig(a.id);
                        }
                      }}
                      onBlur={() => setBevestig((b) => (b === a.id ? null : b))}
                      title="Analyse verwijderen"
                      aria-label={bevestig === a.id ? "Bevestig verwijderen" : "Analyse verwijderen"}
                      className={
                        bevestig === a.id
                          ? "rounded-control bg-negative/10 px-2 py-1 text-meta font-medium text-negative"
                          : "rounded-control p-1.5 text-ink-faint transition-colors hover:bg-negative/10 hover:text-negative"
                      }
                    >
                      {bevestig === a.id ? "Weg?" : <IconClose className="h-4 w-4" />}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}

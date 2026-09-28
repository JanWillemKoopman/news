"use client";

import { useCallback, useEffect, useState } from "react";
import Inlogprompt from "@/components/Inlogprompt";
import LandingspaginaRapport, {
  formatCijfer,
  formatDatum,
  scoreKleur,
} from "@/components/monitoren/LandingspaginaRapport";
import type { Analyse, AnalyseItem } from "@/lib/landingspagina";

/**
 * Landingspagina: vul een URL in en klik op Analyseer — Claude beoordeelt de pagina als
 * campagne-landingspagina (zie app/api/landingspagina). Onder de zoekbalk staat elke
 * pagina die ooit is geanalyseerd, met datum en eindcijfer; een klik opent het rapport.
 * Dezelfde pagina opnieuw analyseren vervangt het rapport, dus elke pagina staat er één
 * keer in.
 */
export default function Landingspagina({ ingelogd }: { ingelogd: boolean }) {
  const [url, setUrl] = useState("");
  const [campagne, setCampagne] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [lijst, setLijst] = useState<AnalyseItem[] | null>(null);
  const [lijstFout, setLijstFout] = useState<string | null>(null);
  const [open, setOpen] = useState<Analyse | null>(null);
  const [laadtRapport, setLaadtRapport] = useState<string | null>(null);

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

  async function analyseer(teAnalyseren: string, campagnecontext: string) {
    if (!teAnalyseren.trim() || bezig) return;
    setBezig(true);
    setFout(null);
    try {
      const res = await fetch("/api/landingspagina", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: teAnalyseren.trim(), campagnecontext: campagnecontext.trim() }),
      });
      const antwoord = (await res.json().catch(() => ({}))) as { analyse?: Analyse; fout?: string };
      if (!res.ok || !antwoord.analyse) {
        throw new Error(antwoord.fout ?? `Analyse mislukt (${res.status}).`);
      }
      setUrl("");
      setCampagne("");
      toon(antwoord.analyse);
      haalLijst();
    } catch (err) {
      setFout(err instanceof Error ? err.message : String(err));
    } finally {
      setBezig(false);
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
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void analyseer(url, campagne);
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
            disabled={bezig}
            className="w-full rounded-card border border-line bg-card px-4 py-2.5 text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={bezig}
            className="shrink-0 rounded-button bg-primary px-5 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary-dark disabled:opacity-60"
          >
            {bezig ? "Bezig…" : "Analyseer"}
          </button>
        </div>
        {/* Zonder deze context kan Claude de message match alleen op de pagina zelf
            beoordelen; met de advertentietekst toetst het of de belofte wordt waargemaakt. */}
        <textarea
          value={campagne}
          onChange={(e) => setCampagne(e.target.value)}
          disabled={bezig}
          rows={2}
          placeholder="Optioneel: campagnebelofte of advertentietekst, bijv. “Volkswagen ID.3 private lease vanaf €299 p/m – alleen deze maand”"
          className="w-full resize-y rounded-card border border-line bg-card px-4 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none disabled:opacity-60"
        />
      </form>

      {bezig && (
        <div className="laadvlak rounded-panel border border-line bg-card px-6 py-5 text-sm text-ink-muted shadow-subtle">
          De pagina wordt opgehaald en beoordeeld op tien criteria. Dit duurt meestal één tot
          drie minuten — laat dit tabblad open.
        </div>
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
              disabled={bezig}
              onClick={() => void analyseer(open.url, open.rapport.campagnecontext ?? "")}
              className="rounded-button border border-line bg-card px-4 py-1.5 text-sm text-ink transition-colors hover:border-primary disabled:opacity-60"
            >
              Opnieuw analyseren
            </button>
          </div>
          <LandingspaginaRapport
            rapport={open.rapport}
            geanalyseerdOp={open.geanalyseerdOp}
            geanalyseerdDoorNaam={open.geanalyseerdDoorNaam}
          />
        </div>
      ) : (
        <AnalyseLijst lijst={lijst} fout={lijstFout} laadt={laadtRapport} onOpen={openRapport} />
      )}
    </div>
  );
}

function AnalyseLijst({
  lijst,
  fout,
  laadt,
  onOpen,
}: {
  lijst: AnalyseItem[] | null;
  fout: string | null;
  laadt: string | null;
  onOpen: (id: string) => void;
}) {
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
              <th className="label-theme w-56 px-4 py-2.5 font-normal">Laatst geanalyseerd</th>
              <th className="label-theme w-44 px-4 py-2.5 font-normal">Door</th>
              <th className="label-theme w-32 px-6 py-2.5 text-right font-normal">Eindcijfer</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft border-t border-line-soft">
            {lijst.map((a) => {
              const adres = new URL(a.url);
              return (
                <tr
                  key={a.id}
                  onClick={() => onOpen(a.id)}
                  className={`cursor-pointer transition-colors hover:bg-surface ${laadt === a.id ? "opacity-60" : ""}`}
                >
                  <td className="max-w-0 px-6 py-3">
                    <p className="truncate font-medium text-ink" title={a.url}>
                      {adres.pathname === "/" ? adres.hostname : adres.pathname + adres.search}
                    </p>
                    <p className="truncate text-meta text-ink-faint">{adres.hostname}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-muted">{formatDatum(a.geanalyseerdOp)}</td>
                  <td className="truncate px-4 py-3 text-ink-muted">{a.geanalyseerdDoorNaam ?? "—"}</td>
                  <td className="px-6 py-3 text-right">
                    {a.eindcijfer === null ? (
                      <span className="text-ink-faint">—</span>
                    ) : (
                      <span
                        className={`inline-block min-w-12 rounded-control px-2.5 py-1 text-center font-sans-w7 font-semibold tabular-nums ${scoreKleur(a.eindcijfer).zacht} ${scoreKleur(a.eindcijfer).tekst}`}
                      >
                        {formatCijfer(a.eindcijfer)}
                      </span>
                    )}
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

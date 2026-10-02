"use client";

import { useRef, useState } from "react";
import { IconDownload, IconPhoto } from "@/components/icons";
import { formatDatum } from "@/components/monitoren/LandingspaginaRapport";
import type { Ontwerp, Verbeterpunt, WijzigingSoort } from "@/lib/landingspagina";
import { deelScreenshot } from "@/lib/screenshotDelen";

/**
 * Ontwerpvoorstel onder het rapport: de pagina opnieuw getekend met de belangrijkste
 * verbeterpunten verwerkt, in het design van de geüploade screenshot (zie
 * app/api/landingspagina/ontwerp). Links de afbeelding, rechts wat er veranderde en bij
 * welk verbeterpunt dat hoort.
 *
 * Na een analyse mét screenshot start het ontwerp vanzelf (Landingspagina.tsx). Zonder
 * ontwerp, of om het opnieuw te maken, upload je hier de screenshot: die wordt nergens
 * bewaard, dus ook bij een oud rapport moet hij opnieuw.
 */

const SOORT_STIJL: Record<WijzigingSoort, string> = {
  nieuw: "text-positive",
  aangepast: "text-orange",
  verplaatst: "text-ink-faint",
  verwijderd: "text-negative",
};

export default function OntwerpVoorstel({
  ontwerp,
  verbeterpunten,
  bezig,
  fout,
  onMaak,
}: {
  ontwerp: Ontwerp | null | undefined;
  verbeterpunten: Verbeterpunt[];
  bezig: boolean;
  fout: string | null;
  onMaak: (screenshot: string[]) => void;
}) {
  const bestandInvoer = useRef<HTMLInputElement>(null);
  const [leest, setLeest] = useState(false);
  const [leesFout, setLeesFout] = useState<string | null>(null);
  const [groot, setGroot] = useState(false);

  async function kies(bestand: File | undefined) {
    if (!bestand) return;
    setLeesFout(null);
    setLeest(true);
    try {
      onMaak((await deelScreenshot(bestand)).stukken);
    } catch (err) {
      setLeesFout(err instanceof Error ? err.message : String(err));
    } finally {
      setLeest(false);
      if (bestandInvoer.current) bestandInvoer.current.value = "";
    }
  }

  const knop = (
    <>
      <input
        ref={bestandInvoer}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(e) => void kies(e.target.files?.[0])}
      />
      <button
        type="button"
        disabled={bezig || leest}
        onClick={() => bestandInvoer.current?.click()}
        className="inline-flex items-center gap-2 rounded-button border border-line bg-card px-4 py-1.5 text-sm text-ink transition-colors hover:border-primary disabled:opacity-60"
      >
        <IconPhoto className="h-4 w-4 text-ink-muted" />
        {leest ? "Screenshot verwerken…" : ontwerp ? "Opnieuw maken" : "Screenshot uploaden en ontwerp maken"}
      </button>
    </>
  );

  return (
    <section className="rounded-panel border border-line bg-card px-7 py-6 shadow-subtle">
      <div className="mb-4 flex items-start justify-between gap-6">
        <div>
          <h2 className="label-theme text-label text-ink-muted">Ontwerpvoorstel</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Zo kan de pagina eruitzien als de belangrijkste verbeterpunten zijn verwerkt, in het design van
            de screenshot.
          </p>
        </div>
        {!bezig && <div className="shrink-0">{knop}</div>}
      </div>

      {(fout || leesFout) && !bezig && (
        <p className="mb-4 rounded-card border border-negative/30 px-4 py-3 text-sm text-negative">{fout ?? leesFout}</p>
      )}

      {bezig ? (
        <p className="laadvlak rounded-card border border-line-soft px-4 py-6 text-center text-sm text-ink-muted">
          Ontwerp wordt gemaakt · duurt meestal twee tot vier minuten
        </p>
      ) : !ontwerp ? (
        <p className="text-sm text-ink-muted">
          Er is nog geen ontwerp bij dit rapport. Het beeldmodel heeft de screenshot nodig om in hetzelfde
          design te blijven; die wordt niet bewaard, dus upload hem hierboven opnieuw.
        </p>
      ) : (
        <div className={groot ? "space-y-6" : "grid grid-cols-[minmax(0,5fr)_minmax(0,6fr)] items-start gap-8"}>
          <figure>
            <div
              className={`overflow-y-auto rounded-card border border-line bg-surface ${groot ? "" : "max-h-[80vh]"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={ontwerp.afbeelding} alt="Ontwerpvoorstel voor de verbeterde pagina" className="w-full" />
            </div>
            <figcaption className="mt-2 flex items-center justify-between gap-4 text-meta text-ink-faint">
              <span>Gemaakt op {formatDatum(ontwerp.gemaaktOp)} · gegenereerd beeld, controleer teksten en feiten</span>
              <span className="flex shrink-0 gap-3">
                <button type="button" onClick={() => setGroot((g) => !g)} className="hover:text-ink">
                  {groot ? "Kleiner" : "Groter"}
                </button>
                <a
                  href={ontwerp.afbeelding}
                  download="ontwerpvoorstel.webp"
                  className="inline-flex items-center gap-1 hover:text-ink"
                >
                  <IconDownload className="h-3.5 w-3.5" />
                  Download
                </a>
              </span>
            </figcaption>
          </figure>

          <div>
            {ontwerp.samenvatting && <p className="text-sm leading-relaxed text-ink">{ontwerp.samenvatting}</p>}
            {ontwerp.wijzigingen.length > 0 && (
              <>
                <h3 className="label-theme mb-3 mt-6 text-label text-ink-muted">Wijzigingen</h3>
                <ol className="divide-y divide-line-soft">
                  {ontwerp.wijzigingen.map((w, i) => {
                    const punt = w.verbeterpunt > 0 ? verbeterpunten[w.verbeterpunt - 1] : undefined;
                    return (
                      <li key={i} className="grid grid-cols-[5.5rem_1fr] gap-2 py-3 text-sm leading-snug first:pt-0">
                        <span className={`text-meta ${SOORT_STIJL[w.soort] ?? "text-ink-faint"}`}>{w.soort}</span>
                        <div>
                          <p className={w.soort === "verwijderd" ? "text-ink line-through decoration-negative/60" : "font-medium text-ink"}>
                            {w.blok}
                          </p>
                          <p className="mt-0.5 text-ink-muted">{w.wat}</p>
                          {punt && (
                            <p className="mt-1 text-meta text-ink-faint">
                              Verbeterpunt {w.verbeterpunt}: {punt.titel}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

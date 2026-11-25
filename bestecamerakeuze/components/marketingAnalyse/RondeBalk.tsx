"use client";

import { IconCalendar } from "@/components/icons";
import { rondeDag, volgendeRonde, volgendeWeergave, vrijdagLang, type PlanningInvoer } from "@/lib/marketingAnalyse/planning";

export type RondeRegel = PlanningInvoer & { id: string; naam: string };

/**
 * De balk boven het overzicht (plan §17): welke analyses de eerstvolgende vrijdag draaien. Het is
 * dezelfde lijst als die van "voer de analyseronde uit" (functie marketing_analyse_ronde), zodat
 * je vóór vrijdag kunt zien of de planning klopt. Een klik op een naam opent die analyse.
 */
export default function RondeBalk({
  regels,
  vandaag,
  onOpen,
}: {
  regels: RondeRegel[];
  vandaag: string;
  onOpen: (id: string) => void;
}) {
  const lijst = volgendeRonde(regels, vandaag);
  const dag = vrijdagLang(rondeDag(vandaag), vandaag);
  return (
    <section className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-panel border border-line bg-card px-6 py-4 shadow-subtle">
      <div className="flex items-center gap-3">
        <IconCalendar className="h-4 w-4 shrink-0 text-ink-faint" />
        <div>
          <h2 className="label-theme text-label text-ink-muted">Volgende analyseronde</h2>
          <p className="mt-0.5 text-sm font-semibold text-ink">
            {dag} · {lijst.length === 0 ? "niets ingepland" : `${lijst.length} ${lijst.length === 1 ? "analyse" : "analyses"}`}
          </p>
        </div>
      </div>
      {lijst.length > 0 ? (
        <ul className="flex flex-1 flex-wrap gap-1.5">
          {lijst.map(({ regel, stand }) => {
            const w = volgendeWeergave(regel, vandaag, stand);
            return (
              <li key={regel.id}>
                <button
                  type="button"
                  onClick={() => onOpen(regel.id)}
                  title="Analyse openen"
                  className={`rounded-pill px-2.5 py-1 text-meta transition-colors duration-[var(--duur-snel)] hover:bg-accent ${
                    w.toon === "eind" ? "bg-orange/15" : "bg-surface"
                  }`}
                >
                  <span className="font-semibold text-ink">{regel.naam}</span>
                  {w.toelichting && <span className="text-ink-muted"> · {w.toelichting}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="flex-1 text-meta text-ink-faint">Zet een analyse in het overzicht op Wekelijks, Maandelijks of Per kwartaal.</p>
      )}
    </section>
  );
}

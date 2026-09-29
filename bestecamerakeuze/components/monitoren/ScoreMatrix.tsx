"use client";

import { useEffect, useMemo, useState } from "react";
import type { Criterium } from "@/lib/landingspagina";
import { formatCijfer, scoreKleur } from "./LandingspaginaRapport";
import { easeOutBack, tussen, useTween } from "./useTween";

/**
 * De interactieve scorematrix van een landingspagina-audit. Twee weergaven van dezelfde
 * zeven criteria:
 *  - Matrix: x = score nu, y = potentie (de verwachte score als het punt wordt opgepakt).
 *    Elke bol schiet vanaf de diagonaal ("geen winst") omhoog naar zijn potentie; hoe
 *    langer de steel, hoe meer er te winnen valt. De grootste kans pulseert.
 *  - Radar: alle zeven criteria in één vorm, de score als vlak en de potentie als contour.
 * Rechts staan dezelfde criteria als rij met een balk, en een paneel dat volgt wat je
 * aanwijst of aanklikt. Alles deelt één hover-stand. Puur weergave: alles komt uit het
 * bewaarde rapport, en zonder `potentie` (oudere rapporten) blijft alles op de diagonaal.
 */

const MAAT = 400;
const RAND = { links: 44, rechts: 16, boven: 16, onder: 44 };
const BINNEN = MAAT - RAND.links - RAND.rechts;
const BOL = 12;
const MIDDEN = MAAT / 2;
const STRAAL = 138;

const px = (score: number) => RAND.links + (score / 10) * BINNEN;
const py = (potentie: number) => MAAT - RAND.onder - (potentie / 10) * BINNEN;

interface Punt {
  c: Criterium;
  index: number;
  score: number;
  potentie: number;
  /** Horizontale verschuiving, zodat bollen op dezelfde plek naast elkaar staan. */
  dx: number;
}

function naarPunten(criteria: Criterium[]): Punt[] {
  const punten: Punt[] = criteria.map((c, index) => ({
    c,
    index,
    score: c.score,
    potentie: Math.max(c.score, c.potentie ?? c.score),
    dx: 0,
  }));
  const groepen = new Map<string, Punt[]>();
  for (const p of punten) {
    const sleutel = `${p.score}/${p.potentie}`;
    groepen.set(sleutel, [...(groepen.get(sleutel) ?? []), p]);
  }
  for (const groep of groepen.values()) {
    groep.forEach((p, i) => (p.dx = (i - (groep.length - 1) / 2) * (BOL * 1.9)));
  }
  return punten;
}

function ga(nummer: number) {
  document.getElementById(`criterium-${nummer}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** De hoek van as `i` in de radar, met de eerste as recht omhoog. */
const hoek = (i: number, n: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
const radarX = (i: number, n: number, waarde: number) => MIDDEN + Math.cos(hoek(i, n)) * (waarde / 10) * STRAAL;
const radarY = (i: number, n: number, waarde: number) => MIDDEN + Math.sin(hoek(i, n)) * (waarde / 10) * STRAAL;

type Weergave = "matrix" | "radar";

function Schakelaar<T extends string>({
  waarde,
  opties,
  onChange,
}: {
  waarde: T;
  opties: { id: T; label: string }[];
  onChange: (id: T) => void;
}) {
  return (
    <div className="inline-flex rounded-button bg-surface p-0.5">
      {opties.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`rounded-button px-3 py-1 text-meta font-medium duration-[var(--duur-snel)] ease-merk transition-[background-color,color,box-shadow] ${
            waarde === o.id ? "bg-card text-ink shadow-subtle" : "text-ink-muted hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function ScoreMatrix({ criteria }: { criteria: Criterium[] }) {
  const punten = useMemo(() => naarPunten(criteria), [criteria]);
  const heeftPotentie = criteria.some((c) => c.potentie !== undefined);
  const totaleWinst = punten.reduce((som, p) => som + (p.potentie - p.score), 0);
  const grootsteKans = punten.reduce<Punt | null>(
    (beste, p) => (p.potentie - p.score > (beste ? beste.potentie - beste.score : 0) ? p : beste),
    null,
  );

  const [weergave, setWeergave] = useState<Weergave>("matrix");
  const [metPotentie, setMetPotentie] = useState(false);
  const [hover, setHover] = useState<number | null>(null);
  const [gekozen, setGekozen] = useState<number | null>(null);

  // Eerst even de huidige stand, dan schieten de bollen naar hun potentie.
  useEffect(() => {
    const t = setTimeout(() => setMetPotentie(true), 650);
    return () => clearTimeout(t);
  }, []);
  const t = useTween(metPotentie ? 1 : 0, 1100);
  const intro = useTween(1, 800);

  const n = punten.length;
  /** Voortgang per criterium, licht gestaffeld en met een overshoot. */
  const voortgang = (i: number) => easeOutBack(tussen((t - (i * 0.05)) / (1 - Math.max(0, n - 1) * 0.05), 0, 1));
  const hoogte = (p: Punt) => p.score + (p.potentie - p.score) * voortgang(p.index);

  const focusNummer = hover ?? gekozen ?? grootsteKans?.c.nummer ?? punten[0]?.c.nummer ?? null;
  const focus = punten.find((p) => p.c.nummer === focusNummer) ?? null;
  const dimmen = (nummer: number) => (hover !== null || gekozen !== null) && (hover ?? gekozen) !== nummer;

  const aanwijzen = (nummer: number | null) => setHover(nummer);
  const kiezen = (nummer: number) => setGekozen((huidig) => (huidig === nummer ? null : nummer));

  return (
    <div className="grid grid-cols-[minmax(0,27rem)_1fr] items-start gap-10">
      {/* Links: de visual */}
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <Schakelaar
            waarde={weergave}
            onChange={setWeergave}
            opties={[
              { id: "matrix", label: "Matrix" },
              { id: "radar", label: "Radar" },
            ]}
          />
          {heeftPotentie && (
            <Schakelaar
              waarde={metPotentie ? "potentie" : "nu"}
              onChange={(id) => setMetPotentie(id === "potentie")}
              opties={[
                { id: "nu", label: "Nu" },
                { id: "potentie", label: "Met verbeteringen" },
              ]}
            />
          )}
        </div>

        <div className="rounded-card bg-surface-tint p-2">
          {weergave === "matrix" ? (
            <svg
              viewBox={`0 0 ${MAAT} ${MAAT}`}
              className="w-full"
              role="img"
              aria-label="Matrix van score tegen potentie per criterium"
            >
              {/* Zones: onder voldoende, doelgebied, en waar die twee elkaar raken de grootste kans */}
              <rect x={RAND.links} y={RAND.boven} width={px(5.5) - RAND.links} height={BINNEN} className="fill-negative" fillOpacity={0.05} />
              <rect x={RAND.links} y={RAND.boven} width={BINNEN} height={py(7) - RAND.boven} className="fill-positive" fillOpacity={0.06} />
              <rect
                x={RAND.links}
                y={RAND.boven}
                width={px(5.5) - RAND.links}
                height={py(7) - RAND.boven}
                className="fill-primary"
                fillOpacity={0.08}
              />
              <text x={RAND.links + 8} y={RAND.boven + 16} className="fill-ink-muted text-[10px] font-medium uppercase tracking-wider">
                Grootste kans
              </text>

              <g className="text-line-soft" stroke="currentColor" strokeWidth={1}>
                {[0, 2, 4, 6, 8, 10].map((v) => (
                  <g key={v}>
                    <line x1={px(v)} x2={px(v)} y1={RAND.boven} y2={MAAT - RAND.onder} />
                    <line x1={RAND.links} x2={MAAT - RAND.rechts} y1={py(v)} y2={py(v)} />
                  </g>
                ))}
              </g>
              <g className="text-line" stroke="currentColor" strokeWidth={1.25}>
                <line x1={RAND.links} x2={MAAT - RAND.rechts} y1={MAAT - RAND.onder} y2={MAAT - RAND.onder} />
                <line x1={RAND.links} x2={RAND.links} y1={RAND.boven} y2={MAAT - RAND.onder} />
              </g>
              {[0, 2, 4, 6, 8, 10].map((v) => (
                <g key={v} className="fill-ink-faint text-[10px]">
                  <text x={px(v)} y={MAAT - RAND.onder + 16} textAnchor="middle">
                    {v}
                  </text>
                  <text x={RAND.links - 10} y={py(v) + 3.5} textAnchor="end">
                    {v}
                  </text>
                </g>
              ))}
              <text x={RAND.links + BINNEN / 2} y={MAAT - 8} textAnchor="middle" className="fill-ink-muted text-[11px]">
                Score nu
              </text>
              <text
                transform={`translate(13 ${RAND.boven + BINNEN / 2}) rotate(-90)`}
                textAnchor="middle"
                className="fill-ink-muted text-[11px]"
              >
                Potentie na verbetering
              </text>

              {/* De diagonaal tekent zichzelf: alles wat erop ligt heeft geen winst */}
              <line
                x1={px(0)}
                y1={py(0)}
                x2={px(10)}
                y2={py(10)}
                className="stroke-ink-faint"
                strokeWidth={1}
                strokeDasharray="4 4"
                opacity={intro}
              />

              {punten.map((p) => {
                const kleur = scoreKleur(p.score);
                const cx = px(p.score) + p.dx;
                const cy = py(hoogte(p));
                const stil = dimmen(p.c.nummer);
                return (
                  <line
                    key={`s${p.c.nummer}`}
                    x1={cx}
                    x2={cx}
                    y1={py(p.score)}
                    y2={cy}
                    className={kleur.tekst}
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    opacity={stil ? 0.12 : 0.5}
                  />
                );
              })}
              {punten.map((p) => {
                const kleur = scoreKleur(p.score);
                const cx = px(p.score) + p.dx;
                const cy = py(hoogte(p));
                const stil = dimmen(p.c.nummer);
                const uitgelicht = focusNummer === p.c.nummer;
                return (
                  <g
                    key={`b${p.c.nummer}`}
                    className={`cursor-pointer ${kleur.tekst}`}
                    style={{ opacity: stil ? 0.3 : 1 }}
                    onMouseEnter={() => aanwijzen(p.c.nummer)}
                    onMouseLeave={() => aanwijzen(null)}
                    onClick={() => kiezen(p.c.nummer)}
                  >
                    <circle cx={cx} cy={py(p.score)} r={3.5} fill="currentColor" opacity={0.9} />
                    {grootsteKans?.c.nummer === p.c.nummer && metPotentie && p.potentie > p.score && (
                      <circle cx={cx} cy={py(p.potentie)} r={BOL} fill="currentColor" className="puls-ring" />
                    )}
                    {uitgelicht && <circle cx={cx} cy={cy} r={BOL + 6} fill="currentColor" opacity={0.15} />}
                    <circle cx={cx} cy={cy} r={uitgelicht ? BOL + 2 : BOL} fill="currentColor" style={{ transition: "r 160ms" }} />
                    <text
                      x={cx}
                      y={cy + 4}
                      textAnchor="middle"
                      className="pointer-events-none fill-on-primary text-[11px] font-semibold"
                    >
                      {p.c.nummer}
                    </text>
                    <title>{`${p.c.naam}: nu ${p.score}, potentie ${p.potentie}`}</title>
                  </g>
                );
              })}
            </svg>
          ) : (
            <svg viewBox={`0 0 ${MAAT} ${MAAT}`} className="w-full" role="img" aria-label="Radar van de scores per criterium">
              {/* Ringen en assen */}
              {[2, 4, 6, 8, 10].map((v) => (
                <polygon
                  key={v}
                  points={punten.map((_, i) => `${radarX(i, n, v * intro)},${radarY(i, n, v * intro)}`).join(" ")}
                  className={v === 10 ? "text-line" : "text-line-soft"}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1}
                />
              ))}
              {punten.map((_, i) => (
                <line
                  key={i}
                  x1={MIDDEN}
                  y1={MIDDEN}
                  x2={radarX(i, n, 10 * intro)}
                  y2={radarY(i, n, 10 * intro)}
                  className="text-line-soft"
                  stroke="currentColor"
                  strokeWidth={1}
                />
              ))}
              {/* Potentie als contour, score als vlak */}
              {heeftPotentie && (
                <polygon
                  points={punten.map((p) => `${radarX(p.index, n, hoogte(p) * intro)},${radarY(p.index, n, hoogte(p) * intro)}`).join(" ")}
                  className="fill-positive stroke-positive"
                  fillOpacity={0.08}
                  strokeWidth={1.75}
                  strokeDasharray="5 4"
                  strokeLinejoin="round"
                />
              )}
              <polygon
                points={punten.map((p) => `${radarX(p.index, n, p.score * intro)},${radarY(p.index, n, p.score * intro)}`).join(" ")}
                className="fill-primary stroke-primary"
                fillOpacity={0.16}
                strokeWidth={2}
                strokeLinejoin="round"
              />
              {[0, 5, 10].map((v) => (
                <text key={v} x={MIDDEN + 4} y={MIDDEN - (v / 10) * STRAAL - 3} className="fill-ink-faint text-[9px]">
                  {v}
                </text>
              ))}
              {punten.map((p) => {
                const kleur = scoreKleur(p.score);
                const stil = dimmen(p.c.nummer);
                const lx = radarX(p.index, n, 11.9);
                const ly = radarY(p.index, n, 11.9);
                return (
                  <g
                    key={p.c.nummer}
                    className={`cursor-pointer ${kleur.tekst}`}
                    style={{ opacity: stil ? 0.3 : 1 }}
                    onMouseEnter={() => aanwijzen(p.c.nummer)}
                    onMouseLeave={() => aanwijzen(null)}
                    onClick={() => kiezen(p.c.nummer)}
                  >
                    <circle cx={radarX(p.index, n, p.score * intro)} cy={radarY(p.index, n, p.score * intro)} r={4.5} fill="currentColor" />
                    {heeftPotentie && p.potentie > p.score && (
                      <circle
                        cx={radarX(p.index, n, hoogte(p) * intro)}
                        cy={radarY(p.index, n, hoogte(p) * intro)}
                        r={3.5}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                      />
                    )}
                    <circle cx={lx} cy={ly} r={focusNummer === p.c.nummer ? BOL + 1 : BOL - 1} fill="currentColor" style={{ transition: "r 160ms" }} />
                    <text x={lx} y={ly + 4} textAnchor="middle" className="pointer-events-none fill-on-primary text-[11px] font-semibold">
                      {p.c.nummer}
                    </text>
                    <title>{`${p.c.naam}: nu ${p.score}, potentie ${p.potentie}`}</title>
                  </g>
                );
              })}
            </svg>
          )}
        </div>

        <p className="mt-2 text-meta leading-snug text-ink-faint">
          {weergave === "matrix"
            ? "Elke bol staat op de verwachte score na verbetering; de stip op de diagonaal is de score nu. Hoe langer de steel, hoe meer er te winnen valt. Klik een bol voor de toelichting."
            : "Het gevulde vlak is de score nu, de gestippelde contour wat er haalbaar is. Klik een nummer voor de toelichting."}
        </p>
      </div>

      {/* Rechts: dezelfde criteria als rij, en het paneel van het aangewezen criterium */}
      <div>
        <ul className="divide-y divide-line-soft">
          {punten.map((p) => {
            const kleur = scoreKleur(p.score);
            const winst = p.potentie - p.score;
            const stil = dimmen(p.c.nummer);
            const uitgelicht = focusNummer === p.c.nummer;
            return (
              <li
                key={p.c.nummer}
                onMouseEnter={() => aanwijzen(p.c.nummer)}
                onMouseLeave={() => aanwijzen(null)}
                className={`rapport-in rounded-control duration-[var(--duur)] ease-merk transition-[opacity,background-color] ${stil ? "opacity-40" : ""} ${uitgelicht ? "bg-surface-tint" : ""}`}
                style={{ ["--i" as string]: p.index + 2 }}
              >
                <button
                  type="button"
                  onClick={() => kiezen(p.c.nummer)}
                  className="grid w-full grid-cols-[1.75rem_1fr_auto] items-center gap-x-3 gap-y-1.5 px-2 py-2.5 text-left"
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-meta font-semibold tabular-nums text-on-primary duration-[var(--duur-snel)] ease-merk transition-transform ${kleur.vlak} ${uitgelicht ? "scale-110" : ""}`}
                  >
                    {p.c.nummer}
                  </span>
                  <span className="truncate text-sm font-medium text-ink">{p.c.naam}</span>
                  <span className="flex items-baseline gap-2 tabular-nums">
                    <span className={`font-sans-w7 text-sm font-semibold ${kleur.tekst}`}>{formatCijfer(p.score)}</span>
                    {heeftPotentie && winst > 0 && (
                      <span className="text-meta text-ink-muted">
                        → {formatCijfer(p.potentie)} <span className="text-positive">+{winst}</span>
                      </span>
                    )}
                  </span>
                  <span />
                  <span className="relative col-span-2 h-2 overflow-hidden rounded-pill bg-progress-track">
                    <span
                      className={`absolute inset-y-0 left-0 rounded-pill opacity-30 ${kleur.vlak}`}
                      style={{ width: `${hoogte(p) * 10 * intro}%` }}
                    />
                    <span
                      className={`absolute inset-y-0 left-0 rounded-pill ${kleur.vlak}`}
                      style={{ width: `${p.score * 10 * intro}%` }}
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {focus && <Detail key={focus.c.nummer} p={focus} heeftPotentie={heeftPotentie} isKans={grootsteKans?.c.nummer === focus.c.nummer} />}

        <p className="mt-3 text-sm text-ink-muted">
          {heeftPotentie ? (
            <>
              Alle punten opgepakt: samen <span className="font-medium text-positive">+{totaleWinst}</span> punten over de{" "}
              {n} criteria.
            </>
          ) : (
            "Bij dit oudere rapport is geen potentie bepaald. Analyseer de pagina opnieuw voor de volledige matrix."
          )}
        </p>
      </div>
    </div>
  );
}

/** Paneel onder de rijen: het aangewezen criterium met tellende cijfers en zijn toelichting. */
function Detail({ p, heeftPotentie, isKans }: { p: Punt; heeftPotentie: boolean; isKans: boolean }) {
  const kleur = scoreKleur(p.score);
  const score = useTween(p.score, 700);
  const potentie = useTween(p.potentie, 900);
  const winst = p.potentie - p.score;
  return (
    <div className="rapport-in mt-4 rounded-card border border-line bg-surface-tint px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-meta text-ink-faint">
            Criterium {p.c.nummer}
            {isKans && heeftPotentie && winst > 0 && <span className="ml-2 font-medium text-primary">Grootste kans</span>}
          </p>
          <p className="font-sans-w7 text-base font-semibold text-ink">{p.c.naam}</p>
        </div>
        <p className="flex shrink-0 items-baseline gap-2 tabular-nums">
          <span className={`font-sans-w7 text-3xl font-semibold ${kleur.tekst}`}>{formatCijfer(Math.round(score * 10) / 10)}</span>
          {heeftPotentie && winst > 0 && (
            <span className="text-sm text-ink-muted">
              → <span className="font-medium text-positive">{formatCijfer(Math.round(potentie * 10) / 10)}</span>
            </span>
          )}
        </p>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink">{p.c.beoordeling}</p>
      <button
        type="button"
        onClick={() => ga(p.c.nummer)}
        className="mt-3 text-meta font-medium text-primary hover:underline"
      >
        Bekijk bij Per criterium ↓
      </button>
    </div>
  );
}

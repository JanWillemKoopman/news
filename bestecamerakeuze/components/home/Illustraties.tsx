/**
 * Isometrische lijntekeningen voor de vier blokken op het startscherm, in de stijl van
 * technische "FIG"-illustraties: dunne lijnen, geen kleur, vlakken in de kaartkleur zodat
 * wat erachter ligt wegvalt. Daardoor wisselen ze vanzelf mee met elk theme (ook de
 * donkere): lijn = `currentColor` (inkt), vlak = `--color-card`.
 *
 * De beweging bij hover staat in globals.css (`.iso-blok`, `.iso-beweeg`): een groep krijgt
 * een verschuiving mee via `--dx`/`--dy` (en eventueel `--vertraging`) en schuift pas als
 * de muis boven het blok staat. Bewust klein — een paar pixels — en uit bij
 * `prefers-reduced-motion`.
 */

type Punt = [number, number];

/** Isometrische projectie: x loopt rechtsomlaag, y linksomlaag, z omhoog. */
function maakProjectie(cx: number, cy: number, schaal: number) {
  return (x: number, y: number, z: number): Punt => [
    cx + (x - y) * 0.866 * schaal,
    cy + (x + y) * 0.5 * schaal - z * schaal,
  ];
}

type Projectie = ReturnType<typeof maakProjectie>;

const pts = (p: Punt[]) => p.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

/** Een blok met zijn drie zichtbare vlakken (boven, rechtsvoor, linksvoor). */
function Blok({
  p,
  x,
  y,
  z,
  b,
  d,
  h,
}: {
  p: Projectie;
  x: number;
  y: number;
  z: number;
  b: number;
  d: number;
  h: number;
}) {
  const boven = [p(x, y, z + h), p(x + b, y, z + h), p(x + b, y + d, z + h), p(x, y + d, z + h)];
  const rechts = [p(x + b, y, z), p(x + b, y + d, z), p(x + b, y + d, z + h), p(x + b, y, z + h)];
  const links = [p(x, y + d, z), p(x + b, y + d, z), p(x + b, y + d, z + h), p(x, y + d, z + h)];
  return (
    <g>
      <polygon points={pts(rechts)} />
      <polygon points={pts(links)} />
      <polygon points={pts(boven)} />
    </g>
  );
}

/** Schuif een groep bij hover; dx/dy in px. */
function beweeg(dx: number, dy: number, vertragingMs = 0): React.CSSProperties {
  return {
    ["--dx" as string]: `${dx.toFixed(1)}px`,
    ["--dy" as string]: `${dy.toFixed(1)}px`,
    ["--vertraging" as string]: `${vertragingMs}ms`,
  };
}

/**
 * `viewBox` is per tekening strak om de lijnen gelegd (met wat ruimte boven voor de
 * hover-beweging), zodat elke illustratie zijn vlak zo goed mogelijk vult.
 */
function Tekening({
  children,
  label,
  viewBox,
}: {
  children: React.ReactNode;
  label: string;
  viewBox: string;
}) {
  return (
    <svg
      viewBox={viewBox}
      role="img"
      aria-label={label}
      className="h-full w-full text-ink"
      fill="var(--color-card)"
      stroke="currentColor"
      strokeWidth={1}
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      <g className="iso-lijnen">{children}</g>
    </svg>
  );
}

/** KPI's: een stapel platen met een staafgrafiek erbovenop; bij hover waaiert de stapel uit. */
export function KpiIllustratie() {
  const s = 16;
  const p = maakProjectie(160, 112, s);
  const plaat = 6;
  const dikte = 0.35;
  const tussen = 0.75;
  const lagen = [0, 1, 2, 3];
  const topZ = lagen.length * tussen - tussen + dikte;
  const staven = [
    { x: 0.9, h: 1.0 },
    { x: 2.1, h: 1.7 },
    { x: 3.3, h: 1.3 },
    { x: 4.5, h: 2.3 },
  ];

  return (
    <Tekening label="Gestapelde platen met een staafgrafiek" viewBox="65 54 190 166">
      {lagen.map((i) => (
        <g key={i} className="iso-beweeg" style={beweeg(0, -i * 3.5)}>
          <Blok p={p} x={0} y={0} z={i * tussen} b={plaat} d={plaat} h={dikte} />
          {i === lagen.length - 1 &&
            staven.map((st, j) => (
              <g key={j} className="iso-beweeg" style={beweeg(0, -(j + 1) * 1.5, 80 + j * 40)}>
                <Blok p={p} x={st.x} y={2.6} z={topZ} b={0.7} d={0.7} h={st.h} />
              </g>
            ))}
        </g>
      ))}
    </Tekening>
  );
}

/** Kanalen: losse kubussen naast elkaar, elk een kanaal; bij hover komen ze los van elkaar omhoog. */
export function KanalenIllustratie() {
  const s = 18;
  const p = maakProjectie(160, 88, s);
  const kubussen = [
    { x: 0, y: 0, h: 2.4, dy: -5 },
    { x: 2.9, y: 0, h: 1.7, dy: -9 },
    { x: 0, y: 2.9, h: 1.7, dy: -7 },
    { x: 2.9, y: 2.9, h: 2.1, dy: -3 },
  ];
  const k = 2.3;

  return (
    <Tekening label="Vier losse kubussen, elk een kanaal" viewBox="67 29 186 165">
      {kubussen.map((c, i) => {
        // Klein merkteken op het bovenvlak: drie streepjes, zoals een logo op een doos.
        const z = c.h;
        const mx = c.x + k / 2;
        const my = c.y + k / 2;
        return (
          <g key={i} className="iso-beweeg" style={beweeg(0, c.dy, i * 50)}>
            <Blok p={p} x={c.x} y={c.y} z={0} b={k} d={k} h={c.h} />
            {[-0.18, 0, 0.18].map((o) => (
              <polyline
                key={o}
                fill="none"
                points={pts([p(mx - 0.35, my + o, z), p(mx + 0.35, my + o, z)])}
              />
            ))}
          </g>
        );
      })}
    </Tekening>
  );
}

/** Tools: een bedieningspaneel met drie schuiven; bij hover schuiven de knoppen een stukje op. */
export function ToolsIllustratie() {
  const s = 20;
  const p = maakProjectie(143, 70, s);
  const b = 7;
  const d = 5;
  const h = 0.5;
  const sleuven = [
    { y: 1.1, kx: 1.4, verschuif: 1.4 },
    { y: 2.5, kx: 4.2, verschuif: -1.2 },
    { y: 3.9, kx: 2.4, verschuif: 1.9 },
  ];

  return (
    <Tekening label="Bedieningspaneel met drie schuiven" viewBox="44 44 232 158">
      <Blok p={p} x={0} y={0} z={0} b={b} d={d} h={h} />
      {sleuven.map((sl, i) => (
        <g key={i}>
          <polyline fill="none" points={pts([p(0.6, sl.y, h), p(b - 0.6, sl.y, h)])} />
          {/* maatstreepjes langs de sleuf */}
          {[1, 2, 3, 4, 5, 6].map((t) => (
            <polyline
              key={t}
              fill="none"
              strokeOpacity={0.6}
              points={pts([p(t, sl.y + 0.28, h), p(t, sl.y + 0.45, h)])}
            />
          ))}
          <g
            className="iso-beweeg"
            style={beweeg(sl.verschuif * 0.866 * s, sl.verschuif * 0.5 * s, i * 60)}
          >
            <Blok p={p} x={sl.kx - 0.35} y={sl.y - 0.3} z={h} b={0.7} d={0.6} h={0.75} />
          </g>
        </g>
      ))}
    </Tekening>
  );
}

/** Campagnes: een rij staande panelen als een tijdlijn; bij hover loopt er een golf doorheen. */
export function CampagnesIllustratie() {
  const s = 16;
  const p = maakProjectie(139, 112, s);
  const hoogtes = [5.4, 4.6, 3.9, 3.3, 2.7, 2.2, 1.8, 1.4, 1.1, 0.8];

  return (
    <Tekening label="Rij staande panelen als een tijdlijn" viewBox="72 10 170 199">
      {hoogtes.map((hoogte, i) => (
        <g key={i} className="iso-beweeg" style={beweeg(0, -4, i * 35)}>
          <Blok p={p} x={i * 0.7} y={0} z={0} b={0.22} d={4} h={hoogte} />
        </g>
      ))}
    </Tekening>
  );
}

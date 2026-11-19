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

/**
 * Een liggende cilinder (schijf) op het grondvlak: zijkant met de onderste halve ellips,
 * daarboven de volledige bovenellips. Een cirkel met straal r wordt in deze projectie een
 * ellips van 1,22·r breed en 0,71·r hoog (× schaal).
 */
function Schijf({
  p,
  s,
  x,
  y,
  z,
  r,
  h,
  band = false,
}: {
  p: Projectie;
  s: number;
  x: number;
  y: number;
  z: number;
  r: number;
  h: number;
  band?: boolean;
}) {
  const rx = 1.2247 * r * s;
  const ry = 0.7071 * r * s;
  const [cx, onder] = p(x, y, z);
  const boven = p(x, y, z + h)[1];
  const midden = (onder + boven) / 2;
  const f = (n: number) => n.toFixed(1);
  return (
    <g>
      <path
        d={`M${f(cx - rx)},${f(boven)} L${f(cx - rx)},${f(onder)} A${f(rx)},${f(ry)} 0 0 0 ${f(cx + rx)},${f(onder)} L${f(cx + rx)},${f(boven)} Z`}
      />
      {band && (
        <path
          fill="none"
          strokeOpacity={0.6}
          d={`M${f(cx - rx)},${f(midden)} A${f(rx)},${f(ry)} 0 0 0 ${f(cx + rx)},${f(midden)}`}
        />
      )}
      <ellipse cx={f(cx)} cy={f(boven)} rx={f(rx)} ry={f(ry)} />
    </g>
  );
}

/**
 * Interne data: een database van drie schijven met datablokjes erboven; bij hover komen
 * de schijven los van elkaar en stijgen de blokjes op.
 */
export function InterneDataIllustratie() {
  const s = 18;
  const p = maakProjectie(160, 130, s);
  const r = 2.4;
  const h = 0.85;
  const tussen = 1.15;
  const lagen = [0, 1, 2];
  const top = (lagen.length - 1) * tussen + h;
  const blokjes = [
    { x: -0.9, y: -0.2, z: 0.9 },
    { x: 0.3, y: -0.9, z: 1.5 },
    { x: 0.5, y: 0.4, z: 2.2 },
  ];

  return (
    <Tekening label="Database van drie schijven met datablokjes" viewBox="92 -2 136 174">
      {lagen.map((i) => (
        <g key={i} className="iso-beweeg" style={beweeg(0, -i * 4)}>
          <Schijf p={p} s={s} x={0} y={0} z={i * tussen} r={r} h={h} band />
          {/* statuslampjes op de voorkant */}
          {[0, 1, 2].map((l) => {
            const [lx, ly] = p(1.2 + l * 0.35, 1.9 - l * 0.35, i * tussen + h * 0.5);
            return <circle key={l} cx={lx.toFixed(1)} cy={ly.toFixed(1)} r={1.4} />;
          })}
        </g>
      ))}
      {blokjes.map((b, j) => (
        <g key={j} className="iso-beweeg" style={beweeg(0, -12 - j * 4, 100 + j * 60)}>
          <Blok p={p} x={b.x} y={b.y} z={top + b.z} b={0.55} d={0.55} h={0.55} />
        </g>
      ))}
    </Tekening>
  );
}

/**
 * Campagnes monitoren: een billboard met een advertentie erop en een doelwit (de
 * doelgroep) ervoor; bij hover komt het doelwit ring voor ring omhoog en de poster een
 * fractie mee.
 */
export function CampagnesIllustratie() {
  const s = 16;
  const p = maakProjectie(150, 95, s);
  // Billboard langs de x-as; het zichtbare voorvlak ligt op y = 0,25.
  const vy = 0.25;
  const pz = 2.2;
  const ph = 3.4;
  const vlak = (x1: number, z1: number, x2: number, z2: number) =>
    pts([p(x1, vy, z1), p(x2, vy, z1), p(x2, vy, z2), p(x1, vy, z2)]);
  const lijn = (x1: number, x2: number, z: number) => pts([p(x1, vy, z), p(x2, vy, z)]);

  return (
    <Tekening label="Billboard met advertentie en een doelwit" viewBox="33 -11 233 233">
      {/* grondplaat, zodat billboard en doelwit op hetzelfde vlak staan */}
      <Blok p={p} x={-0.6} y={-0.6} z={-0.25} b={7.5} d={7.6} h={0.25} />
      <Blok p={p} x={1.1} y={0} z={0} b={0.25} d={0.25} h={pz} />
      <Blok p={p} x={4.9} y={0} z={0} b={0.25} d={0.25} h={pz} />
      <g className="iso-beweeg" style={beweeg(0, -3)}>
        <Blok p={p} x={0} y={0} z={pz} b={6.3} d={vy} h={ph} />
        {/* de advertentie: beeldvlak met een "zon", kop, twee regels en een knop */}
        <polygon points={vlak(0.4, pz + 0.4, 3.1, pz + ph - 0.4)} />
        <polyline
          fill="none"
          strokeOpacity={0.6}
          points={pts([p(0.6, vy, pz + 0.9), p(1.5, vy, pz + 1.9), p(2.1, vy, pz + 1.4), p(2.9, vy, pz + 2.3)])}
        />
        <polyline fill="none" points={lijn(3.5, 5.8, pz + ph - 0.7)} />
        <polyline fill="none" strokeOpacity={0.6} points={lijn(3.5, 5.4, pz + ph - 1.25)} />
        <polyline fill="none" strokeOpacity={0.6} points={lijn(3.5, 5.0, pz + ph - 1.65)} />
        <polygon points={vlak(3.5, pz + 0.45, 5.0, pz + 0.95)} />
      </g>
      {[
        { r: 2.1, i: 0 },
        { r: 1.4, i: 1 },
        { r: 0.7, i: 2 },
      ].map(({ r, i }) => (
        <g key={i} className="iso-beweeg" style={beweeg(0, -(i + 1) * 3, 60 + i * 70)}>
          <Schijf p={p} s={s} x={4.1} y={4.3} z={i * 0.3} r={r} h={0.3} />
        </g>
      ))}
    </Tekening>
  );
}

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

/**
 * Online kanalen: vier kubussen, elk met het teken van een kanaal op het bovenvlak —
 * Google Ads, Instagram, Google Analytics en LinkedIn. Geen echte merklogo's maar
 * eenvoudige lijnversies in dezelfde stijl als de rest van de tekening, plat op het
 * bovenvlak gelegd. Bij hover komen de kubussen los van elkaar omhoog.
 */
export function KanalenIllustratie() {
  const s = 18;
  const p = maakProjectie(160, 88, s);
  const k = 2.3;
  type Pt = [number, number];
  type Teken = "google-ads" | "instagram" | "analytics" | "linkedin";
  const kubussen: { x: number; y: number; h: number; dy: number; teken: Teken }[] = [
    { x: 0, y: 0, h: 2.4, dy: -5, teken: "google-ads" },
    { x: 2.9, y: 0, h: 1.7, dy: -9, teken: "instagram" },
    { x: 0, y: 2.9, h: 1.7, dy: -7, teken: "analytics" },
    { x: 2.9, y: 2.9, h: 2.1, dy: -3, teken: "linkedin" },
  ];

  return (
    <Tekening label="Vier kubussen met de tekens van Google Ads, Instagram, Google Analytics en LinkedIn" viewBox="67 29 186 165">
      {kubussen.map((c, i) => {
        // Tekencoördinaten (u naar rechts, w omhoog, -0,7…0,7) op het bovenvlak: u loopt
        // langs de x-as, "omhoog" is de -y-richting, zodat het teken rechtop leest.
        const mx = c.x + k / 2;
        const my = c.y + k / 2;
        const g = ([u, w]: Pt) => p(mx + u * 1.3, my - w * 1.3, c.h);
        const lijn = (punten: Pt[]) => pts(punten.map(g));
        const cirkel = (cu: number, cw: number, r: number) =>
          lijn(
            Array.from({ length: 24 }, (_, j) => {
              const a = (j / 24) * Math.PI * 2;
              return [cu + Math.cos(a) * r, cw + Math.sin(a) * r] as Pt;
            }),
          );
        const rondVierkant = (u1: number, w1: number, u2: number, w2: number, r: number) => {
          const hoeken: [number, number, number][] = [
            [u2 - r, w2 - r, 0],
            [u1 + r, w2 - r, 90],
            [u1 + r, w1 + r, 180],
            [u2 - r, w1 + r, 270],
          ];
          const punten: Pt[] = [];
          for (const [cu, cw, start] of hoeken) {
            for (let j = 0; j <= 6; j++) {
              const a = ((start + j * 15) * Math.PI) / 180;
              punten.push([cu + Math.cos(a) * r, cw + Math.sin(a) * r]);
            }
          }
          return lijn(punten);
        };
        // Een balk met dikte d tussen twee punten (de "pil" van het Google Ads-teken).
        const balk = ([u1, w1]: Pt, [u2, w2]: Pt, d: number) => {
          const lengte = Math.hypot(u2 - u1, w2 - w1);
          const nu = (-(w2 - w1) / lengte) * (d / 2);
          const nw = ((u2 - u1) / lengte) * (d / 2);
          return lijn([
            [u1 + nu, w1 + nw],
            [u2 + nu, w2 + nw],
            [u2 - nu, w2 - nw],
            [u1 - nu, w1 - nw],
          ]);
        };

        let teken: React.ReactNode = null;
        if (c.teken === "google-ads") {
          teken = (
            <>
              <polygon points={balk([0.02, 0.42], [-0.26, -0.16], 0.28)} />
              <polygon points={balk([0.02, 0.42], [0.42, -0.4], 0.28)} />
              <polygon points={cirkel(-0.4, -0.38, 0.17)} />
            </>
          );
        } else if (c.teken === "instagram") {
          teken = (
            <>
              <polygon points={rondVierkant(-0.55, -0.55, 0.55, 0.55, 0.2)} />
              <polygon points={cirkel(0, 0, 0.24)} />
              <polygon points={cirkel(0.34, 0.34, 0.05)} />
            </>
          );
        } else if (c.teken === "analytics") {
          teken = (
            <>
              <polygon points={rondVierkant(0.22, -0.55, 0.5, 0.55, 0.1)} />
              <polygon points={rondVierkant(-0.14, -0.55, 0.14, 0.15, 0.1)} />
              <polygon points={cirkel(-0.38, -0.41, 0.14)} />
            </>
          );
        } else {
          teken = (
            <>
              <polygon points={rondVierkant(-0.55, -0.55, 0.55, 0.55, 0.1)} />
              <polygon points={cirkel(-0.3, 0.3, 0.07)} />
              <polyline fill="none" points={lijn([[-0.3, 0.12], [-0.3, -0.38]])} />
              <polyline fill="none" points={lijn([[-0.06, 0.12], [-0.06, -0.38]])} />
              <polyline
                fill="none"
                points={lijn([[-0.06, -0.05], [0.04, 0.1], [0.2, 0.14], [0.32, 0.06], [0.34, -0.06], [0.34, -0.38]])}
              />
            </>
          );
        }

        return (
          <g key={i} className="iso-beweeg" style={beweeg(0, c.dy, i * 50)}>
            <Blok p={p} x={c.x} y={c.y} z={0} b={k} d={k} h={c.h} />
            {teken}
          </g>
        );
      })}
    </Tekening>
  );
}

/**
 * Interne data: een serverkast met schijflades (de database) en ernaast een stapeltje
 * klantkaarten (de leads uit Syntec, de contacten uit Selligent). Bij hover schuiven de
 * lades één voor één een stukje open en waaieren de kaarten uit.
 */
export function InterneDataIllustratie() {
  const s = 16;
  const p = maakProjectie(150, 70, s);
  type Pt = [number, number];
  // Serverkast
  const kb = 2.4;
  const kd = 2.4;
  const kh = 4.4;
  const lades = [0, 1, 2, 3, 4];
  // Een stap richting de kijker (langs +y) in px, voor het openschuiven van een lade.
  const uit = (eenheden: number) => beweeg(-eenheden * 0.866 * s, eenheden * 0.5 * s);
  // Klantkaarten
  const kaartX = 3.6;
  const kaartY = 1.2;
  const kaartB = 3.0;
  const kaartD = 2.0;
  const dikte = 0.12;
  const kaarten = [0, 1, 2];
  const bovenZ = (kaarten.length - 1) * 0.28 + dikte;
  const op = ([x, y]: Pt) => p(kaartX + x, kaartY + y, bovenZ);
  const lijn = (punten: Pt[]) => pts(punten.map(op));
  const avatar = Array.from({ length: 24 }, (_, j) => {
    const a = (j / 24) * Math.PI * 2;
    return [0.6 + Math.cos(a) * 0.32, 0.62 + Math.sin(a) * 0.32] as Pt;
  });

  return (
    <Tekening label="Serverkast met schijflades en een stapel klantkaarten" viewBox="72 -14 201 190">
      {/* grondplaat */}
      <Blok p={p} x={-0.5} y={-0.5} z={-0.25} b={7.6} d={4.3} h={0.25} />
      <Blok p={p} x={0} y={0} z={0} b={kb} d={kd} h={kh} />
      {/* ventilatiesleuven op de zijkant */}
      {[0, 1, 2].map((i) => (
        <polyline
          key={i}
          fill="none"
          strokeOpacity={0.6}
          points={pts([p(kb, 0.5, kh - 0.5 - i * 0.25), p(kb, 1.9, kh - 0.5 - i * 0.25)])}
        />
      ))}
      {lades.map((i) => {
        const z = 0.3 + i * 0.78;
        return (
          <g key={i} className="iso-beweeg" style={{ ...uit(i % 2 === 0 ? 0.45 : 0.25), ["--vertraging" as string]: `${i * 60}ms` }}>
            <Blok p={p} x={0.25} y={kd} z={z} b={kb - 0.5} d={0.14} h={0.55} />
            {/* greep en statuslampje op de voorkant van de lade */}
            <polyline fill="none" points={pts([p(0.6, kd + 0.14, z + 0.28), p(1.3, kd + 0.14, z + 0.28)])} />
            {(() => {
              const [lx, ly] = p(1.85, kd + 0.14, z + 0.28);
              return <circle cx={lx.toFixed(1)} cy={ly.toFixed(1)} r={1.6} />;
            })()}
          </g>
        );
      })}
      {kaarten.map((i) => (
        <g key={i} className="iso-beweeg" style={beweeg(i * 0.3 * 0.866 * s, i * 0.3 * 0.5 * s - i * 3, 80 + i * 60)}>
          <Blok p={p} x={kaartX} y={kaartY} z={i * 0.28} b={kaartB} d={kaartD} h={dikte} />
          {i === kaarten.length - 1 && (
            <>
              <polygon points={lijn(avatar)} />
              <polyline fill="none" points={lijn([[1.2, 0.5], [2.6, 0.5]])} />
              <polyline fill="none" strokeOpacity={0.6} points={lijn([[1.2, 0.85], [2.3, 0.85]])} />
              <polyline fill="none" strokeOpacity={0.6} points={lijn([[0.35, 1.35], [2.6, 1.35]])} />
              <polyline fill="none" strokeOpacity={0.6} points={lijn([[0.35, 1.65], [2.0, 1.65]])} />
            </>
          )}
        </g>
      ))}
    </Tekening>
  );
}

/**
 * Campagnes monitoren: een billboard met een autoadvertentie (we zijn een autodealer):
 * links de auto in zijaanzicht, rechts kop, tekstregels en een knop. Bij hover komt het
 * bord een fractie omhoog en rijdt de auto een stukje naar rechts.
 */
export function CampagnesIllustratie() {
  const s = 16;
  const p = maakProjectie(150, 95, s);
  // Billboard langs de x-as; het zichtbare voorvlak ligt op y = vy, dus alles op het bord
  // tekenen we in (u, v) = (x, z) op dat vlak.
  const vy = 0.25;
  const bb = 8.2;
  const pz = 2.2;
  const ph = 3.6;
  const f = (u: number, v: number) => p(u, vy, pz + v);
  const vlak = (u1: number, v1: number, u2: number, v2: number) =>
    pts([f(u1, v1), f(u2, v1), f(u2, v2), f(u1, v2)]);
  const lijn = (u1: number, u2: number, v: number) => pts([f(u1, v), f(u2, v)]);

  // De auto, in zijaanzicht, met zijn linkerkant op u0 en de weg op v0.
  const u0 = 0.55;
  const v0 = 0.7;
  const k = 1.25; // schaal van de auto op het bord
  const auto = (pnt: [number, number][]) =>
    pts(pnt.map(([u, v]) => f(u0 + u * k, v0 + v * k)));
  const carrosserie: [number, number][] = [
    [0.05, 0.22],
    [0, 0.55],
    [0.2, 0.68],
    [0.95, 0.8],
    [1.45, 1.28],
    [2.45, 1.28],
    [3.0, 0.82],
    [3.45, 0.72],
    [3.6, 0.5],
    [3.55, 0.22],
  ];
  const ruiten: [number, number][][] = [
    [
      [1.08, 0.84],
      [1.52, 1.2],
      [1.95, 1.2],
      [1.95, 0.84],
    ],
    [
      [2.05, 0.84],
      [2.05, 1.2],
      [2.4, 1.2],
      [2.78, 0.84],
    ],
  ];
  // Een wiel is een cirkel in het vlak van het bord; in deze projectie een scheve ellips,
  // dus als veelhoek berekend in plaats van als <ellipse>.
  const wiel = (cu: number, r: number) =>
    auto(
      Array.from({ length: 20 }, (_, i) => {
        const a = (i / 20) * Math.PI * 2;
        return [cu + Math.cos(a) * r, 0.22 + Math.sin(a) * r] as [number, number];
      }),
    );

  return (
    <Tekening label="Billboard met een autoadvertentie" viewBox="91 -12 201 214">
      {/* grondplaat */}
      <Blok p={p} x={-0.6} y={-0.6} z={-0.25} b={bb + 1.2} d={3.4} h={0.25} />
      <Blok p={p} x={1.4} y={0} z={0} b={0.25} d={0.25} h={pz} />
      <Blok p={p} x={bb - 1.65} y={0} z={0} b={0.25} d={0.25} h={pz} />
      <g className="iso-beweeg" style={beweeg(0, -3)}>
        <Blok p={p} x={0} y={0} z={pz} b={bb} d={vy} h={ph} />
        <polygon points={vlak(0.25, 0.25, bb - 0.25, ph - 0.25)} />
        {/* de weg onder de auto */}
        <polyline fill="none" strokeOpacity={0.6} points={lijn(0.45, 5.25, v0 - 0.02)} />
        {/* kop, twee regels en een knop */}
        <polyline fill="none" points={lijn(5.5, bb - 0.55, ph - 0.85)} />
        <polyline fill="none" strokeOpacity={0.6} points={lijn(5.5, bb - 0.85, ph - 1.35)} />
        <polyline fill="none" strokeOpacity={0.6} points={lijn(5.5, bb - 1.25, ph - 1.7)} />
        <polygon points={vlak(5.5, 0.6, 6.9, 1.1)} />
        <g
          className="iso-beweeg"
          style={beweeg(0.35 * 0.866 * s, 0.35 * 0.5 * s, 120)}
        >
          <polygon points={auto(carrosserie)} />
          {ruiten.map((r, i) => (
            <polygon key={i} points={auto(r)} />
          ))}
          {/* deurnaad en koplamp */}
          <polyline fill="none" strokeOpacity={0.6} points={auto([[2.0, 0.3], [2.0, 0.82]])} />
          <polyline fill="none" strokeOpacity={0.6} points={auto([[3.3, 0.58], [3.52, 0.58]])} />
          {[0.75, 2.85].map((cu) => (
            <g key={cu}>
              <polygon points={wiel(cu, 0.3)} />
              <polygon points={wiel(cu, 0.13)} />
            </g>
          ))}
        </g>
      </g>
    </Tekening>
  );
}

/**
 * Marketing analyse: een trechter van vier platen die van boven naar beneden smaller
 * worden (de full funnel: van bereik naar lead), met onderaan het blokje dat eruit komt.
 * Bij hover waaieren de platen uit en valt het blokje een stukje verder.
 * Staat in de sidebar (`components/Sidebar.tsx`), niet op het startscherm.
 */
export function AnalyseIllustratie() {
  const s = 15;
  const p = maakProjectie(150, 70, s);
  const dikte = 0.3;
  const tussen = 1.55;
  // Van onder naar boven getekend, zodat elke bredere plaat over de smallere eronder valt.
  const maten = [1.6, 3.0, 4.4, 5.8];
  const midden = 3;

  return (
    <Tekening label="Een trechter van platen met onderaan een lead" viewBox="71 -17 159 173">
      <g className="iso-beweeg" style={beweeg(0, 6, 160)}>
        <Blok p={p} x={midden - 0.45} y={midden - 0.45} z={-1.6} b={0.9} d={0.9} h={0.9} />
      </g>
      {maten.map((m, i) => (
        <g key={m} className="iso-beweeg" style={beweeg(0, -i * 3)}>
          <Blok
            p={p}
            x={midden - m / 2}
            y={midden - m / 2}
            z={i * tussen}
            b={m}
            d={m}
            h={dikte}
          />
        </g>
      ))}
    </Tekening>
  );
}

/**
 * Campagne timeline: een grondplaat met vier balken als in een Gantt-planning, langs de
 * tijdas (x). Bij hover schuiven de balken elk een eigen stukje op in de tijd.
 * Staat in de sidebar (`components/Sidebar.tsx`), niet op het startscherm.
 */
export function TimelineIllustratie() {
  const s = 15;
  const p = maakProjectie(140, 60, s);
  const lengte = 8.4;
  const diepte = 5;
  const balken = [
    { y: 0.5, x: 0.5, b: 3.4, h: 0.45, schuif: 0.5 },
    { y: 1.6, x: 2.4, b: 4.2, h: 0.7, schuif: -0.4 },
    { y: 2.7, x: 1.1, b: 2.6, h: 0.45, schuif: 0.7 },
    { y: 3.8, x: 3.6, b: 3.8, h: 0.6, schuif: -0.3 },
  ];
  // Een stap langs de tijdas (+x) in px.
  const langs = (eenheden: number, vertraging: number) =>
    beweeg(eenheden * 0.866 * s, eenheden * 0.5 * s, vertraging);

  return (
    <Tekening label="Een planning met balken langs een tijdas" viewBox="71 54 182 115">
      <Blok p={p} x={0} y={0} z={-0.3} b={lengte} d={diepte} h={0.3} />
      {/* maandstrepen op de grondplaat */}
      {[2.1, 4.2, 6.3].map((x) => (
        <polyline
          key={x}
          fill="none"
          strokeOpacity={0.5}
          strokeDasharray="2 3"
          points={pts([p(x, 0.15, 0), p(x, diepte - 0.15, 0)])}
        />
      ))}
      {balken.map((bk, i) => (
        <g key={i} className="iso-beweeg" style={langs(bk.schuif, i * 50)}>
          <Blok p={p} x={bk.x} y={bk.y} z={0} b={bk.b} d={0.7} h={bk.h} />
        </g>
      ))}
    </Tekening>
  );
}

"use client";

import { AS_GROOTTE, formatteer } from "@/components/chat/chartTheme";

/**
 * Getallen in en boven de staven van een staafgrafiek (Syntec leads, Leads): het aantal midden
 * in elk deel van een gestapelde staaf en het totaal erboven. Een getal verschijnt alleen als
 * het past; anders blijft hij weg in plaats van over de rand te lopen (de tooltip heeft hem
 * altijd). De cijfers hebben een rand in de kleur eronder, zodat ze op een rasterlijn leesbaar
 * blijven.
 */

/** Relatieve luminantie van een #rrggbb-kleur (WCAG). */
function luminantie(hex: string): number {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  if (!m) return 0;
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => {
    const c = parseInt(h, 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [l1, l2] = [luminantie(a), luminantie(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** De tekstkleur uit het theme (label of vlak) die het best leesbaar is op deze vulkleur. */
export function tekstOp(vul: string, opties: string[]): string {
  return opties.reduce((best, k) => (contrast(vul, k) > contrast(vul, best) ? k : best), opties[0]);
}

/** Een kleur met dekking `dekking` over de ondergrond: wat je ziet bij een lichtere staaf. */
export function gemengd(kleur: string, ondergrond: string, dekking: number): string {
  const rgb = (hex: string) => {
    const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
    return m ? [m[1], m[2], m[3]].map((h) => parseInt(h, 16)) : [0, 0, 0];
  };
  const [a, b] = [rgb(kleur), rgb(ondergrond)];
  return `#${a
    .map((c, i) => Math.round(c * dekking + b[i] * (1 - dekking)).toString(16).padStart(2, "0"))
    .join("")}`;
}

/** Hoe een getal in een deel van de staaf eruitziet: tekstkleur en een rand in de vulkleur. */
export interface LabelStijl {
  tekst: string;
  /** Zelfde kleur als het deel: een smalle rand om de cijfers, zodat ze ook op de rand van
   *  een deel of een rasterlijn leesbaar blijven. */
  halo: string;
}

/** Minimale ruimte voor een getal: breedte van de staaf en hoogte van het deel, in pixels. */
export const MIN_BREEDTE = 24;
export const MIN_HOOGTE = 15;
/** Geschatte breedte van één cijfer op `AS_GROOTTE`, in pixels. */
export const TEKEN_BREEDTE = 7;

export interface LabelProps {
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  value?: number | string | null;
  index?: number;
}

function getal(v: LabelProps["value"]): number {
  return typeof v === "number" ? v : Number(v ?? 0);
}

const alsAantal = (v: number) => formatteer(v, "aantal");

/** Het getal midden in een deel van de staaf, alleen als het er ruim in past. */
export function MiddenLabel({ stijl, ...p }: LabelProps & { stijl: LabelStijl }) {
  const [x, y, w, h, v] = [Number(p.x), Number(p.y), Number(p.width), Number(p.height), getal(p.value)];
  if (!v || w < MIN_BREEDTE || h < MIN_HOOGTE) return null;
  const tekst = alsAantal(v);
  if (tekst.length * TEKEN_BREEDTE > w - 2) return null;
  return (
    <text
      x={x + w / 2}
      y={y + h / 2}
      fill={stijl.tekst}
      stroke={stijl.halo}
      strokeWidth={3}
      paintOrder="stroke"
      fontSize={AS_GROOTTE}
      fontWeight={600}
      textAnchor="middle"
      dominantBaseline="central"
      pointerEvents="none"
    >
      {tekst}
    </text>
  );
}

/**
 * Het totaal boven de staaf. `opmaak` zet het getal in tekst (standaard een aantal); bij een
 * bedrag dat niet past, valt hij terug op `kort` (bv. "€ 1,2k") voordat hij wegblijft.
 */
export function TotaalLabel({
  kleur,
  halo,
  opmaak = alsAantal,
  kort,
  ...p
}: LabelProps & {
  kleur: string;
  halo: string;
  opmaak?: (v: number) => string;
  kort?: (v: number) => string;
}) {
  const [x, y, w, v] = [Number(p.x), Number(p.y), Number(p.width), getal(p.value)];
  if (!v || w < MIN_BREEDTE - 6) return null;
  const ruimte = w + 10;
  let tekst = opmaak(v);
  if (tekst.length * TEKEN_BREEDTE > ruimte && kort) tekst = kort(v);
  if (tekst.length * TEKEN_BREEDTE > ruimte) return null;
  return (
    <text
      x={x + w / 2}
      y={y - 6}
      fill={kleur}
      stroke={halo}
      strokeWidth={3}
      paintOrder="stroke"
      fontSize={AS_GROOTTE}
      fontWeight={700}
      textAnchor="middle"
      pointerEvents="none"
    >
      {tekst}
    </text>
  );
}

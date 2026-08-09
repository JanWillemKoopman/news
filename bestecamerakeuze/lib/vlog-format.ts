import { STABILISATION_LABELS, type Product } from "./types";

/**
 * Weergave van de vlog-velden. Eén plek, omdat de keuzehulp, de top 10 en de
 * vergelijkingstabel dezelfde waarden tonen en ze niet uit elkaar mogen lopen.
 *
 * Belangrijkste regel: `null` is "niet geverifieerd", niet "nee". Daarom heeft elke cel
 * naast een tekst ook een `tone`, zodat de tabel een streepje grijs kan tonen en een
 * echte "nee" rood — het verschil tussen "deze camera kan het niet" en "wij weten het
 * niet" is voor een koper wezenlijk.
 */

export const UNKNOWN = "—";

export type CellTone = "good" | "bad" | "neutral" | "unknown";

export type Cell = {
  text: string;
  tone: CellTone;
  /** Voorleestekst waar het symbool alleen niet volstaat. */
  srText?: string;
};

const UNKNOWN_CELL: Cell = { text: UNKNOWN, tone: "unknown", srText: "niet geverifieerd" };

/** Ja/nee-veld waarbij "ja" het gunstige antwoord is (microfooningang, klapscherm). */
export function yesCell(value: boolean | null): Cell {
  if (value === null) return UNKNOWN_CELL;
  return value
    ? { text: "Ja", tone: "good" }
    : { text: "Nee", tone: "bad" };
}

/** Ja/nee-veld waarbij "ja" juist ongunstig is (oververhitting). */
export function riskCell(value: boolean | null): Cell {
  if (value === null) return UNKNOWN_CELL;
  return value
    ? { text: "Gemeten", tone: "bad", srText: "oververhitting gemeten in reviews" }
    : { text: "Niet gemeld", tone: "good" };
}

export function stabilisationCell(product: Product): Cell {
  if (product.stabilisation === null) return UNKNOWN_CELL;
  const label = STABILISATION_LABELS[product.stabilisation];
  // Een gimbal en sensor-shift lossen looppassen echt op; digitaal doet dat deels en
  // kost beeldhoek; geen stabilisatie is voor vloggen een reëel bezwaar.
  const tone: CellTone =
    product.stabilisation === "geen"
      ? "bad"
      : product.stabilisation === "digitaal"
        ? "neutral"
        : "good";
  return { text: label, tone };
}

export function recordingLimitCell(product: Product): Cell {
  if (product.unlimited_recording === true) return { text: "Geen limiet", tone: "good" };
  if (product.max_clip_minutes !== null) {
    return { text: `${product.max_clip_minutes} min per clip`, tone: "neutral" };
  }
  return UNKNOWN_CELL;
}

export function weightCell(product: Product): Cell {
  if (product.weight_g === null) return UNKNOWN_CELL;
  return { text: `${product.weight_g} g`, tone: "neutral" };
}

export function batteryCell(product: Product): Cell {
  if (product.battery_video_minutes === null) return UNKNOWN_CELL;
  return { text: `${product.battery_video_minutes} min`, tone: "neutral" };
}

export function textCell(value: string | null): Cell {
  if (!value) return UNKNOWN_CELL;
  return { text: value, tone: "neutral" };
}

export function logProfilesCell(product: Product): Cell {
  if (product.log_profiles.length === 0) return UNKNOWN_CELL;
  return { text: product.log_profiles.join(", "), tone: "neutral" };
}

/**
 * De vier eigenschappen die op een kaart passen en waar een vlogger het eerst naar kijkt.
 * Bewust vier: meer past niet op een telefoonscherm zonder te gaan afkappen.
 */
export function highlightChips(product: Product): Cell[] {
  const stabilisation = stabilisationCell(product);
  return [
    // Op een chip mist "Digitaal" zijn onderwerp; met het label ervoor is hij zonder
    // omliggende tekst te begrijpen.
    {
      ...stabilisation,
      text:
        stabilisation.tone === "unknown"
          ? "Stabilisatie onbekend"
          : `Stabilisatie: ${stabilisation.text.toLowerCase()}`,
    },
    {
      ...yesCell(product.mic_input),
      text: product.mic_input === null ? UNKNOWN : product.mic_input ? "Mic-ingang" : "Geen mic-ingang",
    },
    {
      ...yesCell(product.flip_screen),
      text: product.flip_screen === null ? UNKNOWN : product.flip_screen ? "Klapscherm" : "Geen klapscherm",
    },
    { ...weightCell(product), tone: "neutral" },
  ];
}

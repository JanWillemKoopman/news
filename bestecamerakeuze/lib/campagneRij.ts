/**
 * Waar komt een campagne in de "Campagnes"-sheet te staan?
 *
 * Dit is bewust een aparte module zonder `googleapis` en zonder netwerk: het rekenwerk
 * (welk rijnummer, welke kolomletter, welk celadres) is precies het stukje dat eerder
 * fout ging en moet daarom te testen zijn — zie `campagneRij.test.ts`.
 *
 * Alle functies werken op de waarden zoals `spreadsheets.values.get` ze teruggeeft:
 * een array van rijen, rij 0 is de kopregel, en lege cellen aan het einde van een rij
 * ontbreken gewoon in de array. Rijnummers die eruit komen zijn 1-based, net als in de
 * sheet zelf.
 */

/** A1-kolomletter uit een 0-based kolomindex (0 → A, 25 → Z, 26 → AA, ...). */
export function kolomLetter(index: number): string {
  let letter = "";
  let n = index;
  while (n >= 0) {
    letter = String.fromCharCode((n % 26) + 65) + letter;
    n = Math.floor(n / 26) - 1;
  }
  return letter;
}

/** A1-celadres uit een 0-based kolomindex en een 1-based rijnummer (0, 41 → "A41"). */
export function celAdres(kolomIndex: number, rij: number): string {
  return `${kolomLetter(kolomIndex)}${rij}`;
}

function celwaarde(rijen: string[][], rijIndex: number, kolomIndex: number): string {
  return rijen[rijIndex]?.[kolomIndex]?.trim() ?? "";
}

/**
 * Het rijnummer van een campagne, gezocht op naam (hoofdletterongevoelig), of 0 als hij
 * er niet staat. De kopregel telt niet mee, en een lege naam vindt niets — anders zou
 * die de eerste de beste lege rij "vinden".
 */
export function rijVanCampagne(rijen: string[][], campagneKolomIndex: number, naam: string): number {
  const gezocht = naam.trim().toLowerCase();
  if (gezocht === "") return 0;
  for (let i = 1; i < rijen.length; i += 1) {
    if (celwaarde(rijen, i, campagneKolomIndex).toLowerCase() === gezocht) return i + 1;
  }
  return 0;
}

/**
 * Het rijnummer waar een nieuwe campagne hoort: direct onder de laatste rij die een
 * campagnenaam heeft. Bewust op de naamkolom en niet op "de laatste rij met iets erin",
 * want onder de campagnes lopen doorgetrokken formules (Leads, Leads marketing) tot
 * honderden rijen ver door — die rijen zijn gevuld, maar zijn geen campagne.
 */
export function nieuweCampagneRij(rijen: string[][], campagneKolomIndex: number): number {
  let laatste = 1; // de kopregel; staat er nog geen campagne, dan wordt het rij 2
  for (let i = 1; i < rijen.length; i += 1) {
    if (celwaarde(rijen, i, campagneKolomIndex) !== "") laatste = i + 1;
  }
  return laatste + 1;
}

/**
 * De kolomletters die in deze rij al iets bevatten, van de kolommen die we zelf willen
 * vullen. Leeg betekent: hier mag geschreven worden. De formulekolommen geven we hier
 * niet mee — die staan in elke lege rij al gevuld en blijven ongemoeid.
 */
export function bezetteKolommen(rijen: string[][], rij: number, kolomIndexen: number[]): string[] {
  return kolomIndexen
    .filter((kolomIndex) => celwaarde(rijen, rij - 1, kolomIndex) !== "")
    .map((kolomIndex) => kolomLetter(kolomIndex));
}

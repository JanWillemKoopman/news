/**
 * Hoe een ruwe waarde uit de export op het scherm komt.
 *
 * De data gaat onbewerkt het dashboard in: geen opschoning, geen vertaaltabel, en ook
 * geen spaties weggehaald. Dat levert één leesprobleem op, en alleen dit ene. In de
 * export staat bij `VDUVEHICLES_FUEL_TYPE` een waarde die uit één spatie bestaat (11
 * rijen), en bij `VDUVEHICLES_MODEL` staan vier waarden met een spatie aan de rand. In
 * een keuzelijst is dat een lege regel, en een regel die er precies hetzelfde uitziet als
 * de regel erboven.
 *
 * Deze functie zet zulke waarden tussen aanhalingstekens, zodat de spatie zichtbaar wordt
 * zonder dat er iets aan de waarde verandert: `" "` en `"Golf "` naast `Golf`. Er wordt
 * dus niets opgeschoond — het wordt alleen leesbaar gemaakt dát er witruimte in staat, en
 * dat is precies het soort rommel dat je in een datadashboard wíl zien.
 *
 * Een waarde zonder witruimte aan de rand komt onveranderd terug, zonder aanhalingstekens.
 * Filteren gebeurt altijd op de ruwe waarde; dit is uitsluitend weergave.
 */
export function toonWaarde(waarde: string): string {
  return waarde !== waarde.trim() ? `"${waarde}"` : waarde;
}

/**
 * De weergavenamen voor een lijst waarden, als map — de vorm die `FilterSelect` verwacht.
 * Alleen de waarden die er anders uitzien komen erin, zodat de map in de praktijk leeg is.
 */
export function weergaveNamen(waarden: string[]): Record<string, string> | undefined {
  const namen: Record<string, string> = {};
  for (const waarde of waarden) {
    const getoond = toonWaarde(waarde);
    if (getoond !== waarde) namen[waarde] = getoond;
  }
  return Object.keys(namen).length > 0 ? namen : undefined;
}

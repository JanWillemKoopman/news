/**
 * Welke onderdelen van het dataloket zijn geconfigureerd?
 *
 * Achtergrond: het campagnedashboard is begonnen als een publieke pagina zonder
 * database. Het dataloket mocht dat niet stukmaken zolang Supabase, de dataverbinding en
 * de Claude-sleutel nog niet waren ingesteld. Daarom wordt overal expliciet
 * gecontroleerd of iets geconfigureerd is, en toont de chat anders een nette uitleg in
 * plaats van te crashen.
 *
 * Publiek is het dashboard niet meer: de inlog ligt sinds `lib/toegang.ts` over de héle
 * app. Ontbreekt Supabase, dan kan niemand inloggen en blijft alles dicht — het
 * inlogscherm vertelt dan wat er mist.
 */

export function isSupabaseGeconfigureerd(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function isClaudeGeconfigureerd(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function isDataverbindingGeconfigureerd(): boolean {
  return Boolean(process.env.DATAQUERY_DATABASE_URL);
}

export interface ChatGereedheid {
  gereed: boolean;
  /** Wat er nog ontbreekt, in mensentaal — wordt in de UI getoond. */
  ontbreekt: string[];
}

export function chatGereedheid(): ChatGereedheid {
  const ontbreekt: string[] = [];
  if (!isSupabaseGeconfigureerd()) {
    ontbreekt.push(
      "Supabase (NEXT_PUBLIC_SUPABASE_URL en NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) — nodig voor inloggen",
    );
  }
  if (!isDataverbindingGeconfigureerd()) {
    ontbreekt.push(
      "DATAQUERY_DATABASE_URL — de read-only databaseverbinding waarop de vragen draaien",
    );
  }
  if (!isClaudeGeconfigureerd()) {
    ontbreekt.push("ANTHROPIC_API_KEY — de sleutel voor de Claude API");
  }
  return { gereed: ontbreekt.length === 0, ontbreekt };
}

/**
 * De koppeling met Windsor.ai (advertentie-, post- en accountdata voor "Kanalen").
 *
 * Los van `isDataverbindingGeconfigureerd()`: het dashboard leest de Windsor-data uit
 * dezelfde Postgres als de chat, maar de sleutel is alleen nodig voor de nachtelijke
 * sync. Staan de tabellen al vol en is de sleutel weg, dan blijven de pagina's gewoon
 * werken — ze lopen alleen achter.
 */
export function isWindsorGeconfigureerd(): boolean {
  return Boolean(process.env.WINDSOR_API_KEY);
}

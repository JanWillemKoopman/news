"use client";

/**
 * De selectie in de URL.
 *
 * Zonder dit overleeft een selectie geen refresh en is hij niet te delen: "kijk even
 * naar deze campagne over het laatste kwartaal" werd een handleiding van vier klikken in
 * plaats van een link. De zoekparameters horen bij de pagina die je bekijkt, dus ze
 * worden alleen geschreven door het tabblad dat op dat moment open staat — zie
 * `ActieveWeergave` in `AppShell`.
 *
 * Er wordt bewust `replaceState` gebruikt en geen router-navigatie: elke filterklik een
 * regel in de geschiedenis zetten maakt de terugknop onbruikbaar, en Next opnieuw laten
 * renderen voor iets wat volledig in het geheugen gebeurt zou het instant filteren juist
 * weer stukmaken.
 */

const PERIODE = "periode";
const VAN = "van";
const TOT = "tot";
/** Filters krijgen een prefix, zodat ze niet botsen met `tab` of `periode`. */
const FILTER_PREFIX = "f.";

export interface UrlStand {
  periodeId: string | null;
  van: string | null;
  tot: string | null;
  filters: Record<string, string[]>;
}

export function leesUrlStand(): UrlStand {
  if (typeof window === "undefined") {
    return { periodeId: null, van: null, tot: null, filters: {} };
  }
  const params = new URLSearchParams(window.location.search);
  const filters: Record<string, string[]> = {};
  params.forEach((waarde, sleutel) => {
    if (!sleutel.startsWith(FILTER_PREFIX)) return;
    const dimensie = sleutel.slice(FILTER_PREFIX.length);
    // Meerdere waarden per dimensie staan als aparte parameters; een waarde met een
    // komma erin (een campagnenaam kan dat) blijft daardoor heel.
    filters[dimensie] = [...(filters[dimensie] ?? []), waarde];
  });
  return {
    periodeId: params.get(PERIODE),
    van: params.get(VAN),
    tot: params.get(TOT),
    filters,
  };
}

export function schrijfUrlStand(stand: UrlStand): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);

  [...params.keys()].forEach((sleutel) => {
    if (sleutel.startsWith(FILTER_PREFIX) || sleutel === PERIODE || sleutel === VAN || sleutel === TOT) {
      params.delete(sleutel);
    }
  });

  if (stand.periodeId) params.set(PERIODE, stand.periodeId);
  if (stand.periodeId === "eigen" && stand.van && stand.tot) {
    params.set(VAN, stand.van);
    params.set(TOT, stand.tot);
  }
  Object.entries(stand.filters).forEach(([dimensie, waarden]) => {
    waarden.forEach((waarde) => params.append(`${FILTER_PREFIX}${dimensie}`, waarde));
  });

  const zoek = params.toString();
  window.history.replaceState(null, "", `${window.location.pathname}${zoek ? `?${zoek}` : ""}`);
}

/** Haalt alle paginagebonden parameters weg — bij het wisselen van tabblad. */
export function wisUrlStand(): void {
  schrijfUrlStand({ periodeId: null, van: null, tot: null, filters: {} });
}

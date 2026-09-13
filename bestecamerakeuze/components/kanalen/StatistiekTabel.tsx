"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import {
  IconChevronDown,
  IconChevronUpDown,
  IconDownload,
  IconInfo,
} from "@/components/icons";
import Verschilregel from "@/components/kanalen/Verschilregel";
import { formatteer, type Eenheid } from "@/components/chat/chartTheme";
import { groepeer, telOp, waardeVan, type Groep, type Kubus } from "@/lib/kanalen/kubus";
import { verschilVan } from "@/lib/kanalen/vergelijk";
import type { Statistiek } from "@/lib/windsor/velden";

/**
 * De tabel onder de grafiek.
 *
 * Anders dan de campagnetabel op het tabblad Campagnes staan hier de rijen onder elkaar
 * en de statistieken naast elkaar: daar gaat het om een handvol campagnes die je naast
 * elkaar legt, hier om honderden advertenties waar je doorheen scrollt en op sorteert.
 * Dat is een bewust ander patroon voor een andere vraag, geen inconsistentie.
 *
 * Onderaan staat één plakkende **totaalregel**. Die telt over dezelfde rijen als de
 * tabel en niet over de regels erboven: bij CTR of kosten per lead is het gewogen totaal
 * iets anders dan het gemiddelde van de regels, en dat verschil is precies waar een
 * dashboard stilletjes de mist in gaat.
 *
 * **Alle statistieken zijn beschikbaar, niet alle staan aan.** Elke statistiek uit
 * `lib/windsor/velden.ts` is aan te zetten via "Kolommen"; wat er bij het openen staat is
 * wat `standaard: true` draagt, of wat je de vorige keer koos — die keuze blijft in
 * localStorage staan, want anders begint elke sessie weer bij nul.
 */

/**
 * Moet gelijk blijven aan `DETAIL_LIMIET` in `lib/kanalen/bron.ts`; die module importeert
 * `pg` en hoort daarom niet in een client component thuis.
 */
const DETAIL_LIMIET = 2000;

/** Sorteersleutel voor de datumkolom; geen statistiek, dus geen id uit `velden.ts`. */
const DATUM_SORTEERSLEUTEL = "__datum";

type Props = {
  titel: string;
  toelichting: string;
  kubus: Kubus;
  rijen: number[][];
  /** Dezelfde selectie over de vorige periode; null als de vergelijking uit staat. */
  vorige: { kubus: Kubus; rijen: number[][] } | null;
  /** Op welke dimensie de rijen worden samengevoegd. */
  groepeerOp: string;
  /** Kolomkop boven die dimensie. */
  groepLabel: string;
  /** Metaveld met de leesbare naam, als `groepeerOp` een id is. */
  labelVeld?: string;
  statistieken: Statistiek[];
  /** Toont de creative of de post bij de naam, als de kubus die meedraagt. */
  toonBeeld?: boolean;
  /** Zet een sorteerbare datumkolom vóór de cijfers — alleen zinnig bij losse posts. */
  toonDatum?: boolean;
  uitlegAan: boolean;
};

export default function StatistiekTabel({
  titel,
  toelichting,
  kubus,
  rijen,
  vorige,
  groepeerOp,
  groepLabel,
  labelVeld,
  statistieken,
  toonBeeld = false,
  toonDatum = false,
  uitlegAan,
}: Props) {
  const standaardKolommen = useMemo(
    () => statistieken.filter((s) => s.standaard).map((s) => s.id),
    [statistieken],
  );
  const bewaarSleutel = `kanalen:kolommen:${groepeerOp}:${titel}`;
  const [zichtbaar, setZichtbaar] = useKolomkeuze(bewaarSleutel, standaardKolommen, statistieken);
  const [sorteerOp, setSorteerOp] = useState<string>(() => standaardKolommen[0] ?? "");
  const [oplopend, setOplopend] = useState(false);

  const kolommen = useMemo(
    () => statistieken.filter((s) => zichtbaar.includes(s.id)),
    [statistieken, zichtbaar],
  );

  // Sorteren op een kolom die je via "Kolommen" hebt uitgezet, betekent kijken naar een
  // volgorde waarvan je de reden niet ziet. Valt daarom terug op de eerste kolom die er
  // nog wél staat.
  const actieveSortering =
    sorteerOp === DATUM_SORTEERSLEUTEL && toonDatum
      ? DATUM_SORTEERSLEUTEL
      : (kolommen.find((s) => s.id === sorteerOp)?.id ?? kolommen[0]?.id ?? "");

  const groepen = useMemo(() => {
    const basis = groepeer(kubus, rijen, groepeerOp);

    if (actieveSortering === DATUM_SORTEERSLEUTEL) {
      return [...basis].sort((a, b) => {
        const da = a.laatsteDatum ?? "";
        const db = b.laatsteDatum ?? "";
        if (da === db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return oplopend ? da.localeCompare(db) : db.localeCompare(da);
      });
    }

    const statistiek = statistieken.find((s) => s.id === actieveSortering);
    if (!statistiek) return basis;
    return [...basis].sort((a, b) => {
      const wa = waardeVan(statistiek, a.totalen);
      const wb = waardeVan(statistiek, b.totalen);
      // Lege waarden horen onderaan, ongeacht de sorteerrichting: een advertentie zonder
      // klikken is geen "beste" resultaat bij oplopend sorteren op kosten per klik.
      if (wa === null && wb === null) return 0;
      if (wa === null) return 1;
      if (wb === null) return -1;
      return oplopend ? wa - wb : wb - wa;
    });
  }, [kubus, rijen, groepeerOp, statistieken, actieveSortering, oplopend]);

  // De vorige periode op dezelfde dimensie gegroepeerd, opzoekbaar op sleutel. Een groep
  // die toen niet bestond levert `null` en dus geen verschil — "nieuw" is dan het eerlijke
  // antwoord, niet "+100%".
  const vorigePerSleutel = useMemo(() => {
    if (!vorige) return null;
    const kaart = new Map<string, Groep>();
    for (const groep of groepeer(vorige.kubus, vorige.rijen, groepeerOp)) {
      kaart.set(groep.sleutel, groep);
    }
    return kaart;
  }, [vorige, groepeerOp]);

  // De onderste regel telt over dezelfde rijen als de tabel, niet over de zichtbare
  // groepen: bij een afgeleide (CTR, kosten per lead) is het gewogen totaal iets anders
  // dan het gemiddelde van de regels erboven, en dat laatste zou hier gewoon fout zijn.
  const totalen = useMemo(() => telOp(kubus, rijen), [kubus, rijen]);
  const vorigeTotalen = useMemo(
    () => (vorige ? telOp(vorige.kubus, vorige.rijen) : null),
    [vorige],
  );

  function klikKolom(id: string) {
    if (id === actieveSortering) {
      setOplopend((v) => !v);
    } else {
      setSorteerOp(id);
      setOplopend(false);
    }
  }

  function naamVan(groep: Groep): string {
    const extra = kubus.meta?.[groep.sleutel];
    return (labelVeld && extra?.[labelVeld]) || groep.label;
  }

  function exporteer() {
    const koppen = [groepLabel, ...(toonDatum ? ["Datum"] : []), ...kolommen.map((s) => s.label)];
    const regels = groepen.map((groep) => [
      naamVan(groep),
      ...(toonDatum ? [groep.laatsteDatum ?? ""] : []),
      ...kolommen.map((s) => {
        const waarde = waardeVan(s, groep.totalen);
        // Komma als decimaalteken en puntkomma als scheidingsteken: zo opent het bestand
        // in een Nederlandse Excel als kolommen en niet als één lange tekstregel.
        return waarde === null ? "" : String(waarde).replace(".", ",");
      }),
    ]);
    const csv = [koppen, ...regels]
      .map((rij) => rij.map((cel) => `"${String(cel).replace(/"/g, '""')}"`).join(";"))
      .join("\r\n");
    // De BOM is wat een Nederlandse Excel nodig heeft om Škoda niet als SkÅ‚oda te lezen.
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anker = document.createElement("a");
    anker.href = url;
    anker.download = `${titel.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${kubus.periode.van}-tm-${kubus.periode.tot}.csv`;
    anker.click();
    URL.revokeObjectURL(url);
  }

  const kolomAantal = kolommen.length + (toonDatum ? 2 : 1);

  return (
    <section className="kaart-omlijst rounded-panel border border-line bg-card shadow-subtle">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="font-sans-w7 text-cell font-semibold text-ink">{titel}</h2>
          <p className="mt-0.5 text-meta text-ink-muted">
            {groepen.length} {groepen.length === 1 ? "regel" : "regels"} · {toelichting}
          </p>
          {kubus.afgekapt && (
            <p className="mt-1 flex items-start gap-1.5 text-meta text-negative">
              <IconInfo className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Deze tabel is afgekapt op de {DETAIL_LIMIET.toLocaleString("nl-NL")} regels met de
              hoogste uitgaven. Het totaal hieronder telt daarom lager uit dan het cijfer boven de
              grafiek — verklein de periode of filter verder om alles mee te tellen.
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exporteer}
            disabled={groepen.length === 0}
            title="Deze tabel als CSV opslaan, met de kolommen die nu aanstaan"
            className="flex items-center gap-1.5 rounded-control border border-line px-3 py-1.5 text-sm text-ink-muted transition-colors duration-[var(--duur-snel)] hover:bg-surface hover:text-ink disabled:opacity-50"
          >
            <IconDownload className="h-3.5 w-3.5" />
            CSV
          </button>
          <KolomKiezer statistieken={statistieken} zichtbaar={zichtbaar} onWijzig={setZichtbaar} />
        </div>
      </header>

      <div className="max-h-[32rem] overflow-auto">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 min-w-64 border-b border-line bg-surface-tint px-4 py-2.5 text-left">
                <span className="label-theme text-label text-ink-faint">{groepLabel}</span>
              </th>
              {toonDatum && (
                <th className="sticky top-0 z-20 whitespace-nowrap border-b border-line bg-surface-tint px-4 py-2.5 text-left">
                  <button
                    type="button"
                    onClick={() => klikKolom(DATUM_SORTEERSLEUTEL)}
                    className="inline-flex items-center gap-1 text-ink-muted transition-colors duration-[var(--duur-snel)] hover:text-ink"
                  >
                    <span className="label-theme text-label">Datum</span>
                    {actieveSortering === DATUM_SORTEERSLEUTEL ? (
                      <IconChevronDown className={`h-3 w-3 ${oplopend ? "rotate-180" : ""}`} />
                    ) : (
                      <IconChevronUpDown className="h-3 w-3 opacity-40" />
                    )}
                  </button>
                </th>
              )}
              {kolommen.map((s) => (
                <th
                  key={s.id}
                  className="sticky top-0 z-20 whitespace-nowrap border-b border-line bg-surface-tint px-4 py-2.5 text-right"
                >
                  <button
                    type="button"
                    onClick={() => klikKolom(s.id)}
                    className="inline-flex items-center gap-1 text-ink-muted transition-colors duration-[var(--duur-snel)] hover:text-ink"
                  >
                    <span className="label-theme text-label">{s.label}</span>
                    {s.id === actieveSortering ? (
                      <IconChevronDown className={`h-3 w-3 ${oplopend ? "rotate-180" : ""}`} />
                    ) : (
                      <IconChevronUpDown className="h-3 w-3 opacity-40" />
                    )}
                  </button>
                  {uitlegAan && (
                    <span className="mt-1 block max-w-44 whitespace-normal text-right text-meta font-normal text-ink-faint">
                      {s.uitleg}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groepen.length === 0 && (
              <tr>
                <td colSpan={kolomAantal} className="px-4 py-10 text-center text-ink-muted">
                  Geen regels in deze selectie.
                </td>
              </tr>
            )}
            {groepen.map((groep) => {
              const extra = kubus.meta?.[groep.sleutel];
              const toen = vorigePerSleutel?.get(groep.sleutel) ?? null;
              const status = extra?.advertentie_status;
              return (
                <tr key={groep.sleutel}>
                  <td className="sticky left-0 z-10 border-b border-line-soft bg-card px-4 py-2.5 align-top">
                    <div className="flex items-start gap-2.5">
                      {toonBeeld && (
                        <Beeld url={extra?.thumbnail_url ?? extra?.afbeelding_url ?? null} />
                      )}
                      <div className="min-w-0">
                        <p className="line-clamp-2 text-ink">{naamVan(groep)}</p>
                        <span className="flex flex-wrap items-center gap-x-2">
                          {status && <Statusmerk status={status} />}
                          {extra?.preview_url && (
                            <a
                              href={extra.preview_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-meta text-primary hover:underline"
                            >
                              Advertentie bekijken
                            </a>
                          )}
                          {extra?.permalink && (
                            <a
                              href={extra.permalink}
                              target="_blank"
                              rel="noreferrer"
                              className="text-meta text-primary hover:underline"
                            >
                              Post bekijken
                            </a>
                          )}
                        </span>
                      </div>
                    </div>
                  </td>
                  {toonDatum && (
                    <td className="whitespace-nowrap border-b border-line-soft px-4 py-2.5 align-top text-ink-muted">
                      {groep.laatsteDatum
                        ? new Date(`${groep.laatsteDatum}T00:00:00Z`).toLocaleDateString("nl-NL", {
                            day: "numeric",
                            month: "short",
                            year: "2-digit",
                          })
                        : "—"}
                    </td>
                  )}
                  {kolommen.map((s) => (
                    <td
                      key={s.id}
                      className="whitespace-nowrap border-b border-line-soft px-4 py-2.5 text-right align-top text-ink"
                    >
                      {formatteer(waardeVan(s, groep.totalen), eenheidVan(s))}
                      {vorigePerSleutel && (
                        <span className="mt-0.5 block">
                          <Verschilregel
                            verschil={verschilVan(
                              s,
                              waardeVan(s, groep.totalen),
                              toen ? waardeVan(s, toen.totalen) : null,
                            )}
                            compact
                          />
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
          {groepen.length > 0 && (
            <tfoot>
              <tr>
                <td className="sticky bottom-0 left-0 z-20 border-t border-line bg-surface-tint px-4 py-2.5">
                  <span className="font-sans-w7 text-sm font-semibold text-ink">Totaal</span>
                  <span className="ml-2 text-meta text-ink-faint">
                    {groepen.length} {groepen.length === 1 ? "regel" : "regels"}
                  </span>
                </td>
                {toonDatum && (
                  <td className="sticky bottom-0 z-10 border-t border-line bg-surface-tint px-4 py-2.5" />
                )}
                {kolommen.map((s) => (
                  <td
                    key={s.id}
                    className="sticky bottom-0 z-10 whitespace-nowrap border-t border-line bg-surface-tint px-4 py-2.5 text-right align-top font-sans-w7 text-sm font-semibold text-ink"
                  >
                    {formatteer(waardeVan(s, totalen), eenheidVan(s))}
                    {vorigeTotalen && (
                      <span className="mt-0.5 block font-sans font-normal">
                        <Verschilregel
                          verschil={verschilVan(
                            s,
                            waardeVan(s, totalen),
                            waardeVan(s, vorigeTotalen),
                          )}
                          compact
                        />
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  );
}

function eenheidVan(statistiek: Statistiek): Eenheid {
  if (statistiek.eenheid === "euro") return "euro";
  if (statistiek.eenheid === "procent") return "procent";
  return "aantal";
}

/**
 * De kolomkeuze blijft staan tussen sessies.
 *
 * Per tabel apart, want de kolommen die je bij advertenties wilt zien zijn niet die bij
 * campagnes. Een sleutel die niet meer bestaat (een statistiek die verdween) wordt bij
 * het lezen weggefilterd, zodat een oude keuze nooit een lege tabel oplevert.
 */
function useKolomkeuze(
  sleutel: string,
  standaard: string[],
  statistieken: Statistiek[],
): [string[], (waarden: string[]) => void] {
  const [zichtbaar, setZichtbaar] = useState<string[]>(standaard);

  useEffect(() => {
    try {
      const bewaard = window.localStorage.getItem(sleutel);
      if (!bewaard) return;
      const gelezen = (JSON.parse(bewaard) as string[]).filter((id) =>
        statistieken.some((s) => s.id === id),
      );
      if (gelezen.length > 0) setZichtbaar(gelezen);
    } catch {
      // Geen localStorage (privémodus, geblokkeerde site-data): dan gewoon de standaard.
    }
    // Alleen bij het monteren en bij een andere tabel; daarna is de state de bron.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sleutel]);

  function wijzig(waarden: string[]) {
    setZichtbaar(waarden);
    try {
      window.localStorage.setItem(sleutel, JSON.stringify(waarden));
    } catch {
      // Niet kunnen onthouden is geen reden om de wijziging niet door te voeren.
    }
  }

  return [zichtbaar, wijzig];
}

/** De creative naast de naam — vaak het snelste herkenpunt in een lange lijst. */
function Beeld({ url }: { url: string | null }) {
  if (!url) {
    return <span className="mt-0.5 block h-9 w-9 shrink-0 rounded-control bg-surface" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- de URL's komen van de CDN's
    // van Meta en Instagram en hebben een korte houdbaarheid; door next/image halen
    // levert alleen maar 404's op zodra de handtekening verloopt.
    <img
      src={url}
      alt=""
      loading="lazy"
      className="mt-0.5 h-9 w-9 shrink-0 rounded-control object-cover"
    />
  );
}

/**
 * Loopt deze advertentie nog?
 *
 * Stond al in de meta van de kubus maar werd nergens getoond, en dat is nu net het
 * verschil tussen "deze advertentie presteert slecht" en "deze advertentie staat al twee
 * weken uit". Alleen als hij níet actief is: een badge bij elke actieve regel is ruis.
 */
function Statusmerk({ status }: { status: string }) {
  const actief = /^(active|actief|enabled|eligible)$/i.test(status.trim());
  if (actief) return null;
  return (
    <span className="rounded-control bg-surface px-1.5 py-0.5 text-meta text-ink-muted">
      {status}
    </span>
  );
}

function KolomKiezer({
  statistieken,
  zichtbaar,
  onWijzig,
}: {
  statistieken: Statistiek[];
  zichtbaar: string[];
  onWijzig: (waarden: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function buiten(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function escape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", buiten);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", buiten);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  function wissel(id: string) {
    onWijzig(
      zichtbaar.includes(id) ? zichtbaar.filter((v) => v !== id) : [...zichtbaar, id],
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-control border border-line px-3 py-1.5 text-sm text-ink-muted transition-colors duration-[var(--duur-snel)] hover:bg-surface hover:text-ink"
      >
        Kolommen
        <span className="text-ink-faint">({zichtbaar.length})</span>
        <IconChevronDown className={`h-3.5 w-3.5 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-1 max-h-80 w-72 overflow-auto rounded-control border border-line bg-card p-1.5 shadow-dropdown">
          <p className="flex items-start gap-1.5 px-2 py-1.5 text-meta text-ink-faint">
            <IconInfo className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Alle statistieken zijn beschikbaar; wat hier aanstaat is wat je in de tabel ziet en
            wat er in de CSV komt. Je keuze blijft staan.
          </p>
          {statistieken.map((s) => (
            <label
              key={s.id}
              className="flex cursor-pointer items-start gap-2.5 rounded-control px-2 py-1.5 hover:bg-surface"
            >
              <input
                type="checkbox"
                checked={zichtbaar.includes(s.id)}
                onChange={() => wissel(s.id)}
                className="mt-0.5"
              />
              <span className="min-w-0">
                <span className="block text-sm text-ink">{s.label}</span>
                <span className="block text-meta text-ink-faint">{s.uitleg}</span>
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

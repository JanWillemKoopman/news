"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Drawer from "@/components/Drawer";
import { formatteer } from "@/components/chat/chartTheme";
import { KOSTEN_JAREN, leesBedrag } from "@/lib/leads/kanaalkosten";
import type { KostenverdelingData, KostenverdelingRegel } from "@/lib/leads/bron";

/**
 * De zijbalk achter de knop Kostenverdeling op het tabblad Leads.
 *
 * Elke sessiebron/medium van udenhout.nl, op sessies van hoog naar laag, met per maand een
 * veld voor een bedrag. Standaard staat er niets; een ingevuld bedrag wordt over de leads
 * van die bron/medium in die maand verdeeld (`lib/leads/kanaalkosten.ts`). Zo krijgt een
 * kanaal dat per maand gefactureerd wordt (Gaspedaal) toch een prijs per lead.
 *
 * Elk veld slaat op bij het verlaten (Enter of wegklikken), net als Budget beheer. Bij
 * sluiten laadt het tabblad de leads opnieuw, zodat de kosten meteen meetellen.
 */

const MAANDEN = ["jan", "feb", "mrt", "apr", "mei", "jun", "jul", "aug", "sep", "okt", "nov", "dec"];

/** Zoveel bron/media staan er standaard; de rest achter "Toon alle". */
const STANDAARD_RIJEN = 50;

type CelStand = "bezig" | "fout";

function maandSleutel(jaar: number, index: number): string {
  return `${jaar}-${String(index + 1).padStart(2, "0")}`;
}

function bedragTekst(bedrag: number | undefined): string {
  if (bedrag === undefined) return "";
  return bedrag.toLocaleString("nl-NL", { maximumFractionDigits: 2 });
}

function celSleutel(bronMedium: string, maand: string): string {
  return `${bronMedium}\u0000${maand}`;
}

function BedragVeld({
  waarde,
  stand,
  label,
  onOpslaan,
}: {
  waarde: number | undefined;
  stand: CelStand | undefined;
  label: string;
  onOpslaan: (bedrag: number | null) => void;
}) {
  const [tekst, setTekst] = useState(bedragTekst(waarde));
  const [ongeldig, setOngeldig] = useState(false);

  // Een opgeslagen of door het jaar gewisseld bedrag overschrijft wat er staat.
  useEffect(() => {
    setTekst(bedragTekst(waarde));
    setOngeldig(false);
  }, [waarde]);

  function verlaat() {
    const bedrag = leesBedrag(tekst);
    if (bedrag === "ongeldig") {
      setOngeldig(true);
      return;
    }
    setOngeldig(false);
    if ((bedrag ?? undefined) === waarde) {
      setTekst(bedragTekst(waarde));
      return;
    }
    onOpslaan(bedrag);
  }

  const rand =
    ongeldig || stand === "fout"
      ? "border-negative"
      : waarde !== undefined
        ? "border-line bg-primary-light"
        : "border-line-soft";

  return (
    <input
      type="text"
      inputMode="decimal"
      value={tekst}
      aria-label={label}
      title={ongeldig ? "Vul een bedrag van nul of hoger in" : stand === "fout" ? "Opslaan mislukt" : label}
      onChange={(e) => setTekst(e.target.value)}
      onBlur={verlaat}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setTekst(bedragTekst(waarde));
          setOngeldig(false);
        }
      }}
      className={`w-full rounded-control border px-2 py-1 text-right text-sm text-ink outline-none transition-colors duration-[var(--duur-snel)] focus:border-primary ${rand} ${
        stand === "bezig" ? "opacity-60" : ""
      }`}
    />
  );
}

export default function Kostenverdeling({
  onClose,
  onGewijzigd,
}: {
  onClose: () => void;
  /** Er is iets opgeslagen; het tabblad haalt de leads opnieuw op bij sluiten. */
  onGewijzigd: () => void;
}) {
  const [jaar, setJaar] = useState<number>(() => {
    const nu = new Date().getFullYear();
    return (KOSTEN_JAREN as readonly number[]).includes(nu) ? nu : 2026;
  });
  const [data, setData] = useState<KostenverdelingData | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(true);
  const [toonAlle, setToonAlle] = useState(false);
  const [zoek, setZoek] = useState("");
  const [cellen, setCellen] = useState<Record<string, CelStand>>({});
  const [opslagFout, setOpslagFout] = useState<string | null>(null);

  useEffect(() => {
    let afgebroken = false;
    setBezig(true);
    fetch(`/api/leads/kanaalkosten?jaar=${jaar}`, { cache: "no-store" })
      .then(async (res) => {
        const antwoord = (await res.json()) as KostenverdelingData & { fout?: string };
        if (afgebroken) return;
        if (!res.ok) {
          setFout(antwoord.fout ?? `Ophalen mislukt (${res.status}).`);
          return;
        }
        setData(antwoord);
        setFout(null);
      })
      .catch((err: unknown) => {
        if (!afgebroken) setFout(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!afgebroken) setBezig(false);
      });
    return () => {
      afgebroken = true;
    };
  }, [jaar]);

  const sla = useCallback(
    async (regel: KostenverdelingRegel, maand: string, bedrag: number | null) => {
      const sleutel = celSleutel(regel.bronMedium, maand);
      setCellen((c) => ({ ...c, [sleutel]: "bezig" }));
      try {
        const res = await fetch("/api/leads/kanaalkosten", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bronMedium: regel.bronMedium, maand, bedrag }),
        });
        const antwoord = (await res.json().catch(() => ({}))) as { fout?: string };
        if (!res.ok) throw new Error(antwoord.fout ?? `Opslaan mislukt (${res.status}).`);
        setData((d) =>
          d
            ? {
                ...d,
                regels: d.regels.map((r) => {
                  if (r.bronMedium !== regel.bronMedium) return r;
                  const bedragen = { ...r.bedragen };
                  if (bedrag === null) delete bedragen[maand];
                  else bedragen[maand] = bedrag;
                  return { ...r, bedragen };
                }),
              }
            : d,
        );
        setCellen((c) => {
          const uit = { ...c };
          delete uit[sleutel];
          return uit;
        });
        setOpslagFout(null);
        onGewijzigd();
      } catch (err) {
        setCellen((c) => ({ ...c, [sleutel]: "fout" }));
        setOpslagFout(err instanceof Error ? err.message : String(err));
      }
    },
    [onGewijzigd],
  );

  const maanden = useMemo(() => MAANDEN.map((_, i) => maandSleutel(jaar, i)), [jaar]);

  const gezocht = useMemo(() => {
    const regels = data?.regels ?? [];
    const term = zoek.trim().toLowerCase();
    return term ? regels.filter((r) => r.bronMedium.toLowerCase().includes(term)) : regels;
  }, [data, zoek]);

  // Zonder zoekterm de grootste bron/media, plus alles waar al een bedrag staat — een
  // ingevuld bedrag mag nooit achter "Toon alle" verdwijnen.
  const zichtbaar = useMemo(() => {
    if (toonAlle || zoek.trim()) return gezocht;
    return gezocht.filter(
      (r, i) => i < STANDAARD_RIJEN || Object.keys(r.bedragen).length > 0,
    );
  }, [gezocht, toonAlle, zoek]);

  const totaalPerMaand = useMemo(
    () => maanden.map((m) => (data?.regels ?? []).reduce((t, r) => t + (r.bedragen[m] ?? 0), 0)),
    [data, maanden],
  );
  const jaarTotaal = totaalPerMaand.reduce((t, b) => t + b, 0);

  return (
    <Drawer title="Kostenverdeling" onClose={onClose} extraBreed>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-muted">
          Vul per sessiebron/medium per maand in wat het kanaal kostte, bijvoorbeeld de factuur van
          Gaspedaal; dat kan voor 2025, 2026 en 2027. Het maandbedrag wordt per dag verdeeld
          (bedrag ÷ dagen in de maand) en alleen de dagen die in de leadtabel vallen tellen mee:
          op de 20e van een maand van 30 dagen is dat 20 × het daggemiddelde, dus 2/3 van het
          bedrag. Dat gaat gelijk over de leads die in die dagen via die bron/medium binnenkwamen.
          Leeg is geen kosten. Een veld slaat op bij Enter of wegklikken.
        </p>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1" role="group" aria-label="Jaar">
            {KOSTEN_JAREN.map((j) => (
              <button
                key={j}
                type="button"
                onClick={() => setJaar(j)}
                aria-pressed={jaar === j}
                className={`rounded-control px-3 py-1.5 text-sm font-medium transition-colors duration-[var(--duur-snel)] ${
                  jaar === j ? "bg-primary text-on-primary" : "text-ink-muted hover:bg-surface"
                }`}
              >
                {j}
              </button>
            ))}
            {data?.sessiesVan && (
              <span className="ml-3 text-meta text-ink-faint">
                sessies van {data.sessiesVan} t/m {data.sessiesTot} (alle beschikbare data) · udenhout.nl
              </span>
            )}
          </div>
          <input
            type="search"
            value={zoek}
            onChange={(e) => setZoek(e.target.value)}
            placeholder="Zoek bron/medium"
            className="w-64 rounded-control border border-line bg-card px-3 py-1.5 text-sm text-ink outline-none focus:border-primary"
          />
        </div>

        {opslagFout && (
          <p className="rounded-control border border-line bg-surface-tint px-3 py-2 text-sm text-negative">
            {opslagFout}
          </p>
        )}

        {fout ? (
          <p className="rounded-control border border-line bg-surface-tint px-3 py-2 text-sm text-negative">
            {fout}
          </p>
        ) : bezig && !data ? (
          <div className="laadvlak h-64 rounded-panel border border-line bg-card" aria-busy="true" />
        ) : (
          <div className="overflow-x-auto rounded-card border border-line">
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 border-b border-line bg-card px-3 py-2 text-left">
                    <span className="label-theme text-label text-ink-faint">Sessiebron / medium</span>
                  </th>
                  <th className="border-b border-line bg-card px-3 py-2 text-right">
                    <span className="label-theme text-label text-ink-faint">Sessies</span>
                  </th>
                  {MAANDEN.map((m) => (
                    <th key={m} className="min-w-24 border-b border-line bg-card px-1 py-2 text-right">
                      <span className="label-theme text-label text-ink-faint">{m} €</span>
                    </th>
                  ))}
                  <th className="border-b border-line bg-card px-3 py-2 text-right">
                    <span className="label-theme text-label text-ink-faint">Totaal</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {zichtbaar.length === 0 ? (
                  <tr>
                    <td colSpan={MAANDEN.length + 3} className="px-3 py-8 text-center text-ink-muted">
                      {zoek ? "Geen bron/medium gevonden." : "Nog geen verkeersdata."}
                    </td>
                  </tr>
                ) : (
                  zichtbaar.map((r) => {
                    const totaal = Object.values(r.bedragen).reduce((t, b) => t + b, 0);
                    const naam = r.bronMedium || "(leeg)";
                    return (
                      <tr key={r.bronMedium}>
                        <td className="sticky left-0 z-10 border-b border-line-soft bg-card px-3 py-1.5 text-ink">
                          <span className="block max-w-72 truncate" title={naam}>
                            {naam}
                          </span>
                        </td>
                        <td className="border-b border-line-soft px-3 py-1.5 text-right text-ink-muted">
                          {formatteer(r.sessies, "aantal")}
                        </td>
                        {maanden.map((m, i) => (
                          <td key={m} className="border-b border-line-soft px-1 py-1">
                            <BedragVeld
                              waarde={r.bedragen[m]}
                              stand={cellen[celSleutel(r.bronMedium, m)]}
                              label={`${naam}, ${MAANDEN[i]} ${jaar}`}
                              onOpslaan={(bedrag) => sla(r, m, bedrag)}
                            />
                          </td>
                        ))}
                        <td className="whitespace-nowrap border-b border-line-soft px-3 py-1.5 text-right font-medium text-ink">
                          {totaal > 0 ? formatteer(totaal, "euro-heel") : <span className="text-ink-faint">—</span>}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td className="sticky left-0 z-10 bg-surface px-3 py-2 font-semibold text-ink">Totaal</td>
                  <td className="bg-surface px-3 py-2" />
                  {totaalPerMaand.map((t, i) => (
                    <td key={i} className="whitespace-nowrap bg-surface px-2 py-2 text-right font-medium text-ink">
                      {t > 0 ? formatteer(t, "euro-heel") : <span className="text-ink-faint">—</span>}
                    </td>
                  ))}
                  <td className="whitespace-nowrap bg-surface px-3 py-2 text-right font-semibold text-ink">
                    {jaarTotaal > 0 ? formatteer(jaarTotaal, "euro-heel") : "—"}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {!toonAlle && !zoek.trim() && gezocht.length > zichtbaar.length && (
          <button
            type="button"
            onClick={() => setToonAlle(true)}
            className="self-start rounded-control px-2 py-1.5 text-sm font-medium text-primary hover:bg-primary-light"
          >
            Toon alle {formatteer(gezocht.length, "aantal")} bron/media
          </button>
        )}
      </div>
    </Drawer>
  );
}

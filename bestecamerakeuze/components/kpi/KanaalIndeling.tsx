"use client";

import { useMemo, useState } from "react";
import Drawer from "@/components/Drawer";
import { formatteer } from "@/components/chat/chartTheme";
import { IconSearch } from "@/components/icons";
import { kanaalKleuren } from "@/components/kpi/KanaalGrafiek";
import { useGrafiekKleuren } from "@/components/ThemeProvider";
import { KANALEN, type BronMediumRegel, type KanaalSleutel, type KanalenAntwoord } from "@/lib/kpi2027/kanalen";

/**
 * "Kanaalgroepindeling" op KPI's 2027 GA: alle bron/media die los bewaard worden, op
 * sessies, met de kanaalgroep waarin ze staan — en per regel met de hand een andere te
 * kiezen. Een keuze geldt meteen in elke kanaalgrafiek, voor het hele team
 * (`kpi_2027_kanaal_keuzes`, migratie 0038). Kies je weer de groep van de regels, dan
 * verdwijnt de keuze.
 *
 * Laadt niets zelf: het leest hetzelfde antwoord als de kanaalgrafieken
 * (`/api/kpi-2027/kanalen`), dat het paneel pas bij de eerste klik ophaalt. Zo blijft de
 * pagina zelf even snel.
 */
export default function KanaalIndeling({
  websiteSleutel,
  domein,
  status,
  antwoord,
  herlaad,
  onClose,
}: {
  websiteSleutel: string;
  domein: string;
  status: "leeg" | "laden" | "klaar" | "fout";
  antwoord: KanalenAntwoord | null;
  /** Haalt de verdeling opnieuw op, zodat de grafieken de nieuwe indeling tonen. */
  herlaad: () => Promise<void>;
  onClose: () => void;
}) {
  const kleuren = useGrafiekKleuren();
  const palet = kanaalKleuren(kleuren.vlak);
  const [zoek, setZoek] = useState("");
  // Wat net gekozen is, alvast in beeld terwijl het opslaat en de cijfers opnieuw komen.
  const [lokaal, setLokaal] = useState<Record<string, KanaalSleutel>>({});
  const [bezig, setBezig] = useState<string | null>(null);
  const [fout, setFout] = useState<string | null>(null);

  const regels: BronMediumRegel[] = useMemo(() => {
    const alle = antwoord?.bronMedia ?? [];
    return alle.map((r) => {
      const kanaal = lokaal[r.bronMedium] ?? r.kanaal;
      return { ...r, kanaal, handmatig: kanaal !== r.regel };
    });
  }, [antwoord, lokaal]);
  const zichtbaar = useMemo(() => {
    const woorden = zoek.toLowerCase().split(/\s+/).filter(Boolean);
    if (woorden.length === 0) return regels;
    return regels.filter((r) => {
      const tekst = `${r.bronMedium} ${KANALEN.find((k) => k.sleutel === r.kanaal)?.naam ?? ""}`.toLowerCase();
      return woorden.every((w) => tekst.includes(w));
    });
  }, [regels, zoek]);
  const aantalHandmatig = regels.filter((r) => r.handmatig).length;

  async function kies(regel: BronMediumRegel, kanaal: KanaalSleutel) {
    setFout(null);
    setBezig(regel.bronMedium);
    setLokaal((oud) => ({ ...oud, [regel.bronMedium]: kanaal }));
    try {
      const res = await fetch("/api/kpi-2027/kanalen/keuze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          website: websiteSleutel,
          bronMedium: regel.bronMedium,
          // De groep van de regels kiezen = de handmatige keuze weghalen.
          kanaal: kanaal === regel.regel ? null : kanaal,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { fout?: string };
      if (!res.ok) throw new Error(body.fout ?? `HTTP ${res.status}`);
      await herlaad();
      setLokaal((oud) => {
        const nieuw = { ...oud };
        delete nieuw[regel.bronMedium];
        return nieuw;
      });
    } catch (err) {
      setLokaal((oud) => {
        const nieuw = { ...oud };
        delete nieuw[regel.bronMedium];
        return nieuw;
      });
      setFout(`${regel.bronMedium || "(leeg)"}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBezig(null);
    }
  }

  return (
    <Drawer title="Kanaalgroepindeling" onClose={onClose} breed>
      <div className="space-y-4 text-sm">
        <p className="text-ink-muted">
          Alle sessiebron/media van {domein} sinds januari 2025, van groot naar klein, en de kanaalgroep waarin ze in de
          kanaalgrafieken tellen. Kies je een andere groep, dan geldt die meteen in elke grafiek en voor iedereen. Kies je
          weer de groep met &ldquo;(regel)&rdquo;, dan gelden de vaste regels weer.
        </p>

        {status === "laden" || (status === "leeg" && !antwoord) ? (
          <p className="text-ink-muted">
            Bron/media ophalen… De allereerste keer haalt het dashboard ze bij Google Analytics op; dat kan een minuut
            duren.
          </p>
        ) : status === "fout" ? (
          <p className="text-negative">Kon de indeling niet ophalen: {antwoord?.fout ?? "onbekende fout"}</p>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <label className="flex flex-1 items-center gap-2 rounded-control border border-line bg-card px-2.5 py-1.5 focus-within:border-ink-faint">
                <IconSearch className="h-3.5 w-3.5 shrink-0 text-ink-faint" />
                <input
                  type="search"
                  value={zoek}
                  onChange={(e) => setZoek(e.target.value)}
                  placeholder="Zoek bron/medium of kanaalgroep"
                  className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
                />
              </label>
              <p className="shrink-0 text-meta text-ink-muted">
                {aantalHandmatig === 0 ? "geen handmatige keuzes" : `${aantalHandmatig} handmatig`}
              </p>
            </div>

            {fout && <p className="text-negative">{fout}</p>}

            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-label text-ink-faint">
                  <th className="label-theme sticky top-0 border-b border-line bg-card py-2 pr-3 font-normal">Bron / medium</th>
                  <th className="label-theme sticky top-0 border-b border-line bg-card py-2 pr-3 text-right font-normal">
                    Sessies
                  </th>
                  <th className="label-theme sticky top-0 border-b border-line bg-card py-2 font-normal">Kanaalgroep</th>
                </tr>
              </thead>
              <tbody>
                {zichtbaar.map((r) => {
                  const i = KANALEN.findIndex((k) => k.sleutel === r.kanaal);
                  return (
                    <tr key={r.bronMedium}>
                      <td className="max-w-0 border-b border-line-soft py-1.5 pr-3">
                        <span className="block truncate font-mono text-meta text-ink" title={r.bronMedium || "(leeg)"}>
                          {r.bronMedium || "(leeg)"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap border-b border-line-soft py-1.5 pr-3 text-right text-ink-muted">
                        {formatteer(r.sessies, "aantal")}
                      </td>
                      <td className="w-48 border-b border-line-soft py-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className="inline-block h-2 w-2 shrink-0 rounded-[2px]"
                            style={{ background: palet[i] }}
                          />
                          <select
                            value={r.kanaal}
                            disabled={bezig === r.bronMedium}
                            onChange={(e) => kies(r, e.target.value as KanaalSleutel)}
                            title={r.handmatig ? `Handmatig gekozen; de regels zeggen ${KANALEN.find((k) => k.sleutel === r.regel)?.naam}` : "Volgens de regels"}
                            className={`min-w-0 flex-1 rounded-control border bg-card px-1.5 py-1 text-meta text-ink disabled:opacity-60 ${
                              r.handmatig ? "border-ink-faint font-semibold" : "border-line"
                            }`}
                          >
                            {KANALEN.map((k) => (
                              <option key={k.sleutel} value={k.sleutel}>
                                {k.naam}
                                {k.sleutel === r.regel ? " (regel)" : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {zichtbaar.length === 0 && <p className="text-ink-muted">Niets gevonden voor &ldquo;{zoek}&rdquo;.</p>}

            {antwoord?.staart && antwoord.staart.aantal > 0 && (
              <p className="text-meta text-ink-muted">
                Plus {formatteer(antwoord.staart.aantal, "aantal")} kleinere bron/media (samen{" "}
                {formatteer(antwoord.staart.sessies, "aantal")} sessies). Die volgen altijd de vaste regels; ze worden niet
                los bewaard, zodat het dashboard snel blijft.
              </p>
            )}
          </>
        )}
      </div>
    </Drawer>
  );
}

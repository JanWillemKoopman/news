"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ConversiePaneel from "@/components/kanalen/ConversiePaneel";
import Inlogprompt from "@/components/Inlogprompt";
import FilterSelect from "@/components/FilterSelect";
import { IconCheck, IconChevronDown, IconInfo, IconSearch } from "@/components/icons";
import { formatteer } from "@/components/chat/chartTheme";

/**
 * De koppeltabel: campagne → de campagne uit de sheet.
 *
 * **Waarom deze pagina bestaat.** De campagnenaam in een advertentieplatform is zelden
 * dezelfde als die in de sheet, en dat handmatig leggen is precies waar deze tabel voor
 * bestaat: zonder die koppeling weet de budget- en pacingweergave op de campagnepagina's
 * niet welke sheetregel bij welke campagne hoort.
 *
 * Opslaan gebeurt per veld zodra je een keuze maakt — geen aparte opslaan-knop, want dat
 * is bij een tabel met tientallen regels een uitnodiging om wijzigingen kwijt te raken.
 */

export interface Koppeling {
  campagne: string;
  bron: string | null;
  eigenaarNaam: string | null;
  merk: string | null;
  categorie: string | null;
  sheetCampagne: string | null;
  notitie: string | null;
  uitgaven: number;
  gekoppeld: boolean;
}

const BRON_LABEL: Record<string, string> = {
  meta: "Meta",
  google: "Google",
  linkedin: "LinkedIn",
};

export default function Koppeltabel({ ingelogd }: { ingelogd: boolean }) {
  const [rijen, setRijen] = useState<Koppeling[]>([]);
  const [campagnesUitSheet, setCampagnesUitSheet] = useState<string[]>([]);
  const [bezig, setBezig] = useState(true);
  const [fout, setFout] = useState<string | null>(null);
  const [alleen, setAlleen] = useState<string[]>([]);
  const [zoek, setZoek] = useState("");
  const [bewaard, setBewaard] = useState<string | null>(null);

  const haal = useCallback(() => {
    setBezig(true);
    fetch("/api/kanalen?pagina=koppeltabel")
      .then(async (res) => {
        const data = (await res.json()) as {
          koppelingen?: Koppeling[];
          campagnesUitSheet?: string[];
          fout?: string;
        };
        if (!res.ok) {
          setFout(data.fout ?? `Ophalen mislukt (${res.status}).`);
          return;
        }
        setRijen(data.koppelingen ?? []);
        setCampagnesUitSheet(data.campagnesUitSheet ?? []);
        setFout(null);
      })
      .catch((err: unknown) => setFout(err instanceof Error ? err.message : String(err)))
      .finally(() => setBezig(false));
  }, []);

  useEffect(haal, [haal]);

  const zichtbaar = useMemo(() => {
    const term = zoek.trim().toLowerCase();
    return rijen.filter((r) => {
      if (alleen.length > 0) {
        const past = alleen.includes("Nog niet gekoppeld") ? !r.gekoppeld : r.gekoppeld;
        if (!past) return false;
      }
      if (!term) return true;
      return [r.campagne, r.sheetCampagne].filter(Boolean).some((veld) => String(veld).toLowerCase().includes(term));
    });
  }, [rijen, alleen, zoek]);

  const ongekoppeld = rijen.filter((r) => !r.gekoppeld);
  const ongekoppeldBudget = ongekoppeld.reduce((t, r) => t + r.uitgaven, 0);

  async function bewaar(campagne: string, patch: Partial<Koppeling>) {
    const huidig = rijen.find((r) => r.campagne === campagne);
    if (!huidig) return;
    // "Gekoppeld" is precies één ding: er staat een campagne uit de sheet gekozen. Dat is
    // ook het enige veld dat deze tabel nu nog vastlegt.
    const samen = { ...huidig, ...patch };
    const nieuw = { ...samen, gekoppeld: Boolean(samen.sheetCampagne?.trim()) };

    // Meteen in beeld bijwerken; de serveraanroep bevestigt alleen. Zou de tabel pas na
    // het antwoord bijwerken, dan springt elk veld even terug naar de oude waarde.
    setRijen((lijst) => lijst.map((r) => (r.campagne === campagne ? nieuw : r)));

    try {
      const res = await fetch("/api/kanalen/koppeling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nieuw),
      });
      if (!res.ok) {
        const data = (await res.json()) as { fout?: string };
        throw new Error(data.fout ?? `Opslaan mislukt (${res.status}).`);
      }
      setBewaard(campagne);
      setTimeout(() => setBewaard((c) => (c === campagne ? null : c)), 1500);
    } catch (err) {
      setFout(err instanceof Error ? err.message : String(err));
      haal(); // terug naar wat er echt staat
    }
  }

  if (!ingelogd) {
    return <Inlogprompt tekst="Log in om de koppeltabel te bekijken en bij te werken." />;
  }

  return (
    <div>
      <div className="sticky top-0 z-30 -mx-1 mb-5 px-1 pt-1">
        <div className="kaart-omlijst flex flex-wrap items-center justify-between gap-3 rounded-panel border border-line bg-card px-4 py-3 shadow-card">
          <div className="flex items-center gap-4">
            <div>
              <p className="font-sans-w7 text-sm font-semibold text-ink">
                {bezig ? "Laden…" : `${zichtbaar.length} campagnes`}
              </p>
              <p className="text-meta text-ink-faint">{ongekoppeld.length} zonder sheet-campagne</p>
            </div>
            {ongekoppeld.length > 0 && (
              <>
                <span aria-hidden="true" className="h-8 w-px bg-line" />
                <div>
                  <p className="font-sans-w7 text-sm font-semibold text-ink">
                    {formatteer(ongekoppeldBudget, "euro")}
                  </p>
                  <p className="text-meta text-ink-faint">uitgegeven in 90 dagen zonder koppeling</p>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <IconSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
              <input
                id="koppeltabel-zoek"
                value={zoek}
                onChange={(e) => setZoek(e.target.value)}
                placeholder="Zoek op campagne"
                aria-label="Zoeken in de koppeltabel"
                className="w-72 rounded-control border border-line bg-card py-1.5 pl-8 pr-2 text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none"
              />
            </div>
            <FilterSelect
              label="Tonen"
              options={["Nog niet gekoppeld", "Al gekoppeld"]}
              selected={alleen}
              onChange={setAlleen}
            />
          </div>
        </div>
      </div>

      {fout && (
        <p className="mb-5 rounded-panel border border-line bg-card px-4 py-3 text-sm text-negative">{fout}</p>
      )}

      <p className="mb-4 flex items-start gap-2 text-meta text-ink-muted">
        <IconInfo className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Koppel elke campagne aan zijn naam in de sheet. Die koppeling voedt de
        budget- en pacingweergave op de campagnepagina&apos;s.
      </p>

      <section className="kaart-omlijst rounded-panel border border-line bg-card shadow-subtle">
        <div className="max-h-[36rem] overflow-auto">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                {["Campagne", "Kanaal", "Uitgaven 90 dgn", "Campagne in sheet"].map((kop, i) => (
                  <th
                    key={kop}
                    className={`sticky top-0 z-20 whitespace-nowrap border-b border-line bg-surface-tint px-4 py-2.5 ${
                      i === 0 ? "left-0 z-30 min-w-72 text-left" : i === 2 ? "text-right" : "text-left"
                    }`}
                  >
                    <span className="label-theme text-label text-ink-faint">{kop}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!bezig && zichtbaar.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-ink-muted">
                    {zoek.trim() || alleen.length > 0
                      ? "Geen campagnes die aan deze selectie voldoen."
                      : "Geen campagnes gevonden. Zodra de sync advertentiedata heeft opgehaald, staan ze hier."}
                  </td>
                </tr>
              )}
              {zichtbaar.map((rij) => (
                <tr key={rij.campagne}>
                  <td className="sticky left-0 z-10 border-b border-line-soft bg-card px-4 py-2 align-middle">
                    <div className="flex items-center gap-2">
                      {!rij.gekoppeld && (
                        <span
                          title="Nog geen campagne in de sheet gekoppeld"
                          className="h-1.5 w-1.5 shrink-0 rounded-pill bg-negative"
                        />
                      )}
                      <span className="line-clamp-1 text-ink">{rij.campagne}</span>
                      {bewaard === rij.campagne && <IconCheck className="h-3.5 w-3.5 shrink-0 text-positive" />}
                    </div>
                  </td>
                  <td className="whitespace-nowrap border-b border-line-soft px-4 py-2 text-ink-muted">
                    {rij.bron ? (BRON_LABEL[rij.bron] ?? rij.bron) : "—"}
                  </td>
                  <td className="whitespace-nowrap border-b border-line-soft px-4 py-2 text-right text-ink">
                    {formatteer(rij.uitgaven, "euro")}
                  </td>
                  <td className="border-b border-line-soft px-2 py-1.5">
                    <SheetCampagneVeld
                      waarde={rij.sheetCampagne}
                      opties={campagnesUitSheet}
                      onBewaar={(v) => bewaar(rij.campagne, { sheetCampagne: v })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Dezelfde soort keuze, één blok lager: wat de platforms niet leveren en het team
          zelf vastlegt over zijn eigen data. */}
      <ConversiePaneel />
    </div>
  );
}

/**
 * Uitklapmenu met zoekbalk voor de koppeling naar een sheet-campagne.
 *
 * De lijst rendert via een portal naar `<body>` met een `fixed`-positie die op basis van
 * de knop wordt berekend: de rij zit in een scrollende tabel (`overflow-auto`), en een
 * gewoon `absolute`-paneel zou daar op de rand worden afgekapt in plaats van erover heen
 * te vallen.
 */
function SheetCampagneVeld({
  waarde,
  opties,
  onBewaar,
}: {
  waarde: string | null;
  opties: string[];
  onBewaar: (waarde: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [zoek, setZoek] = useState("");
  const [positie, setPositie] = useState<{ top: number; left: number; width: number } | null>(null);
  const knopRef = useRef<HTMLButtonElement>(null);
  const paneelRef = useRef<HTMLDivElement>(null);

  const zichtbareOpties = useMemo(() => {
    const term = zoek.trim().toLowerCase();
    if (!term) return opties;
    return opties.filter((o) => o.toLowerCase().includes(term));
  }, [opties, zoek]);

  useEffect(() => {
    if (!open) return;

    function plaats() {
      const rect = knopRef.current?.getBoundingClientRect();
      if (!rect) return;
      setPositie({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 256) });
    }
    plaats();

    function handleClickOutside(event: MouseEvent) {
      const doel = event.target as Node;
      if (knopRef.current?.contains(doel) || paneelRef.current?.contains(doel)) return;
      setOpen(false);
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    // Sluiten i.p.v. meebewegen bij scroll/resize: eenvoudiger dan continu herpositioneren,
    // en de tabel eronder scrolt toch al binnen zijn eigen kader.
    function handleScrollOfResize() {
      setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("scroll", handleScrollOfResize, true);
    window.addEventListener("resize", handleScrollOfResize);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("scroll", handleScrollOfResize, true);
      window.removeEventListener("resize", handleScrollOfResize);
    };
  }, [open]);

  useEffect(() => {
    if (!open) setZoek("");
  }, [open]);

  function kies(v: string | null) {
    onBewaar(v);
    setOpen(false);
  }

  return (
    <>
      <button
        ref={knopRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full min-w-36 items-center justify-between gap-2 rounded-control border border-transparent bg-transparent px-2 py-1 text-left text-sm text-ink transition-colors duration-[var(--duur-snel)] hover:border-line focus:border-line focus:bg-card focus:outline-none"
      >
        <span className={`truncate ${waarde ? "text-ink" : "text-ink-faint"}`}>
          {waarde ?? "Naam in de sheet"}
        </span>
        <IconChevronDown
          className={`h-3.5 w-3.5 shrink-0 text-ink-faint transition-transform duration-[var(--duur-snel)] ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open &&
        positie &&
        createPortal(
          <div
            ref={paneelRef}
            role="listbox"
            aria-label="Campagne in de sheet"
            style={{ top: positie.top, left: positie.left, width: positie.width }}
            className="fixed z-50 flex max-h-72 flex-col overflow-hidden rounded-card border border-line bg-card p-1.5 shadow-dropdown"
          >
            <div className="relative mb-1 shrink-0">
              <IconSearch className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint" />
              <input
                autoFocus
                value={zoek}
                onChange={(e) => setZoek(e.target.value)}
                placeholder={`Zoek in ${opties.length} campagnes`}
                aria-label="Zoek een campagne uit de sheet"
                className="w-full rounded-control border border-line bg-card py-1.5 pl-7 pr-2 text-sm text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none"
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {waarde && (
                <button
                  type="button"
                  onClick={() => kies(null)}
                  className="mb-1 block w-full rounded-control px-2 py-1 text-left text-xs font-medium text-primary hover:bg-primary-light"
                >
                  Koppeling wissen
                </button>
              )}
              {opties.length === 0 ? (
                <p className="px-2 py-1.5 text-sm text-ink-faint">Geen campagnes uit de sheet.</p>
              ) : zichtbareOpties.length === 0 ? (
                <p className="px-2 py-1.5 text-sm text-ink-faint">Niets gevonden.</p>
              ) : (
                zichtbareOpties.map((optie) => (
                  <button
                    key={optie}
                    type="button"
                    title={optie}
                    onClick={() => kies(optie)}
                    className={`block w-full truncate rounded-control px-2 py-1.5 text-left text-sm hover:bg-surface ${
                      optie === waarde ? "font-sans-w7 text-ink" : "text-ink"
                    }`}
                  >
                    {optie}
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

"use client";

import { useMemo, useState } from "react";
import type { Campagne } from "@/lib/sheet";
import CampaignCard from "@/components/CampaignCard";
import FilterDropdown from "@/components/FilterDropdown";
import KpiCard from "@/components/KpiCard";
import { formatCurrency, formatNumber } from "@/lib/format";

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "nl"));
}

type SortKey = "naam" | "budget-hoog" | "einddatum-vroeg";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "naam", label: "Naam (A-Z)" },
  { value: "budget-hoog", label: "Budget (hoog naar laag)" },
  { value: "einddatum-vroeg", label: "Einddatum (vroeg naar laat)" },
];

function sortCampagnes(campagnes: Campagne[], sortKey: SortKey): Campagne[] {
  const sorted = [...campagnes];
  switch (sortKey) {
    case "budget-hoog":
      return sorted.sort((a, b) => (b.budget ?? -Infinity) - (a.budget ?? -Infinity));
    case "einddatum-vroeg":
      return sorted.sort((a, b) => (a.einddatum ?? "9999").localeCompare(b.einddatum ?? "9999"));
    default:
      return sorted.sort((a, b) => a.naam.localeCompare(b.naam, "nl"));
  }
}

export default function CampaignDashboard({ campagnes }: { campagnes: Campagne[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string[]>([]);
  const [merk, setMerk] = useState<string[]>([]);
  const [ordersoort, setOrdersoort] = useState<string[]>([]);
  const [klantgroep, setKlantgroep] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("naam");

  const options = useMemo(
    () => ({
      status: uniqueSorted(campagnes.map((c) => c.status)),
      merk: uniqueSorted(campagnes.map((c) => c.merk)),
      ordersoort: uniqueSorted(campagnes.map((c) => c.ordersoort)),
      klantgroep: uniqueSorted(campagnes.map((c) => c.klantgroepOrders)),
    }),
    [campagnes],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = campagnes.filter(
      (c) =>
        (q === "" || c.naam.toLowerCase().includes(q)) &&
        (status.length === 0 || status.includes(c.status)) &&
        (merk.length === 0 || merk.includes(c.merk)) &&
        (ordersoort.length === 0 || ordersoort.includes(c.ordersoort)) &&
        (klantgroep.length === 0 || klantgroep.includes(c.klantgroepOrders)),
    );
    return sortCampagnes(result, sortKey);
  }, [campagnes, query, status, merk, ordersoort, klantgroep, sortKey]);

  const activeFilterCount = status.length + merk.length + ordersoort.length + klantgroep.length;

  function clearAll() {
    setStatus([]);
    setMerk([]);
    setOrdersoort([]);
    setKlantgroep([]);
    setQuery("");
  }

  const kpis = useMemo(
    () => ({
      totaalBudget: filtered.reduce((sum, c) => sum + (c.budget ?? 0), 0),
      totaalUitgaven: filtered.reduce((sum, c) => sum + (c.uitgaven ?? 0), 0),
      totaalOrders: filtered.reduce((sum, c) => sum + (c.orderTotaal ?? 0), 0),
      actieveCampagnes: filtered.filter((c) => c.status.trim().toLowerCase() === "open").length,
    }),
    [filtered],
  );

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Totaal budget" value={formatCurrency(kpis.totaalBudget)} />
        <KpiCard label="Totale uitgaven" value={formatCurrency(kpis.totaalUitgaven)} />
        <KpiCard label="Behaalde orders" value={formatNumber(kpis.totaalOrders)} />
        <KpiCard label="Actieve campagnes" value={String(kpis.actieveCampagnes)} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Zoek op campagnenaam..."
          className="w-full max-w-xs rounded-card border border-line bg-card px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-brand sm:w-56"
        />
        <FilterDropdown label="Status" options={options.status} selected={status} onChange={setStatus} />
        <FilterDropdown label="Merk" options={options.merk} selected={merk} onChange={setMerk} />
        <FilterDropdown
          label="Ordersoort"
          options={options.ordersoort}
          selected={ordersoort}
          onChange={setOrdersoort}
        />
        {/* Kolomkop in de sheet is "Klantgroep orders (indien van toepassing)"; in de UI
            afgekort tot "Klantgroep". */}
        <FilterDropdown
          label="Klantgroep"
          options={options.klantgroep}
          selected={klantgroep}
          onChange={setKlantgroep}
        />

        {(activeFilterCount > 0 || query !== "") && (
          <button
            type="button"
            onClick={clearAll}
            className="text-sm font-medium text-ink-muted underline-offset-2 hover:text-ink hover:underline"
          >
            Alle filters wissen
          </button>
        )}

        <div className="ml-auto flex items-center gap-3">
          <span className="whitespace-nowrap text-sm text-ink-muted">
            {filtered.length} van {campagnes.length}
          </span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-card border border-line bg-card px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-10 text-sm text-ink-muted">Geen campagnes gevonden voor deze filters.</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <CampaignCard key={c.naam} campagne={c} />
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import type { Campagne } from "@/lib/sheet";
import CampaignMatrix from "@/components/CampaignMatrix";
import FilterDropdown from "@/components/FilterDropdown";
import RefreshButton from "@/components/RefreshButton";

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "nl"));
}

/** Hoogste (meest recente) startdatum links; ontbrekende startdatum helemaal achteraan. */
function sortByStartdatumDesc(campagnes: Campagne[]): Campagne[] {
  return [...campagnes].sort((a, b) => (b.startdatum ?? "").localeCompare(a.startdatum ?? ""));
}

export default function CampaignDashboard({ campagnes }: { campagnes: Campagne[] }) {
  const [status, setStatus] = useState<string[]>([]);
  const [merk, setMerk] = useState<string[]>([]);
  const [ordersoort, setOrdersoort] = useState<string[]>([]);
  const [klantgroep, setKlantgroep] = useState<string[]>([]);

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
    const result = campagnes.filter(
      (c) =>
        (status.length === 0 || status.includes(c.status)) &&
        (merk.length === 0 || merk.includes(c.merk)) &&
        (ordersoort.length === 0 || ordersoort.includes(c.ordersoort)) &&
        (klantgroep.length === 0 || klantgroep.includes(c.klantgroepOrders)),
    );
    return sortByStartdatumDesc(result);
  }, [campagnes, status, merk, ordersoort, klantgroep]);

  const activeFilterCount = status.length + merk.length + ordersoort.length + klantgroep.length;

  function clearAll() {
    setStatus([]);
    setMerk([]);
    setOrdersoort([]);
    setKlantgroep([]);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <RefreshButton />
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

        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="text-sm font-medium text-ink-muted underline-offset-2 hover:text-ink hover:underline"
          >
            Wis filters
          </button>
        )}
      </div>

      <div className="mt-4">
        <CampaignMatrix campagnes={filtered} />
      </div>
    </div>
  );
}

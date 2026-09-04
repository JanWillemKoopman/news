"use client";

import { useMemo, useState } from "react";
import type { Campagne } from "@/lib/sheet";
import CampaignMatrix from "@/components/CampaignMatrix";
import FilterDropdown from "@/components/FilterDropdown";

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "nl"));
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

  const filtered = campagnes.filter(
    (c) =>
      (status.length === 0 || status.includes(c.status)) &&
      (merk.length === 0 || merk.includes(c.merk)) &&
      (ordersoort.length === 0 || ordersoort.includes(c.ordersoort)) &&
      (klantgroep.length === 0 || klantgroep.includes(c.klantgroepOrders)),
  );

  const activeFilterCount = status.length + merk.length + ordersoort.length + klantgroep.length;

  function clearAll() {
    setStatus([]);
    setMerk([]);
    setOrdersoort([]);
    setKlantgroep([]);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
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
            Alle filters wissen
          </button>
        )}

        <span className="ml-auto text-sm text-ink-muted">
          {filtered.length} van {campagnes.length} campagnes
        </span>
      </div>

      <div className="mt-4">
        <CampaignMatrix campagnes={filtered} />
      </div>
    </div>
  );
}

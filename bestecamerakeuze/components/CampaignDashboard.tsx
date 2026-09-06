"use client";

import { useMemo, useState } from "react";
import type { Campagne } from "@/lib/sheet";
import CampaignTable from "@/components/CampaignTable";
import FilterBar from "@/components/FilterBar";
import FilterSelect from "@/components/FilterSelect";
import UpdateButton from "@/components/UpdateButton";

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "nl"));
}

/** Hoogste (meest recente) startdatum links; ontbrekende startdatum helemaal achteraan. */
function sortByStartdatumDesc(campagnes: Campagne[]): Campagne[] {
  return [...campagnes].sort((a, b) => (b.startdatum ?? "").localeCompare(a.startdatum ?? ""));
}

type Props = {
  campagnes: Campagne[];
  notitiesBeschikbaar: boolean;
  ingelogd: boolean;
};

/** Zoekt de exacte schrijfwijze van "Online" op zoals die in de sheet staat, zodat de
 * default-filter altijd matcht met de waardes in `options.status`. */
function vindOnlineWaarde(campagnes: Campagne[]): string | null {
  const gevonden = campagnes.find((c) => c.status.trim().toLowerCase() === "online");
  return gevonden ? gevonden.status.trim() : null;
}

export default function CampaignDashboard({ campagnes, notitiesBeschikbaar, ingelogd }: Props) {
  // Filter Status staat standaard op "Online", zodat je bij het openen van het dashboard
  // meteen de lopende campagnes ziet in plaats van alles inclusief offline campagnes.
  const [status, setStatus] = useState<string[]>(() => {
    const online = vindOnlineWaarde(campagnes);
    return online ? [online] : [];
  });
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
    <div className="flex flex-col gap-4">
      <FilterBar
        totalCount={campagnes.length}
        filteredCount={filtered.length}
        activeFilterCount={activeFilterCount}
        onClearAll={clearAll}
      >
        <FilterSelect label="Status" options={options.status} selected={status} onChange={setStatus} />
        <FilterSelect label="Merk" options={options.merk} selected={merk} onChange={setMerk} />
        <FilterSelect
          label="Ordersoort"
          options={options.ordersoort}
          selected={ordersoort}
          onChange={setOrdersoort}
        />
        {/* Kolomkop in de sheet is "Klantgroep orders (indien van toepassing)"; in de UI
            afgekort tot "Klantgroep". */}
        <FilterSelect
          label="Klantgroep"
          options={options.klantgroep}
          selected={klantgroep}
          onChange={setKlantgroep}
        />
        <UpdateButton variant="inline" label="Bijwerken" />
      </FilterBar>

      <CampaignTable
        campagnes={filtered}
        notitiesBeschikbaar={notitiesBeschikbaar}
        ingelogd={ingelogd}
      />
    </div>
  );
}

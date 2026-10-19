"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Campagne } from "@/lib/sheet";
import BewerkbaarVeld from "@/components/BewerkbaarVeld";
import CampagneFilterBalk from "@/components/CampagneFilterBalk";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { useCampagneFilters } from "@/lib/campagneFilterContext";
import { useIsActief } from "@/lib/kanalen/actieveWeergave";
import Ga4Koppeltabel from "@/components/ga4/Ga4Koppeltabel";

type Kolom = {
  label: string;
  veld: keyof Campagne & string;
  type?: "getal" | "tekst";
  /** Smallere kolommen (bv. Budget, Startdatum) mogen minder ruimte krijgen dan de standaard 150px. */
  breedte?: number;
  huidigeWaarde: (c: Campagne) => string;
  render: (c: Campagne) => ReactNode;
};

/**
 * Dezelfde velden als het "Nieuwe campagne"-formulier (zie NieuweCampagneModal), min de
 * naam die als sticky eerste kolom apart staat. Leads totaal, Leads online, Orders totaal
 * en Status blijven hier bewust weg — die komen ergens anders vandaan en zijn ook in de
 * campagnetabel nooit bewerkbaar (zie CLAUDE.md).
 */
const KOLOMMEN: Kolom[] = [
  {
    label: "Merk",
    veld: "merk",
    huidigeWaarde: (c) => c.merk,
    render: (c) => c.merk || "—",
  },
  {
    label: "Model",
    veld: "model",
    huidigeWaarde: (c) => c.model,
    render: (c) => c.model || "—",
  },
  {
    label: "Budget",
    veld: "budget",
    type: "getal",
    breedte: 96,
    huidigeWaarde: (c) => (c.budget !== null ? String(c.budget) : ""),
    render: (c) => formatCurrency(c.budget),
  },
  {
    label: "Uitgaven",
    veld: "uitgaven",
    type: "getal",
    breedte: 96,
    huidigeWaarde: (c) => (c.uitgaven !== null ? String(c.uitgaven) : ""),
    render: (c) => formatCurrency(c.uitgaven),
  },
  {
    label: "Doel leads online",
    veld: "doelLeads",
    type: "getal",
    breedte: 90,
    huidigeWaarde: (c) => (c.doelLeads !== null ? String(c.doelLeads) : ""),
    render: (c) => formatNumber(c.doelLeads),
  },
  {
    label: "Doel orders totaal",
    veld: "doelOrders",
    type: "getal",
    breedte: 90,
    huidigeWaarde: (c) => (c.doelOrders !== null ? String(c.doelOrders) : ""),
    render: (c) => formatNumber(c.doelOrders),
  },
  {
    label: "Startdatum",
    veld: "startdatum",
    breedte: 100,
    huidigeWaarde: (c) => c.startdatum ?? "",
    render: (c) => formatDate(c.startdatum),
  },
  {
    label: "Einddatum",
    veld: "einddatum",
    breedte: 100,
    huidigeWaarde: (c) => c.einddatum ?? "",
    render: (c) => formatDate(c.einddatum),
  },
  {
    label: "Lead type",
    veld: "leadType",
    huidigeWaarde: (c) => c.leadType,
    render: (c) => c.leadType || "—",
  },
  {
    label: "Ordersoort",
    veld: "ordersoort",
    huidigeWaarde: (c) => c.ordersoort,
    render: (c) => c.ordersoort || "—",
  },
  {
    // Kolomkop in de sheet is "Klantgroep orders (indien van toepassing)"; hier
    // afgekort zoals ook al in de filterbalk gebeurt (CampagneFilterBalk.tsx).
    label: "Klantgroep orders",
    veld: "klantgroepOrders",
    huidigeWaarde: (c) => c.klantgroepOrders,
    render: (c) => c.klantgroepOrders || "—",
  },
];

type Props = {
  ingelogd: boolean;
};

/**
 * De twee tabbladen van Campagnebeheer. "Syntec" is de sheet (de velden die ook in het
 * "Nieuwe campagne"-formulier staan); "Google Analytics" koppelt elke campagne aan de
 * GA4-events die voor hem als conversie tellen.
 *
 * Dit is de enige pagina met tabs boven de inhoud, en dat is een uitzondering op "geen
 * dubbele navigatie" in CLAUDE.md — op verzoek, en verdedigbaar omdat het hier niet om
 * twee pagina's gaat maar om twee kanten van dezelfde campagnelijst. Zie CLAUDE.md.
 */
const TABBLADEN = [
  { id: "syntec", label: "Syntec" },
  { id: "ga", label: "Google Analytics" },
] as const;
type Tabblad = (typeof TABBLADEN)[number]["id"];

/** `?beheer=ga` in de URL, zodat het tabblad een refresh overleeft — zie lib/kanalen/urlstand.ts. */
const URL_PARAMETER = "beheer";

/**
 * Beheeroverzicht van alle campagnes: één rij per campagne, alle velden uit het
 * "Nieuwe campagne"-formulier bewerkbaar in-place — precies de velden die ook in de
 * sheet staan. Elke wijziging gaat via hetzelfde schrijf-endpoint als de bewerkbare
 * cellen in het tabblad Campagnes (`/api/campagnes/veld`), dus dit blijft altijd in
 * sync met de sheet: de sheet is en blijft de bron (zie CLAUDE.md).
 */
export default function CampagneBeheer({ ingelogd }: Props) {
  const actief = useIsActief("campagnebeheer");
  const [tabblad, setTabblad] = useState<Tabblad>("syntec");

  // Uit de URL lezen in een effect en niet in de initiële state, om dezelfde reden als
  // `?tab=` in AppShell: de server rendert altijd het eerste tabblad.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get(URL_PARAMETER) === "ga") setTabblad("ga");
  }, []);

  // Alleen schrijven zolang Campagnebeheer open staat: het paneel blijft gemount als je
  // wegklikt, en dan hoort `?beheer=` niet mee te verhuizen naar een ander tabblad.
  useEffect(() => {
    if (!actief) return;
    const params = new URLSearchParams(window.location.search);
    if (tabblad === "ga") params.set(URL_PARAMETER, "ga");
    else params.delete(URL_PARAMETER);
    const zoek = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${zoek ? `?${zoek}` : ""}`);
  }, [actief, tabblad]);

  if (!ingelogd) {
    return (
      <div className="rounded-panel border border-line bg-surface p-8 text-center">
        <p className="font-sans-w7 text-lg font-bold text-ink">Log in om campagnes te beheren</p>
        <p className="mt-2 text-sm text-ink-muted">
          Campagnes toevoegen en velden bewerken schrijft rechtstreeks terug naar de sheet.
        </p>
        <a
          href="/login"
          className="mt-5 inline-block rounded-button bg-primary px-5 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary-dark"
        >
          Inloggen
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Campagnebeheer" className="flex gap-6 border-b border-line">
        {TABBLADEN.map((t) => {
          const gekozen = tabblad === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={gekozen}
              onClick={() => setTabblad(t.id)}
              className={`-mb-px border-b-2 px-1 pb-2.5 text-sm transition-colors duration-[var(--duur-snel)] ease-merk ${
                gekozen
                  ? "border-primary font-medium text-ink"
                  : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <CampagneFilterBalk />

      <div role="tabpanel" hidden={tabblad !== "syntec"}>
        <SyntecTabel />
      </div>
      <div role="tabpanel" hidden={tabblad !== "ga"}>
        <Ga4Koppeltabel />
      </div>
    </div>
  );
}

/** Tabblad "Syntec": de velden uit de sheet, precies zoals Campagnebeheer was. */
function SyntecTabel() {
  const { filtered } = useCampagneFilters();

  // Nieuwste startdatum eerst, net als het tabblad Campagnes (zie sortByStartdatumDesc
  // in CampaignDashboard.tsx) — campagnes zonder startdatum staan onderaan.
  const gesorteerd = useMemo(
    () => [...filtered].sort((a, b) => (b.startdatum ?? "").localeCompare(a.startdatum ?? "")),
    [filtered],
  );

  return (
    <>
      {gesorteerd.length === 0 ? (
        <div className="rounded-panel border border-line bg-card px-6 py-10 text-center shadow-card">
          <p className="text-sm text-ink-muted">
            Nog geen campagnes. Gebruik het &quot;+&quot;-knopje rechtsonder om er een toe te
            voegen.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-panel border border-line bg-card shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-separate border-spacing-0 text-left">
              <colgroup>
                <col style={{ width: 200 }} />
                {KOLOMMEN.map((kolom) => (
                  <col key={kolom.veld} style={{ width: kolom.breedte ?? 150 }} />
                ))}
              </colgroup>
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="label-theme sticky left-0 top-0 z-20 border-b border-r border-line bg-card px-4 py-3 text-label text-ink-faint"
                  >
                    Campagne naam
                  </th>
                  {KOLOMMEN.map((kolom) => (
                    <th
                      key={kolom.veld}
                      scope="col"
                      className="label-theme sticky top-0 z-10 border-b border-line bg-card px-3 py-3 text-label text-ink-faint"
                    >
                      {kolom.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gesorteerd.map((campagne) => (
                  <tr key={campagne.naam}>
                    <th
                      scope="row"
                      className="sticky left-0 z-10 border-b border-line-soft bg-card px-4 py-3 text-left align-top text-xs font-medium text-ink"
                    >
                      <BewerkbaarVeld campagneNaam={campagne.naam} veld="naam" initieleWaarde={campagne.naam}>
                        {campagne.naam}
                      </BewerkbaarVeld>
                    </th>
                    {KOLOMMEN.map((kolom) => (
                      <td key={kolom.veld} className="border-b border-line-soft px-3 py-3 align-top text-xs text-ink">
                        <BewerkbaarVeld
                          campagneNaam={campagne.naam}
                          veld={kolom.veld}
                          initieleWaarde={kolom.huidigeWaarde(campagne)}
                          type={kolom.type}
                        >
                          {kolom.render(campagne)}
                        </BewerkbaarVeld>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}

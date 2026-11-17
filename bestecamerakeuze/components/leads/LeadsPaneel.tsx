"use client";

import { useEffect, useMemo, useState } from "react";
import FilterSelect from "@/components/FilterSelect";
import Inlogprompt from "@/components/Inlogprompt";
import { IconInfo, IconTarget } from "@/components/icons";
import { formatteer } from "@/components/chat/chartTheme";
import LeadsCampagnes from "@/components/leads/LeadsCampagnes";
import LeadsGrafiek from "@/components/leads/LeadsGrafiek";
import LeadsTabel from "@/components/leads/LeadsTabel";
import { bouwCampagneRijen } from "@/lib/leads/campagnes";
import type { CampagneRegel, LeadRegel } from "@/lib/leads/koppel";
import {
  GEEN_FILTERS,
  ONBEKEND,
  filterRegels,
  groepeer,
  kostenPerLead,
  leadSoort,
  perDag,
  telTotalen,
  waardeOfOnbekend,
  type BetaaldFilter,
  type LeadFilters,
} from "@/lib/leads/samenvatting";

/**
 * Leads: de offerte-, proefrit- en andere aanvragen die udenhout.nl als GA4-event afvuurt,
 * met het merk en model waar het om ging, het kanaal waarlangs ze binnenkwamen — en bij
 * betaalde campagnes wat daarvoor is uitgegeven.
 *
 * Bovenaan de filterbalk, daaronder vijf kerncijfers en de grafiek per dag, dan de
 * tabellen: kanalen, soort lead, merken, modellen, de betaalde campagnes en het formulier
 * waarop de lead werd afgevuurd. Alles filtert in het geheugen; er is één ophaalactie.
 *
 * De bron en de rekenregels staan in `lib/leads/` (en in CLAUDE.md onder "Kanalen →
 * Leads"). Het belangrijkste om te weten: de uitgaven van een campagne worden **verdeeld**
 * over zijn leads, niet gemeten per lead.
 */

interface Antwoord {
  van: string | null;
  tot: string | null;
  regels: LeadRegel[];
  campagnes: CampagneRegel[];
  zonderLead: { uitgaven: number; campagnes: number };
  uitgavenTotaal: number;
  laatsteSync: string | null;
  syncLoopt: boolean;
  fout?: string;
}

const BETAALD_KEUZES: { id: BetaaldFilter; label: string }[] = [
  { id: "alle", label: "Alle" },
  { id: "betaald", label: "Betaald" },
  { id: "onbetaald", label: "Onbetaald" },
];

function datumKort(datum: string): string {
  return new Date(`${datum}T00:00:00Z`).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function syncTekst(iso: string | null): string {
  if (!iso) return "onbekend";
  return new Date(iso).toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Opties op volgorde van grootte, zodat de belangrijkste bovenaan in de keuzelijst staan. */
function opties(regels: LeadRegel[], waardeVan: (r: LeadRegel) => string): string[] {
  const tellers = new Map<string, number>();
  for (const r of regels) tellers.set(waardeVan(r), (tellers.get(waardeVan(r)) ?? 0) + r.aantal);
  return [...tellers.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "nl"))
    .map(([waarde]) => waarde);
}

function Kaart({
  label,
  waarde,
  toelichting,
  noot,
}: {
  label: string;
  waarde: string;
  toelichting: string;
  noot?: string;
}) {
  return (
    <div className="kaart-omlijst flex min-h-32 flex-col justify-center gap-1.5 rounded-card border border-line bg-card px-4 py-4 shadow-subtle">
      <span className="label-theme text-label text-ink-faint">{label}</span>
      <span className="titel-theme font-sans-w7 text-title font-semibold text-ink">{waarde}</span>
      <span className="text-meta text-ink-muted">{toelichting}</span>
      {noot && <span className="text-meta text-ink-faint">{noot}</span>}
    </div>
  );
}

export default function LeadsPaneel({ ingelogd }: { ingelogd: boolean }) {
  const [data, setData] = useState<Antwoord | null>(null);
  const [bezig, setBezig] = useState(true);
  const [fout, setFout] = useState<string | null>(null);
  const [filters, setFilters] = useState<LeadFilters>(GEEN_FILTERS);

  useEffect(() => {
    if (!ingelogd) return;
    let afgebroken = false;
    fetch("/api/leads")
      .then(async (res) => {
        const antwoord = (await res.json()) as Antwoord;
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
  }, [ingelogd]);

  const alleRegels = useMemo(() => data?.regels ?? [], [data]);
  const regels = useMemo(() => filterRegels(alleRegels, filters), [alleRegels, filters]);
  const totalen = useMemo(() => telTotalen(regels), [regels]);
  const totalenAlles = useMemo(() => telTotalen(alleRegels), [alleRegels]);

  const filtersActief =
    filters.events.length > 0 ||
    filters.kanalen.length > 0 ||
    filters.merken.length > 0 ||
    filters.betaald !== "alle";

  const eventOpties = useMemo(() => opties(alleRegels, (r) => r.event), [alleRegels]);
  const kanaalOpties = useMemo(() => opties(alleRegels, (r) => r.kanaal), [alleRegels]);
  const merkOpties = useMemo(() => opties(alleRegels, (r) => waardeOfOnbekend(r.merk)), [alleRegels]);
  const eventLabels = useMemo(
    () => Object.fromEntries(eventOpties.map((e) => [e, leadSoort(e)])),
    [eventOpties],
  );

  const perKanaal = useMemo(() => groepeer(regels, (r) => r.kanaal), [regels]);
  const perSoort = useMemo(() => groepeer(regels, (r) => r.event), [regels]);
  // "Onbekend" onderaan: bij een merk of model is hij vaak de grootste groep, en zou de
  // echte merken naar beneden duwen. Hij blijft wél in de tabel staan — zijn omvang is zelf
  // een cijfer waar je iets aan hebt.
  const perMerk = useMemo(
    () =>
      groepeer(regels, (r) => waardeOfOnbekend(r.merk)).sort(
        (a, b) => Number(a.sleutel === ONBEKEND) - Number(b.sleutel === ONBEKEND),
      ),
    [regels],
  );
  // De modellentabel toont alleen leads mét model: een tabel waarvan de bovenste rij
  // "Onbekend" is, zegt niets over welke auto's mensen willen. Hoeveel er buiten vallen
  // staat in de toelichting.
  const perModel = useMemo(
    () =>
      groepeer(
        regels.filter((r) => r.model !== ""),
        (r) => `${waardeOfOnbekend(r.merk)}\u0000${r.model}`,
        (r) => waardeOfOnbekend(r.merk),
      ),
    [regels],
  );
  const perFormulier = useMemo(() => groepeer(regels, (r) => waardeOfOnbekend(r.formulier)), [regels]);

  const campagneRijen = useMemo(() => {
    const betaald = groepeer(
      regels.filter((r) => r.platform !== null),
      (r) => `${r.platform}\u0000${r.campagne}`,
    );
    // Zonder filter ook de campagnes die geld kostten en niets opleverden: met een filter
    // zegt "geen leads" niets meer over de campagne zelf.
    const zonderLead = filtersActief
      ? []
      : (data?.campagnes ?? []).filter((c) => c.leads === 0 && (c.uitgaven ?? 0) > 0);
    return bouwCampagneRijen(betaald, zonderLead);
  }, [regels, data, filtersActief]);

  const dagen = useMemo(
    () => (data?.van && data.tot ? perDag(regels, data.van, data.tot) : []),
    [regels, data],
  );

  const metMerk = useMemo(
    () => regels.reduce((t, r) => t + (r.merk !== "" ? r.aantal : 0), 0),
    [regels],
  );
  const metModel = useMemo(
    () => regels.reduce((t, r) => t + (r.model !== "" ? r.aantal : 0), 0),
    [regels],
  );

  if (!ingelogd) return <Inlogprompt tekst="Log in om de leads te bekijken." />;

  if (fout) {
    return (
      <p className="rounded-panel border border-line bg-surface-tint px-5 py-4 text-sm text-negative">
        {fout}
      </p>
    );
  }

  if (bezig && !data) {
    return <div className="laadvlak h-64 rounded-panel border border-line bg-card" aria-busy="true" />;
  }

  if (!data || !data.van || !data.tot || alleRegels.length === 0) {
    return (
      <section className="rounded-panel border border-line bg-card px-5 py-6 shadow-subtle">
        <p className="text-sm text-ink-muted">
          De leadtabel is nog leeg. De nachtelijke sync (onderdeel website) vult hem met de
          lead-events van de afgelopen dertig dagen.
        </p>
      </section>
    );
  }

  const pct = (n: number) => (totalen.leads > 0 ? (n / totalen.leads) * 100 : null);
  const perBetaaldeLead = kostenPerLead(totalen);

  return (
    <div className="flex flex-col gap-6">
      {/* Filterbalk: één samenhangend blok, net als op de andere pagina's. */}
      <div className="kaart-omlijst flex flex-wrap items-center justify-between gap-3 rounded-panel border border-line bg-card px-4 py-3 shadow-subtle">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-surface text-ink-muted">
            <IconTarget className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink">
              {datumKort(data.van)} t/m {datumKort(data.tot)}
            </p>
            <p className="text-xs text-ink-faint">
              laatste 30 dagen · udenhout.nl · bijgewerkt {syncTekst(data.laatsteSync)}
              {data.syncLoopt ? " · sync loopt" : ""}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center divide-x divide-line">
          <FilterSelect
            label="Soort lead"
            options={eventOpties}
            selected={filters.events}
            onChange={(events) => setFilters((f) => ({ ...f, events }))}
            labels={eventLabels}
          />
          <FilterSelect
            label="Kanaal"
            options={kanaalOpties}
            selected={filters.kanalen}
            onChange={(kanalen) => setFilters((f) => ({ ...f, kanalen }))}
          />
          <FilterSelect
            label="Merk"
            options={merkOpties}
            selected={filters.merken}
            onChange={(merken) => setFilters((f) => ({ ...f, merken }))}
            zoekbaar
          />
          <div className="flex items-center gap-1 pl-3" role="group" aria-label="Betaald of onbetaald">
            {BETAALD_KEUZES.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => setFilters((f) => ({ ...f, betaald: k.id }))}
                aria-pressed={filters.betaald === k.id}
                className={`rounded-control px-3 py-1.5 text-sm font-medium transition-colors duration-[var(--duur-snel)] ${
                  filters.betaald === k.id
                    ? "bg-primary text-on-primary"
                    : "text-ink-muted hover:bg-surface"
                }`}
              >
                {k.label}
              </button>
            ))}
          </div>
          {filtersActief && (
            <div className="pl-3">
              <button
                type="button"
                onClick={() => setFilters(GEEN_FILTERS)}
                className="rounded-control px-2 py-1.5 text-sm font-medium text-primary hover:bg-primary-light"
              >
                Wis filters
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-3">
        <Kaart
          label="Leads"
          waarde={formatteer(totalen.leads, "aantal")}
          toelichting={
            filtersActief
              ? `van ${formatteer(totalenAlles.leads, "aantal")} in de laatste 30 dagen`
              : "in de laatste 30 dagen"
          }
        />
        <Kaart
          label="Betaald"
          waarde={formatteer(totalen.betaald, "aantal")}
          toelichting={
            pct(totalen.betaald) === null ? "—" : `${formatteer(pct(totalen.betaald), "procent")} van de leads`
          }
          noot={
            totalen.zonderKosten > 0
              ? `waarvan ${formatteer(totalen.zonderKosten, "aantal")} zonder bekende kosten`
              : undefined
          }
        />
        <Kaart
          label="Onbetaald"
          waarde={formatteer(totalen.onbetaald, "aantal")}
          toelichting={
            pct(totalen.onbetaald) === null
              ? "—"
              : `${formatteer(pct(totalen.onbetaald), "procent")} van de leads`
          }
        />
        <Kaart
          label="Uitgaven"
          waarde={formatteer(totalen.kosten, "euro-heel")}
          toelichting={filtersActief ? "toegerekend aan deze leads" : "toegerekend aan de leads"}
          noot={
            !filtersActief && data.zonderLead.campagnes > 0
              ? `+ ${formatteer(data.zonderLead.uitgaven, "euro-heel")} aan ${data.zonderLead.campagnes} ${
                  data.zonderLead.campagnes === 1 ? "campagne" : "campagnes"
                } zonder lead`
              : undefined
          }
        />
        <Kaart
          label="Kosten per betaalde lead"
          waarde={perBetaaldeLead === null ? "—" : formatteer(perBetaaldeLead, "euro-exact")}
          toelichting={
            totalen.metKosten > 0
              ? `gemiddeld over ${formatteer(totalen.metKosten, "aantal")} betaalde leads met bekende kosten`
              : "geen betaalde leads met bekende kosten"
          }
        />
      </div>

      <LeadsGrafiek dagen={dagen} />

      <div className="grid grid-cols-2 items-start gap-6">
        <LeadsTabel
          titel="Kanalen"
          toelichting="Uit welk kanaal de leads binnenkwamen, afgeleid van bron en medium in GA4."
          labelKop="Kanaal"
          groepen={perKanaal}
          totaalLeads={totalen.leads}
          toonBetaald={false}
        />
        <LeadsTabel
          titel="Soort lead"
          toelichting="Het GA4-event dat vuurde: een proefrit-, offerte- of andere aanvraag."
          labelKop="Soort"
          groepen={perSoort}
          totaalLeads={totalen.leads}
          labelVan={(g) => leadSoort(g.sleutel)}
        />
        <LeadsTabel
          titel="Merken"
          toelichting={
            totalen.leads > 0
              ? `${formatteer((metMerk / totalen.leads) * 100, "procent")} van de leads heeft een merk. Alleen formulieren voor proefrit, offerte, private lease en financiering sturen het mee.`
              : undefined
          }
          labelKop="Merk"
          groepen={perMerk}
          totaalLeads={totalen.leads}
          maxRijen={20}
        />
        <LeadsTabel
          titel="Modellen"
          toelichting={
            totalen.leads > 0
              ? `Alleen leads met een model: ${formatteer((metModel / totalen.leads) * 100, "procent")} van de leads. De rest stuurt geen model mee, of de veldnaam (model_titel) in plaats van het model.`
              : undefined
          }
          labelKop="Model"
          groepen={perModel}
          totaalLeads={totalen.leads}
          labelVan={(g) => g.sleutel.split("\u0000")[1] ?? g.sleutel}
        />
      </div>

      <LeadsCampagnes rijen={campagneRijen} />

      <div className="grid grid-cols-2 items-start gap-6">
        <LeadsTabel
          titel="Formulier"
          toelichting="Op welke plek op de site het formulier stond (form_location)."
          labelKop="Formulier"
          groepen={perFormulier}
          totaalLeads={totalen.leads}
        />
        <section className="kaart-omlijst rounded-panel border border-line bg-card px-5 py-4 shadow-subtle">
          <h2 className="flex items-center gap-2 font-sans-w7 text-cell font-semibold text-ink">
            <IconInfo className="h-4 w-4 text-ink-muted" />
            Zo lees je dit
          </h2>
          <ul className="mt-3 flex flex-col gap-2 text-meta text-ink-muted">
            <li>
              <strong className="text-ink">Een lead</strong> is een GA4-event met &quot;lead&quot; in de
              naam op udenhout.nl, over de laatste dertig dagen. Het telt events, niet unieke
              personen: iemand die twee formulieren invult is twee leads. Vacatures
              (generate_lead_vacature) tellen mee; filter ze weg via Soort lead.
            </li>
            <li>
              <strong className="text-ink">Betaald</strong> is verkeer met medium cpc of paid. De
              uitgaven komen uit Google Ads (Udenhout) en Meta Ads (Van den Udenhout) en horen bij
              een lead als platform en campagnenaam overeenkomen.
            </li>
            <li>
              <strong className="text-ink">De kosten zijn een verdeling, geen meting.</strong> De
              uitgaven van een campagne gaan gelijk over zijn leads: € 500 en tien leads maakt elke
              lead € 50, ook een vacature- of proefritlead.
            </li>
            <li>
              <strong className="text-ink">&quot;Onbekend&quot;</strong> bij uitgaven betekent betaald
              verkeer waarvan de kosten niet te vinden zijn: Bing of LinkedIn Ads (geen kostenbron
              hier) of een campagne die niet bij Google Ads of Meta bestaat. Het is niet gratis.
            </li>
            <li>
              <strong className="text-ink">Een sterretje</strong> achter een bedrag betekent dat die rij
              ook betaalde leads bevat waarvan de kosten onbekend zijn. Ze tellen niet mee in het
              bedrag en niet in de kosten per lead.
            </li>
            <li>
              <strong className="text-ink">Uitgaven zonder lead</strong> staan in het kerncijfer en in
              de campagnetabel, zodat een campagne die niets opleverde niet als gratis leest.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Inlogprompt from "@/components/Inlogprompt";
import SelligentFilters from "@/components/selligent/SelligentFilters";
import SelligentGrafiek from "@/components/selligent/SelligentGrafiek";
import SelligentKolommen from "@/components/selligent/SelligentKolommen";
import { IconRefresh } from "@/components/icons";
import type { Datacheck } from "@/lib/selligent/datacheck";
import type { Filter, Stand, Veld } from "@/lib/selligent/stand";

/**
 * Selligent: filters op elke kolom, één metric, en de maandgrafiek eronder.
 *
 * ## Twee verzoeken, en waarom niet één
 *
 * - `/api/selligent` levert de **velden** (de filtercontrols) en het kolomoverzicht. Dat
 *   gebeurt één keer bij het openen: de kolommen veranderen alleen als Selligent een
 *   nieuwe export neerzet.
 * - `/api/selligent/stand` levert de **metric en de grafiek** voor de huidige filters, en
 *   draait bij elke wijziging opnieuw. Dat kost alleen filtertijd: de omgebouwde tabel
 *   staat al in het geheugen van de server (zie `lib/selligent/bron.ts`), dus het bestand
 *   wordt niet opnieuw gedownload.
 *
 * ## Waarom de cijfers blijven staan terwijl er een nieuw verzoek loopt
 *
 * Een filter aanzetten is iets anders dan een pagina openen. Zou het getal tijdens het
 * laden op nul of op een spinner springen, dan zie je bij elke klik even een cijfer dat
 * niet waar is. De vorige stand blijft daarom staan en dempt alleen (`opacity`), tot het
 * nieuwe antwoord binnen is. `volgnummer` zorgt ervoor dat een antwoord dat te laat komt
 * de nieuwere stand niet overschrijft — met zesentwintig filters is de kans op twee
 * verzoeken door elkaar heen reëel.
 *
 * ## Waarom het typen in een zoekveld niet direct een verzoek doet
 *
 * `WACHT_MS` houdt toetsaanslagen bij elkaar. Zonder dat levert "volkswagen" elf
 * verzoeken op waarvan er tien al achterhaald zijn op het moment dat ze aankomen.
 */

/** Hoe lang we wachten na de laatste wijziging voordat we de stand opnieuw ophalen. */
const WACHT_MS = 300;

function getal(n: number): string {
  return n.toLocaleString("nl-NL");
}

function megabytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toLocaleString("nl-NL", { maximumFractionDigits: 1 })} MB`;
}

function datumTijd(iso: string | null): string {
  if (!iso) return "onbekend";
  return new Date(iso).toLocaleString("nl-NL", { dateStyle: "long", timeStyle: "short" });
}

export default function SelligentPaneel({ ingelogd }: { ingelogd: boolean }) {
  const [velden, setVelden] = useState<Veld[] | null>(null);
  const [datacheck, setDatacheck] = useState<Datacheck | null>(null);
  const [stand, setStand] = useState<Stand | null>(null);
  const [filters, setFilters] = useState<Record<string, Filter>>({});
  const [fout, setFout] = useState<string | null>(null);
  const [laadtVelden, setLaadtVelden] = useState(false);
  const [laadtStand, setLaadtStand] = useState(false);

  // Welk standverzoek het laatste is; een ouder antwoord mag een nieuwer niet overschrijven.
  const volgnummer = useRef(0);

  const haalVelden = useCallback(async (vers: boolean) => {
    setLaadtVelden(true);
    setFout(null);
    try {
      const res = await fetch(`/api/selligent${vers ? "?vers=1" : ""}`, { cache: "no-store" });
      const data = (await res.json()) as {
        velden?: Veld[];
        datacheck?: Datacheck;
        fout?: string;
      };
      if (!res.ok || !data.velden || !data.datacheck) {
        throw new Error(data.fout ?? `Mislukt (${res.status}).`);
      }
      setVelden(data.velden);
      setDatacheck(data.datacheck);
    } catch (err) {
      setFout(err instanceof Error ? err.message : String(err));
    } finally {
      setLaadtVelden(false);
    }
  }, []);

  const haalStand = useCallback(async (actief: Filter[]) => {
    const eigen = ++volgnummer.current;
    setLaadtStand(true);
    try {
      const res = await fetch("/api/selligent/stand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters: actief }),
        cache: "no-store",
      });
      const data = (await res.json()) as { stand?: Stand; fout?: string };
      if (eigen !== volgnummer.current) return;
      if (!res.ok || !data.stand) throw new Error(data.fout ?? `Mislukt (${res.status}).`);
      setStand(data.stand);
      setFout(null);
    } catch (err) {
      if (eigen !== volgnummer.current) return;
      setFout(err instanceof Error ? err.message : String(err));
    } finally {
      if (eigen === volgnummer.current) setLaadtStand(false);
    }
  }, []);

  // Pas ophalen als het tabblad voor het eerst getoond wordt — AppShell mount de panelen
  // lui, dus wie hier nooit komt kost de server ook geen download van 36 MB.
  useEffect(() => {
    if (ingelogd) void haalVelden(false);
  }, [ingelogd, haalVelden]);

  const actieveFilters = useMemo(() => Object.values(filters), [filters]);

  useEffect(() => {
    if (!ingelogd || !velden) return;
    const tijd = setTimeout(() => void haalStand(actieveFilters), WACHT_MS);
    return () => clearTimeout(tijd);
  }, [ingelogd, velden, actieveFilters, haalStand]);

  function zetFilter(kolom: string, filter: Filter | null) {
    setFilters((huidig) => {
      const volgende = { ...huidig };
      if (filter) volgende[kolom] = filter;
      else delete volgende[kolom];
      return volgende;
    });
  }

  async function verversAlles() {
    setStand(null);
    await haalVelden(true);
    await haalStand(actieveFilters);
  }

  if (!ingelogd) {
    return <Inlogprompt tekst="De Selligent-export staat achter de inlog." />;
  }

  const gefilterd = actieveFilters.length > 0;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-panel border border-line bg-card px-5 py-4 shadow-subtle">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-sans-w7 text-cell font-semibold text-ink">Het bestand</h2>
            <p className="mt-1 max-w-prose text-meta text-ink-faint">
              Rechtstreeks uit Azure Blob Storage. Er wordt niets van deze data in het
              dashboard of in Supabase opgeslagen — filteren gebeurt op de server, en
              alleen de aantallen komen hier terecht.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void verversAlles()}
            disabled={laadtVelden}
            className="flex shrink-0 items-center gap-1.5 rounded-control px-2 py-1.5 text-sm font-medium text-ink-muted transition-colors duration-[var(--duur-snel)] hover:bg-surface hover:text-ink disabled:cursor-wait disabled:opacity-60"
          >
            <IconRefresh className={`h-4 w-4 ${laadtVelden ? "animate-spin" : ""}`} />
            {laadtVelden ? "Ophalen…" : "Opnieuw ophalen"}
          </button>
        </div>

        {fout && (
          <p className="mt-4 rounded-control border border-line bg-surface-tint px-3 py-2 text-sm text-negative">
            {fout}
          </p>
        )}

        {!datacheck && !fout && (
          <p className="mt-4 text-sm text-ink-muted">
            {laadtVelden
              ? "Het bestand is 36 MB; de eerste keer duurt ongeveer tien seconden."
              : "Nog niets opgehaald."}
          </p>
        )}

        {datacheck && (
          <p className="mt-4 text-meta text-ink-faint">
            <code>{datacheck.bestand.pad}</code> · {megabytes(datacheck.bestand.bytes)} ·{" "}
            {getal(datacheck.rijen)} rijen · door Selligent neergezet op{" "}
            {datumTijd(datacheck.bestand.gewijzigdOp)}
            {datacheck.overgeslagenRijen > 0 && (
              <>
                {" "}
                · {getal(datacheck.overgeslagenRijen)} rijen overgeslagen (afwijkend aantal
                velden)
              </>
            )}
          </p>
        )}
      </section>

      {velden && (
        <SelligentFilters
          velden={velden}
          filters={filters}
          onFilter={zetFilter}
          onWisAlles={() => setFilters({})}
        />
      )}

      {/* De metric. Eén cijfer, groot, met eronder waar het op rust — het aantal rijen
          erbij is context en geen tweede metric: een rij is een contact mét een voertuig,
          dus die twee getallen horen niet naast elkaar als gelijkwaardige KPI's te staan. */}
      <section
        className={`kaart-omlijst kaart-accent rounded-panel border border-line bg-card p-5 shadow-card transition-opacity ${
          laadtStand ? "opacity-60" : ""
        }`}
      >
        <p className="label-theme text-label text-ink-faint">Contacten</p>
        <p className="titel-theme mt-1 font-sans-w7 text-title font-semibold text-ink">
          {stand ? getal(stand.contacten) : "—"}
        </p>
        {stand && (
          <p className="mt-1 text-meta text-ink-muted">
            {gefilterd
              ? `van ${getal(stand.contactenTotaal)} in het hele bestand`
              : "alle contacten in het bestand"}{" "}
            · uit {getal(stand.rijen)} rijen
            {stand.contactKolom && (
              <>
                {" "}
                · verschillende waarden in <code>{stand.contactKolom}</code>
              </>
            )}
          </p>
        )}
        {stand && stand.contactKolom === null && (
          <p className="mt-1 text-meta text-ink-faint">
            Er zit geen id-kolom in deze export, dus contacten zijn niet te tellen.
          </p>
        )}
      </section>

      {stand && (
        <SelligentGrafiek
          maanden={stand.maanden}
          kolom={stand.creatieKolom}
          zonderDatum={stand.zonderCreatiedatum}
          bezig={laadtStand}
        />
      )}

      {datacheck && <SelligentKolommen datacheck={datacheck} />}
    </div>
  );
}

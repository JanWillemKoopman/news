"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Inlogprompt from "@/components/Inlogprompt";
import SelligentFilters from "@/components/selligent/SelligentFilters";
import SelligentGrafiek from "@/components/selligent/SelligentGrafiek";
import SelligentKolommen from "@/components/selligent/SelligentKolommen";
import SelligentMerkBalk from "@/components/selligent/SelligentMerkBalk";
import { GroteMetrics, OptinStrip } from "@/components/selligent/SelligentMetrics";
import type { Datacheck } from "@/lib/selligent/datacheck";
import {
  LEEG_OPTIE,
  MAIL_KOLOMMEN,
  MERK_KOLOM,
  type Filter,
  type OptinStand,
  type Stand,
  type Veld,
} from "@/lib/selligent/stand";

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
 * ## De volgorde van het scherm
 *
 * Filters bovenaan en dicht, dan de cijfers, dan de grafieken, en het kolomoverzicht
 * onderaan. Je komt hier voor een getal; de filterbalk is het gereedschap waarmee je dat
 * getal aanscherpt, en gereedschap hoort niet het halve scherm te vullen voordat je
 * gezien hebt waar je naar kijkt. Wat er wél altijd staat zijn de chips met de actieve
 * filters, zodat de dichte balk nog steeds vertelt waar de cijfers over gaan.
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
  const [optinStand, setOptinStand] = useState<OptinStand>("waar");
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

  /**
   * Een opt-in-tegel aan- of uitzetten: dat is hetzelfde als het filter op die kolom op
   * de waarden van de gekozen stand zetten. De waarden komen van de server mee, zodat het
   * filter precies de contacten pakt die in het cijfer op de tegel zitten.
   */
  function zetOptin(kolom: string, waarden: string[] | null) {
    zetFilter(kolom, waarden && waarden.length > 0 ? { kolom, waarden } : null);
  }

  /**
   * Welke opt-ins nu als filter aanstaan, zodat de tegels hun eigen stand tonen.
   *
   * Een tegel licht alleen op als het filter exact de waarden van de getoonde stand is:
   * sta je op "Onbekend" terwijl er op `True` gefilterd is, dan hoort die tegel niet
   * actief te lijken — het cijfer erop gaat dan over iets anders dan het filter.
   */
  const actieveOptins = useMemo(() => {
    const hoort = (optin: { waarWaarden: string[]; onwaarWaarden: string[] }) =>
      optinStand === "waar"
        ? optin.waarWaarden
        : optinStand === "onwaar"
          ? optin.onwaarWaarden
          : [LEEG_OPTIE];
    return (stand?.optins ?? [])
      .filter((optin) => {
        const filter = filters[optin.kolom];
        const verwacht = hoort(optin);
        if (!filter?.waarden || verwacht.length === 0) return false;
        return (
          filter.waarden.length === verwacht.length &&
          verwacht.every((w) => filter.waarden!.includes(w))
        );
      })
      .map((optin) => optin.kolom);
  }, [filters, stand, optinStand]);

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
  const bijgewerkt = datacheck?.bestand.gewijzigdOp
    ? `Bijgewerkt ${new Date(datacheck.bestand.gewijzigdOp).toLocaleString("nl-NL", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })}`
    : null;

  // Merk heeft zijn eigen balk boven de pagina en hoort daarom niet óók in het raster:
  // twee controls op dezelfde filterwaarde spreken elkaar niet tegen, maar het zijn wel
  // twee plekken om te kijken.
  const merkVeld = velden?.find((v) => v.naam === MERK_KOLOM && v.soort === "lijst") ?? null;
  // Het mailadres heeft geen filter in de balk, op verzoek. Het staat als metric in beeld
  // (alleen het aantal), en een zoekveld waarin je een adres intypt om te zien of het
  // bestaat, is iets anders dan een dashboard — dat hoort in Selligent zelf.
  const rasterVelden =
    velden?.filter((v) => v !== merkVeld && !MAIL_KOLOMMEN.includes(v.naam)) ?? null;

  return (
    <div className="flex flex-col gap-6">
      {merkVeld && (
        <SelligentMerkBalk
          veld={merkVeld}
          filter={filters[merkVeld.naam]}
          onFilter={(f) => zetFilter(merkVeld.naam, f)}
          bezig={laadtStand}
        />
      )}

      {rasterVelden ? (
        <SelligentFilters
          velden={rasterVelden}
          filters={filters}
          onFilter={zetFilter}
          onWisAlles={() => setFilters({})}
          aantalActief={actieveFilters.length}
          bijgewerkt={bijgewerkt}
          onVerversen={() => void verversAlles()}
          verversBezig={laadtVelden}
        />
      ) : (
        <section className="rounded-panel border border-line bg-card px-5 py-4 shadow-subtle">
          <p className="text-sm text-ink-muted">
            {laadtVelden
              ? "Even geduld — het bestand is 36 MB en de eerste keer duurt ongeveer tien seconden."
              : "Nog niets opgehaald."}
          </p>
        </section>
      )}

      {fout && (
        <p className="rounded-panel border border-line bg-surface-tint px-5 py-4 text-sm text-negative">
          {fout}
        </p>
      )}

      {stand && (
        <>
          <GroteMetrics
            contacten={stand.contacten}
            contactenTotaal={stand.contactenTotaal}
            contactKolom={stand.contactKolom}
            emails={stand.emails}
            emailsTotaal={stand.emailsTotaal}
            emailKolom={stand.emailKolom}
            autos={stand.autos}
            autosTotaal={stand.autosTotaal}
            autoKolom={stand.autoKolom}
            rijen={stand.rijen}
            gefilterd={gefilterd}
            bezig={laadtStand}
          />

          <OptinStrip
            optins={stand.optins}
            contacten={stand.contacten}
            stand={optinStand}
            onStand={setOptinStand}
            actief={actieveOptins}
            onKies={zetOptin}
            bezig={laadtStand}
          />

          <SelligentGrafiek
            titel="Contacten toegevoegd in Selligent per maand"
            toelichting="De maand waarin het contact in Selligent is aangemaakt. Een contact met meerdere auto's staat één keer in zijn eigen maand."
            reeksnaam="Contacten"
            eenheid={["contact", "contacten"]}
            maanden={stand.maanden}
            kolom={stand.creatieKolom}
            zonderDatum={stand.zonderCreatiedatum}
            kleurIndex={0}
            bezig={laadtStand}
          />

          <SelligentGrafiek
            titel="Unieke e-mailadressen toegevoegd in Selligent per maand"
            toelichting="De maand waarin het e-mailadres in Selligent is aangemaakt. Een e-mailadres dat bij meerdere contacten of auto's hoort staat één keer in zijn eigen maand."
            reeksnaam="E-mailadressen"
            eenheid={["e-mailadres", "e-mailadressen"]}
            maanden={stand.emailMaanden}
            kolom={stand.creatieKolom}
            zonderDatum={stand.emailsZonderDatum}
            kleurIndex={0}
            bezig={laadtStand}
          />

          <SelligentGrafiek
            titel="Auto's toegevoegd in Selligent per maand"
            toelichting="De auto's van de contacten die in die maand in Selligent zijn aangemaakt. Elke auto telt één keer, ook als hij bij meerdere rijen hoort."
            reeksnaam="Auto's"
            eenheid={["auto", "auto's"]}
            maanden={stand.autoMaanden}
            kolom={stand.autoDatumKolom}
            zonderDatum={stand.autosZonderDatum}
            kleurIndex={1}
            bezig={laadtStand}
          />

          {stand.leverKolom && (
            <SelligentGrafiek
              titel="Afgeleverde auto's per maand"
              toelichting="De maand waarin de auto is afgeleverd. Dezelfde auto's als hierboven, maar op de datum van de auto zelf in plaats van die van zijn contact — let op de sentinel-datums uit 1900 in deze kolom."
              reeksnaam="Auto's"
              eenheid={["auto", "auto's"]}
              maanden={stand.leverMaanden}
              kolom={stand.leverKolom}
              zonderDatum={stand.autosZonderLeverdatum}
              kleurIndex={2}
              bezig={laadtStand}
            />
          )}
        </>
      )}

      {datacheck && <SelligentKolommen datacheck={datacheck} />}
    </div>
  );
}

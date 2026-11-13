"use client";

import { useCallback, useEffect, useState } from "react";
import Inlogprompt from "@/components/Inlogprompt";
import ProgressBar from "@/components/ProgressBar";
import { IconInfo, IconRefresh } from "@/components/icons";
import type { Datacheck, KolomCheck, WaardeType } from "@/lib/selligent/datacheck";

/**
 * Selligent: de datacheck op de export in Azure Blob Storage.
 *
 * ## Waarom dit tabblad met een datacheck begint en niet met cijfers
 *
 * Omdat de export rommeliger is dan hij lijkt. `FUEL_TYPE` bevat `B` naast `Benzine`,
 * `BRAND` bevat naast merken ook codes als `AM_PKW`, `OPTOUT` is geen ja/nee maar een
 * reeks getallen waarvan de betekenis buiten dit dashboard ligt, en een rij is geen klant
 * maar een klant-met-voertuig. Een grafiek die daar bovenop gebouwd wordt vóórdat iemand
 * dat gezien heeft, is een grafiek waarin niemand z'n eigen cijfers terugkent.
 *
 * Dit tabblad toont daarom eerst wat er in het bestand zit: hoe vers, hoeveel rijen, en
 * per kolom hoe vol hij is, wat voor waarden erin staan en hoeveel verschillende. Dat is
 * wat tot nu toe in een notebook gedaan werd, en het is de basis voor het gesprek over
 * welke cijfers hier straks horen te staan.
 *
 * ## Wat hier niet staat
 *
 * Geen enkele waarde uit een kolom die naar een persoon of voertuig verwijst. De server
 * laat ze niet in het antwoord komen (`lib/selligent/datacheck.ts`), dus ze bereiken de
 * browser niet — ook niet als iemand het netwerkverkeer openklapt. Van zulke kolommen
 * staat hier alleen hoeveel rijen gevuld zijn en hoeveel verschillende waarden er zijn.
 * Dát is wat dit tabblad voor alle collega's open laat staan.
 */

const TYPE_LABEL: Record<WaardeType, string> = {
  leeg: "altijd leeg",
  getal: "getal",
  datum: "datum",
  booleaans: "ja/nee",
  tekst: "tekst",
};

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

function datum(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", { dateStyle: "medium" });
}

export default function SelligentPaneel({ ingelogd }: { ingelogd: boolean }) {
  const [datacheck, setDatacheck] = useState<Datacheck | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const [uitCache, setUitCache] = useState(false);

  const haal = useCallback(async (vers: boolean) => {
    setBezig(true);
    setFout(null);
    try {
      const res = await fetch(`/api/selligent${vers ? "?vers=1" : ""}`, { cache: "no-store" });
      const data = (await res.json()) as {
        datacheck?: Datacheck;
        uitCache?: boolean;
        fout?: string;
      };
      if (!res.ok || !data.datacheck) throw new Error(data.fout ?? `Mislukt (${res.status}).`);
      setDatacheck(data.datacheck);
      setUitCache(Boolean(data.uitCache));
    } catch (err) {
      setFout(err instanceof Error ? err.message : String(err));
    } finally {
      setBezig(false);
    }
  }, []);

  // Pas ophalen als het tabblad voor het eerst getoond wordt — AppShell mount de panelen
  // lui, dus dit draait niet voor wie hier nooit komt. Dat scheelt een download van 36 MB.
  useEffect(() => {
    if (ingelogd) void haal(false);
  }, [ingelogd, haal]);

  if (!ingelogd) {
    return <Inlogprompt tekst="De Selligent-export staat achter de inlog." />;
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-panel border border-line bg-card px-5 py-4 shadow-subtle">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-cell font-sans-w7 font-bold text-ink">Het bestand</h2>
            <p className="mt-1 max-w-prose text-meta text-ink-faint">
              Rechtstreeks uit Azure Blob Storage, bij elke ververs opnieuw. Er wordt niets
              van deze data in het dashboard of in Supabase opgeslagen — alleen de
              optelling die je hieronder ziet.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void haal(true)}
            disabled={bezig}
            className="flex shrink-0 items-center gap-1.5 rounded-control px-2 py-1.5 text-sm font-medium text-ink-muted transition-colors duration-[var(--duur-snel)] hover:bg-surface hover:text-ink disabled:cursor-wait disabled:opacity-60"
          >
            <IconRefresh className={`h-4 w-4 ${bezig ? "animate-spin" : ""}`} />
            {bezig ? "Ophalen…" : "Opnieuw ophalen"}
          </button>
        </div>

        {fout && (
          <p className="mt-4 rounded-control border border-line bg-surface-tint px-3 py-2 text-sm text-negative">
            {fout}
          </p>
        )}

        {!datacheck && !fout && (
          <p className="mt-4 text-sm text-ink-muted">
            {bezig
              ? "Het bestand is 36 MB; de eerste keer duurt ongeveer tien seconden."
              : "Nog niets opgehaald."}
          </p>
        )}

        {datacheck && (
          <>
            <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Tegel label="Rijen" waarde={getal(datacheck.rijen)} />
              <Tegel label="Kolommen" waarde={getal(datacheck.kolommen.length)} />
              <Tegel label="Grootte" waarde={megabytes(datacheck.bestand.bytes)} />
              <Tegel
                label="Door Selligent neergezet"
                waarde={datumTijd(datacheck.bestand.gewijzigdOp)}
              />
            </dl>
            <p className="mt-4 text-meta text-ink-faint">
              <code>{datacheck.bestand.pad}</code> ·{" "}
              {uitCache
                ? `onveranderd sinds de vorige doorrekening van ${datumTijd(datacheck.berekendOp)}`
                : `opgehaald en doorgerekend in ${(datacheck.duurMs / 1000).toLocaleString("nl-NL", { maximumFractionDigits: 1 })} s`}
              {datacheck.overgeslagenRijen > 0 && (
                <> · {getal(datacheck.overgeslagenRijen)} rijen overgeslagen (afwijkend aantal velden)</>
              )}
            </p>
          </>
        )}
      </section>

      {datacheck && (
        <section className="rounded-panel border border-line bg-card shadow-subtle">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-cell font-sans-w7 font-bold text-ink">
              De kolommen ({datacheck.kolommen.length})
            </h2>
            <p className="mt-1 flex items-start gap-2 text-meta text-ink-faint">
              <IconInfo className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                De lijst volgt het bestand: verdwijnt er een kolom uit de export, dan
                verdwijnt hij hier ook, zonder dat er iets aangepast hoeft te worden.
                Kolommen die naar een persoon of voertuig verwijzen laten hun waarden
                nooit zien — daarvan staat hier alleen hoe vol ze zijn.
              </span>
            </p>
          </div>
          <ul className="flex flex-col">
            {datacheck.kolommen.map((kolom) => (
              <KolomRegel key={kolom.naam} kolom={kolom} rijen={datacheck.rijen} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Tegel({ label, waarde }: { label: string; waarde: string }) {
  return (
    <div>
      <dt className="label-theme text-label text-ink-faint">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-ink">{waarde}</dd>
    </div>
  );
}

function KolomRegel({ kolom, rijen }: { kolom: KolomCheck; rijen: number }) {
  const percent = Math.round(kolom.vulgraad * 100);
  return (
    <li className="border-b border-line px-5 py-3 last:border-b-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <code className="text-sm font-medium text-ink">{kolom.naam}</code>
        <span className="rounded-pill bg-surface px-2 py-0.5 text-label text-ink-muted">
          {TYPE_LABEL[kolom.type]}
        </span>
        {kolom.verschillend !== null && (
          <span className="text-meta text-ink-faint">
            {getal(kolom.verschillend)} verschillend
          </span>
        )}
        {kolom.bereik && (
          <span className="text-meta text-ink-faint">
            {datum(kolom.bereik.van)} – {datum(kolom.bereik.tot)}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-3">
        <ProgressBar percent={percent} className="h-1 max-w-40" />
        <span className="text-meta text-ink-faint">
          {percent}% gevuld ({getal(kolom.gevuld)} van {getal(rijen)})
        </span>
      </div>

      {kolom.waarden.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {kolom.waarden.map((w) => (
            <li
              key={w.waarde}
              className="rounded-control bg-surface px-2 py-0.5 text-meta text-ink-muted"
            >
              {w.waarde || <span className="italic">leeg</span>}{" "}
              <span className="text-ink-faint">{getal(w.aantal)}</span>
            </li>
          ))}
        </ul>
      )}

      {kolom.waardenVerborgen === "persoonsgegeven" && (
        <p className="mt-2 text-meta text-ink-faint">
          Verwijst naar een persoon of voertuig — de waarden blijven op de server.
        </p>
      )}
      {kolom.waardenVerborgen === "te-veel-verschillend" && (
        <p className="mt-2 text-meta text-ink-faint">
          Te veel verschillende waarden om er een verdeling van te maken; dit is een
          identificerend veld.
        </p>
      )}
    </li>
  );
}

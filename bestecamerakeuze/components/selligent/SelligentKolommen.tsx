"use client";

import { useState } from "react";
import ProgressBar from "@/components/ProgressBar";
import { IconChevronDown, IconInfo } from "@/components/icons";
import type { Datacheck, KolomCheck, WaardeType } from "@/lib/selligent/datacheck";
import { toonWaarde } from "@/lib/selligent/weergave";

/**
 * Het kolomoverzicht, ingeklapt onder de filters.
 *
 * Dit was eerst de hele pagina en is nu het naslagwerk eronder: per kolom het type, hoe
 * vol hij is, hoeveel verschillende waarden erin staan en welke. Het staat dicht omdat de
 * pagina over de cijfers gaat, en het staat er nog steeds omdat de export rommeliger is
 * dan hij lijkt — wie een getal uit dit dashboard moet verdedigen, hoort hier te kunnen
 * nazoeken waar het op rust.
 *
 * De volgorde is die van het bestand, dezelfde als die van de filterbalk, zodat je een
 * filter en zijn kolom naast elkaar kunt leggen.
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

function datum(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", { dateStyle: "medium" });
}

function megabytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toLocaleString("nl-NL", { maximumFractionDigits: 1 })} MB`;
}

export default function SelligentKolommen({ datacheck }: { datacheck: Datacheck }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-panel border border-line bg-card shadow-subtle">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span>
          <span className="block font-sans-w7 text-cell font-semibold text-ink">
            De kolommen ({datacheck.kolommen.length})
          </span>
          <span className="mt-0.5 block text-meta text-ink-faint">
            Wat er per kolom in staat: type, vulgraad en de waarden die erin voorkomen.
          </span>
        </span>
        <IconChevronDown
          className={`h-4 w-4 shrink-0 text-ink-muted transition-transform duration-[var(--duur-snel)] ease-merk ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <>
          {/* Waar de cijfers vandaan komen. Dit stond eerst als een apart blok bovenaan de
              pagina; daar nam het ruimte in van de cijfers waarvoor je komt. Hier staat het
              bij de rest van het naslagwerk, en vindbaar wanneer iemand het nodig heeft. */}
          <p className="border-t border-line px-5 py-3 text-meta text-ink-faint">
            Rechtstreeks uit Azure Blob Storage: <code>{datacheck.bestand.pad}</code> ·{" "}
            {megabytes(datacheck.bestand.bytes)} · {getal(datacheck.rijen)} rijen · door
            Selligent neergezet op{" "}
            {datacheck.bestand.gewijzigdOp
              ? new Date(datacheck.bestand.gewijzigdOp).toLocaleString("nl-NL", {
                  dateStyle: "long",
                  timeStyle: "short",
                })
              : "onbekend"}
            {datacheck.overgeslagenRijen > 0 && (
              <>
                {" "}
                · {getal(datacheck.overgeslagenRijen)} rijen overgeslagen (afwijkend aantal
                velden)
              </>
            )}
            . Er wordt niets van deze data opgeslagen — filteren gebeurt op de server en
            alleen de aantallen komen in de browser terecht.
          </p>
          <p className="flex items-start gap-2 border-t border-line px-5 py-3 text-meta text-ink-faint">
            <IconInfo className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              De lijst volgt het bestand: verdwijnt er een kolom uit de export, dan
              verdwijnt hij hier en in de filterbalk ook, zonder dat er iets aangepast hoeft
              te worden. Kolommen die naar een persoon of voertuig verwijzen laten hun
              waarden nooit zien — daarvan staat hier alleen hoe vol ze zijn.
            </span>
          </p>
          <ul className="flex flex-col border-t border-line">
            {datacheck.kolommen.map((kolom) => (
              <KolomRegel key={kolom.naam} kolom={kolom} rijen={datacheck.rijen} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

/** Hoeveel waarden we per kolom laten zien voordat er "en N meer" achter komt. */
const MAX_CHIPS = 12;

function KolomRegel({ kolom, rijen }: { kolom: KolomCheck; rijen: number }) {
  const percent = Math.round(kolom.vulgraad * 100);
  const chips = kolom.waarden.slice(0, MAX_CHIPS);
  const rest = kolom.waarden.length - chips.length;

  return (
    <li className="border-b border-line px-5 py-3 last:border-b-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <code className="text-sm font-medium text-ink">{kolom.naam}</code>
        <span className="rounded-pill bg-surface px-2 py-0.5 text-label text-ink-muted">
          {TYPE_LABEL[kolom.type]}
        </span>
        <span className="text-meta text-ink-faint">{getal(kolom.verschillend)} verschillend</span>
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

      {chips.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {chips.map((w) => (
            <li
              key={w.waarde}
              className="rounded-control bg-surface px-2 py-0.5 text-meta text-ink-muted"
            >
              {toonWaarde(w.waarde)} <span className="text-ink-faint">{getal(w.aantal)}</span>
            </li>
          ))}
          {rest > 0 && (
            <li className="px-1 py-0.5 text-meta text-ink-faint">en {getal(rest)} meer</li>
          )}
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

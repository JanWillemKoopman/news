"use client";

import { useState } from "react";
import Avatar from "@/components/Avatar";
import { MedaillePil } from "@/components/Medaille";
import { IconTrash } from "@/components/icons";
import { initialenVoor } from "@/lib/initialen";
import { SOORT_LABEL, type NotitieSoort } from "@/lib/notities";
import type { Medaille } from "@/lib/punten";
import { useTeamData, type Bericht, type Profiel } from "@/lib/teamData";

type Props = {
  berichten: Bericht[];
  profielen: Record<string, Profiel>;
  /** De campagnenamen uit de sheet — alles daarbuiten is een vrij onderwerp. */
  bekendeCampagnes: Set<string>;
  /** De #1/#2/#3 van de lopende week, zodat de stand ook hier zichtbaar is. */
  medailles: Record<string, Medaille>;
  laden: boolean;
};

/** Zelfde ingetogen badges als in het logboek per campagne: alleen een besluit krijgt kleur. */
const SOORT_STIJL: Record<NotitieSoort, string> = {
  observatie: "bg-surface text-ink-muted",
  hypothese: "bg-surface text-ink-muted",
  besluit: "bg-primary-light text-primary",
  actie: "bg-surface-tint text-ink-muted",
};

function formatDatum(iso: string): string {
  const datum = new Date(iso);
  if (Number.isNaN(datum.getTime())) return "";
  return new Intl.DateTimeFormat("nl-NL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(datum);
}

/**
 * Alles wat het team heeft vastgelegd, in één tabel: wanneer, door wie, bij welke
 * campagne, wat voor soort bericht en de tekst zelf.
 *
 * De initialen staan naast het profielfotootje in plaats van in plaats daarvan: de foto
 * herken je van een afstand, de twee letters maken het eenduidig als twee collega's op
 * elkaar lijken. Staat iemand deze week in de top 3, dan hangt zijn medaille er ook bij —
 * zo zie je de stand terwijl je leest wat er is vastgelegd, zonder naar het scoretabblad
 * te hoeven. Bewerken gebeurt hier bewust niet — dat blijft bij de campagne zelf, waar
 * de aantekening ook in zijn context staat.
 *
 * Verwijderen wél, maar alleen door de twee beheeraccounts (`magAllesVerwijderen`, zie
 * lib/gebruikersbeheer.ts): dit is het enige scherm waar álle berichten van iedereen bij
 * elkaar staan, en dus de plek om er een op te ruimen die er niet hoort. Voor iedereen
 * anders staat de kolom er niet — en dat is niet de enige grendel: de DELETE-route en de
 * RLS-policy op de tabel houden dezelfde regel aan.
 *
 * Twee klikken, geen pop-up: de eerste klik zet de knop om in "Weg?", de tweede doet het.
 * Een dialoog over een regel die je al aanwijst leest niemand; een knop die eerst iets
 * anders wordt, remt precies genoeg.
 */
export default function BerichtenTabel({
  berichten,
  profielen,
  bekendeCampagnes,
  medailles,
  laden,
}: Props) {
  const { magAllesVerwijderen, verwijderBericht } = useTeamData();
  const [bevestigId, setBevestigId] = useState<string | null>(null);
  const [bezigId, setBezigId] = useState<string | null>(null);

  async function verwijder(bericht: Bericht) {
    setBezigId(bericht.id);
    try {
      await verwijderBericht(bericht);
    } catch {
      // De melding staat al boven de tabel (`fout` uit TeamDataProvider); de rij blijft
      // staan, want hij is niet weg.
    } finally {
      setBezigId(null);
      setBevestigId(null);
    }
  }

  if (laden) {
    return (
      <div className="rounded-panel border border-line bg-card px-5 py-8 text-sm text-ink-faint shadow-subtle">
        Laden…
      </div>
    );
  }

  if (berichten.length === 0) {
    return (
      <div className="rounded-panel border border-line bg-card px-5 py-8 text-sm text-ink-faint shadow-subtle">
        Geen berichten gevonden. Leg er rechtsonder met + een nieuwe vast.
      </div>
    );
  }

  return (
    <div className="kaart-accent overflow-hidden rounded-panel border border-line bg-card shadow-card">
      <table className="w-full border-separate border-spacing-0 text-left">
        <thead>
          <tr className="bg-surface-tint">
            {["Datum", "Wie", "Campagne", "Type bericht", "Bericht"].map((kop) => (
              <th
                key={kop}
                scope="col"
                className="label-theme border-b border-line px-2 py-2.5 text-label font-medium text-ink-faint"
              >
                {kop}
              </th>
            ))}
            {magAllesVerwijderen && (
              // Geen koptekst: de prullenbak spreekt voor zich en een kolomkop
              // "Verwijderen" trekt de aandacht naar precies het verkeerde.
              <th scope="col" className="border-b border-line px-2 py-2.5">
                <span className="sr-only">Verwijderen</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {berichten.map((bericht) => {
            const profiel = profielen[bericht.aangemaaktDoor];
            const vrijOnderwerp = !bekendeCampagnes.has(bericht.campagneNaam);
            return (
              <tr key={bericht.id} className="align-top">
                <td className="whitespace-nowrap border-b border-line-soft px-2 py-3 text-sm tabular-nums text-ink-muted">
                  {formatDatum(bericht.aangemaaktOp)}
                </td>
                <td className="whitespace-nowrap border-b border-line-soft px-2 py-3">
                  {/* De foto alleen als er een foto is: zonder avatar toont het rondje
                      zelf al de initialen, en dan zou je ze twee keer naast elkaar zien. */}
                  <span className="flex items-center gap-2" title={profiel?.naam ?? "Onbekend"}>
                    {profiel?.avatarUrl && (
                      <Avatar naam={profiel.naam} avatarUrl={profiel.avatarUrl} size={22} />
                    )}
                    <span className="text-sm font-medium text-ink">
                      {initialenVoor(profiel?.naam ?? null)}
                    </span>
                    {medailles[bericht.aangemaaktDoor] && (
                      <MedaillePil plek={medailles[bericht.aangemaaktDoor]} />
                    )}
                  </span>
                </td>
                <td className="border-b border-line-soft px-2 py-3 text-sm text-ink">
                  <span className="block max-w-[220px] truncate" title={bericht.campagneNaam}>
                    {bericht.campagneNaam}
                  </span>
                  {vrijOnderwerp && (
                    <span className="mt-0.5 block text-xs text-ink-faint">Vrij onderwerp</span>
                  )}
                </td>
                <td className="whitespace-nowrap border-b border-line-soft px-2 py-3">
                  <span
                    className={`label-theme rounded-control px-1.5 py-0.5 text-label ${SOORT_STIJL[bericht.soort]}`}
                  >
                    {SOORT_LABEL[bericht.soort]}
                  </span>
                </td>
                <td className="border-b border-line-soft px-2 py-3 text-sm whitespace-pre-wrap text-ink">
                  {bericht.tekst}
                </td>
                {magAllesVerwijderen && (
                  <td className="border-b border-line-soft px-2 py-3 text-right whitespace-nowrap">
                    {bevestigId === bericht.id ? (
                      <span className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => void verwijder(bericht)}
                          disabled={bezigId === bericht.id}
                          className="rounded-control border border-line bg-card px-2 py-1 text-xs font-medium text-negative transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {bezigId === bericht.id ? "Bezig…" : "Weg?"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setBevestigId(null)}
                          className="rounded-control px-2 py-1 text-xs font-medium text-ink-muted transition-colors hover:bg-surface"
                        >
                          Nee
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setBevestigId(bericht.id)}
                        aria-label={`Bericht van ${profiel?.naam ?? "onbekend"} verwijderen`}
                        title="Bericht verwijderen"
                        className="flex h-6 w-6 items-center justify-center rounded text-ink-faint transition-colors hover:bg-surface hover:text-negative"
                      >
                        <IconTrash className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

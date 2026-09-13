"use client";

import { useMemo, useState } from "react";
import { IconArrowDown, IconArrowUp, IconInfo } from "@/components/icons";
import { bepaalSignalen, type Signaal, type SignaalInstellingen } from "@/lib/kanalen/signalen";
import type { Kubus } from "@/lib/kanalen/kubus";
import type { Statistiek } from "@/lib/windsor/velden";

/**
 * "Hier moet je naar kijken" — bovenaan de pagina, vóór de cijfers.
 *
 * Dit is wat monitoren van kijken onderscheidt. Een tabel met periodetotalen laat een
 * campagne die halverwege stilviel er keurig uitzien: het totaal staat er nog. Deze lijst
 * knipt de gekozen periode in tweeën en meldt wat er tussen die twee helften veranderde
 * (zie `lib/kanalen/signalen.ts`).
 *
 * **Een signaal is klikbaar.** Eén klik zet het filter op die campagne, en dan staat de
 * hele pagina eronder — grafiek, tabellen, de "+" voor een aantekening — op precies dat
 * ene onderwerp. Zonder die stap is een signalenlijst een tweede dashboard in plaats van
 * een ingang tot het eerste.
 *
 * Verschijnt niet als er niets te melden is. Een blok dat elke week "geen bijzonderheden"
 * zegt, wordt na drie weken niet meer gelezen — en dan valt de week dat er wél iets staat
 * ook niet meer op.
 */

const ZICHTBAAR = 4;

type Props = {
  kubus: Kubus;
  rijen: number[][];
  statistieken: Statistiek[];
  instellingen: SignaalInstellingen;
  /** Zet het filter op dit onderwerp; de hele pagina volgt. */
  onKies: (dimensie: string, waarden: string[]) => void;
  /** Welke waarden staan er nu in dat filter — een gekozen signaal blijft gemarkeerd. */
  gekozen: string[];
};

export default function SignaalPaneel({
  kubus,
  rijen,
  statistieken,
  instellingen,
  onKies,
  gekozen,
}: Props) {
  const [allesTonen, setAllesTonen] = useState(false);

  const signalen = useMemo(
    () => bepaalSignalen(kubus, rijen, statistieken, instellingen),
    [kubus, rijen, statistieken, instellingen],
  );

  if (signalen.length === 0) return null;

  const lijst = allesTonen ? signalen : signalen.slice(0, ZICHTBAAR);

  return (
    <section
      aria-label="Signalen"
      className="kaart-omlijst rounded-panel border border-line bg-card shadow-subtle"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-3">
        <h2 className="font-sans-w7 text-cell font-semibold text-ink">Wat opvalt</h2>
        <p className="text-meta text-ink-faint">
          De laatste dagen van deze periode vergeleken met de dagen ervoor
        </p>
      </header>

      <ul className="divide-y divide-line-soft">
        {lijst.map((signaal) => (
          <li key={signaal.id}>
            <SignaalRegel
              signaal={signaal}
              actief={gekozen.includes(signaal.onderwerp)}
              onKies={() => {
                const alGekozen = gekozen.length === 1 && gekozen[0] === signaal.onderwerp;
                onKies(instellingen.dimensie, alGekozen ? [] : [signaal.onderwerp]);
              }}
            />
          </li>
        ))}
      </ul>

      {signalen.length > ZICHTBAAR && (
        <div className="border-t border-line-soft px-5 py-2">
          <button
            type="button"
            onClick={() => setAllesTonen((v) => !v)}
            className="text-sm font-medium text-primary hover:underline"
          >
            {allesTonen
              ? "Toon alleen de vier grootste"
              : `Toon alle ${signalen.length} signalen`}
          </button>
        </div>
      )}
    </section>
  );
}

function SignaalRegel({
  signaal,
  actief,
  onKies,
}: {
  signaal: Signaal;
  actief: boolean;
  onKies: () => void;
}) {
  const kleur =
    signaal.ernst === "let-op"
      ? "text-negative"
      : signaal.ernst === "goed"
        ? "text-positive"
        : "text-ink-faint";

  return (
    <button
      type="button"
      onClick={onKies}
      aria-pressed={actief}
      title={
        actief
          ? "Klik om het filter weer los te laten"
          : `Filter de hele pagina op ${signaal.onderwerp}`
      }
      className={`flex w-full items-start gap-3 px-5 py-2.5 text-left transition-colors duration-[var(--duur-snel)] ${
        actief ? "bg-primary-light" : "hover:bg-surface"
      }`}
    >
      {/* De pijl zegt welke kant het cijfer op ging, de kleur of dat goed of slecht is.
          Die twee vallen niet samen: dalende kosten per lead is een pijl omlaag in groen. */}
      <span className={`mt-0.5 shrink-0 ${kleur}`} aria-hidden="true">
        {signaal.richting === "omlaag" ? (
          <IconArrowDown className="h-4 w-4" />
        ) : signaal.richting === "omhoog" ? (
          <IconArrowUp className="h-4 w-4" />
        ) : (
          <IconInfo className="h-4 w-4" />
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-ink">{signaal.onderwerp}</span>
        <span className="block text-meta text-ink-muted">{signaal.tekst}</span>
      </span>
    </button>
  );
}

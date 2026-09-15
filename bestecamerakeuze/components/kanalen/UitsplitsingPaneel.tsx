"use client";

import { useMemo } from "react";
import ProgressBar from "@/components/ProgressBar";
import { formatteer } from "@/components/chat/chartTheme";
import { eenheidVan } from "@/lib/kanalen/eenheid";
import { groepeer, telOp, waardeVan, type Kubus } from "@/lib/kanalen/kubus";
import type { Statistiek } from "@/lib/windsor/velden";

/**
 * Eén regel uit een tabel, uitgesplitst naar de dimensies die de kubus verder nog kent.
 *
 * **Waarom dit er is.** De tabel Landingspagina's beantwoordt "hoeveel mensen stapten hier
 * binnen". De vraag die daar altijd achteraan komt is "en via welk kanaal dan?" — en dat
 * staat gewoon in dezelfde kubus, alleen niet in dezelfde tabel. Een kolom erbij zou niet
 * werken (dan krijg je een regel per pagina × kanaal en is de tabel onleesbaar), een
 * globaal filter ook niet (dat zou de rest van het scherm niet meenemen). Dit paneel doet
 * het derde: dezelfde rijen, één keer anders gegroepeerd, in een zijbalk.
 *
 * **Er komt geen cijfer bij.** Alles hier is een hergroepering van de rijen die de tabel
 * al toonde, met dezelfde `telOp` en dezelfde afgeleide-berekening. De totalen bovenaan
 * zijn per definitie gelijk aan de regel waarop je klikte, en de uitsplitsingen tellen
 * daar exact naar op. Haal hier dus nooit iets apart op — dan zou dit een tweede waarheid
 * worden over een getal dat er al staat.
 *
 * **Het volgt de actieve filters.** De rijen die binnenkomen zijn de al gefilterde rijen
 * van de tabel, niet de hele kubus. Staat er een filter op "Paid Search", dan gaat dit
 * paneel ook alleen over Paid Search — anders zou de zijbalk een ander totaal tonen dan
 * de regel waar hij uit voortkwam.
 */

type Props = {
  kubus: Kubus;
  /** De al gefilterde rijen van de tabel; zie de toelichting hierboven. */
  rijen: number[][];
  /** Op welke dimensie de tabel groepeerde. */
  groepeerOp: string;
  /** De waarde waarop geklikt is. */
  sleutel: string;
  /** Waarnaar we uitsplitsen, in volgorde van belangrijkheid. */
  dimensies: { id: string; label: string }[];
  statistieken: Statistiek[];
};

/** Hoeveel regels een uitsplitsing hoogstens toont; de rest gaat op één "overig"-regel. */
const MAX_REGELS = 8;

export default function UitsplitsingPaneel({
  kubus,
  rijen,
  groepeerOp,
  sleutel,
  dimensies,
  statistieken,
}: Props) {
  // De rijen van deze ene waarde. Op index vergelijken en niet op tekst: de rijen dragen
  // indexen, en dat is ook meteen goedkoper.
  const eigenRijen = useMemo(() => {
    const kolom = kubus.dimensies.indexOf(groepeerOp);
    if (kolom === -1) return [];
    const index = (kubus.labels[groepeerOp] ?? []).indexOf(sleutel);
    if (index === -1) return [];
    return rijen.filter((rij) => rij[kolom] === index);
  }, [kubus, rijen, groepeerOp, sleutel]);

  const totalen = useMemo(() => telOp(kubus, eigenRijen), [kubus, eigenRijen]);

  // De vier kerncijfers van deze regel. Dezelfde `standaard`-lijst als de tabel, zodat de
  // getallen hier herkenbaar zijn als die uit de kolommen ernaast.
  const kerncijfers = useMemo(
    () => statistieken.filter((s) => s.standaard).slice(0, 4),
    [statistieken],
  );

  // Waarop we de uitsplitsingen sorteren en de verhoudingsbalk tekenen: het eerste
  // optelbare kerncijfer. Een afgeleide (een percentage) deugt daar niet voor — 8% van
  // een aandeel is geen aandeel van 8%.
  const maatstaf = useMemo(
    () => statistieken.find((s) => s.standaard && !s.afgeleid) ?? statistieken[0],
    [statistieken],
  );

  const uitsplitsingen = useMemo(
    () =>
      dimensies
        .filter((d) => kubus.dimensies.includes(d.id) && d.id !== groepeerOp)
        .map((d) => ({
          ...d,
          groepen: groepeer(kubus, eigenRijen, d.id)
            .sort((a, b) => (b.totalen[maatstaf?.id ?? ""] ?? 0) - (a.totalen[maatstaf?.id ?? ""] ?? 0)),
        })),
    [dimensies, kubus, eigenRijen, groepeerOp, maatstaf],
  );

  if (eigenRijen.length === 0) {
    return (
      <p className="text-meta text-ink-muted">
        Geen regels meer in deze selectie — waarschijnlijk is er een filter veranderd sinds
        je hem opende.
      </p>
    );
  }

  const noemer = maatstaf ? (totalen[maatstaf.id] ?? 0) : 0;

  return (
    <div className="flex flex-col gap-6">
      <section>
        {/* De volledige waarde, want in de kop van de zijbalk staat hij afgekapt — en juist
            bij een pagina-pad zit het onderscheidende deel achteraan. */}
        <p className="break-all text-sm text-ink">{sleutel}</p>
        <h3 className="label-theme mt-4 text-label text-ink-faint">Totaal</h3>
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3">
          {kerncijfers.map((statistiek) => (
            <div key={statistiek.id}>
              <dt className="text-meta text-ink-muted">{statistiek.label}</dt>
              <dd className="font-sans-w7 text-cell font-semibold text-ink">
                {formatteer(waardeVan(statistiek, totalen), eenheidVan(statistiek))}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {uitsplitsingen.map((uitsplitsing) => (
        <section key={uitsplitsing.id}>
          <h3 className="label-theme text-label text-ink-faint">{uitsplitsing.label}</h3>
          {uitsplitsing.groepen.length === 0 ? (
            <p className="mt-2 text-meta text-ink-muted">Niets te tonen.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2.5">
              {samengevat(uitsplitsing.groepen).map((groep) => {
                const waarde = maatstaf ? (groep.totalen[maatstaf.id] ?? 0) : 0;
                return (
                  <li key={groep.sleutel}>
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate text-sm text-ink" title={groep.label}>
                        {groep.label}
                      </span>
                      <span className="shrink-0 font-sans-w7 text-sm font-semibold text-ink">
                        {maatstaf
                          ? formatteer(waardeVan(maatstaf, groep.totalen), eenheidVan(maatstaf))
                          : "—"}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <ProgressBar
                        percent={noemer > 0 ? (waarde / noemer) * 100 : 0}
                        className="h-1 flex-1"
                      />
                      <span className="w-10 shrink-0 text-right text-meta text-ink-faint">
                        {noemer > 0 ? `${Math.round((waarde / noemer) * 100)}%` : "—"}
                      </span>
                    </div>
                    {/* De overige kerncijfers als één regel eronder: bij een landingspagina
                        is "hoeveel instappen" zelden genoeg — je wilt er meteen bij zien of
                        er ook iets van terechtkwam. */}
                    <p className="mt-1 text-meta text-ink-muted">
                      {kerncijfers
                        .filter((s) => s.id !== maatstaf?.id)
                        .map(
                          (s) =>
                            `${s.label.toLowerCase()} ${formatteer(
                              waardeVan(s, groep.totalen),
                              eenheidVan(s),
                            )}`,
                        )
                        .join(" · ")}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

/**
 * Houdt de grootste regels over en vat de staart samen tot één "overig".
 *
 * Bewust samenvatten en niet afkappen: een lijst die stilletjes stopt bij acht suggereert
 * dat er niet meer is, en dan tellen de percentages ook niet meer op tot honderd. Bij acht
 * of minder gebeurt er niets.
 */
function samengevat<T extends { sleutel: string; label: string; totalen: Record<string, number> }>(
  groepen: T[],
): { sleutel: string; label: string; totalen: Record<string, number> }[] {
  if (groepen.length <= MAX_REGELS) return groepen;

  const staart = groepen.slice(MAX_REGELS - 1);
  const totalen: Record<string, number> = {};
  for (const groep of staart) {
    for (const [kolom, waarde] of Object.entries(groep.totalen)) {
      totalen[kolom] = (totalen[kolom] ?? 0) + waarde;
    }
  }
  return [
    ...groepen.slice(0, MAX_REGELS - 1),
    { sleutel: "__overig", label: `Overige ${staart.length}`, totalen },
  ];
}

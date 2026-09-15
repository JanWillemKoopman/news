"use client";

import { useEffect, useRef, useState } from "react";

/**
 * De laadbalk op de bovenrand van de balk boven elke Kanalen-pagina.
 *
 * Een periode wisselen haalt een nieuwe kubus op, en dat duurt bij twaalf maanden een
 * paar seconden. Tot nu toe was het enige teken daarvan het woord "Laden…" in de
 * filterbalk: de cijfers die er al stonden bleven staan, en je wist niet of je naar de
 * oude of de nieuwe periode keek. Een balk die duidelijk beweegt zegt in één oogopslag
 * dát er gewerkt wordt — en houdt, doordat hij in de plakkende balk zit, dat antwoord
 * ook in beeld als je ondertussen naar beneden scrollt.
 *
 * Hij ligt absoluut op de bovenrand en duwt dus niets opzij: de filterbalk mag niet
 * verspringen op het moment dat er data onderweg is. De beweging zelf staat in
 * `globals.css` (`.laadbalk*`), zodat hij de merkcurve en de merkkleur volgt.
 */

/**
 * Pas tonen als het ophalen langer duurt dan dit.
 *
 * Een antwoord uit de browsercache is er binnen enkele tientallen milliseconden, en een
 * balk die in die tijd aan- en uitknippert leest als een storing in plaats van als
 * werk. Onder deze drempel verschijnt er dus niets.
 */
const DREMPEL_MS = 140;

/**
 * En zodra hij er staat: minstens zo lang laten staan.
 *
 * Zonder deze ondergrens verdwijnt een balk die net op de drempel verschijnt alsnog
 * direct weer — dezelfde knipper, alleen iets later.
 */
const MINIMUM_MS = 450;

export default function Laadbalk({ actief }: { actief: boolean }) {
  const zichtbaar = useVertraagdZichtbaar(actief);

  if (!zichtbaar) return null;

  return (
    <div
      className="laadbalk pointer-events-none absolute inset-x-0 top-0 h-[3px] overflow-hidden rounded-t-panel"
      // De filterbalk ernaast zegt in tekst al "Laden…"; een screenreader hoeft dat niet
      // twee keer te horen, dus deze balk is puur beeld.
      aria-hidden="true"
    >
      <span className="laadbalk-segment laadbalk-kop absolute inset-0" />
      <span className="laadbalk-segment laadbalk-staart absolute inset-0" />
    </div>
  );
}

/** `actief`, maar met de drempel en de ondergrens hierboven eromheen. */
function useVertraagdZichtbaar(actief: boolean): boolean {
  const [zichtbaar, setZichtbaar] = useState(false);
  const getoondOp = useRef<number | null>(null);

  useEffect(() => {
    if (actief) {
      const timer = setTimeout(() => {
        getoondOp.current = Date.now();
        setZichtbaar(true);
      }, DREMPEL_MS);
      // Is het ophalen binnen de drempel klaar, dan wordt deze timer opgeruimd voordat
      // hij afgaat en is de balk er nooit geweest.
      return () => clearTimeout(timer);
    }

    const rest = MINIMUM_MS - (Date.now() - (getoondOp.current ?? 0));
    if (rest <= 0) {
      setZichtbaar(false);
      return;
    }
    const timer = setTimeout(() => setZichtbaar(false), rest);
    return () => clearTimeout(timer);
  }, [actief]);

  return zichtbaar;
}

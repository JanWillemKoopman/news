import { IconArrowDown, IconArrowUp } from "@/components/icons";
import type { Verschil } from "@/lib/kanalen/vergelijk";
import { verschilTekst } from "@/lib/kanalen/vergelijk";

/**
 * Het verschil met de vorige periode, als gedempte regel onder een cijfer.
 *
 * Volgt hetzelfde patroon als de campagnetabel: de grote waarde is het cijfer, de kleine
 * regel eronder zegt hoe het zich verhoudt. Groen en rood zijn gedempt en zeggen
 * "gunstig" en niet "hoger" — bij kosten per klik is een daling het goede nieuws.
 * Statistieken waar een richting geen oordeel verdient (uitgaven, vertoningen, de
 * volgersstand) blijven neutraal grijs met alleen een pijl.
 */
export default function Verschilregel({
  verschil,
  compact = false,
}: {
  verschil: Verschil;
  compact?: boolean;
}) {
  const tekst = verschilTekst(verschil);
  if (!tekst) return null;

  const richting = verschil.relatief === null ? 0 : Math.sign(verschil.relatief);
  const kleur =
    verschil.gunstig === true
      ? "text-positive"
      : verschil.gunstig === false
        ? "text-negative"
        : "text-ink-faint";

  return (
    <span className={`inline-flex items-center gap-0.5 whitespace-nowrap text-meta ${kleur}`}>
      {richting > 0 && <IconArrowUp className="h-3 w-3 shrink-0" />}
      {richting < 0 && <IconArrowDown className="h-3 w-3 shrink-0" />}
      {compact && verschil.relatief !== null
        ? tekst.replace(" t.o.v. vorige periode", "")
        : tekst}
    </span>
  );
}

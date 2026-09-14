"use client";

import { formatteer } from "@/components/chat/chartTheme";
import { IconInfo } from "@/components/icons";

/**
 * Waar komen de leads en conversies op het dashboard vandaan?
 *
 * **Waarom dit blok bestaat.** De twee cijfers waar het weekoverleg op stuurt komen uit
 * twee verschillende werelden: een deel levert het platform kant-en-klaar, een deel stelt
 * het team hieronder zelf samen omdat het platform het niet heeft. Zolang je dat niet
 * naast elkaar ziet, is "1.354 leads" een getal dat je maar moet geloven — en dan gaat
 * niemand er in een overleg tegenin, ook niet als het niet klopt.
 *
 * **Waarom het een controle is en geen extra cijfer.** De kolom Totaal is exact wat de
 * kanaalpagina's al tonen; er komt hier geen derde waarheid bij. Waar we weten hoe het
 * platformgetal is opgebouwd, staan de onderdelen eronder en rekent de regel "niet
 * verklaard" na of ze optellen. Juist dát laatste getal is het nuttigst: bij Google is
 * het precies wat daar buiten "Opnemen in conversies" is gehouden, en gaat het bij Meta
 * ineens afwijken, dan is er iets veranderd aan de andere kant van de koppeling.
 */

export interface HerkomstOnderdeel {
  label: string;
  veld: string;
  aantal: number;
  herkomst: "platform" | "koppeltabel";
}

export interface HerkomstRegel {
  bron: string;
  vanPlatform: number;
  viaKoppeltabel: number;
  totaal: number;
  onderdelen: HerkomstOnderdeel[];
  onverklaard: number | null;
}

export interface Herkomst {
  dagen: number;
  leads: HerkomstRegel[];
  conversies: HerkomstRegel[];
}

const BRON_LABEL: Record<string, string> = {
  meta: "Meta",
  google: "Google",
  linkedin: "LinkedIn",
};

/** Hoeveel onderdelen we uitklappen voordat de rest op één regel wordt samengevat. */
const MAX_ONDERDELEN = 6;

export default function HerkomstPaneel({ herkomst }: { herkomst: Herkomst | null }) {
  if (!herkomst) return null;

  return (
    <section className="kaart-omlijst mt-8 rounded-panel border border-line bg-card shadow-subtle">
      <header className="border-b border-line px-5 py-4">
        <h2 className="font-sans-w7 text-cell font-semibold text-ink">
          Waar komen leads en conversies vandaan?
        </h2>
        <p className="mt-0.5 text-meta text-ink-muted">
          De laatste {herkomst.dagen} dagen · wat het platform zelf levert, en wat hieronder
          is aangewezen
        </p>
      </header>

      <p className="flex items-start gap-2 border-b border-line-soft px-5 py-3 text-meta text-ink-muted">
        <IconInfo className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Dit is geen extra cijfer: de kolom Totaal is wat de kanaalpagina&apos;s tonen. Het
          staat hier uit elkaar getrokken zodat je kunt zien waar het vandaan komt — en of
          de onderdelen nog optellen tot wat het platform zegt.
        </span>
      </p>

      <Blok titel="Leads" regels={herkomst.leads} />
      <Blok titel="Conversies" regels={herkomst.conversies} />
    </section>
  );
}

function Blok({ titel, regels }: { titel: string; regels: HerkomstRegel[] }) {
  // Een platform dat in deze periode niets deed én niets aangewezen heeft staan, voegt
  // alleen een rij met nullen toe.
  const zichtbaar = regels.filter((r) => r.totaal !== 0 || r.onderdelen.length > 0);
  if (zichtbaar.length === 0) return null;

  return (
    <div className="border-b border-line-soft last:border-b-0">
      <h3 className="label-theme px-5 pb-1 pt-4 text-label text-ink-faint">{titel}</h3>
      <table className="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            {["Platform", "Van het platform", "Via de koppeltabel", "Totaal"].map((kop, i) => (
              <th
                key={kop}
                className={`whitespace-nowrap px-4 py-1.5 ${i === 0 ? "text-left" : "text-right"}`}
              >
                <span className="label-theme text-label text-ink-faint">{kop}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {zichtbaar.map((regel) => (
            <PlatformRegel key={regel.bron} regel={regel} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PlatformRegel({ regel }: { regel: HerkomstRegel }) {
  const getoond = regel.onderdelen.slice(0, MAX_ONDERDELEN);
  const rest = regel.onderdelen.slice(MAX_ONDERDELEN);
  const restSom = rest.reduce((t, o) => t + o.aantal, 0);

  return (
    <>
      <tr>
        <td className="whitespace-nowrap px-4 py-2 font-sans-w7 font-semibold text-ink">
          {BRON_LABEL[regel.bron] ?? regel.bron}
        </td>
        <td className="whitespace-nowrap px-4 py-2 text-right text-ink">
          {formatteer(regel.vanPlatform, "aantal")}
        </td>
        <td className="whitespace-nowrap px-4 py-2 text-right text-ink">
          {regel.viaKoppeltabel === 0 ? (
            <span className="text-ink-faint" title="Er is hier nog niets aangewezen.">
              —
            </span>
          ) : (
            formatteer(regel.viaKoppeltabel, "aantal")
          )}
        </td>
        <td className="whitespace-nowrap px-4 py-2 text-right font-sans-w7 font-semibold text-ink">
          {formatteer(regel.totaal, "aantal")}
        </td>
      </tr>

      {getoond.map((onderdeel) => (
        <tr key={onderdeel.veld}>
          <td colSpan={2} className="py-1 pl-9 pr-4 text-meta text-ink-muted" title={onderdeel.veld}>
            {onderdeel.label}
            {onderdeel.herkomst === "koppeltabel" && (
              <span className="ml-2 text-ink-faint">aangewezen</span>
            )}
          </td>
          <td colSpan={2} className="px-4 py-1 text-right text-meta text-ink-muted">
            {formatteer(onderdeel.aantal, "aantal")}
          </td>
        </tr>
      ))}

      {rest.length > 0 && (
        <tr>
          <td colSpan={2} className="py-1 pl-9 pr-4 text-meta text-ink-faint">
            en {rest.length} andere acties
          </td>
          <td colSpan={2} className="px-4 py-1 text-right text-meta text-ink-faint">
            {formatteer(restSom, "aantal")}
          </td>
        </tr>
      )}

      {/*
        Alleen tonen als er ook echt een uitsplitsing boven staat. Nul is hier goed nieuws
        en hoort er dus ook te staan: "we kunnen het hele getal verklaren" is precies wat
        dit blok moet kunnen zeggen.
      */}
      {regel.onverklaard !== null && (
        <tr>
          <td colSpan={2} className="pb-2 pl-9 pr-4 pt-1 text-meta text-ink-faint">
            {regel.onverklaard === 0
              ? "De onderdelen tellen precies op tot het platformgetal."
              : regel.onverklaard > 0
                ? "Zit in het platformgetal maar niet in de onderdelen hierboven"
                : "Zit in de onderdelen maar niet in het platformgetal"}
          </td>
          <td colSpan={2} className="px-4 pb-2 pt-1 text-right text-meta text-ink-faint">
            {regel.onverklaard === 0 ? "✓" : formatteer(Math.abs(regel.onverklaard), "aantal")}
          </td>
        </tr>
      )}
    </>
  );
}

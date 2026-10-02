"use client";

import { useState } from "react";
import { IconInfo } from "@/components/icons";
import Modal from "@/components/Modal";

/**
 * De i-knop rechtsboven op het tabblad Landingspagina, met een pop-up die in gewone taal
 * uitlegt hoe een pagina wordt beoordeeld en waar de cijfers vandaan komen. Houd deze
 * tekst in lijn met de prompt (lib/landingspaginaPrompt.ts) en de criteria
 * (lib/landingspaginaCriteria.ts): verandert daar iets, dan hier ook.
 *
 * De knop staat `fixed`, op dezelfde plek als het lampje op de Kanalen-pagina's. Omdat het
 * tabpaneel in AppShell `hidden` is als een ander tabblad openstaat, verschijnt hij alleen
 * op dit tabblad.
 */

const CRITERIA_UITLEG: [string, string, string][] = [
  [
    "Doel & doelgroep",
    "Doet de pagina waarvoor de campagne bedoeld is, voor de bezoeker die er komt? Is er één duidelijk hoofddoel?",
    "De keuze wat de pagina moet opleveren en voor wie",
  ],
  [
    "Eerste scherm",
    "Weet de bezoeker voordat hij scrolt wat er wordt aangeboden en wat hij kan doen?",
    "Kop, introtekst, beeld en knop bovenaan",
  ],
  [
    "Informatie & bezwaren",
    "Staat alles erop wat de bezoeker nodig heeft om de actie te nemen, is het makkelijk te vinden, en worden twijfels weggenomen?",
    "Teksten, voorwaarden, praktische gegevens, FAQ",
  ],
  [
    "Duidelijkheid & consistentie",
    "Is wat er staat eenduidig en concreet, en zegt de pagina overal hetzelfde?",
    "Woordkeuze, knopteksten, formuliertitel, voorwaarden bij claims",
  ],
  [
    "Focus & opbouw",
    "Blijft de pagina bij het doel, in een logische volgorde, zonder blokken die afleiden?",
    "Welke blokken erop staan en in welke volgorde",
  ],
  [
    "Actie & formulier",
    "Is duidelijk wat de bezoeker moet doen, is dat makkelijk, en past het formulier bij precies deze actie?",
    "Knoppen, formuliervelden, tekst rond het formulier",
  ],
  [
    "Beeld",
    "Helpen de gekozen beelden de bezoeker de campagne te begrijpen, of nemen ze vooral ruimte in?",
    "Gekozen foto's, galerijen, alt-teksten",
  ],
];

function Sectie({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-line-soft py-5 first:pt-1 last:border-b-0 last:pb-1">
      <h3 className="mb-2 font-sans-w7 text-sm font-semibold text-ink">{titel}</h3>
      <div className="space-y-2 text-sm leading-relaxed text-ink-muted">{children}</div>
    </section>
  );
}

function Lijst({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc space-y-1 pl-5 marker:text-ink-faint">{children}</ul>;
}

/** Vetgedrukt woord in de lopende tekst. */
function B({ children }: { children: React.ReactNode }) {
  return <strong className="font-medium text-ink">{children}</strong>;
}

export default function BeoordelingUitleg() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Hoe wordt een pagina beoordeeld?"
        title="Hoe wordt een pagina beoordeeld?"
        className="fixed right-16 top-4 z-50 flex h-9 w-9 items-center justify-center text-ink-muted transition-colors duration-[var(--duur-snel)] hover:text-ink"
      >
        <IconInfo className="h-[18px] w-[18px]" />
      </button>

      {open && (
        <Modal title="Hoe wordt een landingspagina beoordeeld?" onClose={() => setOpen(false)} breed>
          <Sectie titel="In het kort">
            <p>
              Een AI-model (ChatGPT, model GPT-6 Sol) bekijkt de pagina zoals een ervaren
              specialist in campagnepagina&apos;s dat zou doen, en tegelijk door de ogen van de
              bezoeker die via de campagne binnenkomt. Het geeft per onderdeel een cijfer met
              uitleg, een eindcijfer en vijf concrete verbeterpunten.
            </p>
            <p>
              Het uitgangspunt: <B>een campagnepagina heeft één taak.</B> Er komt één groep
              bezoekers binnen met één aanleiding, en de pagina moet die bezoeker geven wat hij
              nodig heeft en hem naar één actie leiden. Alles wordt beoordeeld vanuit dat doel
              en die bezoeker. Een blok dat op zichzelf mooi is maar niets doet voor dat doel,
              telt daarom als minpunt.
            </p>
          </Sectie>

          <Sectie titel="Wat de analyse krijgt">
            <Lijst>
              <li>
                <B>De URL.</B> De pagina wordt opgehaald en uitgelezen: koppen, teksten, knoppen,
                links, formuliervelden en alt-teksten van afbeeldingen.
              </li>
              <li>
                <B>Waar de bezoekers vandaan komen.</B> Een bestaande klant die uit een e-mail
                komt, weet al veel meer dan iemand die op een advertentie klikte. Dat bepaalt
                wat de pagina nog moet vertellen.
              </li>
              <li>
                <B>Doel en doelgroep</B> (optioneel, maar sterk aangeraden). Hoe preciezer je
                beschrijft wat de pagina moet opleveren en voor wie, hoe beter het oordeel. Laat
                je het leeg, dan leidt het model het doel af uit de pagina en zegt het dat erbij.
              </li>
              <li>
                <B>Een screenshot</B> (optioneel, maar sterk aangeraden). Zonder screenshot ziet
                het model alleen tekst: geen opmaak, geen foto&apos;s en niet wat er zonder
                scrollen in beeld staat. Met screenshot is die leidend voor alles wat de
                bezoeker ziet.
              </li>
            </Lijst>
            <p>
              De e-mail of advertentie waarmee de bezoeker binnenkomt, krijgt het model níet.
              Of de pagina daarop aansluit, wordt dus ook niet beoordeeld.
            </p>
          </Sectie>

          <Sectie titel="Wat wel en niet wordt beoordeeld">
            <p>
              Alleen wat jij als content marketeer in het CMS kunt aanpassen: alles tússen de
              header en de footer. Teksten, koppen, de keuze en volgorde van blokken, knoppen,
              formulieren, FAQ, voorwaarden, beeldkeuze en alt-teksten.
            </p>
            <p>
              <B>Niet beoordeeld:</B> de header, het menu, de footer, vaste onderdelen zoals de
              cookiebanner en chat, het designtemplate (lettertypes, kleuren, vormgeving van
              componenten) en techniek (laadsnelheid, tracking, SEO). Daar kun je niets aan
              doen, dus daar gaat ook geen punt voor af. Title en meta-description worden soms
              genoemd, maar tellen niet mee in de cijfers.
            </p>
          </Sectie>

          <Sectie titel="Hoe de analyse te werk gaat">
            <p>Het model werkt in vier stappen, in deze volgorde:</p>
            <ol className="list-decimal space-y-1.5 pl-5 marker:text-ink-faint">
              <li>
                <B>De campagne begrijpen.</B> Wat voor campagne is dit, welke ene actie moet de
                pagina opleveren, wie is de bezoeker, wat weet die al, en welke informatie heeft
                die nodig om de actie met vertrouwen te nemen? Die lijst stelt het model per
                campagne zelf op, niet uit een standaardlijstje. Je ziet hem terug in het
                rapport onder &ldquo;Informatie &amp; bezwaren&rdquo;.
              </li>
              <li>
                <B>De weging bepalen.</B> Niet elk onderdeel is bij elke campagne even
                belangrijk. Bij een uitnodiging voor een evenement draait het om praktische
                informatie en een kloppend aanmeldformulier; bij een prijsactie wegen de
                voorwaarden zwaarder. Het model verdeelt daarom per campagne 100 procent over
                de zeven criteria en legt uit waarom.
              </li>
              <li>
                <B>De pagina blok voor blok doorlopen.</B> Elk contentblok krijgt een oordeel:
                kern, aanpassen of overbodig. De vraag daarbij: zou deze bezoeker iets missen
                als dit blok weg was?
              </li>
              <li>
                <B>De criteria beoordelen</B> en tot een eindcijfer en verbeterpunten komen.
              </li>
            </ol>
          </Sectie>

          <Sectie titel="De zeven criteria">
            <p>
              Elk criterium hoort bij iets wat je zelf kunt aanpassen. De namen liggen vast,
              zodat je rapporten van verschillende pagina&apos;s naast elkaar kunt leggen; hoe
              zwaar ze wegen, verschilt per campagne.
            </p>
            <table className="mt-2 w-full text-left text-sm">
              <thead>
                <tr className="text-label text-ink-faint">
                  <th className="label-theme w-44 pb-2 pr-4 font-normal">Criterium</th>
                  <th className="label-theme pb-2 pr-4 font-normal">De vraag</th>
                  <th className="label-theme w-48 pb-2 font-normal">Wat je aanpast</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft border-t border-line-soft align-top">
                {CRITERIA_UITLEG.map(([naam, vraag, aanpassen]) => (
                  <tr key={naam}>
                    <td className="py-2 pr-4 font-medium text-ink">{naam}</td>
                    <td className="py-2 pr-4">{vraag}</td>
                    <td className="py-2">{aanpassen}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Sectie>

          <Sectie titel="Hoe de cijfers worden gegeven">
            <p>Elk criterium krijgt een heel cijfer van 0 tot en met 10, net als op school:</p>
            <Lijst>
              <li>
                <B>0–3 zeer zwak:</B> ontbreekt grotendeels of werkt de campagne tegen.
              </li>
              <li>
                <B>4–5 onvoldoende:</B> wel aanwezig, maar met problemen die de bezoeker hinderen.
              </li>
              <li>
                <B>6 voldoende:</B> het werkt, maar er valt duidelijk iets te verbeteren.
              </li>
              <li>
                <B>7–8 goed:</B> professioneel uitgewerkt, nog kleine verbeterpunten.
              </li>
              <li>
                <B>9–10 zeer goed tot uitmuntend:</B> alleen als daar echt aanleiding voor is.
              </li>
            </Lijst>
            <p>
              Twee onderdelen tellen extra zwaar door in de cijfers.{" "}
              <B>Informatie die ontbreekt of verstopt staat</B> (bijvoorbeeld alleen in een
              carrousel of in de kleine lettertjes) drukt het cijfer voor Informatie &amp;
              bezwaren. En <B>overbodige blokken</B> zijn een echte fout bij Focus &amp; opbouw,
              geen schoonheidsfoutje: ze maken de weg naar de actie langer en verdunnen de
              boodschap.
            </p>
          </Sectie>

          <Sectie titel="Hoe het eindcijfer tot stand komt">
            <p>
              Het eindcijfer (met één decimaal) is <B>geen rekensom</B>, maar het
              eindoordeel van het model: welk cijfer verdient deze pagina, gegeven het doel van
              de campagne? De weging per criterium is daarbij de leidraad.
            </p>
            <p>
              Daardoor is het eindcijfer niet altijd precies het gewogen gemiddelde van de
              criteria. Dat is bewust: een probleem dat de actie zelf onderuithaalt (bijvoorbeeld
              een formulier voor iets anders dan waartoe de pagina uitnodigt) weegt zwaarder dan
              een reeks kleine punten, ook als die kleine punten samen meer procenten hebben. Het
              model zegt in één zin bij het eindcijfer wat het cijfer het meest bepaalt.
            </p>
          </Sectie>

          <Sectie titel="Zo lees je het rapport">
            <Lijst>
              <li>
                <B>Bovenaan:</B> de pagina, het eindcijfer, en hoe het model de campagne begreep
                (soort campagne, de actie die de pagina moet opleveren, de bezoeker). Klopt dat
                beeld niet, dan klopt de rest ook minder. Vul dan het doel en de doelgroep in en
                analyseer opnieuw.
              </li>
              <li>
                <B>Links:</B> de conclusie als kort verhaal, en de top 5 verbeterpunten in de
                volgorde waarin je ze het beste kunt oppakken. Bij elk punt staat de verwachte
                impact op conversie en hoeveel werk het is in het CMS.
              </li>
              <li>
                <B>Rechts:</B> waarom de criteria bij deze campagne zo wegen, en per criterium
                het gewicht, het cijfer en een korte toelichting.
              </li>
              <li>
                Onder <B>Informatie &amp; bezwaren</B> staat wat de bezoeker nodig heeft:{" "}
                <span className="font-semibold text-positive">✓</span> duidelijk,{" "}
                <span className="font-semibold text-orange">?</span> onduidelijk of verstopt,{" "}
                <span className="font-semibold text-negative">✗</span> ontbreekt.
              </li>
              <li>
                Onder <B>Focus &amp; opbouw</B> staan alle blokken van boven naar beneden:{" "}
                <span className="text-ink">kern</span> (draagt bij aan het doel),{" "}
                <span className="text-orange">aanpassen</span> (hoort erbij, maar is te lang,
                staat verkeerd of verstopt informatie) en{" "}
                <span className="text-negative">overbodig</span> (doorgestreept: kan weg).
              </li>
              <li>
                <B>Kleuren:</B> een cijfer onder de 5,5 is rood, net als een onvoldoende op een
                rapport. De rest staat gewoon in zwart.
              </li>
            </Lijst>
          </Sectie>

          <Sectie titel="Goed om te weten">
            <Lijst>
              <li>
                Het is een oordeel van een AI-model, geen meting. Twee analyses van dezelfde
                pagina kunnen een half punt verschillen. Kijk vooral naar de onderbouwing en de
                verbeterpunten; die zijn stabieler dan het cijfer achter de komma.
              </li>
              <li>
                Het model mag niets verzinnen. Ontbreekt iets op de pagina, dan zegt het dat;
                kan het iets niet zien (bijvoorbeeld foto&apos;s zonder screenshot), dan zegt
                het dat ook.
              </li>
              <li>
                Opnieuw analyseren vervangt het oude rapport van die pagina. Doel, doelgroep en
                verkeersbron worden onthouden; de screenshot moet je opnieuw uploaden.
              </li>
              <li>
                Voor het eerlijkste oordeel: upload een screenshot van de volledige pagina,
                kies de juiste verkeersbron en beschrijf in een paar zinnen wat de pagina moet
                opleveren en voor wie.
              </li>
            </Lijst>
          </Sectie>
        </Modal>
      )}
    </>
  );
}

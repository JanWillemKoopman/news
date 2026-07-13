import * as React from 'react'

import type { FaqItem } from './PageInfoButton'

// Gedeelde inhoud voor de FAQ-informatieknoppen op de verschillende pagina's.
// Elke pagina levert een titel ("FAQ <pagina>"), een korte introductie met een
// "Zo begin je"-stappenplan, en een FAQ op volgorde van belangrijk naar minder
// belangrijk. Eén centrale plek houdt de pagina's zelf schoon en de toon
// consistent.
export interface PageInfo {
  titel: string
  intro: React.ReactNode
  faq: FaqItem[]
}

// ── Kleine bouwstenen voor consistente opmaak ──────────────────────────────

function Intro({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3">{children}</div>
}

function QuickStart({ stappen }: { stappen: React.ReactNode[] }) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 p-4">
      <p className="font-semibold text-foreground">Zo begin je</p>
      <ol className="mt-2 list-decimal space-y-1 pl-5">
        {stappen.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
    </div>
  )
}

// ── Overzicht (dashboard) ──────────────────────────────────────────────────
export const overzichtInfo: PageInfo = {
  titel: 'FAQ Overzicht',
  intro: (
    <Intro>
      <p>
        Het <strong>Overzicht</strong> is jullie startpunt. In één oogopslag zie
        je hoeveel dagen het nog is tot de grote dag, hoe ver jullie staan met de
        planning, wat er als eerste aandacht nodig heeft en wat eraan komt.
      </p>
      <p>
        Deze pagina combineert automatisch je gegevens uit alle onderdelen —
        taken, budget, gasten en leveranciers — tot een persoonlijk beeld van
        waar jullie nu staan.
      </p>
      <QuickStart
        stappen={[
          <>
            Stel jullie <strong>namen, trouwdatum en locatie</strong> in via{' '}
            <em>Bewerken</em> rechtsboven in de aftelkaart.
          </>,
          <>
            <strong>Nodig je partner uit</strong> om samen te plannen.
          </>,
          <>
            Volg de <strong>aandachtspunten</strong> en aanbevolen stappen naar
            beneden.
          </>,
        ]}
      />
    </Intro>
  ),
  faq: [
    {
      vraag: 'Hoe stel ik onze trouwdatum, namen en locatie in?',
      antwoord: (
        <p>
          Klik op <strong>Bewerken</strong> rechtsboven in de aftelkaart. Daar
          stel je ook jullie totaalbudget en het geschatte aantal dag- en
          avondgasten in.
        </p>
      ),
    },
    {
      vraag: 'Wat betekenen de blokken op deze pagina?',
      antwoord: (
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Aftelteller</strong> — het aantal dagen tot de bruiloft en de
            fase waarin jullie zitten.
          </li>
          <li>
            <strong>Aandachtspunten</strong> — zaken die nu mislopen of dreigen
            te blijven liggen.
          </li>
          <li>
            <strong>Aankomende acties</strong> — taken en betalingen op datum.
          </li>
          <li>
            <strong>Status per onderdeel</strong> — budget, gasten, taken en
            leveranciers in het kort.
          </li>
        </ul>
      ),
    },
    {
      vraag: 'Wat zijn de urgente aandachtspunten?',
      antwoord: (
        <p>
          Dat zijn zaken die de app automatisch signaleert, zoals achterstallige
          taken, gasten zonder reactie of betalingen die eraan komen. Het blok
          verschijnt alleen als er echt iets is om op te pakken.
        </p>
      ),
    },
    {
      vraag: 'Hoe nodig ik mijn partner uit om samen te plannen?',
      antwoord: (
        <p>
          Gebruik het blok <strong>Samen plannen</strong> op deze pagina, of ga
          naar <strong>Samen plannen</strong> in het menu. Je partner krijgt een
          uitnodigingslink en werkt daarna in dezelfde gegevens.
        </p>
      ),
    },
    {
      vraag: 'Waar vind ik alle onderdelen van de planner?',
      antwoord: (
        <p>
          Via het menu: <strong>Taken</strong>, <strong>Budget</strong>,{' '}
          <strong>Gastenlijst</strong>, <strong>Leveranciers</strong>,{' '}
          <strong>Draaiboek</strong>, <strong>Tafelschikking</strong>,{' '}
          <strong>Trouwwebsite</strong> en meer. Op mobiel zitten de minder
          gebruikte onderdelen achter <strong>Meer</strong>.
        </p>
      ),
    },
  ],
}

// ── Taken ──────────────────────────────────────────────────────────────────
export const takenInfo: PageInfo = {
  titel: 'FAQ Taken',
  intro: (
    <Intro>
      <p>
        De <strong>Taken</strong>-pagina is jullie gezamenlijke to-dolijst richting
        de trouwdag. Per taak houd je bij wát er moet gebeuren en wanneer, en je
        vinkt af wat klaar is.
      </p>
      <p>
        Taken zijn geordend per fase, zodat je altijd ziet wat nú aan de beurt is
        en niets over het hoofd ziet.
      </p>
      <QuickStart
        stappen={[
          <>
            Laat een lijst <strong>samenstellen</strong> met beproefde sjablonen.
          </>,
          <>
            Voeg zelf taken toe en zet er een <strong>datum</strong> bij.
          </>,
          <>
            <strong>Vink af</strong> wat klaar is en filter op wat nu telt.
          </>,
        ]}
      />
    </Intro>
  ),
  faq: [
    {
      vraag: 'Hoe stel ik snel een takenlijst samen?',
      antwoord: (
        <p>
          Gebruik <strong>Taken samenstellen</strong>. Je krijgt kaart voor kaart
          voorgestelde taken te zien op basis van een beproefd sjabloon; je
          accepteert of slaat ze over. Zo staat je lijst in een paar minuten.
        </p>
      ),
    },
    {
      vraag: 'Hoe voeg ik zelf een taak toe?',
      antwoord: (
        <p>
          Klik op <strong>Taak toevoegen</strong> (of de zwevende +-knop). Geef de
          taak een titel, een datum en eventueel een categorie.
        </p>
      ),
    },
    {
      vraag: 'Hoe markeer ik een taak als klaar?',
      antwoord: (
        <p>
          Vink het rondje voor de taak aan. De status wisselt tussen{' '}
          <strong>open</strong> en <strong>klaar</strong>; afgeronde taken blijven
          bewaard.
        </p>
      ),
    },
    {
      vraag: 'Hoe filter of zoek ik in mijn taken?',
      antwoord: (
        <p>
          Gebruik de filters bovenaan om te tonen op status, categorie of fase, en
          het zoekveld om snel een taak te vinden.
        </p>
      ),
    },
    {
      vraag: 'Kan ik meerdere taken tegelijk bijwerken?',
      antwoord: (
        <p>
          Ja. Selecteer meerdere taken via hun selectievakje en werk ze in één keer
          bij — bijvoorbeeld allemaal op <strong>klaar</strong> zetten of in één
          keer verwijderen.
        </p>
      ),
    },
  ],
}

// ── Budget ─────────────────────────────────────────────────────────────────
export const budgetInfo: PageInfo = {
  titel: 'FAQ Budget',
  intro: (
    <Intro>
      <p>
        De <strong>Budget</strong>-pagina is jullie financiële kompas voor de
        bruiloft. Per onderdeel leg je vast wat je verwacht uit te geven
        (<strong>geschat</strong>), wat een leverancier vraagt
        (<strong>offerte</strong>) en wat je al hebt <strong>betaald</strong>. Zo
        zie je in één oogopslag of je binnen jullie totaalbudget blijft, wat er nog
        op je afkomt en welke categorieën aandacht nodig hebben.
      </p>
      <p>
        Meer dan een lijstje: koppel je een leverancier, dan telt diens offerte
        automatisch mee. Met betaaltermijnen blijven deadlines in beeld.
      </p>
      <QuickStart
        stappen={[
          <>
            <strong>Stel je totaalbudget in</strong> — bovenin dit overzicht (via
            het potloodje), of via Overzicht → <em>Bewerken</em>.
          </>,
          <>
            <strong>Vul je categorieën</strong> — laat automatisch verdelen of voeg
            zelf items toe.
          </>,
          <>
            <strong>Houd het actueel</strong> — vul offertes en betalingen in en
            koppel je leveranciers.
          </>,
        ]}
      />
    </Intro>
  ),
  faq: [
    {
      vraag: 'Hoe begin ik met mijn budget?',
      antwoord: (
        <p>
          Stel eerst jullie <strong>totaalbudget</strong> in via het potloodje
          bovenin deze pagina (of op de <strong>Overzicht</strong>-pagina via{' '}
          <em>Bewerken</em>). Vul daarna je categorieën: laat het budget
          automatisch verdelen met{' '}
          <strong>Verdeel budget</strong> of voeg zelf items toe met{' '}
          <strong>Budgetitem toevoegen</strong>. Werk het vervolgens bij naarmate
          je offertes ontvangt en betalingen doet.
        </p>
      ),
    },
    {
      vraag: 'Wat betekenen geschat, offerte en betaald?',
      antwoord: (
        <>
          <p>Elk budgetitem werkt met drie bedragen:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>
              <strong>Geschat</strong> — jouw eigen inschatting van de kosten, vaak
              nog voordat je offertes hebt.
            </li>
            <li>
              <strong>Offerte</strong> — wat een leverancier daadwerkelijk vraagt.
            </li>
            <li>
              <strong>Betaald</strong> — wat je al hebt overgemaakt.
            </li>
          </ul>
          <p className="mt-2">
            In het overzicht per post zie je deze samengevoegd als{' '}
            <strong>verwacht</strong> (de offerte als die er is, anders de
            schatting) en <strong>nog te betalen</strong> (verwacht min
            betaald).
          </p>
        </>
      ),
    },
    {
      vraag: 'Hoe voeg ik een budgetitem toe?',
      antwoord: (
        <p>
          Klik rechtsboven op <strong>Budgetitem toevoegen</strong> (of op de
          zwevende +-knop). Kies een categorie, geef een omschrijving en vul het
          geschatte bedrag in. Een offerte, betaling of leverancier voeg je toe
          onder <strong>Meer details</strong>.
        </p>
      ),
    },
    {
      vraag: 'Wat betekenen de bedragen in het overzicht bovenaan?',
      antwoord: (
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Voortgang</strong> — hoeveel je van het totaalbudget al hebt
            betaald.
          </li>
          <li>
            <strong>Geschat</strong> — alles wat je samen verwacht uit te geven.
          </li>
          <li>
            <strong>Nog te betalen</strong> — het geschatte bedrag min wat je al
            betaald hebt.
          </li>
          <li>
            <strong>Budget over</strong> — wat er over is binnen jullie
            totaalbudget. Kleurt dit oranje (<em>boven budget</em>), dan ligt de
            schatting hoger dan het totaalbudget.
          </li>
        </ul>
      ),
    },
    {
      vraag: 'Hoe verdeel ik mijn budget automatisch over categorieën?',
      antwoord: (
        <p>
          Gebruik <strong>Verdeel budget</strong> via het <strong>···</strong>
          -menu. Je totaalbudget wordt dan als richtbedrag verdeeld over de
          gebruikelijke categorieën, op basis van een standaardverdeling. Elk
          bedrag kun je daarna nog aanpassen.
        </p>
      ),
    },
    {
      vraag: 'Hoe koppel ik een leverancier aan een budgetitem?',
      antwoord: (
        <p>
          Open een budgetitem en vouw <strong>Meer details</strong> uit. Kies daar
          bij <strong>Gekoppelde leverancier</strong> de juiste partij. Staat die
          op <em>geboekt</em>, dan telt diens offertebedrag automatisch mee — je
          hoeft het dus niet dubbel in te vullen.
        </p>
      ),
    },
    {
      vraag: 'Hoe houd ik betalingen en termijnen bij?',
      antwoord: (
        <p>
          Bij een budgetitem voeg je <strong>betaaltermijnen</strong> toe (bedrag +
          vervaldatum), bijvoorbeeld een aanbetaling en een restbedrag. Vink een
          termijn af zodra die betaald is; het betaalde bedrag en de voortgang
          worden automatisch bijgewerkt.
        </p>
      ),
    },
    {
      vraag: 'Hoe exporteer ik mijn budget?',
      antwoord: (
        <p>
          Via het <strong>···</strong>-menu kies je{' '}
          <strong>Exporteer budget</strong>. Je downloadt een CSV-bestand dat je
          bijvoorbeeld in Excel of Google Sheets kunt openen.
        </p>
      ),
    },
  ],
}

// ── Mijn lijst ─────────────────────────────────────────────────────────────
export const leveranciersInfo: PageInfo = {
  titel: 'FAQ Leveranciers',
  intro: (
    <Intro>
      <p>
        Op <strong>Mijn lijst</strong> beheer je alle partijen voor jullie
        dag — van locatie en catering tot fotograaf en band. Je houdt per
        leverancier de status bij (van oriëntatie tot geboekt), het offertebedrag
        en de contactgegevens, en je bewaart er de offertes en contracten als
        documenten.
      </p>
      <p>
        Geboekte bedragen kun je koppelen aan je budget, zodat je financiële
        overzicht automatisch klopt.
      </p>
      <QuickStart
        stappen={[
          <>
            <strong>Ontdek</strong> leveranciers in de directory, of voeg er zelf
            één toe.
          </>,
          <>
            Zet per leverancier de <strong>status</strong> en het{' '}
            <strong>offertebedrag</strong>.
          </>,
          <>
            <strong>Koppel</strong> een geboekte leverancier aan je budget.
          </>,
        ]}
      />
    </Intro>
  ),
  faq: [
    {
      vraag: 'Hoe voeg ik een leverancier toe?',
      antwoord: (
        <p>
          Klik op <strong>Leverancier toevoegen</strong> en vul naam, type, status,
          contactgegevens en eventueel het offertebedrag in.
        </p>
      ),
    },
    {
      vraag: 'Hoe vind ik leveranciers om uit te kiezen?',
      antwoord: (
        <p>
          Ga naar het tabblad <strong>Ontdekken</strong>. Daar doorzoek je alle
          trouwlocaties en leveranciers in de app en zet je favorieten op je eigen
          lijst.
        </p>
      ),
    },
    {
      vraag: 'Wat betekenen de statussen?',
      antwoord: (
        <p>
          De status laat zien waar je in het proces zit — van eerste oriëntatie tot
          definitief <strong>geboekt</strong>. Met de filterchips toon je snel
          alleen leveranciers met een bepaalde status.
        </p>
      ),
    },
    {
      vraag: 'Hoe plan ik een bezichtiging of afspraak in?',
      antwoord: (
        <p>
          Open de leverancier, kies <strong>Bewerken</strong> en vul onder{' '}
          <em>Meer details</em> de afspraakdatum (en eventueel tijd) in. Komende
          afspraken staan bovenaan je lijst en op het dashboard, en jullie
          krijgen er automatisch een herinnering voor — drie dagen en één dag
          vooraf, en op de dag zelf.
        </p>
      ),
    },
    {
      vraag: 'Waar bewaar ik offertes en contracten?',
      antwoord: (
        <p>
          Klik op een leverancier en scroll naar <strong>Documenten</strong>.
          Daar upload je offertes, contracten en facturen (pdf, foto of
          Word/Excel). Een paperclip in de lijst laat zien bij welke
          leveranciers documenten bewaard zijn. Alleen jullie en wie jullie
          hebben uitgenodigd kunnen ze openen.
        </p>
      ),
    },
    {
      vraag: 'Hoe vergelijk en sorteer ik leveranciers?',
      antwoord: (
        <p>
          Gebruik het zoekveld en sorteer op naam, status of hoogste bedrag. Op
          desktop kun je wisselen tussen <strong>kaart-</strong> en{' '}
          <strong>tabelweergave</strong>.
        </p>
      ),
    },
    {
      vraag: 'Hoe hangt dit samen met mijn budget?',
      antwoord: (
        <p>
          Koppel een leverancier aan een budgetitem (bij het budgetitem, onder{' '}
          <em>Meer details</em>). Staat de leverancier op <em>geboekt</em>, dan
          telt diens offerte automatisch mee in je budget.
        </p>
      ),
    },
    {
      vraag: 'Hoe bewerk of verwijder ik een leverancier?',
      antwoord: (
        <p>
          Open het menu bij de leverancier (op de kaart of in de tabelrij) en kies{' '}
          <strong>Bewerken</strong> of <strong>Verwijderen</strong>.
        </p>
      ),
    },
  ],
}

// ── Ontdekken ──────────────────────────────────────────────────────────────
export const ontdekkenInfo: PageInfo = {
  titel: 'FAQ Ontdekken',
  intro: (
    <Intro>
      <p>
        Op <strong>Ontdekken</strong> vind je duizenden trouwlocaties en
        leveranciers, per categorie doorzoekbaar op plaatsnaam. Vind je iets
        leuks, dan zet je het zo op je eigen lijst bij <strong>Mijn lijst</strong>.
      </p>
      <QuickStart
        stappen={[
          <>
            Kies <strong>waar</strong> jullie zoeken (plaatsnaam).
          </>,
          <>
            Kies een <strong>categorie</strong>, van trouwlocatie tot fotograaf.
          </>,
          <>
            Zet een favoriet op <strong>Mijn lijst</strong> of vraag direct een
            offerte aan.
          </>,
        ]}
      />
    </Intro>
  ),
  faq: [
    {
      vraag: 'Hoe zoek ik leveranciers in de buurt?',
      antwoord: (
        <p>
          Typ een plaatsnaam in de zoekbalk — elke Nederlandse plaats werkt, ook
          kleine dorpen. Je ziet dan alle leveranciers binnen de gekozen straal,
          dichtstbijzijnde eerst, inclusief die uit omliggende plaatsen.
        </p>
      ),
    },
    {
      vraag: 'Hoe verfijn ik de resultaten?',
      antwoord: (
        <p>
          Pas de <strong>straal</strong> aan (bijvoorbeeld van 15 naar 25 km), zoek
          binnen de resultaten op naam of trefwoord, of wissel bovenaan van
          categorie. Per categorie komen er later extra filters bij, zoals
          prijsindicatie.
        </p>
      ),
    },
    {
      vraag: 'Hoe zet ik een leverancier op mijn lijst?',
      antwoord: (
        <p>
          Voeg een resultaat toe aan <strong>Mijn lijst</strong>. Daar
          beheer je vervolgens de status, offertes en contactmomenten.
        </p>
      ),
    },
    {
      vraag: 'Wat is het verschil met "Mijn lijst"?',
      antwoord: (
        <p>
          <strong>Ontdekken</strong> is bladeren en zoeken in de volledige
          directory. <strong>Mijn lijst</strong> is jouw eigen shortlist,
          waar je de boekingsstatus en bedragen bijhoudt.
        </p>
      ),
    },
  ],
}

// ── Draaiboek ──────────────────────────────────────────────────────────────
export const draaiboekInfo: PageInfo = {
  titel: 'FAQ Draaiboek',
  intro: (
    <Intro>
      <p>
        Het <strong>Draaiboek</strong> is het minuutschema van jullie trouwdag. Per
        onderdeel leg je vast hoe laat het begint en eindigt, waar het is en wie
        erbij betrokken zijn.
      </p>
      <p>
        De app waarschuwt automatisch als onderdelen elkaar overlappen en laat de
        pauzes ertussen zien, zodat de dag soepel verloopt.
      </p>
      <QuickStart
        stappen={[
          <>
            Start met een <strong>standaard dagindeling</strong> en bouw die om
            naar jullie dag.
          </>,
          <>
            Pas <strong>tijden, titels en betrokkenen</strong> aan jullie dag aan.
          </>,
          <>
            <strong>Deel</strong> het draaiboek via een link met je
            ceremoniemeester en leveranciers.
          </>,
        ]}
      />
    </Intro>
  ),
  faq: [
    {
      vraag: 'Hoe deel ik het draaiboek met leveranciers of de ceremoniemeester?',
      antwoord: (
        <p>
          Klik op <strong>Delen</strong> en zet delen aan. Je krijgt één link die
          je via WhatsApp of e-mail doorstuurt; de ontvanger heeft geen account
          nodig en ziet altijd de actuele versie. Die kan filteren op zijn eigen
          rol en het schema printen. Via <strong>Stop met delen</strong> maak je
          de link direct ongeldig.
        </p>
      ),
    },
    {
      vraag: 'Hoe begin ik snel met een draaiboek?',
      antwoord: (
        <p>
          Kies <strong>Start met standaard dagindeling</strong> voor een complete
          basis en pas alles daarna naar wens aan.
        </p>
      ),
    },
    {
      vraag: 'Hoe voeg ik zelf een onderdeel toe?',
      antwoord: (
        <p>
          Klik op <strong>Onderdeel toevoegen</strong> en vul de starttijd,
          eindtijd, titel, locatie en de betrokkenen in.
        </p>
      ),
    },
    {
      vraag: 'Hoe maak ik een schema per betrokkene (fotograaf, catering)?',
      antwoord: (
        <p>
          Filter het draaiboek op een betrokkene om alleen hun onderdelen te zien.
          Op desktop kun je meerdere kolommen naast elkaar zetten om betrokkenen te
          vergelijken.
        </p>
      ),
    },
    {
      vraag: 'Wat betekenen de labels "overlap" en "pauze"?',
      antwoord: (
        <p>
          De app berekent de tijd tussen onderdelen. <strong>Pauze</strong> toont
          een gat in het programma; <strong>overlap</strong> waarschuwt dat twee
          onderdelen door elkaar lopen, zodat je het kunt corrigeren.
        </p>
      ),
    },
    {
      vraag: 'Hoe deel of print ik het draaiboek?',
      antwoord: (
        <p>
          Gebruik <strong>Exporteer draaiboek</strong> voor een CSV-bestand —
          eventueel gefilterd op één betrokkene, zodat je iedereen alleen zijn eigen
          schema kunt geven.
        </p>
      ),
    },
  ],
}

// ── Gastenlijst ────────────────────────────────────────────────────────────
export const gastenInfo: PageInfo = {
  titel: 'FAQ Gastenlijst',
  intro: (
    <Intro>
      <p>
        Op de <strong>Gastenlijst</strong> beheer je iedereen die je uitnodigt en
        houd je hun reacties (<strong>RSVP</strong>) bij. Per gast leg je categorie,
        type (dag- of avondgast), eventuele partner, kinderen en dieetwensen vast.
      </p>
      <p>
        Zo weet je altijd precies met hoeveel mensen je rekent — handig voor je
        catering, tafels en budget.
      </p>
      <QuickStart
        stappen={[
          <>
            <strong>Voeg je gasten toe</strong> aan de lijst.
          </>,
          <>
            <strong>Genereer RSVP-links</strong> en deel ze met je gasten.
          </>,
          <>
            <strong>Houd de reacties bij</strong> en filter op status.
          </>,
        ]}
      />
    </Intro>
  ),
  faq: [
    {
      vraag: 'Hoe voeg ik een gast toe?',
      antwoord: (
        <p>
          Klik op <strong>Gast toevoegen</strong> (of de zwevende +-knop). Vul de
          naam in en eventueel categorie, type, partner, kinderen en dieetwensen.
        </p>
      ),
    },
    {
      vraag: 'Hoe verzamel ik adressen voor de uitnodigingen?',
      antwoord: (
        <p>
          Kies in het menu <strong>Adressen verzamelen</strong> en zet de
          adreslink aan. Stuur die ene link rond (bijvoorbeeld in de
          familie-app): iedereen vult zelf zijn adres in en het verschijnt
          vanzelf op de gastenlijst — bij de bestaande gast als de naam al
          bekend is, anders als nieuwe gast.
        </p>
      ),
    },
    {
      vraag: 'Waar vind ik de muziekwensen en berichten van gasten?',
      antwoord: (
        <p>
          Gasten kunnen bij hun RSVP een verzoeknummer en een persoonlijk
          bericht achterlaten. Kies in het menu{' '}
          <strong>Muziekwensen &amp; berichten</strong> voor het overzicht —
          de muziekwensen kopieer je met één klik voor jullie DJ.
        </p>
      ),
    },
    {
      vraag: 'Hoe houd ik bij wie er komt?',
      antwoord: (
        <p>
          Klik op de RSVP-badge bij een gast om de status te wijzigen:{' '}
          <strong>uitgenodigd</strong>, <strong>bevestigd</strong>,{' '}
          <strong>afgemeld</strong> of <strong>geen reactie</strong>.
        </p>
      ),
    },
    {
      vraag: 'Hoe laat ik gasten zelf reageren?',
      antwoord: (
        <p>
          Kies <strong>Genereer RSVP-links</strong>. Elke gast krijgt een
          persoonlijke link die je kunt <strong>kopiëren</strong> of per{' '}
          <strong>e-mail</strong> kunt versturen. De gast vult zijn reactie zelf in
          en dat komt automatisch in je lijst.
        </p>
      ),
    },
    {
      vraag: 'Hoe filter of zoek ik gasten?',
      antwoord: (
        <p>
          Zoek op naam en filter op categorie, type en RSVP-status. Onderaan zie je
          hoeveel gasten worden weergegeven.
        </p>
      ),
    },
    {
      vraag: 'Hoe exporteer ik de gastenlijst?',
      antwoord: (
        <p>
          Via het <strong>···</strong>-menu kies je{' '}
          <strong>Exporteer gastenlijst</strong> voor een CSV-bestand met alle
          gegevens.
        </p>
      ),
    },
    {
      vraag: 'Ik heb per ongeluk een gast verwijderd — kan ik dat herstellen?',
      antwoord: (
        <p>
          Ja. Direct na het verwijderen verschijnt een melding met{' '}
          <strong>Ongedaan maken</strong>. Klik daarop om de gast terug te zetten.
        </p>
      ),
    },
    {
      vraag: 'Hoe wijs ik gasten een tafel toe?',
      antwoord: (
        <p>
          Dat doe je op de pagina <strong>Tafelschikking</strong>. Afgemelde gasten
          worden daar automatisch buiten beschouwing gelaten.
        </p>
      ),
    },
  ],
}

// ── Tafelschikking ─────────────────────────────────────────────────────────
export const tafelsInfo: PageInfo = {
  titel: 'FAQ Tafelschikking',
  intro: (
    <Intro>
      <p>
        Bij <strong>Tafelschikking</strong> maak je de plattegrond van jullie zaal.
        Je plaatst tafels en deelt je gasten in. Alleen gasten die niet afgemeld
        zijn tellen mee, zodat je altijd met de juiste aantallen werkt.
      </p>
      <QuickStart
        stappen={[
          <>
            <strong>Voeg je tafels toe</strong> (vorm en aantal plaatsen).
          </>,
          <>
            <strong>Deel gasten in</strong> door ze naar een tafel te slepen.
          </>,
          <>
            <strong>Print</strong> de plattegrond voor op de dag.
          </>,
        ]}
      />
    </Intro>
  ),
  faq: [
    {
      vraag: 'Hoe voeg ik een tafel toe?',
      antwoord: (
        <p>
          Klik op <strong>Tafel toevoegen</strong> en geef de tafel een naam, een
          vorm en het aantal plaatsen.
        </p>
      ),
    },
    {
      vraag: 'Hoe deel ik gasten in?',
      antwoord: (
        <p>
          Sleep een gast vanuit de lijst naar een plek aan een tafel. De
          beschikbare en bezette plaatsen worden automatisch bijgehouden.
        </p>
      ),
    },
    {
      vraag: 'Waarom zie ik bepaalde gasten niet?',
      antwoord: (
        <p>
          Gasten die zich hebben <strong>afgemeld</strong> worden niet meegenomen in
          de tafelschikking. Pas zo nodig hun RSVP-status aan op de Gastenlijst.
        </p>
      ),
    },
    {
      vraag: 'Hoe pas ik een tafel aan of verwijder ik hem?',
      antwoord: (
        <p>
          Open het menu bij de tafel en kies <strong>Bewerken</strong> of{' '}
          <strong>Verwijderen</strong>.
        </p>
      ),
    },
    {
      vraag: 'Hoe print ik de tafelindeling?',
      antwoord: (
        <p>
          Klik op <strong>Afdrukken</strong> voor een nette versie van de
          plattegrond om mee te nemen naar de locatie.
        </p>
      ),
    },
  ],
}

// ── Trouwwebsite ───────────────────────────────────────────────────────────
export const websiteInfo: PageInfo = {
  titel: 'FAQ Trouwwebsite',
  intro: (
    <Intro>
      <p>
        Met de <strong>Trouwwebsite</strong> maak je een eigen pagina voor jullie
        gasten, met bijvoorbeeld jullie verhaal, het programma, praktische info en
        RSVP. Je kiest een ontwerp, vult de secties en publiceert met één klik op
        een eigen webadres.
      </p>
      <QuickStart
        stappen={[
          <>
            Kies een <strong>ontwerp</strong> en stel jullie{' '}
            <strong>webadres</strong> in.
          </>,
          <>
            Vul de <strong>secties</strong> die je wilt tonen.
          </>,
          <>
            <strong>Publiceer</strong> en deel de link met je gasten.
          </>,
        ]}
      />
    </Intro>
  ),
  faq: [
    {
      vraag: 'Hoe publiceer ik onze website?',
      antwoord: (
        <p>
          Zet de <strong>publicatie-schakelaar</strong> in de statuskaart aan.
          Daarna is de site live op jullie webadres. Je kunt hem op elk moment weer
          offline halen.
        </p>
      ),
    },
    {
      vraag: 'Wat is ons webadres en hoe pas ik het aan?',
      antwoord: (
        <p>
          Jullie site staat op een adres als{' '}
          <strong>/trouwen/jullie-naam</strong>. Het webadres pas je aan bij de
          ontwerpinstellingen.
        </p>
      ),
    },
    {
      vraag: 'Hoe bepaal ik welke onderdelen op de site staan?',
      antwoord: (
        <p>
          In de sectie-accordeon zet je onderdelen aan of uit en bewerk je de
          inhoud per sectie — bijvoorbeeld jullie verhaal, het programma of de
          RSVP.
        </p>
      ),
    },
    {
      vraag: 'Hoe verander ik het uiterlijk?',
      antwoord: (
        <p>
          Bij de ontwerpinstellingen kies je het <strong>template</strong>, de{' '}
          <strong>kleuren</strong> en het <strong>lettertype</strong>.
        </p>
      ),
    },
    {
      vraag: 'Hoe bekijk ik de site zoals gasten hem zien?',
      antwoord: (
        <p>
          Klik op <strong>Bekijk website</strong> rechtsboven; de site opent in een
          nieuw tabblad.
        </p>
      ),
    },
    {
      vraag: 'Worden mijn wijzigingen automatisch opgeslagen?',
      antwoord: (
        <p>
          Ja, wijzigingen worden direct bewaard. De opslagstatus zie je in de
          header.
        </p>
      ),
    },
  ],
}

// ── Cadeaulijst ────────────────────────────────────────────────────────────
export const cadeaulijstInfo: PageInfo = {
  titel: 'FAQ Cadeaulijst',
  intro: (
    <Intro>
      <p>
        Op de <strong>Cadeaulijst</strong> deel je jullie cadeauwensen — concrete
        cadeaus én geldpotjes, bijvoorbeeld voor de huwelijksreis. Gasten kunnen
        iets reserveren, zodat je nooit dubbele cadeaus krijgt.
      </p>
      <QuickStart
        stappen={[
          <>
            Voeg <strong>cadeauwensen of een geldfonds</strong> toe.
          </>,
          <>
            Stel je <strong>voorkeuren</strong> in en kies een uiterlijk.
          </>,
          <>
            <strong>Deel</strong> de lijst via jullie trouwwebsite.
          </>,
        ]}
      />
    </Intro>
  ),
  faq: [
    {
      vraag: 'Hoe voeg ik een cadeauwens toe?',
      antwoord: (
        <p>
          Ga naar het tabblad <strong>Mijn lijst</strong> en klik op{' '}
          <strong>Item toevoegen</strong>.
        </p>
      ),
    },
    {
      vraag: 'Kan ik om geld vragen in plaats van cadeaus?',
      antwoord: (
        <p>
          Ja. Voeg een <strong>geldfonds</strong> toe, bijvoorbeeld een bijdrage
          aan jullie huwelijksreis. Gasten kunnen daar dan aan meedoen.
        </p>
      ),
    },
    {
      vraag: 'Hoe zie ik wat gasten gereserveerd hebben?',
      antwoord: (
        <p>
          Op het tabblad <strong>Reserveringen</strong> zie je in één overzicht wat
          er al gereserveerd is.
        </p>
      ),
    },
    {
      vraag: 'Welke instellingen kan ik aanpassen?',
      antwoord: (
        <p>
          Op het tabblad <strong>Instellingen</strong> regel je hoe de lijst werkt,
          en op <strong>Uiterlijk</strong> pas je de vormgeving aan.
        </p>
      ),
    },
    {
      vraag: 'Waar zien gasten de cadeaulijst?',
      antwoord: (
        <p>
          De cadeaulijst hoort bij jullie <strong>trouwwebsite</strong>. Deel het
          webadres met je gasten, dan kunnen zij de lijst bekijken en reserveren.
        </p>
      ),
    },
  ],
}

// ── Fotomuur ───────────────────────────────────────────────────────────────
export const fotomuurInfo: PageInfo = {
  titel: 'FAQ Fotomuur',
  intro: (
    <Intro>
      <p>
        Met de <strong>Fotomuur</strong> laat je gasten tijdens het feest foto’s
        uploaden die <strong>live op een groot scherm</strong> verschijnen. Zo
        verzamel je samen de mooiste momenten van de dag.
      </p>
      <QuickStart
        stappen={[
          <>
            Zet je <strong>voorkeuren</strong> goed (bijv. eerst goedkeuren).
          </>,
          <>
            Deel de <strong>uploadlink of QR-code</strong> met je gasten.
          </>,
          <>
            Open de <strong>presentatieweergave</strong> op een scherm of beamer.
          </>,
        ]}
      />
    </Intro>
  ),
  faq: [
    {
      vraag: "Hoe laat ik gasten foto's uploaden?",
      antwoord: (
        <p>
          Deel de <strong>uploadlink</strong> of laat gasten de{' '}
          <strong>QR-code</strong> scannen. Ze uploaden dan rechtstreeks vanaf hun
          telefoon, zonder app of account.
        </p>
      ),
    },
    {
      vraag: "Hoe toon ik de foto's op een groot scherm?",
      antwoord: (
        <p>
          Open de <strong>presentatie-</strong> of liveweergave en zet die op een
          tv of beamer. Nieuwe foto’s verschijnen automatisch.
        </p>
      ),
    },
    {
      vraag: "Kan ik foto's eerst goedkeuren?",
      antwoord: (
        <p>
          Ja. Zet <strong>Foto’s eerst goedkeuren</strong> aan; dan bepaal jij welke
          foto’s op de muur verschijnen.
        </p>
      ),
    },
    {
      vraag: 'Welke instellingen zijn er nog meer?',
      antwoord: (
        <p>
          Je kunt een <strong>naam verplicht</strong> stellen bij het uploaden en
          instellen of <strong>gasten foto’s mogen downloaden</strong>.
        </p>
      ),
    },
    {
      vraag: "Hoe verwijder ik een foto?",
      antwoord: (
        <p>
          In het beheer kun je losse foto’s verwijderen die niet op de muur
          thuishoren.
        </p>
      ),
    },
  ],
}

// ── Samen plannen (leden) ──────────────────────────────────────────────────
export const ledenInfo: PageInfo = {
  titel: 'FAQ Samen plannen',
  intro: (
    <Intro>
      <p>
        Op <strong>Samen plannen</strong> regel je wie er met jullie meewerkt aan
        het trouwplan. Nodig je partner, getuige of ceremoniemeester uit met een
        rol, en bepaal per onderdeel wat elke rol mag zien of bewerken.
      </p>
      <QuickStart
        stappen={[
          <>
            <strong>Nodig een lid uit</strong> via zijn of haar e-mailadres en
            kies een rol.
          </>,
          <>
            Diegene krijgt een <strong>e-mail</strong> met een knop om een
            wachtwoord in te stellen.
          </>,
          <>
            Stel bij <strong>Rollen en rechten</strong> per onderdeel in wat elke
            rol kan.
          </>,
        ]}
      />
    </Intro>
  ),
  faq: [
    {
      vraag: 'Hoe nodig ik iemand uit?',
      antwoord: (
        <p>
          Klik op <strong>Lid uitnodigen</strong>, vul het e-mailadres in en kies
          een rol. Diegene ontvangt een uitnodigingsmail met een knop om een
          wachtwoord in te stellen; daarmee is het account meteen compleet en
          heeft diegene direct toegang.
        </p>
      ),
    },
    {
      vraag: 'Welke rollen zijn er?',
      antwoord: (
        <p>
          <strong>Eigenaar</strong> (het bruidspaar) ziet en bewerkt alles en
          beheert leden en rechten. <strong>Planner</strong> helpt breed mee,
          <strong> helper</strong> helpt met specifieke onderdelen en een
          <strong> kijker</strong> kan alleen meekijken. Wat een planner, helper
          of kijker per onderdeel precies kan, stel je zelf in bij{' '}
          <strong>Rollen en rechten</strong>.
        </p>
      ),
    },
    {
      vraag: 'Wie kan leden beheren?',
      antwoord: (
        <p>
          Alleen eigenaren kunnen leden uitnodigen, rollen wijzigen, rechten
          instellen en toegang intrekken. Andere leden zien op deze pagina wel
          wie er meewerkt en welke rechten er gelden, maar kunnen niets wijzigen.
        </p>
      ),
    },
    {
      vraag: 'Kan ik bepalen wie het budget (of een ander onderdeel) ziet?',
      antwoord: (
        <p>
          Ja. Kies bij <strong>Rollen en rechten</strong> een rol en stel per
          onderdeel — zoals budget, gasten of de website — in of die rol{' '}
          <strong>niets</strong>, <strong>zien</strong> of{' '}
          <strong>bewerken</strong> mag. De wijziging geldt direct voor alle
          leden met die rol.
        </p>
      ),
    },
    {
      vraag: 'Hoe wijzig ik iemands rol?',
      antwoord: (
        <p>
          Open het menu achter het lid en kies <strong>Rol wijzigen</strong>. Er
          blijft altijd minstens één eigenaar; de laatste eigenaar kan dus geen
          andere rol krijgen.
        </p>
      ),
    },
    {
      vraag: 'Iemand heeft de uitnodiging niet ontvangen — wat nu?',
      antwoord: (
        <p>
          Zolang een account nog niet geactiveerd is, zie je dat bij het lid
          staan. Kies in het menu achter het lid{' '}
          <strong>Uitnodiging opnieuw versturen</strong>; diegene krijgt dan een
          nieuwe link om een wachtwoord in te stellen.
        </p>
      ),
    },
    {
      vraag: 'Hoe trek ik iemands toegang in?',
      antwoord: (
        <p>
          Kies in het menu achter het lid <strong>Toegang intrekken</strong>. Die
          persoon kan dan niet meer bij jullie bruiloft; opnieuw uitnodigen kan
          altijd.
        </p>
      ),
    },
    {
      vraag: 'Waar verwijder ik de hele bruiloft?',
      antwoord: (
        <p>
          Dat staat tegenwoordig op de <strong>Account</strong>-pagina, onderaan
          bij de gevaarzone (alleen zichtbaar voor eigenaren). Let op: alle
          gegevens worden dan permanent verwijderd.
        </p>
      ),
    },
  ],
}

// ── Account ────────────────────────────────────────────────────────────────
export const accountInfo: PageInfo = {
  titel: 'FAQ Account',
  intro: (
    <Intro>
      <p>
        Op <strong>Account</strong> beheer je je persoonlijke gegevens en
        inloggegevens. Dit zijn jóuw instellingen — losstaand van de gegevens van de
        bruiloft zelf.
      </p>
      <QuickStart
        stappen={[
          <>
            Vul je <strong>naam</strong> in en voeg eventueel een profielfoto toe.
          </>,
          <>
            Controleer je <strong>e-mailadres</strong>.
          </>,
          <>
            Stel desgewenst een <strong>nieuw wachtwoord</strong> in.
          </>,
        ]}
      />
    </Intro>
  ),
  faq: [
    {
      vraag: 'Hoe wijzig ik mijn naam of profielfoto?',
      antwoord: (
        <p>
          In het profielblok pas je je voor- en achternaam aan en kun je een
          profielfoto toevoegen of verwijderen.
        </p>
      ),
    },
    {
      vraag: 'Hoe verander ik mijn e-mailadres?',
      antwoord: (
        <p>
          Vul het nieuwe adres in. Je ontvangt een <strong>verificatie-e-mail</strong>
          ; pas na het bevestigen van de link is het nieuwe adres actief.
        </p>
      ),
    },
    {
      vraag: 'Hoe wijzig ik mijn wachtwoord?',
      antwoord: (
        <p>
          Vul je huidige wachtwoord in en daarna twee keer je nieuwe wachtwoord om
          het te wijzigen.
        </p>
      ),
    },
    {
      vraag: 'Wat is "Mijn rol"?',
      antwoord: (
        <p>
          Dat is jouw rol binnen deze bruiloft, bijvoorbeeld eigenaar of
          medeplanner. De rol bepaalt wat je mag aanpassen.
        </p>
      ),
    },
    {
      vraag: 'Waar pas ik de trouwgegevens (datum, budget) aan?',
      antwoord: (
        <p>
          Niet hier, maar op het <strong>Overzicht</strong> via de knop{' '}
          <em>Bewerken</em>. Daar stel je de trouwdatum, locatie, het totaalbudget
          en de gastenaantallen in.
        </p>
      ),
    },
  ],
}

export const moodboardInfo: PageInfo = {
  titel: 'FAQ Moodboard',
  intro: (
    <Intro>
      <p>
        Het <strong>Moodboard</strong> is jullie inspiratiebord — sfeerbeelden
        voor kleuren, jurk, bloemen, decoratie en meer, allemaal op één plek.
      </p>
      <p>
        Sleep tegels om ze te herordenen, tik een tegel aan om &apos;m groot te
        bekijken, en filter op categorie om snel te zien wat er al is.
      </p>
      <QuickStart
        stappen={[
          <>
            <strong>Upload eigen foto&apos;s</strong> of <strong>plak een link</strong>{' '}
            naar inspiratie die je online vond.
          </>,
          <>
            Geef elke categorie een plek en <strong>versleep tegels</strong> om
            jullie favorieten bovenaan te zetten.
          </>,
          <>
            <strong>Filter</strong> op categorie om per onderdeel (bv. bloemen)
            te overzien wat jullie mooi vinden.
          </>,
        ]}
      />
    </Intro>
  ),
  faq: [
    {
      vraag: 'Hoe voeg ik een foto toe?',
      antwoord: (
        <p>
          Klik op <strong>Toevoegen</strong>. Je kunt eigen foto&apos;s uploaden
          (ook meerdere tegelijk, of slepen vanaf je bureaublad), of een link
          plakken naar een pin, blog of webshop — de app haalt de afbeelding
          er automatisch bij.
        </p>
      ),
    },
    {
      vraag: 'Hoe verander ik de volgorde?',
      antwoord: (
        <p>
          Sleep een tegel aan het greepje linksboven naar de gewenste plek.
          Herordenen kan alleen in de weergave <strong>Alles</strong> — bij een
          actief categoriefilter staat de volgorde vast.
        </p>
      ),
    },
    {
      vraag: 'Waar bewaar ik de bron van een gepinde foto?',
      antwoord: (
        <p>
          Tik de tegel aan om de lightbox te openen — daar staat een knop{' '}
          <strong>Bekijk bron</strong> die teruggaat naar de oorspronkelijke
          pagina (bijvoorbeeld de webshop).
        </p>
      ),
    },
    {
      vraag: 'Wie kan het moodboard zien of bewerken?',
      antwoord: (
        <p>
          Dat stel je in bij <strong>Samen plannen</strong>, net als bij elk
          ander onderdeel — per rol kies je niets, zien of bewerken.
        </p>
      ),
    },
  ],
}

// ── Muziek ─────────────────────────────────────────────────────────────────
export const muziekInfo: PageInfo = {
  titel: 'FAQ Muziek',
  intro: (
    <Intro>
      <p>
        Op <strong>Muziek</strong> verzamelen jullie de nummers voor elke fase
        van de dag: ceremonie, borrel, diner en feest — plus een{' '}
        <strong>niet draaien</strong>-lijst met nummers die de DJ moet
        overslaan.
      </p>
      <p>
        Gasten dragen via de RSVP op jullie trouwwebsite hun verzoeknummers
        aan; die komen hier als suggestie binnen en jullie beslissen wat de
        lijst in gaat.
      </p>
      <QuickStart
        stappen={[
          <>
            <strong>Voeg nummers toe</strong> per moment van de dag — noteer
            bij bijzondere nummers waarvoor ze zijn (bv. openingsdans).
          </>,
          <>
            <strong>Beoordeel de suggesties</strong> die gasten via de RSVP
            achterlaten: toevoegen aan een moment, of verwijderen.
          </>,
          <>
            <strong>Deel de lijst</strong> via een link met jullie DJ of band —
            die ziet altijd de actuele versie, zonder account.
          </>,
        ]}
      />
    </Intro>
  ),
  faq: [
    {
      vraag: 'Hoe dragen gasten nummers aan?',
      antwoord: (
        <p>
          In het RSVP-formulier op jullie trouwwebsite zit een veld voor een
          verzoeknummer. Wat gasten daar invullen verschijnt hier automatisch
          als suggestie, met de naam van de gast erbij. Jullie houden het
          laatste woord: pas na goedkeuren staat het nummer in de lijst.
        </p>
      ),
    },
    {
      vraag: 'Wat ziet de DJ via de deel-link?',
      antwoord: (
        <p>
          Alleen de goedgekeurde nummers, per moment van de dag, plus de
          niet-draaien-lijst en jullie opmerkingen — geen andere
          plannergegevens. De link toont altijd de actuele versie; stoppen met
          delen maakt hem per direct ongeldig.
        </p>
      ),
    },
    {
      vraag: 'Waarvoor is de niet draaien-lijst?',
      antwoord: (
        <p>
          Voor nummers die jullie echt niet willen horen — ook niet als een
          gast erom vraagt. DJ&apos;s vragen hier standaard naar; met deze
          lijst is dat in één keer geregeld.
        </p>
      ),
    },
    {
      vraag: 'Kan ik een link naar Spotify of YouTube bewaren?',
      antwoord: (
        <p>
          Ja, elk nummer heeft een optioneel linkveld. Handig als een nummer
          meerdere versies heeft (live, akoestisch) en je zeker wilt weten dat
          de DJ de juiste pakt.
        </p>
      ),
    },
    {
      vraag: 'Wie kan de muzieklijst zien of bewerken?',
      antwoord: (
        <p>
          Dat stel je in bij <strong>Samen plannen</strong>, net als bij elk
          ander onderdeel — per rol kies je niets, zien of bewerken. Handig:
          geef getuigen bewerkrechten en laat ze meebouwen aan de feestlijst.
        </p>
      ),
    },
  ],
}

// ── Documenten ─────────────────────────────────────────────────────────────
export const documentenInfo: PageInfo = {
  titel: 'FAQ Documenten',
  intro: (
    <Intro>
      <p>
        <strong>Documenten</strong> is de centrale map van jullie bruiloft —
        contracten, offertes, speeches, draaiboeken en al het andere dat nu
        verspreid op je computer staat, hier op één plek.
      </p>
      <p>
        Werkt als de verkenner op je computer: mappen, uploaden (ook slepen),
        hernoemen, verplaatsen en zoeken. Documenten die je bij een
        leverancier of budgetpost bewaart, verschijnen hier automatisch.
      </p>
      <QuickStart
        stappen={[
          <>
            Begin met de <strong>standaardmappen</strong> of maak je eigen
            indeling.
          </>,
          <>
            <strong>Upload of sleep</strong> bestanden in de map waar ze
            horen — pdf, foto of Word/Excel, tot 20 MB per stuk.
          </>,
          <>
            Kwijt? <strong>Zoek</strong> bovenaan — dat zoekt in alles,
            inclusief de leveranciers- en budgetdocumenten.
          </>,
        ]}
      />
    </Intro>
  ),
  faq: [
    {
      vraag: 'Waar komen de mappen "Leveranciers" en "Budget" vandaan?',
      antwoord: (
        <p>
          Die vullen zichzelf met de documenten die je bij{' '}
          <strong>Mijn leveranciers</strong> en <strong>Budget</strong>{' '}
          bewaart. Het bestand staat maar op één plek — hier zie je het ook,
          maar beheren (toevoegen/verwijderen) doe je bij de leverancier of
          budgetpost zelf.
        </p>
      ),
    },
    {
      vraag: 'Wat gebeurt er met de bestanden als ik een map verwijder?',
      antwoord: (
        <p>
          Niets ergs: de bestanden in die map verhuizen automatisch naar de
          hoofdmap. Een map verwijderen gooit dus nooit documenten weg.
        </p>
      ),
    },
    {
      vraag: 'Wie kan deze documenten zien?',
      antwoord: (
        <p>
          Alleen wie jullie toegang geven. De bestanden staan in een
          afgeschermde opslag — er bestaat geen publieke link naartoe. Per rol
          stel je bij <strong>Samen plannen</strong> in wie de documentenmap
          ziet of beheert; standaard staat die alleen voor jullie zelf open.
        </p>
      ),
    },
    {
      vraag: 'Welke bestanden kan ik uploaden?',
      antwoord: (
        <p>
          Pdf&apos;s, foto&apos;s (jpg, png, webp, heic), Word- en
          Excel-bestanden en tekstbestanden, tot 20 MB per stuk en 200
          documenten per bruiloft. Je kunt meerdere bestanden tegelijk
          uploaden of slepen.
        </p>
      ),
    },
  ],
}

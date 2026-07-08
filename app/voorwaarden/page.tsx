import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Algemene voorwaarden',
  description: 'De voorwaarden voor het gebruik van Ons Trouwplan.',
}

const CONTACT_EMAIL = 'koopman.janwillem@gmail.com'

export default function VoorwaardenPage() {
  return (
    <div className="min-h-screen bg-white px-4 py-16 sm:px-6">
      <article className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-gray-400 transition-colors hover:text-rhino-900">
          ← Terug naar Ons Trouwplan
        </Link>

        <h1 className="mt-6 font-serif text-3xl font-medium text-rhino-900 sm:text-4xl">
          Algemene voorwaarden
        </h1>
        <p className="mt-3 text-sm text-gray-400">Laatst bijgewerkt: 12 juni 2026</p>

        <div className="mt-10 space-y-10 text-[15px] leading-relaxed text-gray-600">
          <section>
            <h2 className="font-serif text-xl font-medium text-rhino-900">1. De dienst</h2>
            <p className="mt-3">
              Ons Trouwplan is een gratis online trouwplanner waarmee je onder andere taken,
              budget, gasten, leveranciers, een trouwwebsite en een cadeaulijst kunt beheren. Door
              een account aan te maken ga je akkoord met deze voorwaarden en met onze{' '}
              <Link href="/privacy" className="text-rhino-900 underline">
                privacyverklaring
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-medium text-rhino-900">2. Je account</h2>
            <p className="mt-3">
              Je bent zelf verantwoordelijk voor het geheimhouden van je inloggegevens en voor wat
              er met je account gebeurt. Je kunt anderen (zoals je partner of getuigen) uitnodigen
              om mee te plannen; jij bepaalt wie toegang krijgt en met welke rol. Je kunt je
              account op elk moment verwijderen.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-medium text-rhino-900">3. Jouw inhoud</h2>
            <p className="mt-3">
              Alles wat je invoert — teksten, foto&apos;s, gastenlijsten, budgetten — blijft van
              jou. Je geeft ons alleen de technische toestemming die nodig is om die inhoud op te
              slaan en te tonen, bijvoorbeeld op je eigen trouwwebsite. Je mag geen inhoud
              plaatsen die onrechtmatig is of inbreuk maakt op rechten van anderen, en je staat
              ervoor in dat je gegevens van gasten mag invoeren.
            </p>
            <p className="mt-3">
              Je trouwwebsite en cadeaulijst zijn openbaar bereikbaar voor iedereen met de link.
              Deel die link dus alleen met wie je erbij wilt hebben.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-medium text-rhino-900">
              4. Cadeaulijst en bijdragen
            </h2>
            <p className="mt-3">
              Via de cadeaulijst kunnen gasten cadeaus reserveren of een financiële bijdrage
              toezeggen. Betalingen verlopen rechtstreeks tussen gast en bruidspaar (bijvoorbeeld
              per bankoverschrijving); Ons Trouwplan is daarbij geen partij, verwerkt geen
              betalingen en is niet verantwoordelijk voor het wel of niet nakomen van toezeggingen.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-medium text-rhino-900">5. AI-gastenlijst-import</h2>
            <p className="mt-3">
              Bij het importeren van een gastenlijst (bestand of geplakte tekst) wordt AI gebruikt
              om de gegevens om te zetten naar een gestructureerde gastenlijst. Dit resultaat kan
              onjuistheden bevatten — controleer de geïmporteerde gasten altijd voordat je ze
              opslaat.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-medium text-rhino-900">6. Beschikbaarheid</h2>
            <p className="mt-3">
              We doen ons best om Ons Trouwplan goed en ononderbroken te laten werken, maar de
              dienst wordt gratis en &quot;zoals hij is&quot; aangeboden, zonder garanties. We
              raden je aan belangrijke informatie (zoals je gastenlijst) ook zelf te bewaren.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-medium text-rhino-900">7. Aansprakelijkheid</h2>
            <p className="mt-3">
              Voor zover de wet dat toestaat, zijn wij niet aansprakelijk voor indirecte schade of
              gevolgschade door het gebruik van de dienst, zoals gemiste boekingen of verloren
              gegevens. Niets in deze voorwaarden beperkt aansprakelijkheid die wettelijk niet
              beperkt kan worden.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-medium text-rhino-900">
              8. Misbruik en beëindiging
            </h2>
            <p className="mt-3">
              We kunnen accounts beperken of beëindigen bij misbruik, zoals spam, fraude of het
              schenden van deze voorwaarden. Waar redelijkerwijs mogelijk waarschuwen we eerst.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-medium text-rhino-900">
              9. Wijzigingen en toepasselijk recht
            </h2>
            <p className="mt-3">
              We kunnen deze voorwaarden aanpassen; de actuele versie staat altijd op deze pagina
              en bij ingrijpende wijzigingen informeren we je. Op deze voorwaarden is Nederlands
              recht van toepassing. Vragen? Mail{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-rhino-900 underline">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>
        </div>
      </article>
    </div>
  )
}

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacyverklaring',
  description: 'Hoe Ons Trouwplan omgaat met jouw gegevens en die van je gasten.',
}

const CONTACT_EMAIL = 'koopman.janwillem@gmail.com'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white px-4 py-16 sm:px-6">
      <article className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm text-gray-400 transition-colors hover:text-rhino-900">
          ← Terug naar Ons Trouwplan
        </Link>

        <h1 className="mt-6 font-serif text-3xl font-medium text-rhino-900 sm:text-4xl">
          Privacyverklaring
        </h1>
        <p className="mt-3 text-sm text-gray-400">Laatst bijgewerkt: 12 juni 2026</p>

        <div className="mt-10 space-y-10 text-[15px] leading-relaxed text-gray-600">
          <section>
            <h2 className="font-serif text-xl font-medium text-rhino-900">1. Wie zijn wij?</h2>
            <p className="mt-3">
              Ons Trouwplan is een gratis Nederlandse online trouwplanner. Wij zijn
              verantwoordelijk voor de verwerking van persoonsgegevens zoals beschreven in deze
              privacyverklaring. Vragen over privacy kun je stellen via{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-rhino-900 underline">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-medium text-rhino-900">
              2. Welke gegevens verwerken we?
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <strong className="text-rhino-900">Accountgegevens:</strong> je e-mailadres,
                weergavenaam en eventueel een profielfoto.
              </li>
              <li>
                <strong className="text-rhino-900">Planningsgegevens die je zelf invoert:</strong>{' '}
                trouwdatum, budget, taken, leveranciers, cadeaulijst en de inhoud van je
                trouwwebsite.
              </li>
              <li>
                <strong className="text-rhino-900">Gastgegevens:</strong> namen en eventueel
                e-mailadressen van gasten die jij toevoegt, plus de RSVP-antwoorden (zoals
                aanwezigheid en dieetwensen) die gasten zelf doorgeven.
              </li>
              <li>
                <strong className="text-rhino-900">Cadeaulijstbijdragen:</strong> naam, e-mailadres
                en eventueel een persoonlijk bericht van gasten die een cadeau reserveren of een
                bijdrage toezeggen. Betalingen verlopen rechtstreeks tussen gast en bruidspaar; wij
                verwerken geen betaalgegevens van gasten.
              </li>
              <li>
                <strong className="text-rhino-900">Technische gegevens:</strong> beperkte logs die
                nodig zijn om de dienst veilig en stabiel te houden.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-xl font-medium text-rhino-900">
              3. Waarvoor gebruiken we je gegevens?
            </h2>
            <p className="mt-3">
              We gebruiken je gegevens uitsluitend om de trouwplanner te laten werken: inloggen,
              samenwerken met je partner en getuigen, je trouwwebsite en cadeaulijst tonen aan
              gasten, RSVP&apos;s verzamelen en e-mailnotificaties versturen (zoals uitnodigingen,
              RSVP-bevestigingen en herinneringen). De grondslag hiervoor is de uitvoering van de
              overeenkomst die we met je hebben zodra je een account aanmaakt.
            </p>
            <p className="mt-3">
              We verkopen geen gegevens, tonen geen advertenties en gebruiken geen
              advertentie-tracking.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-medium text-rhino-900">4. AI-functies</h2>
            <p className="mt-3">
              Ons Trouwplan bevat AI-functies, zoals budgetadvies en taakvoorstellen. Als je deze
              gebruikt, sturen we de daarvoor relevante planningsgegevens (bijvoorbeeld je budget,
              trouwdatum en takenlijst) naar onze AI-dienstverlener (Google) om het advies te
              genereren. We sturen daarbij geen gastenlijsten of e-mailadressen van gasten mee.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-medium text-rhino-900">
              5. Met wie delen we gegevens?
            </h2>
            <p className="mt-3">
              We gebruiken een klein aantal verwerkers om de dienst te leveren:
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>
                <strong className="text-rhino-900">Supabase</strong> — database en authenticatie.
                Je gegevens worden opgeslagen binnen de Europese Unie (regio Ierland).
              </li>
              <li>
                <strong className="text-rhino-900">Vercel</strong> — hosting van de applicatie.
              </li>
              <li>
                <strong className="text-rhino-900">Resend</strong> — het versturen van e-mails,
                zoals uitnodigingen en bevestigingen.
              </li>
              <li>
                <strong className="text-rhino-900">Google</strong> — het genereren van AI-advies
                (alleen wanneer je een AI-functie gebruikt).
              </li>
            </ul>
            <p className="mt-3">
              Verder delen we gegevens alleen als de wet ons daartoe verplicht. Let op: de inhoud
              van je trouwwebsite en cadeaulijst is bedoeld om te delen en is zichtbaar voor
              iedereen met de link.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-medium text-rhino-900">
              6. Gegevens van je gasten
            </h2>
            <p className="mt-3">
              Als je gastgegevens invoert, ben jij ervoor verantwoordelijk dat je dat mag doen.
              Wij verwerken deze gegevens alleen om jouw bruiloft te helpen plannen en gebruiken
              ze nergens anders voor. Gasten die hun gegevens via een RSVP- of cadeaulijstpagina
              achterlaten, kunnen via het bruidspaar of via ons om inzage of verwijdering vragen.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-medium text-rhino-900">7. Cookies</h2>
            <p className="mt-3">
              We gebruiken alleen functionele cookies die nodig zijn om je in te laten loggen en
              ingelogd te houden. We gebruiken geen tracking- of advertentiecookies en geen
              analytics van derden.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-medium text-rhino-900">8. Bewaartermijnen</h2>
            <p className="mt-3">
              We bewaren je gegevens zolang je account bestaat. Verwijder je je account, dan
              verwijderen we je accountgegevens en de bijbehorende bruiloftgegevens. Logs worden
              automatisch na korte tijd opgeruimd.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-medium text-rhino-900">9. Jouw rechten</h2>
            <p className="mt-3">
              Je hebt het recht op inzage, correctie, verwijdering en overdraagbaarheid van je
              gegevens, en het recht om bezwaar te maken tegen een verwerking. Stuur daarvoor een
              e-mail naar{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-rhino-900 underline">
                {CONTACT_EMAIL}
              </a>
              . Ben je het niet eens met hoe we met je gegevens omgaan, dan kun je een klacht
              indienen bij de Autoriteit Persoonsgegevens.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-xl font-medium text-rhino-900">10. Wijzigingen</h2>
            <p className="mt-3">
              We kunnen deze privacyverklaring aanpassen. De actuele versie staat altijd op deze
              pagina; bij ingrijpende wijzigingen informeren we je via de app of per e-mail.
            </p>
          </section>
        </div>
      </article>
    </div>
  )
}

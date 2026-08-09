import type { Metadata } from "next";
import Link from "next/link";
import FaqList from "@/components/FaqList";
import PhotoCredits from "@/components/PhotoCredits";
import VlogCompareTable from "@/components/VlogCompareTable";
import VlogPicker, { type PickCard, type PickerOption } from "@/components/VlogPicker";
import VlogRankEntry from "@/components/VlogRankEntry";
import {
  EXTERNAL_REVIEW_DISCLOSURE,
  getExternalReviews,
} from "@/lib/external-reviews";
import { getProducts } from "@/lib/products";
import { absoluteUrl } from "@/lib/site";
import type { Product } from "@/lib/types";
import {
  CRITERIA,
  NOT_SELECTED,
  VLOGGER_PROFILES,
  VLOG_DISCLOSURE,
  VLOG_FAQ,
  VLOG_TOP10,
} from "@/lib/vlog";
import { highlightChips } from "@/lib/vlog-format";

/**
 * Statisch renderen: de rangschikking en de teksten komen uit de repo en veranderen
 * alleen bij een deploy. Alleen prijs en voorraad komen uit de feed, en daarvoor is een
 * uurlijkse hervalidatie ruim genoeg — dat is dezelfde frequentie waarmee de feed zelf
 * ververst.
 */
export const revalidate = 3600;

const TITLE = "Beste vlogcamera's 2026: top 10 vergeleken op wat écht telt";
const DESCRIPTION =
  "Tien vlogcamera's vergeleken op klapscherm, microfoon-ingang, stabilisatie en opnameduur — " +
  "met de oordelen van andere reviewsites erbij en een keuzehulp die uitlegt waarom.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: absoluteUrl("/vlogcameras") },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl("/vlogcameras"),
    type: "article",
    locale: "nl_NL",
  },
};

/** Eén plek in de lijst, met het bijbehorende product uit de feed erbij gezocht. */
type RankedEntry = {
  rank: number;
  product: Product;
  entry: (typeof VLOG_TOP10)[number];
};

function toPickCard(product: Product, rank: number, reason: string): PickCard {
  return {
    id: product.id,
    title: product.title,
    brand: product.brand,
    image_url: product.image_url,
    affiliate_url: product.affiliate_url,
    rank,
    reason,
    chips: highlightChips(product),
  };
}

export default async function VlogCamerasPage() {
  const products = await getProducts();
  const byId = new Map(products.map((product) => [product.id, product]));

  // Een camera uit de rangschikking die (nog) niet in de feed staat — bijvoorbeeld omdat
  // de import na een migratie nog moet draaien — slaan we over in plaats van de pagina te
  // laten omvallen. De nummering volgt daarna de daadwerkelijk getoonde lijst.
  const ranked: RankedEntry[] = VLOG_TOP10.flatMap((entry) => {
    const product = byId.get(entry.id);
    return product ? [{ rank: 0, product, entry }] : [];
  }).map((item, index) => ({ ...item, rank: index + 1 }));

  const rankOf = new Map(ranked.map((item) => [item.product.id, item.rank]));

  const pickerOptions: PickerOption[] = VLOGGER_PROFILES.flatMap((profile) => {
    const pick = byId.get(profile.pickId);
    const alternative = byId.get(profile.alternativeId);
    if (!pick || !alternative) return [];
    return [
      {
        slug: profile.slug,
        label: profile.label,
        situation: profile.situation,
        decisive: profile.decisive,
        pick: toPickCard(pick, rankOf.get(pick.id) ?? 0, profile.pickReason),
        alternative: toPickCard(
          alternative,
          rankOf.get(alternative.id) ?? 0,
          profile.alternativeReason,
        ),
      },
    ];
  });

  const allReviews = ranked.flatMap((item) => getExternalReviews(item.product.id));
  const uniqueSources = new Set(allReviews.map((review) => review.source));

  // ItemList met Product-items. Bewust zonder aggregateRating: de sterrenscores in deze
  // demo zijn voorbeeldwaarden en de cijfers van andere reviewsites zijn niet van ons —
  // beide als eigen beoordeling markeren zou onjuiste structured data opleveren.
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: TITLE,
    description: DESCRIPTION,
    url: absoluteUrl("/vlogcameras"),
    numberOfItems: ranked.length,
    // Positie 1 is de beste keuze, dus aflopend van waarde.
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: ranked.map(({ rank, product }) => ({
      "@type": "ListItem",
      position: rank,
      item: {
        "@type": "Product",
        name: product.title,
        url: absoluteUrl(`/camera/${product.id}`),
        brand: { "@type": "Brand", name: product.brand },
        ...(product.image_url ? { image: product.image_url } : {}),
        ...(product.description ? { description: product.description } : {}),
        // Alleen een offer als er een prijs uit de feed is. Geen prijs betekent hier ook
        // geen aanbod-markup, in plaats van een verzonnen bedrag.
        ...(product.price !== null
          ? {
              offers: {
                "@type": "Offer",
                priceCurrency: "EUR",
                price: product.price,
                url: product.affiliate_url,
              },
            }
          : {}),
      },
    })),
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: VLOG_FAQ.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <main>
      <script
        type="application/ld+json"
        // De inhoud is door ons opgebouwd uit eigen data, niet uit gebruikersinvoer.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden bg-brand">
        {/* Zachte lichtvlek voor diepte. pointer-events-none zodat hij niets afvangt. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-white/10 blur-3xl"
        />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:py-16">
          <nav aria-label="Kruimelpad" className="mb-5 text-sm text-white/70">
            <Link href="/" className="hover:text-white hover:underline">
              Home
            </Link>
            <span className="mx-2" aria-hidden="true">
              /
            </span>
            <span className="text-white">Beste vlogcamera&apos;s</span>
          </nav>

          <p className="text-sm font-bold uppercase tracking-wider text-white/70">
            Koopgids · bijgewerkt augustus 2026
          </p>
          <h1 className="mt-2 max-w-4xl text-3xl font-extrabold leading-tight text-white sm:text-5xl">
            De beste vlogcamera&apos;s, vergeleken op wat je echt merkt
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">
            Niet op megapixels, maar op de vier dingen waar een vlog op stukloopt: klapt het
            scherm naar je toe, kun je er een microfoon op kwijt, hoe lang loopt hij door en
            hoeveel weegt hij. Daarbij bundelen we per camera wat andere reviewsites
            concluderen, met bron en datum.
          </p>

          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
            {[
              { value: `${ranked.length}`, label: "Camera's in deze gids" },
              { value: `${allReviews.length}`, label: "Reviewconclusies gebundeld" },
              { value: `${uniqueSources.size}`, label: "Externe reviewsites" },
              { value: "10", label: "Vlog-specs per camera" },
            ].map((stat) => (
              <div key={stat.label}>
                <dt className="sr-only">{stat.label}</dt>
                <dd>
                  <span className="block text-2xl font-bold text-white sm:text-3xl">
                    {stat.value}
                  </span>
                  <span className="text-sm text-white/70">{stat.label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Sprongnavigatie: bij een lijst van tien wil je direct naar een nummer kunnen. */}
        <nav aria-label="Naar een plek in de top 10" className="relative bg-brand-dark">
          <ol className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2">
            {ranked.map(({ rank, product }) => (
              <li key={product.id}>
                <a
                  href={`#nr-${rank}`}
                  className="flex whitespace-nowrap rounded-sm px-3 py-1.5 text-sm text-white/85 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <span className="mr-1.5 font-bold tabular-nums">{rank}</span>
                  {product.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </section>

      {/* ------------------------------------------------------------ Keuzehulp */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">
          Keuzehulp: welke past bij jou?
        </h2>
        <p className="mt-2 max-w-2xl text-ink-muted">
          Er is geen beste vlogcamera, alleen een beste voor jouw manier van filmen. Kies
          hieronder je situatie.
        </p>
        <div className="mt-6">
          {pickerOptions.length > 0 ? (
            <VlogPicker options={pickerOptions} />
          ) : (
            <p className="rounded-panel border border-line bg-card p-6 text-ink-muted">
              De keuzehulp is even niet beschikbaar omdat de catalogus nog geladen wordt.
            </p>
          )}
        </div>
      </section>

      {/* --------------------------------------------------------------- Top 10 */}
      <section className="mx-auto max-w-7xl px-4 pb-10 sm:pb-14">
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">
          De top 10, van beste naar meest specialistisch
        </h2>
        <p className="mt-2 max-w-3xl text-ink-muted">
          De volgorde volgt hoe compleet een camera is voor vloggen in het algemeen. Verder
          naar onderen worden de toestellen niet slechter, maar wel specialistischer: ze doen
          één ding uitzonderlijk goed en laten iets anders vallen. Bij elke plek staat welke
          concessie dat is.
        </p>

        <div className="mt-6 space-y-6">
          {ranked.map(({ rank, product, entry }) => (
            <VlogRankEntry
              key={product.id}
              rank={rank}
              product={product}
              entry={entry}
              reviews={getExternalReviews(product.id)}
            />
          ))}
        </div>

        <p className="mt-6 rounded-card border border-line bg-card p-4 text-sm leading-relaxed text-ink-faint">
          {EXTERNAL_REVIEW_DISCLOSURE}
        </p>
      </section>

      {/* -------------------------------------------------- Vergelijkingstabel */}
      <section className="mx-auto max-w-7xl px-4 pb-10 sm:pb-14">
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">
          Alle tien naast elkaar
        </h2>
        <p className="mt-2 max-w-3xl text-ink-muted">
          Zoek je één ding — bijvoorbeeld welke modellen geen microfoon-ingang hebben — dan
          lees je dat hier in één kolom af. Een streepje betekent{" "}
          <strong className="font-semibold text-ink">niet geverifieerd</strong>, niet
          &ldquo;nee&rdquo;: dat veld stond niet op de officiële productpagina van de fabrikant.
        </p>

        <div className="mt-6">
          <VlogCompareTable products={ranked.map((item) => item.product)} />
        </div>

        <p className="mt-3 text-sm leading-relaxed text-ink-faint">
          Let op bij de accuduur: fabrikanten meten verschillend. De Sony-, Canon- en
          Fujifilm-cijfers zijn CIPA-waarden voor werkelijke video-opname; DJI meet met het
          scherm uit op 1080p/24. Vergelijk die getallen dus als indicatie, niet als
          absolute rangorde.
        </p>
      </section>

      {/* ------------------------------------------------------------- Criteria */}
      <section className="bg-card py-10 sm:py-14">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-2xl font-bold text-ink sm:text-3xl">
            Waarom deze vier dingen, en niet megapixels
          </h2>
          <p className="mt-2 max-w-3xl text-ink-muted">
            Camerafabrikanten adverteren met resolutie omdat het een groot getal is dat
            makkelijk stijgt. Voor vloggen is het bijna het minst belangrijke cijfer op het
            doosje. Dit weegt wél.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {CRITERIA.map((criterion, index) => (
              <div
                key={criterion.title}
                className="rounded-panel border border-line bg-page p-5 sm:p-6"
              >
                <div className="flex items-baseline gap-3">
                  <span
                    className="text-2xl font-extrabold tabular-nums text-brand/25"
                    aria-hidden="true"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-lg font-bold text-ink">{criterion.title}</h3>
                </div>
                <p className="mt-2 leading-relaxed text-ink-muted">{criterion.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- Niet in de lijst */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">Wat er bewust níét in staat</h2>
        <p className="mt-2 max-w-3xl text-ink-muted">
          Een lijst wordt pas bruikbaar als je ook weet wat is afgevallen.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {NOT_SELECTED.map((item) => (
            <div key={item.model} className="rounded-panel border border-line bg-card p-5 sm:p-6">
              <h3 className="font-bold text-ink">{item.model}</h3>
              <p className="mt-1.5 leading-relaxed text-ink-muted">{item.reason}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------------------ FAQ */}
      <section className="mx-auto max-w-7xl px-4 pb-10 sm:pb-14">
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">
          Vragen die beginnende vloggers stellen
        </h2>
        <div className="mt-6 max-w-4xl">
          <FaqList items={VLOG_FAQ} />
        </div>
      </section>

      {/* ----------------------------------------------------- Verantwoording */}
      <section className="mx-auto max-w-7xl px-4 pb-12">
        <div className="max-w-4xl rounded-panel border border-line bg-card p-5 sm:p-6">
          <h2 className="text-lg font-bold text-ink">Hoe deze gids tot stand komt</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{VLOG_DISCLOSURE}</p>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            Wij ontvangen commissie wanneer je via onze links iets koopt. Dat kost jou niets
            extra en verandert niets aan de volgorde hierboven: die volgt uit de
            specificaties en de gepubliceerde reviews, niet uit de vergoeding per winkel.
          </p>
          <p className="mt-3 text-sm">
            <Link href="/vergelijk" className="font-semibold text-brand hover:underline">
              Zelf twee of drie camera&apos;s naast elkaar leggen &rarr;
            </Link>
          </p>
        </div>

        <div className="mt-4 max-w-4xl">
          <PhotoCredits products={ranked.map((item) => item.product)} />
        </div>
      </section>
    </main>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import AffiliateButton from "@/components/AffiliateButton";
import PriceTag from "@/components/PriceTag";
import ProsCons from "@/components/ProsCons";
import SpecsTable from "@/components/SpecsTable";
import StarRating from "@/components/StarRating";
import { getProduct, getProducts } from "@/lib/products";
import { REVIEW_DISCLOSURE, getReview } from "@/lib/reviews";

// params is in Next 15 een Promise en moet awaited worden.
type Props = { params: Promise<{ id: string }> };

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((product) => ({ id: product.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) return { title: "Camera niet gevonden" };

  return {
    title: `${product.title} review, prijs en specificaties`,
    description: product.description ?? undefined,
  };
}

export default async function CameraPage({ params }: Props) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  const review = getReview(product.id);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <nav aria-label="Kruimelpad" className="mb-4 text-sm text-ink-muted">
        <Link href="/" className="hover:text-brand hover:underline">
          Home
        </Link>
        <span className="mx-2" aria-hidden="true">
          /
        </span>
        <Link href={`/?brand=${product.brand}`} className="hover:text-brand hover:underline">
          {product.brand}
        </Link>
        <span className="mx-2" aria-hidden="true">
          /
        </span>
        <span className="text-ink">{product.title}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-card border border-line bg-card p-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="relative aspect-square">
              {product.image_url && (
                <Image
                  src={product.image_url}
                  alt={product.title}
                  fill
                  sizes="(max-width: 640px) 100vw, 40vw"
                  className="object-contain"
                  priority
                />
              )}
            </div>

            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-ink-faint">
                {product.brand}
              </p>
              <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">{product.title}</h1>

              <div className="mt-3">
                <StarRating
                  rating={product.rating}
                  reviewCount={product.review_count}
                  size="md"
                />
              </div>

              <p className="mt-4 leading-relaxed text-ink-muted">{product.description}</p>

              <p className="mt-4 inline-block rounded-sm bg-brand-light px-2 py-1 text-xs font-semibold text-brand">
                {product.category}
              </p>
            </div>
          </div>

          <hr className="my-6 border-line" />

          <h2 className="mb-4 text-lg font-bold text-ink">Plus- en minpunten</h2>
          <ProsCons pros={product.pros} cons={product.cons} />

          {review && (
            <>
              <hr className="my-6 border-line" />
              <h2 className="mb-2 text-lg font-bold text-ink">Onze beoordeling</h2>
              <p className="mb-4 border-l-4 border-cta pl-4 text-base font-semibold text-ink">
                {review.verdict}
              </p>

              <div className="space-y-4">
                {review.body.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)} className="leading-relaxed text-ink-muted">
                    {paragraph}
                  </p>
                ))}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-card bg-page p-4">
                  <p className="mb-1 text-sm font-bold text-good">Geschikt voor</p>
                  <p className="text-sm text-ink-muted">{review.bestFor}</p>
                </div>
                <div className="rounded-card bg-page p-4">
                  <p className="mb-1 text-sm font-bold text-bad">Minder geschikt voor</p>
                  <p className="text-sm text-ink-muted">{review.notFor}</p>
                </div>
              </div>

              <p className="mt-4 text-xs leading-relaxed text-ink-faint">{REVIEW_DISCLOSURE}</p>
            </>
          )}

          <hr className="my-6 border-line" />

          <h2 className="mb-4 text-lg font-bold text-ink">Specificaties</h2>
          <div className="overflow-hidden rounded-card border border-line">
            <SpecsTable specs={product.specs} />
          </div>
        </div>

        {/* Koopblok blijft bij het scrollen in beeld: op een affiliate-site is dit de
            enige plek waar conversie gebeurt. */}
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-card border border-line bg-card p-5">
            <PriceTag price={product.price} oldPrice={product.old_price} size="lg" />

            <p className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-good">
              <span aria-hidden="true">&#10003;</span> Op voorraad bij Coolblue
            </p>
            <p className="mt-1 text-sm text-ink-muted">Voor 23:59 besteld, morgen in huis</p>

            <AffiliateButton href={product.affiliate_url} size="lg" className="mt-4 w-full">
              Bekijk de beste prijs op Coolblue
            </AffiliateButton>

            <p className="mt-3 text-xs leading-relaxed text-ink-faint">
              Wij ontvangen commissie als je via deze link koopt. Dat kost jou niets extra.
              Prijzen kunnen afwijken; de prijs bij Coolblue is leidend.
            </p>

            <hr className="my-4 border-line" />

            <Link
              href="/vergelijk"
              className="block text-center text-sm font-semibold text-brand hover:underline"
            >
              Vergelijk met andere camera&apos;s
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}

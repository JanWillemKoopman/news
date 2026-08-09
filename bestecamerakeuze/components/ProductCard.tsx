import Image from "next/image";
import Link from "next/link";
import AffiliateButton from "./AffiliateButton";
import PriceTag from "./PriceTag";
import StarRating from "./StarRating";
import type { Product } from "@/lib/types";

type Props = {
  product: Product;
  /** Zet een schildje op de kaart: de hoogst beoordeelde krijgt "Beste keuze". */
  badge?: "beste-keuze" | "populair" | null;
};

const BADGE_STYLES = {
  "beste-keuze": { label: "Beste keuze", className: "bg-brand text-white" },
  populair: { label: "Populair", className: "bg-brand-light text-brand" },
} as const;

export default function ProductCard({ product, badge }: Props) {
  const badgeConfig = badge ? BADGE_STYLES[badge] : null;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-card border border-line bg-card transition-shadow hover:shadow-md">
      {badgeConfig && (
        <span
          className={`absolute left-3 top-3 z-10 rounded-sm px-2 py-1 text-xs font-bold ${badgeConfig.className}`}
        >
          {badgeConfig.label}
        </span>
      )}

      <Link href={`/camera/${product.id}`} className="block bg-white p-4">
        <div className="relative aspect-square">
          {product.image_url && (
            <Image
              src={product.image_url}
              alt={product.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-contain transition-transform duration-200 group-hover:scale-[1.03]"
            />
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col gap-2 border-t border-line p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
          {product.brand}
        </p>

        <h2 className="text-sm leading-snug font-semibold">
          <Link href={`/camera/${product.id}`} className="text-ink hover:text-brand hover:underline">
            {product.title}
          </Link>
        </h2>

        <StarRating rating={product.rating} reviewCount={product.review_count} />

        {product.pros.length > 0 && (
          <ul className="mt-1 space-y-1">
            {product.pros.slice(0, 2).map((pro) => (
              <li key={pro} className="flex gap-1.5 text-xs text-ink-muted">
                <span className="text-good" aria-hidden="true">
                  &#10003;
                </span>
                <span className="line-clamp-1">{pro}</span>
              </li>
            ))}
          </ul>
        )}

        {/* mt-auto duwt prijs en knop naar de onderkant, zodat kaarten met verschillend
            lange titels toch een uitgelijnde onderrand houden. */}
        <div className="mt-auto pt-3">
          <PriceTag price={product.price} oldPrice={product.old_price} />
          {/* Voorraad komt uit dezelfde feed als de prijs. Ontbreekt de prijs, dan weten we
              de voorraad ook niet en beloven we hier niets. */}
          {product.price !== null && <p className="mt-1 text-xs text-good">Op voorraad bij Coolblue</p>}
          <AffiliateButton href={product.affiliate_url} className="mt-3 w-full">
            Bekijk op Coolblue
          </AffiliateButton>
        </div>
      </div>
    </article>
  );
}

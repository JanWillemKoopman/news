import Image from "next/image";
import Link from "next/link";
import AffiliateButton from "./AffiliateButton";
import ExternalReviewList from "./ExternalReviewList";
import PriceTag from "./PriceTag";
import type { ExternalReview } from "@/lib/external-reviews";
import type { Product } from "@/lib/types";
import type { VlogEntry } from "@/lib/vlog";
import { type Cell, highlightChips } from "@/lib/vlog-format";

type Props = {
  rank: number;
  product: Product;
  entry: VlogEntry;
  reviews: ExternalReview[];
};

const CHIP_TONE: Record<Cell["tone"], string> = {
  good: "bg-good-light text-good",
  bad: "bg-bad-light text-bad",
  neutral: "bg-page text-ink-muted",
  unknown: "bg-page text-ink-faint",
};

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs font-bold uppercase tracking-wide text-ink-faint">{title}</h4>
      <p className="mt-1 text-sm leading-relaxed text-ink-muted">{children}</p>
    </div>
  );
}

/**
 * Eén plek in de top 10. De volgorde van de blokken is de volgorde waarin iemand een
 * aankoopbeslissing neemt: eerst waarom dit toestel hier staat, dan of jij die persoon
 * bent, en pas daarna wat je ervoor inlevert. Die laatste staat er expliciet omdat elke
 * camera in deze lijst een concessie heeft en het verzwijgen daarvan het snelst
 * terugkomt als een retour.
 */
export default function VlogRankEntry({ rank, product, entry, reviews }: Props) {
  const chips = highlightChips(product);

  return (
    <article
      id={`nr-${rank}`}
      className="scroll-mt-4 overflow-hidden rounded-panel border border-line bg-card"
    >
      <div className="grid gap-0 lg:grid-cols-[300px_1fr]">
        {/* Beeldkolom met het rangnummer. Op mobiel staat die boven de tekst. */}
        <div className="relative flex items-center gap-4 border-b border-line bg-page p-5 lg:flex-col lg:justify-center lg:border-b-0 lg:border-r">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand text-2xl font-extrabold tabular-nums text-white lg:absolute lg:left-4 lg:top-4 lg:h-12 lg:w-12 lg:text-xl"
            aria-hidden="true"
          >
            {rank}
          </span>
          <div className="relative h-28 w-full max-w-[200px] lg:h-48 lg:max-w-none">
            {product.image_url && (
              <Image
                src={product.image_url}
                alt={product.title}
                fill
                sizes="(max-width: 1024px) 40vw, 260px"
                className="object-contain"
              />
            )}
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
            Nummer {rank} · {product.brand}
          </p>
          <h3 className="mt-1 text-xl font-bold leading-tight text-ink sm:text-2xl">
            <Link href={`/camera/${product.id}`} className="hover:text-brand hover:underline">
              {product.title}
            </Link>
          </h3>

          <ul className="mt-3 flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <li
                key={`${chip.text}-${chip.srText ?? ""}`}
                className={`rounded-sm px-2 py-1 text-xs font-semibold ${CHIP_TONE[chip.tone]}`}
              >
                {chip.srText && <span className="sr-only">{chip.srText}: </span>}
                {chip.text}
              </li>
            ))}
          </ul>

          <p className="mt-4 leading-relaxed text-ink">{entry.why}</p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Block title="Wel voor jou als">{entry.forWho}</Block>
            <Block title="Niet voor jou als">{entry.notForWho}</Block>
          </div>

          <div className="mt-4 rounded-card border-l-4 border-bad bg-bad-light px-4 py-3">
            <h4 className="text-xs font-bold uppercase tracking-wide text-bad">
              Dit lever je in
            </h4>
            <p className="mt-1 text-sm leading-relaxed text-ink">{entry.tradeoff}</p>
          </div>

          <div className="mt-6 border-t border-line pt-5">
            <h4 className="mb-3 text-sm font-bold text-ink">Wat andere reviewsites vinden</h4>
            <ExternalReviewList productId={product.id} reviews={reviews} />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
            <PriceTag price={product.price} oldPrice={product.old_price} />
            <AffiliateButton href={product.affiliate_url}>Bekijk bij Coolblue</AffiliateButton>
          </div>
          <p className="mt-2 text-xs text-ink-faint">
            Koop je via deze link, dan ontvangen wij commissie. Dat kost jou niets extra.
          </p>
        </div>
      </div>
    </article>
  );
}

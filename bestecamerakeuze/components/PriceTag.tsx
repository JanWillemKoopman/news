import { discountPercentage, formatPrice, splitPrice } from "@/lib/format";

type Props = {
  price: number;
  oldPrice?: number | null;
  size?: "md" | "lg";
};

export default function PriceTag({ price, oldPrice, size = "md" }: Props) {
  const { whole, cents } = splitPrice(price);
  const discount = discountPercentage(price, oldPrice ?? null);

  return (
    <div className="flex flex-wrap items-baseline gap-2">
      {/* Het volledige bedrag staat als leesbare tekst in de a11y-tree; de opgesplitste
          weergave eronder is puur visueel. */}
      <span className="sr-only">{formatPrice(price)}</span>
      <span
        className={`font-bold tracking-tight text-ink ${size === "lg" ? "text-4xl" : "text-2xl"}`}
        aria-hidden="true"
      >
        <span className="mr-0.5 align-top text-[0.6em] font-semibold">€</span>
        {whole}
        <span className="ml-0.5 align-super text-[0.55em] font-semibold">{cents}</span>
      </span>

      {oldPrice && oldPrice > price && (
        <span className="text-sm text-ink-faint line-through">{formatPrice(oldPrice)}</span>
      )}

      {discount !== null && (
        <span className="rounded-sm bg-deal px-1.5 py-0.5 text-xs font-bold text-white">
          -{discount}%
        </span>
      )}
    </div>
  );
}

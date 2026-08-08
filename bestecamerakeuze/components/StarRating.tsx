type Props = {
  rating: number | null;
  reviewCount?: number;
  size?: "sm" | "md";
};

/** Eén ster, gevuld voor `fill` deel (0–1) via een clip op de gevulde kopie. */
function Star({ fill, className }: { fill: number; className: string }) {
  const path =
    "M10 1.5l2.6 5.3 5.9.86-4.25 4.14 1 5.85L10 14.9l-5.25 2.75 1-5.85L1.5 7.66l5.9-.86L10 1.5z";
  return (
    <span className={`relative inline-block ${className}`} aria-hidden="true">
      <svg viewBox="0 0 20 20" className="h-full w-full fill-line">
        <path d={path} />
      </svg>
      <span
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${Math.max(0, Math.min(1, fill)) * 100}%` }}
      >
        <svg viewBox="0 0 20 20" className="h-full w-full fill-star" style={{ width: "1em" }}>
          <path d={path} />
        </svg>
      </span>
    </span>
  );
}

export default function StarRating({ rating, reviewCount, size = "sm" }: Props) {
  if (rating === null) return null;

  const starSize = size === "md" ? "h-5 w-5" : "h-4 w-4";
  const label =
    reviewCount === undefined
      ? `${rating} van 5`
      : `${rating} van 5 op basis van ${reviewCount} reviews`;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5" role="img" aria-label={label}>
        {[0, 1, 2, 3, 4].map((index) => (
          <Star key={index} fill={rating - index} className={starSize} />
        ))}
      </div>
      <span
        className={`font-semibold text-ink ${size === "md" ? "text-base" : "text-sm"}`}
        aria-hidden="true"
      >
        {rating.toFixed(1).replace(".", ",")}
      </span>
      {reviewCount !== undefined && (
        <span
          className={`text-ink-muted ${size === "md" ? "text-sm" : "text-xs"}`}
          aria-hidden="true"
        >
          ({reviewCount})
        </span>
      )}
    </div>
  );
}

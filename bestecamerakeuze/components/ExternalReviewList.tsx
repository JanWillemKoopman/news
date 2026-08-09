import type { ExternalReview } from "@/lib/external-reviews";
import { reviewConsensus } from "@/lib/external-reviews";

type Props = {
  productId: string;
  reviews: ExternalReview[];
};

const DATE_FORMAT = new Intl.DateTimeFormat("nl-NL", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function formatDate(iso: string): string {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? iso : DATE_FORMAT.format(parsed);
}

function formatScore(score: number, scale: number): string {
  return `${score.toString().replace(".", ",")}/${scale}`;
}

/**
 * Wat andere reviewsites van deze camera vonden. Het gemiddelde staat er alleen als er
 * cijfers zijn om te middelen, met het aantal erbij: "8,4 uit 2 bronnen" is een ander
 * soort feit dan "8,4 uit 12 bronnen", en die nuance mag niet wegvallen achter één getal.
 */
export default function ExternalReviewList({ productId, reviews }: Props) {
  if (reviews.length === 0) {
    return (
      <p className="text-sm text-ink-faint">
        We hebben voor dit model nog geen reviewconclusies van andere sites verzameld.
      </p>
    );
  }

  const consensus = reviewConsensus(productId);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        {consensus.average10 !== null ? (
          <>
            <span className="inline-flex items-baseline gap-1 rounded-card bg-brand px-3 py-1.5 text-white">
              <span className="text-xl font-bold">
                {consensus.average10.toFixed(1).replace(".", ",")}
              </span>
              <span className="text-xs font-semibold text-white/80">/ 10</span>
            </span>
            <span className="text-sm text-ink-muted">
              gemiddelde van {consensus.scored}{" "}
              {consensus.scored === 1 ? "bron die een cijfer geeft" : "bronnen die een cijfer geven"}
              {consensus.total > consensus.scored &&
                ` (${consensus.total - consensus.scored} bron${
                  consensus.total - consensus.scored === 1 ? "" : "nen"
                } zonder cijfer)`}
            </span>
          </>
        ) : (
          <span className="text-sm text-ink-muted">
            Geen van deze {reviews.length === 1 ? "bron" : `${reviews.length} bronnen`} publiceert
            een cijfer — hieronder staat wat ze wél concluderen.
          </span>
        )}
      </div>

      <ul className="space-y-2.5">
        {reviews.map((review) => (
          <li
            key={review.url}
            className="rounded-card border border-line bg-page/60 p-3.5 sm:p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={review.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-bold text-brand hover:underline"
              >
                {review.source}
                <span className="sr-only"> (opent in een nieuw tabblad)</span>
              </a>

              {review.score !== null && review.scale !== null && (
                <span className="rounded-sm bg-brand-light px-2 py-0.5 text-xs font-bold text-brand">
                  {formatScore(review.score, review.scale)}
                </span>
              )}

              {review.award && (
                <span className="rounded-sm bg-good-light px-2 py-0.5 text-xs font-bold text-good">
                  {review.award}
                </span>
              )}

              <span className="ml-auto text-xs text-ink-faint">
                gelezen {formatDate(review.checkedOn)}
              </span>
            </div>

            <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{review.verdict}</p>

            {review.measured && (
              <p className="mt-1.5 border-l-2 border-line pl-3 text-sm leading-relaxed text-ink-faint">
                <span className="font-semibold text-ink-muted">Gemeten: </span>
                {review.measured}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

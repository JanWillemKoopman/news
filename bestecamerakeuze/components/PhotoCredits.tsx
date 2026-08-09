import { PHOTO_MISSING, getPhotoCredit } from "@/lib/photo-credits";
import type { Product } from "@/lib/types";

/**
 * Naamsvermelding voor de productfoto's. CC BY en CC BY-SA verplichten dit; we zetten
 * het gebundeld onderaan de pagina in plaats van onder elke kaart, zodat de lijst
 * leesbaar blijft en de kaarten dat niet worden.
 */
export default function PhotoCredits({ products }: { products: Product[] }) {
  const entries = products
    .map((product) => ({ product, credit: getPhotoCredit(product.id) }))
    .filter((entry): entry is { product: Product; credit: NonNullable<typeof entry.credit> } =>
      Boolean(entry.credit),
    );

  const missing = products.filter((product) => PHOTO_MISSING[product.id]);
  const anyModified = entries.some((entry) => entry.credit.modified);

  if (entries.length === 0 && missing.length === 0) return null;

  return (
    <div className="rounded-panel border border-line bg-card p-5 sm:p-6">
      <h2 className="text-lg font-bold text-ink">Fotoverantwoording</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        De productfoto&apos;s komen van Wikimedia Commons, niet van de fabrikanten of de
        winkel. Hieronder staat per camera wie de foto maakte en onder welke licentie.
      </p>

      <ul className="mt-4 space-y-1.5 text-sm text-ink-muted">
        {entries.map(({ product, credit }) => (
          <li key={product.id}>
            <span className="font-semibold text-ink">{product.title}</span> — foto{" "}
            <a
              href={credit.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:underline"
            >
              {credit.file}
            </a>{" "}
            van {credit.author}, licentie{" "}
            <a
              href={credit.licenseUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:underline"
            >
              {credit.license}
            </a>
            {credit.modified && <span className="text-ink-faint"> — door ons bijgesneden</span>}
          </li>
        ))}
      </ul>

      {anyModified && (
        <p className="mt-4 text-xs leading-relaxed text-ink-faint">
          Waar wij hebben bijgesneden om het toestel vrij te maken van de achtergrond, valt
          onze bewerking van een CC BY-SA-foto onder diezelfde CC BY-SA-licentie.
        </p>
      )}

      {missing.map((product) => (
        <p key={product.id} className="mt-3 text-xs leading-relaxed text-ink-faint">
          <span className="font-semibold text-ink-muted">{product.title}:</span>{" "}
          {PHOTO_MISSING[product.id]}
        </p>
      ))}
    </div>
  );
}

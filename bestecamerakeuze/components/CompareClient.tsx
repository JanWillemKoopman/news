"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import AffiliateButton from "./AffiliateButton";
import PriceTag from "./PriceTag";
import StarRating from "./StarRating";
import type { Product } from "@/lib/types";

const SLOTS = [0, 1, 2];

type Props = {
  products: Product[];
  /** Voorselectie uit de URL (?ids=CAM-001,CAM-002), zodat een vergelijking deelbaar is. */
  initialIds?: string[];
};

/** Cel-inhoud voor een lege slot, zodat de tabel zijn kolombreedte houdt. */
const EMPTY = <span className="text-ink-faint">—</span>;

export default function CompareClient({ products, initialIds = [] }: Props) {
  const [selected, setSelected] = useState<string[]>(() => {
    const valid = initialIds.filter((id) => products.some((p) => p.id === id));
    // Standaard de twee best beoordeelde, zodat de pagina nooit leeg opent.
    if (valid.length >= 2) return [...valid, "", ""].slice(0, 3);
    const fallback = [...products]
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, 2)
      .map((p) => p.id);
    return [fallback[0] ?? "", fallback[1] ?? "", ""];
  });

  const chosen = useMemo(
    () =>
      selected
        .map((id) => products.find((product) => product.id === id))
        .filter((product): product is Product => Boolean(product)),
    [selected, products],
  );

  // Alle spec-labels die in minstens één gekozen camera voorkomen, in de volgorde
  // waarin ze verschijnen — zo blijft de tabel kloppen ook als merken andere velden vullen.
  const specLabels = useMemo(() => {
    const labels: string[] = [];
    for (const product of chosen) {
      for (const label of Object.keys(product.specs)) {
        if (!labels.includes(label)) labels.push(label);
      }
    }
    return labels;
  }, [chosen]);

  // Alleen prijzen die uit de feed komen doen mee aan "laagste prijs"; een product zonder
  // prijs is niet goedkoop, het is onbekend.
  const knownPrices = chosen.map((p) => p.price).filter((price): price is number => price !== null);
  const lowestPrice = knownPrices.length > 1 ? Math.min(...knownPrices) : null;
  const highestRating = chosen.length > 1 ? Math.max(...chosen.map((p) => p.rating ?? 0)) : null;

  function setSlot(index: number, id: string) {
    setSelected((current) => current.map((value, i) => (i === index ? id : value)));
  }

  return (
    <>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {SLOTS.map((index) => (
          <div key={index}>
            <label
              htmlFor={`slot-${index}`}
              className="mb-1 block text-sm font-semibold text-ink"
            >
              Camera {index + 1}
              {index === 2 && <span className="font-normal text-ink-faint"> (optioneel)</span>}
            </label>
            <select
              id={`slot-${index}`}
              value={selected[index] ?? ""}
              onChange={(event) => setSlot(index, event.target.value)}
              className="w-full rounded-card border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand"
            >
              <option value="">Kies een camera…</option>
              {products.map((product) => (
                <option
                  key={product.id}
                  value={product.id}
                  // Voorkom dat dezelfde camera in twee kolommen staat.
                  disabled={selected.includes(product.id) && selected[index] !== product.id}
                >
                  {product.title}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {chosen.length < 2 ? (
        <div className="rounded-card border border-line bg-card p-10 text-center">
          <p className="font-semibold text-ink">Kies minimaal twee camera&apos;s</p>
          <p className="mt-1 text-sm text-ink-muted">
            Selecteer hierboven twee of drie camera&apos;s om ze naast elkaar te leggen.
          </p>
        </div>
      ) : (
        // `relative` houdt de absoluut gepositioneerde sr-only-teksten (caption, prijs)
        // binnen deze scroller; zonder positioned ancestor scrollt de hele pagina mee.
        <div className="relative overflow-x-auto rounded-card border border-line bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <caption className="sr-only">
              Vergelijking van {chosen.map((p) => p.title).join(", ")}
            </caption>
            <thead>
              <tr>
                <th scope="col" className="w-40 border-b border-line p-4 text-left align-bottom">
                  <span className="sr-only">Eigenschap</span>
                </th>
                {chosen.map((product) => (
                  <th
                    key={product.id}
                    scope="col"
                    className="border-b border-l border-line p-4 text-left align-bottom"
                  >
                    <div className="relative mx-auto mb-3 h-28 w-28">
                      {product.image_url && (
                        <Image
                          src={product.image_url}
                          alt={product.title}
                          fill
                          sizes="112px"
                          className="object-contain"
                        />
                      )}
                    </div>
                    <Link
                      href={`/camera/${product.id}`}
                      className="font-semibold text-ink hover:text-brand hover:underline"
                    >
                      {product.title}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              <tr>
                <th scope="row" className="border-b border-line p-4 text-left font-semibold text-ink-muted">
                  Prijs
                </th>
                {chosen.map((product) => (
                  <td key={product.id} className="border-b border-l border-line p-4">
                    <PriceTag price={product.price} oldPrice={product.old_price} />
                    {product.price === lowestPrice && (
                      <span className="mt-1.5 inline-block rounded-sm bg-good px-1.5 py-0.5 text-xs font-bold text-white">
                        Laagste prijs
                      </span>
                    )}
                  </td>
                ))}
              </tr>

              <tr>
                <th scope="row" className="border-b border-line p-4 text-left font-semibold text-ink-muted">
                  Beoordeling
                </th>
                {chosen.map((product) => (
                  <td key={product.id} className="border-b border-l border-line p-4">
                    <StarRating rating={product.rating} reviewCount={product.review_count} />
                    {(product.rating ?? 0) === highestRating && (
                      <span className="mt-1.5 inline-block rounded-sm bg-brand px-1.5 py-0.5 text-xs font-bold text-white">
                        Best beoordeeld
                      </span>
                    )}
                  </td>
                ))}
              </tr>

              <tr>
                <th scope="row" className="border-b border-line p-4 text-left font-semibold text-ink-muted">
                  Type
                </th>
                {chosen.map((product) => (
                  <td key={product.id} className="border-b border-l border-line p-4 text-ink">
                    {product.category}
                  </td>
                ))}
              </tr>

              {specLabels.map((label) => (
                <tr key={label}>
                  <th
                    scope="row"
                    className="border-b border-line p-4 text-left font-semibold text-ink-muted"
                  >
                    {label}
                  </th>
                  {chosen.map((product) => (
                    <td key={product.id} className="border-b border-l border-line p-4 text-ink">
                      {product.specs[label] ?? EMPTY}
                    </td>
                  ))}
                </tr>
              ))}

              <tr>
                <th scope="row" className="border-b border-line p-4 text-left align-top font-semibold text-ink-muted">
                  Pluspunten
                </th>
                {chosen.map((product) => (
                  <td key={product.id} className="border-b border-l border-line p-4 align-top">
                    <ul className="space-y-1">
                      {product.pros.map((pro) => (
                        <li key={pro} className="flex gap-1.5 text-ink-muted">
                          <span className="text-good" aria-hidden="true">
                            &#10003;
                          </span>
                          {pro}
                        </li>
                      ))}
                    </ul>
                  </td>
                ))}
              </tr>

              <tr>
                <th scope="row" className="border-b border-line p-4 text-left align-top font-semibold text-ink-muted">
                  Minpunten
                </th>
                {chosen.map((product) => (
                  <td key={product.id} className="border-b border-l border-line p-4 align-top">
                    <ul className="space-y-1">
                      {product.cons.map((con) => (
                        <li key={con} className="flex gap-1.5 text-ink-muted">
                          <span className="text-bad" aria-hidden="true">
                            &#10007;
                          </span>
                          {con}
                        </li>
                      ))}
                    </ul>
                  </td>
                ))}
              </tr>

              <tr>
                <th scope="row" className="p-4">
                  <span className="sr-only">Bestellen</span>
                </th>
                {chosen.map((product) => (
                  <td key={product.id} className="border-l border-line p-4">
                    <AffiliateButton href={product.affiliate_url} className="w-full">
                      Bekijk op Coolblue
                    </AffiliateButton>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

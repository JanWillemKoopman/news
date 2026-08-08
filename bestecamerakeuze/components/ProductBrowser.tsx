"use client";

import { useMemo, useState } from "react";
import ProductCard from "./ProductCard";
import type { Product } from "@/lib/types";

type Budget = "alle" | "tot-1000" | "1000-2000" | "vanaf-2000";
type SortKey = "populair" | "prijs-op" | "prijs-af";

type Props = {
  products: Product[];
  brands: string[];
  categories: string[];
  /** Beginwaarden uit de URL, zodat de categorie-links in de header meteen filteren. */
  initialQuery?: string;
  initialBrand?: string;
  initialCategory?: string;
};

const BUDGETS: { value: Budget; label: string; test: (price: number) => boolean }[] = [
  { value: "alle", label: "Alle prijzen", test: () => true },
  { value: "tot-1000", label: "Tot € 1.000", test: (p) => p < 1000 },
  { value: "1000-2000", label: "€ 1.000 – € 2.000", test: (p) => p >= 1000 && p < 2000 },
  { value: "vanaf-2000", label: "Vanaf € 2.000", test: (p) => p >= 2000 },
];

const SELECT_CLASS =
  "rounded-card border border-line bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand";

export default function ProductBrowser({
  products,
  brands,
  categories,
  initialQuery = "",
  initialBrand = "",
  initialCategory = "",
}: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [brand, setBrand] = useState(initialBrand);
  const [category, setCategory] = useState(initialCategory);
  const [budget, setBudget] = useState<Budget>("alle");
  const [sort, setSort] = useState<SortKey>("populair");

  // Het "Beste keuze"-schildje hoort bij de objectief hoogst beoordeelde camera uit de
  // hele catalogus — niet bij de bovenste kaart van een toevallige filtering.
  const bestId = useMemo(() => {
    return products.reduce<Product | null>(
      (best, p) => ((p.rating ?? 0) > (best?.rating ?? 0) ? p : best),
      null,
    )?.id;
  }, [products]);

  const mostReviewedId = useMemo(() => {
    return products.reduce<Product | null>(
      (top, p) => (p.review_count > (top?.review_count ?? 0) ? p : top),
      null,
    )?.id;
  }, [products]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const budgetTest = BUDGETS.find((b) => b.value === budget)!.test;

    const filtered = products.filter((product) => {
      if (brand && product.brand !== brand) return false;
      if (category && product.category !== category) return false;
      if (!budgetTest(product.price)) return false;
      if (!needle) return true;
      return `${product.title} ${product.brand} ${product.category}`
        .toLowerCase()
        .includes(needle);
    });

    // Kopie sorteren: products is een prop en mag niet ter plaatse omgegooid worden.
    return [...filtered].sort((a, b) => {
      if (sort === "prijs-op") return a.price - b.price;
      if (sort === "prijs-af") return b.price - a.price;
      return (b.rating ?? 0) - (a.rating ?? 0);
    });
  }, [products, query, brand, category, budget, sort]);

  const hasFilters = Boolean(query || brand || category || budget !== "alle");

  return (
    <div>
      <div className="mb-6 rounded-card border border-line bg-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex-1">
            <label htmlFor="filter-search" className="sr-only">
              Zoek een camera
            </label>
            <input
              id="filter-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Zoek op merk of model, bijv. Fujifilm of A7 IV"
              className="w-full rounded-card border border-line px-4 py-2.5 text-sm outline-none focus:border-brand"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={brand}
              onChange={(event) => setBrand(event.target.value)}
              className={SELECT_CLASS}
              aria-label="Filter op merk"
            >
              <option value="">Alle merken</option>
              {brands.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className={SELECT_CLASS}
              aria-label="Filter op type"
            >
              <option value="">Alle types</option>
              {categories.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <select
              value={budget}
              onChange={(event) => setBudget(event.target.value as Budget)}
              className={SELECT_CLASS}
              aria-label="Filter op budget"
            >
              {BUDGETS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as SortKey)}
              className={SELECT_CLASS}
              aria-label="Sorteren"
            >
              <option value="populair">Best beoordeeld</option>
              <option value="prijs-op">Prijs oplopend</option>
              <option value="prijs-af">Prijs aflopend</option>
            </select>
          </div>
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setBrand("");
              setCategory("");
              setBudget("alle");
            }}
            className="mt-3 text-sm font-semibold text-brand hover:underline"
          >
            Filters wissen
          </button>
        )}
      </div>

      <p className="mb-4 text-sm text-ink-muted" aria-live="polite">
        {visible.length} {visible.length === 1 ? "camera" : "camera's"} gevonden
      </p>

      {visible.length === 0 ? (
        <div className="rounded-card border border-line bg-card p-10 text-center">
          <p className="font-semibold text-ink">Geen camera&apos;s gevonden</p>
          <p className="mt-1 text-sm text-ink-muted">
            Probeer een andere zoekterm of zet een filter uit.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              badge={
                product.id === bestId
                  ? "beste-keuze"
                  : product.id === mostReviewedId
                    ? "populair"
                    : null
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

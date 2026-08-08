import type { Metadata } from "next";
import CompareClient from "@/components/CompareClient";
import { getProducts } from "@/lib/products";

export const metadata: Metadata = {
  title: "Camera's vergelijken",
  description:
    "Leg twee of drie fotocamera's naast elkaar en vergelijk prijs, sensor, videoresolutie en gewicht.",
};

type Props = { searchParams: Promise<{ ids?: string }> };

export default async function ComparePage({ searchParams }: Props) {
  const [params, products] = await Promise.all([searchParams, getProducts()]);
  const initialIds = params.ids?.split(",").filter(Boolean) ?? [];

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold text-ink sm:text-3xl">Camera&apos;s vergelijken</h1>
      <p className="mt-2 max-w-2xl text-ink-muted">
        Kies twee of drie camera&apos;s en zie in één oogopslag waar ze van elkaar verschillen.
      </p>

      <div className="mt-6">
        <CompareClient products={products} initialIds={initialIds} />
      </div>
    </main>
  );
}

import ProductBrowser from "@/components/ProductBrowser";
import { getFacets, getProducts } from "@/lib/products";

// searchParams is in Next 15 een Promise en moet awaited worden.
type Props = {
  searchParams: Promise<{ q?: string; brand?: string; category?: string }>;
};

export default async function HomePage({ searchParams }: Props) {
  const [params, products, facets] = await Promise.all([
    searchParams,
    getProducts(),
    getFacets(),
  ]);

  return (
    <main>
      <section className="bg-brand">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:py-16">
          <h1 className="max-w-3xl text-3xl font-extrabold leading-tight text-white sm:text-5xl">
            Vind de beste fotocamera voor jouw fotografie-stijl
          </h1>
          <p className="mt-4 max-w-2xl text-base text-white/80 sm:text-lg">
            We vergelijken {products.length} populaire camera&apos;s op prijs, specificaties en
            wat gebruikers ervan vinden. Zo weet je binnen een paar minuten welke bij jou past.
          </p>

          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
            {[
              { value: `${products.length}`, label: "Camera's vergeleken" },
              { value: `${facets.brands.length}`, label: "Merken" },
              { value: "Dagelijks", label: "Prijzen bijgewerkt" },
            ].map((stat) => (
              <div key={stat.label}>
                <dt className="sr-only">{stat.label}</dt>
                <dd>
                  <span className="block text-2xl font-bold text-white">{stat.value}</span>
                  <span className="text-sm text-white/70">{stat.label}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8">
        <ProductBrowser
          // De key zorgt dat de filterstate opnieuw initialiseert wanneer de bezoeker via
          // een categorie-link in de header binnenkomt met andere URL-parameters.
          key={`${params.q ?? ""}|${params.brand ?? ""}|${params.category ?? ""}`}
          products={products}
          brands={facets.brands}
          categories={facets.categories}
          initialQuery={params.q ?? ""}
          initialBrand={params.brand ?? ""}
          initialCategory={params.category ?? ""}
        />
      </section>
    </main>
  );
}

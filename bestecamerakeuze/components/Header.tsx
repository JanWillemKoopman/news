import Link from "next/link";

const NAV = [
  { href: "/vlogcameras", label: "Beste vlogcamera's", highlight: true },
  { href: "/?category=Systeemcamera", label: "Systeemcamera's" },
  { href: "/?category=Compactcamera", label: "Compactcamera's" },
  { href: "/?brand=Sony", label: "Sony" },
  { href: "/?brand=Canon", label: "Canon" },
  { href: "/?brand=Fujifilm", label: "Fujifilm" },
  { href: "/?brand=Nikon", label: "Nikon" },
  { href: "/vergelijk", label: "Vergelijken" },
];

export default function Header() {
  return (
    <header className="bg-brand">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3.5">
        <Link href="/" className="shrink-0 text-xl font-extrabold tracking-tight text-white">
          bestecamerakeuze<span className="text-cta">.nl</span>
        </Link>

        {/* De zoekbalk in de header is een gewone GET-form: geen JavaScript nodig, en de
            zoekterm belandt in de URL zodat resultaten deelbaar en indexeerbaar zijn. */}
        <form action="/" className="hidden flex-1 md:block">
          <label htmlFor="header-search" className="sr-only">
            Zoek een camera
          </label>
          <div className="flex overflow-hidden rounded-card bg-white">
            <input
              id="header-search"
              type="search"
              name="q"
              placeholder="Zoek op merk of model..."
              className="w-full px-4 py-2 text-sm text-ink outline-none placeholder:text-ink-faint"
            />
            <button
              type="submit"
              className="bg-cta px-5 text-sm font-bold text-white transition-colors hover:bg-cta-hover"
            >
              Zoek
            </button>
          </div>
        </form>
      </div>

      <nav aria-label="Categorieën" className="bg-brand-dark">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              // De gidspagina is de belangrijkste pagina van de site en krijgt daarom
              // meer nadruk dan de categoriefilters. Wit, niet oranje: oranje blijft
              // gereserveerd voor de affiliate-CTA.
              className={`whitespace-nowrap px-3 py-2.5 text-sm transition-colors hover:bg-white/10 hover:text-white ${
                item.highlight ? "font-bold text-white" : "font-medium text-white/90"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </header>
  );
}

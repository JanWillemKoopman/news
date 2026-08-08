import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="text-2xl font-bold text-ink">Deze pagina bestaat niet</h1>
      <p className="mt-2 text-ink-muted">
        Mogelijk is de camera uit ons assortiment gehaald of klopt de link niet.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-card bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark"
      >
        Terug naar alle camera&apos;s
      </Link>
    </main>
  );
}

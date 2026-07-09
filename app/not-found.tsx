import Link from 'next/link'
import { cormorant } from '@/lib/fonts'

export default function NotFound() {
  return (
    <div
      className={`wedding ${cormorant.variable} flex min-h-screen items-center justify-center bg-white px-4 text-foreground`}
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-white p-8 text-center shadow-sm">
        <p className="font-serif text-6xl font-medium text-rose-600">404</p>
        <h1 className="mt-4 font-serif text-3xl font-medium text-rhino-900">Pagina niet gevonden</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Deze pagina bestaat niet (meer). Misschien is de link verouderd of verkeerd overgenomen.
        </p>
        <Link
          href="/bruiloft"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Naar ons trouwplan
        </Link>
      </div>
    </div>
  )
}

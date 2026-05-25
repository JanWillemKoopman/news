import Link from 'next/link'
import { Newsreader } from 'next/font/google'

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
  weight: ['400', '500', '600'],
  adjustFontFallback: false,
})

export default function NotFound() {
  return (
    <div
      className={`wedding ${newsreader.variable} flex min-h-screen items-center justify-center bg-background px-4 text-foreground`}
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <p className="font-serif text-5xl text-primary">404</p>
        <h1 className="mt-4 font-serif text-2xl">Pagina niet gevonden</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Deze pagina bestaat niet (meer). Misschien is de link verouderd of verkeerd overgenomen.
        </p>
        <Link
          href="/bruiloft"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Naar ons trouwplan
        </Link>
      </div>
    </div>
  )
}

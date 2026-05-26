import { Cormorant_Garamond } from 'next/font/google'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  adjustFontFallback: false,
})

// Auth-pagina's krijgen het bruiloft-palet (.wedding) — Riley & Grey-stijl —
// maar zonder de app-shell/navigatie. Licht canvas, brand-mark + serif titel
// boven een witte content-card.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`wedding ${cormorant.variable} flex min-h-screen items-center justify-center bg-rhino-50 px-4 py-10 text-foreground`}
    >
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center justify-center gap-3">
          <span
            aria-hidden
            className="flex h-12 w-12 items-center justify-center rounded-md bg-rhino-800 text-white shadow-sm"
          >
            <span className="font-serif text-[28px] font-medium leading-none">&amp;</span>
          </span>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-rhino-900">
            Ons Trouwplan
          </h1>
        </div>
        <div className="rounded-lg border border-border bg-white p-6 shadow-md">{children}</div>
      </div>
    </div>
  )
}

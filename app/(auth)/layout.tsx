import { Newsreader } from 'next/font/google'

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
  weight: ['400', '500', '600'],
  adjustFontFallback: false,
})

// Auth-pagina's krijgen het warme bruiloft-palet (.wedding) maar zonder de
// app-shell/navigatie.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`wedding ${newsreader.variable} flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground`}
    >
      <div className="w-full max-w-md">
        <h1 className="mb-6 text-center font-serif text-3xl font-medium tracking-tight">
          Ons Trouwplan
        </h1>
        {children}
      </div>
    </div>
  )
}

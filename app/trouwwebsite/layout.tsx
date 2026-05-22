import type { Metadata } from 'next'
import { Newsreader } from 'next/font/google'

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
  weight: ['400', '500', '600'],
  adjustFontFallback: false,
})

export const metadata: Metadata = {
  title: 'Trouwwebsite',
  description: 'De trouwwebsite met alle praktische informatie en RSVP.',
}

// Publieke trouwwebsite: eigen warme (light) thema, zonder de app-navigatie.
export default function TrouwwebsiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`wedding min-h-screen bg-background text-foreground antialiased ${newsreader.variable}`}>
      {children}
    </div>
  )
}

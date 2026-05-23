import { Newsreader } from 'next/font/google'

import '../globals.css'

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
  weight: ['400', '500', '600'],
  adjustFontFallback: false,
})

// Publieke RSVP-pagina: warm bruiloft-palet, geen app-navigatie.
export default function RsvpLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`wedding ${newsreader.variable} min-h-screen bg-background text-foreground`}>
      {children}
    </div>
  )
}

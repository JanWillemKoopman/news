import { Cormorant_Garamond } from 'next/font/google'

import '../globals.css'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  adjustFontFallback: false,
})

// Publieke RSVP-pagina: bruiloft-palet (Riley & Grey-stijl), geen app-navigatie.
export default function RsvpLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`wedding ${cormorant.variable} min-h-screen bg-rhino-50 text-foreground`}>
      {children}
    </div>
  )
}

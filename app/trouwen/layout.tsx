import { Cormorant_Garamond, Dancing_Script, EB_Garamond, Great_Vibes, Lora, Playfair_Display } from 'next/font/google'

import '../globals.css'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  adjustFontFallback: false,
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  adjustFontFallback: false,
})

const lora = Lora({
  subsets: ['latin'],
  variable: '--font-lora',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  adjustFontFallback: false,
})

const dancingScript = Dancing_Script({
  subsets: ['latin'],
  variable: '--font-dancing',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  adjustFontFallback: false,
})

const ebGaramond = EB_Garamond({
  subsets: ['latin'],
  variable: '--font-garamond',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  adjustFontFallback: false,
})

const greatVibes = Great_Vibes({
  subsets: ['latin'],
  variable: '--font-vibes',
  display: 'swap',
  weight: ['400'],
  adjustFontFallback: false,
})

export default function TrouwenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`wedding ${cormorant.variable} ${playfair.variable} ${lora.variable} ${dancingScript.variable} ${ebGaramond.variable} ${greatVibes.variable} min-h-screen bg-background text-foreground`}>
      {children}
    </div>
  )
}

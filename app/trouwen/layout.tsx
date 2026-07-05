import {
  Bodoni_Moda,
  Cormorant_Garamond,
  Dancing_Script,
  EB_Garamond,
  Great_Vibes,
  Italiana,
  Josefin_Sans,
  Libre_Baskerville,
  Lora,
  Marcellus,
  Parisienne,
  Playfair_Display,
} from 'next/font/google'

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

const italiana = Italiana({
  subsets: ['latin'],
  variable: '--font-italiana',
  display: 'swap',
  weight: ['400'],
  adjustFontFallback: false,
})

const marcellus = Marcellus({
  subsets: ['latin'],
  variable: '--font-marcellus',
  display: 'swap',
  weight: ['400'],
  adjustFontFallback: false,
})

const libreBaskerville = Libre_Baskerville({
  subsets: ['latin'],
  variable: '--font-baskerville',
  display: 'swap',
  weight: ['400', '700'],
  adjustFontFallback: false,
})

const josefinSans = Josefin_Sans({
  subsets: ['latin'],
  variable: '--font-josefin',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  adjustFontFallback: false,
})

const bodoniModa = Bodoni_Moda({
  subsets: ['latin'],
  variable: '--font-bodoni',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  adjustFontFallback: false,
})

const parisienne = Parisienne({
  subsets: ['latin'],
  variable: '--font-parisienne',
  display: 'swap',
  weight: ['400'],
  adjustFontFallback: false,
})

const FONT_VARIABLES = [
  cormorant.variable,
  playfair.variable,
  lora.variable,
  dancingScript.variable,
  ebGaramond.variable,
  greatVibes.variable,
  italiana.variable,
  marcellus.variable,
  libreBaskerville.variable,
  josefinSans.variable,
  bodoniModa.variable,
  parisienne.variable,
].join(' ')

export default function TrouwenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`wedding ${FONT_VARIABLES} min-h-screen bg-background text-foreground`}>
      {children}
    </div>
  )
}

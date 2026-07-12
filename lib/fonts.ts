import { Cormorant_Garamond, Inter } from 'next/font/google'

// Eén plek voor de app-lettertypes. Layouts importeren deze instanties en
// zetten de bijbehorende CSS-variabele op hun wrapper; Tailwind's
// `font-sans`/`font-serif` verwijzen naar diezelfde variabelen.
export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

// Elegante serif voor display-teksten (Riley & Grey-look).
export const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  adjustFontFallback: false,
})

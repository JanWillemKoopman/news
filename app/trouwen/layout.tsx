import { Cormorant_Garamond, Lora, Playfair_Display } from 'next/font/google'

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

export default function TrouwenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`wedding ${cormorant.variable} ${playfair.variable} ${lora.variable} min-h-screen bg-background text-foreground`}>
      {children}
    </div>
  )
}

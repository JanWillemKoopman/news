import type { Metadata } from 'next'
import { Cormorant_Garamond } from 'next/font/google'

import { WeddingShell } from '@/components/bruiloft/WeddingShell'

// Elegante serif voor display-teksten. Cormorant Garamond is de dichtstbij
// gratis variant van het huis-lettertype LT Soul, dat Riley & Grey gebruikt.
const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  adjustFontFallback: false,
})

export const metadata: Metadata = {
  title: 'Ons Trouwplan',
  description: 'Plan jullie bruiloft: gasten, taken, leveranciers en budget op één plek.',
}

export default function BruiloftLayout({ children }: { children: React.ReactNode }) {
  return <WeddingShell fontClassName={cormorant.variable}>{children}</WeddingShell>
}

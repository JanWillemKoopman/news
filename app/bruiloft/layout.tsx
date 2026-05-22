import type { Metadata } from 'next'
import { Newsreader } from 'next/font/google'

import { WeddingShell } from '@/components/bruiloft/WeddingShell'

// Elegante serif voor display-teksten (namen van het paar, aftelteller).
const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
  weight: ['400', '500', '600'],
  adjustFontFallback: false,
})

export const metadata: Metadata = {
  title: 'Ons Trouwplan',
  description: 'Plan jullie bruiloft: gasten, taken, leveranciers en budget op één plek.',
}

export default function BruiloftLayout({ children }: { children: React.ReactNode }) {
  return <WeddingShell fontClassName={newsreader.variable}>{children}</WeddingShell>
}

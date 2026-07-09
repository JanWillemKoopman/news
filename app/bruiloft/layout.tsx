import type { Metadata } from 'next'

import { WeddingShell } from '@/components/bruiloft/WeddingShell'
import { cormorant } from '@/lib/fonts'

export const metadata: Metadata = {
  title: 'Ons Trouwplan',
  description: 'Plan jullie bruiloft: gasten, taken, leveranciers en budget op één plek.',
}

export default function BruiloftLayout({ children }: { children: React.ReactNode }) {
  return <WeddingShell fontClassName={cormorant.variable}>{children}</WeddingShell>
}

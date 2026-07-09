import type { Metadata } from 'next'

// Token-links zijn persoonlijk: nooit indexeren door zoekmachines.
export const metadata: Metadata = {
  title: 'Reageren — Ons Trouwplan',
  robots: { index: false, follow: false },
}

export default function ReactieLayout({ children }: { children: React.ReactNode }) {
  return children
}

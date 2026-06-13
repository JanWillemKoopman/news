import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Fotomuur · Ons Trouwplan',
}

export default function FotoLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-stone-50 text-stone-900">{children}</div>
}

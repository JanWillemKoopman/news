import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Trouwplanner — Plan jullie droombruiloft',
  description:
    'Gratis trouwplanner voor budget, taken, gastenlijst en leveranciers. Direct beginnen, geen account vereist.',
}

export default function TrouwplannerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 antialiased">
      {children}
    </div>
  )
}

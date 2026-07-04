import type { Metadata } from 'next'
import Link from 'next/link'
import { Gift, ListChecks, Users } from 'lucide-react'

import { Button, Card, CardContent } from '@/components/bruiloft/ui'

export const metadata: Metadata = {
  title: 'Ons Trouwplan — samen jullie bruiloft plannen',
  description:
    'Plan jullie bruiloft samen: taken, gasten en cadeaulijst op één plek.',
}

const features = [
  {
    icon: ListChecks,
    titel: 'Takenlijst',
    beschrijving: 'Verdeel taken samen en krijg op het juiste moment een seintje wat er nog moet gebeuren.',
  },
  {
    icon: Users,
    titel: 'Gasten & RSVP',
    beschrijving: 'Nodig gasten uit via jullie eigen trouwsite en zie in één oogopslag wie er komt.',
  },
  {
    icon: Gift,
    titel: 'Cadeaulijst',
    beschrijving: 'Een cadeaulijst die gasten zelf kunnen invullen, zonder gedoe met dubbele cadeaus.',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-white">
      <div className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center px-6 py-16 text-center sm:py-24">
        <span className="mb-6 inline-flex items-center rounded-full bg-foreground/[0.06] px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-foreground/10">
          In ontwikkeling — binnenkort voor iedereen
        </span>

        <h1 className="font-serif text-[clamp(2rem,7vw,3.25rem)] font-medium leading-tight tracking-tight text-gray-900">
          Ons Trouwplan
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-500 sm:text-lg">
          Plan jullie bruiloft samen: taken, gasten en cadeaulijst op één plek.
          We bouwen de app nu nog rustig verder — binnenkort gaat hij voor
          iedereen open. Heb je al een account? Log dan gewoon in.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/aanmelden">Account aanmaken</Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/inloggen">Inloggen</Link>
          </Button>
        </div>

        <div className="mt-16 grid w-full gap-4 sm:grid-cols-3">
          {features.map(({ icon: Icon, titel, beschrijving }) => (
            <Card key={titel} className="text-left">
              <CardContent className="p-5">
                <Icon className="mb-3 h-5 w-5 text-rose-600" aria-hidden />
                <h2 className="text-sm font-semibold text-gray-900">{titel}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{beschrijving}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

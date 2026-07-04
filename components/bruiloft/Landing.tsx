'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, ChevronDown, Gift, LayoutDashboard, ListChecks, LogOut, Users } from 'lucide-react'

import { Button, Card, CardContent } from '@/components/bruiloft/ui'
import { useBruiloftStore } from '@/store/bruiloftStore'

const FEATURES = [
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

function BrandMark() {
  return (
    <span
      aria-hidden
      className="flex h-9 w-9 items-center justify-center rounded-md bg-rhino-800 text-white shadow-sm"
    >
      <span className="font-serif text-[22px] font-medium leading-none">&amp;</span>
    </span>
  )
}

/** Header-accountmenu: alleen relevant als een ingelogde gebruiker hier via
 * "Terug naar home" belandt (ShellInner, `?home=1`). */
function AccountMenu() {
  const router = useRouter()
  const currentUser = useBruiloftStore((s) => s.currentUser)
  const signOut = useBruiloftStore((s) => s.signOut)
  const [open, setOpen] = React.useState(false)

  if (!currentUser) {
    return (
      <Link href="/inloggen" className="text-sm font-medium text-rhino-700 transition-colors hover:text-rhino-900">
        Inloggen
      </Link>
    )
  }

  async function handleSignOut() {
    setOpen(false)
    await signOut()
    router.push('/inloggen')
    router.refresh()
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-full border border-gray-200 bg-white py-1.5 pl-1.5 pr-3 text-sm font-medium text-rhino-800 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 text-xs font-semibold text-white">
          {(currentUser.displayName || currentUser.email || '?').slice(0, 1).toUpperCase()}
        </span>
        {currentUser.displayName || currentUser.email}
        <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-40" aria-hidden onClick={() => setOpen(false)} />
          <div
            role="menu"
            aria-label="Accountmenu"
            className="absolute right-0 z-50 mt-2 w-52 rounded-lg border border-gray-100 bg-white p-1.5 shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                router.push('/bruiloft')
              }}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-rhino-800 transition-colors hover:bg-gray-50"
            >
              <LayoutDashboard className="h-4 w-4 text-gray-400" />
              Naar dashboard
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm text-rhino-800 transition-colors hover:bg-gray-50"
            >
              <LogOut className="h-4 w-4 text-gray-400" />
              Uitloggen
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}

export function Landing() {
  const router = useRouter()

  return (
    <div className="min-h-dvh bg-white">
      <header className="border-b border-gray-100">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <span className="flex items-center gap-2.5 font-serif text-lg text-rhino-900">
            <BrandMark />
            Ons Trouwplan
          </span>
          <AccountMenu />
        </div>
      </header>

      <section className="relative overflow-hidden bg-rhino-50 px-4 py-20 sm:px-6 sm:py-28">
        <div className="pointer-events-none absolute right-0 top-0 h-[400px] w-[400px] -translate-y-1/4 translate-x-1/3 rounded-full bg-rose-200/25 blur-3xl" />

        <div className="relative mx-auto max-w-2xl text-center">
          <span className="mb-6 inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-rhino-700 ring-1 ring-inset ring-rhino-900/10">
            In ontwikkeling — binnenkort voor iedereen
          </span>

          <h1 className="font-serif text-4xl font-medium leading-[1.05] tracking-tight text-rhino-900 sm:text-6xl">
            Plan jullie bruiloft{' '}
            <span className="italic text-rose-600 underline decoration-rose-300 underline-offset-4">
              zonder stress.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-lg text-lg leading-relaxed text-gray-600">
            Ons Trouwplan wordt op dit moment nog rustig verder gebouwd. Binnenkort
            gaat de app voor iedereen open — heb je al een account, log dan gewoon in.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" className="rounded-full" onClick={() => router.push('/aanmelden')}>
              Account aanmaken
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full">
              <Link href="/inloggen">Inloggen</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-3">
          {FEATURES.map(({ icon: Icon, titel, beschrijving }) => (
            <Card key={titel} className="text-left">
              <CardContent className="p-5">
                <Icon className="mb-3 h-5 w-5 text-rose-600" aria-hidden />
                <h2 className="text-sm font-semibold text-rhino-900">{titel}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{beschrijving}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-gray-100 px-4 py-8 sm:px-6">
        <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center text-xs text-gray-400">
          <Link href="/privacy" className="transition-colors hover:text-rhino-900">
            Privacy
          </Link>
          <Link href="/voorwaarden" className="transition-colors hover:text-rhino-900">
            Algemene voorwaarden
          </Link>
        </p>
      </footer>
    </div>
  )
}

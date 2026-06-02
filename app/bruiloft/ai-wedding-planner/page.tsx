'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  CalendarClock,
  Globe,
  Info,
  ListChecks,
  RefreshCw,
  Sparkles,
  Store,
  Users,
  Wallet,
} from 'lucide-react'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Progress,
  Skeleton,
} from '@/components/bruiloft/ui'
import { cn } from '@/lib/utils'
import { useBruiloftStore } from '@/store/bruiloftStore'
import type {
  AIModuleAdvies,
  AIModuleKey,
  AIWeddingPlannerAdvies,
  AIWeddingPlannerResponse,
} from '@/app/api/ai/wedding-planner/route'

// ---- Module-configuratie ----------------------------------------------------

const MODULE_CONFIG: Array<{
  key: AIModuleKey
  label: string
  icon: React.ElementType
  href: string
}> = [
  { key: 'taken', label: 'Taken', icon: ListChecks, href: '/bruiloft/taken' },
  { key: 'budget', label: 'Budget', icon: Wallet, href: '/bruiloft/budget' },
  { key: 'leveranciers', label: 'Leveranciers', icon: Store, href: '/bruiloft/leveranciers' },
  { key: 'draaiboek', label: 'Draaiboek', icon: CalendarClock, href: '/bruiloft/draaiboek' },
  { key: 'gasten', label: 'Gastenbeheer', icon: Users, href: '/bruiloft/gasten' },
  { key: 'website', label: 'Website', icon: Globe, href: '/bruiloft/website' },
]

// ---- Status badge -----------------------------------------------------------

type ModuleStatus = AIModuleAdvies['status']

const STATUS_CONFIG: Record<
  ModuleStatus,
  { label: string; className: string; dotClassName: string }
> = {
  op_schema: {
    label: 'Op schema',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClassName: 'bg-emerald-500',
  },
  actie_vereist: {
    label: 'Actie vereist',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    dotClassName: 'bg-amber-500',
  },
  kritiek: {
    label: 'Kritiek',
    className: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClassName: 'bg-rose-500',
  },
  niet_gestart: {
    label: 'Niet gestart',
    className: 'bg-gray-100 text-gray-500 border-gray-200',
    dotClassName: 'bg-gray-400',
  },
}

function AIStatusBadge({ status }: { status: ModuleStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.niet_gestart
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        cfg.className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dotClassName)} />
      {cfg.label}
    </span>
  )
}

// ---- Skeleton ---------------------------------------------------------------

function SkeletonGrid() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-36 w-full rounded-xl" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-52 w-full rounded-xl" />
        ))}
      </div>
    </div>
  )
}

// ---- Module card ------------------------------------------------------------

function ModuleCard({
  config,
  advies,
}: {
  config: (typeof MODULE_CONFIG)[number]
  advies: AIModuleAdvies
}) {
  const Icon = config.icon
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-rhino-50">
              <Icon className="h-4 w-4 text-rhino-700" aria-hidden />
            </div>
            <CardTitle className="text-base">{config.label}</CardTitle>
          </div>
          <AIStatusBadge status={advies.status} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <p className="text-sm text-muted-foreground">{advies.globaal_advies}</p>

        {advies.concrete_acties.length > 0 && (
          <ul className="space-y-2">
            {advies.concrete_acties.map((actie, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                {actie.link ? (
                  <Link href={actie.link} className="text-foreground underline-offset-2 hover:underline">
                    {actie.tekst}
                  </Link>
                ) : (
                  <span className="text-foreground">{actie.tekst}</span>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto pt-2">
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href={config.href}>Ga naar {config.label}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ---- Globale status card ----------------------------------------------------

function GlobaleStatusCard({ advies }: { advies: AIWeddingPlannerAdvies }) {
  const { globaal } = advies
  const statusCfg =
    globaal.status === 'op_schema'
      ? STATUS_CONFIG.op_schema
      : globaal.status === 'kritiek'
        ? STATUS_CONFIG.kritiek
        : STATUS_CONFIG.actie_vereist

  return (
    <Card className="border-rhino-100 bg-gradient-to-br from-rhino-50 via-white to-rose-50">
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-8">
          {/* Score */}
          <div className="flex flex-col items-center gap-2 sm:min-w-[120px]">
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-rhino-100 bg-white shadow-sm">
              <span className="text-2xl font-bold text-rhino-800">{globaal.score}</span>
              <span className="absolute bottom-3 text-xs text-muted-foreground">/100</span>
            </div>
            <AIStatusBadge status={globaal.status as ModuleStatus} />
          </div>

          {/* Tekst */}
          <div className="flex-1 space-y-3">
            <div>
              <h2 className="font-serif text-lg text-foreground">Jouw planning in één oogopslag</h2>
              <p className="mt-1 text-sm text-muted-foreground">{globaal.samenvatting}</p>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Planningsvoortgang</span>
                <span>{globaal.score}%</span>
              </div>
              <Progress
                value={globaal.score}
                className={cn(
                  'h-2',
                  globaal.score >= 65
                    ? '[&>div]:bg-emerald-500'
                    : globaal.score >= 35
                      ? '[&>div]:bg-amber-500'
                      : '[&>div]:bg-rose-500'
                )}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ---- Hoofd pagina -----------------------------------------------------------

function formatTijdstip(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) +
    ' om ' +
    d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
}

function minuten(ms: number): number {
  return Math.ceil(ms / 60000)
}

export default function AIWeddingPlannerPage() {
  const wedding = useBruiloftStore((s) => s.wedding)

  const [advies, setAdvies] = React.useState<AIWeddingPlannerAdvies | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [nextAvailable, setNextAvailable] = React.useState<Date | null>(null)
  const [cachedAt, setCachedAt] = React.useState<string | null>(null)
  const [fout, setFout] = React.useState<string | null>(null)

  const weddingId = wedding?.id

  const fetchAdvies = React.useCallback(
    async (onlyCache: boolean) => {
      if (!weddingId) return
      setLoading(true)
      setFout(null)
      try {
        const res = await fetch('/api/ai/wedding-planner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weddingId, onlyFetchCache: onlyCache }),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error ?? `HTTP ${res.status}`)
        }
        const data: AIWeddingPlannerResponse = await res.json()
        setNextAvailable(new Date(data.next_available_at))
        if (data.advies) {
          setAdvies(data.advies)
          setCachedAt(data.advies.generatedAt)
        }
      } catch (e) {
        setFout(e instanceof Error ? e.message : 'Er is iets misgegaan')
      } finally {
        setLoading(false)
      }
    },
    [weddingId]
  )

  // Op mount: laad stil de cache
  React.useEffect(() => {
    fetchAdvies(true)
  }, [fetchAdvies])

  const now = Date.now()
  const resterendeMs = nextAvailable ? nextAvailable.getTime() - now : 0
  const isRateLimited = resterendeMs > 0 && advies !== null

  if (!wedding) return null

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        titel="AI Wedding Planner"
        beschrijving="Professioneel advies voor elk onderdeel van jullie bruiloft, gegenereerd door AI."
        actie={
          <Button
            onClick={() => fetchAdvies(false)}
            disabled={loading || isRateLimited}
            className="gap-2"
          >
            {loading ? (
              <RefreshCw className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden />
            )}
            {loading ? 'Bezig met analyseren…' : 'Ververs AI advies'}
          </Button>
        }
      />

      {/* Intro card */}
      <Card className="mb-6 border-blue-100 bg-blue-50/50">
        <CardContent className="flex items-start gap-3 pt-5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" aria-hidden />
          <div className="space-y-1 text-sm text-blue-800">
            <p className="font-medium">Hoe werkt de AI Wedding Planner?</p>
            <p className="text-blue-700/80">
              De AI analyseert alle gegevens in jullie bruiloftplanning — taken, budget, leveranciers,
              draaiboek, gastenbeheer en website — en geeft per onderdeel concreet advies van een
              professionele trouwplanner. Klik op "Ververs AI advies" om een verse analyse te starten.
              Je kunt dit elke 10 minuten opnieuw doen. Het advies wordt opgeslagen, zodat je het
              altijd terug kunt lezen.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tijdstip + rate limit */}
      <div className="mb-5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        {cachedAt && (
          <span>Laatste update: {formatTijdstip(cachedAt)}</span>
        )}
        {isRateLimited && (
          <span className="text-amber-600">
            · Je kunt je advies over {minuten(resterendeMs)} {minuten(resterendeMs) === 1 ? 'minuut' : 'minuten'} opnieuw verversen.
          </span>
        )}
        {fout && (
          <span className="text-rose-600">· {fout}</span>
        )}
      </div>

      {/* Inhoud */}
      {loading && <SkeletonGrid />}

      {!loading && advies && (
        <div className="space-y-6">
          <GlobaleStatusCard advies={advies} />

          <div className="grid gap-4 sm:grid-cols-2">
            {MODULE_CONFIG.map((m) => (
              <ModuleCard key={m.key} config={m} advies={advies.modules[m.key]} />
            ))}
          </div>
        </div>
      )}

      {!loading && !advies && (
        <EmptyState
          icon={Sparkles}
          titel="Nog geen AI advies gegenereerd"
          beschrijving="Klik op 'Ververs AI advies' om een persoonlijk planningsoverzicht te genereren op basis van alle gegevens in jullie bruiloftplanning."
          actie={
            <Button onClick={() => fetchAdvies(false)} className="gap-2">
              <Sparkles className="h-4 w-4" aria-hidden />
              Genereer AI advies
            </Button>
          }
        />
      )}
    </div>
  )
}

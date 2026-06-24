'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  CalendarClock,
  Globe,
  ListChecks,
  RefreshCw,
  Sparkles,
  Store,
  Users,
  Wallet,
} from 'lucide-react'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import { PageInfoButton } from '@/components/bruiloft/PageInfoButton'
import { aiAssistentInfo } from '@/components/bruiloft/faqContent'
import {
  Button,
  Card,
  CardContent,
  EmptyState,
  Progress,
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
  { key: 'gasten', label: 'Gasten', icon: Users, href: '/bruiloft/gasten' },
  { key: 'website', label: 'Website', icon: Globe, href: '/bruiloft/website' },
]

// ---- Status badge -----------------------------------------------------------

type ModuleStatus = AIModuleAdvies['status']

const STATUS_CONFIG: Record<ModuleStatus, { label: string; dot: string; pill: string }> = {
  op_schema:     { label: 'Op schema',     dot: 'bg-emerald-500', pill: 'text-emerald-700 bg-emerald-50' },
  actie_vereist: { label: 'Actie vereist', dot: 'bg-amber-500',   pill: 'text-amber-700 bg-amber-50'   },
  kritiek:       { label: 'Kritiek',       dot: 'bg-rose-500',    pill: 'text-rose-700 bg-rose-50'     },
  niet_gestart:  { label: 'Niet gestart',  dot: 'bg-muted-foreground/40', pill: 'text-muted-foreground bg-muted' },
}

function StatusPill({ status }: { status: ModuleStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.niet_gestart
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', cfg.pill)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  )
}

// ---- Laadanimatie -----------------------------------------------------------

const ANALYSE_STAPPEN: Array<{ label: string; icon: React.ElementType }> = [
  { label: 'Planningsdata ophalen...',       icon: RefreshCw      },
  { label: 'Taken analyseren...',            icon: ListChecks     },
  { label: 'Budget doorrekenen...',          icon: Wallet         },
  { label: 'Leveranciers beoordelen...',     icon: Store          },
  { label: 'Draaiboek controleren...',       icon: CalendarClock  },
  { label: 'Gastenlijst bekijken...',        icon: Users          },
  { label: 'Trouwwebsite evalueren...',      icon: Globe          },
  { label: 'Persoonlijk advies opstellen...', icon: Sparkles      },
]

function LaadAnimatie() {
  const [actief, setActief] = React.useState(0)

  React.useEffect(() => {
    const id = setInterval(
      () => setActief((i) => Math.min(i + 1, ANALYSE_STAPPEN.length - 1)),
      1500,
    )
    return () => clearInterval(id)
  }, [])

  const HuidigIcon = ANALYSE_STAPPEN[actief].icon

  return (
    <div className="flex flex-col items-center gap-8 py-16 px-4">
      {/* Pulsend Sparkles-icoon met gevulde achtergrond */}
      <div className="relative flex h-24 w-24 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-rose-400/20 animate-ping" style={{ animationDuration: '2s' }} />
        <div className="absolute inset-0 rounded-full bg-rose-500" />
        <Sparkles className="relative h-10 w-10 text-white" aria-hidden />
      </div>

      {/* Titel + actieve stap */}
      <div className="space-y-2 text-center">
        <p className="text-lg font-semibold text-foreground">Jullie bruiloft wordt geanalyseerd</p>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <HuidigIcon className="h-4 w-4 shrink-0 text-rose-400 animate-pulse" aria-hidden />
          <span className="transition-all duration-300">{ANALYSE_STAPPEN[actief].label}</span>
        </div>
      </div>

      {/* Indeterminate balk */}
      <div className="relative h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-muted">
        <div className="absolute inset-y-0 left-0 w-1/4 rounded-full bg-rose-400 animate-indeterminate" />
      </div>

      {/* Stappen-lijst */}
      <div className="w-full max-w-sm space-y-2">
        {ANALYSE_STAPPEN.map((stap, i) => {
          const Icon = stap.icon
          const gedaan = i < actief
          const bezig  = i === actief
          return (
            <div
              key={stap.label}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors duration-300',
                gedaan ? 'text-rose-600'
                  : bezig ? 'bg-rose-50 text-foreground font-medium dark:bg-rose-950/30'
                  : 'text-muted-foreground/40',
              )}
            >
              <Icon className={cn('h-4 w-4 shrink-0 transition-colors duration-300',
                gedaan ? 'text-rose-500' : bezig ? 'text-rose-400' : 'text-muted-foreground/30',
              )} aria-hidden />
              <span>{stap.label}</span>
              {gedaan && (
                <svg className="ml-auto h-4 w-4 shrink-0 text-rose-500" viewBox="0 0 16 16" fill="none" aria-hidden>
                  <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---- Globale status ---------------------------------------------------------

function GlobaleStatusKaart({ advies }: { advies: AIWeddingPlannerAdvies }) {
  const { globaal } = advies
  const barColor =
    globaal.score >= 65 ? '[&>div]:bg-emerald-500' :
    globaal.score >= 35 ? '[&>div]:bg-amber-500' :
    '[&>div]:bg-rose-500'

  return (
    <div className="mb-8 grid gap-6 md:grid-cols-[280px_1fr]">
      <div className="pt-1">
        <h2 className="text-base font-semibold text-foreground">Globaal overzicht</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Een samenvattend oordeel van de AI-planner over de algehele staat van jullie bruiloftplanning.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-1">
            <StatusPill status={globaal.status as ModuleStatus} />
            <p className="pt-2 text-sm text-muted-foreground leading-relaxed">{globaal.samenvatting}</p>
          </div>
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Planningsvoortgang</span>
              <span>{globaal.score}%</span>
            </div>
            <Progress value={globaal.score} className={cn('h-1.5', barColor)} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---- Module kaart -----------------------------------------------------------

function ModuleKaart({
  config,
  advies,
}: {
  config: (typeof MODULE_CONFIG)[number]
  advies: AIModuleAdvies
}) {
  const Icon = config.icon
  return (
    <div className="grid gap-6 border-t border-border pt-6 md:grid-cols-[280px_1fr]">
      {/* Links: label + beschrijving */}
      <div className="pt-1">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <h3 className="text-base font-semibold text-foreground">{config.label}</h3>
        </div>
        <div className="mt-2">
          <StatusPill status={advies.status} />
        </div>
      </div>

      {/* Rechts: witte kaart met advies */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <p className="text-sm text-muted-foreground leading-relaxed">{advies.globaal_advies}</p>

          {advies.concrete_acties.length > 0 && (
            <ul className="space-y-2 border-t border-border pt-4">
              {advies.concrete_acties.map((actie, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                  {actie.link ? (
                    <Link
                      href={actie.link}
                      className="text-foreground underline-offset-2 hover:text-rose-600 hover:underline"
                    >
                      {actie.tekst}
                    </Link>
                  ) : (
                    <span className="text-foreground">{actie.tekst}</span>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-border pt-4">
            <Button asChild variant="outline" size="sm">
              <Link href={config.href}>Ga naar {config.label}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ---- Hulpfuncties -----------------------------------------------------------

function formatTijdstip(iso: string): string {
  const d = new Date(iso)
  return (
    d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' }) +
    ' om ' +
    d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })
  )
}

function minuten(ms: number) {
  return Math.ceil(ms / 60000)
}

// ---- Pagina -----------------------------------------------------------------

export default function AIWeddingPlannerPage() {
  const wedding = useBruiloftStore((s) => s.wedding)

  const [advies, setAdvies] = React.useState<AIWeddingPlannerAdvies | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [nextAvailable, setNextAvailable] = React.useState<Date | null>(null)
  const [cachedAt, setCachedAt] = React.useState<string | null>(null)
  const [fout, setFout] = React.useState<string | null>(null)

  const weddingId = wedding?.id

  const fetchAdvies = React.useCallback(
    async (force: boolean) => {
      if (!weddingId) return
      setLoading(true)
      setFout(null)
      try {
        const res = await fetch('/api/ai/wedding-planner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ weddingId, force }),
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

  React.useEffect(() => {
    fetchAdvies(false)
  }, [fetchAdvies])

  const now = Date.now()
  const resterendeMs = nextAvailable ? nextAvailable.getTime() - now : 0
  const isRateLimited = resterendeMs > 0 && advies !== null

  if (!wedding) return null

  return (
    <div className="mx-auto max-w-6xl pb-24 min-h-screen">
      <PageHeader
        titel="AI-assistent"
        beschrijving="Professioneel advies per onderdeel van jullie bruiloft, gegenereerd door AI op basis van jullie planningsdata."
        info={<PageInfoButton {...aiAssistentInfo} />}
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
            {loading ? 'Bezig met analyseren…' : 'Ververs advies'}
          </Button>
        }
      />

      {/* Metadata + foutmelding */}
      {(cachedAt || fout) && (
        <div className="mb-6 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {cachedAt && <span>Laatste update: {formatTijdstip(cachedAt)}</span>}
          {isRateLimited && (
            <span className="text-amber-600">
              · Handmatig verversen mogelijk over{' '}
              {minuten(resterendeMs) >= 60
                ? `${Math.ceil(minuten(resterendeMs) / 60)} uur`
                : `${minuten(resterendeMs)} ${minuten(resterendeMs) === 1 ? 'minuut' : 'minuten'}`}.
            </span>
          )}
          {fout && <span className="text-rose-600">· {fout}</span>}
        </div>
      )}

      {/* Hoe werkt het — uitleg boven de inhoud */}
      {!advies && !loading && (
        <div className="mb-8 grid gap-6 md:grid-cols-[280px_1fr]">
          <div className="pt-1">
            <h2 className="text-base font-semibold text-foreground">Hoe werkt het?</h2>
          </div>
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground leading-relaxed space-y-2">
              <p>
                De AI analyseert alle gegevens uit jullie bruiloftplanning: taken, budget,
                leveranciers, draaiboek, gasten en trouwpagina. Per onderdeel geeft een
                professionele AI-trouwplanner concreet advies over waar jullie staan en wat
                de volgende stap is.
              </p>
              <p>
                Het advies wordt automatisch bijgewerkt wanneer jullie planningsdata verandert.
                Met de knop <strong className="text-foreground">&quot;Ververs advies&quot;</strong> kun
                je handmatig een nieuwe analyse aanvragen (maximaal 3× per uur). Het resultaat
                wordt opgeslagen zodat je het altijd terug kunt lezen.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Laadanimatie */}
      {loading && <LaadAnimatie />}

      {/* Advies-inhoud */}
      {!loading && advies && (
        <div>
          {/* Progressieve reveal: de kaarten verschijnen vlot na elkaar, zodat
              een verse analyse soepeler binnenkomt dan in één keer (#10). */}
          <div className="animate-slide-up" style={{ animationFillMode: 'both' }}>
            <GlobaleStatusKaart advies={advies} />
          </div>

          <div className="space-y-0">
            {MODULE_CONFIG.map((m, i) => (
              <div
                key={m.key}
                className="animate-slide-up"
                style={{ animationDelay: `${(i + 1) * 80}ms`, animationFillMode: 'both' }}
              >
                <ModuleKaart config={m} advies={advies.modules[m.key]} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lege staat */}
      {!loading && !advies && (
        <EmptyState
          icon={Sparkles}
          titel="Nog geen AI advies gegenereerd"
          beschrijving="Klik op 'Ververs advies' om een persoonlijk planningsoverzicht te genereren."
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

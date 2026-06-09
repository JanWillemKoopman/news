'use client'

import * as React from 'react'
import {
  BadgeCheck,
  Compass,
  Globe,
  MapPin,
  Plus,
  Search,
  Users,
} from 'lucide-react'

import { PageHeader } from '@/components/bruiloft/PageHeader'
import {
  Button,
  Card,
  CardContent,
  EmptyState,
  Input,
  Money,
  Select,
  useToast,
} from '@/components/bruiloft/ui'
import { cn } from '@/lib/utils'
import { canEdit } from '@/lib/bruiloft/permissions'
import { VENDOR_TYPES } from '@/lib/bruiloft/options'
import type { MatchBadge, SupplierMatch } from '@/lib/bruiloft/suppliers/match'
import type { Supplier } from '@/lib/bruiloft/suppliers/types'
import { useBruiloftStore } from '@/store/bruiloftStore'

const PROVINCIES = [
  'Drenthe', 'Flevoland', 'Friesland', 'Gelderland', 'Groningen', 'Limburg',
  'Noord-Brabant', 'Noord-Holland', 'Overijssel', 'Utrecht', 'Zeeland', 'Zuid-Holland',
]

const BADGE_STIJL: Record<MatchBadge, string> = {
  'binnen budget': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  'net erboven': 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  'in jullie plaats': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  'in jullie regio': 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  'past bij gezelschap': 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
}

const LIMIT = 24

export default function OntdekkenPage() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const vendors = useBruiloftStore((s) => s.vendors)
  const addVendor = useBruiloftStore((s) => s.addVendor)
  const permissions = useBruiloftStore((s) => s.permissions)
  const { toast } = useToast()

  const kanBewerken = canEdit(permissions, 'leveranciers')

  const [categorie, setCategorie] = React.useState('all')
  const [provincie, setProvincie] = React.useState('all')
  const [plaats, setPlaats] = React.useState('')
  const [q, setQ] = React.useState('')
  const [sort, setSort] = React.useState<'match' | 'naam' | 'prijs'>('match')

  const [matches, setMatches] = React.useState<SupplierMatch[]>([])
  const [total, setTotal] = React.useState(0)
  const [page, setPage] = React.useState(1)
  const [laden, setLaden] = React.useState(false)
  const [fout, setFout] = React.useState<string | null>(null)
  const [toegevoegd, setToegevoegd] = React.useState<Set<string>>(new Set())

  // Profiel-parameters voor de ranking (uit de store).
  const profielParams = React.useMemo(() => {
    if (!wedding) return ''
    const geboekt = Array.from(
      new Set(vendors.filter((v) => v.status === 'geboekt').map((v) => v.type))
    ).join(',')
    const p = new URLSearchParams({
      budget: String(wedding.totaalBudget),
      woonplaats: wedding.woonplaats,
      daggasten: String(wedding.aantalDaggasten),
      avondgasten: String(wedding.aantalAvondgasten),
      geboekt,
    })
    return p.toString()
  }, [wedding, vendors])

  const fetchPagina = React.useCallback(
    async (gewenstePage: number, vervang: boolean) => {
      if (!wedding) return
      setLaden(true)
      setFout(null)
      const params = new URLSearchParams(profielParams)
      params.set('sort', sort)
      params.set('page', String(gewenstePage))
      params.set('limit', String(LIMIT))
      if (categorie !== 'all') params.set('categorie', categorie)
      if (provincie !== 'all') params.set('provincie', provincie)
      if (plaats.trim()) params.set('plaats', plaats.trim())
      if (q.trim()) params.set('q', q.trim())
      try {
        const res = await fetch(`/api/suppliers/search?${params.toString()}`)
        if (!res.ok) throw new Error('Zoeken mislukt')
        const data = (await res.json()) as { matches: SupplierMatch[]; total: number }
        setMatches((prev) => (vervang ? data.matches : [...prev, ...data.matches]))
        setTotal(data.total)
        setPage(gewenstePage)
      } catch {
        setFout('Er ging iets mis bij het zoeken. Probeer het opnieuw.')
      } finally {
        setLaden(false)
      }
    },
    [wedding, profielParams, sort, categorie, provincie, plaats, q]
  )

  // Herzoek (gedebounced) bij elke filterwijziging.
  React.useEffect(() => {
    const t = setTimeout(() => fetchPagina(1, true), 300)
    return () => clearTimeout(t)
  }, [fetchPagina])

  async function voegToe(s: Supplier) {
    try {
      const adres = [s.straat, s.huisnummer, s.plaats].filter(Boolean).join(' ')
      await addVendor({
        naam: s.naam,
        type: s.categorie,
        status: 'te bezoeken',
        contactpersoon: '',
        telefoon: s.telefoon,
        email: s.email,
        website: s.website,
        geoffreerdBedrag: s.prijsVanaf ?? 0,
        notitie: [s.omschrijvingKort, adres].filter(Boolean).join(' — '),
      })
      setToegevoegd((prev) => new Set(prev).add(s.id))
      toast({ title: 'Toegevoegd aan jullie leveranciers', variant: 'success' })
    } catch {
      toast({ title: 'Toevoegen mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    }
  }

  if (!wedding) return null

  const heeftMeer = matches.length < total

  return (
    <div className="mx-auto max-w-6xl pb-24 min-h-screen">
      <PageHeader
        titel="Ontdek leveranciers"
        beschrijving="Doorzoek alle trouwlocaties en leveranciers — gesorteerd op wat het beste bij jullie budget en plaats past."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Zoek op naam, sfeer, kenmerk…"
            className="pl-9"
          />
        </div>
        <Select value={categorie} onChange={(e) => setCategorie(e.target.value)}>
          <option value="all">Alle categorieën</option>
          {VENDOR_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </Select>
        <Select value={provincie} onChange={(e) => setProvincie(e.target.value)}>
          <option value="all">Alle provincies</option>
          {PROVINCIES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </Select>
        <Select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
          <option value="match">Beste match voor jullie</option>
          <option value="naam">Naam A-Z</option>
          <option value="prijs">Laagste prijs</option>
        </Select>
        <Input
          value={plaats}
          onChange={(e) => setPlaats(e.target.value)}
          placeholder="Filter op plaats…"
          className="lg:col-span-1"
        />
      </div>

      {fout ? (
        <EmptyState icon={Compass} titel="Zoeken mislukt" beschrijving={fout} />
      ) : matches.length === 0 && !laden ? (
        <EmptyState
          icon={Compass}
          titel="Geen leveranciers gevonden"
          beschrijving="Pas de filters aan om meer resultaten te zien."
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {matches.map((m) => (
              <SupplierCard
                key={m.supplier.id}
                match={m}
                kanBewerken={kanBewerken}
                alToegevoegd={toegevoegd.has(m.supplier.id)}
                onToevoegen={() => voegToe(m.supplier)}
              />
            ))}
          </div>

          <div className="mt-6 flex flex-col items-center gap-2">
            {heeftMeer ? (
              <Button variant="outline" disabled={laden} onClick={() => fetchPagina(page + 1, false)}>
                {laden ? 'Laden…' : 'Meer laden'}
              </Button>
            ) : null}
            <p className="text-xs text-muted-foreground">
              {matches.length} van {total} leveranciers weergegeven
            </p>
          </div>
        </>
      )}
    </div>
  )
}

function websiteHref(website: string): string {
  return /^https?:\/\//i.test(website) ? website : `https://${website}`
}

function SupplierCard({
  match,
  kanBewerken,
  alToegevoegd,
  onToevoegen,
}: {
  match: SupplierMatch
  kanBewerken: boolean
  alToegevoegd: boolean
  onToevoegen: () => void
}) {
  const s = match.supplier
  return (
    <Card className="flex flex-col">
      <CardContent className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{s.naam}</p>
            <p className="text-xs capitalize text-muted-foreground">
              {s.type ? `${s.type} · ` : ''}{s.categorie}
            </p>
          </div>
        </div>

        {match.badges.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {match.badges.map((b) => (
              <span key={b} className={cn('rounded-full px-2 py-0.5 text-xs font-medium', BADGE_STIJL[b])}>
                {b}
              </span>
            ))}
          </div>
        )}

        {s.omschrijvingKort ? (
          <p className="mt-3 line-clamp-3 text-sm text-muted-foreground">{s.omschrijvingKort}</p>
        ) : null}

        <div className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          {s.plaats ? (
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0" /> {s.plaats}{s.provincie ? `, ${s.provincie}` : ''}
            </p>
          ) : null}
          {s.capaciteitMax > 0 ? (
            <p className="flex items-center gap-2">
              <Users className="h-4 w-4 shrink-0" /> tot {s.capaciteitMax} gasten
            </p>
          ) : null}
          {s.website ? (
            <p className="flex items-center gap-2">
              <Globe className="h-4 w-4 shrink-0" />
              <a href={websiteHref(s.website)} target="_blank" rel="noopener noreferrer" className="truncate hover:text-foreground">
                {s.website}
              </a>
            </p>
          ) : null}
        </div>

        <p className="mt-4 text-lg font-semibold text-foreground">
          {s.isPrijsOpAanvraag || s.prijsVanaf == null ? (
            <span className="text-base font-medium text-muted-foreground">{s.prijsIndicatieTekst || 'Prijs op aanvraag'}</span>
          ) : (
            <>vanaf <Money bedrag={s.prijsVanaf} /></>
          )}
        </p>

        {kanBewerken && (
          <div className="mt-auto flex justify-end border-t border-border pt-3">
            {alToegevoegd ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600">
                <BadgeCheck className="h-4 w-4" /> Toegevoegd
              </span>
            ) : (
              <Button variant="outline" size="sm" onClick={onToevoegen}>
                <Plus className="h-4 w-4" /> Toevoegen aan mijn leveranciers
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

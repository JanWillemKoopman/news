'use client'

import * as React from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown, Copy, Download, Link2, Mail, Pencil, Plus, Search, Sparkles, Trash2, Users } from 'lucide-react'

import { GuestForm } from '@/components/bruiloft/gasten/GuestForm'
import { BulkImportDialog } from '@/components/bruiloft/gasten/BulkImportDialog'
import { GastenFilters } from '@/components/bruiloft/gasten/GastenFilters'
import { GastenStatsStrip } from '@/components/bruiloft/gasten/GastenStatsStrip'
import { PageHeader } from '@/components/bruiloft/PageHeader'
import { PageInfoButton } from '@/components/bruiloft/PageInfoButton'
import { gastenInfo } from '@/components/bruiloft/faqContent'
import { AIInsightCard } from '@/components/bruiloft/ai/AIInsightCard'
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Field,
  Input,
  Modal,
  OverflowMenu,
  StatusBadge,
  useToast,
} from '@/components/bruiloft/ui'
import { downloadCsv } from '@/lib/bruiloft/csv'
import { categorieLabelVoor, GASTTYPES, GUEST_CATEGORIEEN, RSVP_STATUSSEN } from '@/lib/bruiloft/options'
import { canEdit } from '@/lib/bruiloft/permissions'
import { useScrollRestore } from '@/lib/bruiloft/useScrollRestore'
import { capFirst } from '@/lib/utils'
import { useBruiloftStore } from '@/store/bruiloftStore'
import type { Guest, RsvpStatus } from '@/lib/bruiloft/types'

// Inline RSVP-select: ziet eruit als een badge maar is klikbaar om de status te wijzigen.
// Gebruik een custom dropdown i.p.v. native <select> zodat iOS Safari de tekst niet
// forceert naar 16px (het minimum voor form-elementen).
function RsvpSelect({
  value,
  onChange,
}: {
  value: RsvpStatus
  onChange: (v: RsvpStatus) => Promise<void> | void
}) {
  const [pending, setPending] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    function onPointer(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const handleSelect = async (v: RsvpStatus) => {
    setOpen(false)
    setPending(true)
    try {
      await onChange(v)
    } finally {
      setPending(false)
    }
  }

  // Eén betekenisvolle kleur: rose voor statussen die actie vragen
  // ("afgemeld", "geen reactie", "nog niet uitgenodigd"), verder neutraal —
  // zelfde regel als StatusBadge, hier lokaal omdat dit element klikbaar is.
  const rose = 'bg-rose-500/10 text-rose-700 ring-rose-600/20 dark:text-rose-300 dark:ring-rose-400/20'
  const klassen: Record<RsvpStatus, string> = {
    bevestigd: 'bg-foreground/[0.06] text-muted-foreground ring-foreground/10',
    afgemeld: rose,
    uitgenodigd: 'bg-foreground/[0.06] text-muted-foreground ring-foreground/10',
    'geen reactie': rose,
    'nog niet uitgenodigd': rose,
  }

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        disabled={pending}
        onClick={(e) => { e.stopPropagation(); setOpen((p) => !p) }}
        className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset transition-opacity focus:outline-none ${pending ? 'cursor-wait opacity-50' : 'cursor-pointer'} ${klassen[value]}`}
      >
        {capFirst(value)}
        <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-60" />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full z-30 mt-1 min-w-[9rem] overflow-hidden rounded-lg border border-border bg-background p-1 shadow-lg"
        >
          {RSVP_STATUSSEN.map((s) => (
            <button
              key={s}
              type="button"
              role="option"
              aria-selected={s === value}
              onClick={(e) => { e.stopPropagation(); void handleSelect(s) }}
              className={`flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-accent ${s === value ? 'font-semibold' : ''}`}
            >
              {capFirst(s)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

type SortKolom = 'naam' | 'categorie' | 'type' | 'tafel' | 'rsvp'

// Sorteericoon in de kolomtitel: neutraal (beide richtingen) als de kolom niet
// actief is, anders een pijl die de huidige richting toont.
function SortIcon({ actief, richting }: { actief: boolean; richting: 'asc' | 'desc' }) {
  if (!actief) return <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-40" />
  return richting === 'asc' ? (
    <ArrowUp className="h-3.5 w-3.5 shrink-0" />
  ) : (
    <ArrowDown className="h-3.5 w-3.5 shrink-0" />
  )
}

function SortableTh({
  kolom,
  actief,
  richting,
  onSort,
  children,
}: {
  kolom: SortKolom
  actief: boolean
  richting: 'asc' | 'desc'
  onSort: (kolom: SortKolom) => void
  children: React.ReactNode
}) {
  return (
    <th scope="col" className="px-4 py-3 font-medium">
      <button
        type="button"
        onClick={() => onSort(kolom)}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {children}
        <SortIcon actief={actief} richting={richting} />
      </button>
    </th>
  )
}

export default function GastenPage() {
  const wedding = useBruiloftStore((s) => s.wedding)
  const guests = useBruiloftStore((s) => s.guests)
  const tables = useBruiloftStore((s) => s.tables)
  const addGuest = useBruiloftStore((s) => s.addGuest)
  const updateGuest = useBruiloftStore((s) => s.updateGuest)
  const deleteGuest = useBruiloftStore((s) => s.deleteGuest)
  const ensureRsvpCodes = useBruiloftStore((s) => s.ensureRsvpCodes)
  const permissions = useBruiloftStore((s) => s.permissions)
  const { toast } = useToast()

  const kanBewerken = canEdit(permissions, 'gasten')
  const { save: saveScroll, restore: restoreScroll } = useScrollRestore()
  const savedScroll = React.useRef(0)

  const [zoek, setZoek] = React.useState('')
  const [fCategorie, setFCategorie] = React.useState('all')
  const [fType, setFType] = React.useState('all')
  const [fRsvp, setFRsvp] = React.useState('all')

  // Standaard alfabetisch op naam; klik op een kolomtitel sorteert daarop
  // (nogmaals klikken keert de richting om).
  const [sortKolom, setSortKolom] = React.useState<SortKolom>('naam')
  const [sortRichting, setSortRichting] = React.useState<'asc' | 'desc'>('asc')
  const toggleSort = (kolom: SortKolom) => {
    if (sortKolom === kolom) {
      setSortRichting((r) => (r === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKolom(kolom)
      setSortRichting('asc')
    }
  }

  const [formOpen, setFormOpen] = React.useState(false)
  const [editGuest, setEditGuest] = React.useState<Guest | null>(null)
  const [bulkOpen, setBulkOpen] = React.useState(false)
  const [delGuest, setDelGuest] = React.useState<Guest | null>(null)

  const [rsvpTarget, setRsvpTarget] = React.useState<Guest | null>(null)
  const [rsvpEmail, setRsvpEmail] = React.useState('')
  const [rsvpSending, setRsvpSending] = React.useState(false)
  const [gekopieerd, setGekopieerd] = React.useState<string | null>(null)
  const [origin, setOrigin] = React.useState('')
  React.useEffect(() => { setOrigin(window.location.origin) }, [])

  const tafelNamen = React.useMemo(
    () => new Map(tables.map((t) => [t.id, t.naam])),
    [tables]
  )

  // Custom categorieën/gasttypes die al bij gasten in gebruik zijn, naast de
  // vaste suggestielijst — zodat ze ook als filter- en formulieroptie verschijnen.
  const extraCategorieen = React.useMemo(
    () => Array.from(new Set(guests.map((g) => g.categorie).filter((c) => !GUEST_CATEGORIEEN.includes(c)))),
    [guests]
  )
  const extraGasttypen = React.useMemo(
    () => Array.from(new Set(guests.map((g) => g.gasttype).filter((t) => !GASTTYPES.includes(t)))),
    [guests]
  )

  // Zorg dat alle gasten een RSVP-code hebben zodra de pagina geladen is.
  React.useEffect(() => {
    if (wedding) void ensureRsvpCodes()
    // ensureRsvpCodes is een stabiele store-referentie
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wedding?.id])

  if (!wedding) return null

  const kopieer = async (tekst: string, id: string) => {
    try {
      await navigator.clipboard.writeText(tekst)
      setGekopieerd(id)
      toast({ title: 'Link gekopieerd', description: 'De RSVP-link staat nu in je klembord.', variant: 'success' })
      setTimeout(() => setGekopieerd(null), 1500)
    } catch {
      toast({ title: 'Kopiëren mislukt', description: 'Geef toegang tot het klembord en probeer opnieuw.', variant: 'error' })
    }
  }

  const genereerLinks = async () => {
    try {
      await ensureRsvpCodes()
      toast({ title: 'RSVP-links gereed', description: 'Alle gasten hebben nu een persoonlijke RSVP-link.', variant: 'success' })
    } catch {
      toast({ title: 'Genereren mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    }
  }

  async function sendRsvpEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!rsvpTarget || !wedding) return
    setRsvpSending(true)
    try {
      const res = await fetch('/api/email/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestId: rsvpTarget.id, email: rsvpEmail.trim(), weddingId: wedding.id }),
      })
      const json = await res.json().catch(() => ({}))
      if (json.emailSent) {
        toast({ title: 'RSVP-link verzonden', description: `De RSVP-link is naar ${rsvpEmail.trim()} gemaild.`, variant: 'success' })
      } else {
        toast({ title: 'Verzenden mislukt', description: 'Kon de e-mail niet verzenden. Kopieer de link handmatig.', variant: 'error' })
      }
    } catch {
      toast({ title: 'Verzenden mislukt', description: 'Netwerkfout. Probeer het opnieuw.', variant: 'error' })
    }
    setRsvpSending(false)
    setRsvpTarget(null)
    setRsvpEmail('')
  }

  const updateRsvp = async (g: Guest, status: RsvpStatus) => {
    try {
      await updateGuest(g.id, { rsvpStatus: status })
    } catch {
      toast({ title: 'Bijwerken mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
    }
  }

  const gefilterd = guests.filter((g) => {
    if (fCategorie !== 'all' && g.categorie !== fCategorie) return false
    if (fType !== 'all' && g.gasttype !== fType) return false
    if (fRsvp !== 'all' && g.rsvpStatus !== fRsvp) return false
    if (zoek.trim()) {
      const naam = `${g.voornaam} ${g.achternaam}`.toLowerCase()
      if (!naam.includes(zoek.trim().toLowerCase())) return false
    }
    return true
  })

  const naamVergelijk = (a: Guest, b: Guest) =>
    (a.achternaam || '').localeCompare(b.achternaam || '', 'nl') ||
    a.voornaam.localeCompare(b.voornaam, 'nl')

  const vergelijk = (a: Guest, b: Guest): number => {
    switch (sortKolom) {
      case 'categorie':
        return (
          categorieLabelVoor(a.categorie, wedding.partner1Naam, wedding.partner2Naam)
            .localeCompare(categorieLabelVoor(b.categorie, wedding.partner1Naam, wedding.partner2Naam), 'nl') ||
          naamVergelijk(a, b)
        )
      case 'type':
        return a.gasttype.localeCompare(b.gasttype, 'nl') || naamVergelijk(a, b)
      case 'tafel':
        return (
          (tafelNamen.get(a.tafelId ?? '') ?? '').localeCompare(tafelNamen.get(b.tafelId ?? '') ?? '', 'nl') ||
          naamVergelijk(a, b)
        )
      case 'rsvp':
        return a.rsvpStatus.localeCompare(b.rsvpStatus, 'nl') || naamVergelijk(a, b)
      case 'naam':
      default:
        return naamVergelijk(a, b)
    }
  }

  const zichtbaar = [...gefilterd].sort((a, b) => {
    const cmp = vergelijk(a, b)
    return sortRichting === 'asc' ? cmp : -cmp
  })

  const openNieuw = () => {
    savedScroll.current = saveScroll()
    setEditGuest(null)
    setFormOpen(true)
  }
  const openBewerk = (g: Guest) => {
    savedScroll.current = saveScroll()
    setEditGuest(g)
    setFormOpen(true)
  }

  const exporteer = () => {
    try {
      downloadCsv(
        'gastenlijst.csv',
        [
          'Voornaam',
          'Achternaam',
          'Categorie',
          'Gasttype',
          'RSVP',
          'Dieetwensen',
          'Partner',
          'Partnernaam',
          'Kinderen',
          'Adres',
          'Notitie',
        ],
        guests.map((g) => [
          g.voornaam,
          g.achternaam,
          g.categorie,
          g.gasttype,
          g.rsvpStatus,
          g.dieetwensen,
          g.heeftPartner ? 'ja' : 'nee',
          g.partnerNaam,
          g.aantalKinderen,
          g.adres,
          g.notitie,
        ])
      )
      toast({ title: 'Gastenlijst geëxporteerd', description: 'gastenlijst.csv is gedownload.', variant: 'success' })
    } catch {
      toast({ title: 'Export mislukt', variant: 'error' })
    }
  }

  const p1 = wedding.partner1Naam
  const p2 = wedding.partner2Naam

  return (
    <div className="mx-auto max-w-6xl pb-24 min-h-screen">
      <PageHeader
        titel="Gastenlijst"
        info={<PageInfoButton {...gastenInfo} />}
        primaryActie={
          kanBewerken ? (
            <Button onClick={openNieuw}>
              <Plus className="h-4 w-4" /> Gast toevoegen
            </Button>
          ) : null
        }
        meerActies={[
          ...(kanBewerken
            ? [{ label: 'Bulk import', icon: Sparkles, onClick: () => setBulkOpen(true) }]
            : []),
          ...(kanBewerken
            ? [{
                label: 'Genereer RSVP-links',
                icon: Link2,
                onClick: genereerLinks,
                disabled: guests.length === 0,
              }]
            : []),
          {
            label: 'Exporteer gastenlijst',
            icon: Download,
            onClick: exporteer,
            disabled: guests.length === 0,
          },
        ]}
        fab={kanBewerken ? { label: 'Gast toevoegen', onClick: openNieuw } : undefined}
      />

      <AIInsightCard sectie="/bruiloft/gasten" />

      {/* StatsStrip pas tonen bij genoeg gasten zodat de statistieken betekenisvol zijn. */}
      {guests.length >= 5 ? <GastenStatsStrip guests={guests} /> : null}

      {/* ── Gastenlijst container ── */}
      {guests.length === 0 ? (
        <EmptyState
          icon={Users}
          titel="Nog geen gasten"
          beschrijving={kanBewerken ? 'Voeg je eerste gast toe om de gastenlijst op te bouwen.' : 'Er zijn nog geen gasten.'}
          actie={
            kanBewerken ? (
              <Button onClick={openNieuw}>
                <Plus className="h-4 w-4" /> Gast toevoegen
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="sticky top-0 z-20 -mx-4 bg-muted px-4 pt-1 pb-2 md:-mx-8 md:px-8">
            <GastenFilters
              zoek={zoek}
              onZoek={setZoek}
              categorie={fCategorie}
              onCategorie={setFCategorie}
              type={fType}
              onType={setFType}
              rsvp={fRsvp}
              onRsvp={setFRsvp}
              wedding={wedding}
              extraCategorieen={extraCategorieen}
              extraGasttypen={extraGasttypen}
            />
          </div>
          <div className="rounded-xl border border-border bg-card shadow-sm">

          {/* Tabel (desktop) */}
          {gefilterd.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={Search}
                titel="Geen gasten gevonden"
                beschrijving="Geen gasten komen overeen met de huidige filters of zoekopdracht."
                actie={
                  <Button variant="outline" size="sm" onClick={() => { setZoek(''); setFCategorie('all'); setFType('all'); setFRsvp('all') }}>
                    Wis filters
                  </Button>
                }
              />
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                  <caption className="sr-only">Gastenlijst met categorie, type en RSVP-status</caption>
                  <thead>
                    <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <SortableTh kolom="naam" actief={sortKolom === 'naam'} richting={sortRichting} onSort={toggleSort}>
                        Naam
                      </SortableTh>
                      <SortableTh kolom="categorie" actief={sortKolom === 'categorie'} richting={sortRichting} onSort={toggleSort}>
                        Categorie
                      </SortableTh>
                      <SortableTh kolom="type" actief={sortKolom === 'type'} richting={sortRichting} onSort={toggleSort}>
                        Type
                      </SortableTh>
                      <SortableTh kolom="tafel" actief={sortKolom === 'tafel'} richting={sortRichting} onSort={toggleSort}>
                        Tafel
                      </SortableTh>
                      <SortableTh kolom="rsvp" actief={sortKolom === 'rsvp'} richting={sortRichting} onSort={toggleSort}>
                        RSVP
                      </SortableTh>
                      <th scope="col" className="px-4 py-3">
                        <span className="sr-only">Acties</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {zichtbaar.map((g) => (
                      <tr key={g.id} className="border-b border-border last:border-0 hover:bg-accent/40">
                        <td className="px-4 py-3 font-medium text-foreground">
                          {g.voornaam} {g.achternaam}
                          {(g.heeftPartner || g.aantalKinderen > 0 || g.dieetwensen) ? (
                            <span className="block text-xs font-normal text-muted-foreground">
                              {[
                                g.heeftPartner ? `+ partner${g.partnerNaam ? ` (${g.partnerNaam})` : ''}` : null,
                                g.aantalKinderen > 0 ? `${g.aantalKinderen} kind(eren)` : null,
                                g.dieetwensen || null,
                              ].filter(Boolean).join(' · ')}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {categorieLabelVoor(g.categorie, p1, p2)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{capFirst(g.gasttype)}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {tafelNamen.get(g.tafelId ?? '') ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          {kanBewerken ? (
                            <RsvpSelect
                              value={g.rsvpStatus}
                              onChange={(v) => updateRsvp(g, v)}
                            />
                          ) : (
                            <StatusBadge kind="rsvp" value={g.rsvpStatus} />
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <OverflowMenu
                              label="Acties voor deze gast"
                              items={[
                                ...(g.rsvpCode ? [
                                  {
                                    label: 'Kopieer RSVP-link',
                                    icon: Copy,
                                    disabled: !origin,
                                    onClick: () => kopieer(`${origin}/rsvp/${g.rsvpCode}`, `copy-${g.id}`),
                                  },
                                  {
                                    label: 'Stuur RSVP-link per e-mail',
                                    icon: Mail,
                                    onClick: () => { setRsvpTarget(g); setRsvpEmail('') },
                                  },
                                ] : []),
                                ...(kanBewerken ? [
                                  {
                                    label: 'Bewerken',
                                    icon: Pencil,
                                    onClick: () => openBewerk(g),
                                  },
                                  {
                                    label: 'Verwijderen',
                                    icon: Trash2,
                                    danger: true,
                                    onClick: () => setDelGuest(g),
                                  },
                                ] : []),
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobiel: compacte lijstweergave */}
              <div className="divide-y divide-border md:hidden">
                {zichtbaar.map((g) => (
                  <div
                    key={g.id}
                    role={kanBewerken ? 'button' : undefined}
                    tabIndex={kanBewerken ? 0 : undefined}
                    aria-label={kanBewerken ? `${g.voornaam} ${g.achternaam} bewerken` : undefined}
                    onClick={kanBewerken ? () => openBewerk(g) : undefined}
                    onKeyDown={kanBewerken ? (e) => { if (e.key === 'Enter' || e.key === ' ') openBewerk(g) } : undefined}
                    className={`flex min-h-[3.5rem] items-center gap-3 px-4 py-3 transition-colors${kanBewerken ? ' cursor-pointer hover:bg-accent/40 active:bg-accent/60' : ''}`}
                  >
                    {/* Naam + details */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground text-sm">
                        {g.voornaam} {g.achternaam}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground truncate">
                        {categorieLabelVoor(g.categorie, p1, p2)} · {g.gasttype}
                        {(g.heeftPartner || g.aantalKinderen > 0 || g.dieetwensen) ? (
                          <> · {[
                            g.heeftPartner ? `+ partner${g.partnerNaam ? ` (${g.partnerNaam})` : ''}` : null,
                            g.aantalKinderen > 0 ? `${g.aantalKinderen} kind(eren)` : null,
                            g.dieetwensen || null,
                          ].filter(Boolean).join(' · ')}</>
                        ) : null}
                      </p>
                    </div>

                    {/* RSVP-select */}
                    <RsvpSelect
                      value={g.rsvpStatus}
                      onChange={(v) => updateRsvp(g, v)}
                    />

                    {/* Actiemenu */}
                    {(g.rsvpCode || kanBewerken) ? (
                      <OverflowMenu
                        label="Acties voor deze gast"
                        align="right"
                        items={[
                          ...(g.rsvpCode ? [
                            {
                              label: 'Kopieer RSVP-link',
                              icon: Copy,
                              disabled: !origin,
                              onClick: () => kopieer(`${origin}/rsvp/${g.rsvpCode}`, `copy-${g.id}`),
                            },
                            {
                              label: 'Stuur RSVP-link per e-mail',
                              icon: Mail,
                              onClick: () => { setRsvpTarget(g); setRsvpEmail('') },
                            },
                          ] : []),
                          ...(kanBewerken ? [
                            {
                              label: 'Bewerken',
                              icon: Pencil,
                              onClick: () => openBewerk(g),
                            },
                            {
                              label: 'Verwijderen',
                              icon: Trash2,
                              danger: true,
                              onClick: () => setDelGuest(g),
                            },
                          ] : []),
                        ]}
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Voettekst */}
          <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              {gefilterd.length === guests.length
                ? `${guests.length} gasten weergegeven`
                : `${gefilterd.length} van ${guests.length} gasten weergegeven`}
            </span>
            {(() => {
              const totKinderen = gefilterd.reduce((s, g) => s + (g.aantalKinderen || 0), 0)
              return totKinderen > 0 ? <span>{totKinderen} kinderen</span> : null
            })()}
          </div>
          </div>
        </>
      )}

      <GuestForm
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o)
          if (!o) restoreScroll(savedScroll.current)
        }}
        initial={editGuest}
        wedding={wedding}
        extraCategorieen={extraCategorieen}
        extraGasttypen={extraGasttypen}
        onSubmit={async (data) => {
          try {
            if (editGuest) {
              await updateGuest(editGuest.id, data)
              toast({ title: 'Gast bijgewerkt', variant: 'success' })
            } else {
              await addGuest(data)
              toast({ title: 'Gast toegevoegd', variant: 'success' })
            }
          } catch (e) {
            toast({ title: 'Opslaan mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
            throw e
          }
        }}
      />

      <BulkImportDialog open={bulkOpen} onOpenChange={setBulkOpen} />

      <ConfirmDialog
        open={delGuest !== null}
        onOpenChange={(o) => !o && setDelGuest(null)}
        title="Gast verwijderen?"
        description={
          delGuest ? `Weet je zeker dat je ${delGuest.voornaam} ${delGuest.achternaam} wilt verwijderen?` : undefined
        }
        onConfirm={async () => {
          if (!delGuest) return
          const verwijderd = delGuest
          try {
            await deleteGuest(verwijderd.id)
            toast({
              title: 'Gast verwijderd',
              description: `${verwijderd.voornaam} ${verwijderd.achternaam}`.trim(),
              variant: 'success',
              duration: 7000,
              action: {
                label: 'Ongedaan maken',
                onClick: () => {
                  void addGuest({
                    voornaam: verwijderd.voornaam,
                    achternaam: verwijderd.achternaam,
                    categorie: verwijderd.categorie,
                    gasttype: verwijderd.gasttype,
                    rsvpStatus: verwijderd.rsvpStatus,
                    dieetwensen: verwijderd.dieetwensen,
                    heeftPartner: verwijderd.heeftPartner,
                    partnerNaam: verwijderd.partnerNaam,
                    aantalKinderen: verwijderd.aantalKinderen,
                    adres: verwijderd.adres,
                    notitie: verwijderd.notitie,
                  })
                },
              },
            })
          } catch {
            toast({ title: 'Verwijderen mislukt', description: 'Probeer het opnieuw.', variant: 'error' })
          }
        }}
      />

      <Modal
        open={rsvpTarget !== null}
        onOpenChange={(o) => { if (!o) { setRsvpTarget(null); setRsvpEmail('') } }}
        title="RSVP-link e-mailen"
        description={rsvpTarget ? `Stuur de persoonlijke RSVP-link van ${rsvpTarget.voornaam} ${rsvpTarget.achternaam} naar een e-mailadres.` : undefined}
      >
        <form onSubmit={sendRsvpEmail} className="space-y-4">
          <Field label="E-mailadres" htmlFor="rsvp-email">
            <Input
              id="rsvp-email"
              type="email"
              autoFocus
              autoComplete="email"
              required
              placeholder="naam@voorbeeld.nl"
              value={rsvpEmail}
              onChange={(e) => setRsvpEmail(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => { setRsvpTarget(null); setRsvpEmail('') }}>
              Annuleren
            </Button>
            <Button type="submit" disabled={rsvpSending}>
              <Mail className="h-4 w-4" />
              {rsvpSending ? 'Bezig…' : 'Versturen'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
